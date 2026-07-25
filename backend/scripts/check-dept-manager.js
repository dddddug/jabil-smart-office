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
    console.log('=== 检查部门数据 ===');
    const deptResult = await pool.query(`SELECT * FROM jso_org_department_management ORDER BY id`);
    console.log('部门数据:', JSON.stringify(deptResult.rows, null, 2));
    
    console.log('\n=== 检查用户数据 ===');
    const userResult = await pool.query(`SELECT id, username, real_name, plant_id, department_id, role_id FROM jso_system_user_management ORDER BY id`);
    console.log('用户数据:', JSON.stringify(userResult.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('检查数据失败:', error);
    process.exit(1);
  }
};

checkData();
