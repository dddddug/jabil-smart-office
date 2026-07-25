import express from 'express';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { buildPagination, buildWhereClause } from '../utils/sqlUtils.js';
const router = express.Router();

const ANNOUNCEMENT_TABLE = 'jso_system_announcements';
const ANNOUNCEMENT_READ_TABLE = 'jso_announcement_read_records';
const USER_TABLE = 'jso_system_user_management';

// ========== 管理员路由（放在 /:id 之前，避免被拦截） ==========

// 获取管理员公告列表
router.get('/admin', async (req, res) => {
  try {
    const { userId, status, page = 1, pageSize = 10 } = req.query;

    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    const params = [];
    let paramIndex = 1;

    let whereClause = ' WHERE 1=1';

    if (status) {
      whereClause += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM ${ANNOUNCEMENT_TABLE} a` + whereClause,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const query = `
      SELECT a.*, creator.real_name as creator_name
      FROM ${ANNOUNCEMENT_TABLE} a
      LEFT JOIN ${USER_TABLE} creator ON a.created_by = creator.id
    ` + whereClause + ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const items = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      status: row.status,
      publishDate: row.publish_date ? dayjs(row.publish_date).format('YYYY-MM-DD HH:mm:ss') : null,
      plantId: row.plant_id,
      targetDepartments: row.target_departments,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
    }));

    res.json({
      items,
      total,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取管理员公告列表失败:', error);
    res.status(500).json({ error: '获取管理员公告列表失败' });
  }
});

// 创建公告
router.post('/admin', async (req, res) => {
  try {
    const { title, content, type, status, plantId, targetDepartments, userId, createdBy } = req.body;

    const result = await pool.query(
      `INSERT INTO ${ANNOUNCEMENT_TABLE} (title, content, type, status, plant_id, target_departments, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, content, type || 'normal', status || 'draft', plantId, targetDepartments, createdBy || userId]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({ error: '创建公告失败' });
  }
});

// 更新公告
router.put('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, status, plantId, targetDepartments, userId } = req.body;

    const params = [];
    let updateQuery = `UPDATE ${ANNOUNCEMENT_TABLE} SET `;
    const updateFields = [];

    if (title) {
      updateFields.push(`title = $${params.length + 1}`);
      params.push(title);
    }
    if (content) {
      updateFields.push(`content = $${params.length + 1}`);
      params.push(content);
    }
    if (type) {
      updateFields.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (status) {
      updateFields.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (plantId !== undefined) {
      updateFields.push(`plant_id = $${params.length + 1}`);
      params.push(plantId);
    }
    if (targetDepartments !== undefined) {
      updateFields.push(`target_departments = $${params.length + 1}`);
      params.push(targetDepartments);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '无可更新字段' });
    }

    updateQuery += updateFields.join(', ') + `, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length + 1}`;
    params.push(id);

    const result = await pool.query(updateQuery, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '公告不存在或无权限更新' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ error: '更新公告失败' });
  }
});

// 发布公告
router.put('/admin/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${ANNOUNCEMENT_TABLE} SET status = 'published', publish_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '公告不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('发布公告失败:', error);
    res.status(500).json({ error: '发布公告失败' });
  }
});

// 删除公告
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM ${ANNOUNCEMENT_TABLE} WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '公告不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ error: '删除公告失败' });
  }
});

// ========== 用户路由 ==========

// 获取系统公告列表（面向所有用户）
router.get('/', async (req, res) => {
  try {
    const { userId, plantId, departmentId, page = 1, pageSize = 10 } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    const userIdValue = userId || null;
    const params = [userIdValue];
    let paramIndex = 2;

    let query = `
      SELECT a.*, creator.real_name as creator_name,
             CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END as is_read,
             r.read_at
      FROM ${ANNOUNCEMENT_TABLE} a
      LEFT JOIN ${USER_TABLE} creator ON a.created_by = creator.id
      LEFT JOIN ${ANNOUNCEMENT_READ_TABLE} r ON a.id = r.announcement_id AND r.user_id = $1
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

    const countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM ${ANNOUNCEMENT_TABLE} a
      LEFT JOIN ${ANNOUNCEMENT_READ_TABLE} r ON a.id = r.announcement_id AND r.user_id = $1
    ` + whereClause;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    query += whereClause + ` ORDER BY a.publish_date DESC, a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const items = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      status: row.status,
      publishDate: row.publish_date ? dayjs(row.publish_date).format('YYYY-MM-DD HH:mm:ss') : null,
      plantId: row.plant_id,
      targetDepartments: row.target_departments,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      isRead: row.is_read || false,
      readAt: row.read_at ? dayjs(row.read_at).format('YYYY-MM-DD HH:mm:ss') : null,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
    }));

    res.json({
      items,
      total,
      page: currentPage,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取系统公告失败:', error);
    res.status(500).json({ error: '获取系统公告失败' });
  }
});

// 获取系统公告详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    const result = await pool.query(
      `SELECT a.*, creator.real_name as creator_name,
              CASE WHEN r.id IS NOT NULL THEN TRUE ELSE FALSE END as is_read,
              r.read_at
       FROM ${ANNOUNCEMENT_TABLE} a
       LEFT JOIN ${USER_TABLE} creator ON a.created_by = creator.id
       LEFT JOIN ${ANNOUNCEMENT_READ_TABLE} r ON a.id = r.announcement_id AND r.user_id = $2
       WHERE a.id = $1`,
      [id, userId || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '公告不存在' });
    }

    const row = result.rows[0];
    const item = {
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      status: row.status,
      publishDate: row.publish_date ? dayjs(row.publish_date).format('YYYY-MM-DD HH:mm:ss') : null,
      plantId: row.plant_id,
      targetDepartments: row.target_departments,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      isRead: row.is_read || false,
      readAt: row.read_at ? dayjs(row.read_at).format('YYYY-MM-DD HH:mm:ss') : null,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
    };

    res.json({ item });
  } catch (error) {
    console.error('获取系统公告详情失败:', error);
    res.status(500).json({ error: '获取系统公告详情失败' });
  }
});

// 标记公告为已读
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const result = await pool.query(
      `INSERT INTO ${ANNOUNCEMENT_READ_TABLE} (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id)
       DO UPDATE SET read_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('标记公告已读失败:', error);
    res.status(500).json({ error: '标记公告已读失败' });
  }
});

export default router;
