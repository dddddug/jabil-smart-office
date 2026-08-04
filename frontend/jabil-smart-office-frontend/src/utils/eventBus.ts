// 持久化事件总线，用于跨组件通信（支持页面未加载时的消息暂存）
const PENDING_EVENTS_KEY = 'jabil-pending-events';

// 存储待处理事件
const savePendingEvent = (event: string, data?: any) => {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_EVENTS_KEY) || '{}');
    pending[event] = { data, timestamp: Date.now() };
    sessionStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('保存待处理事件失败:', e);
  }
};

// 获取并清除待处理事件
const consumePendingEvent = (event: string): any | null => {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_EVENTS_KEY) || '{}');
    const eventData = pending[event];
    if (eventData) {
      delete pending[event];
      sessionStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(pending));
      return eventData.data;
    }
  } catch (e) {
    console.error('获取待处理事件失败:', e);
  }
  return null;
};

const eventBus = {
  listeners: {} as Record<string, Array<Function>>,

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // 检查是否有待处理的事件
    const pendingData = consumePendingEvent(event);
    if (pendingData !== null) {
      console.log(`[EventBus] 发现待处理事件 ${event}，立即触发`);
      callback(pendingData);
    }
  },

  off(event: string, callback?: Function) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  },

  emit(event: string, data?: any) {
    // 如果有监听器，立即触发
    if (this.listeners[event] && this.listeners[event].length > 0) {
      console.log(`[EventBus] 触发事件 ${event}`, data);
      this.listeners[event].forEach(callback => callback(data));
    } else {
      // 没有监听器，保存到 sessionStorage 供后续使用
      console.log(`[EventBus] 没有监听器，暂存事件 ${event}`);
      savePendingEvent(event, data);
    }
  }
};

export default eventBus;
