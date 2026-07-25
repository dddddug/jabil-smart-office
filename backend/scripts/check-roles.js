const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function checkRoles() {
  try {
    console.log('正在查询角色表...');
    const roleResult = await pool.query('SELECT * FROM jso_system_role_management');
    console.log('所有角色:');
    console.log(roleResult.rows);
    
    console.log('\n正在查询部分用户的角色信息...');
    const userResult = await pool.query(`
      SELECT u.id, u.real_name, u.role_id, r.name as role_name
      FROM jso_system_user_management u 
      LEFT JOIN jso_system_role_management r ON u.role_id = r.id 
      LIMIT 10
    `);
    console.log(userResult.rows);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    pool.end();
  }
}

checkRoles();
