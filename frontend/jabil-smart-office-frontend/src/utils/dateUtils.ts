import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/zh-cn';
import { Day } from '../types/schedule';

dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.locale('zh-cn');

/**
 * 获取指定日期所在周的周数 (ISO 周数)
 * @param dateString 日期字符串 (YYYY-MM-DD)
 * @returns 周数
 */
export function getWeekNumber(dateString: string): string {
  return dayjs(dateString).isoWeek().toString();
}

/**
 * 获取指定日期范围内的天数列表
 * @param startDateString 开始日期 (YYYY-MM-DD)
 * @param endDateString 结束日期 (YYYY-MM-DD)
 * @returns 天数列表
 */
export function getDaysInRange(startDateString: string, endDateString: string): Day[] {
  const startDate = dayjs(startDateString);
  const endDate = dayjs(endDateString);
  const days: Day[] = [];

  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    days.push({
      date: currentDate.format('YYYY-MM-DD'),
      monthDay: currentDate.format('M/D'),
      weekday: currentDate.format('ddd'),
      isToday: currentDate.isSame(dayjs(), 'day'),
      isCurrentMonth: true, // For range view, all days are considered current
    });
    currentDate = currentDate.add(1, 'day');
  }
  return days;
}

/**
 * 获取指定月份的排班日历天数列表（包含上月和下月的部分天数以填充视图）
 * @param monthStartString 月份开始日期 (YYYY-MM-DD)
 * @returns 天数列表
 */
export function getMonthCalendarDays(monthStartString: string): Day[] {
  const startOfMonth = dayjs(monthStartString).startOf('month');
  const endOfMonth = dayjs(monthStartString).endOf('month');

  let startDay = startOfMonth.startOf('week'); // 从周日开始
  if (startDay.day() === 0) { // 如果是周日，则从前一周的周日开始
    startDay = startDay.subtract(7, 'day');
  }
  startDay = startDay.add(1, 'day'); // 调整为从周一开始
  
  const endDay = endOfMonth.endOf('week'); // 到周六结束

  const days: Day[] = [];
  let currentDate = startDay;

  while (currentDate.isBefore(endDay) || currentDate.isSame(endDay, 'day')) {
    days.push({
      date: currentDate.format('YYYY-MM-DD'),
      monthDay: currentDate.format('M/D'),
      weekday: currentDate.format('ddd'),
      isToday: currentDate.isSame(dayjs(), 'day'),
      isCurrentMonth: currentDate.month() === startOfMonth.month(),
    });
    currentDate = currentDate.add(1, 'day');
  }
  return days;
}

/**
 * 格式化日期字符串
 * @param dateStr 日期字符串
 * @returns 格式化后的日期字符串 (YYYY/MM/DD)
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
