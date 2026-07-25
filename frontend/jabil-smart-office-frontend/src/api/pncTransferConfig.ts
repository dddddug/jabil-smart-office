import request from '../utils/request';

// PNC转仓打印配置接口定义
export interface PncTransferConfig {
  id?: number;
  configName: string;
  recipientEmail?: string;
  ccEmail?: string;
  contactPhone?: string;
  recipientName?: string;
  receivingAddress?: string;
  systemLocation?: string;
  departmentId?: number;
  departmentName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 获取所有配置
export const getConfigs = () => {
  return request.get<PncTransferConfig[]>('/pnc-transfer/configs');
};

// 获取单个配置
export const getConfigById = (id: number) => {
  return request.get<PncTransferConfig>(`/pnc-transfer/configs/${id}`);
};

// 创建配置
export const createConfig = (data: Partial<PncTransferConfig>) => {
  return request.post('/pnc-transfer/configs', data);
};

// 更新配置
export const updateConfig = (id: number, data: Partial<PncTransferConfig>) => {
  return request.put(`/pnc-transfer/configs/${id}`, data);
};

// 删除配置
export const deleteConfig = (id: number) => {
  return request.delete(`/pnc-transfer/configs/${id}`);
};

// 获取活跃的配置列表（供下拉选择使用）
export const getActiveConfigs = () => {
  return request.get<PncTransferConfig[]>('/pnc-transfer/configs/active/list');
};
