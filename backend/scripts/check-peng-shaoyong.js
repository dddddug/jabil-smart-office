
const { Pool } = require('pg');

// 数据库连接配�?const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkUser = async () => {
  try {
//     console.log('查询彭绍勇的信息...\n');
    
    // 查询指定员工
    const result = await pool.query(`
      SELECT 
        u.*,
        p.name as plant_name,
        d.name as department_name,
        r.name as role_name
      FROM jso_system_user_management u
      LEFT JOIN jso_org_plant_management p ON u.plant_id = p.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      LEFT JOIN jso_system_role_management r ON u.role_id = r.id
      WHERE u.real_name ILIKE '%彭绍�?' OR u.real_name ILIKE '%�?'
      ORDER BY u.id
    `);
    
    if (result.rows.length === 0) {
//       console.log('�?未找到彭绍勇，显示所有员工：\n');
      const allResult = await pool.query(`
        SELECT id, real_name, username FROM jso_system_user_management ORDER BY id
      `);
      allResult.rows.forEach(row => {
//         console.log(`ID: ${row.id}, 姓名: ${row.real_name}, 用户�? ${row.username}`);
      });
    } else {
//       console.log(`�?找到 ${result.rows.length} 个相关员工：\n`);
      result.rows.forEach(row => {
//         console.log(`ID: ${row.id}`);
//         console.log(`  姓名: ${row.real_name}`);
//         console.log(`  用户�? ${row.username}`);
//         console.log(`  旧工�? ${row.old_employee_id}`);
//         console.log(`  新工�? ${row.employee_id}`);
//         console.log(`  状�? ${row.status}`);
//         console.log(`  离职日期: ${row.resignation_date}`);
//         console.log(`  厂区: ${row.plant_name}`);
//         console.log(`  部门: ${row.department_name}`);
//         console.log('-----------------------------------');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询错误:', error);
    process.exit(1);
  }
};

checkUser();
