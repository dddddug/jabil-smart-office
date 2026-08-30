/**
 * 管控物料 单据管理控制器
 * 流程：提交 -> 接收 -> 签收
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { DA_MATERIAL_DOCUMENT_TABLE, USER_TABLE, K045_DOCUMENT_TABLE } from '../config/db_constants.js';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logDebug, logError } from '../utils/logger.js';
import { notifyUser, notifyDepartment, createNotification, getUserIdsByDepartment } from '../utils/notificationHelper.js';

// 单据状态枚举
const DocumentStatus = {
  SUBMITTED: 'submitted',           // 已提交（待接收）
  PRINTED: 'printed',               // 已打印
  RECEIVED: 'received',             // 已接收
  MATERIAL_ISSUED: 'material_issued', // 已发料（已锁BIN）
  SIGNED: 'signed',                // 已签收
  COMPLETED: 'completed',           // 已完成
  REJECTED: 'rejected',            // 已拒绝
  RETURNED: 'returned',            // 已退回
  CANCELLED: 'cancelled',          // 已取消
  WITHDRAWN: 'withdrawn'           // 已撤回
};

/**
 * 获取单据列表
 */
export const getDocuments = async (req, res, next) => {
  try {
    const {
      documentNo,
      wcName,
      status,
      startDate,
      endDate,
      submitterName,
      isUrgent,
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const params = [];
    let whereClause = 'WHERE 1=1';

    // 获取当前用户的数据范围权限
    const currentUser = req.user;
    let userDataScope = 'all'; // 默认为全部权限
    try {
      const permissionService = (await import('../services/permissionService.js')).default;
      const effectivePerms = await permissionService.getEffectivePermissions(currentUser.id);
      const daPerm = effectivePerms.find(p => p.module === 'da-material');
      if (daPerm) {
        userDataScope = daPerm.dataScope || 'self';
      }
    } catch (permErr) {
      console.error('获取用户数据范围失败:', permErr);
    }

    // 根据数据范围应用过滤条件
    if (userDataScope === 'self') {
      // 只看自己提交的单据
      whereClause += ` AND submitter_name = $${params.length + 1}`;
      params.push(currentUser.real_name);
    } else if (userDataScope === 'dept') {
      // 看自己部门的人提交的单据
      whereClause += ` AND department_id = $${params.length + 1}`;
      params.push(currentUser.departmentId);
    } else if (userDataScope === 'plant') {
      // 看自己厂区的人提交的单据
      whereClause += ` AND plant_id = $${params.length + 1}`;
      params.push(currentUser.plantId);
    }
    // 'all' 不添加过滤条件

    // 动态构建查询条件
    if (documentNo) {
      params.push(`%${documentNo}%`);
      whereClause += ` AND document_no LIKE $${params.length}`;
    }

    if (wcName) {
      params.push(`%${wcName}%`);
      whereClause += ` AND wc_name LIKE $${params.length}`;
    }

    if (status) {
      // 支持多个状态，用逗号分隔
      const statusList = status.split(',');
      params.push(statusList);
      whereClause += ` AND status = ANY($${params.length})`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND DATE(submitted_at) >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND DATE(submitted_at) <= $${params.length}`;
    }

    if (submitterName) {
      params.push(`%${submitterName}%`);
      whereClause += ` AND submitter_name LIKE $${params.length}`;
    }

    // 加急过滤
    if (isUrgent === 'true' || isUrgent === true) {
      whereClause += ` AND is_urgent = true`;
    } else if (isUrgent === 'false') {
      whereClause += ` AND is_urgent = false`;
    }

    // 查询列表
    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        id,
        document_no,
        wc_name,
        attachment_url,
        attachment_name,
        da_no,
        ecn_no,
        ecn_attachment_url,
        ecn_attachment_name,
        submitter_name,
        is_urgent,
        is_rush,
        control_type,
        status,
        submitted_at,
        printed_at,
        printed_by,
        received_at,
        received_by,
        material_issued_at,
        material_issued_by,
        signed_at,
        signed_by,
        completed_at,
        completed_by,
        rejected_at,
        reject_reason,
        returned_at,
        returned_by,
        return_reason,
        withdrawn_at,
        created_at,
        updated_at
      FROM ${DA_MATERIAL_DOCUMENT_TABLE}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DA_MATERIAL_DOCUMENT_TABLE} ${whereClause}
    `, params);

    const documents = listResult.rows.map(row => ({
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      daNo: row.da_no,
      ecnNo: row.ecn_no,
      ecnAttachmentUrl: row.ecn_attachment_url,
      ecnAttachmentName: row.ecn_attachment_name,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      controlType: row.control_type,
      status: row.status,
      submittedAt: row.submitted_at,
      printedAt: row.printed_at,
      printedBy: row.printed_by,
      receivedAt: row.received_at,
      receivedBy: row.received_by,
      materialIssuedAt: row.material_issued_at,
      materialIssuedBy: row.material_issued_by,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      rejectedAt: row.rejected_at,
      rejectReason: row.reject_reason,
      returnedAt: row.returned_at,
      returnedBy: row.returned_by,
      returnReason: row.return_reason,
      withdrawnAt: row.withdrawn_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    paginated(res, {
      items: documents,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取单据详情
 */
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        document_no,
        wc_name,
        attachment_url,
        attachment_name,
        da_no,
        ecn_no,
        ecn_attachment_url,
        ecn_attachment_name,
        submitter_name,
        is_urgent,
        is_rush,
        control_type,
        status,
        submitted_at,
        printed_at,
        printed_by,
        received_at,
        received_by,
        material_issued_at,
        material_issued_by,
        signed_at,
        signed_by,
        completed_at,
        completed_by,
        rejected_at,
        reject_reason,
        returned_at,
        returned_by,
        return_reason,
        withdrawn_at,
        created_at,
        updated_at
      FROM ${DA_MATERIAL_DOCUMENT_TABLE}
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const row = result.rows[0];
    const document = {
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      daNo: row.da_no,
      ecnNo: row.ecn_no,
      ecnAttachmentUrl: row.ecn_attachment_url,
      ecnAttachmentName: row.ecn_attachment_name,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      controlType: row.control_type,
      status: row.status,
      submittedAt: row.submitted_at,
      printedAt: row.printed_at,
      printedBy: row.printed_by,
      receivedAt: row.received_at,
      receivedBy: row.received_by,
      materialIssuedAt: row.material_issued_at,
      materialIssuedBy: row.material_issued_by,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      rejectedAt: row.rejected_at,
      rejectReason: row.reject_reason,
      returnedAt: row.returned_at,
      returnedBy: row.returned_by,
      returnReason: row.return_reason,
      withdrawnAt: row.withdrawn_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    success(res, document, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 创建单据（提交）
 */
export const createDocument = async (req, res, next) => {
  try {
    const {
      documentNo,
      wcName,
      attachmentUrl,
      attachmentName,
      daNo,
      ecnNo,
      ecnAttachmentUrl,
      ecnAttachmentName,
      submitterName,
      isUrgent,
      isRush,
      controlType,
      isTO,
      deliveryLocation
    } = req.body;

    // 验证必填字段
    if (!documentNo || !wcName || !daNo || !submitterName) {
      throw BadRequestError('请填写必填项：单号、W/C名称、DA编号、提交人');
    }

    // 验证附件（必须上传）
    if (!attachmentUrl) {
      throw BadRequestError('请上传单据附件');
    }

    // DA编号为N/A时，ECN编号和ECN附件为必填
    if (daNo.toUpperCase() === 'N/A') {
      if (!ecnNo) {
        throw BadRequestError('DA编号为N/A时，ECN编号为必填');
      }
      if (!ecnAttachmentUrl) {
        throw BadRequestError('DA编号为N/A时，ECN附件为必填');
      }
    }

    // 记录收到的数据用于调试
    logInfo('创建单据收到的数据', { documentNo, wcName, isTO, deliveryLocation });

    // 勾选TO时，配送地点为必填
    if (isTO && !deliveryLocation) {
      throw BadRequestError('勾选同步K045时，配送地点为必填');
    }

    // 检查单号是否已存在
    const existingDoc = await pool.query(
      'SELECT id FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE document_no = $1',
      [documentNo]
    );

    if (existingDoc.rows.length > 0) {
      throw BadRequestError('单号已存在');
    }

    const result = await pool.query(`
      INSERT INTO ${DA_MATERIAL_DOCUMENT_TABLE} (
        document_no,
        wc_name,
        attachment_url,
        attachment_name,
        da_no,
        ecn_no,
        ecn_attachment_url,
        ecn_attachment_name,
        submitter_name,
        is_urgent,
        is_rush,
        control_type,
        is_to,
        delivery_location,
        status,
        submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `, [
      documentNo,
      wcName,
      attachmentUrl,
      attachmentName,
      daNo,
      ecnNo || null,
      ecnAttachmentUrl || null,
      ecnAttachmentName || null,
      submitterName,
      isUrgent || false,
      isRush || false,
      controlType || '正常',
      isTO || false,
      deliveryLocation || null,
      DocumentStatus.SUBMITTED
    ]);

    const row = result.rows[0];
    const document = {
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      daNo: row.da_no,
      ecnNo: row.ecn_no,
      ecnAttachmentUrl: row.ecn_attachment_url,
      ecnAttachmentName: row.ecn_attachment_name,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      controlType: row.control_type,
      isTO: row.is_to,
      deliveryLocation: row.delivery_location,
      status: row.status,
      submittedAt: row.submitted_at
    };

    logInfo('管控物料单据创建成功', { documentNo, submitterName, daNo, isTO, deliveryLocation });
    success(res, document, '单据提交成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 更新单据
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      documentNo,
      wcName,
      attachmentUrl,
      attachmentName,
      daNo,
      ecnNo,
      ecnAttachmentUrl,
      ecnAttachmentName,
      submitterName,
      isUrgent,
      isRush,
      controlType
    } = req.body;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    // 如果只是更新 isUrgent 字段，允许在任何状态下更新，且跳过其他验证
    const onlyUrgentUpdate = Object.keys(req.body).length === 1 && 'isUrgent' in req.body;

    if (!onlyUrgentUpdate) {
      if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED &&
          existingDoc.rows[0].status !== DocumentStatus.WITHDRAWN &&
          existingDoc.rows[0].status !== DocumentStatus.RETURNED) {
        throw BadRequestError('当前状态不允许修改');
      }

      // DA编号为N/A时，ECN编号和ECN附件为必填
      if (daNo && daNo.toUpperCase() === 'N/A') {
        if (!ecnNo) {
          throw BadRequestError('DA编号为N/A时，ECN编号为必填');
        }
        if (!ecnAttachmentUrl) {
          throw BadRequestError('DA编号为N/A时，ECN附件为必填');
        }
      }
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET
        document_no = COALESCE($1, document_no),
        wc_name = COALESCE($2, wc_name),
        attachment_url = COALESCE($3, attachment_url),
        attachment_name = COALESCE($4, attachment_name),
        da_no = COALESCE($5, da_no),
        ecn_no = COALESCE($6, ecn_no),
        ecn_attachment_url = COALESCE($7, ecn_attachment_url),
        ecn_attachment_name = COALESCE($8, ecn_attachment_name),
        submitter_name = COALESCE($9, submitter_name),
        is_urgent = COALESCE($10, is_urgent),
        is_rush = COALESCE($11, is_rush),
        control_type = COALESCE($12, control_type),
        status = CASE WHEN status = 'returned' OR status = 'withdrawn' THEN 'submitted' ELSE status END,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      documentNo,
      wcName,
      attachmentUrl,
      attachmentName,
      daNo,
      ecnNo,
      ecnAttachmentUrl,
      ecnAttachmentName,
      submitterName,
      isUrgent,
      isRush,
      controlType,
      id
    ]);

    const row = result.rows[0];
    const document = {
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      daNo: row.da_no,
      ecnNo: row.ecn_no,
      ecnAttachmentUrl: row.ecn_attachment_url,
      ecnAttachmentName: row.ecn_attachment_name,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      controlType: row.control_type,
      status: row.status,
      updatedAt: row.updated_at
    };

    success(res, document, '更新成功');

  } catch (err) {
    console.error('更新单据失败:', err);
    next(err);
  }
};

/**
 * 撤回单据（提交部门）
 */
export const withdrawDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在且状态为已提交
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED) {
      throw BadRequestError('只能撤回已提交的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, withdrawn_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [DocumentStatus.WITHDRAWN, id]);

    logInfo('管控物料单据撤回成功', { id, documentNo: existingDoc.rows[0].document_no });
    success(res, { id: result.rows[0].id, status: result.rows[0].status }, '单据已撤回');

  } catch (err) {
    next(err);
  }
};

/**
 * 打印单据（打印部门）
 */
export const printDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { printedBy } = req.body;

    // 检查单据是否存在且状态为已提交
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED) {
      throw BadRequestError('只能打印已提交的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, printed_at = NOW(), printed_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.PRINTED, printedBy || '打印员', id]);

    logInfo('管控物料单据打印成功', { id, documentNo: existingDoc.rows[0].document_no, printedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, printedAt: result.rows[0].printed_at }, '单据已打印');

  } catch (err) {
    next(err);
  }
};

/**
 * 接收单据（接收部门）
 */
export const receiveDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receivedBy } = req.body;

    // 检查单据是否存在且状态为已提交或已打印
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const currentStatus = existingDoc.rows[0].status;
    if (currentStatus !== DocumentStatus.SUBMITTED && currentStatus !== DocumentStatus.PRINTED) {
      throw BadRequestError('只能接收已提交或已打印的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, received_at = NOW(), received_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.RECEIVED, receivedBy || '接收员', id]);

    const docData = existingDoc.rows[0];

    // 通知提交人
    await notifyUser(pool, docData.submitter_name, '📥',
      '【接收通知】管控物料已接收',
      `您的单据 ${docData.document_no} 已被仓库接收。`,
      'da_material',
      { documentId: id, documentNo: docData.document_no }
    );

    logInfo('管控物料单据接收成功', { id, documentNo: docData.document_no, receivedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, receivedAt: result.rows[0].received_at }, '单据已接收');

  } catch (err) {
    next(err);
  }
};

/**
 * 拒绝单据（接收部门）
 */
export const rejectDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw BadRequestError('请输入拒绝原因');
    }

    // 检查单据是否存在且状态为已打印
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.PRINTED) {
      throw BadRequestError('只能拒绝已打印的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, rejected_at = NOW(), reject_reason = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.REJECTED, reason, id]);

    const docData = existingDoc.rows[0];

    // 通知提交人
    await notifyUser(pool, docData.submitter_name, '❌',
      '【拒绝通知】管控物料单据被拒绝',
      `您的单据 ${docData.document_no} 被拒绝，拒绝原因：${reason}`,
      'da_material',
      { documentId: id, documentNo: docData.document_no, reason }
    );

    logInfo('管控物料单据被拒绝', { id, documentNo: docData.document_no, reason });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, rejectReason: result.rows[0].reject_reason }, '单据已拒绝');

  } catch (err) {
    next(err);
  }
};

/**
 * 退回单据（可退回已提交、已打印、已接收的单据）
 */
export const returnDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, returnedBy } = req.body;

    if (!reason) {
      throw BadRequestError('请输入退回原因');
    }

    // 检查单据是否存在且状态允许退回
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const currentStatus = existingDoc.rows[0].status;
    const allowedStatuses = [DocumentStatus.SUBMITTED, DocumentStatus.PRINTED, DocumentStatus.RECEIVED];
    if (!allowedStatuses.includes(currentStatus)) {
      throw BadRequestError('当前状态不允许退回');
    }

    const docData = existingDoc.rows[0];

    // 获取提交人的邮箱
    let submitterEmail = null;
    let submitterUserId = null;
    try {
      const userResult = await pool.query(
        `SELECT id, email FROM ${USER_TABLE} WHERE real_name = $1 OR username = $1 LIMIT 1`,
        [docData.submitter_name]
      );
      if (userResult.rows.length > 0) {
        submitterEmail = userResult.rows[0].email;
        submitterUserId = userResult.rows[0].id;
      }
    } catch (err) {
      logDebug('获取提交人邮箱失败', { submitterName: docData.submitter_name, error: err.message });
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, returned_at = NOW(), returned_by = $2, return_reason = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [DocumentStatus.RETURNED, returnedBy || '接收员', reason, id]);

    const updatedDoc = result.rows[0];

    // 通知提交人
    await notifyUser(pool, docData.submitter_name, '↩️',
      '【退回通知】管控物料单据被退回',
      `您的单据 ${docData.document_no} 已被退回，退回原因：${reason}`,
      'da_material',
      { documentId: id, documentNo: docData.document_no, reason }
    );

    logInfo('管控物料单据被退回', { id, documentNo: docData.document_no, reason, returnedBy, submitterEmail });
    success(res, {
      id: updatedDoc.id,
      status: updatedDoc.status,
      returnReason: updatedDoc.return_reason,
      submitterEmail,
      documentNo: docData.document_no
    }, '单据已退回');

  } catch (err) {
    next(err);
  }
};

/**
 * 取消单据（已退回状态可取消）
 */
export const cancelDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;

    // 检查单据是否存在且状态为已退回
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const currentStatus = existingDoc.rows[0].status;
    if (currentStatus !== DocumentStatus.RETURNED) {
      throw BadRequestError('只有已退回的单据才能取消');
    }

    const docData = existingDoc.rows[0];

    // 更新状态为已取消
    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, cancelled_at = NOW(), cancelled_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.CANCELLED, cancelledBy || '操作员', id]);

    const updatedDoc = result.rows[0];

    logInfo('管控物料单据已取消', { id, documentNo: docData.document_no, cancelledBy });
    success(res, {
      id: updatedDoc.id,
      status: updatedDoc.status,
      cancelledAt: updatedDoc.cancelled_at,
      cancelledBy: updatedDoc.cancelled_by,
      documentNo: docData.document_no
    }, '单据已取消');

  } catch (err) {
    next(err);
  }
};

/**
 * 签收单据（签收部门）
 */
export const signDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { signedBy } = req.body;

    // 检查单据是否存在且状态为已发料
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.MATERIAL_ISSUED) {
      throw BadRequestError('只能签收已发料的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, signed_at = NOW(), signed_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.SIGNED, signedBy || '签收员', id]);

    const docData = existingDoc.rows[0];

    // 通知提交人
    await notifyUser(pool, docData.submitter_name, '✍️',
      '【签收通知】管控物料已签收',
      `您的单据 ${docData.document_no} 已完成签收，请确认是否领取。`,
      'da_material',
      { documentId: id, documentNo: docData.document_no }
    );

    logInfo('管控物料单据签收成功', { id, documentNo: docData.document_no, signedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, signedAt: result.rows[0].signed_at }, '单据已签收');

  } catch (err) {
    next(err);
  }
};

/**
 * 已锁BIN（已发料）- 仓库操作
 * 可选参数 deliveryLocation: 如果提供，将同步创建K045单据
 */
export const lockBinDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lockedBy, deliveryLocation, k045DocumentNo, k045AttachmentUrl, k045AttachmentName } = req.body;

    // 检查单据是否存在且状态为已接收
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.RECEIVED) {
      throw BadRequestError('只能对已接收的单据进行锁BIN操作，当前状态：' + existingDoc.rows[0].status);
    }

    const docData = existingDoc.rows[0];

    // 获取提交人的邮箱
    let submitterEmail = null;
    try {
      const userResult = await pool.query(
        `SELECT email FROM ${USER_TABLE} WHERE real_name = $1 OR username = $1 LIMIT 1`,
        [docData.submitter_name]
      );
      if (userResult.rows.length > 0) {
        submitterEmail = userResult.rows[0].email;
      }
    } catch (err) {
      logDebug('获取提交人邮箱失败', { submitterName: docData.submitter_name, error: err.message });
    }

    // 从单据数据中获取isTO和配送地点信息（优先使用单据保存的数据）
    const isTO = docData.is_to || false;
    const daDeliveryLocation = docData.delivery_location;
    const autoK045DocumentNo = isTO && daDeliveryLocation ? docData.document_no : null;


    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, material_issued_at = NOW(), material_issued_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.MATERIAL_ISSUED, lockedBy || '仓库操作员', id]);

    const updatedDoc = result.rows[0];

    // 获取提交人的用户ID并创建通知
    await notifyUser(pool, docData.submitter_name, '📦',
      '【发料通知】管控物料已发料',
      `您的单据 ${docData.document_no} 已完成发料，请尽快到仓库领取。`,
      'da_material',
      { documentId: id, documentNo: docData.document_no }
    );

      logInfo('锁BIN - 检查是否同步K045', { isTO, daDeliveryLocation, k045DocumentNo });
    // 如果勾选了TO且有配送地点，创建K045单据
    let k045DocumentId = null;
    if (isTO && daDeliveryLocation && autoK045DocumentNo) {
      try {
        // 检查K045单号是否已存在
        const existingK045 = await pool.query(
          `SELECT id FROM ${K045_DOCUMENT_TABLE} WHERE document_no = $1`,
          [autoK045DocumentNo]
        );

        if (existingK045.rows.length === 0) {
          // 创建K045单据
          const k045Result = await pool.query(`
            INSERT INTO ${K045_DOCUMENT_TABLE} (
              document_no, wc_name, attachment_url, attachment_name,
              delivery_location, submitter_name, status, submitted_at,
              received_at, received_by, material_sent_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, NOW())
            RETURNING id
          `, [
            autoK045DocumentNo,
            docData.wc_name || docData.da_no || 'DA物料',
            docData.attachment_url || null,
            docData.attachment_name || null,
            daDeliveryLocation,
            docData.submitter_name,
            'material_sent', // status
            lockedBy || '仓库操作员' // received_by
          ]);
          k045DocumentId = k045Result.rows[0].id;
          logInfo('管控物料锁BIN时同步创建K045单据', {
            daDocumentId: id,
            k045DocumentId,
            autoK045DocumentNo,
            daDeliveryLocation
          });
        } else {
          logDebug('K045单据已存在，跳过创建', { k045DocumentNo });
        }
      } catch (k045Err) {
        logError('同步创建K045单据失败', { error: k045Err.message });
      }
    }

    logInfo('管控物料单据已锁BIN（已发料）', { id, documentNo: docData.document_no, lockedBy, k045DocumentId });
    success(res, {
      id: updatedDoc.id,
      status: updatedDoc.status,
      materialIssuedAt: updatedDoc.material_issued_at,
      materialIssuedBy: updatedDoc.material_issued_by,
      documentNo: docData.document_no,
      submitterEmail,
      k045DocumentId
    }, '已锁BIN成功，状态已更新为已发料');

  } catch (err) {
    next(err);
  }
};

/**
 * 确认完成（提交人确认）
 */
export const confirmComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;

    // 检查单据是否存在且状态为已签收
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SIGNED) {
      throw BadRequestError('只能确认已签收的单据');
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET status = $1, completed_at = NOW(), completed_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.COMPLETED, completedBy || '提交人', id]);

    logInfo('管控物料单据已完成', { id, documentNo: existingDoc.rows[0].document_no, completedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, completedAt: result.rows[0].completed_at }, '单据已完成');

  } catch (err) {
    next(err);
  }
};

/**
 * 发送邮件通知 - 返回邮件内容供前端构建 mailto
 */
export const sendNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = existingDoc.rows[0];

    // 状态描述映射
    const statusDescriptions = {
      'submitted': '已提交，等待接收',
      'printed': '已打印，等待接收',
      'received': '已接收，等待发料',
      'material_issued': '已完成发料，等待签收',
      'signed': '已完成签收，等待完成',
      'completed': '已完成',
      'rejected': '已被拒绝',
      'returned': '已被退回',
      'cancelled': '已取消',
      'withdrawn': '已撤回'
    };
    const statusDescription = statusDescriptions[doc.status] || `当前状态：${doc.status}`;

    // 获取提交人邮箱
    let submitterEmail = '';
    try {
      const userResult = await pool.query(
        `SELECT email FROM ${USER_TABLE} WHERE real_name = $1 OR username = $1 LIMIT 1`,
        [doc.submitter_name]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].email) {
        submitterEmail = userResult.rows[0].email;
      }
    } catch (err) {
      logDebug('获取提交人邮箱失败', { submitterName: doc.submitter_name, error: err.message });
    }

    // 生成邮件内容
    const subject = `管控物料单据 ${doc.document_no} 状态更新`;
    const siteUrl = process.env.SITE_URL || 'http://cnhuanb5947:8888/login';
    const body = `您好 ${doc.submitter_name}，

您的管控物料单据 ${doc.document_no} 状态已更新：${statusDescription}

单据信息：
- 单号：${doc.document_no}
- W/C：${doc.wc_name || '-'}
- 配送地点：${doc.delivery_location || '-'}
- DA编号：${doc.da_no || '-'}
- 状态：${statusDescription}

📎 查看详情：${siteUrl}

---
Jabil Smart Office
单据管理系统`;

    logInfo('管控物料单据邮件通知', {
      id,
      documentNo: doc.document_no,
      submitterName: doc.submitter_name,
      submitterEmail,
      status: doc.status
    });

    success(res, {
      id: doc.id,
      documentNo: doc.document_no,
      submitterName: doc.submitter_name,
      submitterEmail,
      status: doc.status,
      subject,
      body
    }, '邮件内容已准备');

  } catch (err) {
    next(err);
  }
};

/**
 * 删除单据
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    await pool.query('DELETE FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1', [id]);

    logInfo('管控物料单据删除成功', { id, documentNo: existingDoc.rows[0].document_no });
    success(res, null, '删除成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取待处理单据统计
 */
export const getStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'printed' THEN 1 END) as printed,
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status = 'material_issued' THEN 1 END) as material_issued,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
        COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as withdrawn,
        COUNT(*) as total
      FROM ${DA_MATERIAL_DOCUMENT_TABLE}
    `);

    const stats = {
      submitted: parseInt(result.rows[0].submitted) || 0,
      printed: parseInt(result.rows[0].printed) || 0,
      received: parseInt(result.rows[0].received) || 0,
      material_issued: parseInt(result.rows[0].material_issued) || 0,
      signed: parseInt(result.rows[0].signed) || 0,
      completed: parseInt(result.rows[0].completed) || 0,
      rejected: parseInt(result.rows[0].rejected) || 0,
      returned: parseInt(result.rows[0].returned) || 0,
      withdrawn: parseInt(result.rows[0].withdrawn) || 0,
      total: parseInt(result.rows[0].total) || 0
    };

    success(res, stats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 下载单据附件
 */
export const downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT attachment_url, attachment_name FROM ${DA_MATERIAL_DOCUMENT_TABLE} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const { attachment_url, attachment_name } = result.rows[0];

    if (!attachment_url) {
      throw new AppError('该单据没有附件', 404);
    }

    // 从URL中提取文件名
    const fileName = path.basename(attachment_url);
    const filePath = path.join(process.cwd(), 'uploads', fileName);

    if (!fs.existsSync(filePath)) {
      throw new AppError('附件文件不存在', 404);
    }

    // 根据文件类型设置Content-Type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv'
    };

    // 设置响应头
    res.setHeader('Content-Description', 'File Transfer');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment_name || fileName)}"`);

    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (err) {
    next(err);
  }
};

/**
 * 催单
 */
export const rushDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      'SELECT * FROM ' + DA_MATERIAL_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const result = await pool.query(`
      UPDATE ${DA_MATERIAL_DOCUMENT_TABLE}
      SET is_rush = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    logInfo('管控物料单据催单成功', { id, documentNo: existingDoc.rows[0].document_no });
    success(res, { id: result.rows[0].id, isRush: result.rows[0].is_rush }, '催单成功');

  } catch (err) {
    next(err);
  }
};

export default {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  withdrawDocument,
  printDocument,
  receiveDocument,
  lockBinDocument,
  rejectDocument,
  returnDocument,
  cancelDocument,
  signDocument,
  confirmComplete,
  sendNotification,
  deleteDocument,
  getStats,
  downloadAttachment,
  rushDocument
};
