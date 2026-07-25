const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkTables = async () => {
  try {
    console.log('检查数据库表结构...\n');
    
    // 检查用户表结构
    console.log('=== jso_system_user_management 表结构 ===');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'jso_system_user_management'
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(row => {
      console.log(`${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable}`);
    });
    
    // 检查用户表数据
    console.log('\n=== 用户表数据 ===');
    const usersResult = await pool.query(`
      SELECT * FROM jso_system_user_management ORDER BY id
    `);
    
    console.log(`找到 ${usersResult.rows.length} 条用户记录:\n`);
    usersResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, 用户名: ${row.username}, 姓名: ${row.real_name}`);
    });
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await pool.end();
  }
};

checkTables();
