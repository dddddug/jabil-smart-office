import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function test() {
  try {
    // 模拟工位安排模块的查询
    const query = `
      SELECT s.employee_id, s.shift, u.real_name, u.employee_type
      FROM jso_hr_employee_schedule s
      JOIN jso_system_user_management u ON s.employee_id = u.id
      WHERE (s.schedule_date at time zone 'Asia/Shanghai') >= '2026-09-11'::date
        AND (s.schedule_date at time zone 'Asia/Shanghai') < '2026-09-11'::date + interval '1 day'
    `;

    const result = await pool.query(query);
    console.log(`Total records: ${result.rows.length}`);

    // 过滤请假/调休/离职/年假
    const filtered = result.rows.filter(r => !['请假', '调休', '离职', '年假'].includes(r.shift));
    console.log(`After excluding leave: ${filtered.length}`);

    // 过滤 Jabil 类型
    const filtered2 = filtered.filter(r => r.employee_type !== 'Jabil');
    console.log(`After excluding Jabil: ${filtered2.length}`);

    // 去重员工
    const distinct = [...new Set(filtered2.map(r => r.real_name))];
    console.log(`Distinct employees: ${distinct.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
