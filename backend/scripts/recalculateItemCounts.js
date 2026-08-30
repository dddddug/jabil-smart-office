/**
 * ITEM计数预计算脚本
 *
 * 功能：
 * 1. 从 jso_sap_pull_log_partitioned 表提取 reference 字段
 * 2. 计算每个 pulllist_no 在指定日期范围内的关联数量
 * 3. 存储到 jso_pulllist_item_count 预计算表
 *
 * 使用方式：
 *   node backend/scripts/recalculateItemCounts.js
 *   node backend/scripts/recalculateItemCounts.js --full  # 全量重新计算
 *   node backend/scripts/recalculateItemCounts.js --date 2026-08-01  # 指定日期
 *
 * 建议定时任务：
 *   - 每天凌晨3点执行增量计算
 *   - 每周日凌晨4点执行全量计算
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
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 配置
const PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';
const COUNT_TABLE = 'jso_pulllist_item_count_partitioned'; // 分区版
const BATCH_SIZE = 1000;

// 日志函数
const log = (level, module, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logData = { timestamp, level, module, message, ...data };
  console.log(`[${timestamp}] [${level}] [${module}] ${message}`, Object.keys(data).length > 0 ? data : '');
};

/**
 * 解析 reference 字段，提取 pulllist_no
 * reference 字段可能包含多个 pulllist_no，用逗号分隔
 */
function parseReferenceField(reference) {
  if (!reference || typeof reference !== 'string') {
    return [];
  }

  // 按逗号分隔并清理
  const parts = reference.split(',').map(s => s.trim()).filter(s => s.length > 0);

  // 过滤掉明显不是 pulllist_no 的值（如纯数字ID）
  return parts.filter(part => {
    // pulllist_no 通常包含字母或长度大于5
    return /[a-zA-Z]/.test(part) || part.length > 5;
  });
}

/**
 * 增量计算：从指定日期开始计算
 */
async function incrementalCalculate(startDate = null) {
  const startTime = Date.now();
  const targetDate = startDate || new Date().toISOString().split('T')[0];

  log('INFO', 'ItemCountCalculator', '开始增量计算', { startDate: targetDate });

  try {
    // 查询最近有数据变动的日期范围（最近7天）
    const result = await pool.query(`
      SELECT DISTINCT date_created
      FROM ${PULL_LOG_TABLE}
      WHERE date_created >= ($1::date - INTERVAL '7 days')
        AND date_created <= CURRENT_DATE
      ORDER BY date_created
    `, [targetDate]);

    const dates = result.rows.map(r => r.date_created);

    if (dates.length === 0) {
      log('INFO', 'ItemCountCalculator', '没有需要计算的数据');
      return { success: true, processed: 0, elapsed: Date.now() - startTime };
    }

    log('INFO', 'ItemCountCalculator', `发现 ${dates.length} 个日期需要处理`);

    let totalProcessed = 0;

    for (const date of dates) {
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

      // 计算该日期范围内（前后7天）的 pulllist_no 计数
      const calcResult = await pool.query(`
        WITH pulllist_data AS (
          SELECT
            pulllist_no,
            data_date,
            COUNT(*) as item_count
          FROM (
            SELECT
              TRIM(UNNEST(string_to_array(reference, ','))) as pulllist_no,
              date_created as data_date
            FROM ${PULL_LOG_TABLE}
            WHERE reference IS NOT NULL
              AND reference != ''
              AND date_created >= ($1::date - INTERVAL '7 days')
              AND date_created <= ($1::date + INTERVAL '7 days')
          ) parsed
          WHERE pulllist_no IS NOT NULL AND pulllist_no != ''
          GROUP BY pulllist_no, data_date
        )
        INSERT INTO ${COUNT_TABLE} (pulllist_no, data_date, item_count, last_calculated_at)
        SELECT pulllist_no, data_date, item_count, CURRENT_TIMESTAMP
        FROM pulllist_data
        ON CONFLICT (pulllist_no, data_date)
        DO UPDATE SET
          item_count = EXCLUDED.item_count,
          last_calculated_at = CURRENT_TIMESTAMP
        RETURNING pulllist_no
      `, [dateStr]);

      totalProcessed += calcResult.rowCount;
    }

    const elapsed = Date.now() - startTime;
    log('INFO', 'ItemCountCalculator', '增量计算完成', { processed: totalProcessed, elapsed: `${elapsed}ms` });

    return { success: true, processed: totalProcessed, elapsed };

  } catch (error) {
    log('ERROR', 'ItemCountCalculator', '增量计算失败', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 全量计算：重新计算所有数据
 */
async function fullCalculate() {
  const startTime = Date.now();
  log('INFO', 'ItemCountCalculator', '开始全量计算');

  try {
    // 清除旧数据
    await pool.query(`TRUNCATE ${COUNT_TABLE} RESTART IDENTITY`);
    log('INFO', 'ItemCountCalculator', '已清空预计算表');

    // 获取所有有数据的日期
    const dateResult = await pool.query(`
      SELECT DISTINCT date_created
      FROM ${PULL_LOG_TABLE}
      WHERE reference IS NOT NULL AND reference != ''
      ORDER BY date_created
    `);

    const dates = dateResult.rows.map(r => r.date_created);
    log('INFO', 'ItemCountCalculator', `发现 ${dates.length} 个日期需要处理`);

    let totalProcessed = 0;

    for (const date of dates) {
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

      const calcResult = await pool.query(`
        WITH pulllist_data AS (
          SELECT
            pulllist_no,
            data_date,
            COUNT(*) as item_count
          FROM (
            SELECT
              TRIM(UNNEST(string_to_array(reference, ','))) as pulllist_no,
              date_created as data_date
            FROM ${PULL_LOG_TABLE}
            WHERE reference IS NOT NULL
              AND reference != ''
              AND date_created >= ($1::date - INTERVAL '7 days')
              AND date_created <= ($1::date + INTERVAL '7 days')
          ) parsed
          WHERE pulllist_no IS NOT NULL AND pulllist_no != ''
          GROUP BY pulllist_no, data_date
        )
        INSERT INTO ${COUNT_TABLE} (pulllist_no, data_date, item_count, last_calculated_at)
        SELECT pulllist_no, data_date, item_count, CURRENT_TIMESTAMP
        FROM pulllist_data
        ON CONFLICT (pulllist_no, data_date)
        DO UPDATE SET
          item_count = EXCLUDED.item_count,
          last_calculated_at = CURRENT_TIMESTAMP
        RETURNING pulllist_no
      `, [dateStr]);

      totalProcessed += calcResult.rowCount;

      // 每处理100个日期输出一次进度
      if (dates.indexOf(date) % 100 === 0) {
        log('INFO', 'ItemCountCalculator', `处理进度: ${dates.indexOf(date) + 1}/${dates.length}`);
      }
    }

    const elapsed = Date.now() - startTime;
    log('INFO', 'ItemCountCalculator', '全量计算完成', { processed: totalProcessed, elapsed: `${elapsed}ms` });

    return { success: true, processed: totalProcessed, elapsed };

  } catch (error) {
    log('ERROR', 'ItemCountCalculator', '全量计算失败', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 计算指定日期范围的数据
 */
async function calculateDateRange(startDate, endDate) {
  const startTime = Date.now();
  log('INFO', 'ItemCountCalculator', '计算指定日期范围', { startDate, endDate });

  try {
    const result = await pool.query(`
      WITH pulllist_data AS (
        SELECT
          pulllist_no,
          data_date,
          COUNT(*) as item_count
        FROM (
          SELECT
            TRIM(UNNEST(string_to_array(reference, ','))) as pulllist_no,
            date_created as data_date
          FROM ${PULL_LOG_TABLE}
          WHERE reference IS NOT NULL
            AND reference != ''
            AND date_created >= ($1::date - INTERVAL '7 days')
            AND date_created <= ($2::date + INTERVAL '7 days')
        ) parsed
        WHERE pulllist_no IS NOT NULL AND pulllist_no != ''
        GROUP BY pulllist_no, data_date
      )
      INSERT INTO ${COUNT_TABLE} (pulllist_no, data_date, item_count, last_calculated_at)
      SELECT pulllist_no, data_date, item_count, CURRENT_TIMESTAMP
      FROM pulllist_data
      ON CONFLICT (pulllist_no, data_date)
      DO UPDATE SET
        item_count = EXCLUDED.item_count,
        last_calculated_at = CURRENT_TIMESTAMP
      RETURNING pulllist_no
    `, [startDate, endDate]);

    const elapsed = Date.now() - startTime;
    log('INFO', 'ItemCountCalculator', '日期范围计算完成', {
      processed: result.rowCount,
      elapsed: `${elapsed}ms`
    });

    return { success: true, processed: result.rowCount, elapsed };

  } catch (error) {
    log('ERROR', 'ItemCountCalculator', '日期范围计算失败', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 获取统计数据
 */
async function getStats() {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT pulllist_no) as unique_pulllists,
        COUNT(*) as total_records,
        MIN(data_date) as earliest_date,
        MAX(data_date) as latest_date,
        SUM(item_count) as total_items
      FROM ${COUNT_TABLE}
    `);

    return stats.rows[0];
  } catch (error) {
    log('ERROR', 'ItemCountCalculator', '获取统计失败', { error: error.message });
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  let result;

  if (args.includes('--full')) {
    // 全量计算
    result = await fullCalculate();
  } else if (args.includes('--date')) {
    // 指定日期
    const dateIndex = args.indexOf('--date');
    const targetDate = args[dateIndex + 1];
    if (targetDate) {
      result = await incrementalCalculate(targetDate);
    } else {
      console.log('请指定日期，格式：--date 2026-08-01');
      process.exit(1);
    }
  } else if (args.includes('--range')) {
    // 日期范围
    const rangeIndex = args.indexOf('--range');
    const startDate = args[rangeIndex + 1];
    const endDate = args[rangeIndex + 2];
    if (startDate && endDate) {
      result = await calculateDateRange(startDate, endDate);
    } else {
      console.log('请指定日期范围，格式：--range 2026-01-01 2026-08-01');
      process.exit(1);
    }
  } else {
    // 默认增量计算
    result = await incrementalCalculate();
  }

  // 输出统计
  const stats = await getStats();
  if (stats) {
    log('INFO', 'ItemCountCalculator', '预计算表统计', stats);
  }

  await pool.end();

  console.log('\n========== 执行结果 ==========');
  console.log(JSON.stringify(result, null, 2));
  console.log('==============================\n');

  process.exit(result.success ? 0 : 1);
}

// 定时任务模式（由外部调度器调用）
export async function scheduledCalculate() {
  log('INFO', 'ItemCountCalculator', '执行定时计算任务');
  const result = await incrementalCalculate();

  if (!result.success) {
    log('ERROR', 'ItemCountCalculator', '定时计算任务失败');
  }

  return result;
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('recalculateItemCounts')) {
  main().catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

export default {
  incrementalCalculate,
  fullCalculate,
  calculateDateRange,
  scheduledCalculate,
  getStats
};
