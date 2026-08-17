/**
 * 仓库物料监控 API
 */

import express from 'express';
import pg from 'pg';
import nodemailer from 'nodemailer';

const router = express.Router();
const { Pool } = pg;

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
    const { days = 30, plant } = req.query;
    const daysNum = parseInt(days) || 30;

    // 过期逻辑：
    // 1. SLED < 今天
    // 2. 排除已延期处理：GRN存在于jso_material_extension且last_sync_time > 今天
    // 3. 排除管控物料：Reference存在于jso_da_material_document且control_type='过期物料'且status不是'待提交'/'待接收'
    let query = `
      SELECT
        h.id, h.gr_document, h.material, h.quantity, h.plant, h.warehouse,
        h.to_number, h.to_sloc, h.trans, h.movmt_type,
        h.creation_date, h.creation_time, h.from_sloc, h.masked_mpn,
        h.sled, h.mfg_date, h.date_code, h.lot_code, h.manufacturer_code,
        h.is_processed, h.processed_at, h.reference,
        e.extension_date, e.last_sync_time
      FROM jso_sap_grn_history h
      LEFT JOIN jso_material_extension e ON h.gr_document = e.grn
      LEFT JOIN jso_da_material_document d ON h.reference = d.document_no
      WHERE h.sled IS NOT NULL AND h.sled != ''
        AND (h.is_processed IS NULL OR h.is_processed = FALSE)
        AND TO_DATE(h.sled, 'MM/DD/YYYY') < CURRENT_DATE
        -- 排除条件1：已延期处理（last_sync_time > 今天）
        AND NOT (
          e.grn IS NOT NULL
          AND e.last_sync_time IS NOT NULL
          AND e.last_sync_time::date > CURRENT_DATE
        )
        -- 排除条件2：管控物料过期（control_type='过期物料'且status不是'待提交'/'待接收'）
        AND NOT (
          d.document_no IS NOT NULL
          AND d.control_type = '过期物料'
          AND d.status NOT IN ('待提交', '待接收')
        )
    `;

    const params = [];
    if (plant) {
      query += ` AND h.plant = $1`;
      params.push(plant);
    }
    query += ` ORDER BY TO_DATE(h.sled, 'MM/DD/YYYY') ASC`;

    const result = await pool.query(query, params);

    const alerts = result.rows.map(row => {
      const sledDate = new Date(row.sled);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      sledDate.setHours(0, 0, 0, 0);
      const diffTime = sledDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = 'normal';
      if (diffDays < 0) status = 'expired';
      else if (diffDays <= 7) status = 'critical';
      else if (diffDays <= 30) status = 'warning';

      return {
        ...row,
        trans_name: TRANS_TYPES[row.trans] || row.trans,
        expiry_days: diffDays,
        expiry_status: status
      };
    });

    res.json({ success: true, data: alerts, total: alerts.length });
  } catch (error) {
    console.error('获取过期预警失败:', error);
    res.status(500).json({ success: false, message: '获取过期预警失败' });
  }
});

// 按时间统计
router.get('/stats-by-time', async (req, res) => {
  try {
    const { date, plant } = req.query;
    const d = date ? new Date(date) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const targetDate = `${mm}/${dd}/${yyyy}`;

    const result = await pool.query(`
      SELECT trans, creation_time,
        COUNT(*) as roll_count, SUM(quantity) as total_quantity
      FROM jso_sap_grn_history
      WHERE creation_date = $1 ${plant ? 'AND plant = $2' : ''}
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
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const targetDate = `${mm}/${dd}/${yyyy}`;
    const plantValue = plant || 'CN02';

    const statsResult = await pool.query(`
      SELECT trans, COUNT(*) as roll_count, SUM(quantity) as total_quantity
      FROM jso_sap_grn_history
      WHERE creation_date = $1 AND plant = $2
      GROUP BY trans
    `, [targetDate, plantValue]);

    const expiryResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN TO_DATE(h.sled, 'MM/DD/YYYY') < CURRENT_DATE THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN TO_DATE(h.sled, 'MM/DD/YYYY') >= CURRENT_DATE
          AND TO_DATE(h.sled, 'MM/DD/YYYY') <= CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 0 END) as expiring_soon,
        SUM(CASE WHEN TO_DATE(h.sled, 'MM/DD/YYYY') > CURRENT_DATE + INTERVAL '7 days'
          AND TO_DATE(h.sled, 'MM/DD/YYYY') <= CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END) as warning_30d
      FROM jso_sap_grn_history h
      LEFT JOIN jso_material_extension e ON h.gr_document = e.grn
      LEFT JOIN jso_da_material_document d ON h.reference = d.document_no
      WHERE h.sled IS NOT NULL AND h.sled != ''
        AND (h.is_processed IS NULL OR h.is_processed = FALSE)
        AND h.plant = $1
        -- 排除已延期处理（last_sync_time > 今天）
        AND NOT (
          e.grn IS NOT NULL
          AND e.last_sync_time IS NOT NULL
          AND e.last_sync_time::date > CURRENT_DATE
        )
        -- 排除管控物料过期（control_type='过期物料'且status不是'待提交'/'待接收'）
        AND NOT (
          d.document_no IS NOT NULL
          AND d.control_type = '过期物料'
          AND d.status NOT IN ('待提交', '待接收')
        )
    `, [plantValue]);

    const stats = {
      date: targetDate,
      trans: { PLR: { count: 0, quantity: 0, name: '发料' }, FLR: { count: 0, quantity: 0, name: '回仓' }, IWS: { count: 0, quantity: 0, name: '收料' } },
      expiry: {
        total: parseInt(expiryResult.rows[0]?.total) || 0,
        expired: parseInt(expiryResult.rows[0]?.expired) || 0,
        expiring_soon: parseInt(expiryResult.rows[0]?.expiring_soon) || 0,
        warning_30d: parseInt(expiryResult.rows[0]?.warning_30d) || 0
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
    const { plant, warehouse, trans, page = 1, pageSize = 50, date } = req.query;
    const d = date ? new Date(date) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const targetDate = `${mm}/${dd}/${yyyy}`;

    let query = `SELECT id, gr_document, material, quantity, plant, warehouse, to_number, to_sloc, trans, movmt_type, creation_date, creation_time, from_sloc, masked_mpn, sled, mfg_date, date_code, lot_code, reference FROM jso_sap_grn_history WHERE creation_date = $1`;
    const params = [targetDate];

    if (plant) { query += ` AND plant = $${params.length + 1}`; params.push(plant); }
    if (warehouse) { query += ` AND warehouse = $${params.length + 1}`; params.push(warehouse); }
    if (trans) { query += ` AND trans = $${params.length + 1}`; params.push(trans); }

    const countResult = await pool.query(query.replace('SELECT id, gr_document, material, quantity, plant, warehouse, to_number, to_sloc, trans, movmt_type, creation_date, creation_time, from_sloc, masked_mpn, sled, mfg_date, date_code, lot_code, reference', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY creation_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(r => ({ ...r, trans_name: TRANS_TYPES[r.trans] || r.trans })), total, page: parseInt(page), pageSize: parseInt(pageSize) });
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
    await pool.query(`UPDATE jso_sap_grn_history SET is_processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, ids);
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
    await pool.query(`UPDATE jso_sap_grn_history SET is_processed = FALSE, processed_at = NULL WHERE id IN (${placeholders})`, ids);
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
