/**
 * Dashboard 控制器
 * 处理仪表盘相关的业务逻辑
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { USER_TABLE, PLANT_TABLE, DEPT_TABLE, TEMPORARY_LEAVE_TABLE, TEMPORARY_OVERTIME_TABLE, SCHEDULE_TABLE, FORMAL_LEAVE_TABLE, RESIGNATION_TRANSFER_TABLE } from '../config/db_constants.js';
import { success, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError } from '../middlewares/errorHandler.js';
import { logInfo, logDebug } from '../utils/logger.js';

/**
 * 获取仪表盘统计数据
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { plantId, departmentId } = req.query;
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');

    // 并行查询多个统计数据
    const [
      employeeResult,
      overtimeResult,
      leaveResult,
      pendingApprovalsResult,
      resignationResult
    ] = await Promise.all([
      // 1. 在职员工数
      (async () => {
        let userWhere = `WHERE u.status = 'active' AND (u.leave_date IS NULL OR u.leave_date > '${today}')`;
        const userParams = [];
        if (plantId) {
          userWhere += ` AND u.plant_id = $1`;
          userParams.push(plantId);
        }
        if (departmentId) {
          userWhere += ` AND u.department_id = $${userParams.length + 1}`;
          userParams.push(departmentId);
        }
        return pool.query(
          `SELECT COUNT(*) as count FROM ${USER_TABLE} u ${userWhere}`,
          userParams
        );
      })(),

      // 2. 本月加班工时
      pool.query(`
        SELECT COALESCE(SUM(hours), 0) as total
        FROM ${TEMPORARY_OVERTIME_TABLE}
        WHERE status = 'approved' AND overtime_date BETWEEN $1 AND $2
      `, [monthStart, monthEnd]),

      // 3. 本月请假人次
      pool.query(`
        SELECT COUNT(*) as count
        FROM ${TEMPORARY_LEAVE_TABLE}
        WHERE status = 'approved' AND start_date BETWEEN $1 AND $2
      `, [monthStart, monthEnd]),

      // 4. 待审批数量
      (async () => {
        const [leavePending, overtimePending] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM ${TEMPORARY_LEAVE_TABLE} WHERE status = 'pending'`),
          pool.query(`SELECT COUNT(*) as count FROM ${TEMPORARY_OVERTIME_TABLE} WHERE status = 'pending'`)
        ]);
        return {
          rows: [{ count: parseInt(leavePending.rows[0].count) + parseInt(overtimePending.rows[0].count) }]
        };
      })(),

      // 5. 本月入职/离职人数
      pool.query(`
        SELECT
          SUM(CASE WHEN hire_date BETWEEN $1 AND $2 THEN 1 ELSE 0 END) as hired,
          SUM(CASE WHEN leave_date BETWEEN $1 AND $2 THEN 1 ELSE 0 END) as resigned
        FROM ${USER_TABLE}
      `, [monthStart, monthEnd])
    ]);

    const stats = {
      activeEmployees: parseInt(employeeResult.rows[0].count),
      monthlyOvertimeHours: parseFloat(overtimeResult.rows[0].total),
      monthlyLeaveCount: parseInt(leaveResult.rows[0].count),
      pendingApprovals: parseInt(pendingApprovalsResult.rows[0].count),
      monthlyHired: parseInt(resignationResult.rows[0].hired) || 0,
      monthlyResigned: parseInt(resignationResult.rows[0].resigned) || 0,
      updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    logDebug('获取仪表盘统计数据', stats);
    success(res, stats, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取今日排班概览
 */
export const getTodaySchedule = async (req, res, next) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const now = dayjs();
    const hour = now.hour();

    // 获取今日所有排班，按班次分组
    const scheduleResult = await pool.query(`
      SELECT
        s.shift,
        COUNT(*) as employee_count
      FROM ${SCHEDULE_TABLE} s
      WHERE s.schedule_date = $1
      GROUP BY s.shift
      ORDER BY s.shift
    `, [today]);

    // 获取各状态员工数量
    const employeeStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN leave_date IS NULL OR leave_date > $1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN leave_date IS NOT NULL AND leave_date <= $1 THEN 1 ELSE 0 END) as on_leave
      FROM ${USER_TABLE}
      WHERE status = 'active'
    `, [today]);

    const schedules = scheduleResult.rows.map(row => {
      let status = 'pending';
      let statusText = '待开始';

      // 判断班次状态
      if (row.shift.includes('早') || row.shift.includes('Day') || row.shift.includes('日班')) {
        if (hour >= 8 && hour < 17) {
          status = 'ongoing';
          statusText = '进行中';
        } else if (hour >= 17) {
          status = 'completed';
          statusText = '已完成';
        }
      } else if (row.shift.includes('晚') || row.shift.includes('Night') || row.shift.includes('夜班')) {
        if (hour >= 17 && hour < 24) {
          status = 'ongoing';
          statusText = '进行中';
        } else if (hour >= 24 || hour < 2) {
          status = 'completed';
          statusText = '已完成';
        }
      } else if (row.shift.includes('休') || row.shift.includes('Off')) {
        status = 'off';
        statusText = '休息日';
      }

      return {
        shift: row.shift,
        employeeCount: parseInt(row.employee_count),
        status,
        statusText,
      };
    });

    const employeeStats = employeeStatsResult.rows[0];

    success(res, {
      date: today,
      schedules,
      employeeStats: {
        total: parseInt(employeeStats.total) || 0,
        active: parseInt(employeeStats.active) || 0,
        onLeave: parseInt(employeeStats.on_leave) || 0,
      },
    }, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取待审批列表
 */
export const getPendingApprovals = async (req, res, next) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 获取最近待审批申请
    const [leaveResult, overtimeResult] = await Promise.all([
      pool.query(`
        SELECT
          'leave' as type,
          tl.id,
          u.real_name as employeeName,
          tl.leave_type as leaveType,
          tl.hours,
          tl.start_date as startDate,
          tl.end_date as endDate,
          tl.created_at as createdAt,
          tl.status
        FROM ${TEMPORARY_LEAVE_TABLE} tl
        JOIN ${USER_TABLE} u ON tl.employee_id = u.id
        WHERE tl.status = 'pending'
        ORDER BY tl.created_at DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), offset]),

      pool.query(`
        SELECT
          'overtime' as type,
          to_.id,
          u.real_name as employeeName,
          '加班申请' as leaveType,
          to_.hours,
          to_.overtime_date as startDate,
          to_.overtime_date as endDate,
          to_.created_at as createdAt,
          to_.status
        FROM ${TEMPORARY_OVERTIME_TABLE} to_
        JOIN ${USER_TABLE} u ON to_.employee_id = u.id
        WHERE to_.status = 'pending'
        ORDER BY to_.created_at DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), offset])
    ]);

    // 合并并排序
    const approvals = [...leaveResult.rows, ...overtimeResult.rows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, parseInt(limit));

    // 获取总数
    const [leaveCountResult, overtimeCountResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM ${TEMPORARY_LEAVE_TABLE} WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) as count FROM ${TEMPORARY_OVERTIME_TABLE} WHERE status = 'pending'`)
    ]);

    const total = parseInt(leaveCountResult.rows[0].count) + parseInt(overtimeCountResult.rows[0].count);

    paginated(res, { items: approvals, total, page: parseInt(page), pageSize: parseInt(limit) }, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取工时趋势数据
 */
export const getWorkingHoursTrend = async (req, res, next) => {
  try {
    const { plantId, departmentId, months = 6 } = req.query;
    const endMonth = dayjs();
    const startMonth = endMonth.subtract(parseInt(months) - 1, 'month');

    // 生成月份列表
    const monthList = [];
    let currentMonth = startMonth;
    while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
      monthList.push(currentMonth.format('YYYY-MM'));
      currentMonth = currentMonth.add(1, 'month');
    }

    // 查询每月工时数据
    const workingHoursData = await Promise.all(monthList.map(async (month) => {
      const monthStart = dayjs(month).startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs(month).endOf('month').format('YYYY-MM-DD');

      const [scheduleResult, overtimeResult, leaveResult] = await Promise.all([
        // 排班工时（从排班表汇总）
        pool.query(`
          SELECT COALESCE(SUM(
            CASE
              WHEN s.shift LIKE '%早%' OR s.shift LIKE '%日%' THEN 8
              WHEN s.shift LIKE '%晚%' OR s.shift LIKE '%夜%' THEN 12
              ELSE 8
            END
          ), 0) as hours
          FROM ${SCHEDULE_TABLE} s
          JOIN ${USER_TABLE} u ON s.employee_id = u.id
          WHERE s.schedule_date BETWEEN $1 AND $2
            AND u.status = 'active'
        `, [monthStart, monthEnd]),

        // 加班工时
        pool.query(`
          SELECT COALESCE(SUM(hours), 0) as hours
          FROM ${TEMPORARY_OVERTIME_TABLE}
          WHERE status = 'approved' AND overtime_date BETWEEN $1 AND $2
        `, [monthStart, monthEnd]),

        // 请假工时
        pool.query(`
          SELECT COALESCE(SUM(hours), 0) as hours
          FROM ${TEMPORARY_LEAVE_TABLE}
          WHERE status = 'approved' AND start_date BETWEEN $1 AND $2
        `, [monthStart, monthEnd])
      ]);

      const scheduleHours = parseFloat(scheduleResult.rows[0].hours) || 0;
      const overtimeHours = parseFloat(overtimeResult.rows[0].hours) || 0;
      const leaveHours = parseFloat(leaveResult.rows[0].hours) || 0;

      return {
        month,
        scheduleHours,
        overtimeHours,
        leaveHours,
        netHours: scheduleHours + overtimeHours - leaveHours,
      };
    }));

    success(res, {
      months: monthList,
      data: workingHoursData,
    }, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取部门工时分布
 */
export const getDepartmentDistribution = async (req, res, next) => {
  try {
    const { plantId, month } = req.query;
    const queryMonth = month || dayjs().format('YYYY-MM');
    const monthStart = dayjs(queryMonth).startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs(queryMonth).endOf('month').format('YYYY-MM-DD');

    // 按部门汇总工时
    const result = await pool.query(`
      SELECT
        d.id as department_id,
        d.name as department_name,
        COUNT(DISTINCT u.id) as employee_count,
        COALESCE(SUM(
          CASE
            WHEN s.shift LIKE '%早%' OR s.shift LIKE '%日%' THEN 8
            WHEN s.shift LIKE '%晚%' OR s.shift LIKE '%夜%' THEN 12
            ELSE 8
          END
        ), 0) as schedule_hours,
        COALESCE(SUM(o.hours), 0) as overtime_hours,
        COALESCE(SUM(l.hours), 0) as leave_hours
      FROM ${DEPT_TABLE} d
      LEFT JOIN ${USER_TABLE} u ON u.department_id = d.id AND u.status = 'active'
      LEFT JOIN ${SCHEDULE_TABLE} s ON s.employee_id = u.id AND s.schedule_date BETWEEN $1 AND $2
      LEFT JOIN ${TEMPORARY_OVERTIME_TABLE} o ON o.employee_id = u.id AND o.status = 'approved' AND o.overtime_date BETWEEN $1 AND $2
      LEFT JOIN ${TEMPORARY_LEAVE_TABLE} l ON l.employee_id = u.id AND l.status = 'approved' AND l.start_date BETWEEN $1 AND $2
      GROUP BY d.id, d.name
      ORDER BY d.name
    `, [monthStart, monthEnd]);

    const departments = result.rows.map(row => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      employeeCount: parseInt(row.employee_count) || 0,
      scheduleHours: parseFloat(row.schedule_hours) || 0,
      overtimeHours: parseFloat(row.overtime_hours) || 0,
      leaveHours: parseFloat(row.leave_hours) || 0,
      netHours: (parseFloat(row.schedule_hours) || 0) + (parseFloat(row.overtime_hours) || 0) - (parseFloat(row.leave_hours) || 0),
    }));

    success(res, {
      month: queryMonth,
      departments,
    }, '获取成功');
  } catch (err) {
    next(err);
  }
};

export default {
  getDashboardStats,
  getTodaySchedule,
  getPendingApprovals,
  getWorkingHoursTrend,
  getDepartmentDistribution,
};
