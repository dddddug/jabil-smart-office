/**
 * 运行数据库迁移脚本
 * 使用方法: node run-migration.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (in backend directory)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('开始运行数据库迁移...');
    console.log(`数据库: ${process.env.DB_NAME}`);

    // 读取迁移文件
    const migrationsDir = path.resolve(__dirname, './database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`找到 ${files.length} 个迁移文件`);

    for (const file of files) {
      console.log(`\n执行迁移: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await client.query(sql);
        console.log(`✓ ${file} 执行成功`);
      } catch (err) {
        if (err.code === '42710' || err.code === '42P07' || err.code === '23505') {
          // 索引已存在或表已存在，忽略
          console.log(`⚠ ${file} (部分已存在，跳过)`);
        } else if (err.code === '23505') {
          console.log(`⚠ ${file} (数据已存在，跳过)`);
        } else {
          console.error(`✗ ${file} 执行失败:`, err.message);
          throw err;
        }
      }
    }

    console.log('\n✓ 所有迁移执行完成!');
  } catch (err) {
    console.error('\n✗ 迁移执行失败:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
