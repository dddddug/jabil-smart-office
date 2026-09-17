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
  // 查询蒋学军 2026-09-01 的记录
  const result = await pool.query(`
    SELECT
      wa.id,
      wa.employee_id,
      u.real_name,
      wa.arrangement_date,
      wa.sap_employee_id,
      wa.workstation_id
    FROM jso_hr_workstation_arrangement wa
    JOIN jso_system_user_management u ON wa.employee_id = u.id
    WHERE u.real_name = '蒋学军'
      AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') = '2026-09-01'
  `);

  console.log('蒋学军 2026-09-01 工位安排记录:');
  if (result.rows.length === 0) {
    console.log('没有找到记录');
  }
  for (const row of result.rows) {
    const date = new Date(row.arrangement_date);
    const localDate = new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`ID: ${row.id}, Date: ${localDate}, SAP: ${row.sap_employee_id}, workstation_id: ${row.workstation_id}`);
  }

} catch (err) {
  console.error('查询失败:', err);
} finally {
  await pool.end();
}
