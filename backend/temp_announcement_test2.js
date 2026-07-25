import('./config/db.js').then(async (mod) => {
  const pool = mod.default;

  try {
    // 测试完整的公告查询（模拟 announcementRoutes.js 的逻辑）
    const userIdValue = 1;
    const params = [userIdValue];
    let paramIndex = 2;

    let query = `
      SELECT a.*, creator.real_name as creator_name,
             CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END as is_read,
             r.read_at
      FROM jso_system_announcements a
      LEFT JOIN jso_system_user_management creator ON a.created_by = creator.id
      LEFT JOIN jso_announcement_read_records r ON a.id = r.announcement_id AND r.user_id = $1
    `;

    const orConditions = [];
    const filterConditions = [];

    if (filterConditions.length > 0) {
      orConditions.push(`(${filterConditions.join(' AND ')})`);
    }

    if (userIdValue) {
      orConditions.push(`a.created_by = $1`);
    }

    if (orConditions.length > 0) {
      query += ` WHERE a.status = 'published' AND (${orConditions.join(' OR ')})`;
    } else {
      query += ` WHERE a.status = 'published'`;
    }

    console.log('完整查询SQL:');
    console.log(query);

    // 测试正则替换
    const countQuery = query.replace(/SELECT[^FROM]+FROM/, 'SELECT COUNT(DISTINCT a.id) FROM');
    console.log('\n生成的count查询:');
    console.log(countQuery);

    // 执行count查询
    const countResult = await pool.query(countQuery, params);
    console.log('\nCount结果:', countResult.rows);

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
}).catch(e => console.error('导入失败:', e));
