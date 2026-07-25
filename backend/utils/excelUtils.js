import XLSX from 'xlsx';
import dayjs from 'dayjs';

// 解析Excel文件
export const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
};

export const parseExcelObjects = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
};

// 转换Excel日期序列号为标准日期时间格式
export const convertExcelDate = (excelDate) => {
  if (!excelDate) return null;
  
  // 如果是数字类型（Excel序列号）
  if (typeof excelDate === 'number') {
    // 使用 XLSX 自带的日期解析函数
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  // 如果已经是字符串，检查格式
  const dateStr = String(excelDate);
  if (dateStr.includes('-') || dateStr.includes('/')) {
    // 尝试直接转换
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

// 转换Excel时间格式
export const convertExcelTime = (excelTime) => {
  if (!excelTime) return null;
  
  // 如果是数字类型
  if (typeof excelTime === 'number') {
    const hours = Math.floor(excelTime * 24);
    const minutes = Math.floor((excelTime * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
  
  // 如果已经是字符串
  let timeStr = String(excelTime);
  // 确保格式为 HH:MM:SS
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      timeStr += ':00';
    }
    return timeStr;
  }
  
  return timeStr;
};

// 计算时间差（小时）
export const calculateHours = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let hours = endHour - startHour;
  let mins = endMin - startMin;
  
  if (mins < 0) {
    hours -= 1;
    mins += 60;
  }
  
  return Math.round((hours + mins / 60) * 100) / 100;
};

// 计算天数
export const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

