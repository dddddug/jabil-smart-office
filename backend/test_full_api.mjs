import pool from './config/db.js';

const startDate = '2026-08-19';
const endDate = '2026-09-18';
const limit = 20;

const query = `
  WITH excluded_areas AS (
    SELECT area_name FROM jso_ole_excluded_areas WHERE enabled = true
  ),
  shift_duration_rules AS (
    SELECT DISTINCT ON (department_id, shift_name)
      department_id, shift_name, duration_hours
    FROM jso_config_shift_duration_rules
    WHERE status = 'active'
    ORDER BY department_id, shift_name, updated_at DESC
  ),
  schedule_shifts AS (
    SELECT DISTINCT ON (employee_id, (schedule_date AT TIME ZONE 'Asia/Shanghai')::date)
      employee_id,
      (schedule_date AT TIME ZONE 'Asia/Shanghai')::date as schedule_date_local,
      shift
    FROM jso_hr_employee_schedule
    WHERE (schedule_date AT TIME ZONE 'Asia/Shanghai')::date >= $1::date
      AND (schedule_date AT TIME ZONE 'Asia/Shanghai')::date <= $2::date
    ORDER BY employee_id, (schedule_date AT TIME ZONE 'Asia/Shanghai')::date
  ),
  level_efficiency AS (
    SELECT level_name, target_efficiency
    FROM jso_ole_level_efficiency_config
    WHERE status = 'active'
  ),
  area_calc_rules AS (
    SELECT id, area_list, iws_seconds, flr_seconds, plr_seconds
    FROM jso_ole_area_calc_rules WHERE enabled = true
  ),
  daily_arrangements AS (
    SELECT DISTINCT ON (wa.employee_id, (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date)
      wa.employee_id,
      wa.sap_employee_id,
      (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date as arrange_date,
      COALESCE(NULLIF(wa.hours, 0),
        (SELECT sdr.duration_hours FROM shift_duration_rules sdr
         WHERE sdr.department_id = u.department_id
           AND sdr.shift_name = COALESCE(ss.shift, wa.shift_name))
      ) as hours,
      ws.name as area_name,
      wa.workstation_id,
      COALESCE(ss.shift, wa.shift_name) as shift_name
    FROM jso_hr_workstation_arrangement wa
    INNER JOIN jso_system_user_management u ON wa.employee_id = u.id
    LEFT JOIN jso_config_workstation ws ON wa.workstation_id = ws.id
    LEFT JOIN schedule_shifts ss ON wa.employee_id = ss.employee_id
      AND (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date = ss.schedule_date_local
    WHERE (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date >= $1::date
      AND (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date <= $2::date
      AND u.employee_type != 'Jabil'
    ORDER BY wa.employee_id, (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date,
      CASE
        WHEN EXISTS (SELECT 1 FROM area_calc_rules acr WHERE acr.area_list = COALESCE(ws.name, wa.workstation_id::text)) THEN 0
        ELSE 1
      END
  ),
  employee_info AS (
    SELECT
      da.employee_id,
      u.real_name,
      u.level as employee_level,
      array_to_string(
        array_agg(DISTINCT COALESCE(da.sap_employee_id, u.employee_id::text)) FILTER (WHERE da.sap_employee_id IS NOT NULL),
        '&'
      ) as sap_employee_id,
      da.arrange_date,
      MAX(da.hours) as hours,
      MAX(da.area_name) as area_name,
      MAX(da.shift_name) as shift_name,
      MAX(d.name) as department_name
    FROM daily_arrangements da
    INNER JOIN jso_system_user_management u ON da.employee_id = u.id
    LEFT JOIN jso_org_department_management d ON u.department_id = d.id
    GROUP BY da.employee_id, u.real_name, u.level, da.arrange_date
  ),
  all_sap_ids AS (
    SELECT DISTINCT
      trim(unnest(string_to_array(
        COALESCE(ei.sap_employee_id, ei.employee_id::text), '&'
      ))) as sap_id,
      ei.employee_id,
      ei.arrange_date as schedule_date
    FROM employee_info ei
    WHERE ei.sap_employee_id IS NOT NULL AND ei.sap_employee_id != ''
  ),
  trans_stats AS (
    SELECT
      asi.employee_id,
      asi.schedule_date,
      COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
      COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
      COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count
    FROM all_sap_ids asi
    LEFT JOIN jso_sap_grn_history_partitioned t
      ON t.created_by::text = asi.sap_id::text
      AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = asi.schedule_date
    GROUP BY asi.employee_id, asi.schedule_date
  ),
  matched_rules AS (
    SELECT
      ei.employee_id,
      ei.arrange_date as work_date,
      ei.area_name as original_area,
      ei.area_name as match_area,
      acr.iws_seconds,
      acr.flr_seconds,
      acr.plr_seconds
    FROM employee_info ei
    LEFT JOIN area_calc_rules acr ON acr.area_list = ei.area_name
  ),
  daily_efficiency AS (
    SELECT
      ei.employee_id,
      ei.real_name,
      ei.employee_level,
      ei.department_name,
      ei.area_name,
      ei.arrange_date as work_date,
      ei.hours,
      COALESCE(ts.iws_count, 0) as iws_count,
      COALESCE(ts.flr_count, 0) as flr_count,
      COALESCE(ts.plr_count, 0) as plr_count,
      COALESCE(mr.iws_seconds, 0) as iws_seconds,
      COALESCE(mr.flr_seconds, 0) as flr_seconds,
      COALESCE(mr.plr_seconds, 0) as plr_seconds,
      le.target_efficiency,
      CASE
        WHEN mr.iws_seconds IS NOT NULL AND ei.hours > 0
        THEN ROUND(
          ((COALESCE(ts.iws_count, 0) * COALESCE(mr.iws_seconds, 0) +
            COALESCE(ts.plr_count, 0) * COALESCE(mr.plr_seconds, 0) +
            COALESCE(ts.flr_count, 0) * COALESCE(mr.flr_seconds, 0))
           / (ei.hours * 3600) / 0.85) * 100, 2
        )
        ELSE NULL
      END as percentage
    FROM employee_info ei
    LEFT JOIN trans_stats ts ON ei.employee_id = ts.employee_id AND ei.arrange_date = ts.schedule_date
    LEFT JOIN matched_rules mr ON ei.employee_id = mr.employee_id AND ei.arrange_date = mr.work_date
    LEFT JOIN level_efficiency le ON ei.employee_level = le.level_name
  ),
  employee_stats AS (
    SELECT
      employee_id,
      real_name,
      employee_level,
      department_name,
      area_name,
      COUNT(*) as work_days,
      SUM(hours) as total_hours,
      SUM(iws_count) as total_iws,
      SUM(flr_count) as total_flr,
      SUM(plr_count) as total_plr,
      AVG(percentage) as avg_percentage,
      CASE
        WHEN AVG(percentage) > 100 AND AVG(percentage) IS NOT NULL THEN
          ROUND((85 + ((AVG(percentage) - 100)::numeric % 30) * 0.5)::numeric, 2)
        ELSE ROUND(COALESCE(AVG(percentage), 0)::numeric, 2)
      END as display_percentage,
      target_efficiency
    FROM daily_efficiency
    GROUP BY employee_id, real_name, employee_level, department_name, area_name, target_efficiency
  )
  SELECT
    employee_id,
    real_name as name,
    employee_level as level,
    department_name as department,
    area_name as area,
    work_days,
    ROUND(total_hours, 2) as total_hours,
    total_iws,
    total_flr,
    total_plr,
    display_percentage as avg_percentage,
    ROUND(target_efficiency * 100, 2) as target_efficiency,
    CASE
      WHEN display_percentage >= ROUND(target_efficiency * 100, 2) THEN '达标'
      ELSE '未达标'
    END as status
  FROM employee_stats
  WHERE display_percentage IS NOT NULL
  ORDER BY display_percentage DESC
  LIMIT $3
`;

try {
  console.log('Testing with params: startDate=' + startDate + ', endDate=' + endDate + ', limit=' + limit);
  const result = await pool.query(query, [startDate, endDate, limit]);
  console.log('Success! Rows:', result.rows.length);
  console.log(JSON.stringify(result.rows.slice(0,3), null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Error code:', error.code);
  console.error('Error position:', error.position);
} finally {
  await pool.end();
}
