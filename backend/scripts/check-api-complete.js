
const { Pool } = require('pg');
const dayjs = require('dayjs');

// 数据库连接配�?const pool = new Pool({
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

const checkAPI = async () => {
  try {
    const startDate = '2026-06-29';
    const endDate = '2026-07-05';
    
//     console.log('检查日�?', startDate, '�?, endDate);
//     console.log('='.repeat(100));
    
    // 1. 获取所有员�?    const usersResult = await pool.query(`
      SELECT u.*, p.name as plant_name, d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      WHERE u.real_name != '超级管理�?
      ORDER BY u.id
    `);
    
//     console.log(`�?找到 ${usersResult.rows.length} 名员工`);
    const targetNames = ['彭绍�?, '周健', '成晓�?, '梁飞'];
    targetNames.forEach(name => {
      const emp = usersResult.rows.find(e => e.real_name === name);
      if (emp) {
//         console.log(`�?找到 ${name}: ID=${emp.id}, 岗位=${emp.position}, 部门=${emp.department_name}`);
      } else {
//         console.log(`�?未找�?${name}`);
      }
    });
    
//     console.log('\n' + '='.repeat(100));
    
    // 2. 检查彭绍勇在该日期范围的排班和工时
    const pengId = 76;
    const scheduleResult = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE}
      WHERE employee_id = $1
      AND schedule_date BETWEEN $2 AND $3
      ORDER BY schedule_date
    `, [pengId, startDate, endDate]);
    
//     console.log(`\n📅 彭绍勇在 ${startDate} �?${endDate} 的排�?(${scheduleResult.rows.length}�?:`);
    let totalHours = 0;
    scheduleResult.rows.forEach(row => {
      const shift = row.shift;
      let hours = 0;
      switch (shift) {
        case 'A�?:
        case 'A':
        case 'B�?:
        case 'B':
        case 'C�?:
        case 'C':
        case 'N�?:
        case 'N':
          hours = 8; break;
        case 'A+':
        case 'B+':
        case 'C+':
        case 'N+':
          hours = 12; break;
        case 'A2':
          hours = 10.5; break;
        default:
          hours = 0; break;
      }
      totalHours += hours;
//       console.log(`  ${row.schedule_date}: ${shift} (${hours}h)`);
    });
//     console.log(`📊 彭绍勇周工时: ${totalHours.toFixed(1)}h`);
    
//     console.log('\n' + '='.repeat(100));
//     console.log('检查周健、成晓睿、梁飞的排班和工�?');
    const targetEmployees = usersResult.rows.filter(e => 
      ['周健', '成晓�?, '梁飞'].includes(e.real_name)
    );
    
    for (const emp of targetEmployees) {
//       console.log(`\n${'='.repeat(50)}`);
//       console.log(`👤 ${emp.real_name} (ID: ${emp.id})`);
      const empSchedResult = await pool.query(`
        SELECT * FROM ${SCHEDULE_TABLE}
        WHERE employee_id = $1 AND schedule_date BETWEEN $2 AND $3
        ORDER BY schedule_date
      `, [emp.id, startDate, endDate]);
      
      let empTotalHours = 0;
//       console.log(`排班记录 (${empSchedResult.rows.length}�?:`);
      empSchedResult.rows.forEach(row => {
        const shift = row.shift;
        let hours = 0;
        switch (shift) {
          case 'A�?: case 'A': case 'B�?: case 'B': case 'C�?: case 'C': case 'N�?: case 'N': hours = 8; break;
          case 'A+': case 'B+': case 'C+': case 'N+': hours = 12; break;
          case 'A2': hours = 10.5; break;
          default: hours = 0; break;
        }
        empTotalHours += hours;
//         console.log(`  ${row.schedule_date}: ${shift} (${hours}h)`);
      });
//       console.log(`📊 周工�? ${empTotalHours.toFixed(1)}h ${empTotalHours > 63.75 ? '⚠️ 超过63.75h' : ''}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('�?错误:', error);
    process.exit(1);
  }
};

checkAPI();
