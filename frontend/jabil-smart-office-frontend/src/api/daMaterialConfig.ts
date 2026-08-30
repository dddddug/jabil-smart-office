import request from '../utils/request';

/**
 * 管控物料 配置模块 API
 */

// 配置接口定义
export interface DAMaterialConfig {
  id?: number;
  configKey: string;
  configValue: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 获取所有配置
export const getDAMaterialConfigs = () => {
  return request.get<DAMaterialConfig[]>('/da-material-config/configs');
};

// 更新配置
export const updateDAMaterialConfigs = (configs: Array<{ configKey: string; configValue: string }>) => {
  return request.post('/da-material-config/configs', configs);
};

// 管控物料 配置项 key 常量
export const DAMATERIAL_CONFIG_KEYS = {
  CONTROL_TYPES: 'control_types',
  RETURN_NOTIFICATION_EMAIL: 'return_notification_email',
  RETURN_NOTIFICATION_ENABLED: 'return_notification_enabled',
  AUTO_NOTIFY_ON_RETURN: 'auto_notify_on_return',
  WC_DEPARTMENT_ASSIGNMENT: 'wc_department_assignment',  // W/C部门分配配置
  DELIVERY_LOCATIONS: 'delivery_locations'  // 配送地点配置
} as const;

// W/C部门分配配置项
export interface WCDeptAssignment {
  id: number;
  wcName: string;      // W/C名称
  departmentId: number; // 部门ID
  departmentName: string; // 部门名称（用于显示）
}
