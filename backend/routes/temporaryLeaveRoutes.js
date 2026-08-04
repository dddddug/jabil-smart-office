import express from 'express';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { buildWhereClause, buildPagination } from '../utils/sqlUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件
const router = express.Router();

const TEMPORARY_LEAVE_TABLE = 'jso_hr_temporary_leave';
const USER_TABLE = 'jso_system_user_management'; 
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';

// 获取临时请假公差列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { plantId, departmentId, employeeId, status, startDate, endDate, page = 1, pageSize = 10 } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    const where = buildWhereClause([
      { sql: ' AND t.plant_id = ?', value: plantId },
      { sql: ' AND t.department_id = ?', value: departmentId },
      { sql: ' AND t.employee_id = ?', value: employeeId },
      { sql: ' AND t.status = ?', value: status },
      { sql: ' AND t.start_date >= ?', value: startDate },
      { sql: ' AND t.end_date <= ?', value: endDate }
    ]);

    const countQuery = `SELECT COUNT(*) FROM ${TEMPORARY_LEAVE_TABLE} t` + where.clause;
    const countResult = await pool.query(countQuery, where.values);
    const total = parseInt(countResult.rows[0].count, 10);

    const statsQuery = `SELECT t.status, COUNT(*) as count FROM ${TEMPORARY_LEAVE_TABLE} t` + where.clause + ' GROUP BY t.status';
    const statsResult = await pool.query(statsQuery, where.values);
    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.status] = parseInt(row.count, 10);
    });
    const totalPending = (stats.pending || stats.PENDING || 0);
    const totalApproved = (stats.approved || stats.APPROVED || 0);
    const totalRejected = (stats.rejected || stats.REJECTED || 0);
    
    // 构建数据查询
    const query = `
      SELECT t.*, emp.real_name as employee_name, emp.old_employee_id as employee_no, p.name as plant_name, d.name as department_name
      FROM ${TEMPORARY_LEAVE_TABLE} t
      LEFT JOIN ${USER_TABLE} emp ON t.employee_id = emp.id
      LEFT JOIN ${PLANT_TABLE} p ON t.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON t.department_id = d.id
    ` + where.clause + ` ORDER BY t.created_at DESC LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`;
    const result = await pool.query(query, [...where.values, limit, offset]);

    const items = result.rows.map(row => {
        // 正确处理日期时间：日期字段存日期，时间字段存时间
        let startDateStr = '';
        let endDateStr = '';

        try {
          if (row.start_date) {
            // 只取日期部分，不添加时间
            const d = dayjs(row.start_date);
            startDateStr = d.format('YYYY-MM-DD');
          }
          if (row.end_date) {
            const d = dayjs(row.end_date);
            endDateStr = d.format('YYYY-MM-DD');
          }
        } catch (e) {
          console.error('日期格式化错误:', e);
        }

        return {
          id: row.id,
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          employeeNo: row.employee_no,
          plantId: row.plant_id,
          plantName: row.plant_name,
          departmentId: row.department_id,
          departmentName: row.department_name,
          leaveType: row.leave_type,
          startDate: startDateStr,
          endDate: endDateStr,
          startTime: row.start_time,
          endTime: row.end_time,
          hours: row.hours,
          reason: row.reason,
          proofFile: row.proof_file,
          status: row.status,
          applicantId: row.applicant_id,
          createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
          updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
        }
      });
    
    res.json({ 
      items, 
      total, 
      totalPending,
      totalApproved,
      totalRejected,
      page: currentPage, 
      pageSize: limit, 
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取临时请假公差列表失败:', error);
    res.status(500).json({ error: '获取临时请假公差列表失败' });
  }
});

// 创建临时请假公差记录
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employeeId, plantId, departmentId, leaveType, startDate, endDate, startTime, endTime, hours, reason, proofFile, applicantId } = req.body;
    
    // 验证：公差且时长大于2小时必须有证明材料
    if (leaveType === 'ERRAND' && hours > 2 && !proofFile) {
      return res.status(400).json({ error: '公差超过2小时，请上传证明材料' });
    }
    
    const result = await pool.query(
      `INSERT INTO ${TEMPORARY_LEAVE_TABLE} 
       (employee_id, plant_id, department_id, leave_type, start_date, end_date, start_time, end_time, hours, reason, proof_file, applicant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [employeeId, plantId, departmentId, leaveType, startDate, endDate, startTime, endTime, hours, reason, proofFile, applicantId]
    );
    
    const newItem = result.rows[0];
    res.json({ item: { ...newItem, createdAt: dayjs(newItem.created_at).format('YYYY-MM-DD HH:mm:ss') } });
  } catch (error) {
    console.error('❌ 创建临时请假公差记录失败:', error);
    res.status(500).json({ error: '创建临时请假公差记录失败' });
  }
});

// 更新临时请假公差记录
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, startTime, endTime, hours, reason, proofFile, plantId, departmentId } = req.body;

    // 验证：公差且时长大于2小时必须有证明材料
    if (leaveType === 'ERRAND' && hours > 2 && !proofFile) {
      return res.status(400).json({ error: '公差超过2小时，请上传证明材料' });
    }

    const result = await pool.query(
      `UPDATE ${TEMPORARY_LEAVE_TABLE}
       SET leave_type = $1, start_date = $2, end_date = $3, start_time = $4, end_time = $5, hours = $6, reason = $7, proof_file = $8, plant_id = $9, department_id = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [leaveType, startDate, endDate, startTime, endTime, hours, reason, proofFile, plantId, departmentId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('更新临时请假公差记录失败:', error);
    res.status(500).json({ error: '更新临时请假公差记录失败' });
  }
});

// 删除临时请假公差记录
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${TEMPORARY_LEAVE_TABLE} WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除临时请假公差记录失败:', error);
    res.status(500).json({ error: '删除临时请假公差记录失败' });
  }
});

// 提交临时请假公差记录
router.put('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${TEMPORARY_LEAVE_TABLE} 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending' 
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已提交' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('提交临时请假公差记录失败:', error);
    res.status(500).json({ error: '提交临时请假公差记录失败' });
  }
});

// 撤回临时请假公差记录
router.put('/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${TEMPORARY_LEAVE_TABLE}
       SET status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status != 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已是待提交状态' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('撤回临时请假公差记录失败:', error);
    res.status(500).json({ error: '撤回临时请假公差记录失败' });
  }
});

export default router;