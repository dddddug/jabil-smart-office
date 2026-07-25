import('./config/db.js').then(async (mod) => {
  const pool = mod.default;

  try {
    // 测试修复后的公告查询
    const userId = '1';
    const plantId = null;
    const departmentId = null;
    const page = 1;
    const pageSize = 10;
    const limit = pageSize;
    const offset = (page - 1) * limit;
    const currentPage = page;

    const userIdValue = userId || null;
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

    if (plantId) {
      filterConditions.push(`(a.plant_id = $${paramIndex} OR a.plant_id IS NULL)`);
      params.push(plantId);
      paramIndex++;
    }

    if (departmentId) {
      filterConditions.push(`(a.target_departments @> ARRAY[$${paramIndex}]::INTEGER[] OR a.target_departments IS NULL)`);
      params.push(departmentId);
      paramIndex++;
    }

    if (filterConditions.length > 0) {
      orConditions.push(`(${filterConditions.join(' AND ')})`);
    }

    if (userId) {
      orConditions.push(`a.created_by = $1`);
    }

    let whereClause = ' WHERE a.status = \'published\'';
    if (orConditions.length > 0) {
      whereClause += ` AND (${orConditions.join(' OR ')})`;
    }

    // 单独构建 COUNT 查询
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM jso_system_announcements a
      LEFT JOIN jso_announcement_read_records r ON a.id = r.announcement_id AND r.user_id = $1
    ` + whereClause;
    console.log('Count查询:', countQuery);
    console.log('Count参数:', params);
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);
    console.log('Total:', total);

    query += whereClause + ` ORDER BY a.publish_date DESC, a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    console.log('Data查询:', query);
    console.log('Data参数:', params);

    const result = await pool.query(query, params);
    console.log('结果行数:', result.rows.length);

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
}).catch(e => console.error('导入失败:', e));
