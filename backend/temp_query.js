import('./config/db.js').then(async (mod) => {
  const pool = mod.default;

  // 测试获取所有用户
  const result = await pool.query(`
    SELECT u.id, u.username, u.real_name, u.status
    FROM jso_system_user_management u
    ORDER BY u.id
    LIMIT 10
  `);

  console.log(`总用户数: ${result.rows.length}`);
  result.rows.forEach(r => {
    console.log(`  ${r.id}: ${r.username} (${r.real_name}) - ${r.status}`);
  });

  await pool.end();
}).catch(e => console.error('Error:', e));
