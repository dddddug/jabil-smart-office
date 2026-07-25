
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkTableExists() {
  const tableName = 'jso_cost_summary_data';
  try {
    console.log(`--- 检查表 '${tableName}' 是否存在 ---`);
    const res = await pool.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      );`,
      [tableName]
    );

    const tableExists = res.rows[0].exists;
    if (tableExists) {
      console.log(`✅ 表 '${tableName}' 存在。`);
    } else {
      console.log(`❌ 表 '${tableName}' 不存在。`);
    }
  } catch (err) {
    console.error(`检查表 '${tableName}' 失败:`, err);
  } finally {
    await pool.end();
  }
}

checkTableExists();
