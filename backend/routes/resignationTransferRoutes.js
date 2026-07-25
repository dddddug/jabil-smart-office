import express from 'express';
import pool from '../config/db.js';
import { buildPagination, buildWhereClause } from '../utils/sqlUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件
import { checkApproverRole } from '../utils/authMiddleware.js'; // 导入审批角色检查中间件
const router = express.Router();

// Helper function to build dynamic queries
const buildResignationTransferQuery = (filters) => {
    let query = `
        SELECT
            rt.id,
            rt.employee_id AS "employeeId",
            su.real_name AS "employeeName",
            rt.plant_id AS "plantId",
            op.name AS "plantName",
            rt.department_id AS "departmentId",
            od.name AS "departmentName",
            rt.type,
            rt.reason,
            rt.proof_file AS "proofFile",
            rt.status,
            rt.applicant_id AS "applicantId",
            app_su.real_name AS "applicantName",
            rt.approver_id AS "approverId",
            apr_su.real_name AS "approverName",
            rt.approval_comment AS "approvalComment",
            rt.transfer_to_id AS "transferToId",
            tr_su.real_name AS "transferToName",
            rt.transfer_reason AS "transferReason",
            rt.transfer_plant_id AS "transferPlantId",
            tr_op.name AS "transferPlantName",
            rt.transfer_department_id AS "transferDepartmentId",
            tr_od.name AS "transferDepartmentName",
            rt.transfer_date AS "transferDate",
            rt.transfer_out_approver_id AS "transferOutApproverId",
            tout_su.real_name AS "transferOutApproverName",
            rt.transfer_out_approval_status AS "transferOutApprovalStatus",
            rt.transfer_out_approval_comment AS "transferOutApprovalComment",
            rt.transfer_in_approver_id AS "transferInApproverId",
            tin_su.real_name AS "transferInApproverName",
            rt.transfer_in_approval_status AS "transferInApprovalStatus",
            rt.transfer_in_approval_comment AS "transferInApprovalComment",
            rt.processed,
            rt.created_at AS "createdAt",
            rt.updated_at AS "updatedAt"
        FROM
            jso_hr_resignation_transfer rt
        LEFT JOIN jso_system_user_management su ON rt.employee_id = su.id
        LEFT JOIN jso_org_plant_management op ON rt.plant_id = op.id
        LEFT JOIN jso_org_department_management od ON rt.department_id = od.id
        LEFT JOIN jso_system_user_management app_su ON rt.applicant_id = app_su.id
        LEFT JOIN jso_system_user_management apr_su ON rt.approver_id = apr_su.id
        LEFT JOIN jso_system_user_management tr_su ON rt.transfer_to_id = tr_su.id
        LEFT JOIN jso_org_plant_management tr_op ON rt.transfer_plant_id = tr_op.id
        LEFT JOIN jso_org_department_management tr_od ON rt.transfer_department_id = tr_od.id
        LEFT JOIN jso_system_user_management tout_su ON rt.transfer_out_approver_id = tout_su.id
        LEFT JOIN jso_system_user_management tin_su ON rt.transfer_in_approver_id = tin_su.id
    `;
    const conditions = [
        { sql: ' AND rt.type = ?', value: filters.type },
        { sql: ' AND rt.status = ?', value: filters.status },
        { sql: ' AND su.real_name ILIKE ?', value: filters.employeeName, transform: value => `%${value}%` },
        { sql: ' AND rt.created_at BETWEEN ? AND ?', value: filters.startDate && filters.endDate ? [filters.startDate, filters.endDate] : undefined },
    ];

    const { clause, values } = buildWhereClause(conditions);
    query += clause;

    return { query, values };
};


// GET all resignation and transfer records
router.get('/', authenticateToken, async (req, res) => {
    const { page = 1, pageSize = 10, type, status, employeeName, startDate, endDate } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    try {
        const filters = { type, status, employeeName, startDate, endDate };
        const { query: baseQuery, values: baseValues } = buildResignationTransferQuery(filters);

        // Get total count
        const countResult = await pool.query(`SELECT COUNT(*) FROM (${baseQuery}) AS total_count`, baseValues);
        const total = parseInt(countResult.rows[0].count);

        // Get paginated items
        const paginatedQuery = `${baseQuery} ORDER BY rt.created_at DESC LIMIT $${baseValues.length + 1} OFFSET $${baseValues.length + 2}`;
        const paginatedValues = [...baseValues, limit, offset];
        const result = await pool.query(paginatedQuery, paginatedValues);

        const totalPages = Math.ceil(total / limit);

        // Get statistics (pending, approved, rejected)
        const statsClause = buildWhereClause([
            { sql: ' AND rt.type = ?', value: filters.type },
        ]);
        const statsQuery = `
            SELECT
                COUNT(*) FILTER (WHERE rt.status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE rt.status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE rt.status = 'rejected') AS rejected
            FROM
                jso_hr_resignation_transfer rt
            ${statsClause.clause}
        `;
        const statsResult = await pool.query(statsQuery, statsClause.values);
        const stats = statsResult.rows[0];

        res.json({
            items: result.rows,
            total,
            totalPages,
            currentPage,
            pageSize: limit,
            totalPending: parseInt(stats.pending, 10),
            totalApproved: parseInt(stats.approved, 10),
            totalRejected: parseInt(stats.rejected, 10),
        });
    } catch (error) {
        console.error('获取离职/转岗记录失败:', error);
        res.status(500).json({ message: '获取离职/转岗记录失败', error: error.message });
    }
});

// POST to create a new resignation or transfer record
router.post('/', authenticateToken, checkApproverRole, async (req, res) => {
    const {
        employeeId, type, reason, proofFile, status = 'pending', applicantId, approverId, approvalComment,
        transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
        transferOutApproverId, transferInApproverId
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO jso_hr_resignation_transfer (
                employee_id, type, reason, proof_file, status, applicant_id, approver_id, approval_comment,
                transfer_to_id, transfer_reason, transfer_plant_id, transfer_department_id, transfer_date,
                transfer_out_approver_id, transfer_in_approver_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *`,
            [
                employeeId, type, reason, proofFile, status, applicantId, approverId, approvalComment,
                transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
                transferOutApproverId, transferInApproverId
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('创建离职/转岗记录失败:', error);
        res.status(500).json({ message: '创建离职/转岗记录失败', error: error.message });
    }
});

// PUT to update a resignation or transfer record
router.put('/:id', authenticateToken, checkApproverRole, async (req, res) => {
    const { id } = req.params;
    const {
        employeeId, type, reason, proofFile, status, applicantId, approverId, approvalComment,
        transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
        transferOutApproverId, transferInApproverId
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE jso_hr_resignation_transfer
            SET
                employee_id = $1, type = $2, reason = $3, proof_file = $4, status = $5, applicant_id = $6, approver_id = $7, approval_comment = $8,
                transfer_to_id = $9, transfer_reason = $10, transfer_plant_id = $11, transfer_department_id = $12, transfer_date = $13,
                transfer_out_approver_id = $14, transfer_in_approver_id = $15, updated_at = CURRENT_TIMESTAMP
            WHERE id = $16
            RETURNING *`,
            [
                employeeId, type, reason, proofFile, status, applicantId, approverId, approvalComment,
                transferToId, transferReason, transferPlantId, transferDepartmentId, transferDate,
                transferOutApproverId, transferInApproverId, id
            ]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: '记录未找到' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('更新离职/转岗记录失败:', error);
        res.status(500).json({ message: '更新离职/转岗记录失败', error: error.message });
    }
});

// DELETE a resignation or transfer record
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM jso_hr_resignation_transfer WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: '记录未找到' });
        }
        res.status(204).send(); // No content for successful deletion
    } catch (error) {
        console.error('删除离职/转岗记录失败:', error);
        res.status(500).json({ message: '删除离职/转岗记录失败', error: error.message });
    }
});


export default router;