
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
    console.log('查询彭绍勇的详细信息...\n');
    
    // 查询指定员工
    const result = await pool.query(`
      SELECT 
        u.id, u.real_name, u.username, u.employee_id, u.old_employee_id,
        u.plant_id, u.department_id, u.role_id, u.status,
        u.position, u.level, u.gender,
        p.name as plant_name,
        d.name as department_name,
        r.name as role_name
      FROM jso_system_user_management u
      LEFT JOIN jso_org_plant_management p ON u.plant_id = p.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      LEFT JOIN jso_system_role_management r ON u.role_id = r.id
      WHERE u.real_name = '彭绍勇'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ 未找到彭绍勇');
    } else {
      const peng = result.rows[0];
      console.log(`✅ 彭绍勇详细信息：`);
      console.dir(peng, { depth: null });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询错误:', error);
    process.exit(1);
  }
};

checkUser();
