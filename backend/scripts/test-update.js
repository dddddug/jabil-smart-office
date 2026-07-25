const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const testUpdate = async () => {
  try {
    console.log('测试更新公告...');
    
    // 首先获取一条公告
    const annResult = await pool.query('SELECT * FROM jso_system_announcements LIMIT 1');
    if (annResult.rows.length === 0) {
      console.log('没有公告数据');
      process.exit(0);
    }
    
    const ann = annResult.rows[0];
    console.log('公告数据:', ann);
    
    // 测试更新
    const userId = 48; // LINX5的用户ID
    const result = await pool.query(
      `UPDATE jso_system_announcements 
       SET title = $1, content = $2, type = $3, status = $4, 
           plant_id = $5, target_departments = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND created_by = $8
       RETURNING *`,
      ['测试更新标题', '测试更新内容', 'important', 'published', 1, [1], ann.id, userId]
    );
    
    console.log('更新结果:', result.rows[0]);
    console.log('✅ 更新成功');
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
};

testUpdate();
