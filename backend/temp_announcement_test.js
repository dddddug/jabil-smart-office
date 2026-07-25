import('./config/db.js').then(async (mod) => {
  const pool = mod.default;

  try {
    // 测试公告表是否存在以及结构
    const tableInfo = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'jso_system_announcements'
      ORDER BY ordinal_position
    `);
    console.log('jso_system_announcements 表结构:');
    tableInfo.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // 测试简单的查询
    const testQuery = await pool.query(`
      SELECT * FROM jso_system_announcements LIMIT 1
    `);
    console.log('\n简单查询成功，返回行数:', testQuery.rows.length);

    // 测试带参数的查询
    const paramQuery = await pool.query(`
      SELECT a.*, creator.real_name as creator_name
      FROM jso_system_announcements a
      LEFT JOIN jso_system_user_management creator ON a.created_by = creator.id
      WHERE a.status = 'published'
      LIMIT 10
    `);
    console.log('带JOIN查询成功，返回行数:', paramQuery.rows.length);

    // 测试数组查询
    const arrayQuery = await pool.query(`
      SELECT id, target_departments
      FROM jso_system_announcements
      WHERE target_departments @> ARRAY[1]::INTEGER[]
      LIMIT 5
    `);
    console.log('数组查询成功，返回行数:', arrayQuery.rows.length);

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
}).catch(e => console.error('导入失败:', e));
