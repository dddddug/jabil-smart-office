import pool from '../config/db.js';

const USER_TABLE = 'jso_system_user_management';

export const checkApproverRole = async (req, res, next) => {
  let approverIds = [];

  // For POST/PUT routes directly setting approverId
  if (req.body.approverId) {
    approverIds.push(req.body.approverId);
  }
  // For transfer-out/transfer-in approve/reject routes
  if (req.body.transferOutApproverId) {
    approverIds.push(req.body.transferOutApproverId);
  }
  if (req.body.transferInApproverId) {
    approverIds.push(req.body.transferInApproverId);
  }

  // Filter out duplicates and ensure valid numbers
  approverIds = [...new Set(approverIds)].filter(id => id && !isNaN(Number(id)));

  if (approverIds.length === 0) {
    return next(); // No approverId in body, proceed
  }

  try {
    const query = `SELECT id, real_name, role_id FROM ${USER_TABLE} WHERE id = ANY($1::int[])`;
    const result = await pool.query(query, [approverIds]);

    if (result.rows.length !== approverIds.length) {
      return res.status(400).json({ error: '部分或全部审批人ID无效' });
    }

    for (const approver of result.rows) {
      // Role ID 2 is '厂区管理员', Role ID 3 is '部门管理员'
      if (approver.role_id !== 2 && approver.role_id !== 3) {
        return res.status(403).json({ error: `审批人 ${approver.real_name} (ID: ${approver.id}) 不具备审批权限 (role_id 必须为 2 或 3)` });
      }
    }
    next();
  } catch (error) {
    console.error('检查审批人角色失败:', error);
    res.status(500).json({ error: '检查审批人角色失败' });
  }
}

