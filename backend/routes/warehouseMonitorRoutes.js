/**
 * 仓库物料监控 API
 */

import express from 'express';
import pg from 'pg';
import nodemailer from 'nodemailer';

const router = express.Router();
const { Pool } = pg;

// 根据日期获取拉取日志表名（用于优化分区查询）
const getPullLogTableForDate = (dateStr) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `jso_sap_pull_log_${y}_${m}`;
};

const GRN_HISTORY_TABLE = 'jso_sap_grn_history_partitioned';
const PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';

const pool = new Pool({
  host: process.env.DB_HOST || '10.114.100.171',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
});

const TRANS_TYPES = {
  PLR: '发料',
  FLR: '回仓',
  IWS: '收料'
};

// 过期预警列表 - 优化版：基于今日明细数据筛选过期
router.get('/expiry-alerts', async (req, res) => {
  try {
    const { plant, warehouse, trans, page = 1, pageSize = 100, date } = req.query;
    const d = date ? new Date(date) : new Date();
    const targetDate = d.toISOString().split('T')[0];

    // 获取指定日期的分区表名（分区感知）
    const pullLogTable = getPullLogTableForDate(targetDate);
    // 计算下一天（用于 < 比较，触发分区裁剪）
    const nextDate = new Date(d);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    let params = [targetDate, nextDateStr];
    const class33 = `(SELECT 1 FROM jso_class33_materials c33 WHERE c33.part_no = h.material LIMIT 1)`;

    // 计算 TotalSLife（DC + SLife）- YYYYMMDD 格式用于日期比较
    const calcTotalSl = `
      CASE
        WHEN sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')
        ELSE NULL
      END
    `;

    // TotalSLife 显示格式 - MM/DD/YYYY 用于前端显示
    const displayTotalSl = `
      CASE
        WHEN sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'MM/DD/YYYY')
        ELSE NULL
      END
    `;

    // 计算 Expiry Days（核心过期判定）
    const calcExpiryDays = `
      CASE
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          (TO_DATE(${calcTotalSl}, 'YYYYMMDD') - $1::date)
        WHEN h.sled IS NOT NULL AND h.sled != '' THEN
          (TO_DATE(h.sled, 'MM/DD/YYYY')::date - $1::date)
        ELSE NULL
      END
    `;

    // Expiry 来源
    const calcExpirySource = `
      CASE
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN 'dc_sl'
        WHEN h.sled IS NOT NULL AND h.sled != '' THEN 'sled'
        ELSE NULL
      END
    `;

    // 完整的 SELECT 列
    let selectCols = `h.id, h.gr_document, h.material, h.quantity, h.plant, h.warehouse,
      h.to_number, h.to_sloc, h.trans, h.movmt_type,
      h.creation_date, h.creation_time, h.from_sloc, h.masked_mpn,
      h.sled, h.mfg_date, h.date_code, h.lot_code, h.manufacturer_code,
      h.is_processed, h.processed_at, h.processed_by, h.process_result, h.reference,
      TO_CHAR(e.extension_date, 'YYYY-MM-DD') as extension_date,
      e.extension_file_no, e.date_code as extension_date_code,
      e.user_name as extension_user_name,
      sl.shelf_life, sl.period_indicator,
      pull.type, pull.storage_bin, pull.user_name,
      CASE WHEN ${class33} IS NOT NULL THEN 1 ELSE 0 END as is_class33,
      ${displayTotalSl} as total_sl,
      ${calcExpiryDays} as expiry_days,
      ${calcExpirySource} as expiry_source`;

    // 使用分区感知的 LATERAL JOIN + 范围查询触发分区裁剪
    let fromClause = `FROM ${GRN_HISTORY_TABLE} h
      LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
      LEFT JOIN jso_material_extension e ON e.grn = h.gr_document
      LEFT JOIN LATERAL (
        SELECT type, storage_bin, user_name
        FROM ${pullLogTable}
        WHERE to_number = h.to_number
          AND rf_ind IS NOT NULL AND rf_ind != ''
          AND date_created >= $1
          AND date_created < $2
        LIMIT 1
      ) pull ON true
      WHERE h.creation_date >= $1
      AND h.creation_date < $2`;

    let whereClause = '';
    if (plant) { whereClause += ` AND h.plant = $${params.length + 1}`; params.push(plant); }
    if (warehouse && warehouse.trim()) { whereClause += ` AND h.warehouse = $${params.length + 1}`; params.push(warehouse); }
    if (trans && trans.trim()) { whereClause += ` AND h.trans = $${params.length + 1}`; params.push(trans); }

    // 过期筛选条件（PLR不在过期清单中 + 33类SLife不为0）
    const expiredFilter = `AND (${calcExpiryDays} IS NOT NULL AND ${calcExpiryDays} <= 0)
      AND NOT (${class33} IS NOT NULL AND sl.shelf_life = 0)
      AND (h.trans != 'PLR' OR h.reference NOT IN (SELECT document_no FROM jso_da_material_document WHERE control_type = '过期物料'))
      AND (h.trans NOT IN ('FLR', 'IWS') OR pull.type IS DISTINCT FROM 'SPL')`;

    // COUNT - 不使用 DISTINCT，与 DATA 查询结果一致
    const countParams = [...params];
    const countQuery = pool.query(
      `SELECT COUNT(*) as cnt ${fromClause} ${whereClause} ${expiredFilter}`,
      countParams
    );

    // DATA - 保持原有查询逻辑
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const dataQuery = pool.query(
      `SELECT ${selectCols} ${fromClause} ${whereClause} ${expiredFilter}
       ORDER BY is_class33 DESC, ${calcExpiryDays} ASC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const [countResult, result] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult.rows[0]?.cnt) || 0;

    res.json({
      code: 200,
      data: result.rows,
      total
    });
  } catch (error) {
    console.error('获取过期预警失败:', error);
    res.status(500).json({ code: 500, message: '获取过期预警失败' });
  }
});

// 过期预警筛选选项
router.get('/expired-filter-options', async (req, res) => {
  try {
    const { date, plant, warehouse } = req.query;
    const d = date ? new Date(date) : new Date();
    const targetDate = d.toISOString().split('T')[0];

    // 获取指定日期的分区表名
    const pullLogTable = getPullLogTableForDate(targetDate);
    const nextDate = new Date(d);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // 复用 expiry-alerts 的查询逻辑获取过期数据，然后去重获取选项
    // 构建基础查询（与 expiry-alerts 一致）
    const params = [targetDate, nextDateStr];
    let whereConditions = [];

    whereConditions.push(`h.creation_date >= $1 AND h.creation_date < $2`);

    if (plant) {
      whereConditions.push(`h.plant = '${plant}'`);
    }
    if (warehouse) {
      whereConditions.push(`h.warehouse = '${warehouse}'`);
    }

    // 使用 LATERAL JOIN 获取 pull_log 数据
    const lateralJoin = `
      LEFT JOIN LATERAL (
        SELECT type, storage_bin, user_name
        FROM ${pullLogTable}
        WHERE to_number = h.to_number
          AND rf_ind IS NOT NULL AND rf_ind != ''
          AND date_created >= $1
          AND date_created < $2
        LIMIT 1
      ) pull ON true
    `;

    // 计算过期日期（简化版本）
    const calcExpiry = `
      CASE
        WHEN h.sled IS NOT NULL AND h.sled != '' THEN
          TO_DATE(h.sled, 'MM/DD/YYYY')::date
        WHEN sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * 30)
        ELSE NULL
      END
    `;

    // 过期筛选条件
    const expiredWhere = `
      AND ${calcExpiry} IS NOT NULL
      AND ${calcExpiry} <= '${targetDate}'::date
      AND (h.trans != 'PLR' OR h.reference NOT IN (SELECT document_no FROM jso_da_material_document WHERE control_type = '过期物料'))
      AND (h.trans NOT IN ('FLR', 'IWS') OR pull.type IS DISTINCT FROM 'SPL')
      AND NOT ((SELECT 1 FROM jso_class33_materials c33 WHERE c33.part_no = h.material LIMIT 1) IS NOT NULL AND sl.shelf_life = 0)
    `;

    const whereClause = whereConditions.join(' AND ');

    // 执行查询获取过期数据，然后获取所有唯一值
    const expiredData = await pool.query(`
      SELECT DISTINCT
        h.trans,
        pull.type,
        h.reference,
        pull.user_name
      FROM ${GRN_HISTORY_TABLE} h
      LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
      ${lateralJoin}
      WHERE ${whereClause}
      ${expiredWhere}
    `, params);

    // 提取唯一的选项值
    const transSet = new Set();
    const typeSet = new Set();
    const referenceSet = new Set();
    const userSet = new Set();

    expiredData.rows.forEach(row => {
      if (row.trans) transSet.add(row.trans);
      if (row.type) typeSet.add(row.type);
      if (row.reference) referenceSet.add(row.reference);
      if (row.user_name) userSet.add(row.user_name);
    });

    res.json({
      code: 200,
      data: {
        trans: Array.from(transSet).sort(),
        type: Array.from(typeSet).sort(),
        reference: Array.from(referenceSet).sort(),
        user: Array.from(userSet).sort()
      }
    });
  } catch (error) {
    console.error('获取过期预警筛选选项失败:', error);
    res.status(500).json({ code: 500, message: '获取过期预警筛选选项失败' });
  }
});

// 按时间统计
router.get('/stats-by-time', async (req, res) => {
  try {
    const { date, plant } = req.query;
    const d = date ? new Date(date) : new Date();
    const targetDate = d.toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT trans, creation_time,
        COUNT(*) as roll_count, SUM(CAST(REPLACE(quantity, ',', '') AS NUMERIC)) as total_quantity
      FROM ${GRN_HISTORY_TABLE}
      WHERE DATE(creation_date AT TIME ZONE 'Asia/Shanghai') = $1 ${plant ? 'AND plant = $2' : ''}
      GROUP BY trans, creation_time
      ORDER BY creation_time ASC
    `, plant ? [targetDate, plant] : [targetDate]);

    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      timeSlots.push({
        time: hour.toString().padStart(2, '0') + ':00',
        PLR: 0, FLR: 0, IWS: 0
      });
    }

    result.rows.forEach(row => {
      const hour = parseInt(row.creation_time?.split(':')[0] || '0');
      const idx = timeSlots.findIndex(s => s.time === `${hour.toString().padStart(2, '0')}:00`);
      if (idx !== -1 && row.trans) {
        timeSlots[idx][row.trans] = (timeSlots[idx][row.trans] || 0) + parseInt(row.roll_count);
      }
    });

    res.json({ success: true, data: { timeSlots } });
  } catch (error) {
    console.error('获取时间统计失败:', error);
    res.status(500).json({ success: false, message: '获取时间统计失败' });
  }
});

// 汇总统计
router.get('/summary', async (req, res) => {
  try {
    const { date, plant } = req.query;
    const d = date ? new Date(date) : new Date();
    const targetDate = d.toISOString().split('T')[0];
    const plantValue = plant || 'CN02';

    const statsResult = await pool.query(`
      SELECT trans, COUNT(*) as roll_count, SUM(CAST(REPLACE(quantity, ',', '') AS NUMERIC)) as total_quantity
      FROM ${GRN_HISTORY_TABLE}
      WHERE DATE(creation_date AT TIME ZONE 'Asia/Shanghai') = $1 AND plant = $2
      GROUP BY trans
    `, [targetDate, plantValue]);

    // 过期预警统计：根据筛选日期创建但已过期的物料
    // 判断标准：SLED < 选定日期，与过期预警明细保持一致
    const expiryResult = await pool.query(`
      SELECT
        COUNT(*) as expired_count
      FROM ${GRN_HISTORY_TABLE} h
      LEFT JOIN jso_material_extension e ON h.gr_document = e.grn
      LEFT JOIN jso_da_material_document d ON h.reference = d.document_no
      WHERE DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') = $1
        AND h.plant = $2
        AND h.sled IS NOT NULL AND h.sled != ''
        AND (h.is_processed IS NULL OR h.is_processed = FALSE)
        -- SLED 已过期（对比选定日期）
        AND TO_DATE(h.sled, 'MM/DD/YYYY') < $1::date
        -- 排除已延期处理
        AND NOT (
          e.grn IS NOT NULL
          AND e.last_sync_time IS NOT NULL
          AND e.last_sync_time::date > $1::date
        )
        -- 排除管控物料过期
        AND NOT (
          d.document_no IS NOT NULL
          AND d.control_type = '过期物料'
          AND d.status NOT IN ('待提交', '待接收')
        )
    `, [targetDate, plantValue]);

    const stats = {
      date: targetDate,
      trans: { PLR: { count: 0, quantity: 0, name: '发料' }, FLR: { count: 0, quantity: 0, name: '回仓' }, IWS: { count: 0, quantity: 0, name: '收料' } },
      expiry: {
        total: 0,
        expired: parseInt(expiryResult.rows[0]?.expired_count) || 0,
        expiring_soon: 0,
        warning_30d: 0
      }
    };

    statsResult.rows.forEach(row => {
      if (stats.trans[row.trans]) {
        stats.trans[row.trans] = {
          count: parseInt(row.roll_count),
          quantity: parseFloat(row.total_quantity),
          name: TRANS_TYPES[row.trans]
        };
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取汇总统计失败:', error);
    res.status(500).json({ success: false, message: '获取汇总统计失败' });
  }
});

// 今日记录
router.get('/today-records', async (req, res) => {
  try {
    const { plant, warehouse, trans, page = 1, pageSize = 20, date, showExpired } = req.query;
    const d = date ? new Date(date) : new Date();
    const targetDate = d.toISOString().split('T')[0];

    // 获取指定日期的分区表名
    const pullLogTable = getPullLogTableForDate(targetDate);

    let params = [targetDate];
    const class33 = `(SELECT 1 FROM jso_class33_materials c33 WHERE c33.part_no = h.material LIMIT 1)`;

    // 计算 TotalSLife（DC + SLife）
    const calcTotalSl = `
      CASE
        WHEN sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'MM/DD/YYYY')
        ELSE NULL
      END
    `;

    // 直接从GRN表查询，JOIN获取type/storage_bin/user_name/shelf_life/extension_date
    // 使用分区感知的 LATERAL JOIN 避免扫描所有分区
    let selectCols = `h.id, h.gr_document, h.material, h.quantity, h.plant, h.warehouse, h.to_number, h.to_sloc, h.trans, h.movmt_type, h.creation_date, h.creation_time, h.from_sloc, h.masked_mpn, h.sled, h.mfg_date, h.date_code, h.lot_code, h.reference, h.is_processed, h.process_result, h.processed_by, h.processed_at,
      sl.shelf_life, sl.period_indicator,
      TO_CHAR(e.extension_date, 'YYYY-MM-DD') as extension_date,
      pull.type, pull.storage_bin, pull.user_name,
      CASE WHEN ${class33} IS NOT NULL THEN 1 ELSE 0 END as is_class33,
      ${calcTotalSl} as total_sl,
      -- Expiry来源（按原逻辑：过期则用延期日期）
      CASE
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' AND TO_DATE(${calcTotalSl}, 'MM/DD/YYYY') <= $1::date AND e.extension_date IS NOT NULL THEN 'extension_date'
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN 'dc_sl'
        WHEN h.sled IS NOT NULL AND h.sled != '' AND TO_DATE(h.sled, 'MM/DD/YYYY') <= $1::date AND e.extension_date IS NOT NULL THEN 'extension_date'
        WHEN h.sled IS NOT NULL AND h.sled != '' THEN 'sled'
        WHEN e.extension_date IS NOT NULL THEN 'extension_date'
        ELSE NULL
      END as expiry_source,
      -- Expiry Days（过期则显示负数）
      CASE
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' AND TO_DATE(${calcTotalSl}, 'MM/DD/YYYY') <= $1::date AND e.extension_date IS NOT NULL THEN
          (e.extension_date - $1::date)
        WHEN ${class33} IS NOT NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          (TO_DATE(${calcTotalSl}, 'MM/DD/YYYY') - $1::date)
        WHEN h.sled IS NOT NULL AND h.sled != '' AND TO_DATE(h.sled, 'MM/DD/YYYY') <= $1::date AND e.extension_date IS NOT NULL THEN
          (e.extension_date - $1::date)
        WHEN h.sled IS NOT NULL AND h.sled != '' THEN
          (TO_DATE(h.sled, 'MM/DD/YYYY') - $1::date)
        WHEN e.extension_date IS NOT NULL THEN
          (e.extension_date - $1::date)
        ELSE NULL
      END as expiry_days`;

    let whereClause = `FROM ${GRN_HISTORY_TABLE} h
      LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
      LEFT JOIN jso_material_extension e ON e.grn = h.gr_document
      LEFT JOIN LATERAL (
        SELECT type, storage_bin, user_name
        FROM ${pullLogTable}
        WHERE to_number = h.to_number
          AND rf_ind IS NOT NULL AND rf_ind != ''
          AND (date_created AT TIME ZONE 'Asia/Shanghai')::date = $1::date
        ORDER BY date_created DESC
        LIMIT 1
      ) pull ON true
      WHERE DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') = $1`;

    if (plant) { whereClause += ` AND h.plant = $${params.length + 1}`; params.push(plant); }
    if (warehouse && warehouse.trim()) { whereClause += ` AND h.warehouse = $${params.length + 1}`; params.push(warehouse); }
    if (trans && trans.trim()) { whereClause += ` AND h.trans = $${params.length + 1}`; params.push(trans); }

    // 并行执行计数和数据查询
    const countParams = [targetDate];
    if (plant) { countParams.push(plant); }
    const countQuery = pool.query(`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ON (h.id, h.trans) h.id FROM ${GRN_HISTORY_TABLE} h WHERE DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') = $1 ${plant ? 'AND h.plant = $2' : ''}) t`, countParams);
    const dataQuery = pool.query(`SELECT ${selectCols} ${whereClause} ORDER BY is_class33 DESC, h.creation_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]);

    const [countResult, result] = await Promise.all([countQuery, dataQuery]);
    const total = parseInt(countResult.rows[0]?.cnt) || 0;

    res.json({
      code: 200,
      data: result.rows.map(r => ({
        ...r,
        trans_name: TRANS_TYPES[r.trans] || r.trans
      })),
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取今日记录失败:', error);
    res.status(500).json({ success: false, message: '获取今日记录失败' });
  }
});

// 标记已处理
router.post('/mark-processed', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要标记的ID列表' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`UPDATE ${GRN_HISTORY_TABLE} SET is_processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `已成功标记 ${ids.length} 条记录` });
  } catch (error) {
    console.error('标记处理失败:', error);
    res.status(500).json({ success: false, message: '标记处理失败' });
  }
});

// 取消标记
router.post('/unmark-processed', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要取消标记的ID列表' });
    }
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`UPDATE ${GRN_HISTORY_TABLE} SET is_processed = FALSE, processed_at = NULL WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, message: `已成功取消标记 ${ids.length} 条记录` });
  } catch (error) {
    console.error('取消标记失败:', error);
    res.status(500).json({ success: false, message: '取消标记失败' });
  }
});

export default router;

// ========== 发送过期预警邮件 ==========
const sendExpiryEmail = async (transporter, to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@jabil.com',
      to: to,
      subject: subject,
      html: html
    });
    return true;
  } catch (error) {
    console.error('发送邮件失败:', error);
    return false;
  }
};

const buildExpiryEmailHtml = (type, data) => {
  const title = type === 'expired' ? '【紧急】物料已过期预警' : '【提醒】物料即将过期预警';
  const tableRows = data.map(item => `
    <tr>
      <td>${item.gr_document || ''}</td>
      <td>${item.material || ''}</td>
      <td>${item.quantity || ''}</td>
      <td>${item.warehouse || ''}</td>
      <td>${item.sled || ''}</td>
      <td>${item.expiry_days || ''}天</td>
      <td>${item.reference || ''}</td>
      <td>${item.lot_code || ''}</td>
    </tr>
  `).join('');

  return `
    <h2>${title}</h2>
    <p>共有 <strong>${data.length}</strong> 条物料需要关注：</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background-color: #f0f0f0;">
        <tr>
          <th>GRN No</th><th>Material</th><th>Quantity</th><th>Whse No.</th>
          <th>SLED</th><th>剩余天数</th><th>Reference</th><th>Lot Code</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="margin-top: 20px; color: #666;">此邮件由 Jabil 智能办公系统自动发送</p>
  `;
};

router.post('/send-expiry-email', async (req, res) => {
  try {
    const { type, data, recipients } = req.body;

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: '没有数据可发送' });
    }

    // 邮件配置
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    const transporter = nodemailer.createTransport(smtpConfig);
    const subject = type === 'expired' ? '【紧急】物料已过期预警' : '【提醒】物料即将过期预警';
    const html = buildExpiryEmailHtml(type, data);

    // 默认收件人（可配置）
    const toRecipients = recipients || process.env.EXPIRY_EMAIL_TO || 'admin@jabil.com';

    const sent = await sendExpiryEmail(transporter, toRecipients, subject, html);

    if (sent) {
      res.json({ success: true, message: `邮件已发送给 ${toRecipients}` });
    } else {
      res.json({ success: true, message: '邮件内容已生成，但发送失败，请检查邮件配置' });
    }
  } catch (error) {
    console.error('发送邮件失败:', error);
    res.json({ success: true, message: '邮件内容已生成（请配置SMTP）: ' + error.message });
  }
});
