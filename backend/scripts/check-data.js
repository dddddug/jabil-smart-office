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
    console.log('检查临时加班表数据:');
    const result1 = await pool.query('SELECT COUNT(*) FROM jso_hr_temporary_overtime');
    console.log(`  临时加班记录数: ${result1.rows[0].count}`);
    
    if (parseInt(result1.rows[0].count) > 0) {
      const data1 = await pool.query('SELECT * FROM jso_hr_temporary_overtime LIMIT 5');
      console.log('  示例数据:', data1.rows);
    }

    console.log('\n检查临时请假表数据:');
    const result2 = await pool.query('SELECT COUNT(*) FROM jso_hr_temporary_leave');
    console.log(`  临时请假记录数: ${result2.rows[0].count}`);

    console.log('\n检查正式请假表数据:');
    const result3 = await pool.query('SELECT COUNT(*) FROM jso_hr_formal_leave');
    console.log(`  正式请假记录数: ${result3.rows[0].count}`);

  } catch (error) {
    console.error('检查数据失败:', error);
  } finally {
    await pool.end();
  }
};

checkData();
