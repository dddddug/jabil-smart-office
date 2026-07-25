const { Pool } = require('pg');

// 数据库连接配�?const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const findSpecificEmployees = async () => {
  try {
    const namesToFind = ['周天�?, '林小�?, '曹敏', '钟锡�?, '林克�?, '龚伟', '邓大�?];
    
//     console.log('查询指定员工的数�?..\n');
    
    // 查询这些员工
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
      WHERE u.real_name IN (${namesToFind.map((_, i) => `$${i + 1}`).join(',')})
      ORDER BY u.id
    `, namesToFind);
    
    if (result.rows.length === 0) {
//       console.log('�?未找到指定员工！');
      
      // 显示所有员工姓名供参�?      console.log('\n=== 所有员工姓名列�?===\n');
      const allResult = await pool.query(`
        SELECT id, real_name, username FROM jso_system_user_management ORDER BY id
      `);
      allResult.rows.forEach(row => {
//         console.log(`ID: ${row.id} - ${row.real_name} (${row.username})`);
      });
      return;
    }
    
//     console.log('=== 找到 ' + result.rows.length + ' 个员�?===\n');
    
    result.rows.forEach(row => {
//       console.log('┌─────────────────────────────────────────────────�?);
//       console.log(`�? ${row.real_name}`);
//       console.log('├─────────────────────────────────────────────────�?);
//       console.log(`�?ID: ${row.id}`);
//       console.log(`�?用户�? ${row.username}`);
//       console.log(`�?姓名: ${row.real_name}`);
//       console.log(`�?工号: ${row.employee_id}`);
//       console.log(`�?性别: ${row.gender || '未填�?}`);
//       console.log(`�?职位: ${row.position || '未填�?}`);
//       console.log(`�?职级: ${row.level || '未填�?}`);
//       console.log(`�?电话: ${row.phone || '未填�?}`);
//       console.log(`�?入职日期: ${row.hire_date || '未填�?}`);
//       console.log(`�?离职日期: ${row.leave_date || '未填�?}`);
//       console.log(`�?IC卡号: ${row.ic_card_number || '未填�?}`);
//       console.log(`�?员工类型: ${row.employee_type || '未填�?}`);
//       console.log(`�?厂区: ${row.plant_name || '未分�?}`);
//       console.log(`�?部门: ${row.department_name || '未分�?}`);
//       console.log(`�?角色: ${row.role_name || '未分�?}`);
//       console.log(`�?状�? ${row.status}`);
//       console.log('└─────────────────────────────────────────────────┘\n');
    });
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await pool.end();
  }
};

findSpecificEmployees();
