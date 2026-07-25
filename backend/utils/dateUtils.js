/**
 * 后端日期工具函数
 * 统一使用 Asia/Shanghai 时区处理日期
 */

// 上海时区标识
const SHANGHAI_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取上海时区的当前时间
 * @returns {Date} 上海时区的当前时间
 */
const getShanghaiNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
};

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 要格式化的日期，默认为上海时区当前时间
 * @returns {string} 格式化后的日期字符串
 */
const formatShanghaiDate = (date = new Date()) => {
  const d = new Date(date.toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss 格式
 * @param {Date} date - 要格式化的日期，默认为上海时区当前时间
 * @returns {string} 格式化后的日期时间字符串
 */
const formatShanghaiDateTime = (date = new Date()) => {
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
 * 获取 N 天前的日期
 * @param {number} days - 天数
 * @param {Date} fromDate - 起始日期，默认为上海时区当前时间
 * @returns {Date} N 天前的日期
 */
const getDaysAgoShanghai = (days, fromDate = new Date()) => {
  const now = new Date(fromDate.toLocaleString('en-US', { timeZone: SHANGHAI_TIMEZONE }));
  now.setDate(now.getDate() - days);
  return now;
};

export {
  SHANGHAI_TIMEZONE,
  getShanghaiNow,
  formatShanghaiDate,
  formatShanghaiDateTime,
  getDaysAgoShanghai
};

export default {
  SHANGHAI_TIMEZONE,
  getShanghaiNow,
  formatShanghaiDate,
  formatShanghaiDateTime,
  getDaysAgoShanghai
};
