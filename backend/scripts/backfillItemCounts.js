/**
 * 补充计算历史数据的 ITEM 计数（优化版）
 *
 * 使用方式：
 *   node backend/scripts/backfillItemCounts.js
 */

import pool from '../config/db.js';
import { logInfo, logError } from '../utils/logger.js';

const DATA_TABLE = 'jso_stockroom_urgent_pull_data_partitioned';
const ARCHIVE_TABLE = 'jso_stockroom_urgent_pull_data_archive';
const SAP_PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';

/**
 * 将日期转为 YYYY-MM-DD 格式（用于分区表）
 */
function toDateStringISO(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * 计算日期范围（分区表格式）
 */
function getDateRangeISO(baseDate) {
  const d = new Date(baseDate);
  const before = new Date(d);
  before.setDate(before.getDate() - 7);
  const after = new Date(d);
  after.setDate(after.getDate() + 7);
  return {
    from: toDateStringISO(before),
    to: toDateStringISO(after)
  };
}

/**
 * 批量更新主表 item_count
 */
async function backfillMainTable() {
  logInfo('BackfillItemCounts', '开始处理主表');

  let totalUpdated = 0;

  while (true) {
    // 每次获取100条未更新的记录
    const result = await pool.query(`
      SELECT pulllist_no, data_date
      FROM ${DATA_TABLE}
      WHERE item_count IS NULL OR item_count = 0
      ORDER BY data_date DESC
      LIMIT 100
    `);

    if (result.rows.length === 0) {
      logInfo('BackfillItemCounts', `主表处理完成，总计更新 ${totalUpdated} 条`);
      return totalUpdated;
    }

    // 逐条更新
    for (const row of result.rows) {
      const { from, to } = getDateRangeISO(row.data_date);
      const countResult = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM ${SAP_PULL_LOG_TABLE}
        WHERE reference ILIKE '%' || $1 || '%'
          AND date_created >= $2::date
          AND date_created <= $3::date
      `, [row.pulllist_no, from, to]);

      const count = parseInt(countResult.rows[0]?.cnt || 0);

      await pool.query(`
        UPDATE ${DATA_TABLE}
        SET item_count = $1
        WHERE pulllist_no = $2 AND data_date = $3
      `, [count, row.pulllist_no, row.data_date]);

      totalUpdated++;
    }

    console.log(`主表已更新: ${totalUpdated} 条`);
  }
}

/**
 * 批量更新归档表 item_count
 */
async function backfillArchiveTable() {
  logInfo('BackfillItemCounts', '开始处理归档表');

  let totalUpdated = 0;

  while (true) {
    // 每次获取100条未更新的记录
    const result = await pool.query(`
      SELECT pulllist_no, data_date
      FROM ${ARCHIVE_TABLE}
      WHERE item_count IS NULL OR item_count = 0
      ORDER BY data_date DESC
      LIMIT 100
    `);

    if (result.rows.length === 0) {
      logInfo('BackfillItemCounts', `归档表处理完成，总计更新 ${totalUpdated} 条`);
      return totalUpdated;
    }

    // 逐条更新
    for (const row of result.rows) {
      const { from, to } = getDateRangeISO(row.data_date);
      const countResult = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM ${SAP_PULL_LOG_TABLE}
        WHERE reference ILIKE '%' || $1 || '%'
          AND date_created >= $2::date
          AND date_created <= $3::date
      `, [row.pulllist_no, from, to]);

      const count = parseInt(countResult.rows[0]?.cnt || 0);

      await pool.query(`
        UPDATE ${ARCHIVE_TABLE}
        SET item_count = $1
        WHERE pulllist_no = $2 AND data_date = $3
      `, [count, row.pulllist_no, row.data_date]);

      totalUpdated++;
    }

    console.log(`归档表已更新: ${totalUpdated} 条`);
  }
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  logInfo('BackfillItemCounts', '开始补充计算 ITEM 计数');

  try {
    // 处理主表
    const mainUpdated = await backfillMainTable();

    // 处理归档表
    const archiveUpdated = await backfillArchiveTable();

    const elapsed = (Date.now() - startTime) / 1000;
    const result = {
      success: true,
      mainUpdated,
      archiveUpdated,
      totalUpdated: mainUpdated + archiveUpdated,
      elapsed: `${elapsed.toFixed(2)} 秒`
    };

    logInfo('BackfillItemCounts', '完成', result);
    console.log('\n========== 执行结果 ==========');
    console.log(`主表更新: ${mainUpdated}`);
    console.log(`归档表更新: ${archiveUpdated}`);
    console.log(`总计更新: ${result.totalUpdated}`);
    console.log(`耗时: ${result.elapsed}`);
    console.log('================================\n');

    return result;

  } catch (error) {
    logError('BackfillItemCounts', '执行失败', { message: error.message });
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

main()
  .then(result => process.exit(result.success ? 0 : 1))
  .catch(e => { console.error('执行失败:', e); process.exit(1); });
