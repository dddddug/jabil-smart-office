/**
 * SAP 数据拉取任务调度器
 * 用于管理和执行 SAP 数据拉取任务
 *
 * 使用方式:
 *   import { SapTaskScheduler } from './sapTaskScheduler.js';
 *
 *   const scheduler = new SapTaskScheduler();
 *   scheduler.registerTask('MB52库存报表', {
 *     cron: '0 6 * * *',  // 每天早上6点
 *     handler: pullMB52
 *   });
 *   scheduler.start();
 */

import cron from 'node-cron';
import SapGuiService from './sapGuiService.js';
import { logInfo, logError, logSuccess } from '../utils/logger.js';

export class SapTaskScheduler {
  constructor(config = {}) {
    this.tasks = new Map();
    this.runningTasks = new Set();
    this.sapConfig = {
      connectionName: config.connectionName || process.env.SAP_CONNECTION_NAME || 'DEV',
      client: config.client || process.env.SAP_CLIENT || '800',
      username: config.username || process.env.SAP_USERNAME,
      password: config.password || process.env.SAP_PASSWORD
    };
    this.isRunning = false;
    this.eventEmitter = null;
  }

  /**
   * 注册任务
   * @param {string} taskName - 任务名称
   * @param {object} taskConfig - 任务配置
   * @param {string} taskConfig.cron - cron 表达式
   * @param {function} taskConfig.handler - 处理函数
   * @param {object} taskConfig.config - 任务专用配置
   */
  registerTask(taskName, taskConfig) {
    if (!taskConfig.cron || !taskConfig.handler) {
      throw new Error(`任务 ${taskName} 缺少 cron 或 handler`);
    }

    if (!cron.validate(taskConfig.cron)) {
      throw new Error(`任务 ${taskName} 的 cron 表达式无效: ${taskConfig.cron}`);
    }

    const task = {
      name: taskName,
      cron: taskConfig.cron,
      handler: taskConfig.handler,
      config: taskConfig.config || {},
      job: null,
      lastRun: null,
      lastResult: null,
      runCount: 0
    };

    this.tasks.set(taskName, task);
    logInfo('SapScheduler', `任务已注册: ${taskName} (${taskConfig.cron})`);
  }

  /**
   * 启动调度器
   */
  start() {
    if (this.isRunning) {
      logInfo('SapScheduler', '调度器已在运行');
      return;
    }

    logInfo('SapScheduler', 'SAP任务调度器启动中...');

    for (const [name, task] of this.tasks) {
      task.job = cron.schedule(task.cron, async () => {
        await this.runTask(name);
      }, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      logInfo('SapScheduler', `任务已调度: ${name}`);
    }

    this.isRunning = true;
    console.log(`\n✅ SAP任务调度器已启动，共 ${this.tasks.size} 个任务\n`);
  }

  /**
   * 停止调度器
   */
  stop() {
    logInfo('SapScheduler', '正在停止调度器...');

    for (const [name, task] of this.tasks) {
      if (task.job) {
        task.job.stop();
        task.job = null;
      }
    }

    this.isRunning = false;
    logInfo('SapScheduler', '调度器已停止');
  }

  /**
   * 运行指定任务
   * @param {string} taskName - 任务名称
   */
  async runTask(taskName) {
    const task = this.tasks.get(taskName);
    if (!task) {
      logError('SapScheduler', `任务不存在: ${taskName}`);
      return;
    }

    // 防止任务重复运行
    if (this.runningTasks.has(taskName)) {
      logInfo('SapScheduler', `任务 ${taskName} 正在运行中，跳过`);
      return;
    }

    this.runningTasks.add(taskName);
    task.lastRun = new Date();

    const startTime = Date.now();
    logInfo('SapScheduler', `▶ 开始执行任务: ${taskName}`);

    let sapService = null;

    try {
      // 创建 SAP GUI 连接
      if (this.sapConfig.username && this.sapConfig.password) {
        sapService = new SapGuiService({
          timeout: 120000,
          retryCount: 3
        });

        await sapService.connect(
          this.sapConfig.connectionName,
          this.sapConfig.client,
          this.sapConfig.username,
          this.sapConfig.password
        );
      }

      // 执行任务
      const result = await task.handler({
        sap: sapService,
        config: task.config,
        taskName
      });

      task.lastResult = {
        success: true,
        duration: Date.now() - startTime,
        data: result,
        timestamp: new Date()
      };

      task.runCount++;
      logSuccess('SapScheduler', `✅ 任务 ${taskName} 完成 (${task.lastResult.duration}ms)`);

      return result;

    } catch (error) {
      task.lastResult = {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };

      task.runCount++;
      logError('SapScheduler', `❌ 任务 ${taskName} 失败: ${error.message}`);

    } finally {
      // 关闭 SAP 连接
      if (sapService) {
        await sapService.close();
      }

      this.runningTasks.delete(taskName);
    }
  }

  /**
   * 手动运行任务（立即执行）
   * @param {string} taskName - 任务名称
   */
  async runTaskNow(taskName) {
    logInfo('SapScheduler', `手动触发任务: ${taskName}`);
    return await this.runTask(taskName);
  }

  /**
   * 获取任务状态
   */
  getTaskStatus() {
    const status = [];

    for (const [name, task] of this.tasks) {
      status.push({
        name,
        cron: task.cron,
        isRunning: this.runningTasks.has(name),
        lastRun: task.lastRun,
        lastResult: task.lastResult,
        runCount: task.runCount
      });
    }

    return status;
  }

  /**
   * 移除任务
   * @param {string} taskName - 任务名称
   */
  removeTask(taskName) {
    const task = this.tasks.get(taskName);
    if (task) {
      if (task.job) {
        task.job.stop();
      }
      this.tasks.delete(taskName);
      logInfo('SapScheduler', `任务已移除: ${taskName}`);
    }
  }
}

/**
 * SAP 配置验证
 */
export const validateSapConfig = () => {
  const required = ['SAP_CONNECTION_NAME', 'SAP_USERNAME', 'SAP_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️ 缺少 SAP 环境变量: ${missing.join(', ')}`);
    console.warn('   请设置以下环境变量或在 .env 文件中配置:');
    console.warn('   SAP_CONNECTION_NAME - SAP连接名称');
    console.warn('   SAP_USERNAME - 用户名');
    console.warn('   SAP_PASSWORD - 密码');
    return false;
  }

  return true;
};

export default SapTaskScheduler;
