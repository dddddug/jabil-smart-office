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
  // 查询排班表中的蒋学军记录
  const scheduleResult = await pool.query(`
    SELECT
      s.id,
      s.employee_id,
      u.real_name,
      s.schedule_date,
      s.shift
    FROM jso_hr_employee_schedule s
    JOIN jso_system_user_management u ON s.employee_id = u.id
    WHERE u.real_name = '蒋学军'
      AND DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') IN ('2026-09-03', '2026-09-04')
    ORDER BY s.schedule_date
  `);

  console.log('蒋学军在排班表(schedule)的记录:');
  console.table(scheduleResult.rows);

  // 查询用户表的蒋学军记录
  const userResult = await pool.query(`
    SELECT id, real_name, employee_id as sap_employee_id
    FROM jso_system_user_management
    WHERE real_name = '蒋学军'
  `);

  console.log('\n蒋学军在用户表的记录:');
  console.table(userResult.rows);

} catch (err) {
  console.error('查询失败:', err);
} finally {
  await pool.end();
}
