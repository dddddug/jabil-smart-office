/**
 * 临时加班 API
 */

import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const TABLE = 'jso_hr_temporary_overtime';
const USER_TABLE = 'jso_system_user_management';

// 获取列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 50, employeeId, startDate, endDate, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = [];
    let params = [];
    let idx = 1;

    if (employeeId) {
      where.push(`o.employee_id = $${idx++}`);
      params.push(employeeId);
    }
    if (startDate) {
      where.push(`o.overtime_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      where.push(`o.overtime_date <= $${idx++}`);
      params.push(endDate);
    }
    if (status) {
      where.push(`o.status = $${idx++}`);
      params.push(status.toUpperCase());
    }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${TABLE} o ${whereStr}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 获取列表 - 字段名与前端一致
    const result = await pool.query(`
      SELECT
        o.id,
        o.employee_id,
        o.plant_id,
        o.department_id,
        o.overtime_type as type,
        o.overtime_date as start_date,
        o.start_time,
        o.end_time,
        o.hours as duration,
        o.reason,
        o.proof_file as proof_file,
        o.status,
        o.applicant_id,
        o.created_at as apply_date,
        u.real_name as employee_name,
        d.name as department_name
      FROM ${TABLE} o
      LEFT JOIN ${USER_TABLE} u ON o.employee_id = u.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      ${whereStr}
      ORDER BY o.overtime_date DESC, o.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(pageSize), offset]);

    // 转换状态值
    const items = result.rows.map(row => ({
      ...row,
      employeeName: row.employee_name,
      departmentName: row.department_name,
      startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : null,
      endDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : null,
      status: row.status === 'PENDING' ? 'pending' : row.status === 'APPROVED' ? 'approved' : row.status === 'REJECTED' ? 'rejected' : row.status
    }));

    res.json({ success: true, items, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    console.error('获取临时加班列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, overtimeDate, startTime, endTime, hours, reason, type } = req.body;
    const result = await pool.query(`
      INSERT INTO ${TABLE} (employee_id, overtime_date, start_time, end_time, hours, reason, overtime_type, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP)
      RETURNING *
    `, [employeeId, overtimeDate, startTime, endTime, hours, reason, type || '临时加班']);

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('创建临时加班失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新状态
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const statusMap = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED' };
    const dbStatus = statusMap[status] || status;
    const result = await pool.query(
      `UPDATE ${TABLE} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [dbStatus, id]
    );
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('更新临时加班状态失败:', error);
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
    console.error('删除临时加班失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
