const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkData = async () => {
  try {
    console.log('📊 查询临时请假表数据...');
    
    const result = await pool.query(`
      SELECT id, employee_id, leave_type, start_date, end_date, hours
      FROM jso_hr_temporary_leave 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log(`找到 ${result.rows.length} 条记录：`);
    result.rows.forEach((row, i) => {
      console.log(`\n--- 记录 ${i+1} ---`);
      console.log(`ID: ${row.id}`);
      console.log(`类型: ${row.leave_type}`);
      console.log(`开始: ${row.start_date} (类型: ${typeof row.start_date})`);
      console.log(`结束: ${row.end_date}`);
      console.log(`时长: ${row.hours}`);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

checkData();
