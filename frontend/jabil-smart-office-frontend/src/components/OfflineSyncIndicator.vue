<template>
  <div v-if="!isOnline || pendingCount > 0" class="offline-indicator" :class="{ syncing: isSyncing }">
    <span v-if="!isOnline" class="offline-icon">📴</span>
    <span v-else-if="isSyncing" class="syncing-icon">🔄</span>
    <span v-else class="pending-icon">📤</span>
    <span class="text">
      <span v-if="!isOnline">离线模式</span>
      <span v-else-if="isSyncing">同步中...</span>
      <span v-else>待同步 {{ pendingCount }} 条</span>
    </span>
    <button v-if="isOnline && pendingCount > 0 && !isSyncing" class="sync-btn" @click="syncNow">立即同步</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import offlineSyncManager from '../utils/offlineSyncManager';

const isOnline = ref(true);
const pendingCount = ref(0);
const isSyncing = ref(false);

const updateStatus = (e) => {
  pendingCount.value = e.detail.count;
};

const syncComplete = (e) => {
  isSyncing.value = false;
  pendingCount.value = 0;
};

const syncNow = async () => {
  isSyncing.value = true;
  await offlineSyncManager.syncAll();
};

onMounted(async () => {
  // 初始化
  await offlineSyncManager.init();
  offlineSyncManager.startAutoSync();

  // 检查初始状态
  isOnline.value = await offlineSyncManager.checkNetworkStatus();
  pendingCount.value = await offlineSyncManager.checkPendingCount();

  // 监听事件
  window.addEventListener('offline-sync-count', updateStatus);
  window.addEventListener('offline-sync-complete', syncComplete);
});

onUnmounted(() => {
  window.removeEventListener('offline-sync-count', updateStatus);
  window.removeEventListener('offline-sync-complete', syncComplete);
});
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 9999;
  font-size: 14px;
}

.offline-indicator .offline-icon {
  font-size: 18px;
}

.offline-indicator .syncing-icon {
  font-size: 18px;
  animation: spin 1s linear infinite;
}

.offline-indicator .pending-icon {
  font-size: 18px;
}

.offline-indicator .text {
  color: #666;
}

.offline-indicator.syncing {
  border: 2px solid #1890ff;
}

.sync-btn {
  padding: 4px 12px;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.sync-btn:hover {
  opacity: 0.85;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
