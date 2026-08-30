/**
 * 数据库迁移脚本
 * 执行 Stockroom Urgent Pull 性能优化所需的数据库变更
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
});

async function runMigration() {
  console.log('🔄 开始数据库迁移...\n');

  try {
    // 1. 检查表是否存在
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'jso_stockroom_urgent_pull_data'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ 表 jso_stockroom_urgent_pull_data 不存在');
      process.exit(1);
    }
    console.log('✅ 表 jso_stockroom_urgent_pull_data 存在');

    // 2. 检查 item_count 字段是否已存在
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'jso_stockroom_urgent_pull_data'
          AND column_name = 'item_count'
      ) as exists
    `);

    if (columnCheck.rows[0].exists) {
      console.log('⚠️  item_count 字段已存在，跳过添加字段');
    } else {
      // 添加 item_count 字段
      await pool.query(`
        ALTER TABLE jso_stockroom_urgent_pull_data
        ADD COLUMN item_count INTEGER DEFAULT 0
      `);
      console.log('✅ 添加 item_count 字段成功');
    }

    // 3. 创建复合索引（如果不存在）
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_pulllist_date
      ON jso_stockroom_urgent_pull_data(pulllist_no, data_date)
    `);
    console.log('✅ 创建索引 idx_stockroom_pull_data_pulllist_date');

    // 4. 创建 material_req_time 索引（如果不存在）
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_material_req_time
      ON jso_stockroom_urgent_pull_data(material_req_time)
    `);
    console.log('✅ 创建索引 idx_stockroom_pull_data_material_req_time');

    // 5. 创建 pulled_at 索引（如果不存在）
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_pulled_at
      ON jso_stockroom_urgent_pull_data(pulled_at)
    `);
    console.log('✅ 创建索引 idx_stockroom_pull_data_pulled_at');

    // 6. 查看当前数据量和缺失计数的情况
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN item_count IS NULL OR item_count = 0 THEN 1 ELSE 0 END) as missing_counts,
        SUM(item_count) as total_items
      FROM jso_stockroom_urgent_pull_data
    `);

    const stats = statsResult.rows[0];
    console.log('\n📊 当前数据统计:');
    console.log(`   总记录数: ${stats.total_records}`);
    console.log(`   缺失计数: ${stats.missing_counts}`);
    console.log(`   总ITEM数: ${stats.total_items || 0}`);

    console.log('\n🎉 数据库迁移完成！');

    // 输出下一步提示
    if (parseInt(stats.missing_counts) > 0) {
      console.log('\n📌 下一步:');
      console.log('   运行以下命令补充计算历史数据的 ITEM 计数:');
      console.log('   node backend/scripts/backfillItemCounts.js 500 100');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
