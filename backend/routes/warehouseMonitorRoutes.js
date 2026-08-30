/**
 * 仓库物料监控 API
 */

import express from 'express';
import pg from 'pg';
import nodemailer from 'nodemailer';

const router = express.Router();
const { Pool } = pg;

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

// 过期预警列表
router.get('/expiry-alerts', async (req, res) => {
  try {
    const { days = 30, plant, page = 1, pageSize = 100, date, trans, type, reference, user } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize) || 100;
    const targetDate = date || null;
    const p = [];

    // 基础条件：只查询未处理的记录
    let where = `WHERE (h.is_processed IS NULL OR h.is_processed = FALSE)`;
    if (targetDate) {
      where += ` AND TO_CHAR(h.creation_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') = $${p.push(targetDate)}`;
    }
    if (plant) { where += ` AND h.plant = $${p.push(plant)}`; }
    if (trans) { where += ` AND h.trans = $${p.push(trans)}`; }
    if (type) { where += ` AND EXISTS (SELECT 1 FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' AND pl.type = $${p.push(type)})`; }
    if (user) { where += ` AND EXISTS (SELECT 1 FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' AND pl.user_name = $${p.push(user)})`; }

    const class33 = `(SELECT 1 FROM jso_class33_materials c33 WHERE c33.part_no = h.material LIMIT 1)`;

    // 计算到期日期的文本格式 - YYYYMMDD
    // 使用 make_interval(days => ...) 避免类型问题
    // 注意: sled可能是空字符串''而不是NULL，需要用 COALESCE(h.sled, '') = '' 处理
    const calcExpiryDateText = `
      CASE
        -- 33类物料有延期日期
        WHEN ${class33} IS NOT NULL AND e.extension_date IS NOT NULL THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 33类物料无延期日期，使用DC+SLife (简单天数估算: M=30天)
        WHEN ${class33} IS NOT NULL AND e.extension_date IS NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')
        -- 非33类，SLED和延期日期都为空，使用DC+SLife
        WHEN ${class33} IS NULL AND e.extension_date IS NULL AND (h.sled IS NULL OR h.sled = '') AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')
        -- 非33类，SLED和延期日期都有值，延期日期>SLED
        WHEN ${class33} IS NULL AND e.extension_date IS NOT NULL AND (h.sled IS NOT NULL AND h.sled != '') AND e.extension_date > TO_DATE(h.sled, 'MM/DD/YYYY') THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 非33类，SLED有值，延期日期为空
        WHEN ${class33} IS NULL AND e.extension_date IS NULL AND (h.sled IS NOT NULL AND h.sled != '') THEN REPLACE(h.sled, '/', '')
        -- 非33类，SLED和延期日期都有值
        WHEN ${class33} IS NULL AND e.extension_date IS NOT NULL AND (h.sled IS NOT NULL AND h.sled != '') THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        ELSE NULL
      END
    `;

    // 过期预警筛选条件：
    // 1. Expiry Days 为空（无法计算到期日期）
    // 2. Trans=PLR 且 Expiry Days<=0 且 Reference 不在管控清单中
    // 3. Trans=FLR/IWS 且 Expiry Days<=0 且 Type != SPL
    const alertWhere = where + `
      AND (
        -- 条件1: Expiry Days 为空 (无法计算到期日期)
        (${class33} IS NULL AND sl.shelf_life IS NULL AND (h.date_code IS NULL OR h.date_code !~ '^[0-9]{4}$') AND (h.sled IS NULL OR h.sled = '') AND e.extension_date IS NULL)
        OR
        -- 条件2: Trans=PLR 且到期日期<=筛选日期 且 Reference 不在管控清单中
        (
          h.trans = 'PLR' AND
          ${calcExpiryDateText} IS NOT NULL AND
          ${calcExpiryDateText} <= REPLACE($${p.length}, '-', '') AND
          h.reference NOT IN (SELECT document_no FROM jso_da_material_document WHERE control_type = '过期物料')
        )
        OR
        -- 条件3: Trans=FLR/IWS 且到期日期<=筛选日期 且 Type != SPL
        (
          h.trans IN ('FLR', 'IWS') AND
          ${calcExpiryDateText} IS NOT NULL AND
          ${calcExpiryDateText} <= REPLACE($${p.length}, '-', '') AND
          (SELECT pl.type FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' ORDER BY pl.date_created DESC LIMIT 1) IS DISTINCT FROM 'SPL'
        )
      )
    `;

    // COUNT
    const cntRes = await pool.query(`SELECT COUNT(*) as total FROM ${GRN_HISTORY_TABLE} h LEFT JOIN jso_material_extension e ON h.gr_document = e.grn LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant ${alertWhere}`, p);
    const total = parseInt(cntRes.rows[0]?.total) || 0;

    // 数据
    p.push(limit, offset);
    const rs = await pool.query(`
      SELECT h.id, h.gr_document, h.material, h.quantity, h.plant, h.warehouse,
        h.to_number, h.to_sloc, h.trans, h.movmt_type,
        h.creation_date, h.creation_time, h.from_sloc, h.masked_mpn,
        h.sled, h.mfg_date, h.date_code, h.lot_code, h.manufacturer_code,
        h.is_processed, h.processed_at, h.processed_by, h.process_result, h.reference,
        TO_CHAR(e.extension_date, 'YYYY-MM-DD') as extension_date, e.extension_file_no, e.date_code as extension_date_code, e.user_name as extension_user_name, TO_CHAR(e.update_date, 'YYYY-MM-DD HH24:MI:SS') as extension_update_date, TO_CHAR(e.last_sync_time, 'YYYY-MM-DD HH24:MI:SS') as extension_last_sync_time,
        sl.shelf_life, sl.period_indicator,
        (SELECT pl.type FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' ORDER BY pl.date_created DESC LIMIT 1) as type,
        (SELECT pl.storage_bin FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' ORDER BY pl.date_created DESC LIMIT 1) as storage_bin,
        (SELECT pl.user_name FROM ${PULL_LOG_TABLE} pl WHERE pl.to_number = h.to_number AND pl.rf_ind IS NOT NULL AND pl.rf_ind != '' ORDER BY pl.date_created DESC LIMIT 1) as user_name,
        CASE WHEN ${class33} IS NOT NULL THEN 1 ELSE 0 END as is_class33
      FROM ${GRN_HISTORY_TABLE} h
      LEFT JOIN jso_material_extension e ON h.gr_document = e.grn
      LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
      ${alertWhere}
      ORDER BY is_class33 DESC, ${calcExpiryDateText} ASC NULLS LAST
      LIMIT $${p.length - 1} OFFSET $${p.length}
    `, p);

    // 计算 Expiry Days
    const alerts = rs.rows.map(row => {
      const compareDate = targetDate ? new Date(targetDate) : new Date();
      compareDate.setHours(0, 0, 0, 0);

      let expiryDate = null;
      let expiryDays = null;

      // 33类物料使用extension_date
      if (row.is_class33 && row.extension_date) {
        expiryDate = new Date(row.extension_date);
      } else if (row.sled && row.sled.trim()) {
        // SLED格式: MM/DD/YYYY
        const [m, d, y] = row.sled.split('/');
        expiryDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else if (row.date_code && /^\d{4}$/.test(row.date_code) && row.shelf_life) {
        // DC + SLife
        const year = 2000 + parseInt(row.date_code.substring(0, 2));
        const week = parseInt(row.date_code.substring(2, 4));
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay();
        const daysToMonday = dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek;
        const weekStart = new Date(jan4);
        weekStart.setDate(jan4.getDate() + daysToMonday + (week - 1) * 7);

        // 添加货架期
        const multiplier = row.period_indicator === 'D' ? 1 : row.period_indicator === 'W' ? 7 : row.period_indicator === 'M' ? 30 : row.period_indicator === 'Y' ? 365 : 30;
        expiryDate = new Date(weekStart);
        if (row.period_indicator === 'M') {
          expiryDate.setMonth(weekStart.getMonth() + row.shelf_life);
        } else if (row.period_indicator === 'Y') {
          expiryDate.setFullYear(weekStart.getFullYear() + row.shelf_life);
        } else {
          expiryDate.setDate(weekStart.getDate() + row.shelf_life * multiplier);
        }
      }

      if (expiryDate) {
        expiryDate.setHours(0, 0, 0, 0);
        expiryDays = Math.ceil((expiryDate.getTime() - compareDate.getTime()) / 86400000);
      }

      let status = 'normal';
      if (expiryDays === null) status = 'unknown';
      else if (expiryDays < 0) status = 'expired';
      else if (expiryDays <= 7) status = 'critical';
      else if (expiryDays <= 30) status = 'warning';

      return {
        ...row,
        trans_name: TRANS_TYPES[row.trans] || row.trans,
        expiry_days: expiryDays,
        expiry_status: status
      };
    });

    res.json({ code: 200, data: alerts, total: total });
  } catch (error) {
    console.error('获取过期预警失败:', error);
    res.status(500).json({ code: 500, message: '获取过期预警失败' });
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
    const targetDate = d.toISOString().split('T')[0]; // YYYY-MM-DD

    let params = [targetDate];
    // 直接从GRN表查询，JOIN获取type/storage_bin/user_name
    let selectCols = `h.id, h.gr_document, h.material, h.quantity, h.plant, h.warehouse, h.to_number, h.to_sloc, h.trans, h.movmt_type, h.creation_date, h.creation_time, h.from_sloc, h.masked_mpn, h.sled, h.mfg_date, h.date_code, h.lot_code, h.reference, h.is_processed, h.process_result, h.processed_by, h.processed_at,
      (SELECT p.type FROM ${PULL_LOG_TABLE} p WHERE p.to_number = h.to_number AND DATE(p.date_created AT TIME ZONE 'Asia/Shanghai') = DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') AND p.rf_ind IS NOT NULL AND p.rf_ind != '' LIMIT 1) as type,
      (SELECT p.storage_bin FROM ${PULL_LOG_TABLE} p WHERE p.to_number = h.to_number AND DATE(p.date_created AT TIME ZONE 'Asia/Shanghai') = DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') AND p.rf_ind IS NOT NULL AND p.rf_ind != '' LIMIT 1) as storage_bin,
      (SELECT p.user_name FROM ${PULL_LOG_TABLE} p WHERE p.to_number = h.to_number AND DATE(p.date_created AT TIME ZONE 'Asia/Shanghai') = DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') AND p.rf_ind IS NOT NULL AND p.rf_ind != '' LIMIT 1) as user_name`;

    let whereClause = `WHERE DATE(h.creation_date AT TIME ZONE 'Asia/Shanghai') = $1`;

    if (plant) { whereClause += ` AND h.plant = $${params.length + 1}`; params.push(plant); }
    if (warehouse) { whereClause += ` AND h.warehouse = $${params.length + 1}`; params.push(warehouse); }
    if (trans) { whereClause += ` AND h.trans = $${params.length + 1}`; params.push(trans); }

    // 去重计数
    const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ON (h.id, h.trans) h.id FROM ${GRN_HISTORY_TABLE} h ${whereClause}) t`, params);
    const total = parseInt(countResult.rows[0]?.cnt) || 0;

    const result = await pool.query(`SELECT ${selectCols} FROM ${GRN_HISTORY_TABLE} h ${whereClause} ORDER BY h.id, h.trans, h.creation_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]);

    res.json({
      code: 200,
      data: result.rows.map(r => {
        if (r.sled) {
          const [m, d, y] = r.sled.split('/');
          const sledDate = new Date(`${y}-${m}-${d}`);
          const today = new Date();
          const diffTime = sledDate - today;
          const expiry_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return { ...r, trans_name: TRANS_TYPES[r.trans] || r.trans, expiry_days };
        }
        return { ...r, trans_name: TRANS_TYPES[r.trans] || r.trans };
      }),
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
