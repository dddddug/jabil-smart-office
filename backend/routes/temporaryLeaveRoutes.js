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
      params.push(status.toUpperCase());
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

    // 获取列表 - 字段名与前端一致
    const result = await pool.query(`
      SELECT
        l.id,
        l.employee_id,
        l.plant_id,
        l.department_id,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.start_time,
        l.end_time,
        l.hours,
        l.reason,
        l.proof_file,
        l.status,
        l.applicant_id,
        l.created_at,
        u.real_name,
        d.name
      FROM ${TABLE} l
      LEFT JOIN ${USER_TABLE} u ON l.employee_id = u.id
      LEFT JOIN jso_org_department_management d ON u.department_id = d.id
      ${whereStr}
      ORDER BY l.start_date DESC, l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(pageSize), offset]);

    // 转换字段名与前端一致
    const typeMap = { LEAVE: '请假', ERRAND: '公差', SICK: '病假' };
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
        type: typeMap[row.leave_type] || row.leave_type || '请假',
        leaveType: row.leave_type,
        leaveDate: formatDate(row.start_date),
        startDate: formatDate(row.start_date),
        endDate: formatDate(row.end_date),
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
    console.error('获取临时请假列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, startTime, endTime, leaveType, reason, hours } = req.body;
    const typeMap = { '请假': 'LEAVE', '公差': 'ERRAND', '病假': 'SICK' };
    const result = await pool.query(`
      INSERT INTO ${TABLE} (employee_id, start_date, end_date, start_time, end_time, leave_type, reason, hours, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', CURRENT_TIMESTAMP)
      RETURNING *
    `, [employeeId, startDate, endDate, startTime, endTime, typeMap[leaveType] || leaveType, reason, hours]);

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
    const statusMap = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED' };
    const dbStatus = statusMap[status] || status;
    const result = await pool.query(
      `UPDATE ${TABLE} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [dbStatus, id]
    );
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('更新临时请假状态失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 提交（将状态改为已提交）
router.put('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${TABLE} SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('提交临时请假失败:', error);
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
