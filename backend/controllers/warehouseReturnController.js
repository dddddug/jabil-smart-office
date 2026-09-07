/**
 * 回仓申请控制器
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import {
  WAREHOUSE_RETURN_REQUEST_TABLE,
  WAREHOUSE_RETURN_ITEMS_TABLE,
  WAREHOUSE_RETURN_CONFIG_TABLE,
  USER_TABLE
} from '../config/db_constants.js';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logError, logDebug } from '../utils/logger.js';
import { uploadsDir } from '../utils/fileUtils.js';
import {
  ReturnStatus,
  MatchStatus,
  generateReturnNo,
  reconcileItems,
  saveReconciliationLog,
  getReconciliationLogs,
  sendReturnEmail,
  resendEmail,
  getBuildingList,
  getAllBuildingsFromDb,
  saveBuildingConfigToDb,
  getStats,
  getEmailCcConfig
} from '../services/warehouseReturnService.js';

/**
 * 获取单据列表
 */
export const getDocuments = async (req, res, next) => {
  try {
    const {
      returnNo,
      status,
      startDate,
      endDate,
      submitterName,
      bayNo,
      receiveBuilding,
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (returnNo) {
      params.push(`%${returnNo}%`);
      whereClause += ` AND return_no LIKE $${params.length}`;
    }

    if (status) {
      const statusList = status.split(',');
      params.push(statusList);
      whereClause += ` AND status = ANY($${params.length})`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND DATE(created_at) >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND DATE(created_at) <= $${params.length}`;
    }

    if (submitterName) {
      params.push(`%${submitterName}%`);
      whereClause += ` AND (submitter_name LIKE $${params.length} OR submitter_account LIKE $${params.length})`;
    }

    if (bayNo) {
      params.push(`%${bayNo}%`);
      whereClause += ` AND bay_no LIKE $${params.length}`;
    }

    if (receiveBuilding) {
      params.push(`%${receiveBuilding}%`);
      whereClause += ` AND receive_building LIKE $${params.length}`;
    }

    // 根据用户角色过滤数据范围（管理员角色可查看所有记录）
    const user = req.user;
    const adminRoles = ['super_admin', 'plant_admin', 'dept_admin'];
    if (user.role_id && !adminRoles.includes(user.role_id)) {
      // 普通用户只看本人提交的单据
      params.push(user.id);
      whereClause += ` AND submitter_id = $${params.length}`;
    }

    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        id,
        return_no,
        bay_no,
        receive_building,
        status,
        pending_count,
        submitter_id,
        submitter_name,
        submitter_account,
        received_by,
        received_at,
        closed_at,
        created_at,
        updated_at
      FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} ${whereClause}
    `, params);

    const documents = listResult.rows.map(row => ({
      id: row.id,
      returnNo: row.return_no,
      bayNo: row.bay_no,
      receiveBuilding: row.receive_building,
      status: row.status,
      pendingCount: row.pending_count,
      submitterId: row.submitter_id,
      submitterName: row.submitter_name,
      submitterAccount: row.submitter_account,
      receivedBy: row.received_by,
      receivedAt: row.received_at,
      closedAt: row.closed_at,
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
        return_no,
        bay_no,
        receive_building,
        status,
        pending_count,
        submitter_id,
        submitter_name,
        submitter_account,
        received_by,
        received_at,
        closed_at,
        created_at,
        updated_at
      FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const row = result.rows[0];

    // 查询物料明细
    const itemsResult = await pool.query(`
      SELECT
        id,
        request_id,
        grn,
        material,
        qty,
        bay_no,
        to_sloc,
        type,
        trans,
        rf_ind,
        match_status,
        sap_item_id,
        return_reason,
        returned_at,
        closed_at,
        created_at
      FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1
      ORDER BY id
    `, [id]);

    const document = {
      id: row.id,
      returnNo: row.return_no,
      bayNo: row.bay_no,
      receiveBuilding: row.receive_building,
      status: row.status,
      pendingCount: row.pending_count,
      submitterId: row.submitter_id,
      submitterName: row.submitter_name,
      submitterAccount: row.submitter_account,
      receivedBy: row.received_by,
      receivedAt: row.received_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        requestId: item.request_id,
        grn: item.grn,
        material: item.material,
        qty: parseFloat(item.qty),
        bayNo: item.bay_no,
        toSloc: item.to_sloc,
        type: item.type,
        trans: item.trans,
        rfInd: item.rf_ind,
        matchStatus: item.match_status,
        sapItemId: item.sap_item_id,
        returnReason: item.return_reason,
        returnedAt: item.returned_at,
        closedAt: item.closed_at,
        createdAt: item.created_at
      }))
    };

    success(res, document, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 创建回仓申请（仅保存，状态为草稿）
 */
export const createDocument = async (req, res, next) => {
  try {
    const { bayNo, receiveBuilding, items } = req.body;
    const user = req.user || {};

    // 验证必填字段
    if (!bayNo) {
      throw BadRequestError('请填写 Bay 号');
    }

    if (!receiveBuilding) {
      throw BadRequestError('请选择接收 Building');
    }

    if (!items || items.length === 0) {
      throw BadRequestError('请导入物料清单');
    }

    // 验证物料清单
    for (const item of items) {
      if (!item.material) {
        throw BadRequestError('物料号不能为空');
      }
      if (!item.qty || parseFloat(item.qty) <= 0) {
        throw BadRequestError('物料数量必须大于 0');
      }
      if (!item.bayNo) {
        throw BadRequestError('物料 Bay 号不能为空');
      }
    }

    // 生成回仓单号
    const returnNo = await generateReturnNo();

    // 获取用户名称，添加兜底值防止 NULL
    const submitterName = user.realName || user.name || user.username || user.account || `User_${user.id}`;
    const submitterAccount = user.username || user.account || `user_${user.id}`;

    // 创建主表记录
    const docResult = await pool.query(`
      INSERT INTO ${WAREHOUSE_RETURN_REQUEST_TABLE} (
        return_no, bay_no, receive_building, status,
        submitter_id, submitter_name, submitter_account
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      returnNo,
      bayNo,
      receiveBuilding,
      ReturnStatus.PENDING_RECEIVING,
      user.id,
      submitterName,
      submitterAccount
    ]);

    const requestId = docResult.rows[0].id;

    // 创建物料明细
    for (const item of items) {
      await pool.query(`
        INSERT INTO ${WAREHOUSE_RETURN_ITEMS_TABLE} (
          request_id, grn, material, qty, bay_no
        ) VALUES ($1, $2, $3, $4, $5)
      `, [requestId, item.grn || null, item.material, item.qty, item.bayNo]);
    }

    logInfo('回仓申请创建成功', { returnNo, bayNo, submitter: user.username });

    success(res, {
      id: requestId,
      returnNo,
      bayNo,
      receiveBuilding,
      status: ReturnStatus.PENDING_RECEIVING,
      itemsCount: items.length
    }, '回仓申请创建成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 更新回仓申请（退回后重新提交）
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bayNo, receiveBuilding, items } = req.body;

    // 检查单据是否存在且状态为已退回
    const existingDoc = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = existingDoc.rows[0];

    // 只有退回状态的单据才能修改
    if (doc.status !== ReturnStatus.RECONCILED_PARTIAL_RETURN) {
      throw BadRequestError('当前状态不允许修改');
    }

    // 验证物料清单
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.material) {
          throw BadRequestError('物料号不能为空');
        }
        if (!item.qty || parseFloat(item.qty) <= 0) {
          throw BadRequestError('物料数量必须大于 0');
        }
      }
    }

    // 更新主表
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (bayNo) {
      updateFields.push(`bay_no = $${paramIndex++}`);
      updateValues.push(bayNo);
    }

    if (receiveBuilding) {
      updateFields.push(`receive_building = $${paramIndex++}`);
      updateValues.push(receiveBuilding);
    }

    // 重置状态为待接收
    updateFields.push(`status = $${paramIndex++}`);
    updateValues.push(ReturnStatus.PENDING_RECEIVING);

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues);

    // 更新物料明细
    if (items && items.length > 0) {
      // 删除原有明细
      await pool.query(`DELETE FROM ${WAREHOUSE_RETURN_ITEMS_TABLE} WHERE request_id = $1`, [id]);

      // 重新插入
      for (const item of items) {
        await pool.query(`
          INSERT INTO ${WAREHOUSE_RETURN_ITEMS_TABLE} (
            request_id, material, qty, bay_no
          ) VALUES ($1, $2, $3, $4)
        `, [id, item.material, item.qty, item.bayNo || bayNo]);
      }
    }

    logInfo('回仓申请更新成功', { id, returnNo: doc.return_no });

    success(res, {
      id: parseInt(id),
      returnNo: doc.return_no,
      status: ReturnStatus.PENDING_RECEIVING
    }, '更新成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 接收单据
 */
export const receiveDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const existingDoc = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    if (existingDoc.rows[0].status !== ReturnStatus.PENDING_RECEIVING) {
      throw BadRequestError('只能接收待接收的单据');
    }

    const result = await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
      SET status = $1, received_by = $2, received_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING id, return_no, status, received_at
    `, [ReturnStatus.RECEIVED, user.realName || user.name, id]);

    const doc = result.rows[0];

    // 加载物料明细
    const itemsResult = await pool.query(`
      SELECT
        id, request_id, material, qty, bay_no,
        to_sloc, type, trans, rf_ind, match_status
      FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1
      ORDER BY id
    `, [id]);

    logInfo('回仓申请已接收', { id, returnNo: doc.return_no, receivedBy: user.username });

    success(res, {
      id: doc.id,
      returnNo: doc.return_no,
      status: doc.status,
      receivedAt: doc.received_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        material: item.material,
        qty: parseFloat(item.qty),
        bayNo: item.bay_no,
        toSloc: item.to_sloc,
        type: item.type,
        trans: item.trans,
        rfInd: item.rf_ind,
        matchStatus: item.match_status
      }))
    }, '单据已接收');

  } catch (err) {
    next(err);
  }
};

/**
 * 执行对账
 */
export const reconcileDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    logInfo('开始对账', { id, userId: user?.id, userAccount: user?.account });

    // 获取单据和物料明细
    const docResult = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (docResult.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = docResult.rows[0];

    // 允许对 received 或 reconciled_diff 状态的单据进行对账
    if (doc.status !== ReturnStatus.RECEIVED && doc.status !== 'reconciled_diff') {
      throw BadRequestError('只能对已接收或对账差异状态的单据进行对账');
    }

    // 获取物料明细（只处理 pending 状态的物料）
    const itemsResult = await pool.query(`
      SELECT id, grn, material, qty, bay_no FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1 AND match_status = 'pending'
    `, [id]);

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      grn: item.grn,
      material: item.material,
      qty: parseFloat(item.qty),
      bay_no: item.bay_no
    }));

    logInfo('物料明细查询结果', { itemCount: items.length, items: items.slice(0, 3) });

    if (items.length === 0) {
      throw BadRequestError('没有待匹配的物料明细');
    }

    // 获取仓库-用户映射配置（按 warehouse 分组）
    const configResult = await pool.query(`
      SELECT warehouse, username FROM ${WAREHOUSE_RETURN_CONFIG_TABLE}
      WHERE is_active = true
      ORDER BY warehouse, username
    `);

    logInfo('仓库配置查询结果', { configCount: configResult.rows.length, config: configResult.rows });

    // 获取单据的接收时间（用于日期筛选），转为中国时区日期
    let receiveDate = null;
    if (doc.received_at) {
      const date = new Date(doc.received_at);
      // 转换为中国时区 (UTC+8)
      date.setHours(date.getHours() + 8);
      receiveDate = date.toISOString().split('T')[0];
    }

    // 获取所有唯一的 warehouse 列表
    const warehouses = [...new Set(configResult.rows.map(r => r.warehouse))];

    // 执行对账匹配
    // 已匹配的物料 ID 集合（用于去重）
    const matchedItemIds = new Set();
    // 已匹配的 SAP 记录 ID 集合
    const matchedSapIds = new Set();
    const allMatchedItems = [];
    const allSapOnlyItems = [];
    let reconcileResult;

    if (configResult.rows.length > 0 && warehouses.length > 0) {
      // 遍历每个 warehouse 查询 SAP 数据
      for (const warehouse of warehouses) {
        // 获取该 warehouse 下的所有 username
        const usernames = configResult.rows
          .filter(r => r.warehouse === warehouse)
          .map(r => r.username);

        // 只传入未匹配的物料
        const pendingItems = items.filter(item => !matchedItemIds.has(item.id));

        if (pendingItems.length === 0) break; // 所有物料都已匹配

        const tempResult = await reconcileItems(id, pendingItems, {
          warehouse: warehouse,
          usernames: usernames,
          receiveDate: receiveDate
        });

        // 收集匹配成功的物料
        logInfo('对账匹配结果', {
          warehouse,
          usernames,
          receiveDate,
          tempMatched: tempResult.matchedItems.length,
          tempListOnly: tempResult.listOnlyItems.length,
          tempSapOnly: tempResult.sapOnlyItems.length
        });

        for (const item of tempResult.matchedItems) {
          if (!matchedItemIds.has(item.id)) {
            matchedItemIds.add(item.id);
            matchedSapIds.add(item.sap_item_id);
            allMatchedItems.push(item);
            logInfo('匹配成功', { itemId: item.id, material: item.material, sapId: item.sap_item_id });
          }
        }

        // 收集 SAP 独有的物料
        for (const sapItem of tempResult.sapOnlyItems) {
          if (!matchedSapIds.has(sapItem.sap_item_id)) {
            matchedSapIds.add(sapItem.sap_item_id);
            allSapOnlyItems.push(sapItem);
          }
        }
      }

      // 计算未匹配的物料
      const listOnlyItems = items.filter(item => !matchedItemIds.has(item.id));

      reconcileResult = {
        matchedItems: allMatchedItems,
        listOnlyItems: listOnlyItems,
        sapOnlyItems: allSapOnlyItems,
        summary: {
          total: items.length,
          matched: allMatchedItems.length,
          listOnly: listOnlyItems.length,
          sapOnly: allSapOnlyItems.length
        }
      };
    } else {
      // 没有配置时，使用原有逻辑（仅 bay_no 匹配）
      reconcileResult = await reconcileItems(id, items, {
        receiveDate: receiveDate
      });
    }

    // 更新物料明细的匹配状态
    for (const item of reconcileResult.matchedItems) {
      // 移除数量中的逗号格式
      const cleanQty = String(item.sap_quantity).replace(/,/g, '');
      await pool.query(`
        UPDATE ${WAREHOUSE_RETURN_ITEMS_TABLE}
        SET match_status = $1, sap_item_id = $2, to_sloc = $3, type = $4, trans = $5, rf_ind = $6,
            sap_material = $7, sap_quantity = $8, sap_from_sloc = $9
        WHERE id = $10
      `, [
        MatchStatus.MATCHED,
        item.sap_item_id,
        item.to_sloc,
        item.type,
        item.trans,
        item.rf_ind,
        item.sap_material,
        cleanQty,
        item.sap_from_sloc,
        item.id
      ]);
    }

    // 保存对账日志
    const operatorName = user.realName || user.name || user.username || `User_${user.id}`;
    const operatorAccount = user.username || user.account || `user_${user.id}`;
    await saveReconciliationLog(
      id,
      doc.return_no,
      { id: user.id, name: operatorName, account: operatorAccount },
      reconcileResult.matchedItems,
      reconcileResult.listOnlyItems,
      reconcileResult.sapOnlyItems,
      null
    );

    // 更新单据状态
    let newStatus;
    const isAllMatched = reconcileResult.matchedItems.length === items.length && reconcileResult.listOnlyItems.length === 0;

    if (isAllMatched) {
      // 100% 匹配 - 自动完成对账
      newStatus = ReturnStatus.CLOSED;
      await pool.query(`
        UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
        SET status = $1, pending_count = $2, closed_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `, [newStatus, reconcileResult.matchedItems.length, id]);
      logInfo('对账完成-自动完结', { id, returnNo: doc.return_no, matchedCount: reconcileResult.matchedItems.length, operator: user.username });
    } else if (reconcileResult.summary.isFullMatch) {
      // 100% 匹配且无SAP独有项
      newStatus = ReturnStatus.RECONCILED_FULL_MATCH;
      await pool.query(`
        UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
        SET status = $1, pending_count = $2, updated_at = NOW()
        WHERE id = $3
      `, [newStatus, reconcileResult.matchedItems.length + reconcileResult.sapOnlyItems.length, id]);
    } else if (reconcileResult.matchedItems.length > 0) {
      // 部分匹配
      newStatus = ReturnStatus.RECONCILED_PARTIAL_RETURN;
      await pool.query(`
        UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
        SET status = $1, pending_count = $2, updated_at = NOW()
        WHERE id = $3
      `, [newStatus, reconcileResult.matchedItems.length + reconcileResult.sapOnlyItems.length, id]);
    } else {
      // 全部异常
      newStatus = ReturnStatus.RECONCILED_DIFF;
      await pool.query(`
        UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
        SET status = $1, pending_count = $2, updated_at = NOW()
        WHERE id = $3
      `, [newStatus, reconcileResult.matchedItems.length + reconcileResult.sapOnlyItems.length, id]);
    }

    logInfo('对账完成', {
      id,
      returnNo: doc.return_no,
      summary: reconcileResult.summary,
      operator: user.username
    });

    success(res, {
      id: parseInt(id),
      returnNo: doc.return_no,
      status: newStatus,
      ...reconcileResult
    }, '对账完成');

  } catch (err) {
    next(err);
  }
};

/**
 * 退回选中明细
 */
export const returnItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemIds, reason } = req.body;

    if (!itemIds || itemIds.length === 0) {
      throw BadRequestError('请选择要退回的明细');
    }

    if (!reason) {
      throw BadRequestError('请填写退回原因');
    }

    const existingDoc = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = existingDoc.rows[0];

    // 获取要退回的明细
    const itemsResult = await pool.query(`
      SELECT * FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE id = ANY($1) AND request_id = $2
    `, [itemIds, id]);

    if (itemsResult.rows.length === 0) {
      throw new AppError('没有找到要退回的明细');
    }

    // 更新明细状态
    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_ITEMS_TABLE}
      SET match_status = $1, return_reason = $2, returned_at = NOW()
      WHERE id = ANY($3)
    `, [MatchStatus.RETURNED, reason, itemIds]);

    // 发送邮件通知
    const items = itemsResult.rows.map(item => ({
      material: item.material,
      qty: parseFloat(item.qty),
      bayNo: item.bay_no
    }));

    const emailResult = await sendReturnEmail(id, doc.return_no, items, reason, req.user);

    // 更新主表状态
    const pendingCountResult = await pool.query(`
      SELECT COUNT(*) as count FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1 AND match_status NOT IN ('closed', 'returned')
    `, [id]);

    const pendingCount = parseInt(pendingCountResult.rows[0].count);

    let newStatus = doc.status;
    if (pendingCount === 0) {
      newStatus = ReturnStatus.CLOSED;
    } else {
      newStatus = ReturnStatus.RECONCILED_PARTIAL_RETURN;
    }

    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
      SET status = $1, pending_count = $2, updated_at = NOW()
      WHERE id = $3
    `, [newStatus, pendingCount, id]);

    logInfo('物料退回成功', {
      id,
      returnNo: doc.return_no,
      itemIds,
      reason,
      emailStatus: emailResult.status
    });

    success(res, {
      id: parseInt(id),
      returnNo: doc.return_no,
      status: newStatus,
      pendingCount,
      emailStatus: emailResult.status,
      returnedItems: itemIds
    }, '退回成功，邮件已发送');

  } catch (err) {
    next(err);
  }
};

/**
 * 关闭选中明细
 */
export const closeItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || itemIds.length === 0) {
      throw BadRequestError('请选择要关闭的明细');
    }

    const existingDoc = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    // 更新明细状态
    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_ITEMS_TABLE}
      SET match_status = $1, closed_at = NOW()
      WHERE id = ANY($2)
    `, [MatchStatus.CLOSED, itemIds]);

    // 计算剩余待处理数量
    const pendingCountResult = await pool.query(`
      SELECT COUNT(*) as count FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1 AND match_status NOT IN ('closed', 'returned')
    `, [id]);

    const pendingCount = parseInt(pendingCountResult.rows[0].count);

    let newStatus;
    if (pendingCount === 0) {
      newStatus = ReturnStatus.CLOSED;
    } else {
      newStatus = ReturnStatus.PARTIAL_CLOSE;
    }

    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
      SET status = $1, pending_count = $2, closed_at = $3, updated_at = NOW()
      WHERE id = $4
    `, [newStatus, pendingCount, newStatus === ReturnStatus.CLOSED ? new Date() : null, id]);

    logInfo('明细关闭成功', { id, returnNo: existingDoc.rows[0].return_no, itemIds, pendingCount });

    success(res, {
      id: parseInt(id),
      returnNo: existingDoc.rows[0].return_no,
      status: newStatus,
      pendingCount
    }, '关闭成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 确认 SAP 独有项（人工确认后关闭）
 */
export const confirmSapOnly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;

    if (!itemIds || itemIds.length === 0) {
      throw BadRequestError('请选择要确认的明细');
    }

    // 这类操作直接将 SAP 独有项标记为已匹配并关闭
    // 实际数据会存储在临时表或日志中
    // 这里简化处理，直接更新状态

    const existingDoc = await pool.query(
      `SELECT * FROM ${WAREHOUSE_RETURN_REQUEST_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingDoc.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    // 计算剩余待处理数量
    const pendingCountResult = await pool.query(`
      SELECT COUNT(*) as count FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1 AND match_status NOT IN ('closed', 'returned')
    `, [id]);

    const pendingCount = parseInt(pendingCountResult.rows[0].count);

    const newStatus = pendingCount === 0 ? ReturnStatus.CLOSED : ReturnStatus.PARTIAL_CLOSE;

    await pool.query(`
      UPDATE ${WAREHOUSE_RETURN_REQUEST_TABLE}
      SET status = $1, pending_count = $2, closed_at = $3, updated_at = NOW()
      WHERE id = $4
    `, [newStatus, pendingCount, newStatus === ReturnStatus.CLOSED ? new Date() : null, id]);

    logInfo('SAP独有项已确认', { id, returnNo: existingDoc.rows[0].return_no, itemIds });

    success(res, {
      id: parseInt(id),
      returnNo: existingDoc.rows[0].return_no,
      status: newStatus,
      pendingCount
    }, '确认成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取对账日志
 */
export const getDocumentLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const logs = await getReconciliationLogs(id);

    success(res, logs, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 补发邮件
 */
export const resendReturnEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emailLogId } = req.body;

    const result = await resendEmail(emailLogId);

    success(res, result, result.success ? '邮件补发成功' : '邮件补发失败');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取 Building 列表
 */
export const getBuildings = async (req, res, next) => {
  try {
    const buildings = await getBuildingList();
    success(res, buildings, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取所有 Building 配置（包括未启用的）
 */
export const getAllBuildings = async (req, res, next) => {
  try {
    const buildings = await getAllBuildingsFromDb();
    success(res, buildings, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 保存 Building 配置
 */
export const saveBuildingConfig = async (req, res, next) => {
  try {
    const { buildings } = req.body;

    if (!buildings || !Array.isArray(buildings)) {
      throw BadRequestError('配置格式错误');
    }

    await saveBuildingConfigToDb(buildings);

    logInfo('Building配置已保存', { count: buildings.length });

    success(res, null, '保存成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取邮件抄送配置
 */
export const getEmailCcList = async (req, res, next) => {
  try {
    const configs = await getEmailCcConfig();
    success(res, configs, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 保存邮件抄送配置
 */
export const saveEmailCcConfig = async (req, res, next) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      throw BadRequestError('配置格式错误');
    }

    // 清除原有配置
    await pool.query(`DELETE FROM jso_warehouse_return_email_cc_config`);

    // 插入新配置
    for (const config of configs) {
      if (config.email) {
        await pool.query(`
          INSERT INTO jso_warehouse_return_email_cc_config (email, email_type)
          VALUES ($1, $2)
        `, [config.email, config.emailType || 'cc']);
      }
    }

    logInfo('邮件抄送配置已保存', { count: configs.length });

    success(res, null, '保存成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取产线回仓通用配置
 */
export const getWarehouseReturnConfig = async (req, res, next) => {
  try {
    // 返回所有 warehouse-username 映射配置
    const result = await pool.query(`
      SELECT id, warehouse, username, is_active, created_at, updated_at
      FROM ${WAREHOUSE_RETURN_CONFIG_TABLE}
      ORDER BY warehouse, username
    `);

    const config = {
      mappings: result.rows.map(row => ({
        id: row.id,
        warehouse: row.warehouse,
        username: row.username,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };

    success(res, config, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 保存产线回仓通用配置（支持同一warehouse多个username）
 */
export const saveWarehouseReturnConfig = async (req, res, next) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      throw new BadRequestError('mappings 必须是数组');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const mapping of mappings) {
        const { warehouse, username, is_active = true, id } = mapping;

        if (!warehouse || !username) {
          throw new BadRequestError('warehouse 和 username 不能为空');
        }

        if (id) {
          // 更新现有记录
          await client.query(`
            UPDATE ${WAREHOUSE_RETURN_CONFIG_TABLE}
            SET warehouse = $1, username = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [warehouse, username, is_active, id]);
        } else {
          // 插入新记录（使用 UPSERT 防止重复）
          await client.query(`
            INSERT INTO ${WAREHOUSE_RETURN_CONFIG_TABLE} (warehouse, username, is_active)
            VALUES ($1, $2, $3)
            ON CONFLICT (warehouse, username) DO UPDATE SET
              is_active = $3,
              updated_at = CURRENT_TIMESTAMP
          `, [warehouse, username, is_active]);
        }
      }

      await client.query('COMMIT');
      logInfo('产线回仓通用配置已保存', { mappings });
      success(res, null, '保存成功');

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

/**
 * 删除产线回仓配置映射
 */
export const deleteWarehouseReturnConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestError('id 不能为空');
    }

    await pool.query(`
      DELETE FROM ${WAREHOUSE_RETURN_CONFIG_TABLE} WHERE id = $1
    `, [id]);

    logInfo('产线回仓配置已删除', { id });
    success(res, null, '删除成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取统计数据
 */
export const getDocumentStats = async (req, res, next) => {
  try {
    const stats = await getStats();
    success(res, stats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 下载导入模板
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    // 返回模板信息，前端自行生成 Excel
    const template = {
      columns: [
        { key: 'Material', label: '物料号', required: true },
        { key: 'Qty', label: '数量', required: true },
        { key: 'BayNo', label: 'Bay号', required: true }
      ],
      note: '备注：1. Material、Qty、Bay号三列为必填；2. Qty不能为0或负数；3. 允许相同物料+数量的重复记录'
    };

    success(res, template, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 打印预览 - 回仓申请单
 */
export const previewApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 获取单据详情
    const docResult = await pool.query(`
      SELECT
        id, return_no, bay_no, receive_building, status,
        submitter_name, submitter_account,
        received_by, received_at,
        created_at
      FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
      WHERE id = $1
    `, [id]);

    if (docResult.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = docResult.rows[0];

    // 获取物料明细
    const itemsResult = await pool.query(`
      SELECT material, qty, bay_no, to_sloc, type
      FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1
      ORDER BY id
    `, [id]);

    const items = itemsResult.rows.map((item, idx) => ({
      index: idx + 1,
      material: item.material,
      qty: parseFloat(item.qty),
      bayNo: item.bay_no,
      toSloc: item.to_sloc || '-',
      type: item.type || '-'
    }));

    // 生成 HTML 打印内容
    const htmlContent = generateApplicationPrintHTML({
      returnNo: doc.return_no,
      bayNo: doc.bay_no,
      receiveBuilding: doc.receive_building,
      submitterName: doc.submitter_name,
      submitterAccount: doc.submitter_account,
      createdAt: doc.created_at,
      items
    });

    // 保存为 HTML 文件
    const fileName = `warehouse_return_application_${id}_${Date.now()}.html`;
    const filePath = path.join(uploadsDir, fileName);

    // 确保目录存在
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, htmlContent, 'utf8');

    res.json({
      code: 200,
      message: '预览生成成功',
      data: {
        fileName,
        url: `/uploads/${fileName}`
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * 打印预览 - 转仓单
 */
export const previewTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.query; // 可选，指定要打印的物料

    // 获取单据详情
    const docResult = await pool.query(`
      SELECT
        id, return_no, bay_no, receive_building, status,
        submitter_name, submitter_account,
        received_by, received_at,
        created_at
      FROM ${WAREHOUSE_RETURN_REQUEST_TABLE}
      WHERE id = $1
    `, [id]);

    if (docResult.rows.length === 0) {
      throw new AppError('单据不存在', 404);
    }

    const doc = docResult.rows[0];

    // 获取物料明细（仅匹配成功和关闭的）
    let itemsQuery = `
      SELECT material, qty, bay_no, to_sloc, type
      FROM ${WAREHOUSE_RETURN_ITEMS_TABLE}
      WHERE request_id = $1 AND match_status IN ('matched', 'closed')
    `;
    const params = [id];

    if (itemIds) {
      const ids = itemIds.split(',').map(id => parseInt(id.trim()));
      itemsQuery += ` AND id = ANY($2)`;
      params.push(ids);
    }

    itemsQuery += ` ORDER BY id`;

    const itemsResult = await pool.query(itemsQuery, params);

    const items = itemsResult.rows.map((item, idx) => ({
      index: idx + 1,
      material: item.material,
      qty: parseFloat(item.qty),
      bayNo: item.bay_no,
      toSloc: item.to_sloc || '-',
      type: item.type || '-'
    }));

    // 生成 HTML 打印内容
    const htmlContent = generateTransferPrintHTML({
      returnNo: doc.return_no,
      bayNo: doc.bay_no,
      building: doc.receive_building,
      receivedBy: doc.received_by || '-',
      receivedAt: doc.received_at,
      submitterName: doc.submitter_name,
      items
    });

    // 保存为 HTML 文件
    const fileName = `warehouse_return_transfer_${id}_${Date.now()}.html`;
    const filePath = path.join(uploadsDir, fileName);

    // 确保目录存在
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, htmlContent, 'utf8');

    res.json({
      code: 200,
      message: '预览生成成功',
      data: {
        fileName,
        url: `/uploads/${fileName}`
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * 生成回仓申请单打印 HTML
 */
const generateApplicationPrintHTML = (data) => {
  const itemsRows = data.items.map(item => `
    <tr>
      <td>${item.index}</td>
      <td>${item.material}</td>
      <td>${item.qty}</td>
      <td>${item.bayNo}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>回仓申请单 - ${data.returnNo}</title>
  <style>
    body { font-family: 'SimSun', '宋体', Arial, sans-serif; margin: 40px; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 8px; border: 1px solid #333; }
    .info-table .label { font-weight: bold; width: 120px; background: #f5f5f5; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 20px; }
    table.items th, table.items td { border: 1px solid #333; padding: 10px; text-align: center; }
    table.items th { background: #f5f5f5; }
    .footer { margin-top: 40px; text-align: right; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>回仓申请单</h1>
  <table class="info-table">
    <tr>
      <td class="label">回仓单号</td>
      <td>${data.returnNo}</td>
      <td class="label">Bay号</td>
      <td>${data.bayNo}</td>
    </tr>
    <tr>
      <td class="label">接收Building</td>
      <td>${data.receiveBuilding}</td>
      <td class="label">提交时间</td>
      <td>${dayjs(data.createdAt).format('YYYY-MM-DD HH:mm')}</td>
    </tr>
    <tr>
      <td class="label">提交人</td>
      <td colspan="3">${data.submitterName} (${data.submitterAccount})</td>
    </tr>
  </table>

  <h3>物料明细</h3>
  <table class="items">
    <thead>
      <tr>
        <th>序号</th>
        <th>物料号</th>
        <th>数量</th>
        <th>Bay号</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="footer">
    <p>打印时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
  </div>
</body>
</html>`;
};

/**
 * 生成转仓单打印 HTML
 */
const generateTransferPrintHTML = (data) => {
  const itemsRows = data.items.map(item => `
    <tr>
      <td>${item.index}</td>
      <td>${item.material}</td>
      <td>${item.qty}</td>
      <td>${item.toSloc}</td>
      <td>${data.receivedBy}</td>
      <td>${data.building}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>转仓单 - ${data.returnNo}</title>
  <style>
    body { font-family: 'SimSun', '宋体', Arial, sans-serif; margin: 40px; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 8px; border: 1px solid #333; }
    .info-table .label { font-weight: bold; width: 120px; background: #f5f5f5; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 20px; }
    table.items th, table.items td { border: 1px solid #333; padding: 10px; text-align: center; }
    table.items th { background: #f5f5f5; }
    .footer { margin-top: 40px; text-align: right; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>转仓单</h1>
  <table class="info-table">
    <tr>
      <td class="label">回仓单号</td>
      <td>${data.returnNo}</td>
      <td class="label">Bay号</td>
      <td>${data.bayNo}</td>
    </tr>
    <tr>
      <td class="label">Building</td>
      <td>${data.building}</td>
      <td class="label">接收人</td>
      <td>${data.receivedBy}</td>
    </tr>
    <tr>
      <td class="label">接收时间</td>
      <td>${data.receivedAt ? dayjs(data.receivedAt).format('YYYY-MM-DD HH:mm') : '-'}</td>
      <td class="label">提交人</td>
      <td>${data.submitterName}</td>
    </tr>
  </table>

  <h3>物料明细</h3>
  <table class="items">
    <thead>
      <tr>
        <th>序号</th>
        <th>物料号</th>
        <th>数量</th>
        <th>系统位置</th>
        <th>接收人</th>
        <th>接收地点</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="footer">
    <p>打印时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
  </div>
</body>
</html>`;
};

export default {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  receiveDocument,
  reconcileDocument,
  returnItems,
  closeItems,
  confirmSapOnly,
  getDocumentLogs,
  resendReturnEmail,
  getBuildings,
  getAllBuildings,
  saveBuildingConfig,
  getEmailCcList,
  saveEmailCcConfig,
  getWarehouseReturnConfig,
  saveWarehouseReturnConfig,
  deleteWarehouseReturnConfig,
  getDocumentStats,
  downloadTemplate,
  previewApplication,
  previewTransfer
};
