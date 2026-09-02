import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

// Token key for localStorage
const TOKEN_KEY = 'jabil-token';

// Function to get token from localStorage
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Function to set token in localStorage
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Function to remove token from localStorage
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// 定义后端标准响应的接口
interface ServiceResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 扩展 AxiosInstance 以便直接返回数据而不是 AxiosResponse
interface CustomAxiosInstance extends AxiosInstance {
  get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
  post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
}

// ========== 请求去重与缓存 ==========
const pendingRequests = new Map<string, AbortController>();
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// ========== 请求防抖 ==========
const debounceMap = new Map<string, {
  timer: ReturnType<typeof setTimeout> | null;
  resolve: ((value?: any) => void) | null;
  reject: ((reason?: any) => void) | null;
  config: AxiosRequestConfig | null;
}>();
const DEBOUNCE_DELAY = 100; // 防抖延迟 100ms

// 生成请求唯一标识（排除 _t 参数，因为它只是用于防止缓存）
// 这个函数应该只用于生成缓存键，不考虑 _t 参数
const generateRequestKey = (url: string, params?: any, data?: any): string => {
  // 排除 _t 参数，因为它每次请求都会变
  const filteredParams = params ? Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== '_t')
  ) : {};
  return `${url}:${JSON.stringify(filteredParams)}:${JSON.stringify(data || {})}`;
};

// 清理过期缓存
const clearExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
};

// 定期清理过期缓存
setInterval(clearExpiredCache, CACHE_TTL);

// 加载状态管理
type LoadingCallback = (loading: boolean) => void;
const loadingCallbacks: Set<LoadingCallback> = new Set();
let globalLoadingCount = 0;

export const registerLoadingCallback = (callback: LoadingCallback): (() => void) => {
  loadingCallbacks.add(callback);
  return () => loadingCallbacks.delete(callback);
};

const updateLoadingState = (isLoading: boolean): void => {
  globalLoadingCount += isLoading ? 1 : -1;
  loadingCallbacks.forEach(cb => cb(globalLoadingCount > 0));
};

// 防抖执行函数
const executeDebouncedRequest = (key: string): void => {
  const entry = debounceMap.get(key);
  if (!entry) return;

  const config = entry.config; // 保存当前的 config 引用
  const resolve = entry.resolve;
  const reject = entry.reject;

  // 清理
  if (entry.timer) clearTimeout(entry.timer);
  debounceMap.delete(key);

  if (!config) return;

  // 实际执行请求
  service(config)
    .then(result => resolve?.(result))
    .catch(error => reject?.(error));
};

// 创建 axios 实例
const service: CustomAxiosInstance = axios.create({
  baseURL: '/api', // 后端 API 的 base_url，通过 Vite 代理转发
  timeout: 60000, // 请求超时时间
});

// 存储原始请求方法（用于防抖后执行）
const originalRequest = service.request.bind(service);

// 自定义请求方法，添加防抖支持
service.request = function <T = any, R = T, D = any>(
  config: AxiosRequestConfig<D>
): Promise<R> {
  return new Promise((resolve, reject) => {
    // 对于 GET 请求使用防抖
    if (config.method === 'get') {
      const requestKey = generateRequestKey(config.url!, config.params, config.data);

      // 如果已有相同的请求在等待中，复用它
      if (debounceMap.has(requestKey)) {
        const entry = debounceMap.get(requestKey)!;
        // 取消之前的定时器
        if (entry.timer) {
          clearTimeout(entry.timer);
        }
        // 创建新的 Promise 并覆盖之前的回调
        entry.resolve = resolve;
        entry.reject = reject;
        // 重新设置防抖定时器
        entry.timer = setTimeout(() => {
          executeDebouncedRequest(requestKey);
        }, DEBOUNCE_DELAY);
        return;
      }

      // 创建新的防抖条目
      debounceMap.set(requestKey, {
        timer: setTimeout(() => {
          executeDebouncedRequest(requestKey);
        }, DEBOUNCE_DELAY),
        resolve,
        reject,
        config
      });
      return;
    }

    // 非 GET 请求直接执行
    (originalRequest(config as any) as Promise<any>)
      .then((res: any) => resolve(res))
      .catch((err: any) => reject(err));
  });
} as any;

// request interceptor
service.interceptors.request.use(
  config => {
    // 添加 token
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 对 GET 请求进行去重和缓存检查
    if (config.method === 'get') {
      // 关键：先生成缓存键（此时还没有 _t 参数）
      const requestKey = generateRequestKey(config.url!, config.params, config.data);

      // 临时禁用缓存 - 分页请求不应该使用缓存
      // TODO: 将来可以改为基于 URL + 分页参数 的缓存策略
      // 暂时注释掉缓存检查
      /*
      if (requestCache.has(requestKey)) {
        const cached = requestCache.get(requestKey)!;
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          return Promise.reject({
            __CACHED__: true,
            __CACHED_DATA__: cached.data,
            config
          });
        } else {
          requestCache.delete(requestKey);
        }
      }
      */

      // 取消之前的相同请求（去重）- 仅当不在防抖中时
      if (pendingRequests.has(requestKey) && !debounceMap.has(requestKey)) {
        pendingRequests.get(requestKey)?.abort();
        pendingRequests.delete(requestKey);
      }

      // 创建新的 AbortController
      const controller = new AbortController();
      config.signal = controller.signal;
      pendingRequests.set(requestKey, controller);

      // 添加时间戳防止缓存
      config.params = { ...config.params, _t: Date.now() };
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  response => {
    // 清理 pending 请求 - 使用相同的缓存键生成方式（但要用没有 _t 的原始 params）
    const originalParams = { ...response.config.params };
    delete originalParams._t; // 移除 _t 以匹配请求时的缓存键
    const requestKey = generateRequestKey(response.config.url!, originalParams, response.config.data);
    pendingRequests.delete(requestKey);

    // 如果是文件下载，返回 blob 数据
    if (response.config.responseType === 'blob') {
      return response.data
    }

    // Check if the response is a standard API response with code, message, data structure
    if (response.data && typeof response.data.code !== 'undefined') {
      const { code, message, data } = response.data;
      if (code !== 200 && code !== 201) {
        return Promise.reject({
          code,
          message: message || 'Error',
          details: response.data.details || []
        });
      } else {
        // 缓存 GET 请求的响应数据（存储完整响应结构）
        if (response.config.method === 'get') {
          requestCache.set(requestKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }

        // 返回完整响应对象
        return response.data;
      }
    } else {
      return response.data;
    }
  },
  error => {
    // 处理缓存命中 - 返回完整响应对象
    if (error.__CACHED__ && error.__CACHED_DATA__) {
      return error.__CACHED_DATA__;
    }

    // 清理 pending 请求 - 使用相同的缓存键生成方式（但要用没有 _t 的原始 params）
    if (error.config) {
      const originalParams = { ...error.config.params };
      delete originalParams._t; // 移除 _t 以匹配请求时的缓存键
      const requestKey = generateRequestKey(error.config.url!, originalParams, error.config.data);
      pendingRequests.delete(requestKey);
    }

    // 如果是被主动取消的请求，静默处理（不显示错误）
    if (axios.isCancel(error)) {
      return Promise.reject({ code: 'CANCELLED', message: '请求已取消', isCancelled: true, silent: true });
    }

    // If it's an Axios error, extract more details if available
    if (error.response && error.response.data) {
      const { code, message, error: errorMessage } = error.response.data;
      // Handle 401 Unauthorized errors globally
      if (error.response.status === 401) {
        removeToken(); // Remove invalid token
        localStorage.removeItem('isLoggedIn'); // Clear isLoggedIn status
        localStorage.removeItem('user'); // Clear user info
        localStorage.removeItem('userRole'); // Clear user role
        localStorage.removeItem('userPlantId'); // Clear user plant ID
        localStorage.removeItem('userDepartmentId'); // Clear user department ID
        // Force redirect to login page
        window.location.href = '/login';
        ElMessage.error({ message: '认证失败或会话过期，请重新登录。', showClose: true, duration: 3000 });
      }
      return Promise.reject({
        code: code || error.response.status,
        message: message || errorMessage || error.message || '未知错误',
        details: error.response.data.details || []
      });
    }

    // 网络错误处理
    if (!error.response) {
      ElMessage.error({ message: '网络连接失败，请检查网络设置。', showClose: true, duration: 3000 });
    }

    return Promise.reject({ message: error.message || '网络请求失败' });
  }
)

// 导出清除缓存的方法
export const clearRequestCache = (): void => {
  requestCache.clear();
};

// 导出取消所有 pending 请求的方法
export const cancelAllPendingRequests = (): void => {
  pendingRequests.forEach(controller => controller.abort());
  pendingRequests.clear();
};

// 导出取消防抖请求的方法
export const cancelDebouncedRequests = (): void => {
  debounceMap.forEach((entry, key) => {
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.reject?.({ message: '请求已取消', __CANCELLED__: true });
  });
  debounceMap.clear();
};

export default service;
