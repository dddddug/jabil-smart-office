import request from '../utils/request';

/**
 * K**差异登记 API
 */

// 配置接口定义
export interface K2DiffConfigItem {
  configKey: string;
  configValue: string;
  description?: string;
}

// 差异类型/退料地点配置项
export interface ConfigListItem {
  id: number;
  name: string;
}

// 邮件配置
export interface EmailConfig {
  enabled: boolean;
  recipients: string;
  cc: string;
}

// 登记记录接口定义
export interface K2DiffRegistration {
  id?: number;
  registrationDate: string;      // 登记日期
  shift: string;                 // 班次: A/C
  partNo: string;                // Part no
  grn?: string;                  // GRN
  qty: number;                  // 数量
  location?: string;             // 位置
  problemDescription?: string;   // 问题描述
  registrationTime?: string;      // 登记时间
  returnLocation?: string;       // 退料地点
  recorder: string;              // 记录人
  createdAt?: string;
  updatedAt?: string;
}

// 查询参数
export interface K2DiffQueryParams {
  startDate?: string;
  endDate?: string;
  shift?: string;
  partNo?: string;
  grn?: string;
  returnLocation?: string;
  recorder?: string;
  page?: number;
  pageSize?: number;
}

// 创建/更新参数
export interface K2DiffRegistrationForm {
  partNo: string;
  grn?: string;
  qty?: number;
  location?: string;
  problemDescription?: string;
  returnLocation?: string;
}

// 统计数据
export interface K2DiffStats {
  today: {
    total: number;
    shiftA: number;
    shiftC: number;
  };
  last7Days: {
    total: number;
    shiftA: number;
    shiftC: number;
  };
  daily: Array<{
    date: string;
    count: number;
    shiftA: number;
    shiftC: number;
  }>;
}

// ========== 配置 API ==========

// 获取所有配置
export const getK2DiffConfigs = () => {
  return request.get<K2DiffConfigItem[]>('/k2-diff-config/configs');
};

// 更新配置
export const updateK2DiffConfigs = (configs: Array<{ configKey: string; configValue: string }>) => {
  return request.post('/k2-diff-config/configs', configs);
};

// 获取差异类型列表
export const getK2DiffDifferenceTypes = () => {
  return request.get<ConfigListItem[]>('/k2-diff-config/difference-types');
};

// 获取退料地点列表
export const getK2DiffReturnLocations = () => {
  return request.get<ConfigListItem[]>('/k2-diff-config/return-locations');
};

// 获取邮件配置
export const getK2DiffEmailConfig = () => {
  return request.get<EmailConfig>('/k2-diff-config/email-config');
};

// ========== 登记记录 API ==========

// 获取登记记录列表
export const getK2DiffRegistrations = (params?: K2DiffQueryParams) => {
  return request.get('/k2-diff/registrations', { params });
};

// 获取登记记录详情
export const getK2DiffRegistrationById = (id: number) => {
  return request.get<K2DiffRegistration>(`/k2-diff/registrations/${id}`);
};

// 创建登记记录
export const createK2DiffRegistration = (data: K2DiffRegistrationForm) => {
  return request.post('/k2-diff/registrations', data);
};

// 更新登记记录
export const updateK2DiffRegistration = (id: number, data: Partial<K2DiffRegistrationForm>) => {
  return request.put(`/k2-diff/registrations/${id}`, data);
};

// 删除登记记录
export const deleteK2DiffRegistration = (id: number) => {
  return request.delete(`/k2-diff/registrations/${id}`);
};

// 获取统计数据
export const getK2DiffStats = () => {
  return request.get<K2DiffStats>('/k2-diff/stats');
};

// 获取类型统计（数据库聚合）
export const getK2DiffTypeStats = (startDate?: string, endDate?: string) => {
  return request.get<Array<{ name: string; value: number }>>('/k2-diff/type-stats', {
    params: { startDate, endDate }
  });
};

// 发送邮件通知
export const sendK2DiffNotification = (id: number) => {
  return request.post(`/k2-diff/registrations/${id}/notify`);
};

// 批量发送邮件通知（合并所有记录为一封邮件）
export const sendK2DiffBulkNotification = (ids: number[]) => {
  return request.post(`/k2-diff/registrations/notify-bulk`, { ids });
};

// K**差异登记配置项 key 常量
export const K2_DIFF_CONFIG_KEYS = {
  DIFFERENCE_TYPES: 'difference_types',
  RETURN_LOCATIONS: 'return_locations',
  EMAIL_NOTIFICATION_ENABLED: 'email_notification_enabled',
  EMAIL_RECIPIENTS: 'email_recipients',
  EMAIL_CC: 'email_cc'
} as const;
