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
        o.overtime_date,
        o.start_time,
        o.end_time,
        o.hours,
        o.reason,
        o.proof_file as proof_file,
        o.status,
        o.applicant_id,
        o.created_at,
        u.real_name,
        d.name
      FROM ${TABLE} o
      LEFT JOIN ${USER_TABLE} u ON o.employee_id = u.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      ${whereStr}
      ORDER BY o.overtime_date DESC, o.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(pageSize), offset]);

    // 转换字段名与前端一致
    const items = result.rows.map(row => {
      // 格式化日期
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };
      // 格式化时间
      const formatTime = (time) => {
        if (!time) return '';
        return time.substring(0, 5);
      };

      return {
        id: row.id,
        employeeId: row.employee_id,
        plantId: row.plant_id,
        departmentId: row.department_id,
        type: row.type || '临时加班',
        overtimeDate: formatDate(row.overtime_date),
        startDate: formatDate(row.overtime_date),
        endDate: formatDate(row.overtime_date),
        startTime: formatTime(row.start_time),
        endTime: formatTime(row.end_time),
        hours: parseFloat(row.hours) || 0,
        duration: parseFloat(row.hours) || 0,
        totalHours: parseFloat(row.hours) || 0,
        reason: row.reason,
        proofFile: row.proof_file,
        status: row.status === 'PENDING' ? 'pending' : row.status === 'APPROVED' ? 'approved' : row.status === 'REJECTED' ? 'rejected' : row.status,
        applicantId: row.applicant_id,
        applyDate: new Date(row.created_at).toISOString(),
        employeeName: row.real_name,
        departmentName: row.name
      };
    });

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
