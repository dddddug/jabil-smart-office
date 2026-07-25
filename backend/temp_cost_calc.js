import('./config/db.js').then(async (mod) => {
  const pool = mod.default;

  const fiscalStart = '2026-05-24';
  const fiscalEnd = '2026-06-23';
  const today = '2026-07-18';

  // 1. 查看时薪配置
  const rateResult = await pool.query(`
    SELECT level, standard_rate FROM jso_config_employee_hourly_rates ORDER BY level
  `);
  console.log('时薪配置:');
  rateResult.rows.forEach(r => console.log(`  ${r.level}: ¥${r.standard_rate}/h`));

  // 2. 查看汇率配置
  const deptRules = await pool.query(`
    SELECT department_id, plant_id, business_month, exchange_rate
    FROM jso_config_dept_calc_rules
    WHERE status = 'active'
    ORDER BY business_month DESC
    LIMIT 10
  `);
  console.log('\n汇率配置:');
  deptRules.rows.forEach(r => console.log(`  dept=${r.department_id}, plant=${r.plant_id}, ${r.business_month}: ${r.exchange_rate}`));

  // 3. 统计各班次人数（每人每天一条排班）
  const shiftCount = await pool.query(`
    SELECT shift, COUNT(*) as cnt
    FROM (
      SELECT DISTINCT ON (employee_id, DATE(schedule_date)) *
      FROM jso_hr_employee_schedule
      WHERE schedule_date BETWEEN $1 AND $2
      AND schedule_date <= $3
    ) s
    WHERE employee_id IN (SELECT id FROM jso_system_user_management WHERE employee_type = '3PL')
    GROUP BY shift
    ORDER BY shift
  `, [fiscalStart, fiscalEnd, today]);
  console.log('\n各班次人数统计:');
  shiftCount.rows.forEach(r => console.log(`  ${r.shift}: ${r.cnt}人次`));

  await pool.end();
}).catch(e => console.error('Error:', e));
