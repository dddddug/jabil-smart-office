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
  // 查询蒋学军的所有工位安排记录
  const result = await pool.query(`
    SELECT
      wa.id,
      wa.employee_id,
      u.real_name,
      wa.arrangement_date,
      wa.sap_employee_id,
      w.name as workstation_name
    FROM jso_hr_workstation_arrangement wa
    JOIN jso_system_user_management u ON wa.employee_id = u.id
    LEFT JOIN jso_hr_workstation w ON wa.workstation_id = w.id
    WHERE u.real_name = '蒋学军'
      AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= '2026-09-01'
      AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= '2026-09-05'
    ORDER BY wa.arrangement_date DESC, wa.id DESC
  `);

  console.log('蒋学军近期工位安排记录:');
  for (const row of result.rows) {
    console.log(`ID: ${row.id}, Date: ${row.arrangement_date}, SAP: ${row.sap_employee_id}, Workstation: ${row.workstation_name}`);
  }

} catch (err) {
  console.error('查询失败:', err);
} finally {
  await pool.end();
}
