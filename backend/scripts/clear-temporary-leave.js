const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const clearData = async () => {
  try {
    console.log('⚠️  准备清空临时请假表...');
    
    // 先查看一下有多少条记录
    const countResult = await pool.query('SELECT COUNT(*) FROM jso_hr_temporary_leave');
    const count = countResult.rows[0].count;
    console.log(`当前有 ${count} 条记录`);
    
    // 清空表
    await pool.query('TRUNCATE TABLE jso_hr_temporary_leave RESTART IDENTITY');
    
    console.log('✅ 临时请假表已清空，ID 序列已重置！');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

clearData();
