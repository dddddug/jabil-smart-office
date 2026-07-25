
const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkUser = async () => {
  try {
    console.log('查询彭绍勇的排班信息...\n');
    
    // 查询指定员工
    const result = await pool.query(`
      SELECT 
        u.*,
        p.name as plant_name,
        d.name as department_name
      FROM jso_system_user_management u
      LEFT JOIN jso_org_plant_management p ON u.plant_id = p.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      WHERE u.real_name = '彭绍勇'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ 未找到彭绍勇');
    } else {
      const peng = result.rows[0];
      console.log(`✅ 彭绍勇信息：`);
      console.log(`  ID: ${peng.id}`);
      console.log(`  姓名: ${peng.real_name}`);
      console.log(`  厂区: ${peng.plant_name}`);
      console.log(`  部门: ${peng.department_name}`);
      console.log(`  状态: ${peng.status}`);
      console.log(`  离职日期: ${peng.resignation_date}`);
      
      // 查询排班
      const scheduleResult = await pool.query(`
        SELECT * FROM jso_hr_employee_schedule
        WHERE employee_id = $1
        ORDER BY schedule_date
      `, [peng.id]);
      
      console.log(`\n📅 排班记录 (${scheduleResult.rows.length}条):`);
      if (scheduleResult.rows.length > 0) {
        scheduleResult.rows.forEach(row => {
          console.log(`  ${row.schedule_date}: 班次=${row.shift}, 特殊状态=${row.special_status}`);
        });
      } else {
        console.log(`  暂无排班`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询错误:', error);
    process.exit(1);
  }
};

checkUser();
