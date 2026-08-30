import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { ensureUploadsDir, uploadsDir } from './utils/fileUtils.js';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { requestLogger } from './utils/logger.js';
import { handleError, notFoundHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 导入模块化的路由
import announcementRoutes from './routes/announcementRoutes.js';
import specialWorkingHoursRoutes from './routes/specialWorkingHoursRoutes.js';
import formalLeaveRoutes from './routes/formalLeaveRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deptCalcRuleRoutes from './routes/deptCalcRuleRoutes.js';
import shiftDurationRuleRoutes from './routes/shiftDurationRuleRoutes.js';
import employeeHourlyRateRoutes from './routes/employeeHourlyRateRoutes.js'; // Added
import welfareConfigRoutes from './routes/welfareConfigRoutes.js'; // Added
import notificationRoutes from './routes/notificationRoutes.js';
import proofRoutes from './routes/proofRoutes.js';
import batchUploadRoutes from './routes/batchUploadRoutes.js';
import plantRoutes from './routes/plantRoutes.js'; // Added
import departmentRoutes from './routes/departmentRoutes.js'; // Added
import roleRoutes from './routes/roleRoutes.js'; // Added
import resignationTransferRoutes from './routes/resignationTransferRoutes.js'; // 新增
import costSummaryRoutes from './routes/costSummaryRoutes.js'; // 新增 Cost 汇总路由
import positionRoutes from './routes/positionRoutes.js'; // 新增岗位路由
import dashboardRoutes from './routes/dashboardRoutes.js'; // 仪表盘路由
import workstationRoutes from './routes/workstationRoutes.js'; // 工位管理路由
import k045Routes from './routes/k045Routes.js'; // K045 单据管理路由
import daMaterialRoutes from './routes/daMaterialRoutes.js'; // DA物料 单据管理路由
import daMaterialConfigRoutes from './routes/daMaterialConfigRoutes.js'; // DA物料 配置路由
import pncTransferRoutes from './routes/pncTransferRoutes.js'; // PNC转仓打印路由
import k2DiffConfigRoutes from './routes/k2DiffConfigRoutes.js'; // K**差异登记 配置路由
import k2DiffRoutes from './routes/k2DiffRoutes.js'; // K**差异登记 路由
import systemRoutes from './routes/systemRoutes.js'; // 系统信息路由
import positionReasonConfigRoutes from './routes/positionReasonConfigRoutes.js'; // 岗位原因配置路由
import permissionRoutes from './routes/permissionRoutes.js'; // 权限管理路由
import stockroomUrgentPullRoutes, { startScheduledRefresh } from './routes/stockroomUrgentPullRoutes.js'; // Stockroom Urgent Pull 路由
import stockroomUrgentPullConfigRoutes from './routes/stockroomUrgentPullConfigRoutes.js'; // Stockroom Urgent Pull 配置路由
import warehouseMonitorRoutes from './routes/warehouseMonitorRoutes.js'; // 仓库物料监控路由
import materialPackageRoutes from './routes/materialPackageRoutes.js'; // 物料包装信息路由
import temporaryOvertimeRoutes from './routes/temporaryOvertimeRoutes.js'; // 临时加班路由
import temporaryLeaveRoutes from './routes/temporaryLeaveRoutes.js'; // 临时请假路由
import class33MaterialsRoutes from './routes/class33MaterialsRoutes.js'; // 33类物料清单路由
import warehouseReturnRoutes from './routes/warehouseReturnRoutes.js'; // 回仓申请路由

// 导入统一定时任务
import { initScheduledTasks } from './scripts/scheduledTasks.js';

// 导入共享的数据库连接
import pool from './config/db.js';
import { USER_TABLE } from './config/db_constants.js'; // 导入 USER_TABLE

// 导入菜单同步服务
import { syncMenusToDatabase, initModulesTable } from './services/menuSyncService.js';



const app = express();
const PORT = 3002;

// ========== 安全中间件配置 ==========

// Helmet 安全头
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 响应压缩
app.use(compression());

// 请求体大小限制
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use(requestLogger);

// 登录限流：15分钟内最多20次
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试',
  },
});

// API 通用限流：每分钟1000次
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
  },
});

// 应用限流中间件
app.use('/api/users/login', loginLimiter);
app.use('/api', apiLimiter);

// 挂载所有模块化的路由 (Updated mounting paths)
app.use('/api/announcements', announcementRoutes);
app.use('/api/special-working-hours', specialWorkingHoursRoutes);
app.use('/api/formal-leave', formalLeaveRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/config/dept-calc-rules', deptCalcRuleRoutes);
app.use('/api/config/shift-duration-rules', shiftDurationRuleRoutes);
app.use('/api/config/employee-hourly-rates', employeeHourlyRateRoutes);
app.use('/api/config/welfare', welfareConfigRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/proof', proofRoutes);
app.use('/api/batch', batchUploadRoutes);
app.use('/api/plants', plantRoutes); // Added explicit mount
app.use('/api/departments', departmentRoutes); // Added explicit mount
app.use('/api/roles', roleRoutes); // Added explicit mount
app.use('/api/resignation-transfer', resignationTransferRoutes); // 新增
app.use('/api/cost-summary', costSummaryRoutes); // 新增 Cost 汇总路由
app.use('/api/positions', positionRoutes); // 新增岗位路由
app.use('/api/dashboard', dashboardRoutes); // 仪表盘路由
app.use('/api/workstations', workstationRoutes); // 工位管理路由
app.use('/api/k045', k045Routes); // K045 单据管理路由
app.use('/api/da-material', daMaterialRoutes); // DA物料 单据管理路由
app.use('/api/da-material-config', daMaterialConfigRoutes); // DA物料 配置路由
app.use('/api/pnc-transfer', pncTransferRoutes); // PNC转仓打印路由
app.use('/api/k2-diff-config', k2DiffConfigRoutes); // K**差异登记 配置路由
app.use('/api/k2-diff', k2DiffRoutes); // K**差异登记 路由
app.use('/api/system', systemRoutes); // 系统信息路由
app.use('/api/config/position-reasons', positionReasonConfigRoutes); // 岗位原因配置路由
app.use('/api/permissions', permissionRoutes); // 权限管理路由
app.use('/api/stockroom-urgent-pull', stockroomUrgentPullRoutes); // Stockroom Urgent Pull 路由
app.use('/api/stockroom-urgent-pull-config', stockroomUrgentPullConfigRoutes); // Stockroom Urgent Pull 配置路由
app.use('/api/warehouse-monitor', warehouseMonitorRoutes); // 仓库物料监控路由
app.use('/api/material-package', materialPackageRoutes); // 物料包装信息路由
app.use('/api/temporary-overtime', temporaryOvertimeRoutes); // 临时加班路由
app.use('/api/temporary-leave', temporaryLeaveRoutes); // 临时请假路由
app.use('/api/class33-materials', class33MaterialsRoutes); // 33类物料清单路由
app.use('/api/warehouse-return', warehouseReturnRoutes); // 回仓申请路由


// 确保 uploads 目录存在
ensureUploadsDir();

// 静态文件服务 - 提供上传文件的访问
app.use('/uploads', express.static(uploadsDir));

// 静态文件服务 - 提供 Excel 模板的访问
const excelTemplatesDir = path.join(__dirname, 'resources', 'excel_templates');
if (!fs.existsSync(excelTemplatesDir)) {
  console.warn(`Excel templates directory not found: ${excelTemplatesDir}`);
}
app.use('/api/templates', express.static(excelTemplatesDir));

// 定义全局常量 (Global Constants) (These are primarily for database initialization/migrations now)
// const USER_TABLE = 'jso_system_user_management'; // This was the duplicate declaration, now it's imported
const ROLE_TABLE = 'jso_system_role_management';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';
const NOTIFICATION_TABLE = 'jso_system_notification';
const TEMPORARY_OVERTIME_TABLE = 'jso_hr_temporary_overtime';
const TEMPORARY_LEAVE_TABLE = 'jso_hr_temporary_leave';
const FORMAL_LEAVE_TABLE = 'jso_hr_formal_leave';
const RESIGNATION_TRANSFER_TABLE = 'jso_hr_resignation_transfer'; // Added for resignation and transfer
const SCHEDULE_TABLE = 'jso_hr_employee_schedule';
const SPECIAL_WORKING_HOURS_TABLE = 'jso_hr_special_working_hours';
const DEPT_CALC_RULES_TABLE = 'jso_config_dept_calc_rules';
const SHIFT_DURATION_RULES_TABLE = 'jso_config_shift_duration_rules';

// 初始化数据库
const initDatabase = async () => {
  try {

    // --- 临时：在初始化之前删除用户表以确保最新数据 ---
    // !!! 生产环境禁用此行 !!!

    // --- 临时代码结束 ---

    await runSqlFile(path.join(__dirname, './database/migrations/init.sql'));

    // Force update admin user\'s password after init.sql, to ensure the correct hash is always set.
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH; 
    if (adminPasswordHash) {
      await pool.query(`UPDATE ${USER_TABLE} SET password = $1 WHERE username = 'admin'`, [adminPasswordHash]);
    } else {
      console.warn('ADMIN_PASSWORD_HASH is not set in environment variables. Admin password might not be updated.');
    }

    await runMigrations();
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
};

// 运行单个 SQL 文件
const runSqlFile = async (filePath) => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = sql
      .split(/;\\s*$/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await pool.query(statement);
    }
  } catch (error) {
    console.error(`执行 SQL 文件失败: ${filePath}`, error);
    throw error;
  }
};

// 运行数据库迁移
const runMigrations = async () => {
  try {
    const migrationsPath = path.join(__dirname, '../database/migrations');
    
    if (fs.existsSync(migrationsPath)) {
      const files = fs.readdirSync(migrationsPath);
      
      for (const file of files.sort()) {
        if (file.endsWith('.sql')) {
          try {
            const filePath = path.join(migrationsPath, file);
            await runSqlFile(filePath);
          } catch (error) {
            console.error(`迁移执行失败: ${file}`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
};

// 测试数据库连接并初始化
pool.connect(async (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    console.log('服务器将继续启动，但某些功能可能不可用...');
    startServerWithoutDb();
  } else {
    try {
      await initDatabase();
      // Initial calls for scheduled tasks are now handled by initScheduledTasks()
      // However, if we want to run initial checks immediately after DB init, we can call them here

      // 同步前端菜单配置到数据库
      try {
        await initModulesTable(pool);
        await syncMenusToDatabase(pool);
      } catch (syncError) {
        console.error('菜单同步失败（不影响主服务）:', syncError.message);
      }

      // 启动 Stockroom Urgent Pull 定时刷新任务
      try {
        startScheduledRefresh();
      } catch (refreshError) {
        console.error('Stockroom Urgent Pull 定时刷新启动失败（不影响主服务）:', refreshError.message);
      }

      // 全局错误处理
      app.use(handleError);

      // 404 处理
      app.use(notFoundHandler);

      // ========== 启动服务 ==========
      app.listen(PORT, () => {
        // 初始化并启动定时任务
        initScheduledTasks();
      });

      // 处理进程终止信号，优雅关闭数据库连接
      const shutdown = async () => {
        try {
          // await pool.end();
          process.exit(0);
        } catch (err) {
          console.error('关闭数据库连接时发生错误:', err);
          process.exit(1);
        }
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

    } catch (dbError) {
      console.error('数据库初始化或启动检查失败:', dbError);
      startServerWithoutDb();
    }
  }
});

// 不依赖数据库启动服务器
function startServerWithoutDb() {
  console.log('正在启动服务器（无数据库连接）...');

  // 全局错误处理
  app.use(handleError);

  // 404 处理
  app.use(notFoundHandler);

  // ========== 启动服务 ==========
  app.listen(PORT, () => {
    console.log('========================================');
    console.log(`服务器已启动，但数据库功能不可用`);
    console.log(`后端服务端口: ${PORT}`);
    console.log(`前端访问: http://cnhuanb5947:${PORT}/`);
    console.log('========================================');
  });

  const shutdown = () => {
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
