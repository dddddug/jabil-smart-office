const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'jabil_hrms',
  password: '123456',
  port: 5432
});

const deleteEmployees = async () => {
  const client = await pool.connect();
  try {
    console.log('开始删除有问题的员工数据...');
    // 删除周天映、林小宝、曹敏、钟锡枢、林克忠、龚伟、邓大龙、陈向阳
    const result = await client.query(`
      DELETE FROM jso_system_user_management 
      WHERE id IN (5, 6, 7, 8, 9, 10, 11, 39)
      RETURNING id, real_name
    `);
    console.log('删除成功:', result.rows.length, '条记录');
    result.rows.forEach(row => {
      console.log('已删除:', row.id, '-', row.real_name);
    });
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    client.release();
    pool.end();
  }
};

deleteEmployees();
