/**
 * 数据归档迁移脚本
 *
 * 策略：
 * 1. 创建归档表
 * 2. 将超过30天的数据迁移到归档表
 * 3. 主表只保留最近30天数据
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
  max: 3,
});

const HOT_DATA_DAYS = 30;  // 保留天数

async function runMigration() {
  const startTime = Date.now();
  console.log('🔄 开始数据归档迁移...\n');

  try {
    // 1. 创建归档表
    console.log('📦 1. 创建归档表...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jso_stockroom_urgent_pull_data_archive (
        id SERIAL PRIMARY KEY,
        build_plan VARCHAR(255),
        customer VARCHAR(255),
        material_req_time TIMESTAMP,
        pulllist_no VARCHAR(255),
        part_number VARCHAR(255),
        part_desc TEXT,
        qty_required INTEGER DEFAULT 0,
        qty_allocated INTEGER DEFAULT 0,
        qty_short INTEGER DEFAULT 0,
        bin_location VARCHAR(100),
        is_pull_list_shortage BOOLEAN DEFAULT FALSE,
        build_plan_id INTEGER,
        bp_type VARCHAR(50),
        qm VARCHAR(50),
        sloc VARCHAR(50),
        storage_area VARCHAR(100),
        step VARCHAR(50),
        factory_ma_route VARCHAR(255),
        sets INTEGER DEFAULT 0,
        sap_model VARCHAR(255),
        assembly TEXT,
        creator VARCHAR(255),
        create_time TIMESTAMP,
        data_date DATE NOT NULL,
        pulled_at TIMESTAMP DEFAULT NOW(),
        warehouse VARCHAR(100),
        item_count INTEGER DEFAULT 0,
        archived_at TIMESTAMP DEFAULT NOW(),  -- 归档时间
        UNIQUE(pulllist_no, data_date, archived_at)
      );
    `);
    console.log('✅ 归档表创建成功');

    // 2. 创建归档表索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_archive_pulllist ON jso_stockroom_urgent_pull_data_archive(pulllist_no);
      CREATE INDEX IF NOT EXISTS idx_archive_data_date ON jso_stockroom_urgent_pull_data_archive(data_date);
      CREATE INDEX IF NOT EXISTS idx_archive_pulled_at ON jso_stockroom_urgent_pull_data_archive(pulled_at);
      CREATE INDEX IF NOT EXISTS idx_archive_archived_at ON jso_stockroom_urgent_pull_data_archive(archived_at);
    `);
    console.log('✅ 归档表索引创建成功');

    // 3. 查看当前数据分布
    console.log('\n📊 2. 数据分布统计...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HOT_DATA_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    console.log(`   截止日期: ${cutoffDateStr} (${HOT_DATA_DAYS}天前)`);

    // 统计主表总数据
    const totalCount = await pool.query(`
      SELECT COUNT(*) as total FROM jso_stockroom_urgent_pull_data
    `);
    console.log(`   主表总记录: ${totalCount.rows[0].total}`);

    // 统计超过30天的数据
    const oldCount = await pool.query(`
      SELECT COUNT(*) as old_count FROM jso_stockroom_urgent_pull_data
      WHERE data_date < $1
    `, [cutoffDateStr]);
    console.log(`   超过30天需归档: ${oldCount.rows[0].old_count}`);

    // 统计最近30天数据
    const hotCount = await pool.query(`
      SELECT COUNT(*) as hot_count FROM jso_stockroom_urgent_pull_data
      WHERE data_date >= $1
    `, [cutoffDateStr]);
    console.log(`   最近30天热数据: ${hotCount.rows[0].hot_count}`);

    // 4. 迁移数据到归档表
    console.log('\n📦 3. 迁移数据到归档表...');

    const BATCH_SIZE = 5000;
    let archived = 0;
    let batchNum = 0;

    while (true) {
      // 获取将被归档的数据
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

      // 插入到归档表
      for (const row of batchResult.rows) {
        await pool.query(`
          INSERT INTO jso_stockroom_urgent_pull_data_archive (
            build_plan, customer, material_req_time, pulllist_no,
            part_number, part_desc, qty_required, qty_allocated, qty_short,
            bin_location, is_pull_list_shortage, build_plan_id, bp_type, qm, sloc,
            storage_area, step, factory_ma_route, sets, sap_model, assembly,
            creator, create_time, data_date, pulled_at, warehouse, item_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          )
          ON CONFLICT (pulllist_no, data_date, archived_at)
          DO NOTHING
        `, [
          row.build_plan, row.customer, row.material_req_time, row.pulllist_no,
          row.part_number, row.part_desc, row.qty_required, row.qty_allocated,
          row.qty_short, row.bin_location, row.is_pull_list_shortage, row.build_plan_id,
          row.bp_type, row.qm, row.sloc, row.storage_area, row.step, row.factory_ma_route,
          row.sets, row.sap_model, row.assembly, row.creator, row.create_time,
          row.data_date, row.pulled_at, row.warehouse, row.item_count || 0
        ]);
      }

      archived += batchResult.rows.length;
      batchNum++;
      console.log(`   批次 ${batchNum}: 归档 ${batchResult.rows.length} 条 (累计: ${archived})`);
    }

    console.log(`\n✅ 数据归档完成！共归档 ${archived} 条记录`);

    // 5. 验证结果
    console.log('\n📊 4. 验证结果...');

    const mainTableCount = await pool.query(`
      SELECT COUNT(*) as count, MIN(data_date) as oldest, MAX(data_date) as newest
      FROM jso_stockroom_urgent_pull_data
    `);

    const archiveCount = await pool.query(`
      SELECT COUNT(*) as count, MIN(data_date) as oldest, MAX(data_date) as newest
      FROM jso_stockroom_urgent_pull_data_archive
    `);

    console.log('   主表:');
    console.log(`     记录数: ${mainTableCount.rows[0].count}`);
    console.log(`     日期范围: ${mainTableCount.rows[0].oldest} ~ ${mainTableCount.rows[0].newest}`);

    console.log('   归档表:');
    console.log(`     记录数: ${archiveCount.rows[0].count}`);
    console.log(`     日期范围: ${archiveCount.rows[0].oldest} ~ ${archiveCount.rows[0].newest}`);

    const elapsed = (Date.now() - startTime) / 1000;
    console.log(`\n🎉 迁移完成！耗时: ${elapsed.toFixed(2)} 秒`);

    console.log('\n📌 后续操作:');
    console.log('   1. 重启后端服务');
    console.log('   2. 设置定时归档任务: node backend/scripts/scheduledArchive.js');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
