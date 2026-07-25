/**
 * K045 单据管理控制器
 * 流程：提交 -> 接收打印 -> 签收分料
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { K045_DOCUMENT_TABLE, USER_TABLE } from '../config/db_constants.js';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logDebug } from '../utils/logger.js';

// 单据状态枚举
const DocumentStatus = {
  SUBMITTED: 'submitted',           // 已提交
  RECEIVED: 'received',             // 已接收（打印部门接单）
  REJECTED: 'rejected',             // 已拒绝
  RETURNED: 'returned',             // 已退回
  CANCELLED: 'cancelled',           // 已取消
  SIGNED: 'signed',                 // 已签收（分料部门签收）
  DISTRIBUTION_ENDED: 'distribution_ended', // 分料结束
  COMPLETED: 'completed',          // 已完成（提交人确认）
  WITHDRAWN: 'withdrawn'            // 已撤回
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
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const params = [];
    let whereClause = 'WHERE 1=1';

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

    // 查询列表
    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        id,
        document_no,
        wc_name,
        attachment_url,
        attachment_name,
        delivery_location,
        submitter_name,
        is_urgent,
        is_rush,
        status,
        submitted_at,
        received_at,
        received_by,
        signed_at,
        signed_by,
        distribution_ended_at,
        rejected_at,
        reject_reason,
        withdrawn_at,
        created_at,
        updated_at
      FROM ${K045_DOCUMENT_TABLE}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${K045_DOCUMENT_TABLE} ${whereClause}
    `, params);

    const documents = listResult.rows.map(row => ({
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      deliveryLocation: row.delivery_location,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      status: row.status,
      submittedAt: row.submitted_at,
      receivedAt: row.received_at,
      receivedBy: row.received_by,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      distributionEndedAt: row.distribution_ended_at,
      rejectedAt: row.rejected_at,
      rejectReason: row.reject_reason,
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
        delivery_location,
        submitter_name,
        is_urgent,
        is_rush,
        status,
        submitted_at,
        received_at,
        received_by,
        signed_at,
        signed_by,
        distribution_ended_at,
        rejected_at,
        reject_reason,
        withdrawn_at,
        created_at,
        updated_at
      FROM ${K045_DOCUMENT_TABLE}
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
      deliveryLocation: row.delivery_location,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      status: row.status,
      submittedAt: row.submitted_at,
      receivedAt: row.received_at,
      receivedBy: row.received_by,
      signedAt: row.signed_at,
      signedBy: row.signed_by,
      distributionEndedAt: row.distribution_ended_at,
      rejectedAt: row.rejected_at,
      rejectReason: row.reject_reason,
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
      deliveryLocation,
      submitterName,
      isUrgent,
      isRush
    } = req.body;

    // 验证必填字段
    if (!documentNo || !wcName || !deliveryLocation || !submitterName) {
      throw BadRequestError('请填写必填项：单号、W/C名称、配送地点、提交人');
    }

    // 检查单号是否已存在
    const existingDoc = await pool.query(
      'SELECT id FROM ' + K045_DOCUMENT_TABLE + ' WHERE document_no = $1',
      [documentNo]
    );

    if (existingDoc.rows.length > 0) {
      throw BadRequestError('单号已存在');
    }

    const result = await pool.query(`
      INSERT INTO ${K045_DOCUMENT_TABLE} (
        document_no,
        wc_name,
        attachment_url,
        attachment_name,
        delivery_location,
        submitter_name,
        is_urgent,
        is_rush,
        status,
        submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      documentNo,
      wcName,
      attachmentUrl || null,
      attachmentName || null,
      deliveryLocation,
      submitterName,
      isUrgent || false,
      isRush || false,
      DocumentStatus.SUBMITTED
    ]);

    const row = result.rows[0];
    const document = {
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      deliveryLocation: row.delivery_location,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
      status: row.status,
      submittedAt: row.submitted_at
    };

    logInfo('K045单据创建成功', { documentNo, submitterName });
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
      deliveryLocation,
      submitterName,
      isUrgent,
      isRush
    } = req.body;

    // 检查单据是否存在且状态允许修改
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED &&
        existingDoc.rows[0].status !== DocumentStatus.WITHDRAWN &&
        existingDoc.rows[0].status !== DocumentStatus.RETURNED) {
      throw BadRequestError('当前状态不允许修改');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET
        document_no = COALESCE($1, document_no),
        wc_name = COALESCE($2, wc_name),
        attachment_url = COALESCE($3, attachment_url),
        attachment_name = COALESCE($4, attachment_name),
        delivery_location = COALESCE($5, delivery_location),
        submitter_name = COALESCE($6, submitter_name),
        is_urgent = COALESCE($7, is_urgent),
        is_rush = COALESCE($8, is_rush),
        status = CASE WHEN status = 'returned' THEN 'submitted' ELSE status END,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      documentNo,
      wcName,
      attachmentUrl,
      attachmentName,
      deliveryLocation,
      submitterName,
      isUrgent,
      isRush,
      id
    ]);

    const row = result.rows[0];
    const document = {
      id: row.id,
      documentNo: row.document_no,
      wcName: row.wc_name,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      deliveryLocation: row.delivery_location,
      submitterName: row.submitter_name,
      isUrgent: row.is_urgent,
      isRush: row.is_rush,
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
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED) {
      throw BadRequestError('只能撤回已提交的单据');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, withdrawn_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [DocumentStatus.WITHDRAWN, id]);

    logInfo('K045单据撤回成功', { id, documentNo: existingDoc.rows[0].document_no });
    success(res, { id: result.rows[0].id, status: result.rows[0].status }, '单据已撤回');

  } catch (err) {
    next(err);
  }
};

/**
 * 接收单据（接收打印部门）
 */
export const receiveDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receivedBy } = req.body;

    // 检查单据是否存在且状态为已提交
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED) {
      throw BadRequestError('只能接收已提交的单据');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, received_at = NOW(), received_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.RECEIVED, receivedBy || '接收员', id]);

    logInfo('K045单据接收成功', { id, documentNo: existingDoc.rows[0].document_no, receivedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, receivedAt: result.rows[0].received_at }, '单据已接收');

  } catch (err) {
    next(err);
  }
};

/**
 * 拒绝单据（接收打印部门）
 */
export const rejectDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw BadRequestError('请输入拒绝原因');
    }

    // 检查单据是否存在且状态为已提交
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SUBMITTED) {
      throw BadRequestError('只能拒绝已提交的单据');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, rejected_at = NOW(), reject_reason = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.REJECTED, reason, id]);

    logInfo('K045单据被拒绝', { id, documentNo: existingDoc.rows[0].document_no, reason });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, rejectReason: result.rows[0].reject_reason }, '单据已拒绝');

  } catch (err) {
    next(err);
  }
};

/**
 * 退回单据（签收分料部门退回给接收打印部门）
 */
export const returnDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, returnedBy } = req.body;

    if (!reason) {
      throw BadRequestError('请输入退回原因');
    }

    // 检查单据是否存在且状态为已接收
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.RECEIVED) {
      throw BadRequestError('只能退回已接收的单据');
    }

    const docData = existingDoc.rows[0];

    // 获取提交人的邮箱
    let submitterEmail = null;
    try {
      const userResult = await pool.query(
        `SELECT email FROM ${USER_TABLE} WHERE real_name = $1 OR username = $1 LIMIT 1`,
        [docData.submitter_name]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].email) {
        submitterEmail = userResult.rows[0].email;
      }
    } catch (err) {
      logDebug('获取提交人邮箱失败', { submitterName: docData.submitter_name, error: err.message });
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, returned_at = NOW(), returned_by = $2, return_reason = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [DocumentStatus.RETURNED, returnedBy || '接收打印员', reason, id]);

    const updatedDoc = result.rows[0];

    // 注意：邮件通知已移至前端使用 mailto: 方式实现
    // 这里只返回提交人邮箱，由前端打开邮件客户端

    logInfo('K045单据被退回', { id, documentNo: docData.document_no, reason, returnedBy, submitterEmail });
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
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
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
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, cancelled_at = NOW(), cancelled_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.CANCELLED, cancelledBy || '操作员', id]);

    const updatedDoc = result.rows[0];

    logInfo('K045单据已取消', { id, documentNo: docData.document_no, cancelledBy });
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
 * 签收单据（签收分料部门）
 */
export const signDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { signedBy } = req.body;

    // 检查单据是否存在且状态为已接收
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.RECEIVED) {
      throw BadRequestError('只能签收已接收的单据');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, signed_at = NOW(), signed_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.SIGNED, signedBy || '签收员', id]);

    logInfo('K045单据签收成功', { id, documentNo: existingDoc.rows[0].document_no, signedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, signedAt: result.rows[0].signed_at }, '单据已签收');

  } catch (err) {
    next(err);
  }
};

/**
 * 分料结束（签收分料部门）
 */
export const endDistribution = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在且状态为已签收
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.SIGNED) {
      throw BadRequestError('只能对已签收的单据进行分料结束操作');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, distribution_ended_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [DocumentStatus.DISTRIBUTION_ENDED, id]);

    logInfo('K045单据分料结束', { id, documentNo: existingDoc.rows[0].document_no });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, distributionEndedAt: result.rows[0].distribution_ended_at }, '分料已结束');

  } catch (err) {
    next(err);
  }
};

/**
 * 提交人确认完成（签收）
 * 由提交人在"提交管理"页签操作，将分料结束的单据标记为已完成
 */
export const confirmComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completedBy } = req.body;

    // 检查单据是否存在且状态为分料结束
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.DISTRIBUTION_ENDED) {
      throw BadRequestError('只能确认已完成分料的单据');
    }

    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET status = $1, completed_at = NOW(), completed_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [DocumentStatus.COMPLETED, completedBy || '提交人', id]);

    logInfo('K045单据已完成', { id, documentNo: existingDoc.rows[0].document_no, completedBy });
    success(res, { id: result.rows[0].id, status: result.rows[0].status, completedAt: result.rows[0].completed_at }, '单据已完成');

  } catch (err) {
    next(err);
  }
};

/**
 * 发送邮件通知
 */
export const sendNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = existingDoc.rows[0];

    // TODO: 实现实际的邮件发送逻辑
    // 这里可以集成 nodemailer 或其他邮件服务
    logInfo('K045单据邮件通知', {
      id,
      documentNo: doc.document_no,
      submitterName: doc.submitter_name,
      status: doc.status
    });

    success(res, {
      id: doc.id,
      documentNo: doc.document_no,
      submitterName: doc.submitter_name,
      status: doc.status
    }, '邮件通知已发送');

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
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const docData = existingDoc.rows[0];

    // 只有已提交或已接收的单据才能催单
    if (docData.status !== DocumentStatus.SUBMITTED && docData.status !== DocumentStatus.RECEIVED) {
      throw BadRequestError('只能对已提交或已接收的单据进行催单');
    }

    // 更新催单状态
    const result = await pool.query(`
      UPDATE ${K045_DOCUMENT_TABLE}
      SET is_rush = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, document_no, is_rush, status
    `, [id]);

    logInfo('K045单据催单', { id, documentNo: docData.document_no, submitterName: docData.submitter_name });
    success(res, {
      id: result.rows[0].id,
      documentNo: result.rows[0].document_no,
      isRush: result.rows[0].is_rush,
      status: result.rows[0].status
    }, '催单成功');

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
      'SELECT * FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    await pool.query('DELETE FROM ' + K045_DOCUMENT_TABLE + ' WHERE id = $1', [id]);

    logInfo('K045单据删除成功', { id, documentNo: existingDoc.rows[0].document_no });
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
        COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'distribution_ended' THEN 1 END) as distribution_ended,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned,
        COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as withdrawn,
        COUNT(*) as total
      FROM ${K045_DOCUMENT_TABLE}
    `);

    const stats = {
      submitted: parseInt(result.rows[0].submitted) || 0,
      received: parseInt(result.rows[0].received) || 0,
      signed: parseInt(result.rows[0].signed) || 0,
      distributionEnded: parseInt(result.rows[0].distribution_ended) || 0,
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
      `SELECT attachment_url, attachment_name FROM ${K045_DOCUMENT_TABLE} WHERE id = $1`,
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

    // 设置响应头
    res.setHeader('Content-Description', 'File Transfer');
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment_name || fileName)}"`);

    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

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
  receiveDocument,
  rejectDocument,
  returnDocument,
  signDocument,
  endDistribution,
  confirmComplete,
  sendNotification,
  rushDocument,
  deleteDocument,
  getStats,
  downloadAttachment
};
