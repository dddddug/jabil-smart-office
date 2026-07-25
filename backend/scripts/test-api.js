
const { Pool } = require('pg');
const dayjs = require('dayjs');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const USER_TABLE = 'jso_system_user_management';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';
const SCHEDULE_TABLE = 'jso_hr_employee_schedule';
const TEMPORARY_OVERTIME_TABLE = 'jso_hr_temporary_overtime';
const TEMPORARY_LEAVE_TABLE = 'jso_hr_temporary_leave';

const testAPI = async () => {
  try {
    const plantId = null;
    const departmentId = null;
    const startDate = '2025-12-24';
    const endDate = '2025-12-30';
    
    console.log('模拟 /api/schedule/employees 接口查询...\n');
    
    // 1. 获取所有员工（不包括超级管理员）
    let userWhere = " WHERE u.real_name != '超级管理员'";
    const userParams = [];
    let userParamIndex = 1;
    
    // 确定查询的日期范围，默认当前月
    const now = dayjs();
    const monthStart = now.startOf('month').format('YYYY-MM-DD');
    const monthEnd = now.endOf('month').format('YYYY-MM-DD');
    const queryStart = startDate || monthStart;
    const queryEnd = endDate || monthEnd;
    
    if (plantId) {
      userWhere += ` AND u.plant_id = $${userParamIndex++}`;
      userParams.push(plantId);
    }
    
    if (departmentId) {
      userWhere += ` AND u.department_id = $${userParamIndex++}`;
      userParams.push(departmentId);
    }
    
    const usersResult = await pool.query(`
      SELECT u.*, p.name as plant_name, d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      ${userWhere}
      ORDER BY u.id
    `, userParams);
    
    console.log(`✅ 查询到 ${usersResult.rows.length} 个员工`);
    
    // 检查彭绍勇是否在查询结果中
    const peng = usersResult.rows.find(u => u.real_name === '彭绍勇');
    if (peng) {
      console.log(`\n✅ 找到彭绍勇 (ID: ${peng.id})`);
    } else {
      console.log('\n❌ 未找到彭绍勇');
      console.log('员工列表（前20个）：');
      usersResult.rows.slice(0, 20).forEach(u => {
        console.log(`  ${u.id}: ${u.real_name}`);
      });
    }
    
    // 获取排班数据
    const scheduleResult = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE}
      WHERE schedule_date BETWEEN $1 AND $2
    `, [queryStart, queryEnd]);
    
    console.log(`\n✅ 查询到 ${scheduleResult.rows.length} 条排班记录`);
    
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
};

testAPI();
