/**
 * 智能 API 客户端
 * 功能：
 * 1. 在线时正常请求
 * 2. 离线时自动缓存 POST/PUT 请求
 * 3. 网络恢复后自动同步
 * 4. 冲突处理：服务器优先
 */

import axios from 'axios';
import { ElMessage } from 'element-plus';

// IndexedDB 配置
const DB_NAME = 'JabilOfflineCache';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSync';
const SYNC_INTERVAL = 30000; // 每30秒检测一次

// IndexedDB 全局变量
let db = null;
let syncTimer = null;
let isOnline = true;

// 初始化 IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// 检测网络状态
async function checkNetwork() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/api/system/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    const wasOnline = isOnline;
    isOnline = response.ok;

    if (!wasOnline && isOnline) {
      console.log('[OfflineSync] 网络恢复，开始同步...');
      syncAll();
    }

    return isOnline;
  } catch {
    if (isOnline) {
      console.log('[OfflineSync] 网络断开');
      isOnline = false;
    }
    return false;
  }
}

// 保存到缓存
async function saveToCache(type, method, url, data) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      type,
      method,
      url,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 获取所有待同步数据
async function getAllPending() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// 删除记录
async function deleteRecord(id) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 获取待同步数量
async function getPendingCount() {
  if (!db) return 0;

  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => {
      const count = request.result;
      window.dispatchEvent(new CustomEvent('offline-sync-count', { detail: { count } }));
      resolve(count);
    };
    request.onerror = () => resolve(0);
  });
}

// 同步单条记录
async function syncRecord(record) {
  const token = localStorage.getItem('jabil-token');

  const response = await fetch(record.url, {
    method: record.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(record.data)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// 同步所有缓存数据
async function syncAll() {
  const pending = await getAllPending();
  if (pending.length === 0) return;

  console.log(`[OfflineSync] 开始同步 ${pending.length} 条数据...`);

  let success = 0, fail = 0;

  for (const record of pending) {
    try {
      await syncRecord(record);
      await deleteRecord(record.id);
      success++;
    } catch (err) {
      console.error(`[OfflineSync] 同步失败:`, err);
      fail++;

      // 服务器错误时停止
      if (err.message.includes('401') || err.message.includes('500') || err.message.includes('503')) {
        break;
      }
    }
  }

  console.log(`[OfflineSync] 同步完成: 成功 ${success}, 失败 ${fail}`);
  window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { success, fail } }));
}

// 启动自动同步
function startAutoSync() {
  initDB().then(() => {
    checkNetwork();
    syncTimer = setInterval(checkNetwork, SYNC_INTERVAL);
    console.log('[OfflineSync] 已启动');
  });
}

// 停止自动同步
function stopAutoSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

// 智能 API 请求函数
async function smartRequest(type, url, method = 'GET', data = null) {
  // 如果是在线请求
  if (isOnline) {
    try {
      const token = localStorage.getItem('jabil-token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (response.ok) {
        return await response.json();
      }

      // 如果是认证错误，抛出错误
      if (response.status === 401) {
        throw { code: 401, message: '认证失败' };
      }

      // 其他错误，检查是否是网络问题
      throw await response.json();
    } catch (err) {
      // 网络错误
      if (!navigator.onLine || err.name === 'TypeError') {
        console.log('[OfflineSync] 网络错误，缓存数据...');
        if (method !== 'GET') {
          await saveToCache(type, method, url, data);
          ElMessage.warning('网络已断开，数据已缓存，恢复后将自动上传');
          return { code: 200, message: '已缓存', cached: true };
        }
      }
      throw err;
    }
  } else {
    // 离线模式
    if (method !== 'GET') {
      await saveToCache(type, method, url, data);
      ElMessage.warning('当前离线，数据已缓存');
      return { code: 200, message: '已缓存', cached: true };
    }
    throw { code: -1, message: '离线状态，无法获取数据' };
  }
}

// 导出方法
export const offlineSync = {
  init: initDB,
  checkNetwork,
  saveToCache,
  getAllPending,
  getPendingCount,
  syncAll,
  startAutoSync,
  stopAutoSync,
  isOnline: () => isOnline
};

export default smartRequest;
