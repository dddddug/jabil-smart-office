import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg.default || pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  timezone: 'Asia/Shanghai',
});

try {
  // 获取所有员工的工号
  const result = await pool.query(`
    SELECT real_name, employee_id FROM jso_system_user_management
    WHERE employee_id IS NOT NULL AND employee_id != ''
    ORDER BY real_name
  `);

  console.log('员工工号映射:');
  for (const row of result.rows) {
    console.log(`${row.real_name}: ${row.employee_id}`);
  }

} catch (err) {
  console.error('查询失败:', err);
} finally {
  await pool.end();
}
