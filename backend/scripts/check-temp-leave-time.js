const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkTempLeaveData = async () => {
  try {
    console.log('查询临时请假数据...');
    const result = await pool.query('SELECT * FROM jso_hr_temporary_leave ORDER BY created_at DESC LIMIT 10');
    console.log('\n查询结果:');
    result.rows.forEach((row, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('  id:', row.id);
      console.log('  start_date:', row.start_date);
      console.log('  end_date:', row.end_date);
      console.log('  start_time:', row.start_time);
      console.log('  end_time:', row.end_time);
      console.log('  hours:', row.hours);
      console.log('  leave_type:', row.leave_type);
    });
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
};

checkTempLeaveData();
