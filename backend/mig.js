const { Pool } = require("pg");
const pool = new Pool({
  host: "10.114.100.171",
  port: 5432,
  database: "stockroom_db",
  user: "postgres",
  password: "74454321"
});

async function migrate() {
  try {
    const res = await pool.query("SELECT current_database()");
    
    const before = await pool.query("SELECT code FROM jso_system_permissions WHERE code LIKE 'employee%' LIMIT 3");
    
    await pool.query("BEGIN");
    await pool.query("DELETE FROM jso_system_role_permissions");
    await pool.query("DELETE FROM jso_system_user_permissions");
    await pool.query("DELETE FROM jso_system_permissions");
    await pool.query("COMMIT");
    
    await pool.query("BEGIN");
    await pool.query("INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES " +
      "('employee-schedule:view', '查看', 'button', 'employee-schedule', 'view', '查看', 1)," +
      "('employee-schedule:edit', '编辑', 'button', 'employee-schedule', 'edit', '编辑', 2)," +
      "('employee-schedule:export', '导出', 'button', 'employee-schedule', 'export', '导出', 3)"
    );
    await pool.query("COMMIT");
    
    const after = await pool.query("SELECT code FROM jso_system_permissions ORDER BY code");
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("ERROR:", e.message);
  } finally {
    await pool.end();
  }
}
migrate();