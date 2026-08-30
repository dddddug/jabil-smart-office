/**
 * 分区自动管理脚本
 *
 * 功能：
 * 1. 自动创建未来分区（每月提前创建下月分区）
 * 2. 检查并修复缺失的分区
 * 3. 清理过期的空分区
 *
 * 使用方式：
 *   node backend/scripts/autoCreatePartitions.js
 *   node backend/scripts/autoCreatePartitions.js --check  # 仅检查不创建
 *   node backend/scripts/autoCreatePartitions.js --months 3  # 创建未来3个月的分区
 *
 * 建议定时任务：
 *   每月15号凌晨2点执行（提前创建下月分区）
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || '10.114.100.171',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 分区表配置
const PARTITIONED_TABLES = [
  {
    parentTable: 'jso_sap_pull_log_partitioned',
    partitionPrefix: 'jso_sap_pull_log_',
    partitionKey: 'date_created'
  },
  {
    parentTable: 'jso_sap_grn_history_partitioned',
    partitionPrefix: 'jso_sap_grn_history_',
    partitionKey: 'creation_date'
  }
];

// 日志函数
const log = (level, module, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, module, message, ...data };
  console.log(`[${timestamp}] [${level}] [${module}] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : '');
};

/**
 * 获取指定年月的分区名称
 */
function getPartitionName(prefix, year, month) {
  return `${prefix}${year}_${String(month).padStart(2, '0')}`;
}

/**
 * 获取指定年月分区的日期范围
 */
function getPartitionDateRange(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * 获取已存在的分区列表
 */
async function getExistingPartitions(tableName) {
  try {
    const result = await pool.query(`
      SELECT
        child.relname AS partition_name,
        pg_get_expr(child.relpartbound, child.oid, true) AS partition_range
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = $1
      ORDER BY child.relname
    `, [tableName]);

    return result.rows.map(row => ({
      name: row.partition_name,
      range: row.partition_range
    }));
  } catch (error) {
    log('ERROR', 'PartitionManager', `获取分区列表失败: ${tableName}`, { error: error.message });
    return [];
  }
}

/**
 * 检查分区是否存在
 */
async function partitionExists(partitionName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = $1
      ) as exists
    `, [partitionName]);

    return result.rows[0]?.exists || false;
  } catch (error) {
    return false;
  }
}

/**
 * 创建单个分区
 */
async function createPartition(config, year, month) {
  const partitionName = getPartitionName(config.partitionPrefix, year, month);
  const { start, end } = getPartitionDateRange(year, month);

  // 检查是否已存在
  const exists = await partitionExists(partitionName);
  if (exists) {
    return { name: partitionName, status: 'already_exists' };
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${config.parentTable}
      FOR VALUES FROM ('${start}') TO ('${end}')
    `);

    log('INFO', 'PartitionManager', `创建分区成功: ${partitionName}`);
    return { name: partitionName, status: 'created' };
  } catch (error) {
    if (error.message.includes('already exists')) {
      return { name: partitionName, status: 'already_exists' };
    }
    log('ERROR', 'PartitionManager', `创建分区失败: ${partitionName}`, { error: error.message });
    return { name: partitionName, status: 'error', error: error.message };
  }
}

/**
 * 为指定月份范围创建分区
 */
async function createPartitionsForRange(config, startYear, startMonth, endYear, endMonth) {
  const results = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (true) {
    // 检查是否超过结束年月
    if (currentYear > endYear || (currentYear === endYear && currentMonth > endMonth)) {
      break;
    }

    const result = await createPartition(config, currentYear, currentMonth);
    results.push(result);

    // 移动到下个月
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return results;
}

/**
 * 创建未来分区
 */
async function createFuturePartitions(monthsAhead = 3) {
  log('INFO', 'PartitionManager', `开始创建未来 ${monthsAhead} 个月的分区`);

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth() + 1; // JavaScript月份是0-based

  // 结束年月
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + monthsAhead);
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  const allResults = {};

  for (const config of PARTITIONED_TABLES) {
    log('INFO', 'PartitionManager', `处理表: ${config.parentTable}`);

    // 获取现有分区
    const existingPartitions = await getExistingPartitions(config.parentTable);
    log('INFO', 'PartitionManager', `现有 ${existingPartitions.length} 个分区`);

    // 创建缺失的分区
    const results = await createPartitionsForRange(config, startYear, startMonth, endYear, endMonth);
    allResults[config.parentTable] = results;

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'already_exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    log('INFO', 'PartitionManager', `表 ${config.parentTable} 分区创建完成`, {
      created,
      skipped,
      errors
    });
  }

  return allResults;
}

/**
 * 检查分区健康状态
 */
async function checkPartitionHealth() {
  log('INFO', 'PartitionManager', '开始检查分区健康状态');

  const healthReport = {};

  for (const config of PARTITIONED_TABLES) {
    const existingPartitions = await getExistingPartitions(config.parentTable);

    // 检查是否有数据
    const partitionStats = [];
    for (const partition of existingPartitions.slice(-6)) { // 只检查最近6个分区
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM ${partition.name}`);
        partitionStats.push({
          name: partition.name,
          rowCount: parseInt(countResult.rows[0]?.cnt || 0),
          range: partition.range
        });
      } catch (error) {
        partitionStats.push({
          name: partition.name,
          rowCount: -1,
          error: error.message
        });
      }
    }

    // 检查是否有未来的空分区（可能导致查询问题）
    const futureWarning = existingPartitions.some(p => {
      const match = p.name.match(/_(\d{4})_(\d{2})$/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const partitionDate = new Date(year, month - 1);
        const now = new Date();
        return partitionDate > now;
      }
      return false;
    });

    healthReport[config.parentTable] = {
      totalPartitions: existingPartitions.length,
      recentStats: partitionStats,
      futurePartitionsExist: futureWarning
    };
  }

  return healthReport;
}

/**
 * 清理空分区（可选功能，谨慎使用）
 */
async function cleanupEmptyPartitions(config, olderThanMonths = 24) {
  log('INFO', 'PartitionManager', `检查超过 ${olderThanMonths} 个月的空分区`);

  const existingPartitions = await getExistingPartitions(config.parentTable);
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);

  const cleanupResults = [];

  for (const partition of existingPartitions) {
    const match = partition.name.match(/_(\d{4})_(\d{2})$/);
    if (!match) continue;

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const partitionDate = new Date(year, month - 1);

    if (partitionDate < cutoffDate) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM ${partition.name}`);
        const rowCount = parseInt(countResult.rows[0]?.cnt || 0);

        if (rowCount === 0) {
          log('INFO', 'PartitionManager', `发现空分区: ${partition.name}，建议手动删除`);
          cleanupResults.push({
            name: partition.name,
            rowCount: 0,
            action: 'suggest_delete'
          });
        }
      } catch (error) {
        cleanupResults.push({
          name: partition.name,
          error: error.message,
          action: 'error'
        });
      }
    }
  }

  return cleanupResults;
}

/**
 * 生成分区创建SQL（用于手动执行）
 */
function generatePartitionSQL(config, startYear, startMonth, endYear, endMonth) {
  const sqlStatements = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (true) {
    if (currentYear > endYear || (currentYear === endYear && currentMonth > endMonth)) {
      break;
    }

    const partitionName = getPartitionName(config.partitionPrefix, currentYear, currentMonth);
    const { start, end } = getPartitionDateRange(currentYear, currentMonth);

    sqlStatements.push(
      `CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${config.parentTable} FOR VALUES FROM ('${start}') TO ('${end}');`
    );

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return sqlStatements.join('\n');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const isCheckOnly = args.includes('--check');

  // 解析月份参数
  let monthsAhead = 3;
  const monthsIndex = args.indexOf('--months');
  if (monthsIndex !== -1 && args[monthsIndex + 1]) {
    monthsAhead = parseInt(args[monthsIndex + 1]) || 3;
  }

  try {
    if (isCheckOnly) {
      // 仅检查模式
      log('INFO', 'PartitionManager', '执行分区健康检查');
      const healthReport = await checkPartitionHealth();
      console.log('\n========== 分区健康报告 ==========');
      console.log(JSON.stringify(healthReport, null, 2));
      console.log('==================================\n');
    } else {
      // 创建未来分区
      log('INFO', 'PartitionManager', '开始创建分区');
      const results = await createFuturePartitions(monthsAhead);

      console.log('\n========== 分区创建结果 ==========');
      for (const [tableName, tableResults] of Object.entries(results)) {
        console.log(`\n表: ${tableName}`);
        const created = tableResults.filter(r => r.status === 'created');
        const skipped = tableResults.filter(r => r.status === 'already_exists');
        const errors = tableResults.filter(r => r.status === 'error');

        if (created.length > 0) {
          console.log(`  ✅ 新创建: ${created.map(r => r.name).join(', ')}`);
        }
        if (skipped.length > 0) {
          console.log(`  ⏭️  已存在: ${skipped.length} 个`);
        }
        if (errors.length > 0) {
          console.log(`  ❌ 失败: ${errors.map(r => `${r.name}: ${r.error}`).join(', ')}`);
        }
      }
      console.log('\n==================================\n');

      // 额外输出可执行的SQL（用于手动修复）
      if (process.env.OUTPUT_SQL === 'true') {
        console.log('========== 可执行SQL（可选）==========');
        for (const config of PARTITIONED_TABLES) {
          const sql = generatePartitionSQL(config, 2024, 1, 2028, 12);
          console.log(`\n-- ${config.parentTable}`);
          console.log(sql);
        }
        console.log('=====================================\n');
      }
    }

    await pool.end();
    process.exit(0);

  } catch (error) {
    log('ERROR', 'PartitionManager', '分区管理失败', { error: error.message });
    await pool.end();
    process.exit(1);
  }
}

// 导出函数供其他模块调用
export async function scheduledPartitionMaintenance() {
  log('INFO', 'PartitionManager', '执行定时分区维护任务');

  try {
    const results = await createFuturePartitions(3);
    const healthReport = await checkPartitionHealth();

    return {
      success: true,
      createdPartitions: results,
      healthReport
    };
  } catch (error) {
    log('ERROR', 'PartitionManager', '定时维护任务失败', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('autoCreatePartitions')) {
  main().catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

export default {
  createFuturePartitions,
  checkPartitionHealth,
  cleanupEmptyPartitions,
  generatePartitionSQL,
  scheduledPartitionMaintenance
};
