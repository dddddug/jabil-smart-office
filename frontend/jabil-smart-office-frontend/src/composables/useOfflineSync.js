/**
 * 离线同步 composable
 * 封装离线数据管理功能
 */
import { ref, onMounted, onUnmounted } from 'vue';
import offlineSyncManager from '../utils/offlineSyncManager';

export function useOfflineSync() {
  const isOnline = ref(true);
  const pendingCount = ref(0);
  const isSyncing = ref(false);
  const lastSyncResult = ref(null);

  // 更新在线状态
  const updateOnlineStatus = (status) => {
    isOnline.value = status;
  };

  // 保存数据到缓存
  const saveToCache = async (type, data) => {
    if (!isOnline.value) {
      await offlineSyncManager.saveToCache(type, data);
      return true;
    }
    return false; // 在线时不需要缓存
  };

  // 手动触发同步
  const syncNow = async () => {
    if (isSyncing.value) return;

    isSyncing.value = true;
    try {
      lastSyncResult.value = await offlineSyncManager.syncAll();
    } finally {
      isSyncing.value = false;
    }
    return lastSyncResult.value;
  };

  // 监听事件
  onMounted(() => {
    // 监听离线计数更新
    window.addEventListener('offline-sync-count', (e) => {
      pendingCount.value = e.detail.count;
    });

    // 监听同步完成
    window.addEventListener('offline-sync-complete', (e) => {
      lastSyncResult.value = e.detail;
      if (e.detail.fail === 0) {
        console.log('所有数据已同步成功');
      }
    });
  });

  onUnmounted(() => {
    // 清理工作
  });

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    updateOnlineStatus,
    saveToCache,
    syncNow
  };
}
