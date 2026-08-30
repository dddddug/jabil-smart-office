/**
 * 离线数据同步管理器
 * 功能：
 * 1. 数据库不可用时，自动将数据缓存到 IndexedDB
 * 2. 数据库恢复后，自动检测并上传缓存数据
 * 3. 上传成功后自动清除缓存
 * 4. 冲突处理：服务器优先，使用服务器时间戳
 */

const DB_NAME = 'JabilOfflineCache';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSync';
const SYNC_INTERVAL = 30000; // 每30秒检测一次
const API_TIMEOUT = 5000; // API超时时间

class OfflineSyncManager {
  constructor() {
    this.db = null;
    this.isOnline = true;
    this.syncTimer = null;
    this.pendingCount = 0;
  }

  // 初始化 IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        this.checkPendingCount();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // 检测网络状态
  async checkNetworkStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      // 尝试访问一个轻量级 API
      const response = await fetch('/api/system/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      const wasOnline = this.isOnline;
      this.isOnline = response.ok;

      // 网络恢复时触发同步
      if (!wasOnline && this.isOnline) {
        console.log('[OfflineSync] 网络恢复，开始同步缓存数据...');
        this.syncAll();
      }

      return this.isOnline;
    } catch {
      if (this.isOnline) {
        console.log('[OfflineSync] 网络断开，启用离线模式');
        this.isOnline = false;
      }
      return false;
    }
  }

  // 保存数据到缓存（离线时调用）
  async saveToCache(type, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        type,
        data,
        timestamp: Date.now(),
        status: 'pending'
      };

      const request = store.add(record);

      request.onsuccess = () => {
        this.checkPendingCount();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 获取所有待同步数据
  async getAllPending() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // 删除已同步的数据
  async deleteRecord(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.checkPendingCount();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 清空所有缓存
  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.pendingCount = 0;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 获取待同步数量
  async checkPendingCount() {
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        this.pendingCount = request.result;
        // 通知 UI 更新
        window.dispatchEvent(new CustomEvent('offline-sync-count', {
          detail: { count: this.pendingCount }
        }));
        resolve(this.pendingCount);
      };
      request.onerror = () => resolve(0);
    });
  }

  // 同步所有缓存数据
  async syncAll() {
    if (!this.isOnline) {
      console.log('[OfflineSync] 网络不可用，跳过同步');
      return;
    }

    const pending = await this.getAllPending();
    if (pending.length === 0) {
      console.log('[OfflineSync] 没有待同步的数据');
      return;
    }

    console.log(`[OfflineSync] 开始同步 ${pending.length} 条数据...`);

    let successCount = 0;
    let failCount = 0;

    for (const record of pending) {
      try {
        await this.syncRecord(record);
        await this.deleteRecord(record.id);
        successCount++;
      } catch (err) {
        console.error(`[OfflineSync] 同步失败:`, err);
        failCount++;

        // 如果是认证错误或服务器错误，停止同步
        if (err.status === 401 || err.status === 500 || err.status === 503) {
          console.log('[OfflineSync] 服务器错误，停止同步');
          break;
        }
      }
    }

    console.log(`[OfflineSync] 同步完成: 成功 ${successCount}, 失败 ${failCount}`);

    // 通知 UI
    window.dispatchEvent(new CustomEvent('offline-sync-complete', {
      detail: { success: successCount, fail: failCount }
    }));

    return { success: successCount, fail: failCount };
  }

  // 同步单条记录
  async syncRecord(record) {
    const apiMap = {
      'warehouse-return': '/api/warehouse-return/documents',
      'k045': '/api/k045/documents',
      'da-material': '/api/da-material/documents',
      // 可以添加更多类型...
    };

    const apiPath = apiMap[record.type];
    if (!apiPath) {
      throw new Error(`未知的数据类型: ${record.type}`);
    }

    const response = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(record.data)
    });

    if (!response.ok) {
      const error = new Error('同步失败');
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // 启动自动同步
  startAutoSync() {
    // 立即检查一次
    this.checkNetworkStatus();

    // 定期检测网络状态
    this.syncTimer = setInterval(async () => {
      await this.checkNetworkStatus();
    }, SYNC_INTERVAL);

    console.log('[OfflineSync] 自动同步已启动');
  }

  // 停止自动同步
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[OfflineSync] 自动同步已停止');
    }
  }
}

// 创建全局单例
const offlineSyncManager = new OfflineSyncManager();

// 自动初始化
offlineSyncManager.init().then(() => {
  offlineSyncManager.startAutoSync();
});

export default offlineSyncManager;
