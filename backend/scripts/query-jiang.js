import('dotenv').then(dotenv => {
  dotenv.config();

  const { Pool } = require('pg');
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    timezone: 'Asia/Shanghai',
  });

  pool.query(`
    SELECT
      wa.id,
      wa.employee_id,
      u.real_name,
      wa.arrangement_date,
      wa.sap_employee_id
    FROM jso_hr_workstation_arrangement wa
    JOIN jso_system_user_management u ON wa.employee_id = u.id
    WHERE u.real_name = '蒋学军'
      AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') IN ('2026-09-03', '2026-09-04')
    ORDER BY wa.arrangement_date
  `).then(result => {
    console.log('蒋学军的工位安排记录:');
    console.table(result.rows);
    pool.end();
  }).catch(err => {
    console.error('查询失败:', err);
    pool.end();
  });
});
