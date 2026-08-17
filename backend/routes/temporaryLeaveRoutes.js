/**
 * 临时请假 API
 */

import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const TABLE = 'jso_hr_temporary_leave';
const USER_TABLE = 'jso_system_user_management';

// 获取列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 50, employeeId, startDate, endDate, status, leaveType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = [];
    let params = [];
    let idx = 1;

    if (employeeId) {
      where.push(`l.employee_id = $${idx++}`);
      params.push(employeeId);
    }
    if (startDate) {
      where.push(`l.start_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      where.push(`l.end_date <= $${idx++}`);
      params.push(endDate);
    }
    if (status) {
      where.push(`l.status = $${idx++}`);
      params.push(status);
    }
    if (leaveType) {
      where.push(`l.leave_type = $${idx++}`);
      params.push(leaveType);
    }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${TABLE} l ${whereStr}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 获取列表
    const result = await pool.query(`
      SELECT l.*, u.name as employee_name, d.name as department_name
      FROM ${TABLE} l
      LEFT JOIN ${USER_TABLE} u ON l.employee_id = u.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      ${whereStr}
      ORDER BY l.start_date DESC, l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(pageSize), offset]);

    res.json({ success: true, items: result.rows, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    console.error('获取临时请假列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason, isHalfDay } = req.body;
    const result = await pool.query(`
      INSERT INTO ${TABLE} (employee_id, start_date, end_date, leave_type, reason, is_half_day, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', CURRENT_TIMESTAMP)
      RETURNING *
    `, [employeeId, startDate, endDate, leaveType, reason, isHalfDay || false]);

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('创建临时请假失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新状态
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE ${TABLE} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('更新临时请假状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除临时请假失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
