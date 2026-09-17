// PNC转仓加急字段迁移脚本
// 运行方式: node runUrgentMigration.js

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔄 开始添加 is_urgent 字段...');

    // 添加 is_urgent 到 jso_pnc_transfer_config 表
    await pool.query(`
      ALTER TABLE jso_pnc_transfer_config
      ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ jso_pnc_transfer_config.is_urgent 字段已添加');

    // 添加注释
    await pool.query(`
      COMMENT ON COLUMN jso_pnc_transfer_config.is_urgent IS '是否加急';
    `);
    console.log('✅ jso_pnc_transfer_config.is_urgent 注释已添加');

    // 添加 is_urgent 到 jso_pnc_transfer_document 表
    await pool.query(`
      ALTER TABLE jso_pnc_transfer_document
      ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ jso_pnc_transfer_document.is_urgent 字段已添加');

    // 添加注释
    await pool.query(`
      COMMENT ON COLUMN jso_pnc_transfer_document.is_urgent IS '是否加急';
    `);
    console.log('✅ jso_pnc_transfer_document.is_urgent 注释已添加');

    console.log('🎉 所有迁移完成!');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
