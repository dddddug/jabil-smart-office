/**
 * 回仓申请服务层
 * 包含对账匹配算法、单号生成、邮件发送等核心业务逻辑
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import {
  WAREHOUSE_RETURN_REQUEST_TABLE,
  WAREHOUSE_RETURN_ITEMS_TABLE,
  WAREHOUSE_RETURN_RECONCILIATION_LOGS_TABLE,
  WAREHOUSE_RETURN_EMAIL_LOGS_TABLE,
  WAREHOUSE_RETURN_BUILDING_CONFIG_TABLE,
  WAREHOUSE_RETURN_EMAIL_CC_CONFIG_TABLE,
  USER_TABLE
} from '../config/db_constants.js';
import { logInfo, logError, logDebug } from '../utils/logger.js';
import { sendEmail } from './mailService.js';

/**
 * 单据状态枚举
 */
export const ReturnStatus = {
  PENDING_RECEIVING: 'pending_receiving',           // 待仓库接收
  RECEIVED: 'received',                            // 已接收-待对账
  RECONCILED_FULL_MATCH: 'reconciled_full_match', // 对账完成-匹配成功
  RECONCILED_PARTIAL_RETURN: 'reconciled_partial_return', // 对账完成-部分明细退回
  RECONCILED_DIFF: 'reconciled_diff',             // 对账差异-人工确认中
  PARTIAL_CLOSE: 'partial_close',                  // 部分完结
  CLOSED: 'closed'                                 // 已完结
};

/**
 * 匹配状态枚举
 */
export const MatchStatus = {
  PENDING: 'pending',      // 待匹配
  MATCHED: 'matched',     // 已匹配
  RETURNED: 'returned',   // 已退回
  CLOSED: 'closed'        // 已关闭
};

/**
 * 生成回仓单号
 * 格式：HC-YYYYMMDD-XXX
 */
export const generateReturnNo = async () => {
  const today = dayjs().format('YYYYMMDD');
  const prefix = `HC-${today}-`;

  // 使用序列获取当日序号
  const seqResult = await pool.query('SELECT nextval(\'jso_warehouse_return_no_seq\') as seq');
  const seq = seqResult.rows[0].seq;

  // 获取当前序列值对应的日期，如果跨天则重置
  const countResult = await pool.query(`
    SELECT COUNT(*) as count FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
    WHERE return_no LIKE $1
  `, [`${prefix}%`]);

  const todayCount = parseInt(countResult.rows[0].count);
  const seqNum = todayCount + 1;

  return `${prefix}${String(seqNum).padStart(3, '0')}`;
};

/**
 * 对账匹配算法
 * 匹配条件：material = SAP.material AND quantity = SAP.quantity AND from_sloc = bay_no
 */
export const reconcileItems = async (requestId, items) => {
  const bayNo = items[0]?.bay_no || '';

  // 查询 SAP 日志（仅查询 from_sloc 匹配 bay_no 的记录）
  const sapResult = await pool.query(`
    SELECT
      id,
      material,
      quantity,
      from_sloc,
      to_sloc,
      type,
      trans,
      rf_ind,
      creation_date
    FROM jso_sap_pull_log_partitioned
    WHERE from_sloc = $1
      AND DATE(creation_date) >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY creation_date DESC
  `, [bayNo]);

  const sapLogs = sapResult.rows;

  const matchedItems = [];      // 匹配成功
  const listOnlyItems = [];     // 清单有，SAP 无
  const sapOnlyItems = [];      // SAP 有，清单无

  // 已匹配的 SAP 日志 ID 集合
  const matchedSapIds = new Set();

  // 遍历清单明细进行匹配
  for (const item of items) {
    let found = false;

    // 在 SAP 日志中查找完全匹配（不合并，多条全部展示）
    for (const sap of sapLogs) {
      if (
        sap.material === item.material &&
        String(sap.quantity) === String(item.qty) &&
        sap.from_sloc === item.bay_no
      ) {
        matchedItems.push({
          ...item,
          sap_item_id: sap.id,
          sap_material: sap.material,
          sap_quantity: sap.quantity,
          sap_from_sloc: sap.from_sloc,
          to_sloc: sap.to_sloc,
          type: sap.type,
          trans: sap.trans,
          rf_ind: sap.rf_ind,
          match_status: MatchStatus.MATCHED
        });
        matchedSapIds.add(sap.id);
        found = true;
      }
    }

    if (!found) {
      listOnlyItems.push({
        ...item,
        match_status: MatchStatus.PENDING,
        sap_item_id: null
      });
    }
  }

  // 查找 SAP 有但清单无的记录
  for (const sap of sapLogs) {
    if (!matchedSapIds.has(sap.id)) {
      sapOnlyItems.push({
        id: null,
        request_id: requestId,
        material: sap.material,
        qty: sap.quantity,
        bay_no: sap.from_sloc,
        to_sloc: sap.to_sloc,
        type: sap.type,
        trans: sap.trans,
        rf_ind: sap.rf_ind,
        sap_item_id: sap.id,
        sap_material: sap.material,
        sap_quantity: sap.quantity,
        sap_from_sloc: sap.from_sloc,
        match_status: MatchStatus.PENDING
      });
    }
  }

  return {
    matchedItems,
    listOnlyItems,
    sapOnlyItems,
    summary: {
      total: items.length,
      matched: matchedItems.length,
      listOnly: listOnlyItems.length,
      sapOnly: sapOnlyItems.length,
      isFullMatch: listOnlyItems.length === 0 && sapOnlyItems.length === 0
    }
  };
};

/**
 * 保存对账日志
 */
export const saveReconciliationLog = async (
  requestId,
  returnNo,
  operator,
  matchedItems,
  listOnlyItems,
  sapOnlyItems,
  remark
) => {
  const result = await pool.query(`
    INSERT INTO ${WAREHOUSE_RETURN_RECONCILIATION_LOGS_TABLE} (
      request_id, return_no, operator_id, operator_name, operator_account,
      matched_items, list_only_items, sap_only_items, remark
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [
    requestId,
    returnNo,
    operator.id,
    operator.name,
    operator.account,
    JSON.stringify(matchedItems),
    JSON.stringify(listOnlyItems),
    JSON.stringify(sapOnlyItems),
    remark || null
  ]);

  return result.rows[0].id;
};

/**
 * 获取对账日志列表
 */
export const getReconciliationLogs = async (requestId) => {
  const result = await pool.query(`
    SELECT
      id,
      request_id,
      return_no,
      operator_id,
      operator_name,
      operator_account,
      operated_at,
      matched_items,
      list_only_items,
      sap_only_items,
      manual_confirmed_items,
      returned_items,
      remark
    FROM ${WAREHOUSE_RETURN_RECONCILIATION_LOGS_TABLE}
    WHERE request_id = $1
    ORDER BY operated_at DESC
  `, [requestId]);

  return result.rows.map(row => ({
    id: row.id,
    requestId: row.request_id,
    returnNo: row.return_no,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    operatorAccount: row.operator_account,
    operatedAt: row.operated_at,
    matchedItems: row.matched_items,
    listOnlyItems: row.list_only_items,
    sapOnlyItems: row.sap_only_items,
    manualConfirmedItems: row.manual_confirmed_items,
    returnedItems: row.returned_items,
    remark: row.remark
  }));
};

/**
 * 获取提交人邮箱
 */
export const getSubmitterEmail = async (submitterId) => {
  const result = await pool.query(`
    SELECT email FROM ${USER_TABLE} WHERE id = $1
  `, [submitterId]);

  return result.rows[0]?.email || null;
};

/**
 * 获取邮件抄送配置
 */
export const getEmailCcConfig = async (deptId = null) => {
  // 优先查部门级别配置，再查全局配置
  let query = `
    SELECT email, email_type FROM ${WAREHOUSE_RETURN_EMAIL_CC_CONFIG_TABLE}
    WHERE is_active = true
  `;

  if (deptId) {
    query += ` AND (dept_id = $1 OR dept_id IS NULL)`;
    const result = await pool.query(query + ` ORDER BY dept_id DESC NULLS LAST`, [deptId]);
    return result.rows;
  } else {
    query += ` AND dept_id IS NULL`;
    const result = await pool.query(query);
    return result.rows;
  }
};

/**
 * 发送退回邮件
 */
export const sendReturnEmail = async (requestId, returnNo, items, reason, operator) => {
  // 1. 获取提交人信息
  const submitterResult = await pool.query(`
    SELECT submitter_id, submitter_name, submitter_account FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
    WHERE id = $1
  `, [requestId]);

  if (submitterResult.rows.length === 0) {
    throw new Error('单据不存在');
  }

  const { submitter_id, submitter_name } = submitterResult.rows[0];
  const submitterEmail = await getSubmitterEmail(submitter_id);

  // 2. 获取抄送配置
  const ccConfig = await getEmailCcConfig();
  const ccEmails = ccConfig
    .filter(c => c.email_type === 'cc')
    .map(c => c.email)
    .filter(e => e);

  // 3. 组装邮件内容
  const itemsList = items.map((item, idx) =>
    `${idx + 1}. 物料号: ${item.material}, 数量: ${item.qty}, Bay号: ${item.bay_no}`
  ).join('\n');

  const subject = `【回仓申请退回通知】回仓单号: ${returnNo}`;
  const body = `您好 ${submitter_name}，

您的回仓申请单 ${returnNo} 有物料被退回，请及时处理。

退回明细：
${itemsList}

退回原因：${reason}

退回时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}

请登录系统查看详情并修改后重新提交。

---
Jabil Smart Office
单据管理系统`;

  let emailStatus = 'success';
  let errorMessage = null;
  let sentAt = new Date();

  // 4. 发送邮件
  try {
    if (submitterEmail) {
      await sendEmail({
        to: [submitterEmail],
        cc: ccEmails,
        subject,
        text: body
      });
    } else {
      logInfo('无法发送邮件：提交人邮箱未配置', { submitterId: submitter_id, returnNo });
    }
  } catch (err) {
    emailStatus = 'failed';
    errorMessage = err.message;
    logError('退回邮件发送失败', { requestId, returnNo, error: err.message });
  }

  // 5. 记录邮件日志
  await pool.query(`
    INSERT INTO ${WAREHOUSE_RETURN_EMAIL_LOGS_TABLE} (
      request_id, return_no, recipient_email, cc_emails, subject, body, status, error_message, sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    requestId,
    returnNo,
    submitterEmail || 'N/A',
    ccEmails.join(', '),
    subject,
    body,
    emailStatus,
    errorMessage,
    sentAt
  ]);

  return {
    success: emailStatus === 'success',
    submitterEmail,
    ccEmails,
    status: emailStatus,
    errorMessage
  };
};

/**
 * 补发邮件
 */
export const resendEmail = async (emailLogId) => {
  const result = await pool.query(`
    SELECT * FROM ${WAREHOUSE_RETURN_EMAIL_LOGS_TABLE} WHERE id = $1
  `, [emailLogId]);

  if (result.rows.length === 0) {
    throw new Error('邮件日志不存在');
  }

  const log = result.rows[0];
  const ccEmails = log.cc_emails ? log.cc_emails.split(',').map(e => e.trim()).filter(e => e) : [];

  let emailStatus = 'success';
  let errorMessage = null;
  const sentAt = new Date();

  try {
    await sendEmail({
      to: [log.recipient_email],
      cc: ccEmails,
      subject: log.subject,
      text: log.body
    });
  } catch (err) {
    emailStatus = 'failed';
    errorMessage = err.message;
    logError('补发邮件失败', { emailLogId, error: err.message });
  }

  // 更新邮件日志状态
  await pool.query(`
    UPDATE ${WAREHOUSE_RETURN_EMAIL_LOGS_TABLE}
    SET status = $1, error_message = $2, sent_at = $3
    WHERE id = $4
  `, [emailStatus, errorMessage, sentAt, emailLogId]);

  return {
    success: emailStatus === 'success',
    status: emailStatus,
    errorMessage
  };
};

/**
 * 获取 Building 列表（仅启用状态）
 */
export const getBuildingList = async () => {
  const result = await pool.query(`
    SELECT building_code, building_name
    FROM ${WAREHOUSE_RETURN_BUILDING_CONFIG_TABLE}
    WHERE is_active = true
    ORDER BY sort_order, building_code
  `);

  return result.rows.map(row => ({
    code: row.building_code,
    name: row.building_name
  }));
};

/**
 * 获取所有 Building 列表（包括未启用的）
 */
export const getAllBuildingsFromDb = async () => {
  const result = await pool.query(`
    SELECT id, building_code, building_name, is_active, sort_order
    FROM ${WAREHOUSE_RETURN_BUILDING_CONFIG_TABLE}
    ORDER BY sort_order, building_code
  `);

  return result.rows.map(row => ({
    id: row.id,
    code: row.building_code,
    name: row.building_name,
    isActive: row.is_active,
    sortOrder: row.sort_order
  }));
};

/**
 * 保存 Building 配置
 */
export const saveBuildingConfigToDb = async (buildings) => {
  // 先标记所有为非活跃
  await pool.query(`
    UPDATE ${WAREHOUSE_RETURN_BUILDING_CONFIG_TABLE}
    SET is_active = false
  `);

  // 更新或插入配置
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.code && b.name) {
      await pool.query(`
        INSERT INTO ${WAREHOUSE_RETURN_BUILDING_CONFIG_TABLE} (building_code, building_name, is_active, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (building_code) DO UPDATE SET
          building_name = $2,
          is_active = $3,
          sort_order = $4
      `, [b.code, b.name, b.isActive !== false, i]);
    }
  }

  return true;
};

/**
 * 获取统计数据
 */
export const getStats = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(CASE WHEN status = 'pending_receiving' THEN 1 END) as pending_receiving,
      COUNT(CASE WHEN status = 'received' THEN 1 END) as received,
      COUNT(CASE WHEN status IN ('reconciled_full_match', 'reconciled_partial_return', 'reconciled_diff', 'partial_close') THEN 1 END) as processing,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
      COUNT(*) as total
    FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
  `);

  return {
    pendingReceiving: parseInt(result.rows[0].pending_receiving) || 0,
    received: parseInt(result.rows[0].received) || 0,
    processing: parseInt(result.rows[0].processing) || 0,
    closed: parseInt(result.rows[0].closed) || 0,
    total: parseInt(result.rows[0].total) || 0
  };
};

export default {
  ReturnStatus,
  MatchStatus,
  generateReturnNo,
  reconcileItems,
  saveReconciliationLog,
  getReconciliationLogs,
  getSubmitterEmail,
  getEmailCcConfig,
  sendReturnEmail,
  resendEmail,
  getBuildingList,
  getStats
};
