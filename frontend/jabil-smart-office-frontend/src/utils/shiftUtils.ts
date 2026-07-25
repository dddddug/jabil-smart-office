import { Shift } from '../types/schedule';

/**
 * 根据班次字符串获取工作小时数
 * @param shift 班次字符串
 * @returns 工作小时数
 */
export const getWorkHours = (shift: string): number => {
  switch (shift) {
    case 'A班':
    case 'A':
    case 'B班':
    case 'B':
    case 'C班':
    case 'C':
    case 'N班':
    case 'N':
      return 8;
    case 'A+':
    case 'B+':
    case 'C+':
    case 'N+':
      return 12;
    case 'A2':
      return 10.5;
    default:
      return 0;
  }
};

/**
 * 根据班次字符串获取对应的CSS类名
 * @param shift 班次字符串
 * @returns CSS类名
 */
export const getShiftClass = (shift: string): string => {
  switch (shift) {
    case 'A班':
    case 'A':
      return 'shift-a';
    case 'B班':
    case 'B':
      return 'shift-b';
    case 'C班':
    case 'C':
      return 'shift-c';
    case 'N班':
    case 'N':
      return 'shift-n';
    case 'A+':
      return 'shift-a-plus';
    case 'B+':
      return 'shift-b-plus';
    case 'C+':
      return 'shift-c-plus';
    case 'N+':
      return 'shift-n-plus';
    case 'A2':
      return 'shift-a2';
    case '休':
    case '休息':
      return 'shift-rest';
    case '调休':
      return 'shift-day-off';
    default:
      return '';
  }
};
