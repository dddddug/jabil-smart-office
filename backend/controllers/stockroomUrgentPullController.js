/**
 * Stockroom Urgent Pull 控制器 (分区表 + 预计算ITEM计数版)
 * 数据来源：外部API -> 数据库表 -> 前端
 *
 * 优化策略：
 * 1. 使用分区表 jso_sap_pull_log_partitioned 提高查询性能
 * 2. 使用预计算表 jso_pulllist_item_count 替代模糊查询
 * 3. 保留回退机制：当预计算表无数据时使用原始查询
 */

import axios from 'axios';
import pool from '../config/db.js';
import { logInfo, logError } from '../utils/logger.js';

const CONFIG_TABLE = 'jso_stockroom_urgent_pull_config';
const DATA_TABLE = 'jso_stockroom_urgent_pull_data_partitioned';
const ARCHIVE_TABLE = 'jso_stockroom_urgent_pull_data_archive';

// 分区表配置（使用分区表替代原表）
const SAP_PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';
const SAP_PULL_LOG_FALLBACK = 'jso_sap_pull_log'; // 回退到原表
const PULLLIST_COUNT_TABLE = 'jso_pulllist_item_count_partitioned'; // 预计算表（分区版）

// 缓存配置：避免每次请求都查询配置表
let borrowKeywordsCache = null;
let borrowKeywordsCacheTime = 0;
const BORROW_KEYWORDS_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 获取中国本地日期字符串 (YYYY-MM-DD)
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取中国本地当前日期
const getTodayString = () => {
  return getLocalDateString(new Date());
};

/**
 * 获取借料关键词（带缓存优化）
 */
const getBorrowKeywordsSQL = async () => {
  const now = Date.now();

  if (borrowKeywordsCache && (now - borrowKeywordsCacheTime) < BORROW_KEYWORDS_CACHE_TTL) {
    return borrowKeywordsCache;
  }

  try {
    const result = await pool.query(`
      SELECT UPPER(unnest(string_to_array(config_value, ','))) as keyword
      FROM ${CONFIG_TABLE}
      WHERE config_type = 'pulllist_type'
        AND is_active = true
        AND (description = '借料' OR description IS NULL OR description = '')
    `);
    borrowKeywordsCache = result.rows.map(row => row.keyword.trim());
    borrowKeywordsCacheTime = now;
    return borrowKeywordsCache;
  } catch (error) {
    logError('StockroomUrgentPull', '获取借料关键词失败', { message: error.message });
    return [];
  }
};

/**
 * 构建借料过滤条件
 */
const buildBorrowFilterCondition = async () => {
  const borrowKeywords = await getBorrowKeywordsSQL();

  if (borrowKeywords.length === 0) {
    return '1=0';
  }

  const borrowCond = borrowKeywords.map(kw => `UPPER(pulllist_no) LIKE '%${kw}%'`).join(' OR ');
  return `(${borrowCond})`;
};

// 外部API地址
const EXTERNAL_API_BASE = 'http://huasfmmwebapi/SFMMWebAPI/api/ExternalApp';

// 定时刷新间隔（毫秒）：2小时
const REFRESH_INTERVAL = 2 * 60 * 60 * 1000;

// 最后一次刷新时间
let lastRefreshTime = null;
let refreshTimer = null;

/**
 * 计算单个 PullListNo 的 ITEM 计数
 * 优先使用预计算表，失败时回退到分区表查询
 */
const calculateItemCount = async (pulllistNo, reqDate) => {
  if (!pulllistNo) return 0;

  try {
    // 优先从预计算表查询
    const result = await pool.query(`
      SELECT COALESCE(SUM(item_count), 0) as cnt
      FROM ${PULLLIST_COUNT_TABLE}
      WHERE pulllist_no = $1
        AND data_date >= ($2::date - INTERVAL '7 days')
        AND data_date <= ($2::date + INTERVAL '7 days')
    `, [pulllistNo, reqDate]);

    const precomputedCount = parseInt(result.rows[0]?.cnt || 0);

    // 如果预计算表有数据，直接返回
    if (precomputedCount > 0) {
      return precomputedCount;
    }

    // 预计算表无数据，回退到分区表查询
    logInfo('StockroomUrgentPull', '预计算表无数据，回退到分区表查询', { pulllistNo, reqDate });

    const fallbackResult = await pool.query(`
      SELECT COUNT(*) as cnt
      FROM ${SAP_PULL_LOG_TABLE}
      WHERE reference ILIKE '%' || $1 || '%'
        AND date_created >= ($2::date - INTERVAL '7 days')
        AND date_created <= ($2::date + INTERVAL '7 days')
    `, [pulllistNo, reqDate]);

    return parseInt(fallbackResult.rows[0]?.cnt || 0);

  } catch (error) {
    logError('StockroomUrgentPull', '计算ITEM计数失败', { pulllistNo, error: error.message });

    // 回退到原表查询（兼容性）
    try {
      const fallbackResult = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM ${SAP_PULL_LOG_FALLBACK}
        WHERE reference ILIKE '%' || $1 || '%'
          AND date_created::date >= ($2::date - INTERVAL '7 days')
          AND date_created::date <= ($2::date + INTERVAL '7 days')
      `, [pulllistNo, reqDate]);
      return parseInt(fallbackResult.rows[0]?.cnt || 0);
    } catch (fallbackError) {
      logError('StockroomUrgentPull', '回退查询也失败', { error: fallbackError.message });
      return 0;
    }
  }
};

/**
 * 批量计算 ITEM 计数（优化版）
 * 优先使用预计算表，一次查询获取多个 PullListNo 的计数
 */
const batchCalculateItemCounts = async (pulllistDataArray) => {
  if (!pulllistDataArray || pulllistDataArray.length === 0) {
    return new Map();
  }

  const countMap = new Map();

  try {
    // 提取所有 pulllist_no 和对应的日期
    const pulllistNos = pulllistDataArray.map(d => d.pulllistNo);
    const reqDates = pulllistDataArray.map(d => d.reqDate);

    // 优先从预计算表批量查询
    const result = await pool.query(`
      WITH pull_data AS (
        SELECT unnest($1::text[]) as pulllist_no, unnest($2::date[]) as req_date
      ),
      item_counts AS (
        SELECT
          p.pulllist_no,
          COALESCE(SUM(c.item_count), 0) as cnt
        FROM pull_data p
        LEFT JOIN ${PULLLIST_COUNT_TABLE} c
          ON c.pulllist_no = p.pulllist_no
          AND c.data_date >= (p.req_date - INTERVAL '7 days')
          AND c.data_date <= (p.req_date + INTERVAL '7 days')
        GROUP BY p.pulllist_no
      )
      SELECT pulllist_no, cnt FROM item_counts
    `, [pulllistNos, reqDates]);

    result.rows.forEach(row => {
      countMap.set(row.pulllist_no, parseInt(row.cnt || 0));
    });

    // 检查是否有需要回退查询的数据（预计算表为0的）
    const needsFallback = pulllistDataArray.filter(d => !countMap.has(d.pulllistNo) || countMap.get(d.pulllistNo) === 0);

    if (needsFallback.length > 0) {
      logInfo('StockroomUrgentPull', `有 ${needsFallback.length} 条数据需要回退查询`);

      // 回退查询：从分区表获取
      const fallbackResult = await pool.query(`
        WITH pull_data AS (
          SELECT unnest($1::text[]) as pulllist_no, unnest($2::date[]) as req_date
        ),
        item_counts AS (
          SELECT
            p.pulllist_no,
            COUNT(spl.id) as cnt
          FROM pull_data p
          LEFT JOIN ${SAP_PULL_LOG_TABLE} spl
            ON spl.reference ILIKE '%' || p.pulllist_no || '%'
            AND spl.date_created >= (p.req_date - INTERVAL '7 days')
            AND spl.date_created <= (p.req_date + INTERVAL '7 days')
          GROUP BY p.pulllist_no
        )
        SELECT pulllist_no, cnt FROM item_counts
        WHERE cnt > 0
      `, [needsFallback.map(d => d.pulllistNo), needsFallback.map(d => d.reqDate)]);

      fallbackResult.rows.forEach(row => {
        countMap.set(row.pulllist_no, parseInt(row.cnt || 0));
      });
    }

    return countMap;

  } catch (error) {
    logError('StockroomUrgentPull', '批量计算ITEM计数失败', { message: error.message });

    // 出错时逐个计算（使用原始表作为最后回退）
    for (const { pulllistNo, reqDate } of pulllistDataArray) {
      try {
        const fallbackResult = await pool.query(`
          SELECT COUNT(*) as cnt
          FROM ${SAP_PULL_LOG_FALLBACK}
          WHERE reference ILIKE '%' || $1 || '%'
            AND date_created::date >= ($2::date - INTERVAL '7 days')
            AND date_created::date <= ($2::date + INTERVAL '7 days')
        `, [pulllistNo, reqDate]);
        countMap.set(pulllistNo, parseInt(fallbackResult.rows[0]?.cnt || 0));
      } catch (e) {
        countMap.set(pulllistNo, 0);
      }
    }
    return countMap;
  }
};

/**
 * 从外部API拉取数据并存储到数据库
 */
const pullDataFromExternalAPI = async (dateFrom, dateTo) => {
  logInfo('StockroomUrgentPull', '开始从外部API拉取数据', { dateFrom, dateTo });

  try {
    const queryString = `QM=&Customer=&BPType=&BuildPlan=&PulllistNo=`
      + `&MaterialReqTimeFrom=${encodeURIComponent(dateFrom)}`
      + `&MaterialReqTimeTo=${encodeURIComponent(dateTo)}`;

    const apiUrl = `${EXTERNAL_API_BASE}/GetBuildPlanDetailsData?${queryString}`;

    const response = await axios.get(apiUrl, {
      timeout: 120000,
      headers: { 'Accept': 'application/json' }
    });

    let rawData = response.data;
    let items = [];

    if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.Data)) {
        items = rawData.Data;
      } else if (rawData.data) {
        items = Array.isArray(rawData.data) ? rawData.data : [rawData.data];
      }
    }

    logInfo('StockroomUrgentPull', '外部API返回数据', { count: items.length });

    if (items.length === 0) {
      return { success: true, count: 0 };
    }

    const getLocalDate = (apiDateStr) => {
      if (!apiDateStr) return null;
      return apiDateStr.substring(0, 10);
    };

    // 构建批量插入数据
    const values = items.map((item, idx) => {
      const offset = idx * 27; // 增加一个参数
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27})`;
    }).join(',');

    // 准备参数
    const pullDataArray = []; // 用于计算 item_count
    const params = items.flatMap(item => {
      const dataDate = getLocalDate(item.MaterialReqTime);
      pullDataArray.push({
        pulllistNo: item.PulllistNo || '',
        reqDate: dataDate
      });

      return [
        item.BuildPlan || '',
        item.Customer || '',
        item.MaterialReqTime || null,
        item.PulllistNo || '',
        item.SAPModel || '',
        item.Assembly || '',
        item.QtyRequired || item.Qty || 0,
        item.QtyAllocated || 0,
        item.QtyShort || 0,
        item.StorageArea || '',
        item.isPullListShortage || false,
        item.BuildPlanID || null,
        item.BPType || '',
        item.QM || '',
        item.SLOC || '',
        item.StorageArea || '',
        item.Step || '',
        item.FactoryMARoute || '',
        item.Sets || 0,
        item.SAPModel || '',
        item.Assembly || '',
        item.Creator || '',
        item.CreateTime || null,
        dataDate,
        new Date(),
        item.Warehouse || '',
        0 // item_count 占位，稍后更新
      ];
    });

    // 批量插入（item_count 暂时设为 0）
    await pool.query(`
      INSERT INTO ${DATA_TABLE} (
        build_plan, customer, material_req_time, pulllist_no,
        part_number, part_desc, qty_required, qty_allocated, qty_short,
        bin_location, is_pull_list_shortage,
        build_plan_id, bp_type, qm, sloc, storage_area, step,
        factory_ma_route, sets, sap_model, assembly, creator, create_time,
        data_date, pulled_at, warehouse, item_count
      ) VALUES ${values}
      ON CONFLICT (pulllist_no, data_date)
      DO UPDATE SET
        build_plan = EXCLUDED.build_plan,
        customer = EXCLUDED.customer,
        material_req_time = EXCLUDED.material_req_time,
        part_number = EXCLUDED.part_number,
        part_desc = EXCLUDED.part_desc,
        qty_required = EXCLUDED.qty_required,
        qty_allocated = EXCLUDED.qty_allocated,
        qty_short = EXCLUDED.qty_short,
        bin_location = EXCLUDED.bin_location,
        is_pull_list_shortage = EXCLUDED.is_pull_list_shortage,
        step = EXCLUDED.step,
        warehouse = EXCLUDED.warehouse,
        pulled_at = EXCLUDED.pulled_at
    `, params);

    // 异步计算并更新 ITEM 计数（不阻塞主流程）
    setImmediate(async () => {
      try {
        await updateItemCountsForPulledData(pullDataArray);
      } catch (e) {
        logError('StockroomUrgentPull', '异步更新ITEM计数失败', { error: e.message });
      }
    });

    logInfo('StockroomUrgentPull', '数据拉取完成', { saved: items.length });

    return { success: true, count: items.length };

  } catch (error) {
    logError('StockroomUrgentPull', '从外部API拉取数据失败', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * 为刚拉取的数据更新 ITEM 计数
 */
const updateItemCountsForPulledData = async (pullDataArray) => {
  if (!pullDataArray || pullDataArray.length === 0) return;

  logInfo('StockroomUrgentPull', '开始更新ITEM计数', { count: pullDataArray.length });

  // 批量计算
  const countMap = await batchCalculateItemCounts(pullDataArray);

  // 批量更新数据库
  const updatePromises = [];
  for (const { pulllistNo, reqDate } of pullDataArray) {
    const count = countMap.get(pulllistNo) || 0;

    updatePromises.push(
      pool.query(`
        UPDATE ${DATA_TABLE}
        SET item_count = $1
        WHERE pulllist_no = $2 AND data_date = $3::date
      `, [count, pulllistNo, reqDate]).catch(e => {
        logError('StockroomUrgentPull', '更新单条ITEM计数失败', { pulllistNo, error: e.message });
      })
    );
  }

  await Promise.all(updatePromises);
  logInfo('StockroomUrgentPull', 'ITEM计数更新完成', { count: pullDataArray.length });
};

/**
 * 定时刷新今天的数据
 */
const scheduledRefresh = async () => {
  const now = new Date();
  const dateStr = getLocalDateString(now);

  logInfo('StockroomUrgentPull', '执行定时刷新任务', { date: dateStr });

  lastRefreshTime = now;
  return await pullDataFromExternalAPI(dateStr, dateStr);
};

/**
 * 启动定时刷新任务
 */
export const startScheduledRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  scheduledRefresh();

  refreshTimer = setInterval(scheduledRefresh, REFRESH_INTERVAL);

  logInfo('StockroomUrgentPull', '定时刷新任务已启动', { intervalMs: REFRESH_INTERVAL });
};

/**
 * 停止定时刷新任务
 */
export const stopScheduledRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    logInfo('StockroomUrgentPull', '定时刷新任务已停止');
  }
};

/**
 * 获取定时刷新状态
 */
export const getRefreshStatus = () => {
  return {
    isRunning: !!refreshTimer,
    lastRefreshTime: lastRefreshTime,
    nextRefreshTime: lastRefreshTime ? new Date(lastRefreshTime.getTime() + REFRESH_INTERVAL) : null
  };
};

/**
 * 手动补充计算缺失的 ITEM 计数
 * 用于修复历史数据或修复计算失败的记录
 */
export const recalculateMissingItemCounts = async (limit = 1000) => {
  logInfo('StockroomUrgentPull', '开始补充计算缺失的ITEM计数', { limit });

  try {
    // 查找 item_count 为 0 或 NULL 的记录
    const result = await pool.query(`
      SELECT pulllist_no, data_date
      FROM ${DATA_TABLE}
      WHERE item_count IS NULL OR item_count = 0
      LIMIT $1
    `, [limit]);

    if (result.rows.length === 0) {
      return { success: true, updated: 0, message: '没有需要更新的记录' };
    }

    const pullDataArray = result.rows.map(row => ({
      pulllistNo: row.pulllist_no,
      reqDate: row.data_date
    }));

    await updateItemCountsForPulledData(pullDataArray);

    return { success: true, updated: result.rows.length };

  } catch (error) {
    logError('StockroomUrgentPull', '补充计算ITEM计数失败', { message: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * 获取 Stockroom Urgent Pull 数据（从数据库读取）
 * 直接读取预计算的 item_count，无需动态计算
 */
export const getData = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const {
      BuildPlan,
      Customer,
      BPType,
      PulllistNo,
      MaterialReqTimeFrom,
      MaterialReqTimeTo,
      page = 1,
      pageSize = 50
    } = req.query;

    logInfo('StockroomUrgentPull', '从数据库读取数据', { MaterialReqTimeFrom, MaterialReqTimeTo });

    // 构建查询条件
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (MaterialReqTimeFrom) {
      conditions.push(`material_req_time >= $${paramIndex}`);
      params.push(MaterialReqTimeFrom);
      paramIndex++;
    }

    if (MaterialReqTimeTo) {
      conditions.push(`material_req_time <= $${paramIndex}::date + INTERVAL '1 day'`);
      params.push(MaterialReqTimeTo);
      paramIndex++;
    }

    if (BuildPlan) {
      conditions.push(`build_plan ILIKE $${paramIndex}`);
      params.push(`%${BuildPlan}%`);
      paramIndex++;
    }

    if (Customer) {
      conditions.push(`customer ILIKE $${paramIndex}`);
      params.push(`%${Customer}%`);
      paramIndex++;
    }

    if (PulllistNo) {
      conditions.push(`pulllist_no ILIKE $${paramIndex}`);
      params.push(`%${PulllistNo}%`);
      paramIndex++;
    }

    // 只过滤借料关键词
    const borrowFilter = await buildBorrowFilterCondition();
    conditions.push(borrowFilter);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数 - 使用 UNION ALL 查询主表和归档表
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT pulllist_no FROM (
          SELECT pulllist_no FROM ${DATA_TABLE}
          ${whereClause}
          UNION ALL
          SELECT pulllist_no FROM ${ARCHIVE_TABLE}
          ${whereClause}
        ) combined
        GROUP BY pulllist_no
      ) t
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || 0);

    // 分页查询 - 使用 UNION ALL 查询主表和归档表
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const dataQuery = `
      SELECT * FROM (
        SELECT
          pulllist_no, build_plan, customer, material_req_time,
          part_number, part_desc,
          qty_required, qty_allocated, qty_short,
          bin_location, is_pull_list_shortage,
          build_plan_id, bp_type, qm, sloc, storage_area, step,
          factory_ma_route, sets, sap_model, assembly, creator, create_time,
          item_count, pulled_at
        FROM ${DATA_TABLE}
        ${whereClause}
        UNION ALL
        SELECT
          pulllist_no, build_plan, customer, material_req_time,
          part_number, part_desc,
          qty_required, qty_allocated, qty_short,
          bin_location, is_pull_list_shortage,
          build_plan_id, bp_type, qm, sloc, storage_area, step,
          factory_ma_route, sets, sap_model, assembly, creator, create_time,
          item_count, pulled_at
        FROM ${ARCHIVE_TABLE}
        ${whereClause}
      ) combined_data
      ORDER BY material_req_time DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(pageSize), offset);

    const result = await pool.query(dataQuery, params);

    // 字段映射（直接使用预计算的 item_count）
    const mappedItems = result.rows.map(item => ({
      BuildPlan: item.build_plan,
      Customer: item.customer,
      MaterialReqTime: item.material_req_time,
      PulllistNo: item.pulllist_no,
      PartNumber: item.part_number || item.sap_model || '',
      PartDesc: item.part_desc || item.assembly || '',
      QtyRequired: item.qty_required,
      QtyAllocated: item.qty_allocated,
      QtyShort: item.qty_short,
      BinLocation: item.bin_location || item.storage_area || '',
      IsPullListShortage: item.is_pull_list_shortage,
      BPType: item.bp_type,
      QM: item.qm,
      SLOC: item.sloc,
      StorageArea: item.storage_area,
      Step: item.step,
      FactoryMARoute: item.factory_ma_route,
      Sets: item.sets,
      SAPModel: item.sap_model,
      Assembly: item.assembly,
      Creator: item.creator,
      CreateTime: item.create_time,
      BuildPlanID: item.build_plan_id,
      Item: item.item_count || 0  // 直接使用预计算值
    }));

    const elapsed = Date.now() - startTime;
    logInfo('StockroomUrgentPull', '数据查询成功', { total, page, pageSize, elapsed });

    res.json({
      success: true,
      code: 200,
      message: '获取成功',
      data: {
        items: mappedItems,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
        queryTime: elapsed
      }
    });

  } catch (error) {
    logError('StockroomUrgentPull', '获取数据失败', { message: error.message });
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message
    });
  }
};

/**
 * 手动刷新数据
 */
export const refreshData = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const today = getTodayString();
    const from = dateFrom || today;
    const to = dateTo || today;

    logInfo('StockroomUrgentPull', '手动刷新数据', { dateFrom: from, dateTo: to });

    const result = await pullDataFromExternalAPI(from, to);

    if (result.success) {
      res.json({
        success: true,
        code: 200,
        message: `刷新成功，共保存 ${result.count} 条记录`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        code: 500,
        message: `刷新失败: ${result.error}`,
        data: result
      });
    }

  } catch (error) {
    logError('StockroomUrgentPull', '手动刷新数据失败', { message: error.message });
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message
    });
  }
};

/**
 * 导出数据（直接使用预计算的 item_count）
 */
export const exportData = async (req, res, next) => {
  try {
    const {
      BuildPlan,
      Customer,
      BPType,
      PulllistNo,
      MaterialReqTimeFrom,
      MaterialReqTimeTo
    } = req.query;

    logInfo('StockroomUrgentPull', '开始导出数据');

    // 构建查询条件
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (MaterialReqTimeFrom) {
      conditions.push(`material_req_time >= $${paramIndex}`);
      params.push(MaterialReqTimeFrom);
      paramIndex++;
    }

    if (MaterialReqTimeTo) {
      conditions.push(`material_req_time <= $${paramIndex}::date + INTERVAL '1 day'`);
      params.push(MaterialReqTimeTo);
      paramIndex++;
    }

    if (BuildPlan) {
      conditions.push(`build_plan ILIKE $${paramIndex}`);
      params.push(`%${BuildPlan}%`);
      paramIndex++;
    }

    if (Customer) {
      conditions.push(`customer ILIKE $${paramIndex}`);
      params.push(`%${Customer}%`);
      paramIndex++;
    }

    if (PulllistNo) {
      conditions.push(`pulllist_no ILIKE $${paramIndex}`);
      params.push(`%${PulllistNo}%`);
      paramIndex++;
    }

    const borrowFilter = await buildBorrowFilterCondition();
    conditions.push(borrowFilter);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 去重查询
    const query = `
      SELECT
        pulllist_no, build_plan, customer, material_req_time,
        part_number, part_desc,
        qty_required, qty_allocated, qty_short,
        bin_location, is_pull_list_shortage,
        item_count
      FROM ${DATA_TABLE}
      ${whereClause}
      ORDER BY material_req_time DESC NULLS LAST
    `;

    const result = await pool.query(query, params);
    const items = result.rows;

    if (items.length === 0) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: '没有可导出的数据',
        data: []
      });
    }

    // 生成CSV
    const headers = [
      'Build Plan', '客户', '物料需求时间', 'Pull List No', 'ITEM',
      '料号', '物料描述', '需求数量', '已分配数量', '缺料数量', '库位'
    ];

    const csvRows = ['﻿' + headers.join(',')]; // BOM for Excel

    items.forEach(item => {
      const row = [
        item.build_plan || '',
        item.customer || '',
        item.material_req_time ? String(item.material_req_time).substring(0, 10) : '',
        item.pulllist_no || '',
        item.item_count || 0,  // 直接使用预计算值
        item.part_number || '',
        item.part_desc || '',
        item.qty_required || 0,
        item.qty_allocated || 0,
        item.qty_short || 0,
        item.bin_location || ''
      ];
      csvRows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=StockroomUrgentPull_${getTodayString()}.csv`);
    res.send(csvRows.join('\n'));

    logInfo('StockroomUrgentPull', '数据导出成功', { count: items.length });

  } catch (error) {
    logError('StockroomUrgentPull', '导出数据失败', { message: error.message });
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message
    });
  }
};

/**
 * 获取刷新状态
 */
export const getRefreshStatusHandler = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT MAX(pulled_at) as last_pulled, COUNT(*) as total_count,
             SUM(CASE WHEN item_count IS NULL OR item_count = 0 THEN 1 ELSE 0 END) as missing_counts
      FROM ${DATA_TABLE}
    `);

    res.json({
      success: true,
      code: 200,
      data: {
        ...getRefreshStatus(),
        lastDbPull: result.rows[0]?.last_pulled,
        totalRecords: result.rows[0]?.total_count,
        missingItemCounts: parseInt(result.rows[0]?.missing_counts || 0)
      }
    });
  } catch (error) {
    logError('StockroomUrgentPull', '获取刷新状态失败', { message: error.message });
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message
    });
  }
};

/**
 * 获取汇总数据（包含主表和归档表）
 * 用于周汇总、月汇总、年汇总
 */
export const getSummaryData = async (req, res, next) => {
  const startTime = Date.now();

  try {
    logInfo('StockroomUrgentPull', '获取汇总数据');

    // 获取借料过滤条件
    const borrowFilter = await buildBorrowFilterCondition();

    // 构建 UNION ALL 查询，同时查询主表和归档表（应用借料过滤）
    const combinedQuery = `
      SELECT
        pulllist_no,
        material_req_time,
        pulled_at
      FROM (
        SELECT pulllist_no, material_req_time, pulled_at
        FROM ${DATA_TABLE}
        WHERE ${borrowFilter}
        UNION ALL
        SELECT pulllist_no, material_req_time, pulled_at
        FROM ${ARCHIVE_TABLE}
        WHERE ${borrowFilter}
      ) combined_data
    `;

    // 查询所有数据用于汇总
    const result = await pool.query(combinedQuery);

    const data = result.rows.map(row => ({
      PulllistNo: row.pulllist_no,
      MaterialReqTime: row.material_req_time,
      PulledAt: row.pulled_at
    }));

    const elapsed = Date.now() - startTime;
    logInfo('StockroomUrgentPull', '汇总数据查询成功', { count: data.length, elapsed });

    res.json({
      success: true,
      code: 200,
      message: '获取成功',
      data: data
    });

  } catch (error) {
    logError('StockroomUrgentPull', '获取汇总数据失败', { message: error.message });
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message
    });
  }
};
