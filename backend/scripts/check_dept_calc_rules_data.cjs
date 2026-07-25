
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkDeptCalcRulesData() {
  try {
    const fiscalMonth = '2026-06';
    console.log(`--- 检查 DEPT_CALC_RULES_TABLE (${fiscalMonth}) ---`);
    const res = await pool.query(`SELECT * FROM jso_config_dept_calc_rules WHERE business_month = $1`, [fiscalMonth]);
    console.log(`DEPT_CALC_RULES_TABLE (${fiscalMonth}) 数据: ${res.rows.length} 条`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('检查 DEPT_CALC_RULES_TABLE 失败:', err);
  } finally {
    await pool.end();
  }
}

checkDeptCalcRulesData();
