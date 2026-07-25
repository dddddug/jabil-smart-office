const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const createTables = async () => {
  try {
    // 读取并执行系统公告表的创建SQL
    const sqlPath = path.join(__dirname, '../database/migrations/add_system_announcements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = sql
      .split(/;\s*$/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('执行SQL成功');
      } catch (error) {
        // 如果表已存在，忽略错误
        if (error.code !== '42P07' && error.code !== '42P16') {
          console.error('执行SQL失败:', error);
        } else {
          console.log('表已存在，跳过创建');
        }
      }
    }
    
    console.log('系统公告表创建完成！');
    process.exit(0);
  } catch (error) {
    console.error('创建表失败:', error);
    process.exit(1);
  }
};

createTables();
