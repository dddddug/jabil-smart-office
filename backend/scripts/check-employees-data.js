const { Pool } = require('pg');

// 数据库连接配�?const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const checkEmployees = async () => {
  try {
//     console.log('查询数据库中员工的数�?..\n');
    
    // 查询所有员工数�?    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        real_name, 
        employee_id,
        sap_employee_id,
        gender,
        position,
        level,
        phone,
        hire_date,
        leave_date,
        ic_card_number,
        employee_type,
        plant_id,
        department_id,
        status
      FROM jso_system_user_management
      ORDER BY id
    `);
    
//     console.log('=== 员工详细数据 ===\n');
    
    result.rows.forEach(row => {
//       console.log(`ID: ${row.id}`);
//       console.log(`  姓名: ${row.real_name}`);
//       console.log(`  用户�? ${row.username}`);
//       console.log(`  工号: ${row.employee_id}`);
//       console.log(`  SAP工号: ${row.sap_employee_id}`);
//       console.log(`  性别: ${row.gender}`);
//       console.log(`  职位: ${row.position}`);
//       console.log(`  职级: ${row.level}`);
//       console.log(`  电话: ${row.phone}`);
//       console.log(`  入职日期: ${row.hire_date}`);
//       console.log(`  离职日期: ${row.leave_date}`);
//       console.log(`  IC卡号: ${row.ic_card_number}`);
//       console.log(`  员工类型: ${row.employee_type}`);
//       console.log(`  厂区ID: ${row.plant_id}`);
//       console.log(`  部门ID: ${row.department_id}`);
//       console.log(`  状�? ${row.status}`);
//       console.log('-----------------------------------');
    });
    
//     console.log(`\n总计: ${result.rows.length} 个员工`);
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await pool.end();
  }
};

checkEmployees();
