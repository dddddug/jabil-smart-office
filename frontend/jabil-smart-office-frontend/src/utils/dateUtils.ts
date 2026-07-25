/**
 * 日期工具函数 - 统一使用中国上海时区 (Asia/Shanghai)
 */

// 上海时区常量
export const SHANGHAI_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取上海时区的当前日期对象
 */
export const getShanghaiNow = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
};

/**
 * 获取上海时区的日期字符串 (YYYY-MM-DD)
 * @param date 可选，默认为当前时间
 */
export const formatShanghaiDate = (date: Date = new Date()): string => {
  const d = new Date(date.toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 获取上海时区的日期时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @param date 可选，默认为当前时间
 */
export const formatShanghaiDateTime = (date: Date = new Date()): string => {
  const d = new Date(date.toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 解析日期字符串为上海时区的Date对象
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 */
export const parseShanghaiDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // 构造为上海时区中午12:00，避免跨天问题
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`);
};

/**
 * 获取指定日期前N天的上海时区日期
 * @param days 天数
 * @param fromDate 起始日期，默认为今天
 */
export const getDaysAgoShanghai = (days: number, fromDate: Date = new Date()): Date => {
  const now = new Date(fromDate.toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
  now.setDate(now.getDate() - days);
  return now;
};
