/**
 * 根据岗位获取对应的原因说明
 * 从后端API获取岗位原因配置
 */

interface PositionReason {
  position: string;
  reason: string;
}

// 内存缓存
let positionReasonsCache: PositionReason[] = [];
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

// 同步获取（使用缓存，需要先调用 loadPositionReasons）
export const getReasonByPosition = (position: string): string => {
  if (!position) return '';
  const found = positionReasonsCache.find(r => r.position === position);
  return found?.reason || '';
};

// 异步加载岗位原因到缓存
export const loadPositionReasonsToCache = async (): Promise<void> => {
  const now = Date.now();
  if (now - cacheTime < CACHE_DURATION && positionReasonsCache.length > 0) {
    return; // 缓存有效
  }

  try {
    const response = await fetch('/api/config/position-reasons', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jabil-token')}`
      }
    });
    const data = await response.json();
    if (data.code === 200) {
      positionReasonsCache = data.data || [];
      cacheTime = Date.now();
    }
  } catch {
    // 忽略错误，保持空缓存
    positionReasonsCache = [];
  }
};

// 清除缓存（配置更新后调用）
export const clearPositionReasonsCache = (): void => {
  cacheTime = 0;
};
