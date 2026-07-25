const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
});

async function runMigration(migrationFileName) {
  if (!migrationFileName) {
    console.error('请提供要运行的迁移文件名，例如: node run_migration.js add_transfer_approval_fields.sql');
    process.exit(1);
  }

  try {
    console.log(`开始执行数据库迁移: ${migrationFileName}...`);
    
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFileName);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    const statements = migrationSql
      .split(/;\s*$/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✓ 执行成功:', statement.substring(0, 50) + '...');
      } catch (err) {
        if (err.message.includes('column') && err.message.includes('already exists')) {
          console.log('ℹ 字段已存在，跳过:', statement.substring(0, 50) + '...');
        } else {
          throw err;
        }
      }
    }
    
    console.log('✓ 数据库迁移完成！');
  } catch (error) {
    console.error('✗ 数据库迁移失败:', error);
  } finally {
    await pool.end();
  }
}

const migrationFile = process.argv[2];
runMigration(migrationFile);
