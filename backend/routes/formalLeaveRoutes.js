import express from 'express';
import dayjs from 'dayjs';
import pool from '../config/db.js'; // Import the shared pool instance
import { checkApproverRole } from '../utils/authMiddleware.js'; // 导入审批角色检查中间件
import { buildWhereClause, buildPagination } from '../utils/sqlUtils.js';

const router = express.Router();

const FORMAL_LEAVE_TABLE = 'jso_hr_formal_leave';
const RESIGNATION_TRANSFER_TABLE = 'jso_hr_resignation_transfer';
const USER_TABLE = 'jso_system_user_management';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';

// 获取请假/年假和离职/转岗列表
router.get('/', async (req, res) => {
  try {
    const { plantId, departmentId, employeeId, status, startDate, endDate, page = 1, pageSize = 10, type } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    let targetTable;
    let targetTableAlias;

    if (type === 'resignation') {
      targetTable = RESIGNATION_TRANSFER_TABLE;
      targetTableAlias = 'rt';
    } else {
      targetTable = FORMAL_LEAVE_TABLE;
      targetTableAlias = 'fl';
    }

    const where = buildWhereClause([
      { sql: ` AND ${targetTableAlias}.type IN ('离职', '转岗')`, value: type === 'resignation' ? true : null },
      { sql: ` AND ${targetTableAlias}.leave_type NOT IN ('离职', '转岗')`, value: type === 'resignation' ? null : true },
      { sql: ` AND ${targetTableAlias}.plant_id = ?`, value: plantId },
      { sql: ` AND ${targetTableAlias}.department_id = ?`, value: departmentId },
      { sql: ` AND ${targetTableAlias}.employee_id = ?`, value: employeeId },
      { sql: ` AND ${targetTableAlias}.status = ?`, value: status },
      { sql: ` AND ${targetTableAlias}.${type === 'resignation' ? 'transfer_date' : 'start_date'} >= ?`, value: startDate },
      { sql: ` AND ${targetTableAlias}.${type === 'resignation' ? 'transfer_date' : 'end_date'} <= ?`, value: endDate }
    ]);

    const countQuery = `SELECT COUNT(*) FROM ${targetTable} ${targetTableAlias}` + where.clause;
    const countResult = await pool.query(countQuery, where.values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Query status stats
    const statsQuery = `SELECT ${targetTableAlias}.status, COUNT(*) as count FROM ${targetTable} ${targetTableAlias}` + where.clause + ` GROUP BY ${targetTableAlias}.status`;
    const statsResult = await pool.query(statsQuery, where.values);
    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
    });
    const totalPending = (stats.pending || stats.PENDING || 0);
    const totalApproved = (stats.approved || stats.APPROVED || 0);
    const totalRejected = (stats.rejected || stats.REJECTED || 0);

    // Build data query
    let query = '';
    if (type === 'resignation') {
      query = `
        SELECT
          ${targetTableAlias}.*,
          emp.real_name as employee_name,
          app.real_name as applicant_name,
          appr.real_name as approver_name,
          trans.real_name as transfer_to_name,
          out_appr.real_name as transfer_out_approver_name,
          in_appr.real_name as transfer_in_approver_name,
          p.name as plant_name,
          d.name as department_name,
          trans_d.name as transfer_department_name,
          trans_p.name as transfer_plant_name
        FROM ${targetTable} ${targetTableAlias}
        LEFT JOIN ${USER_TABLE} emp ON ${targetTableAlias}.employee_id = emp.id
        LEFT JOIN ${USER_TABLE} app ON ${targetTableAlias}.applicant_id = app.id
        LEFT JOIN ${USER_TABLE} appr ON ${targetTableAlias}.approver_id = appr.id
        LEFT JOIN ${USER_TABLE} trans ON ${targetTableAlias}.transfer_to_id = trans.id
        LEFT JOIN ${USER_TABLE} out_appr ON ${targetTableAlias}.transfer_out_approver_id = out_appr.id
        LEFT JOIN ${USER_TABLE} in_appr ON ${targetTableAlias}.transfer_in_approver_id = in_appr.id
        LEFT JOIN ${PLANT_TABLE} p ON ${targetTableAlias}.plant_id = p.id
        LEFT JOIN ${DEPT_TABLE} d ON ${targetTableAlias}.department_id = d.id
        LEFT JOIN ${DEPT_TABLE} trans_d ON ${targetTableAlias}.transfer_department_id = trans_d.id
        LEFT JOIN ${PLANT_TABLE} trans_p ON trans_d.plant_id = trans_p.id
      `;
    } else {
      query = `
        SELECT
          ${targetTableAlias}.*,
          emp.real_name as employee_name,
          app.real_name as applicant_name,
          appr.real_name as approver_name,
          p.name as plant_name,
          d.name as department_name
        FROM ${targetTable} ${targetTableAlias}
        LEFT JOIN ${USER_TABLE} emp ON ${targetTableAlias}.employee_id = emp.id
        LEFT JOIN ${USER_TABLE} app ON ${targetTableAlias}.applicant_id = app.id
        LEFT JOIN ${USER_TABLE} appr ON ${targetTableAlias}.approver_id = appr.id
        LEFT JOIN ${PLANT_TABLE} p ON ${targetTableAlias}.plant_id = p.id
        LEFT JOIN ${DEPT_TABLE} d ON ${targetTableAlias}.department_id = d.id
      `;
    }

    query += where.clause;
    query += ` ORDER BY ${targetTableAlias}.created_at DESC LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`;
    const result = await pool.query(query, [...where.values, limit, offset]);

    const items = result.rows.map(row => {
      const baseItem = {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        plantId: row.plant_id,
        plantName: row.plant_name,
        departmentId: row.department_id,
        departmentName: row.department_name,
        reason: row.reason,
        proofFile: row.proof_file,
        status: row.status,
        applicantId: row.applicant_id,
        applicantName: row.applicant_name,
        createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
        updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss'),
      };

      if (type === 'resignation') {
        return {
          ...baseItem,
          type: row.type, // Use 'type' from new table
          transferToId: row.transfer_to_id,
          transferToName: row.transfer_to_name,
          transferReason: row.transfer_reason,
          transferDepartmentId: row.transfer_department_id,
          transferDepartmentName: row.transfer_department_name,
          transferPlantId: row.transfer_plant_name,
          transferDate: row.transfer_date ? dayjs(row.transfer_date).format('YYYY-MM-DD') : null,
          approverId: row.approver_id, // For '离职' type
          approverName: row.approver_name,
          approvalComment: row.approval_comment,
          transferOutApproverId: row.transfer_out_approver_id,
          transferOutApproverName: row.transfer_out_approver_name,
          transferOutApprovalStatus: row.transfer_out_approval_status,
          transferOutApprovalComment: row.transfer_out_approval_comment,
          transferInApproverId: row.transfer_in_approver_id,
          transferInApproverName: row.transfer_in_approver_name,
          transferInApprovalStatus: row.transfer_in_approval_status,
          transferInApprovalComment: row.transfer_in_approval_comment,
          processed: row.processed
        };
      } else {
        return {
          ...baseItem,
          leaveType: row.leave_type,
          startDate: row.start_date ? dayjs(row.start_date).format('YYYY-MM-DD') : '',
          endDate: row.end_date ? dayjs(row.end_date).format('YYYY-MM-DD') : '',
          days: row.days,
          hours: row.hours,
          approverId: row.approver_id,
          approverName: row.approver_name,
          transferToId: row.transfer_to_id, // This should be null or unused for formal leaves
          transferReason: row.transfer_reason, // This should be null or unused for formal leaves
          approvalComment: row.approval_comment,
        };
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
    console.error('获取请假/年假或离职/转岗列表失败:', error);
    res.status(500).json({ error: '获取请假/年假或离职/转岗列表失败' });
  }
});

// 创建请假/年假或离职/转岗记录
router.post('/', checkApproverRole, async (req, res) => {
  try {
    const { 
      employeeId, plantId, departmentId, leaveType, startDate, endDate, days, hours, reason, proofFile, applicantId, approverId, 
      transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate, // Fields for resignation/transfer
      transferOutApproverId, transferInApproverId
    } = req.body;
    
    let targetTable;
    let query;
    let params;
    
    if (leaveType === '离职' || leaveType === '转岗') {
      targetTable = RESIGNATION_TRANSFER_TABLE;
      query = `INSERT INTO ${targetTable} 
               (employee_id, plant_id, department_id, type, reason, proof_file, applicant_id, approver_id, 
                transfer_to_id, transfer_reason, transfer_plant_id, transfer_department_id, transfer_date, 
                transfer_out_approver_id, transfer_in_approver_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
               RETURNING *`;
      params = [
        employeeId, plantId, departmentId, leaveType, reason, proofFile, applicantId, approverId,
        transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
        transferOutApproverId, transferInApproverId
      ];
    } else {
      targetTable = FORMAL_LEAVE_TABLE;
      query = `INSERT INTO ${targetTable} 
               (employee_id, plant_id, department_id, leave_type, start_date, end_date, days, hours, reason, proof_file, applicant_id, approver_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
               RETURNING *`;
      params = [
        employeeId, plantId, departmentId, leaveType, startDate, endDate, days, hours, reason, proofFile, applicantId, approverId
      ];
    }
    
    const result = await pool.query(query, params);
    const newItem = result.rows[0];
    res.json({ item: { ...newItem, createdAt: dayjs(newItem.created_at).format('YYYY-MM-DD HH:mm:ss') } });
  } catch (error) {
    console.error('创建请假/年假或离职/转岗记录失败:', error);
    res.status(500).json({ error: '创建请假/年假或离职/转岗记录失败' });
  }
});

// 更新请假/年假或离职/转岗记录
router.put('/:id', checkApproverRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      // Common fields, note: leaveType here is actually 'type' for resignation/transfer
      leaveType, reason, proofFile, applicantId, status,
      // Formal Leave specific fields
      startDate, endDate, days, hours, approverId,
      // Resignation/Transfer specific fields
      transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate, 
      transferOutApproverId, transferInApproverId,
    } = req.body;

    let targetTable;
    let originalRecord;

    // Determine which table the record belongs to
    // First, try formal leave table
    let checkResult = await pool.query(`SELECT leave_type FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      originalRecord = checkResult.rows[0];
      // If it's not a resignation/transfer type in formal_leave, then it's a formal leave
      if (!['离职', '转岗'].includes(originalRecord.leave_type)) {
        targetTable = FORMAL_LEAVE_TABLE;
      }
    }

    // If not found in formal leave or it was a resignation/transfer type, check resignation_transfer table
    if (!targetTable) {
      checkResult = await pool.query(`SELECT type FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1`, [id]);
      if (checkResult.rows.length > 0) {
        originalRecord = checkResult.rows[0];
        targetTable = RESIGNATION_TRANSFER_TABLE;
      }
    }

    if (!targetTable) {
      return res.status(404).json({ error: '记录不存在' });
    }

    let updateQuery;
    let params;

    if (targetTable === FORMAL_LEAVE_TABLE) {
      updateQuery = `UPDATE ${FORMAL_LEAVE_TABLE}
                     SET leave_type = $1, start_date = $2, end_date = $3, days = $4, hours = $5, reason = $6, proof_file = $7, approver_id = $8, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $9
                     RETURNING *`;
      params = [leaveType, startDate, endDate, days, hours, reason, proofFile, approverId, id];
    } else { // RESIGNATION_TRANSFER_TABLE
        // Note: For RESIGNATION_TRANSFER_TABLE, 'leaveType' from req.body maps to 'type' column
      updateQuery = `UPDATE ${RESIGNATION_TRANSFER_TABLE}
                     SET type = $1, reason = $2, proof_file = $3, applicant_id = $4, approver_id = $5,
                         transfer_to_id = $6, transfer_reason = $7, transfer_plant_id = $8, transfer_department_id = $9, transfer_date = $10,
                         transfer_out_approver_id = $11, transfer_in_approver_id = $12, status = $13, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $14
                     RETURNING *`;
      params = [
        leaveType, reason, proofFile, applicantId, approverId, // leaveType maps to 'type' here
        transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
        transferOutApproverId, transferInApproverId, status, id
      ];
    }
    
    const updateResult = await pool.query(updateQuery, params);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或更新失败' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新记录失败:', error);
    res.status(500).json({ error: '更新记录失败' });
  }
});

// 删除请假/年假或离职/转岗记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let targetTable;
    let originalRecord;

    // Determine which table the record belongs to
    let checkResult = await pool.query(`SELECT leave_type FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      originalRecord = checkResult.rows[0];
      if (!['离职', '转岗'].includes(originalRecord.leave_type)) {
        targetTable = FORMAL_LEAVE_TABLE;
      }
    }

    if (!targetTable) {
      checkResult = await pool.query(`SELECT type FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1`, [id]);
      if (checkResult.rows.length > 0) {
        originalRecord = checkResult.rows[0];
        targetTable = RESIGNATION_TRANSFER_TABLE;
      }
    }

    if (!targetTable) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const result = await pool.query(`DELETE FROM ${targetTable} WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或删除失败' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ error: '删除记录失败' });
  }
});

// 批准请假/年假或离职/转岗记录
router.put('/:id/approve', checkApproverRole, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;
    
    let targetTable;
    let recordType;
    let leaveRecord;

    // Determine which table the record belongs to
    let checkResult = await client.query(`SELECT leave_type, employee_id, transfer_date FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      const row = checkResult.rows[0];
      if (!['离职', '转岗'].includes(row.leave_type)) {
        targetTable = FORMAL_LEAVE_TABLE;
        recordType = row.leave_type;
        leaveRecord = row;
      }
    }

    if (!targetTable) {
      checkResult = await client.query(`SELECT type, employee_id, transfer_date FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1`, [id]);
      if (checkResult.rows.length > 0) {
        const row = checkResult.rows[0];
        targetTable = RESIGNATION_TRANSFER_TABLE;
        recordType = row.type;
        leaveRecord = row;
      }
    }

    if (!targetTable) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在' });
    }

    let updateQuery;
    if (targetTable === FORMAL_LEAVE_TABLE) {
      updateQuery = `UPDATE ${FORMAL_LEAVE_TABLE} 
                     SET status = 'approved', approver_id = $1, approval_comment = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 AND status = 'pending' 
                     RETURNING *`;
    } else { // RESIGNATION_TRANSFER_TABLE
      updateQuery = `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
                     SET status = 'approved', approver_id = $1, approval_comment = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 AND status = 'pending' 
                     RETURNING *`;
    }

    const result = await client.query(updateQuery, [approverId, approvalComment, id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    const updatedRecord = result.rows[0];

    // 如果是离职类型，将离职日期写入用户表
    if (targetTable === RESIGNATION_TRANSFER_TABLE && updatedRecord.type === '离职') {
      // 获取审批日期作为离职办理日期（如果申请中没有指定日期）
      const approvalDate = dayjs().format('YYYY-MM-DD');
      const resignationDate = updatedRecord.transfer_date || approvalDate;
      
      // 检查离职日期是否已到
      const isResignationDateReached = dayjs().isAfter(dayjs(resignationDate), 'day') || 
                                 dayjs().isSame(dayjs(resignationDate), 'day');
      
      // 如果离职日期已到，则设置状态为 inactive；否则只更新离职日期
      if (isResignationDateReached) {
        await client.query(
          `UPDATE jso_system_user_management 
           SET leave_date = $1, status = 'inactive', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [resignationDate, updatedRecord.employee_id]
        );
      } else {
        await client.query(
          `UPDATE jso_system_user_management 
           SET leave_date = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [resignationDate, updatedRecord.employee_id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('批准记录失败:', error);
    res.status(500).json({ error: '批准记录失败' });
  } finally {
    client.release();
  }
});

// 拒绝请假/年假或离职/转岗记录
router.put('/:id/reject', checkApproverRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;

    let targetTable;
    let originalRecord;

    // Determine which table the record belongs to
    let checkResult = await pool.query(`SELECT leave_type FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      originalRecord = checkResult.rows[0];
      if (!['离职', '转岗'].includes(originalRecord.leave_type)) {
        targetTable = FORMAL_LEAVE_TABLE;
      }
    }

    if (!targetTable) {
      checkResult = await pool.query(`SELECT type FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1`, [id]);
      if (checkResult.rows.length > 0) {
        originalRecord = checkResult.rows[0];
        targetTable = RESIGNATION_TRANSFER_TABLE;
      }
    }

    if (!targetTable) {
      return res.status(404).json({ error: '记录不存在' });
    }

    let updateQuery;
    if (targetTable === FORMAL_LEAVE_TABLE) {
      updateQuery = `UPDATE ${FORMAL_LEAVE_TABLE} 
                     SET status = 'rejected', approver_id = $1, approval_comment = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 AND status = 'pending' 
                     RETURNING *`;
    } else { // RESIGNATION_TRANSFER_TABLE
      updateQuery = `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
                     SET status = 'rejected', approver_id = $1, approval_comment = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3 AND status = 'pending' 
                     RETURNING *`;
    }
    
    const result = await pool.query(updateQuery, [approverId, approvalComment, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('拒绝记录失败:', error);
    res.status(500).json({ error: '拒绝记录失败' });
  }
});

// 转审请假/年假记录 (不适用于离职/转岗)
router.put('/:id/transfer', async (req, res) => {
  try {
    const { id } = req.params;
    const { transferToId, transferReason } = req.body;

    let targetTable;
    let originalRecord;

    // Determine which table the record belongs to
    let checkResult = await pool.query(`SELECT leave_type FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      originalRecord = checkResult.rows[0];
      if (!['离职', '转岗'].includes(originalRecord.leave_type)) { // Only formal leaves
        targetTable = FORMAL_LEAVE_TABLE;
      }
    }

    if (!targetTable) { // If not a formal leave (or it's a resignation/transfer record in the old table)
      return res.status(404).json({ error: '记录不存在或不是可转审的请假/年假类型' });
    }

    const result = await pool.query(
      `UPDATE ${FORMAL_LEAVE_TABLE} 
       SET transfer_to_id = $1, transfer_reason = $2, approver_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pending' 
       RETURNING *`,
      [transferToId, transferReason, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('转审记录失败:', error);
    res.status(500).json({ error: '转审记录失败' });
  }
});

// 打回重提请假/年假或离职/转岗记录
router.put('/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;

    let targetTable;
    let originalRecord;

    // Determine which table the record belongs to
    let checkResult = await pool.query(`SELECT leave_type FROM ${FORMAL_LEAVE_TABLE} WHERE id = $1`, [id]);
    if (checkResult.rows.length > 0) {
      originalRecord = checkResult.rows[0];
      if (!['离职', '转岗'].includes(originalRecord.leave_type)) {
        targetTable = FORMAL_LEAVE_TABLE;
      }
    }

    if (!targetTable) {
      checkResult = await pool.query(`SELECT type FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1`, [id]);
      if (checkResult.rows.length > 0) {
        originalRecord = checkResult.rows[0];
        targetTable = RESIGNATION_TRANSFER_TABLE;
      }
    }

    if (!targetTable) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const result = await pool.query(
      `UPDATE ${targetTable} 
       SET status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'rejected' 
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或不是拒绝状态' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('打回重提记录失败:', error);
    res.status(500).json({ error: '打回重提记录失败' });
  }
});

// 转岗 - 转出部门审批
router.put('/:id/transfer-out-approve', checkApproverRole, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;
    
    // Ensure it's a record in RESIGNATION_TRANSFER_TABLE and of '转岗' type
    const checkResult = await client.query(`SELECT * FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1 AND type = '转岗'`, [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在或不是转岗类型' });
    }

    const result = await client.query(
      `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
       SET transfer_out_approver_id = $1, transfer_out_approval_status = 'approved', transfer_out_approval_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND type = '转岗'
       RETURNING *`,
      [approverId, approvalComment, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    const resignationTransferRecord = result.rows[0];
    
    // 检查是否两个审批都完成了
    if (resignationTransferRecord.transfer_out_approval_status === 'approved' && resignationTransferRecord.transfer_in_approval_status === 'approved') {
      await client.query(
        `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('转出部门审批失败:', error);
    res.status(500).json({ error: '转出部门审批失败' });
  } finally {
    client.release();
  }
});

// 转岗 - 转入部门审批
router.put('/:id/transfer-in-approve', checkApproverRole, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;
    
    // Ensure it's a record in RESIGNATION_TRANSFER_TABLE and of '转岗' type
    const checkResult = await client.query(`SELECT * FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1 AND type = '转岗'`, [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在或不是转岗类型' });
    }

    const result = await client.query(
      `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
       SET transfer_in_approver_id = $1, transfer_in_approval_status = 'approved', transfer_in_approval_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND type = '转岗'
       RETURNING *`,
      [approverId, approvalComment, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    const resignationTransferRecord = result.rows[0];
    
    // 检查是否两个审批都完成了
    if (resignationTransferRecord.transfer_out_approval_status === 'approved' && resignationTransferRecord.transfer_in_approval_status === 'approved') {
      await client.query(
        `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('转入部门审批失败:', error);
    res.status(500).json({ error: '转入部门审批失败' });
  } finally {
    client.release();
  }
});

// 转岗 - 转出部门拒绝
router.put('/:id/transfer-out-reject', checkApproverRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;
    
    // Ensure it's a record in RESIGNATION_TRANSFER_TABLE and of '转岗' type
    const checkResult = await pool.query(`SELECT * FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1 AND type = '转岗'`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或不是转岗类型' });
    }

    const result = await pool.query(
      `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
       SET status = 'rejected', transfer_out_approver_id = $1, transfer_out_approval_status = 'rejected', transfer_out_approval_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND type = '转岗'
       RETURNING *`,
      [approverId, approvalComment, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('转出部门拒绝失败:', error);
    res.status(500).json({ error: '转出部门拒绝失败' });
  }
});

// 转岗 - 转入部门拒绝
router.put('/:id/transfer-in-reject', checkApproverRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { approverId, approvalComment } = req.body;
    
    // Ensure it's a record in RESIGNATION_TRANSFER_TABLE and of '转岗' type
    const checkResult = await pool.query(`SELECT * FROM ${RESIGNATION_TRANSFER_TABLE} WHERE id = $1 AND type = '转岗'`, [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或不是转岗类型' });
    }

    const result = await pool.query(
      `UPDATE ${RESIGNATION_TRANSFER_TABLE} 
       SET status = 'rejected', transfer_in_approver_id = $1, transfer_in_approval_status = 'rejected', transfer_in_approval_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND type = '转岗'
       RETURNING *`,
      [approverId, approvalComment, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '记录不存在或已处理' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('转入部门拒绝失败:', error);
    res.status(500).json({ error: '转入部门拒绝失败' });
  }
});

export default router;
