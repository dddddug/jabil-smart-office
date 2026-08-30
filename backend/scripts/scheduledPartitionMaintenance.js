/**
 * 分区表定时维护脚本
 *
 * 功能：
 * 1. 自动创建未来分区
 * 2. 清理过期分区（超过90天的旧分区）
 *
 * 使用方式：
 * 1. 手动运行：node backend/scripts/scheduledPartitionMaintenance.js
 * 2. 定时任务（Windows）：使用 Task Scheduler 每天凌晨2点执行
 * 3. 定时任务（Linux）：crontab -e 添加 0 2 * * * /path/to/node backend/scripts/scheduledPartitionMaintenance.js
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

// 配置
const RETENTION_DAYS = 90;  // 保留天数
const CREATE_MONTHS_AHEAD = 3;  // 提前创建的月数

async function runMaintenance() {
  const startTime = Date.now();
  console.log('🔧 开始分区表定时维护...');
  console.log(`   保留策略: 最近 ${RETENTION_DAYS} 天\n`);

  let createdCount = 0;
  let droppedCount = 0;

  try {
    // 1. 自动创建未来分区
    console.log('📅 1. 检查并创建未来分区...');

    for (let i = 0; i <= CREATE_MONTHS_AHEAD; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const partitionName = `jso_stockroom_urgent_pull_data_${year}_${month}`;

      // 检查分区是否存在
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_inherits i
          JOIN pg_class c ON i.inhrelid = c.oid
          WHERE c.relname = $1
        ) as exists
      `, [partitionName]);

      if (!exists.rows[0].exists) {
        const startDate = `${year}-${month}-01`;
        const nextMonth = new Date(year, date.getMonth() + 1, 1);
        const endDate = nextMonth.toISOString().split('T')[0];

        await pool.query(`
          CREATE TABLE ${partitionName} PARTITION OF jso_stockroom_urgent_pull_data
          FOR VALUES FROM ('${startDate}') TO ('${endDate}')
        `);
        console.log(`   ✅ 创建分区: ${partitionName}`);
        createdCount++;
      }
    }

    if (createdCount === 0) {
      console.log('   ✅ 所有分区已存在，无需创建');
    }

    // 2. 清理过期分区
    console.log('\n🗑️  2. 清理过期分区...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffMonth = `${cutoffDate.getFullYear()}_${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

    // 获取所有分区
    const partitions = await pool.query(`
      SELECT child.relname as partition_name
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'jso_stockroom_urgent_pull_data'
      ORDER BY child.relname
    `);

    for (const row of partitions.rows) {
      const partitionName = row.partition_name;

      // 提取分区月份（格式: jso_stockroom_urgent_pull_data_YYYY_MM）
      const match = partitionName.match(/jso_stockroom_urgent_pull_data_(\d{4}_\d{2})/);
      if (match) {
        const partitionMonth = match[1];

        // 如果分区月份早于截止月份，删除分区
        if (partitionMonth < cutoffMonth) {
          // 先获取分区记录数
          const countResult = await pool.query(`
            SELECT COUNT(*) as cnt FROM ${partitionName}
          `);
          const recordCount = countResult.rows[0].cnt;

          // 删除分区
          await pool.query(`DROP TABLE IF EXISTS ${partitionName}`);

          console.log(`   🗑️  删除分区: ${partitionName} (${recordCount} 条记录)`);
          droppedCount++;
        }
      }
    }

    if (droppedCount === 0) {
      console.log('   ✅ 没有需要清理的分区');
    }

    // 3. 显示当前分区状态
    console.log('\n📊 3. 当前分区状态:');

    const stats = await pool.query(`
      SELECT
        child.relname as partition_name,
        pg_size_pretty(pg_relation_size(child.oid)) as size,
        (SELECT COUNT(*) FROM jso_stockroom_urgent_pull_data p WHERE child.oid = p.tableoid) as records
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'jso_stockroom_urgent_pull_data'
      ORDER BY child.relname DESC
      LIMIT 10
    `);

    stats.rows.forEach(p => {
      console.log(`   ${p.partition_name}: ${p.size}, ${p.records} 条记录`);
    });

    const totalSize = await pool.query(`
      SELECT pg_size_pretty(SUM(pg_relation_size(child.oid))) as total_size
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'jso_stockroom_urgent_pull_data'
    `);

    console.log(`   总大小: ${totalSize.rows[0].total_size}`);

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ 维护完成！耗时: ${elapsed}ms`);
    console.log(`   新建分区: ${createdCount}`);
    console.log(`   删除分区: ${droppedCount}`);

    return { success: true, createdCount, droppedCount, elapsed };

  } catch (error) {
    console.error('❌ 维护失败:', error.message);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// 执行
runMaintenance()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(e => {
    console.error('执行失败:', e);
    process.exit(1);
  });
