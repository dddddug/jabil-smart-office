const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkTableColumns = async () => {
  try {
    console.log('查询用户表的实际列名...\n');
    
    // 查询表结构
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'jso_system_user_management'
      ORDER BY ordinal_position
    `);
    
    console.log('=== jso_system_user_management 表结构 ===\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n\n=== 查询员工数据 ===\n');
    
    // 查询实际存在的列
    const employeesResult = await pool.query(`
      SELECT * FROM jso_system_user_management
      ORDER BY id
    `);
    
    console.log('找到 ' + employeesResult.rows.length + ' 个员工\n');
    
    employeesResult.rows.forEach((row, index) => {
      console.log(`员工 ${index + 1}:`);
      console.log(row);
      console.log('---');
    });
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await pool.end();
  }
};

checkTableColumns();
