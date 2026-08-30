/**
 * K**差异登记 主数据控制器
 */
import pool from '../config/db.js';
import ExcelJS from 'exceljs';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logDebug } from '../utils/logger.js';
import { formatShanghaiDate, formatShanghaiDateTime, getDaysAgoShanghai, getShanghaiNow } from '../utils/dateUtils.js';

// 数据表名
const K2_DIFF_REGISTRATION_TABLE = 'jso_k2_diff_registration';

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * PostgreSQL date 类型返回的是字符串（如 "2026-07-24"），直接使用
 */
const formatDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    // 已经是字符串，检查是否是日期格式
    if (dateValue.includes('T')) {
      // ISO 格式日期，转为本地日期
      const d = new Date(dateValue);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // 直接返回日期字符串部分（去掉时间部分如果有的话）
    return dateValue.split('T')[0];
  }
  // Date 对象
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期时间为本地时间字符串 YYYY-MM-DD HH:mm:ss
 */
const formatDateTime = (dateValue) => {
  if (!dateValue) return null;
  let d;
  if (typeof dateValue === 'string') {
    // ISO 格式字符串
    d = new Date(dateValue);
  } else {
    d = dateValue;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 根据时间判断班次
 * 7:00-19:00 = A班（白班）
 * 19:00-次日7:00 = C班（夜班）
 */
const getShiftByTime = (date) => {
  const hour = date.getHours();
  if (hour >= 7 && hour < 19) {
    return 'A';
  } else {
    return 'C';
  }
};

/**
 * 邮件配置结构
 */
const EMAIL_CONFIG_KEYS = ['email_notification_enabled', 'email_recipients', 'email_cc'];

/**
 * 获取邮件配置
 * @returns {Promise<{enabled: boolean, recipients: string, cc: string}>}
 */
const getEmailConfig = async () => {
  const result = await pool.query(`
    SELECT config_key, config_value
    FROM jso_k2_diff_config
    WHERE config_key = ANY($1)
  `, [EMAIL_CONFIG_KEYS]);

  let enabled = false;
  let recipients = '';
  let cc = '';

  result.rows.forEach(row => {
    switch (row.config_key) {
      case 'email_notification_enabled':
        enabled = row.config_value === 'true';
        break;
      case 'email_recipients':
        recipients = row.config_value || '';
        break;
      case 'email_cc':
        cc = row.config_value || '';
        break;
    }
  });

  return { enabled, recipients, cc };
};

/**
 * 获取登记记录列表
 */
export const getRegistrations = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      shift,
      partNo,
      grn,
      returnLocation,
      recorder,
      page = 1,
      pageSize = 20
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
      // K2差异登记使用 k2-diff 模块
      const k2DiffPerm = effectivePerms.find(p => p.module === 'k2-diff');
      if (k2DiffPerm) {
        userDataScope = k2DiffPerm.dataScope || 'self';
      }
    } catch (permErr) {
      console.error('获取用户数据范围失败:', permErr);
    }

    // 根据数据范围应用过滤条件
    // K2差异登记只有 recorder 字段，没有 department_id/plant_id
    if (userDataScope === 'self') {
      // 只看自己登记的记录
      whereClause += ` AND recorder = $${params.length + 1}`;
      params.push(currentUser.realName);
    }
    // 'dept' 和 'plant' 无法在K2差异表中过滤（无department_id/plant_id字段），暂时显示全部
    // 'all' 不添加过滤条件

    // 日期查询使用 Asia/Shanghai 时区转换，确保本地日期匹配正确
    // registration_date 存储为 UTC，但在查询时转换为上海时区的日期
    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 动态构建查询条件
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND ${dateConversion} >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND ${dateConversion} <= $${params.length}::date`;
    }

    if (shift) {
      params.push(shift);
      whereClause += ` AND shift = $${params.length}`;
    }

    if (partNo) {
      params.push(`%${partNo}%`);
      whereClause += ` AND part_no ILIKE $${params.length}`;
    }

    if (grn) {
      params.push(`%${grn}%`);
      whereClause += ` AND grn ILIKE $${params.length}`;
    }

    if (returnLocation) {
      params.push(`%${returnLocation}%`);
      whereClause += ` AND return_location ILIKE $${params.length}`;
    }

    if (recorder) {
      params.push(`%${recorder}%`);
      whereClause += ` AND recorder ILIKE $${params.length}`;
    }

    // 查询列表
    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        id,
        registration_date,
        shift,
        part_no,
        grn,
        qty,
        location,
        problem_description,
        registration_time,
        return_location,
        recorder,
        created_at,
        updated_at
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      ${whereClause}
      ORDER BY registration_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${K2_DIFF_REGISTRATION_TABLE} ${whereClause}
    `, params);

    const registrations = listResult.rows.map(row => ({
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      shift: row.shift,
      partNo: row.part_no,
      grn: row.grn,
      qty: parseFloat(row.qty) || 0,
      location: row.location,
      problemDescription: row.problem_description,
      registrationTime: formatDateTime(row.registration_time),
      returnLocation: row.return_location,
      recorder: row.recorder,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    paginated(res, {
      items: registrations,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取登记记录详情
 */
export const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        id,
        registration_date,
        shift,
        part_no,
        grn,
        qty,
        location,
        problem_description,
        registration_time,
        return_location,
        recorder,
        created_at,
        updated_at
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    const row = result.rows[0];
    const registration = {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      shift: row.shift,
      partNo: row.part_no,
      grn: row.grn,
      qty: parseFloat(row.qty) || 0,
      location: row.location,
      problemDescription: row.problem_description,
      registrationTime: formatDateTime(row.registration_time),
      returnLocation: row.return_location,
      recorder: row.recorder,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    success(res, registration, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 创建登记记录
 */
export const createRegistration = async (req, res, next) => {
  try {
    const {
      partNo,
      grn,
      qty,
      location,
      problemDescription,
      returnLocation
    } = req.body;

    // 验证必填字段
    if (!partNo) {
      throw BadRequestError('请填写 Part no');
    }

    // 获取当前用户信息
    const user = req.user;
    const recorder = user?.oldEmployeeId || user?.username || 'Unknown';

    const result = await pool.query(`
      INSERT INTO ${K2_DIFF_REGISTRATION_TABLE} (
        registration_date,
        shift,
        part_no,
        grn,
        qty,
        location,
        problem_description,
        registration_time,
        return_location,
        recorder
      ) VALUES (
        (CURRENT_DATE AT TIME ZONE 'Asia/Shanghai')::date,
        CASE WHEN EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai') >= 7 AND EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai') < 19 THEN 'A' ELSE 'C' END,
        $1, $2, $3, $4, $5, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai', $6, $7
      )
      RETURNING *
    `, [
      partNo,
      grn || null,
      qty || 0,
      location || null,
      problemDescription || null,
      returnLocation || null,
      recorder
    ]);

    const row = result.rows[0];
    const registration = {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      shift: row.shift,
      partNo: row.part_no,
      grn: row.grn,
      qty: parseFloat(row.qty) || 0,
      location: row.location,
      problemDescription: row.problem_description,
      registrationTime: formatDateTime(row.registration_time),
      returnLocation: row.return_location,
      recorder: row.recorder
    };

    logInfo('K**差异登记记录创建成功', { id: row.id, partNo, shift: row.shift, recorder });
    success(res, registration, '登记成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 更新登记记录
 */
export const updateRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      partNo,
      grn,
      qty,
      location,
      problemDescription,
      returnLocation
    } = req.body;

    // 检查记录是否存在
    const existing = await pool.query(
      'SELECT * FROM ' + K2_DIFF_REGISTRATION_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    const result = await pool.query(`
      UPDATE ${K2_DIFF_REGISTRATION_TABLE}
      SET
        part_no = COALESCE($1, part_no),
        grn = COALESCE($2, grn),
        qty = COALESCE($3, qty),
        location = COALESCE($4, location),
        problem_description = COALESCE($5, problem_description),
        return_location = COALESCE($6, return_location),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [
      partNo,
      grn,
      qty,
      location,
      problemDescription,
      returnLocation,
      id
    ]);

    const row = result.rows[0];
    const registration = {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      shift: row.shift,
      partNo: row.part_no,
      grn: row.grn,
      qty: parseFloat(row.qty) || 0,
      location: row.location,
      problemDescription: row.problem_description,
      registrationTime: formatDateTime(row.registration_time),
      returnLocation: row.return_location,
      recorder: row.recorder
    };

    success(res, registration, '更新成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 删除登记记录
 */
export const deleteRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查记录是否存在
    const existing = await pool.query(
      'SELECT * FROM ' + K2_DIFF_REGISTRATION_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    await pool.query('DELETE FROM ' + K2_DIFF_REGISTRATION_TABLE + ' WHERE id = $1', [id]);

    logInfo('K**差异登记记录删除成功', { id });
    success(res, null, '删除成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取统计数据
 * - 今日登记数量
 * - 近7天登记数量
 * - 今日各班次数量
 */
export const getStats = async (req, res, next) => {
  try {
    // 获取今天的日期范围（使用上海时间）
    const now = getShanghaiNow();
    const todayStr = formatShanghaiDate(now);

    // 获取7天前的日期
    const sevenDaysAgo = getDaysAgoShanghai(7, now);
    const sevenDaysAgoStr = formatShanghaiDate(sevenDaysAgo);

    // 日期查询使用 Asia/Shanghai 时区转换
    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 今日统计
    const todayResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN shift = 'A' THEN 1 END) as shift_a,
        COUNT(CASE WHEN shift = 'C' THEN 1 END) as shift_c
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      WHERE ${dateConversion} = $1::date
    `, [todayStr]);

    // 近7天统计
    const weekResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN shift = 'A' THEN 1 END) as shift_a,
        COUNT(CASE WHEN shift = 'C' THEN 1 END) as shift_c
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
    `, [sevenDaysAgoStr, todayStr]);

    // 近365天每日统计（支持12个月趋势汇总）
    const oneYearAgoStr = formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    const dailyResult = await pool.query(`
      SELECT
        ${dateConversion} as local_date,
        COUNT(*) as count,
        COUNT(CASE WHEN shift = 'A' THEN 1 END) as shift_a,
        COUNT(CASE WHEN shift = 'C' THEN 1 END) as shift_c
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
      GROUP BY ${dateConversion}
      ORDER BY ${dateConversion} DESC
    `, [oneYearAgoStr, todayStr]);

    const stats = {
      today: {
        total: parseInt(todayResult.rows[0].total) || 0,
        shiftA: parseInt(todayResult.rows[0].shift_a) || 0,
        shiftC: parseInt(todayResult.rows[0].shift_c) || 0
      },
      last7Days: {
        total: parseInt(weekResult.rows[0].total) || 0,
        shiftA: parseInt(weekResult.rows[0].shift_a) || 0,
        shiftC: parseInt(weekResult.rows[0].shift_c) || 0
      },
      daily: dailyResult.rows.map(row => ({
        date: formatDate(row.local_date),
        count: parseInt(row.count) || 0,
        shiftA: parseInt(row.shift_a) || 0,
        shiftC: parseInt(row.shift_c) || 0
      }))
    };

    success(res, stats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取类型统计（数据库聚合，避免前端获取大量原始数据）
 * - 按问题描述分组统计
 */
export const getTypeStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // 默认近7天
    let start = startDate;
    let end = endDate;

    if (!start || !end) {
      const now = getShanghaiNow();
      end = formatShanghaiDate(now);
      const sevenDaysAgo = getDaysAgoShanghai(6, now);
      start = formatShanghaiDate(sevenDaysAgo);
    }

    // 按问题描述分组统计
    // 日期查询使用 Asia/Shanghai 时区转换，确保本地日期匹配正确
    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";
    const result = await pool.query(`
      SELECT
        COALESCE(problem_description, '未分类') as type_name,
        COUNT(*) as count
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
      GROUP BY problem_description
      ORDER BY count DESC
    `, [start, end]);

    const typeStats = result.rows.map(row => ({
      name: row.type_name,
      value: parseInt(row.count) || 0
    }));

    success(res, typeStats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 批量发送邮件通知（根据筛选条件获取所有符合条件的记录）
 */
export const sendBulkNotification = async (req, res, next) => {
  try {
    const { startDate, endDate, partNo, grn, shift } = req.query;

    // 构建查询条件
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`registration_date >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      conditions.push(`registration_date <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }
    if (partNo) {
      conditions.push(`part_no ILIKE $${paramIndex}`);
      params.push(`%${partNo}%`);
      paramIndex++;
    }
    if (grn) {
      conditions.push(`grn ILIKE $${paramIndex}`);
      params.push(`%${grn}%`);
      paramIndex++;
    }
    if (shift) {
      conditions.push(`shift = $${paramIndex}`);
      params.push(shift);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取所有符合条件的记录
    const recordsResult = await pool.query(
      `SELECT * FROM ${K2_DIFF_REGISTRATION_TABLE} ${whereClause} ORDER BY registration_date DESC, registration_time DESC`,
      params
    );

    if (recordsResult.rows.length === 0) {
      throw new AppError('没有找到符合条件的记录', 404);
    }

    const records = recordsResult.rows;

    // 获取邮件配置
    const emailConfig = await getEmailConfig();

    if (!emailConfig.enabled || !emailConfig.recipients) {
      throw new AppError('邮件通知未启用或未配置收件人', 400);
    }

    const { recipients, cc } = emailConfig;

    // 计算日期范围和类型统计（使用记录的登记日期，而非当前日期）
    const dates = records.map(r => new Date(r.registration_date)).sort((a, b) => a - b);
    const recordStartDate = formatDate(dates[0]);
    const recordEndDate = formatDate(dates[dates.length - 1]);
    const dateRange = recordStartDate === recordEndDate ? recordStartDate : `${recordStartDate} ~ ${recordEndDate}`;

    // 构建邮件主题：使用记录的登记日期范围【K**差异登记Report】
    const subject = recordStartDate === recordEndDate
      ? `${recordStartDate}【K**差异登记Report】`
      : `${recordStartDate}到${recordEndDate}【K**差异登记Report】`;

    // 按问题类型统计
    const typeCount = {};
    records.forEach(record => {
      const type = record.problem_description || '其他';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const typeBreakdown = Object.entries(typeCount)
      .map(([type, count]) => `${type}: ${count}个`)
      .join('，');

    // 获取前端网址配置
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';

    // 构建邮件正文
    let body = `HI ALL: 以下是 ${dateRange} K**异常物料，共计${records.length}个，其中${typeBreakdown}，请核查并改善，谢谢！\n\n`;

    // 明细行（显示所有记录）
    body += '\n明细如下：\n';
    records.forEach((record) => {
      const regDate = formatDate(record.registration_date);
      body += `${regDate}|${record.shift}班|${record.part_no}|GRN:${record.grn || '-'}|数量:${record.qty}|问题:${record.problem_description || '-'}\n`;
    });

    body += `\n\n📎 查看详情：${siteUrl}`;
    body += `\n---
此邮件由系统自动发送，请勿回复。`;

    logInfo('K**差异登记批量邮件通知', {
      recordCount: records.length,
      recipients,
      cc
    });

    success(res, {
      count: records.length,
      recipients,
      cc,
      subject,
      body
    }, '邮件已准备');

  } catch (err) {
    next(err);
  }
};

/**
 * 发送邮件通知（单个记录，保留兼容）
 */
export const sendNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 获取记录信息
    const recordResult = await pool.query(
      'SELECT * FROM ' + K2_DIFF_REGISTRATION_TABLE + ' WHERE id = $1',
      [id]
    );

    if (recordResult.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    const record = recordResult.rows[0];

    // 获取邮件配置
    const emailConfig = await getEmailConfig();

    if (!emailConfig.enabled || !emailConfig.recipients) {
      throw new AppError('邮件通知未启用或未配置收件人', 400);
    }

    const { recipients, cc } = emailConfig;

    // 构建邮件内容
    const registrationDate = formatDate(record.registration_date);
    const registrationTime = formatDateTime(record.registration_time);
    const subject = `【K**差异登记通知】${registrationDate} ${record.shift}班 ${record.part_no}`;
    const body = `K**差异登记通知

日期: ${registrationDate}
班次: ${record.shift}班
Part No: ${record.part_no}
GRN: ${record.grn || '-'}
数量: ${record.qty}
位置: ${record.location || '-'}
问题描述: ${record.problem_description || '-'}
退料地点: ${record.return_location || '-'}
记录人: ${record.recorder}
登记时间: ${registrationTime}

---
此邮件由系统自动发送`;

    logInfo('K**差异登记邮件通知', {
      id,
      partNo: record.part_no,
      recipients,
      cc
    });

    success(res, {
      id: record.id,
      partNo: record.part_no,
      recipients,
      cc,
      subject,
      body
    }, '邮件已准备');

  } catch (err) {
    next(err);
  }
};

/**
 * 导出登记记录
 */
export const exportRegistrations = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      shift,
      partNo,
      grn,
      returnLocation,
      recorder
    } = req.query;

    const params = [];
    let whereClause = 'WHERE 1=1';

    // 动态构建查询条件
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND registration_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND registration_date <= $${params.length}`;
    }

    if (shift) {
      params.push(shift);
      whereClause += ` AND shift = $${params.length}`;
    }

    if (partNo) {
      params.push(`%${partNo}%`);
      whereClause += ` AND part_no ILIKE $${params.length}`;
    }

    if (grn) {
      params.push(`%${grn}%`);
      whereClause += ` AND grn ILIKE $${params.length}`;
    }

    if (returnLocation) {
      params.push(`%${returnLocation}%`);
      whereClause += ` AND return_location ILIKE $${params.length}`;
    }

    if (recorder) {
      params.push(`%${recorder}%`);
      whereClause += ` AND recorder ILIKE $${params.length}`;
    }

    // 查询所有符合条件的记录（不分页）
    const result = await pool.query(`
      SELECT
        registration_date,
        shift,
        part_no,
        grn,
        qty,
        location,
        problem_description,
        registration_time,
        return_location,
        recorder
      FROM ${K2_DIFF_REGISTRATION_TABLE}
      ${whereClause}
      ORDER BY registration_time DESC
    `, params);

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Records');

    // 设置列头
    worksheet.columns = [
      { header: '日期', key: 'registrationDate', width: 12 },
      { header: '班次', key: 'shift', width: 8 },
      { header: 'Part No', key: 'partNo', width: 18 },
      { header: 'GRN', key: 'grn', width: 15 },
      { header: '数量', key: 'qty', width: 10 },
      { header: '位置', key: 'location', width: 12 },
      { header: '问题描述', key: 'problemDescription', width: 20 },
      { header: '登记时间', key: 'registrationTime', width: 18 },
      { header: '退料地点', key: 'returnLocation', width: 15 },
      { header: '记录人', key: 'recorder', width: 12 }
    ];

    // 设置表头样式
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF52C41A' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 添加数据行
    result.rows.forEach((row, index) => {
      const dataRow = worksheet.addRow({
        registrationDate: formatDate(row.registration_date),
        shift: row.shift + '班',
        partNo: row.part_no,
        grn: row.grn || '-',
        qty: parseFloat(row.qty) || 0,
        location: row.location || '-',
        problemDescription: row.problem_description || '-',
        registrationTime: formatDateTime(row.registration_time),
        returnLocation: row.return_location || '-',
        recorder: row.recorder
      });

      // 隔行变色
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        });
      }
    });

    // 设置响应头
    const fileName = `K差异登记_${startDate || '开始'}_${endDate || '结束'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));

    // 将工作簿写入响应
    await workbook.xlsx.write(res);
    res.end();

    logInfo('K**差异登记记录导出成功', { recordCount: result.rows.length });

  } catch (err) {
    next(err);
  }
};

export default {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  getStats,
  getTypeStats,
  sendBulkNotification,
  sendNotification,
  exportRegistrations
};
