const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const testAPI = async () => {
  try {
    // 先查看用户LINX5（ID=48）的信息
    console.log('=== 用户ID=48的信息 ===');
    const userResult = await pool.query('SELECT * FROM jso_system_user_management WHERE id = 48');
    console.log(userResult.rows[0]);
    
    // 模拟API调用，测试获取公告列表
    const userId = 48;
    const plantId = 1;
    const departmentId = 2;
    
    console.log('\n=== 测试获取公告列表 ===');
    console.log(`参数: userId=${userId}, plantId=${plantId}, departmentId=${departmentId}`);
    
    // 直接用SQL测试
    const params = [userId, plantId, departmentId];
    
    const query = `
      SELECT a.*, creator.real_name as creator_name
      FROM jso_system_announcements a
      LEFT JOIN jso_system_user_management creator ON a.created_by = creator.id
      WHERE a.status = 'published' AND (
        (a.plant_id = $2 OR a.plant_id IS NULL) AND (a.target_departments @> ARRAY[$3]::INTEGER[] OR a.target_departments IS NULL)
        OR a.created_by = $1
      )
      ORDER BY a.publish_date DESC, a.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    console.log(`\n查询结果: 找到 ${result.rows.length} 条公告`);
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
};

testAPI();
