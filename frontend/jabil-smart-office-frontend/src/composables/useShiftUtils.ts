import { ref, onMounted } from 'vue';
import request from '@/utils/request';

// 班次时长映射表（与 jso_config_shift_duration_rules 表保持一致，单位：小时）
const SHIFT_HOURS_MAP: Record<string, number> = {
  'A': 8,
  'A2': 10.5,
  'A+': 12,
  'B': 8,
  'B+': 12,
  'C': 8,
  'C+': 12,
  'N': 8,
  'N+': 12,
  '调休': 0,
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
  if (shiftStr.includes('+')) {
    return 12;
  }
  if (shiftStr.includes('2')) {
    return 10.5;
  }
  if (shiftStr.includes('调') || shiftStr.includes('休')) {
    return 0;
  }
  if (['a', 'b', 'c', 'n'].includes(shiftStr)) {
    return 8;
  }

  // 尝试从数字提取（如 "8小时", "10H"）
  const match = shift.match(/(\d+\.?\d*)\s*[Hh时]/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }

  return DEFAULT_WORK_HOURS;
}

// 班次选项（与 jso_config_shift_duration_rules 表保持一致，用于前端下拉框）
export const SHIFT_OPTIONS = [
  { value: 'A', label: 'A班 (8H)', hours: 8 },
  { value: 'A2', label: 'A2班 (10.5H)', hours: 10.5 },
  { value: 'A+', label: 'A+班 (12H)', hours: 12 },
  { value: 'B', label: 'B班 (8H)', hours: 8 },
  { value: 'B+', label: 'B+班 (12H)', hours: 12 },
  { value: 'C', label: 'C班 (8H)', hours: 8 },
  { value: 'C+', label: 'C+班 (12H)', hours: 12 },
  { value: 'N', label: 'N班 (8H)', hours: 8 },
  { value: 'N+', label: 'N+班 (12H)', hours: 12 },
  { value: '调休', label: '调休 (0H)', hours: 0 },
];

// 缓存从后端获取的班次配置
const shiftConfigCache = ref<Record<string, number>>({});

/**
 * 从后端加载班次时长配置
 */
export async function loadShiftConfigFromBackend(): Promise<void> {
  try {
    const response = await request.get('/config/shift-duration-rules');
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
