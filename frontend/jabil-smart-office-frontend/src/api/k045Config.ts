import request from '../utils/request';

// K045 配置接口定义
export interface K045Config {
  id?: number;
  configKey: string;
  configValue: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 配送地点配置项
export interface DeliveryLocationConfig {
  location: string;
  departments: string;
}

// 获取所有配置
export const getK045Configs = () => {
  return request.get<K045Config[]>('/k045/configs');
};

// 更新配置
export const updateK045Configs = (configs: Array<{ configKey: string; configValue: string }>) => {
  return request.post('/k045/configs', configs);
};

// K045 配置项 key 常量
export const K045_CONFIG_KEYS = {
  RETURN_NOTIFICATION_ENABLED: 'return_notification_enabled',
  AUTO_NOTIFY_ON_RETURN: 'auto_notify_on_return',
  DELIVERY_LOCATIONS: 'delivery_locations'
} as const;
