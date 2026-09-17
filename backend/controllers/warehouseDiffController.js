/**
 * 仓储差异登记 控制器
 * 创建时间: 2026-09-07
 * 描述: 处理仓储差异登记的CRUD、统计分析、批量导入导出等请求
 */
import pool from '../config/db.js';
import ExcelJS from 'exceljs';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logError } from '../utils/logger.js';
import { formatShanghaiDate, getDaysAgoShanghai, getShanghaiNow } from '../utils/dateUtils.js';
import { parseExcel } from '../utils/excelUtils.js';

// 数据表名
const DIFF_TABLE = 'jso_warehouse_diff_registration';
const CONFIG_TABLE = 'jso_k2_diff_config';
const USER_TABLE = 'jso_system_user_management';

/**
 * 根据员工ID获取用户真实姓名（内部函数）
 */
const fetchUserRealNameByEmployeeId = async (employeeId) => {
  if (!employeeId) return null;
  try {
    const result = await pool.query(
      `SELECT real_name FROM ${USER_TABLE} WHERE employee_id = $1 LIMIT 1`,
      [String(employeeId).trim()]
    );
    return result.rows.length > 0 ? result.rows[0].real_name : null;
  } catch (err) {
    logError('查询用户真实姓名失败', err);
    return null;
  }
};

/**
 * 根据员工工号获取用户姓名接口
 */
export const getUserRealNameByEmployeeId = async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      throw BadRequestError('员工工号不能为空');
    }
    const realName = await fetchUserRealNameByEmployeeId(employeeId);
    success(res, { realName: realName || null });
  } catch (err) {
    next(err);
  }
};

// ========== 辅助函数 ==========

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 */
const formatDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) {
      const d = new Date(dateValue);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateValue.split('T')[0];
  }
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

// ========== 配置接口 ==========

/**
 * 获取差异类型列表
 */
export const getDiffTypes = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT config_value FROM ' + CONFIG_TABLE + ' WHERE config_key = $1',
      ['diff_types']
    );

    let diffTypes = [];
    if (result.rows.length > 0 && result.rows[0].config_value) {
      try {
        diffTypes = JSON.parse(result.rows[0].config_value);
      } catch (e) {
        diffTypes = [];
      }
    }

    success(res, diffTypes, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 更新差异类型列表
 */
export const updateDiffTypes = async (req, res, next) => {
  try {
    const { diffTypes } = req.body;

    if (!Array.isArray(diffTypes)) {
      throw BadRequestError('差异类型列表格式错误');
    }

    // 检查配置记录是否存在
    const existing = await pool.query(
      'SELECT id FROM ' + CONFIG_TABLE + ' WHERE config_key = $1',
      ['diff_types']
    );

    const configValue = JSON.stringify(diffTypes);

    if (existing.rows.length > 0) {
      // 更新现有记录
      await pool.query(
        'UPDATE ' + CONFIG_TABLE + ' SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
        [configValue, 'diff_types']
      );
    } else {
      // 新增记录
      await pool.query(
        'INSERT INTO ' + CONFIG_TABLE + ' (config_key, config_value, description) VALUES ($1, $2, $3)',
        ['diff_types', configValue, '差异类型列表']
      );
    }

    logInfo('仓储差异类型配置更新成功', { diffTypes });
    success(res, diffTypes, '更新成功');
  } catch (err) {
    next(err);
  }
};

// ========== CRUD 接口 ==========

/**
 * 获取登记记录列表
 */
export const getRegistrations = async (req, res, next) => {
  try {
    const {
      startDate,
      endDate,
      partNo,
      diffType,
      diffPic,
      recorder,
      search,
      page = 1,
      pageSize = 20,
      sortField = 'registrationDate',
      sortOrder = 'desc'
    } = req.query;

    // 字段映射
    const fieldMap = {
      registrationDate: 'registration_date',
      partNo: 'part_no',
      qty: 'qty',
      diffType: 'diff_type',
      materialId: 'material_id',
      diffPic: 'diff_pic',
      recorder: 'recorder',
      handlingResult: 'handling_result',
      createdAt: 'created_at'
    };

    const dbField = fieldMap[sortField] || 'registration_date';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const params = [];
    let whereClause = 'WHERE 1=1';

    // 日期查询使用 Asia/Shanghai 时区转换
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

    if (partNo) {
      params.push(`%${partNo}%`);
      whereClause += ` AND part_no ILIKE $${params.length}`;
    }

    if (diffType) {
      params.push(diffType);
      whereClause += ` AND diff_type = $${params.length}`;
    }

    if (diffPic) {
      params.push(`%${diffPic}%`);
      whereClause += ` AND diff_pic ILIKE $${params.length}`;
    }

    if (recorder) {
      params.push(`%${recorder}%`);
      whereClause += ` AND recorder ILIKE $${params.length}`;
    }

    // 全局搜索
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (part_no ILIKE $${params.length} OR material_id ILIKE $${params.length})`;
    }

    // 查询列表（关联用户表获取差异PIC，如果数据库中没有则自动从用户表获取）
    const listParams = [...params, parseInt(pageSize), offset];
    const listResult = await pool.query(`
      SELECT
        d.id,
        d.registration_date,
        d.part_no,
        d.qty,
        d.diff_type,
        d.material_id,
        d.diff_pic,
        d.recorder,
        d.handling_result,
        d.remarks,
        d.created_at,
        d.updated_at,
        u.real_name
      FROM ${DIFF_TABLE} d
      LEFT JOIN ${USER_TABLE} u ON d.material_id = u.employee_id
      ${whereClause}
      ORDER BY ${dbField} ${order}, d.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, listParams);

    // 查询总数
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DIFF_TABLE} ${whereClause}
    `, params);

    const registrations = listResult.rows.map((row, index) => ({
      seqNo: parseInt(countResult.rows[0].total) - (parseInt(page) - 1) * parseInt(pageSize) - index,
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      partNo: row.part_no,
      qty: parseFloat(row.qty) || 0,
      diffType: row.diff_type,
      materialId: row.material_id,
      diffPic: row.real_name || null,  // 始终从用户表获取差异PIC（用户表数据更准确）
      recorder: row.recorder,
      handlingResult: row.handling_result,
      remarks: row.remarks,
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
      SELECT d.*, u.real_name
      FROM ${DIFF_TABLE} d
      LEFT JOIN ${USER_TABLE} u ON d.material_id = u.employee_id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    const row = result.rows[0];
    success(res, {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      partNo: row.part_no,
      qty: parseFloat(row.qty) || 0,
      diffType: row.diff_type,
      materialId: row.material_id,
      diffPic: row.real_name || null,  // 始终从用户表获取
      recorder: row.recorder,
      handlingResult: row.handling_result,
      remarks: row.remarks,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, '获取成功');

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
      registrationDate,
      partNo,
      qty,
      diffType,
      diffDescription,
      materialId,
      diffPic,
      handlingResult,
      remarks
    } = req.body;

    // 验证必填字段
    if (!partNo) {
      throw BadRequestError('请填写 P/N');
    }

    // 获取当前用户信息
    const user = req.user;
    const recorder = user?.realName || user?.oldEmployeeId || user?.username || 'Unknown';

    // 使用传入的日期或当前日期
    const regDate = registrationDate || (await getShanghaiNow()).toISOString().split('T')[0];

    const result = await pool.query(`
      INSERT INTO ${DIFF_TABLE} (
        registration_date,
        part_no,
        qty,
        diff_type,
        material_id,
        diff_pic,
        recorder,
        handling_result,
        remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `, [
      regDate,
      partNo,
      qty || 0,
      diffType || null,
      materialId || null,
      diffPic || null,
      recorder,
      handlingResult || null,
      remarks || null
    ]);

    const row = result.rows[0];
    logInfo('仓储差异登记记录创建成功', { id: row.id, partNo, recorder });

    success(res, {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      partNo: row.part_no,
      qty: parseFloat(row.qty) || 0,
      diffType: row.diff_type,
      materialId: row.material_id,
      diffPic: row.diff_pic,
      recorder: row.recorder,
      handlingResult: row.handling_result,
      remarks: row.remarks,
      createdAt: row.created_at
    }, '登记成功');

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
      registrationDate,
      partNo,
      qty,
      diffType,
      diffDescription,
      materialId,
      diffPic,
      handlingResult,
      remarks
    } = req.body;

    // 检查记录是否存在
    const existing = await pool.query(
      'SELECT * FROM ' + DIFF_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    const result = await pool.query(`
      UPDATE ${DIFF_TABLE} SET
        registration_date = COALESCE($1, registration_date),
        part_no = COALESCE($2, part_no),
        qty = COALESCE($3, qty),
        diff_type = COALESCE($4, diff_type),
        material_id = COALESCE($5, material_id),
        diff_pic = COALESCE($6, diff_pic),
        handling_result = COALESCE($7, handling_result),
        remarks = COALESCE($8, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      registrationDate,
      partNo,
      qty,
      diffType,
      materialId,
      diffPic,
      handlingResult,
      remarks,
      id
    ]);

    const row = result.rows[0];
    success(res, {
      id: row.id,
      registrationDate: formatDate(row.registration_date),
      partNo: row.part_no,
      qty: parseFloat(row.qty) || 0,
      diffType: row.diff_type,
      materialId: row.material_id,
      diffPic: row.diff_pic,
      recorder: row.recorder,
      handlingResult: row.handling_result,
      remarks: row.remarks,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }, '更新成功');

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

    const existing = await pool.query(
      'SELECT * FROM ' + DIFF_TABLE + ' WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('记录不存在', 404);
    }

    await pool.query('DELETE FROM ' + DIFF_TABLE + ' WHERE id = $1', [id]);

    logInfo('仓储差异登记记录删除成功', { id });
    success(res, null, '删除成功');

  } catch (err) {
    next(err);
  }
};

// ========== 统计接口 ==========

/**
 * 获取统计数据（今日、本周、本月、待处理）
 */
export const getStats = async (req, res, next) => {
  try {
    const now = getShanghaiNow();
    const todayStr = formatShanghaiDate(now);

    // 获取本周第一天（周一）
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekStartStr = formatShanghaiDate(weekStart);

    // 获取本月第一天
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = formatShanghaiDate(monthStart);

    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 今日统计
    const todayResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DIFF_TABLE}
      WHERE ${dateConversion} = $1::date
    `, [todayStr]);

    // 本周统计
    const weekResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DIFF_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
    `, [weekStartStr, todayStr]);

    // 本月统计
    const monthResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DIFF_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
    `, [monthStartStr, todayStr]);

    // 待处理统计（handling_result 为空）
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as total FROM ${DIFF_TABLE}
      WHERE handling_result IS NULL OR handling_result = ''
    `);

    success(res, {
      today: parseInt(todayResult.rows[0].total) || 0,
      week: parseInt(weekResult.rows[0].total) || 0,
      month: parseInt(monthResult.rows[0].total) || 0,
      pending: parseInt(pendingResult.rows[0].total) || 0
    }, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 按差异类型统计
 */
export const getTypeStats = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    const now = getShanghaiNow();
    let start = startDate;
    let end = endDate;

    // 如果没有指定日期范围，根据period自动设置
    if (!start || !end) {
      end = formatShanghaiDate(now);

      if (period === 'day') {
        start = end;
      } else if (period === 'week') {
        const sevenDaysAgo = getDaysAgoShanghai(6, now);
        start = formatShanghaiDate(sevenDaysAgo);
      } else if (period === 'month') {
        // 默认查近6个月
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        start = formatShanghaiDate(sixMonthsAgo);
      } else {
        // year - 查所有数据
        start = '2020-01-01';
      }
    }

    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 按类型分组统计
    let sql = `
      SELECT
        COALESCE(diff_type, '未分类') as type_name,
        COUNT(*) as count
      FROM jso_warehouse_diff_registration
    `;
    const params = [];

    if (start && end) {
      sql += ` WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date`;
      params.push(start, end);
    }

    sql += ` GROUP BY diff_type ORDER BY count DESC`;

    const typeResult = await pool.query(sql, params);

    const typeStats = typeResult.rows.map(row => ({
      name: row.type_name,
      value: parseInt(row.count) || 0
    }));

    success(res, typeStats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 按PIC排名统计
 */
export const getPicStats = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let start = startDate;
    let end = endDate;

    // 如果没有指定日期范围，根据period自动设置
    if (!start || !end) {
      const now = getShanghaiNow();
      end = formatShanghaiDate(now);

      if (period === 'day') {
        start = end;
      } else if (period === 'week') {
        const sevenDaysAgo = getDaysAgoShanghai(6, now);
        start = formatShanghaiDate(sevenDaysAgo);
      } else if (period === 'month') {
        // 月份：默认查近6个月，确保有数据
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        start = formatShanghaiDate(sixMonthsAgo);
      } else {
        // 年份：查所有数据
        start = '2020-01-01';
      }
    }

    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 按PIC分组统计，取TOP10
    const picResult = await pool.query(`
      SELECT
        COALESCE(diff_pic, '未分配') as pic_name,
        COUNT(*) as count
      FROM ${DIFF_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
        AND diff_pic IS NOT NULL AND diff_pic != ''
      GROUP BY diff_pic
      ORDER BY count DESC
      LIMIT 10
    `, [start, end]);

    const picStats = picResult.rows.map(row => ({
      name: row.pic_name,
      value: parseInt(row.count) || 0
    }));

    success(res, picStats, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 趋势统计（支持天/周/月/年）
 */
export const getTrendStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    const now = getShanghaiNow();
    const todayStr = formatShanghaiDate(now);
    let startDate, xAxisData = [];

    // 根据周期确定日期范围和标签
    if (period === 'day') {
      // 近14天
      startDate = getDaysAgoShanghai(13, now);
      for (let i = 13; i >= 0; i--) {
        const d = getDaysAgoShanghai(i, now);
        xAxisData.push(formatShanghaiDate(d));
      }
    } else if (period === 'week') {
      // 近14周
      startDate = getDaysAgoShanghai(13 * 7, now);
      for (let w = 13; w >= 0; w--) {
        const weekStart = getDaysAgoShanghai(w * 7, now);
        const weekNum = getWeekNumber(weekStart);
        xAxisData.push(`W${weekNum}`);
      }
    } else if (period === 'month') {
      // 近12个月 - 使用 YYYY-MM 格式与数据库保持一致
      // 从数据库最早的月份开始，确保显示所有数据
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      // 如果12个月前早于2025年，从2025年开始
      if (startDate.getFullYear() < 2025) {
        startDate = new Date(2025, 0, 1);
      }
      for (let m = 0; ; m++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
        if (d > now) break;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        xAxisData.push(`${year}-${month}`);
        if (xAxisData.length >= 12) break;
      }
    } else {
      // year - 近5年
      startDate = new Date(now.getFullYear() - 4, 0, 1);
      for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
        xAxisData.push(String(y));
      }
    }

    const startStr = formatShanghaiDate(startDate);
    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    // 查询数据
    let groupBy, dateFormat;
    if (period === 'day') {
      groupBy = dateConversion;
      dateFormat = dateConversion;
    } else if (period === 'week') {
      groupBy = "DATE_TRUNC('week', registration_date AT TIME ZONE 'Asia/Shanghai')";
      dateFormat = "TO_CHAR(DATE_TRUNC('week', registration_date AT TIME ZONE 'Asia/Shanghai'), 'YYYY-IYYY-I')";
    } else if (period === 'month') {
      groupBy = "DATE_TRUNC('month', registration_date AT TIME ZONE 'Asia/Shanghai')";
      dateFormat = "TO_CHAR(DATE_TRUNC('month', registration_date AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM')";
    } else {
      groupBy = "DATE_TRUNC('year', registration_date AT TIME ZONE 'Asia/Shanghai')";
      dateFormat = "TO_CHAR(DATE_TRUNC('year', registration_date AT TIME ZONE 'Asia/Shanghai'), 'YYYY')";
    }

    const result = await pool.query(`
      SELECT
        ${dateFormat} as period_key,
        COUNT(*) as count
      FROM ${DIFF_TABLE}
      WHERE ${dateConversion} >= $1::date AND ${dateConversion} <= $2::date
      GROUP BY ${groupBy}
      ORDER BY ${groupBy}
    `, [startStr, todayStr]);

    // 构建数据映射
    const dataMap = {};
    result.rows.forEach(row => {
      dataMap[row.period_key] = parseInt(row.count) || 0;
    });

    // 格式化X轴数据
    let chartData;
    if (period === 'week') {
      chartData = xAxisData.map(label => {
        // 从标签中提取周数来匹配
        const weekNum = label.replace('W', '');
        const matchKey = Object.keys(dataMap).find(k => k.includes(`-${weekNum}-`));
        return {
          label,
          value: matchKey ? dataMap[matchKey] : 0
        };
      });
    } else {
      chartData = xAxisData.map(label => ({
        label,
        value: dataMap[label] || 0
      }));
    }

    success(res, {
      xAxis: chartData.map(d => d.label),
      data: chartData.map(d => d.value)
    }, '获取成功');

  } catch (err) {
    next(err);
  }
};

/**
 * 获取周数
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// ========== 导入导出接口 ==========

/**
 * 转换Excel日期序列号为标准日期格式 YYYY-MM-DD
 */
const convertExcelDate = (excelDate) => {
  if (!excelDate) return null;
  // 如果是数字类型（Excel序列号）
  if (typeof excelDate === 'number') {
    // Excel日期序列号从1900年1月1日开始，需要减1天因为Excel多算了1900年2月29日
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // 如果是字符串
  const dateStr = String(excelDate);
  if (dateStr.includes('-') || dateStr.includes('/')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return dateStr;
};

/**
 * 批量导入登记记录
 */
export const importRegistrations = async (req, res, next) => {
  try {
    if (!req.file) {
      throw BadRequestError('请上传Excel文件');
    }

    const rows = parseExcel(req.file.buffer);

    if (!rows || rows.length === 0) {
      throw BadRequestError('Excel文件为空');
    }

    // 调试：打印实际列名
    console.log('=== 导入调试信息 ===');
    console.log('总行数:', rows.length);
    if (rows.length > 0) {
      console.log('第一行列名:', Object.keys(rows[0]));
      console.log('第一行数据:', JSON.stringify(rows[0]));
    }
    console.log('====================');

    // 获取当前用户信息
    const user = req.user;
    const recorder = user?.realName || user?.oldEmployeeId || user?.username || 'Unknown';

    // 收集所有需要查询的员工工号（匹配列名: ID(填员工工号自动带出PIC)）
    const employeeIds = new Set();
    for (const row of rows) {
      const idColumn = row['ID(填员工工号自动带出PIC)'] || row['ID'];
      if (idColumn) {
        employeeIds.add(String(idColumn).trim());
      }
    }
    console.log('收集到的员工工号数量:', employeeIds.size, Array.from(employeeIds).slice(0, 5));

    // 批量查询员工姓名
    const userNameMap = {};
    if (employeeIds.size > 0) {
      const result = await pool.query(
        `SELECT employee_id, real_name FROM ${USER_TABLE} WHERE employee_id = ANY($1)`,
        [Array.from(employeeIds)]
      );
      for (const r of result.rows) {
        userNameMap[r.employee_id] = r.real_name;
      }
    }

    // 批量插入
    const errors = [];
    const inserted = [];
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchPromises = batch.map((row, index) => {
        const rowNum = i + index + 2;
        return (async () => {
          try {
            // 必填字段检查
            const partNo = String(row['P/N'] || row['PN'] || row['part_no'] || '').trim();
            if (!partNo) {
              return { row: rowNum, message: 'P/N 不能为空', success: false };
            }

            // 转换日期，默认为今天
            const regDateRaw = row['日期'] || row['date'] || null;
            const registrationDate = regDateRaw ? convertExcelDate(regDateRaw) : new Date().toISOString().split('T')[0];

            const qty = parseFloat(row['Qty'] || row['qty'] || row['数量'] || 0);
            const diffType = String(row['差异类型'] || row['diff_type'] || row['类型'] || '').trim() || null;

            // 获取员工工号（匹配列名: ID(填员工工号自动带出PIC)）
            let materialId = '';
            const rowKeys = Object.keys(row);
            for (const key of rowKeys) {
              if (key === 'ID(填员工工号自动带出PIC)' || key === 'ID') {
                materialId = String(row[key] || '').trim();
                break;
              }
            }
            materialId = materialId || null;

            // 差异PIC：模板里已经没有这列了，直接根据materialId自动带出
            let diffPic = null;
            if (materialId && userNameMap[materialId]) {
              diffPic = userNameMap[materialId];
            }

            // 调试：打印每个row的materialId和diffPic
            console.log(`行${rowNum}: materialId=${materialId}, diffPic=${diffPic}, userNameMap[materialId]=${userNameMap[materialId] || 'NOT_FOUND'}`);

            const handlingResult = String(row['处理结果'] || row['handling_result'] || '').trim() || null;
            const remarks = String(row['备注'] || row['remarks'] || '').trim() || null;

            return {
              row: rowNum,
              registrationDate,
              partNo,
              qty,
              diffType,
              materialId,
              diffPic,
              handlingResult,
              remarks,
              success: true
            };
          } catch (err) {
            return { row: rowNum, message: err.message, success: false };
          }
        })();
      });

      const batchResults = await Promise.all(batchPromises);

      // 分离成功和失败的记录
      const successRows = [];
      for (const r of batchResults) {
        if (r.success) {
          successRows.push(r);
        } else {
          errors.push({ row: r.row, message: r.message });
        }
      }

      // 批量插入成功的记录
      if (successRows.length > 0) {
        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const r of successRows) {
          values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
          params.push(
            r.registrationDate,  // 可以是 null 或日期字符串
            r.partNo,
            r.qty,
            r.diffType,
            r.materialId,
            r.diffPic,
            recorder,
            r.handlingResult,
            r.remarks
          );
        }

        const insertSql = `
          INSERT INTO ${DIFF_TABLE} (
            registration_date,
            part_no,
            qty,
            diff_type,
            material_id,
            diff_pic,
            recorder,
            handling_result,
            remarks
          ) VALUES ${values.join(', ')}
        `;

        try {
          const result = await pool.query(insertSql, params);
          for (let j = 0; j < successRows.length; j++) {
            inserted.push({ row: successRows[j].row, id: j + 1 });
          }
        } catch (insertErr) {
          for (const r of successRows) {
            errors.push({ row: r.row, message: insertErr.message });
          }
        }
      }
    }

    logInfo('仓储差异登记批量导入完成', {
      total: rows.length,
      success: inserted.length,
      failed: errors.length,
      recorder
    });

    success(res, {
      total: rows.length,
      success: inserted.length,
      failed: errors.length,
      errors
    }, `导入完成：成功 ${inserted.length} 条，失败 ${errors.length} 条`);

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
      partNo,
      diffType,
      diffPic,
      recorder,
      search
    } = req.query;

    const params = [];
    let whereClause = 'WHERE 1=1';
    const dateConversion = "DATE(registration_date AT TIME ZONE 'Asia/Shanghai')";

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND ${dateConversion} >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND ${dateConversion} <= $${params.length}::date`;
    }

    if (partNo) {
      params.push(`%${partNo}%`);
      whereClause += ` AND part_no ILIKE $${params.length}`;
    }

    if (diffType) {
      params.push(diffType);
      whereClause += ` AND diff_type = $${params.length}`;
    }

    if (diffPic) {
      params.push(`%${diffPic}%`);
      whereClause += ` AND diff_pic ILIKE $${params.length}`;
    }

    if (recorder) {
      params.push(`%${recorder}%`);
      whereClause += ` AND recorder ILIKE $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (part_no ILIKE $${params.length} OR material_id ILIKE $${params.length})`;
    }

    const result = await pool.query(`
      SELECT
        registration_date,
        part_no,
        qty,
        diff_type,
        material_id,
        diff_pic,
        recorder,
        handling_result,
        remarks,
        created_at
      FROM ${DIFF_TABLE}
      ${whereClause}
      ORDER BY registration_date DESC, created_at DESC
    `, params);

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('差异登记记录');

    // 设置列头
    worksheet.columns = [
      { header: '序号', key: 'seqNo', width: 8 },
      { header: '日期', key: 'registrationDate', width: 12 },
      { header: 'P/N', key: 'partNo', width: 18 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: '差异类型', key: 'diffType', width: 15 },
      { header: 'ID', key: 'materialId', width: 15 },
      { header: '差异PIC', key: 'diffPic', width: 12 },
      { header: '登记人', key: 'recorder', width: 12 },
      { header: '处理结果', key: 'handlingResult', width: 25 },
      { header: '备注', key: 'remarks', width: 20 }
    ];

    // 设置表头样式
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF9500' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 添加数据行
    result.rows.forEach((row, index) => {
      worksheet.addRow({
        seqNo: index + 1,
        registrationDate: formatDate(row.registration_date),
        partNo: row.part_no,
        qty: parseFloat(row.qty) || 0,
        diffType: row.diff_type || '-',
        materialId: row.material_id || '-',
        diffPic: row.diff_pic || '-',
        recorder: row.recorder,
        handlingResult: row.handling_result || '-',
        remarks: row.remarks || '-'
      });
    });

    // 设置响应头
    const fileName = `仓储差异登记_${startDate || '开始'}_${endDate || '结束'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(fileName));

    await workbook.xlsx.write(res);
    res.end();

    logInfo('仓储差异登记记录导出成功', { recordCount: result.rows.length });

  } catch (err) {
    next(err);
  }
};

/**
 * 下载导入模板
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('差异登记模板');

    // 设置列头
    worksheet.columns = [
      { header: '日期', key: 'date', width: 12 },
      { header: 'P/N', key: 'partNo', width: 18 },
      { header: 'Qty', key: 'qty', width: 10 },
      { header: '差异类型', key: 'diffType', width: 15 },
      { header: 'ID', key: 'materialId', width: 15 },
      { header: '处理结果', key: 'handlingResult', width: 25 },
      { header: '备注', key: 'remarks', width: 20 }
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

    // 添加示例行
    const today = formatShanghaiDate(getShanghaiNow());
    worksheet.addRow({
      date: today,
      partNo: '示例物料号',
      qty: 100,
      diffType: '收料差异',
      materialId: '10001',
      handlingResult: '已处理',
      remarks: '填写ID列后，差异PIC自动带出'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('仓储差异登记导入模板.xlsx'));

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    next(err);
  }
};

// ========== 导出 ==========

export default {
  // 配置
  getDiffTypes,
  updateDiffTypes,
  // CRUD
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  // 统计
  getStats,
  getTypeStats,
  getPicStats,
  getTrendStats,
  // 导入导出
  importRegistrations,
  exportRegistrations,
  downloadTemplate
};
