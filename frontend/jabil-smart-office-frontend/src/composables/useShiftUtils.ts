import { ref, onMounted } from 'vue';
import request from '@/utils/request';

// 班次时长映射表（单位：小时）
const SHIFT_HOURS_MAP: Record<string, number> = {
  '白班': 8,
  '早班': 8,
  '中班': 8,
  '晚班': 8,
  '夜班': 12,
  '休': 0,
  '班1': 8,
  '班2': 10,
  '班3': 12,
  '12H': 12,
  '8H': 8,
  '10H': 10,
};

// 默认工作时长
const DEFAULT_WORK_HOURS = 8;

/**
 * 获取班次工作时长
 * @param shift 班次名称
 * @returns 工作时长（小时）
 */
export function getWorkHours(shift: string): number {
  if (!shift) return 0;

  // 精确匹配
  if (SHIFT_HOURS_MAP[shift] !== undefined) {
    return SHIFT_HOURS_MAP[shift];
  }

  // 模糊匹配（包含关键词）
  const shiftStr = shift.toLowerCase();
  if (shiftStr.includes('夜') || shiftStr.includes('12')) {
    return 12;
  }
  if (shiftStr.includes('班')) {
    return 8;
  }
  if (shiftStr.includes('休')) {
    return 0;
  }

  // 尝试从数字提取（如 "8小时", "10H"）
  const match = shift.match(/(\d+)\s*[Hh时]/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return DEFAULT_WORK_HOURS;
}

// 班次选项（用于前端下拉框）
export const SHIFT_OPTIONS = [
  { value: '白班', label: '白班 (8H)', hours: 8 },
  { value: '早班', label: '早班 (8H)', hours: 8 },
  { value: '中班', label: '中班 (8H)', hours: 8 },
  { value: '晚班', label: '晚班 (8H)', hours: 8 },
  { value: '夜班', label: '夜班 (12H)', hours: 12 },
  { value: '休', label: '休息', hours: 0 },
];

// 缓存从后端获取的班次配置
const shiftConfigCache = ref<Record<string, number>>({});

/**
 * 从后端加载班次时长配置
 */
export async function loadShiftConfigFromBackend(): Promise<void> {
  try {
    const response = await request.get('/shift-duration-rules');
    if (response && Array.isArray(response)) {
      const config: Record<string, number> = {};
      response.forEach((rule: any) => {
        if (rule.shift_name && rule.duration_hours) {
          config[rule.shift_name] = parseFloat(rule.duration_hours);
        }
      });
      shiftConfigCache.value = config;
    }
  } catch (error) {
    console.warn('从后端加载班次配置失败，使用默认配置:', error);
  }
}

/**
 * 使用后端配置的 getWorkHours
 * @param shift 班次名称
 * @returns 工作时长（小时）
 */
export function getWorkHoursWithConfig(shift: string): number {
  if (!shift) return 0;

  // 优先使用后端配置
  if (shiftConfigCache.value[shift] !== undefined) {
    return shiftConfigCache.value[shift];
  }

  // 回退到前端默认映射
  return getWorkHours(shift);
}

export function useShiftUtils() {
  // 组件挂载时尝试加载后端配置
  onMounted(() => {
    loadShiftConfigFromBackend();
  });

  return {
    getWorkHours,
    getWorkHoursWithConfig,
    SHIFT_OPTIONS,
    loadShiftConfigFromBackend,
  };
}
