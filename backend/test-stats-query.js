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
    // 模拟 getStats 的查询
    const query = `
      WITH shift_data AS (
        SELECT
          s.id as schedule_id,
          s.schedule_date,
          s.shift,
          u.id as employee_id,
          u.real_name,
          u.level as employee_level,
          u.sap_employee_id,
          u.department_id,
          d.name as department_name,
          COALESCE(sh.duration_hours, 8) as hours
        FROM jso_hr_employee_schedule s
        INNER JOIN jso_system_user_management u ON s.employee_id = u.id
        LEFT JOIN jso_org_department_management d ON u.department_id = d.id
        LEFT JOIN jso_config_shift_duration_rules sh
          ON sh.department_id = u.department_id
          AND sh.shift_name = s.shift
          AND sh.status = 'active'
        WHERE (s.schedule_date at time zone 'Asia/Shanghai') >= '2026-09-11'::date
          AND (s.schedule_date at time zone 'Asia/Shanghai') < ('2026-09-11'::date + interval '1 day')
          AND s.shift NOT IN ('请假', '调休', '离职', '年假')
          AND u.employee_type != 'Jabil'
      ),
      trans_stats AS (
        SELECT
          sd.employee_id,
          sd.schedule_date,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'IWS' THEN t.reference END) as grs_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'PLR' THEN t.reference END) as pull_list_count
        FROM shift_data sd
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = sd.sap_employee_id::text
          AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = sd.schedule_date::date
        GROUP BY sd.employee_id, sd.schedule_date
      ),
      level_efficiency AS (
        SELECT level_name, target_efficiency
        FROM jso_ole_level_efficiency_config
        WHERE status = 'active'
      )
      SELECT
        sd.schedule_date as date,
        sd.shift as shift,
        sd.employee_id,
        sd.real_name,
        sd.employee_level,
        sd.department_name,
        sd.department_name as workstation_name,
        sd.hours,
        COALESCE(ts.iws_count, 0) as iws,
        COALESCE(ts.flr_count, 0) as flr,
        COALESCE(ts.plr_count, 0) as plr,
        COALESCE(ts.grs_count, 0) as grs,
        COALESCE(ts.pull_list_count, 0) as pull_list,
        le.target_efficiency,
        CASE
          WHEN sd.hours > 0
          THEN (
            (COALESCE(ts.iws_count, 0) +
             COALESCE(ts.plr_count, 0) +
             COALESCE(ts.flr_count, 0))
            / (sd.hours * 3600) / 0.85
          )
          ELSE NULL
        END as result_raw,
        CASE
          WHEN sd.hours > 0
          THEN ROUND(
            ((COALESCE(ts.iws_count, 0) +
              COALESCE(ts.plr_count, 0) +
              COALESCE(ts.flr_count, 0))
             / (sd.hours * 3600) / 0.85) * 100, 2
          )
          ELSE NULL
        END as percentage,
        CASE
          WHEN sd.hours > 0 AND le.target_efficiency IS NOT NULL
          THEN CASE
            WHEN ROUND(
              ((COALESCE(ts.iws_count, 0) +
                COALESCE(ts.plr_count, 0) +
                COALESCE(ts.flr_count, 0))
               / (sd.hours * 3600) / 0.85) * 100, 2
            ) >= ROUND(le.target_efficiency * 100, 2)
            THEN '达标'
            ELSE '未达标'
          END
          ELSE '未计算'
        END as status
      FROM shift_data sd
      LEFT JOIN trans_stats ts ON sd.employee_id = ts.employee_id
      LEFT JOIN level_efficiency le ON sd.employee_level = le.level_name
      WHERE sd.hours > 0
      ORDER BY sd.schedule_date DESC, sd.shift, sd.real_name
    `;

    const result = await pool.query(query);
    console.log(`Total records: ${result.rows.length}`);
    console.log('\nFirst 3 records:');
    result.rows.slice(0, 3).forEach(r => {
      console.log(JSON.stringify(r, null, 2));
    });

    // 按班次分组统计
    const shiftStats = {};
    result.rows.forEach(row => {
      const shiftKey = row.shift;
      if (!shiftStats[shiftKey]) {
        shiftStats[shiftKey] = {
          totalEmployees: 0,
          totalHours: 0,
        };
      }
      shiftStats[shiftKey].totalEmployees++;
      shiftStats[shiftKey].totalHours += parseFloat(row.hours || 0);
    });

    console.log('\nShift stats:');
    Object.entries(shiftStats).forEach(([shift, stats]) => {
      console.log(`  ${shift}: ${stats.totalEmployees} employees, ${stats.totalHours} hours`);
    });

    const totalEmployees = Object.values(shiftStats).reduce((sum, s) => sum + s.totalEmployees, 0);
    console.log(`\nTotal employees across all shifts: ${totalEmployees}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detail:', error);
  } finally {
    await pool.end();
  }
}

test();
