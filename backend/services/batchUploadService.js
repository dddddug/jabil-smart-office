import dayjs from 'dayjs';
import pool from '../config/db.js';
import {
  USER_TABLE,
  PLANT_TABLE,
  DEPT_TABLE,
  TEMPORARY_OVERTIME_TABLE,
  TEMPORARY_LEAVE_TABLE,
  FORMAL_LEAVE_TABLE,
  RESIGNATION_TRANSFER_TABLE,
  SCHEDULE_TABLE,
  SPECIAL_WORKING_HOURS_TABLE
} from '../config/db_constants.js';
import {
  convertExcelDate,
  convertExcelTime,
  calculateHours
} from '../utils/excelUtils.js';

const fetchUsers = async () => {
  const result = await pool.query(`SELECT id, real_name, plant_id, department_id, old_employee_id FROM ${USER_TABLE}`);
  return result.rows;
};

const fetchPlantMap = async () => {
  const result = await pool.query(`SELECT id, name FROM ${PLANT_TABLE}`);
  return new Map(result.rows.map((row) => [row.name, row.id]));
};

const fetchDepartmentMap = async () => {
  const result = await pool.query(`SELECT id, name FROM ${DEPT_TABLE}`);
  return new Map(result.rows.map((row) => [row.name, row.id]));
};

const createUserMap = (users) => new Map(users.map((user) => [user.real_name, user]));

const insertRows = async ({ tableName, uniqueCheckSql, uniqueCheckValues, insertSql, insertValuesFn, validData }) => {
  const insertedIds = [];
  const skippedCount = [];

  for (const data of validData) {
    const checkResult = await pool.query(uniqueCheckSql, uniqueCheckValues(data));
    if (checkResult.rows.length > 0) {
      skippedCount.push(data);
      continue;
    }

    const result = await pool.query(insertSql, insertValuesFn(data));
    insertedIds.push(result.rows[0].id);
  }

  return { insertedIds, skippedCount };
};

export const handleTemporaryOvertimeUpload = async (rows, applicantId) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.[0] || !row[0].toString().trim()) continue;

    try {
      const employeeNumber = row[0]?.toString().trim();
      const overtimeType = row[1]?.toString().trim() || '临时加班';
      const overtimeDate = convertExcelDate(row[2]);
      const startTime = convertExcelTime(row[3]);
      const endTime = convertExcelTime(row[4]);
      const reason = row[5]?.toString().trim() || '';

      const employee = userMap.get(employeeNumber);
      if (!employee) {
        errors.push(`第${i + 1}行: 员工工号 "${employeeNumber}" 不存在`);
        continue;
      }
      if (!overtimeDate) {
        errors.push(`第${i + 1}行: 加班日期不能为空`);
        continue;
      }
      if (!startTime || !endTime) {
        errors.push(`第${i + 1}行: 开始时间和结束时间不能为空`);
        continue;
      }

      const hours = calculateHours(startTime, endTime);
      if (hours <= 0) {
        errors.push(`第${i + 1}行: 结束时间必须晚于开始时间`);
        continue;
      }

      validData.push({
        employeeNumber,
        overtimeType,
        overtimeDate,
        startTime,
        endTime,
        reason,
        hours,
        status: 'pending',
        employeeId: employee.id,
        plantId: employee.plant_id,
        departmentId: employee.department_id
      });
    } catch (error) {
      errors.push(`第${i + 1}行: 数据格式错误 - ${error.message}`);
    }
  }

  const { insertedIds, skippedCount } = await insertRows({
    tableName: TEMPORARY_OVERTIME_TABLE,
    uniqueCheckSql: `SELECT id FROM ${TEMPORARY_OVERTIME_TABLE} WHERE employee_id = $1 AND overtime_date = $2 AND start_time = $3 AND end_time = $4 LIMIT 1`,
    uniqueCheckValues: (data) => [data.employeeId, data.overtimeDate, data.startTime, data.endTime],
    insertSql: `INSERT INTO ${TEMPORARY_OVERTIME_TABLE} (employee_id, plant_id, department_id, overtime_type, overtime_date, start_time, end_time, hours, reason, status, applicant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    insertValuesFn: (data) => [data.employeeId, data.plantId, data.departmentId, data.overtimeType, data.overtimeDate, data.startTime, data.endTime, data.hours, data.reason, data.status, applicantId],
    validData
  });

  return {
    success: true,
    insertedCount: insertedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds
  };
};

export const handleTemporaryLeaveUpload = async (rows, applicantId) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.[0] || !row[0].toString().trim()) continue;

    try {
      const employeeName = row[0]?.toString().trim();
      let leaveType = row[1]?.toString().trim() || '临时请假';
      const leaveDate = convertExcelDate(row[2]);
      const startTime = row[3]?.toString().trim() || '09:00';
      const endTime = row[4]?.toString().trim() || '18:00';
      const reason = row[5]?.toString().trim() || '';

      if (leaveType === '临时请假') leaveType = 'LEAVE';
      if (leaveType === '公差') leaveType = 'ERRAND';

      const employee = userMap.get(employeeName);
      if (!employee) {
        errors.push(`第${i + 1}行: 员工 "${employeeName}" 不存在`);
        continue;
      }
      if (!leaveDate) {
        errors.push(`第${i + 1}行: 请假日期不能为空`);
        continue;
      }

      // 解析时间计算时长（使用本地时间避免时区偏移）
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      // 解析日期字符串获取年月日
      const dateParts = leaveDate.split('T')[0].split('-').map(Number);
      const startDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], startHour, startMin, 0, 0);
      const endDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], endHour, endMin, 0, 0);

      if (endDateTime <= startDateTime) {
        errors.push(`第${i + 1}行: 结束时间必须晚于开始时间`);
        continue;
      }

      const diffMs = endDateTime - startDateTime;
      const hours = Math.max(0.5, Math.round((diffMs / (1000 * 60 * 60)) * 2) / 2);
      const days = Math.max(1, Math.ceil(hours / 8));

      validData.push({
        employeeName,
        leaveType,
        startDate: `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}-${String(dateParts[2]).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`,
        endDate: `${dateParts[0]}-${String(dateParts[1]).padStart(2, '0')}-${String(dateParts[2]).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`,
        startTime,
        endTime,
        reason,
        days,
        hours,
        status: 'pending',
        employeeId: employee.id,
        plantId: employee.plant_id,
        departmentId: employee.department_id
      });
    } catch (error) {
      errors.push(`第${i + 1}行: 数据格式错误 - ${error.message}`);
    }
  }

  const { insertedIds, skippedCount } = await insertRows({
    tableName: TEMPORARY_LEAVE_TABLE,
    uniqueCheckSql: `SELECT id FROM ${TEMPORARY_LEAVE_TABLE} WHERE employee_id = $1 AND leave_type = $2 AND start_date = $3 AND end_date = $4 LIMIT 1`,
    uniqueCheckValues: (data) => [data.employeeId, data.leaveType, data.startDate, data.endDate],
    insertSql: `INSERT INTO ${TEMPORARY_LEAVE_TABLE} (employee_id, plant_id, department_id, leave_type, start_date, end_date, start_time, end_time, hours, reason, status, applicant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    insertValuesFn: (data) => [data.employeeId, data.plantId, data.departmentId, data.leaveType, data.startDate, data.endDate, data.startTime, data.endTime, data.hours, data.reason, data.status, applicantId],
    validData
  });

  return {
    success: true,
    insertedCount: insertedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds
  };
};

export const handleFormalLeaveUpload = async (rows, applicantId) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.[0] || !row[0].toString().trim()) continue;

    try {
      const employeeName = row[0]?.toString().trim();
      const leaveType = row[1]?.toString().trim() || '年假';
      const startDate = convertExcelDate(row[2]);
      const endDate = convertExcelDate(row[3]);
      const reason = row[4]?.toString().trim() || '';

      const employee = userMap.get(employeeName);
      if (!employee) {
        errors.push(`第${i + 1}行: 员工 "${employeeName}" 不存在`);
        continue;
      }
      if (!startDate || !endDate) {
        errors.push(`第${i + 1}行: 开始日期和结束日期不能为空`);
        continue;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        errors.push(`第${i + 1}行: 结束日期必须晚于开始日期`);
        continue;
      }

      const diffMs = end - start;
      const hours = Math.max(0.5, Math.round((diffMs / (1000 * 60 * 60)) * 2) / 2);
      const days = Math.max(1, Math.ceil(hours / 8));

      validData.push({
        employeeName,
        leaveType,
        startDate,
        endDate,
        reason,
        days,
        hours,
        status: 'pending',
        employeeId: employee.id,
        plantId: employee.plant_id,
        departmentId: employee.department_id
      });
    } catch (error) {
      errors.push(`第${i + 1}行: 数据格式错误 - ${error.message}`);
    }
  }

  const { insertedIds, skippedCount } = await insertRows({
    tableName: FORMAL_LEAVE_TABLE,
    uniqueCheckSql: `SELECT id FROM ${FORMAL_LEAVE_TABLE} WHERE employee_id = $1 AND leave_type = $2 AND start_date = $3 AND end_date = $4 LIMIT 1`,
    uniqueCheckValues: (data) => [data.employeeId, data.leaveType, data.startDate, data.endDate],
    insertSql: `INSERT INTO ${FORMAL_LEAVE_TABLE} (employee_id, plant_id, department_id, leave_type, start_date, end_date, days, hours, reason, status, applicant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    insertValuesFn: (data) => [data.employeeId, data.plantId, data.departmentId, data.leaveType, data.startDate, data.endDate, data.days, data.hours, data.reason, data.status, applicantId],
    validData
  });

  return {
    success: true,
    insertedCount: insertedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds
  };
};

export const handleResignationTransferUpload = async (rows, applicantId) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);
  const plants = await fetchPlantMap();
  const departments = await fetchDepartmentMap();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.[0] || !row[0].toString().trim()) continue;

    try {
      const employeeName = row[0]?.toString().trim();
      const type = row[1]?.toString().trim();
      const transferDate = convertExcelDate(row[2]);
      const reason = row[3]?.toString().trim() || '';
      const transferPlantName = row[4]?.toString().trim();
      const transferDepartmentName = row[5]?.toString().trim();
      const transferToEmployeeName = row[6]?.toString().trim();

      const employee = userMap.get(employeeName);
      if (!employee) {
        errors.push(`第${i + 1}行: 员工 "${employeeName}" 不存在`);
        continue;
      }
      if (!type || !['离职', '转岗'].includes(type)) {
        errors.push(`第${i + 1}行: 类型必须是 "离职" 或 "转岗"`);
        continue;
      }
      if (!transferDate) {
        errors.push(`第${i + 1}行: 离职/转岗日期不能为空`);
        continue;
      }

      let transferPlantId = null;
      let transferDepartmentId = null;
      let transferToId = null;
      let transferReason = null;

      if (type === '转岗') {
        if (!transferPlantName) {
          errors.push(`第${i + 1}行: 转岗类型必须填写调入工厂`);
          continue;
        }
        transferPlantId = plants.get(transferPlantName);
        if (!transferPlantId) {
          errors.push(`第${i + 1}行: 调入工厂 "${transferPlantName}" 不存在`);
          continue;
        }

        if (!transferDepartmentName) {
          errors.push(`第${i + 1}行: 转岗类型必须填写调入部门`);
          continue;
        }
        transferDepartmentId = departments.get(transferDepartmentName);
        if (!transferDepartmentId) {
          errors.push(`第${i + 1}行: 调入部门 "${transferDepartmentName}" 不存在`);
          continue;
        }
      }

      if (transferToEmployeeName) {
        const transferToEmployee = userMap.get(transferToEmployeeName);
        if (!transferToEmployee) {
          errors.push(`第${i + 1}行: 交接人 "${transferToEmployeeName}" 不存在`);
          continue;
        }
        transferToId = transferToEmployee.id;
      }

      validData.push({
        employeeName,
        type,
        transferDate,
        reason,
        proofFile: null,
        transferPlantId,
        transferDepartmentId,
        transferToId,
        transferReason,
        status: 'pending',
        employeeId: employee.id,
        plantId: employee.plant_id,
        departmentId: employee.department_id,
        applicantId
      });
    } catch (error) {
      errors.push(`第${i + 1}行: 数据格式错误 - ${error.message}`);
    }
  }

  const { insertedIds, skippedCount } = await insertRows({
    tableName: RESIGNATION_TRANSFER_TABLE,
    uniqueCheckSql: `SELECT id FROM ${RESIGNATION_TRANSFER_TABLE} WHERE employee_id = $1 AND type = $2 AND transfer_date = $3 LIMIT 1`,
    uniqueCheckValues: (data) => [data.employeeId, data.type, data.transferDate],
    insertSql: `INSERT INTO ${RESIGNATION_TRANSFER_TABLE} (employee_id, plant_id, department_id, type, reason, proof_file, status, applicant_id, transfer_to_id, transfer_reason, transfer_plant_id, transfer_department_id, transfer_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    insertValuesFn: (data) => [data.employeeId, data.plantId, data.departmentId, data.type, data.reason, data.proofFile, data.status, data.applicantId, data.transferToId, data.transferReason, data.transferPlantId, data.transferDepartmentId, data.transferDate],
    validData
  });

  return {
    success: true,
    insertedCount: insertedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds
  };
};

export const handleSpecialWorkingHoursUpload = async (rows, registeredBy) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.[0] || !row[0].toString().trim()) continue;

    try {
      const date = convertExcelDate(row[0]);
      const event = row[1]?.toString().trim();
      const employeeName = row[2]?.toString().trim();
      const startTime = convertExcelTime(row[3]);
      const endTime = convertExcelTime(row[4]);

      const user = userMap.get(employeeName);
      if (!user) {
        errors.push(`第${i + 1}行: 员工 "${employeeName}" 不存在`);
        continue;
      }
      const oldEmployeeId = user.old_employee_id;

      if (!date || !event || !startTime || !endTime) {
        errors.push(`第${i + 1}行: 日期、事件、开始时间、结束时间均为必填项`);
        continue;
      }

      const startDateTime = dayjs(`${date} ${startTime}`);
      const endDateTime = dayjs(`${date} ${endTime}`);
      if (!startDateTime.isValid() || !endDateTime.isValid()) {
        errors.push(`第${i + 1}行: 日期或时间格式无效`);
        continue;
      }
      if (startDateTime.isAfter(endDateTime)) {
        errors.push(`第${i + 1}行: 开始时间不能晚于结束时间`);
        continue;
      }

      const startDay = startDateTime.format('YYYY-MM-DD');
      const endDay = endDateTime.format('YYYY-MM-DD');
      if (startDay !== endDay) {
        errors.push(`第${i + 1}行: 开始时间、结束时间不允许跨天`);
        continue;
      }

      validData.push({
        date,
        event,
        employee_name: employeeName,
        old_employee_id: oldEmployeeId,
        start_time: startDateTime.format('YYYY-MM-DD HH:mm:ss'),
        end_time: endDateTime.format('YYYY-MM-DD HH:mm:ss'),
        registered_by: registeredBy
      });
    } catch (error) {
      errors.push(`第${i + 1}行: 数据处理异常 - ${error.message}`);
    }
  }

  const { insertedIds, skippedCount } = await insertRows({
    tableName: SPECIAL_WORKING_HOURS_TABLE,
    uniqueCheckSql: `SELECT id FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE employee_name = $1 AND date = $2 AND start_time = $3 AND end_time = $4 LIMIT 1`,
    uniqueCheckValues: (data) => [data.employee_name, data.date, data.start_time, data.end_time],
    insertSql: `INSERT INTO ${SPECIAL_WORKING_HOURS_TABLE} (date, event, employee_name, old_employee_id, start_time, end_time, registered_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    insertValuesFn: (data) => [data.date, data.event, data.employee_name, data.old_employee_id, data.start_time, data.end_time, data.registered_by],
    validData
  });

  return {
    success: true,
    insertedCount: insertedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds
  };
};

export const handleScheduleUpload = async (rows) => {
  const errors = [];
  const validData = [];
  const users = await fetchUsers();
  const userMap = createUserMap(users);

  const validShifts = ['A', 'B', 'C', 'N', 'A班', 'B班', 'C班', 'N班', 'A+', 'B+', 'C+', 'N+', 'A2', '休', '休息', '调休'];

  let dataStartRow = -1;
  let dateHeaders = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && (row[0] === '姓名' || row[0] === 'Name')) {
      dataStartRow = i + 2;
      dateHeaders = row.slice(1).filter((date) => date);
      break;
    }
  }

  if (dataStartRow === -1) {
    return {
      success: false,
      insertedCount: 0,
      skippedCount: 0,
      errors: [{ row: 1, error: '未找到标题行"姓名"，请确保模板格式正确' }],
      ids: []
    };
  }

  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    if (!row || !row[0] || !row[0].trim()) continue;

    const employeeName = row[0];
    const employee = userMap.get(employeeName);
    if (!employee) {
      errors.push({ row: rowNum, error: `员工 "${employeeName}" 不存在或已离职` });
      continue;
    }
    const employeeId = employee.id;

    for (let j = 0; j < dateHeaders.length; j++) {
      const scheduleDate = dateHeaders[j];
      const shift = row[j + 1];
      if (!shift || !shift.trim()) continue;

      let cleanShift = shift.trim();
      let specialStatus = '';

      if (cleanShift === '调休' || cleanShift === '休息' || cleanShift === '休') {
        specialStatus = cleanShift;
        cleanShift = '休';
      } else {
        if (cleanShift === 'A') cleanShift = 'A班';
        if (cleanShift === 'B') cleanShift = 'B班';
        if (cleanShift === 'C') cleanShift = 'C班';
        if (cleanShift === 'N') cleanShift = 'N班';
      }

      if (!validShifts.includes(cleanShift) && !validShifts.includes(shift)) {
        specialStatus = shift;
        cleanShift = '休';
      }

      let formattedDate;
      try {
        const dateObj = dayjs(scheduleDate);
        if (!dateObj.isValid()) throw new Error('日期格式无效');
        formattedDate = dateObj.format('YYYY-MM-DD');
      } catch (e) {
        errors.push({ row: rowNum, error: `排班日期 "${scheduleDate}" 格式无效，请使用YYYY-MM-DD格式` });
        continue;
      }

      validData.push({
        employeeId,
        employeeName,
        scheduleDate: formattedDate,
        shift: shift,
        specialStatus: specialStatus || null
      });
    }
  }

  const insertedIds = [];
  const updatedIds = [];
  const skippedCount = [];

  for (const data of validData) {
    const checkResult = await pool.query(`SELECT id FROM ${SCHEDULE_TABLE} WHERE employee_id = $1 AND schedule_date = $2 LIMIT 1`, [data.employeeId, data.scheduleDate]);
    if (checkResult.rows.length > 0) {
      const existingId = checkResult.rows[0].id;
      await pool.query(`UPDATE ${SCHEDULE_TABLE} SET shift = $1, special_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`, [data.shift, data.specialStatus, existingId]);
      updatedIds.push(existingId);
      continue;
    }

    const result = await pool.query(`INSERT INTO ${SCHEDULE_TABLE} (employee_id, schedule_date, shift, special_status) VALUES ($1, $2, $3, $4) RETURNING id`, [data.employeeId, data.scheduleDate, data.shift, data.specialStatus]);
    insertedIds.push(result.rows[0].id);
  }

  return {
    success: true,
    insertedCount: insertedIds.length,
    updatedCount: updatedIds.length,
    skippedCount: skippedCount.length,
    errors,
    ids: insertedIds,
    updatedIds
  };
};
