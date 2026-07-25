import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jabil_smart_office',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    // 添加邮箱字段
    await client.query(`
      ALTER TABLE jso_system_user_management
      ADD COLUMN IF NOT EXISTS email VARCHAR(255)
    `);
    console.log('✓ 已添加 email 字段到 jso_system_user_management 表');

    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_email ON jso_system_user_management(email)
    `);
    console.log('✓ 已创建 email 索引');

    console.log('\n迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
