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
    console.log('开始创建HR相关表...');
    
    const sqlPath = path.join(__dirname, 'create_hr_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = sql
      .split(/;\s*$/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✓ 执行成功');
      } catch (err) {
        if (err.message.includes('already exists') || 
            err.message.includes('已存在')) {
          console.log('已存在，跳过');
        } else {
          console.error('✗ 执行失败:', err.message);
        }
      }
    }
    
    console.log('\nHR表创建完成！');
    
    // 验证表是否存在
    const checkTables = [
      'jso_hr_temporary_overtime',
      'jso_hr_temporary_leave',
      'jso_hr_formal_leave'
    ];
    
    console.log('\n验证表是否存在:');
    for (const table of checkTables) {
      try {
        await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`✓ ${table} - 存在`);
      } catch (err) {
        console.log(`✗ ${table} - 不存在`);
      }
    }
    
  } catch (error) {
    console.error('创建表失败:', error);
  } finally {
    await pool.end();
  }
};

createTables();
