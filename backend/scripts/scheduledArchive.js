/**
 * 定时归档脚本
 *
 * 功能：将主表中超过30天的数据归档到归档表
 *
 * 使用方式：
 *   node backend/scripts/scheduledArchive.js
 *
 * 定时任务建议（每天凌晨2点执行）：
 *   Windows: Task Scheduler
 *   Linux: crontab -e 添加 0 2 * * * node /path/to/scheduledArchive.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  timezone: 'Asia/Shanghai',
  max: 2,
});

const HOT_DATA_DAYS = 30;  // 热数据保留天数

async function runScheduledArchive() {
  const startTime = Date.now();
  console.log('📦 开始定时归档任务...');
  console.log(`   归档策略: 超过 ${HOT_DATA_DAYS} 天的数据移至归档表\n`);

  try {
    // 1. 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HOT_DATA_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // 2. 查看待归档数据
    const pendingCount = await pool.query(`
      SELECT COUNT(*) as pending FROM jso_stockroom_urgent_pull_data
      WHERE data_date < $1
    `, [cutoffDateStr]);

    const pending = parseInt(pendingCount.rows[0].pending);
    console.log(`📊 待归档记录: ${pending} 条`);

    if (pending === 0) {
      console.log('✅ 没有需要归档的数据');
      return { success: true, archived: 0 };
    }

    // 3. 执行归档
    console.log('\n🗄️  开始归档数据...');

    const BATCH_SIZE = 5000;
    let archived = 0;
    let batchNum = 0;

    while (true) {
      // 从主表取出数据并删除
      const batchResult = await pool.query(`
        DELETE FROM jso_stockroom_urgent_pull_data
        WHERE id IN (
          SELECT id FROM jso_stockroom_urgent_pull_data
          WHERE data_date < $1
          ORDER BY data_date, id
          LIMIT $2
        )
        RETURNING *
      `, [cutoffDateStr, BATCH_SIZE]);

      if (batchResult.rows.length === 0) {
        break;
      }

      // 插入归档表
      for (const row of batchResult.rows) {
        try {
          await pool.query(`
            INSERT INTO jso_stockroom_urgent_pull_data_archive (
              build_plan, customer, material_req_time, pulllist_no,
              part_number, part_desc, qty_required, qty_allocated, qty_short,
              bin_location, is_pull_list_shortage, build_plan_id, bp_type, qm, sloc,
              storage_area, step, factory_ma_route, sets, sap_model, assembly,
              creator, create_time, data_date, pulled_at, warehouse, item_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
            ON CONFLICT (pulllist_no, data_date, archived_at) DO NOTHING
          `, [
            row.build_plan, row.customer, row.material_req_time, row.pulllist_no,
            row.part_number, row.part_desc, row.qty_required, row.qty_allocated,
            row.qty_short, row.bin_location, row.is_pull_list_shortage, row.build_plan_id,
            row.bp_type, row.qm, row.sloc, row.storage_area, row.step, row.factory_ma_route,
            row.sets, row.sap_model, row.assembly, row.creator, row.create_time,
            row.data_date, row.pulled_at, row.warehouse, row.item_count || 0
          ]);
        } catch (e) {
          // 忽略冲突错误
        }
      }

      archived += batchResult.rows.length;
      batchNum++;
      console.log(`   批次 ${batchNum}: 归档 ${batchResult.rows.length} 条 (累计: ${archived})`);

      // 每批之间稍作延迟
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 4. 验证结果
    console.log('\n📊 归档后统计:');

    const mainStats = await pool.query(`
      SELECT COUNT(*) as count, MIN(data_date) as oldest, MAX(data_date) as newest
      FROM jso_stockroom_urgent_pull_data
    `);

    const archiveStats = await pool.query(`
      SELECT COUNT(*) as count, MIN(data_date) as oldest, MAX(data_date) as newest
      FROM jso_stockroom_urgent_pull_data_archive
    `);

    console.log(`   主表: ${mainStats.rows[0].count} 条 (${mainStats.rows[0].oldest} ~ ${mainStats.rows[0].newest})`);
    console.log(`   归档表: ${archiveStats.rows[0].count} 条 (${archiveStats.rows[0].oldest} ~ ${archiveStats.rows[0].newest})`);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`\n✅ 归档完成！耗时: ${elapsed.toFixed(2)} 秒`);

    return { success: true, archived, elapsed };

  } catch (error) {
    console.error('❌ 归档失败:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// 只有直接运行此脚本时才执行（不是被导入时）
const isMainModule = process.argv[1]?.endsWith('scheduledArchive.js');
if (isMainModule) {
  runScheduledArchive()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(e => { console.error('执行失败:', e); process.exit(1); });
}

// 导出供 server.js 调用
export default runScheduledArchive;
