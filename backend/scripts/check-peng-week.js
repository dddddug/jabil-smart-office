
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

const checkUser = async () => {
  try {
    const startDate = '2025-12-24';
    const endDate = '2025-12-30';
    
    console.log(`查询彭绍勇 ${startDate} 到 ${endDate} 的排班...\n`);
    
    // 查询彭绍勇
    const userResult = await pool.query(`
      SELECT 
        u.id, u.real_name, u.position, u.level,
        p.name as plant_name, d.name as department_name
      FROM jso_system_user_management u
      LEFT JOIN jso_org_plant_management p ON u.plant_id = p.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      WHERE u.real_name = '彭绍勇'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ 未找到彭绍勇');
    } else {
      const peng = userResult.rows[0];
      console.log(`✅ 彭绍勇信息：`);
      console.log(`  ID: ${peng.id}`);
      console.log(`  姓名: ${peng.real_name}`);
      console.log(`  岗位: ${peng.position}`);
      console.log(`  级别: ${peng.level}`);
      
      // 查询该日期范围内的排班
      const scheduleResult = await pool.query(`
        SELECT * FROM jso_hr_employee_schedule
        WHERE employee_id = $1
          AND schedule_date BETWEEN $2 AND $3
        ORDER BY schedule_date
      `, [peng.id, startDate, endDate]);
      
      console.log(`\n📅 ${startDate} 到 ${endDate} 的排班记录 (${scheduleResult.rows.length}条):`);
      if (scheduleResult.rows.length > 0) {
        scheduleResult.rows.forEach(row => {
          console.log(`  ${row.schedule_date}: 班次=${row.shift}, 特殊状态=${row.special_status}`);
        });
      } else {
        console.log(`  暂无排班`);
      }
      
      // 查彭绍勇最早和最晚的排班日期
      const dateRangeResult = await pool.query(`
        SELECT MIN(schedule_date) as min_date, MAX(schedule_date) as max_date
        FROM jso_hr_employee_schedule
        WHERE employee_id = $1
      `, [peng.id]);
      
      if (dateRangeResult.rows[0].min_date) {
        console.log(`\n📊 排班日期范围：`);
        console.log(`  最早: ${dateRangeResult.rows[0].min_date}`);
        console.log(`  最晚: ${dateRangeResult.rows[0].max_date}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询错误:', error);
    process.exit(1);
  }
};

checkUser();
