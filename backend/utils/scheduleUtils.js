import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
dayjs.extend(isSameOrAfter);
import pool from '../config/db.js';

const SCHEDULE_TABLE = 'jso_hr_employee_schedule';

/**
 * 检查员工在指定日期范围内的”破7休1”情况。
 * @param {number} employeeId - 员工ID.
 * @param {string} queryStart - 查询开始日期 (YYYY-MM-DD).
 * @param {string} queryEnd - 查询结束日期 (YYYY-MM-DD).
 * @param {object} pool - PostgreSQL 连接池.
 * @param {string|null} leaveDate - 员工离职日期 (YYYY-MM-DD), 如果有的话.
 * @returns {Promise<Array<{start: string, end: string, consecutiveDays: number}>>} - 破7休1违规列表.
 */
export const checkBreak7Rest1 = async (employeeId, queryStart, queryEnd, pool, leaveDate = null) => {
  const violations = [];

  // 为了检查连续性，需要查询比实际查询范围更广的排班数据
  // 向前推14天，向后推14天，以确保能捕获到跨越查询边界的连续工作
  const wideStart = dayjs(queryStart).subtract(14, 'day').format('YYYY-MM-DD');
  const wideEnd = dayjs(queryEnd).add(14, 'day').format('YYYY-MM-DD');

  const wideScheduleResult = await pool.query(
    `SELECT schedule_date, shift, special_status FROM ${SCHEDULE_TABLE}
     WHERE employee_id = $1
       AND schedule_date BETWEEN $2 AND $3
     ORDER BY schedule_date`,
    [employeeId, wideStart, wideEnd]
  );

  let consecutiveCount = 0;
  let startConsecDate = null;
  let currentEmployeeScheduleMap = {};

  // Convert schedule rows to a map for easy lookup
  wideScheduleResult.rows.forEach(row => {
    currentEmployeeScheduleMap[dayjs(row.schedule_date).format('YYYY-MM-DD')] = {
      shift: row.shift,
      specialStatus: row.special_status
    };
  });

  // Iterate through the wider date range
  let currentDate = dayjs(wideStart);
  while (currentDate.isBefore(dayjs(wideEnd).add(1, 'day'))) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    const schedule = currentEmployeeScheduleMap[dateStr];

    // 如果员工已离职，该日期视为休息日
    const isAfterLeave = leaveDate && currentDate.isSameOrAfter(dayjs(leaveDate), 'day');

    // 检查是否是休息类班次（调休、请假、年假、离职、旷工、休息）
    // 这些班次会中断连续工作天数计数
    const isRestShift = schedule && (
      schedule.specialStatus === '离职' ||
      ['调休', '请假', '年假', '旷工', '离职', '休', '休息'].includes(schedule.shift)
    );

    // Determine if it's a workday based on the schedule
    // 如果没有排班、离职日期到期、休息类班次，则不是工作日
    const isWorkDay = !isAfterLeave && !isRestShift && schedule;

    if (isWorkDay) {
      consecutiveCount++;
      if (!startConsecDate) {
        startConsecDate = currentDate;
      }
    } else {
      // 如果是休息类班次或离职日期到期，检查是否有违规
      if (consecutiveCount >= 7) {
        violations.push({
          start: startConsecDate.format('YYYY-MM-DD'),
          end: currentDate.subtract(1, 'day').format('YYYY-MM-DD'),
          consecutiveDays: consecutiveCount
        });
      }
      consecutiveCount = 0;
      startConsecDate = null;
    }
    currentDate = currentDate.add(1, 'day');
  }

  // Check for violations at the very end of the wide date range
  if (consecutiveCount >= 7) {
    violations.push({
      start: startConsecDate.format('YYYY-MM-DD'),
      end: dayjs(wideEnd).format('YYYY-MM-DD'),
      consecutiveDays: consecutiveCount
    });
  }

  // Filter violations to only include those that fall within or overlap with the original query range
  const filteredViolations = violations.filter(violation => {
    const vioStart = dayjs(violation.start);
    const vioEnd = dayjs(violation.end);
    const qStart = dayjs(queryStart);
    const qEnd = dayjs(queryEnd);

    // Violation overlaps with query range if:
    // (vioStart <= qEnd AND vioEnd >= qStart)
    return (vioStart.isBefore(qEnd) || vioStart.isSame(qEnd)) && (vioEnd.isAfter(qStart) || vioEnd.isSame(qStart));
  });

  return filteredViolations;
};

