// DA物料单据表迁移脚本
// 运行方式: node runMigration.js

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {

    // 读取迁移SQL文件
    const sqlFile = path.join(__dirname, './database/migrations/V2024_07_20_002__create_da_material_document_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    await pool.query(sql);


    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_status ON jso_da_material_document(status)',
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_document_no ON jso_da_material_document(document_no)',
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_da_no ON jso_da_material_document(da_no)',
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_submitter ON jso_da_material_document(submitter_name)',
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_submitted_at ON jso_da_material_document(submitted_at)',
      'CREATE INDEX IF NOT EXISTS idx_da_material_document_wc_name ON jso_da_material_document(wc_name)'
    ];

    for (const indexSql of indexes) {
      await pool.query(indexSql);
    }


  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
