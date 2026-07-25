/**
 * 排班控制器
 * 处理排班相关的业务逻辑
 */
import pool from '../config/db.js';
import dayjs from 'dayjs';
import XLSX from 'xlsx';
import { USER_TABLE, PLANT_TABLE, DEPT_TABLE, TEMPORARY_OVERTIME_TABLE, TEMPORARY_LEAVE_TABLE, SHIFT_DURATION_RULES_TABLE, SCHEDULE_TABLE } from '../config/db_constants.js';
import { checkBreak7Rest1 } from '../utils/scheduleUtils.js';
import { handleScheduleUpload } from '../services/batchUploadService.js';
import { success, created, error as httpError, paginated } from '../utils/responseHelper.js';
import { AppError, BadRequestError, NotFoundError } from '../middlewares/errorHandler.js';
import { logInfo, logWarn, logError, logDatabase } from '../utils/logger.js';

/**
 * 获取员工排班和工时统计
 */
export const getEmployeesWithSchedule = async (req, res, next) => {
  try {
    const { plantId, departmentId, startDate, endDate } = req.query;

    // 1. 获取所有员工（不包括超级管理员）
    let userWhere = ' WHERE u.username != \'admin\'';
    const userParams = [];
    let currentParamIndex = 1;

    // 确定查询的日期范围，默认当前月
    const now = dayjs();
    const monthStart = now.startOf('month').format('YYYY-MM-DD');
    const monthEnd = now.endOf('month').format('YYYY-MM-DD');
    const queryStart = startDate || monthStart;
    const queryEnd = endDate || monthEnd;

    if (plantId) {
      userWhere += ` AND u.plant_id = $${currentParamIndex}`;
      userParams.push(plantId);
      currentParamIndex++;
    }

    if (departmentId) {
      userWhere += ` AND u.department_id = $${currentParamIndex}`;
      userParams.push(departmentId);
      currentParamIndex++;
    }

    // 排除离职员工：如果员工的离职日期早于或等于查询结束日期，则不显示
    userWhere += ` AND (u.leave_date IS NULL OR u.leave_date > $${currentParamIndex})`;
    userParams.push(queryEnd);
    currentParamIndex++;

    const usersResult = await pool.query(`
      SELECT u.*, p.name as plant_name, d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      ${userWhere}
      ORDER BY u.id
    `, userParams);

    const userPlantDeptMap = {};
    usersResult.rows.forEach(user => {
      userPlantDeptMap[user.id] = {
        plantId: user.plant_id,
        departmentId: user.department_id,
      };
    });

    // 3. 获取班次时长规则
    const shiftDurationRulesResult = await pool.query(
      `SELECT plant_id, department_id, shift_name, duration_hours, description FROM ${SHIFT_DURATION_RULES_TABLE} WHERE status = 'active'`
    );
    const shiftDurationMap = {};
    shiftDurationRulesResult.rows.forEach(rule => {
      const key = `${rule.plant_id}-${rule.department_id}-${rule.shift_name}`;
      shiftDurationMap[key] = {
        durationHours: parseFloat(rule.duration_hours),
        description: rule.description,
      };
    });

    // 4. 获取排班数据 - 扩大范围，确保能计算跨视图的连续工作（前后各2周）
    const extendedStart = dayjs(queryStart).subtract(14, 'day').format('YYYY-MM-DD');
    const extendedEnd = dayjs(queryEnd).add(14, 'day').format('YYYY-MM-DD');
    const scheduleResult = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE}
      WHERE schedule_date BETWEEN $1 AND $2
      ORDER BY schedule_date`,
    [extendedStart, extendedEnd]);

    const scheduleMap = {};
    scheduleResult.rows.forEach(row => {
      if (!scheduleMap[row.employee_id]) {
        scheduleMap[row.employee_id] = {};
      }

      const employeeInfo = userPlantDeptMap[row.employee_id];
      let durationHours = 0;
      let description = '';

      if (employeeInfo) {
        const shiftKey = `${employeeInfo.plantId}-${employeeInfo.departmentId}-${row.shift_name}`;
        const shiftRule = shiftDurationMap[shiftKey];
        if (shiftRule) {
          durationHours = shiftRule.durationHours;
          description = shiftRule.description;
        }
      }

      scheduleMap[row.employee_id][dayjs(row.schedule_date).format('YYYY-MM-DD')] = {
        shift: row.shift,
        specialStatus: row.special_status,
        durationHours: durationHours,
        description: description,
        tempMatter: {
          type: row.temp_matter_type,
          startTime: row.temp_matter_start_time,
          endTime: row.temp_matter_end_time,
          reason: row.temp_matter_reason,
          proof: row.temp_matter_proof
        }
      };
    });

    // 4. 获取临时加班工时（当月已批准的）
    const overtimeResult = await pool.query(`
      SELECT employee_id, SUM(hours) as total_hours
      FROM ${TEMPORARY_OVERTIME_TABLE}
      WHERE status = 'approved'
        AND overtime_date BETWEEN $1 AND $2
      GROUP BY employee_id
    `, [monthStart, monthEnd]);

    const overtimeMap = {};
    overtimeResult.rows.forEach(row => {
      overtimeMap[row.employee_id] = parseFloat(row.total_hours) || 0;
    });

    // 5. 获取临时请假工时（当月已批准的）
    const leaveResult = await pool.query(`
      SELECT employee_id, SUM(hours) as total_hours
      FROM ${TEMPORARY_LEAVE_TABLE}
      WHERE status = 'approved'
        AND start_date BETWEEN $1 AND $2
      GROUP BY employee_id
    `, [monthStart, monthEnd]);

    const leaveMap = {};
    leaveResult.rows.forEach(row => {
      leaveMap[row.employee_id] = parseFloat(row.total_hours) || 0;
    });

    // 6. 计算每个员工的总工时（不过滤，让前端来过滤）
    const employees = await Promise.all(usersResult.rows.map(async user => {
      // 计算当月排班工时
      let scheduleHours = 0;
      const userSchedule = scheduleMap[user.id] || {};

      // 遍历日期范围内的每一天
      let currentDate = dayjs(queryStart);
      const end = dayjs(queryEnd);

      while (currentDate.isBefore(end) || currentDate.isSame(end)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const daySchedule = userSchedule[dateStr];
        if (daySchedule && daySchedule.shift) {
          const hours = daySchedule.durationHours || 0;
          scheduleHours += hours;
        }
        currentDate = currentDate.add(1, 'day');
      }

      // 总工时 = 当月排班工时 + 临时加班 - 临时请假
      const overtimeHours = overtimeMap[user.id] || 0;
      const leaveHours = leaveMap[user.id] || 0;
      const totalHours = scheduleHours + overtimeHours - leaveHours;

      // 检查破7休1
      const break7Rest1Violations = await checkBreak7Rest1(user.id, queryStart, queryEnd, pool);

      return {
        id: user.id,
        name: user.real_name,
        sap: user.sap_employee_id,
        oldEmployeeId: user.old_employee_id,
        plantId: user.plant_id,
        plantName: user.plant_name,
        departmentId: user.department_id,
        departmentName: user.department_name,
        position: user.position,
        level: user.level,
        schedule: userSchedule,
        scheduleHours: scheduleHours,
        overtimeHours: overtimeHours,
        leaveHours: leaveHours,
        totalHours: totalHours,
        leaveDate: user.leave_date,
        employeeType: user.employee_type,
        break7Rest1Violations: break7Rest1Violations
      };
    }));

    logDatabase('SELECT', 'jso_hr_employee_schedule', { employeeCount: employees.length, dateRange: `${queryStart} - ${queryEnd}` });

    success(res, { employees, startDate: queryStart, endDate: queryEnd }, '获取员工排班成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 保存员工排班
 */
export const saveSchedule = async (req, res, next) => {
  try {
    const { employeeId, scheduleDate, shift, specialStatus, tempMatter } = req.body;

    if (!employeeId || !scheduleDate || !shift) {
      throw BadRequestError('员工ID、排班日期和班次不能为空');
    }

    // 检查是否存在
    const existing = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE} WHERE employee_id = $1 AND schedule_date = $2
    `, [employeeId, scheduleDate]);

    let result;
    if (existing.rows.length > 0) {
      // 更新
      result = await pool.query(`
        UPDATE ${SCHEDULE_TABLE}
        SET shift = $1, special_status = $2,
            temp_matter_type = $3, temp_matter_start_time = $4,
            temp_matter_end_time = $5, temp_matter_reason = $6, temp_matter_proof = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $8 AND schedule_date = $9
        RETURNING *
      `, [
        shift, specialStatus || null,
        tempMatter?.type || null, tempMatter?.startTime || null,
        tempMatter?.endTime || null, tempMatter?.reason || null, tempMatter?.proof || false,
        employeeId, scheduleDate
      ]);
      logInfo('更新员工排班', { employeeId, scheduleDate, shift });
    } else {
      // 插入
      result = await pool.query(`
        INSERT INTO ${SCHEDULE_TABLE}
        (employee_id, schedule_date, shift, special_status,
         temp_matter_type, temp_matter_start_time, temp_matter_end_time, temp_matter_reason, temp_matter_proof)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        employeeId, scheduleDate, shift, specialStatus || null,
        tempMatter?.type || null, tempMatter?.startTime || null,
        tempMatter?.endTime || null, tempMatter?.reason || null, tempMatter?.proof || false
      ]);
      logInfo('创建员工排班', { employeeId, scheduleDate, shift });
    }

    logDatabase(existing.rows.length > 0 ? 'UPDATE' : 'INSERT', 'jso_hr_employee_schedule', { employeeId, scheduleDate });

    success(res, { item: result.rows[0] }, '保存排班成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 删除员工排班
 */
export const deleteSchedule = async (req, res, next) => {
  try {
    const { employeeId, scheduleDate } = req.params;

    if (!employeeId || !scheduleDate) {
      throw BadRequestError('员工ID和排班日期不能为空');
    }

    await pool.query(
      `DELETE FROM ${SCHEDULE_TABLE} WHERE employee_id = $1 AND schedule_date = $2`,
      [employeeId, scheduleDate]
    );

    logInfo('删除员工排班', { employeeId, scheduleDate });
    logDatabase('DELETE', 'jso_hr_employee_schedule', { employeeId, scheduleDate });

    success(res, null, '删除排班成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 测试数据库连接
 */
export const testDatabase = async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${SCHEDULE_TABLE}`);
    const rowCount = result.rows[0].count;

    success(res, { tableName: SCHEDULE_TABLE, rowCount: parseInt(rowCount) }, '数据库连接正常');
  } catch (err) {
    next(err);
  }
};

/**
 * 批量上传员工排班
 */
export const batchUploadSchedule = async (req, res, next) => {
  try {
    if (!req.file) {
      throw BadRequestError('请上传Excel文件');
    }

    const rows = parseExcel(req.file.buffer);
    const result = await handleScheduleUpload(rows);

    if (!result.success) {
      throw BadRequestError('数据验证失败', result.errors);
    }

    logInfo('批量上传排班', { totalRecords: result.data?.total, successCount: result.data?.success });
    success(res, result.data, '批量上传成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 下载排班模板
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let dateHeaders = [];
    let weekdayHeaders = [];

    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      const days = end.diff(start, 'day') + 1;

      for (let i = 0; i < days; i++) {
        const date = start.add(i, 'day');
        dateHeaders.push(date.format('YYYY-MM-DD'));
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdayHeaders.push(weekdays[date.day()]);
      }
    } else {
      // Default template for a month
      const now = dayjs();
      const monthStart = now.startOf('month');
      const monthEnd = now.endOf('month');
      for (let i = 0; i <= monthEnd.diff(monthStart, 'day'); i++) {
        const date = monthStart.add(i, 'day');
        dateHeaders.push(date.format('YYYY-MM-DD'));
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdayHeaders.push(weekdays[date.day()]);
      }
    }

    // Fetch some active users for example data
    let employees = [];
    try {
      const result = await pool.query(`SELECT id, real_name as name FROM ${USER_TABLE} WHERE status = 'active' LIMIT 5`);
      employees = result.rows;
    } catch (err) {
      console.error('Error fetching employees for schedule template:', err);
    }

    const headerRow1 = ['姓名', ...dateHeaders];
    const headerRow2 = ['', ...weekdayHeaders];

    const sampleRows = [];
    if (employees.length > 0) {
      employees.forEach((emp) => {
        const row = [emp.name || '', ...dateHeaders.map(() => '')];
        sampleRows.push(row);
      });
    } else {
      sampleRows.push(['张三', ...dateHeaders.map(() => '')]);
      sampleRows.push(['李四', ...dateHeaders.map(() => '')]);
    }

    const data = [
      headerRow1,
      headerRow2,
      ...sampleRows
    ];
    const fileName = '员工排班导入模板.xlsx';

    // 生成 Excel
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: true
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', buffer.length);

    // 发送文件
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * 获取所有可用班次（包含时长）
 */
export const getShifts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT shift_name, duration_hours, description
       FROM ${SHIFT_DURATION_RULES_TABLE}
       WHERE status = 'active'
       ORDER BY id`
    );
    const shifts = result.rows.map(row => ({
      value: row.shift_name,
      label: row.shift_name,
      durationHours: parseFloat(row.duration_hours),
      description: row.description
    }));

    success(res, { shifts }, '获取班次列表成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 按日期获取所有员工的排班数据（用于工位安排过滤）
 */
export const getScheduleByDate = async (req, res, next) => {
  try {
    const { scheduleDate } = req.query;

    if (!scheduleDate) {
      throw BadRequestError('请提供查询日期 (scheduleDate)');
    }

    // 查询指定日期的所有排班记录，JOIN 用户表获取姓名和SAP工号
    // 日期存储为UTC时间，需要用 at time zone 转换到北京时间比较
    const result = await pool.query(`
      SELECT s.employee_id, s.shift, s.special_status,
             u.real_name, u.employee_id as sap_employee_id, u.plant_id, u.department_id, u.employee_type,
             p.name as plant_name, d.name as department_name,
             COALESCE(sh.duration_hours, 0) as duration_hours
      FROM ${SCHEDULE_TABLE} s
      JOIN ${USER_TABLE} u ON s.employee_id = u.id
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      LEFT JOIN ${SHIFT_DURATION_RULES_TABLE} sh
        ON sh.plant_id = u.plant_id
        AND sh.department_id = u.department_id
        AND sh.shift_name = s.shift
        AND sh.status = 'active'
      WHERE (s.schedule_date at time zone 'Asia/Shanghai') >= $1::date
        AND (s.schedule_date at time zone 'Asia/Shanghai') < ($1::date + interval '1 day')
    `, [scheduleDate]);

    success(res, { list: result.rows }, '获取排班数据成功');
  } catch (err) {
    next(err);
  }
};

export default {
  getEmployeesWithSchedule,
  saveSchedule,
  deleteSchedule,
  testDatabase,
  batchUploadSchedule,
  downloadTemplate,
  getShifts,
  getScheduleByDate,
};
