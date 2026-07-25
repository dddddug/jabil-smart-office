/**
 * PNC转仓单据控制器
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logError } from '../utils/logger.js';

// 单据表名
const DOCUMENT_TABLE = 'jso_pnc_transfer_document';
const ITEM_TABLE = 'jso_pnc_transfer_document_item';
const CONFIG_TABLE = 'jso_pnc_transfer_config';

// 单据状态枚举
const DocumentStatus = {
  CREATED: 'created',   // 已创建
  SENT: 'sent'          // 已发送
};

/**
 * 生成转仓单号
 * 格式：YYYYMMDD-序号（如：20240723-001）
 */
const generateTransferNo = async () => {
  const today = dayjs().format('YYYYMMDD');

  // 查询当天最大的序号
  const result = await pool.query(`
    SELECT transfer_no FROM ${DOCUMENT_TABLE}
    WHERE transfer_no LIKE $1
    ORDER BY transfer_no DESC
    LIMIT 1
  `, [`${today}-%`]);

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNo = result.rows[0].transfer_no;
    const lastSequence = parseInt(lastNo.split('-')[1], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${today}-${String(sequence).padStart(3, '0')}`;
};

/**
 * 将数据库行转换为文档对象
 */
const rowToDocument = (row, items = []) => ({
  id: row.id,
  transferNo: row.transfer_no,
  configId: row.config_id,
  configName: row.config_name,
  recipientEmail: row.recipient_email,
  ccEmail: row.cc_email,
  contactPhone: row.contact_phone,
  recipientName: row.recipient_name,
  receivingAddress: row.receiving_address,
  systemLocation: row.system_location,
  departmentId: row.department_id,
  departmentName: row.department_name,
  creatorName: row.creator_name,
  status: row.status,
  emailSentAt: row.email_sent_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  printCount: row.print_count || 0,
  items: items.map(item => ({
    id: item.id,
    sequenceNo: item.sequence_no,
    batch: item.batch,
    partNumber: item.part_number,
    grn: item.grn,
    quantity: parseFloat(item.quantity)
  }))
});

/**
 * 获取单据列表
 */
export const getDocuments = async (req, res, next) => {
  try {
    const {
      transferNo,
      configName,
      status,
      startDate,
      endDate,
      creatorName,
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const params = [];
    let whereClause = 'WHERE 1=1';

    // 动态构建查询条件
    if (transferNo) {
      params.push(`%${transferNo}%`);
      whereClause += ` AND d.transfer_no LIKE $${params.length}`;
    }

    if (configName) {
      params.push(`%${configName}%`);
      whereClause += ` AND d.config_name LIKE $${params.length}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND d.status = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND DATE(d.created_at) >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND DATE(d.created_at) <= $${params.length}`;
    }

    if (creatorName) {
      params.push(`%${creatorName}%`);
      whereClause += ` AND d.creator_name LIKE $${params.length}`;
    }

    // 查询列表（使用 JOIN 一次性获取所有数据）
    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        d.id,
        d.transfer_no,
        d.config_id,
        d.config_name,
        d.recipient_email,
        d.cc_email,
        d.contact_phone,
        d.recipient_name,
        d.receiving_address,
        d.system_location,
        d.department_id,
        d.department_name,
        d.creator_name,
        d.status,
        d.email_sent_at,
        d.created_at,
        d.updated_at,
        d.print_count,
        i.id as item_id,
        i.sequence_no,
        i.batch,
        i.part_number,
        i.grn,
        i.quantity
      FROM ${DOCUMENT_TABLE} d
      LEFT JOIN ${ITEM_TABLE} i ON d.id = i.document_id
      ${whereClause}
      ORDER BY d.created_at DESC
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT d.id) as total FROM ${DOCUMENT_TABLE} d ${whereClause}
    `, params);

    // 按单据分组，聚合明细项
    const documentMap = new Map();
    for (const row of listResult.rows) {
      if (!documentMap.has(row.id)) {
        documentMap.set(row.id, {
          id: row.id,
          transfer_no: row.transfer_no,
          config_id: row.config_id,
          config_name: row.config_name,
          recipient_email: row.recipient_email,
          cc_email: row.cc_email,
          contact_phone: row.contact_phone,
          recipient_name: row.recipient_name,
          receiving_address: row.receiving_address,
          system_location: row.system_location,
          department_id: row.department_id,
          department_name: row.department_name,
          creator_name: row.creator_name,
          status: row.status,
          email_sent_at: row.email_sent_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          print_count: row.print_count || 0,
          items: []
        });
      }
      // 添加明细项
      if (row.item_id) {
        documentMap.get(row.id).items.push({
          id: row.item_id,
          sequence_no: row.sequence_no,
          batch: row.batch,
          part_number: row.part_number,
          grn: row.grn,
          quantity: row.quantity
        });
      }
    }

    // 转换为响应格式并分页
    const allDocuments = Array.from(documentMap.values()).map(row =>
      rowToDocument(row, row.items)
    );

    // 应用分页
    const paginatedDocuments = allDocuments.slice(0, parseInt(pageSize));

    paginated(res, {
      items: paginatedDocuments,
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
      SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const row = result.rows[0];

    // 查询明细项
    const itemsResult = await pool.query(`
      SELECT id, sequence_no, batch, part_number, grn, quantity
      FROM ${ITEM_TABLE}
      WHERE document_id = $1
      ORDER BY sequence_no
    `, [id]);

    success(res, rowToDocument(row, itemsResult.rows), '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 创建单据
 */
export const createDocument = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { configId, departmentId, departmentName, items, creatorName } = req.body;

    // 验证必填字段
    if (!configId) {
      throw BadRequestError('请选择配置');
    }

    if (!creatorName) {
      throw BadRequestError('创建人不能为空');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw BadRequestError('请添加至少一项明细');
    }

    await client.query('BEGIN');

    // 获取配置信息
    const configResult = await client.query(`
      SELECT id, config_name, recipient_email, cc_email, contact_phone,
             recipient_name, receiving_address, system_location
      FROM ${CONFIG_TABLE}
      WHERE id = $1 AND is_active = TRUE
    `, [configId]);

    if (configResult.rows.length === 0) {
      throw BadRequestError('配置不存在或未启用');
    }

    const config = configResult.rows[0];

    // 生成转仓单号
    const transferNo = await generateTransferNo();

    // 创建单据
    const docResult = await client.query(`
      INSERT INTO ${DOCUMENT_TABLE} (
        transfer_no, config_id, config_name, recipient_email, cc_email,
        contact_phone, recipient_name, receiving_address, system_location,
        department_id, department_name,
        creator_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      transferNo,
      config.id,
      config.config_name,
      config.recipient_email,
      config.cc_email,
      config.contact_phone,
      config.recipient_name,
      config.receiving_address,
      config.system_location,
      departmentId || null,
      departmentName || null,
      creatorName,
      DocumentStatus.CREATED
    ]);

    const document = docResult.rows[0];

    // 创建明细项
    const insertedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.partNumber) {
        throw BadRequestError(`第 ${i + 1} 项的P/N不能为空`);
      }

      if (!item.quantity || item.quantity <= 0) {
        throw BadRequestError(`第 ${i + 1} 项的数量必须大于0`);
      }

      const itemResult = await client.query(`
        INSERT INTO ${ITEM_TABLE} (document_id, sequence_no, batch, part_number, grn, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        document.id,
        i + 1,
        item.batch || null,
        item.partNumber,
        item.grn || null,
        item.quantity
      ]);

      insertedItems.push({
        id: itemResult.rows[0].id,
        sequenceNo: itemResult.rows[0].sequence_no,
        batch: itemResult.rows[0].batch,
        partNumber: itemResult.rows[0].part_number,
        grn: itemResult.rows[0].grn,
        quantity: parseFloat(itemResult.rows[0].quantity)
      });
    }

    await client.query('COMMIT');

    logInfo('PNC转仓单据创建成功', { transferNo, creatorName });

    success(res, {
      id: document.id,
      transferNo: document.transfer_no,
      configId: document.config_id,
      configName: document.config_name,
      recipientEmail: document.recipient_email,
      ccEmail: document.cc_email,
      contactPhone: document.contact_phone,
      recipientName: document.recipient_name,
      receivingAddress: document.receiving_address,
      systemLocation: document.system_location,
      departmentId: document.department_id,
      departmentName: document.department_name,
      creatorName: document.creator_name,
      status: document.status,
      createdAt: document.created_at,
      items: insertedItems
    }, '单据创建成功');

  } catch (err) {
    await client.query('ROLLBACK');
    logError('创建PNC转仓单据失败', { error: err.message });
    next(err);
  } finally {
    client.release();
  }
};

/**
 * 更新单据（仅允许更新未发送的单据）
 */
export const updateDocument = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { items } = req.body;

    // 检查单据是否存在且状态为已创建
    const existingDoc = await client.query(
      `SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== DocumentStatus.CREATED) {
      throw BadRequestError('只能修改已创建的单据');
    }

    await client.query('BEGIN');

    // 删除旧的明细项
    await client.query(`DELETE FROM ${ITEM_TABLE} WHERE document_id = $1`, [id]);

    // 重新插入明细项
    const insertedItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item.partNumber) {
          throw BadRequestError(`第 ${i + 1} 项的P/N不能为空`);
        }

        if (!item.quantity || item.quantity <= 0) {
          throw BadRequestError(`第 ${i + 1} 项的数量必须大于0`);
        }

        const itemResult = await client.query(`
          INSERT INTO ${ITEM_TABLE} (document_id, sequence_no, batch, part_number, grn, quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          id,
          i + 1,
          item.batch || null,
          item.partNumber,
          item.grn || null,
          item.quantity
        ]);

        insertedItems.push({
          id: itemResult.rows[0].id,
          sequenceNo: itemResult.rows[0].sequence_no,
          batch: itemResult.rows[0].batch,
          partNumber: itemResult.rows[0].part_number,
          grn: itemResult.rows[0].grn,
          quantity: parseFloat(itemResult.rows[0].quantity)
        });
      }
    }

    await client.query('COMMIT');

    // 重新查询完整单据
    const updatedDoc = await getDocumentFull(id);

    logInfo('PNC转仓单据更新成功', { id, transferNo: existingDoc.rows[0].transfer_no });
    success(res, updatedDoc, '单据更新成功');

  } catch (err) {
    await client.query('ROLLBACK');
    logError('更新PNC转仓单据失败', { error: err.message });
    next(err);
  } finally {
    client.release();
  }
};

/**
 * 发送邮件通知
 */
export const sendEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查单据是否存在
    const existingDoc = await pool.query(
      `SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = existingDoc.rows[0];

    if (doc.status === DocumentStatus.SENT) {
      throw BadRequestError('该单据已发送过邮件');
    }

    if (!doc.recipient_email) {
      throw BadRequestError('收件人邮箱为空，请在配置中设置');
    }

    // 查询明细项
    const itemsResult = await pool.query(`
      SELECT sequence_no, batch, part_number, grn, quantity
      FROM ${ITEM_TABLE}
      WHERE document_id = $1
      ORDER BY sequence_no
    `, [id]);

    // 构建邮件内容
    const subject = `PNC转仓单 - ${doc.transfer_no}`;

    let emailBody = `PNC转仓单详情\n`;
    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `转仓单号：${doc.transfer_no}\n`;
    emailBody += `转仓部门：${doc.department_name || '-'}\n`;
    emailBody += `接收人：${doc.recipient_name || '-'}\n`;
    emailBody += `联系电话：${doc.contact_phone || '-'}\n`;
    emailBody += `接收地址：${doc.receiving_address || '-'}\n`;
    emailBody += `系统位置：${doc.system_location || '-'}\n`;
    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `明细列表：\n`;
    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `序号\tBatch\t\tP/N\t\tGRN\t\t数量\n`;
    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    itemsResult.rows.forEach(item => {
      emailBody += `${item.sequence_no}\t${item.batch || '-'}\t${item.part_number}\t${item.grn || '-'}\t${item.quantity}\n`;
    });

    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `创建人：${doc.creator_name}\n`;
    emailBody += `创建时间：${dayjs(doc.created_at).format('YYYY-MM-DD HH:mm:ss')}\n`;

    // 使用 mailto: 方式打开邮件客户端
    // 前端会处理实际的邮件发送
    const mailtoLink = buildMailtoLink(doc, itemsResult.rows);

    logInfo('PNC转仓单邮件准备发送', {
      id,
      transferNo: doc.transfer_no,
      recipientEmail: doc.recipient_email,
      ccEmail: doc.cc_email
    });

    // 更新状态为已发送
    await pool.query(`
      UPDATE ${DOCUMENT_TABLE}
      SET status = $1, email_sent_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [DocumentStatus.SENT, id]);

    success(res, {
      id: doc.id,
      transferNo: doc.transfer_no,
      status: DocumentStatus.SENT,
      emailSentAt: new Date(),
      mailtoLink,
      emailBody,
      subject
    }, '邮件已发送');

  } catch (err) {
    logError('发送PNC转仓单邮件失败', { error: err.message });
    next(err);
  }
};

/**
 * 构建 mailto 链接
 */
const buildMailtoLink = (doc, items) => {
  const to = doc.recipient_email;
  const cc = doc.cc_email;

  let subject = encodeURIComponent(`PNC转仓单 - ${doc.transfer_no}`);

  let body = `PNC转仓单详情\n`;
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `转仓单号：${doc.transfer_no}\n`;
  body += `转仓部门：${doc.department_name || '-'}\n`;
  body += `接收人：${doc.recipient_name || '-'}\n`;
  body += `联系电话：${doc.contact_phone || '-'}\n`;
  body += `接收地址：${doc.receiving_address || '-'}\n`;
  body += `系统位置：${doc.system_location || '-'}\n`;
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `明细列表：\n`;
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `序号\tBatch\t\tP/N\t\tGRN\t\t数量\n`;
  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  items.forEach(item => {
    body += `${item.sequence_no}\t${item.batch || '-'}\t${item.part_number}\t${item.grn || '-'}\t${item.quantity}\n`;
  });

  body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  body += `创建人：${doc.creator_name}\n`;
  body += `创建时间：${dayjs(doc.created_at).format('YYYY-MM-DD HH:mm:ss')}\n`;

  body = encodeURIComponent(body);

  let mailto = `mailto:${to}?subject=${subject}&body=${body}`;
  if (cc) {
    mailto += `&cc=${encodeURIComponent(cc)}`;
  }

  return mailto;
};

/**
 * 删除单据（仅允许删除未发送的单据）
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingDoc = await pool.query(
      `SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status === DocumentStatus.SENT) {
      throw BadRequestError('已发送的单据不能删除');
    }

    // 删除单据（明细项通过外键级联删除）
    await pool.query(`DELETE FROM ${DOCUMENT_TABLE} WHERE id = $1`, [id]);

    logInfo('PNC转仓单据删除成功', { id, transferNo: existingDoc.rows[0].transfer_no });
    success(res, null, '删除成功');

  } catch (err) {
    logError('删除PNC转仓单据失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取单据统计数据
 */
export const getStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'created' THEN 1 END) as created,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(*) as total
      FROM ${DOCUMENT_TABLE}
    `);

    const stats = {
      created: parseInt(result.rows[0].created) || 0,
      sent: parseInt(result.rows[0].sent) || 0,
      total: parseInt(result.rows[0].total) || 0
    };

    success(res, stats, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 辅助函数：获取完整的单据信息
 */
const getDocumentFull = async (id) => {
  const docResult = await pool.query(`
    SELECT * FROM ${DOCUMENT_TABLE} WHERE id = $1
  `, [id]);

  if (docResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await pool.query(`
    SELECT id, sequence_no, batch, part_number, grn, quantity
    FROM ${ITEM_TABLE}
    WHERE document_id = $1
    ORDER BY sequence_no
  `, [id]);

  return rowToDocument(docResult.rows[0], itemsResult.rows);
};

/**
 * 记录打印次数
 */
export const recordPrint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, username } = req.user || {};
    const { ip, get: { 'user-agent': userAgent } } = req;

    // 使用事务确保数据一致性
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 更新打印次数
      const updateResult = await client.query(`
        UPDATE ${DOCUMENT_TABLE}
        SET print_count = COALESCE(print_count, 0) + 1
        WHERE id = $1
        RETURNING print_count
      `, [id]);

      if (updateResult.rows.length === 0) {
        throw new BadRequestError('单据不存在');
      }

      // 记录打印日志
      await client.query(`
        INSERT INTO jso_pnc_transfer_print_log (document_id, printed_by, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
      `, [id, username || userId, ip, userAgent]);

      await client.query('COMMIT');

      logInfo('打印记录已保存', { documentId: id, printCount: updateResult.rows[0].print_count });
      success(res, { printCount: updateResult.rows[0].print_count }, '打印记录已保存');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

export default {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  sendEmail,
  deleteDocument,
  getStats,
  recordPrint
};
