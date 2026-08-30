/**
 * ITEM计数预计算脚本
 *
 * 功能：为 jso_stockroom_urgent_pull_data 表预计算 ITEM 计数，
 *       避免每次查询时都去关联 jso_sap_pull_log_partitioned 表
 *
 * 使用方式：
 *   node backend/scripts/precomputeItemCounts.js
 *
 * 建议定时任务：每天凌晨执行一次
 */

import pool from '../config/db.js';
import { logInfo, logError } from '../utils/logger.js';

const DATA_TABLE = 'jso_stockroom_urgent_pull_data_partitioned';
const SAP_PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';

async function precomputeItemCounts() {
  const startTime = Date.now();
  logInfo('PrecomputeItemCounts', '开始预计算ITEM计数');

  try {
    // 1. 创建临时表存储预计算结果
    await pool.query(`
      CREATE TEMP TABLE IF NOT EXISTS temp_item_counts AS
      SELECT
        d.pulllist_no,
        d.data_date,
        COUNT(spl.id) as item_count
      FROM (
        SELECT DISTINCT ON (pulllist_no, data_date)
          pulllist_no,
          data_date,
          pulled_at
        FROM ${DATA_TABLE}
        ORDER BY pulllist_no, data_date, pulled_at DESC
      ) d
      LEFT JOIN ${SAP_PULL_LOG_TABLE} spl
        ON spl.reference ILIKE '%' || d.pulllist_no || '%'
        AND spl.date_created::date >= (d.data_date - INTERVAL '7 days')
        AND spl.date_created::date <= (d.data_date + INTERVAL '7 days')
      GROUP BY d.pulllist_no, d.data_date
    `);

    // 2. 获取统计信息
    const stats = await pool.query(`
      SELECT COUNT(*) as total, SUM(item_count) as total_items
      FROM temp_item_counts
    `);

    // 3. 输出结果（实际应用时可以将结果写入缓存或物化视图）
    const elapsed = Date.now() - startTime;
    const result = stats.rows[0];

    logInfo('PrecomputeItemCounts', '预计算完成', {
      totalPulllistNos: result.total,
      totalItems: result.total_items,
      elapsed: `${elapsed}ms`
    });

    // 4. 清理临时表
    await pool.query('DROP TABLE IF EXISTS temp_item_counts');

    return {
      success: true,
      totalPulllistNos: parseInt(result.total),
      totalItems: parseInt(result.total_items),
      elapsed
    };

  } catch (error) {
    logError('PrecomputeItemCounts', '预计算失败', { message: error.message });
    return { success: false, error: error.message };
  }
}

// 如果直接运行此脚本
if (process.argv[1]?.includes('precomputeItemCounts')) {
  precomputeItemCounts()
    .then(result => {
      console.log('结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(e => {
      console.error('执行失败:', e);
      process.exit(1);
    });
}

export default precomputeItemCounts;
