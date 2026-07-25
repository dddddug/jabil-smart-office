const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkData = async () => {
  try {
    console.log('=== 检查用户表结构 ===');
    const structResult = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['jso_system_user_management']);
    console.log('用户表字段:', structResult.rows);
    
    console.log('\n=== 检查用户ID=48 ===');
    const userResult = await pool.query('SELECT * FROM jso_system_user_management WHERE id = $1', [48]);
    console.log('用户数据:', userResult.rows);
    
    console.log('\n=== 检查所有用户 ===');
    const allUsersResult = await pool.query('SELECT id, username, real_name FROM jso_system_user_management LIMIT 10');
    console.log('用户列表:', allUsersResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('检查数据失败:', error);
    process.exit(1);
  }
};

checkData();
