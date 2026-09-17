/**
 * 仓储差异登记 API
 * 创建时间: 2026-09-07
 */
import request from '../utils/request';

// ========== 类型定义 ==========

// 登记记录
export interface WarehouseDiffRegistration {
  id?: number;
  seqNo?: number;
  registrationDate: string;
  partNo: string;
  qty: number;
  diffType?: string;
  diffDescription?: string;
  materialId?: string;
  diffPic?: string;
  recorder: string;
  handlingResult?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 查询参数
export interface WarehouseDiffQueryParams {
  startDate?: string;
  endDate?: string;
  partNo?: string;
  diffType?: string;
  diffPic?: string;
  recorder?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// 创建/更新参数
export interface WarehouseDiffFormData {
  registrationDate?: string;
  partNo: string;
  qty?: number;
  diffType?: string;
  diffDescription?: string;
  materialId?: string;
  diffPic?: string;
  handlingResult?: string;
  remarks?: string;
}

// 统计数据
export interface WarehouseDiffStats {
  today: number;
  week: number;
  month: number;
  pending: number;
}

// 图表数据项
export interface ChartDataItem {
  name: string;
  value: number;
}

// 趋势数据
export interface TrendData {
  xAxis: string[];
  data: number[];
}

// ========== 配置 API ==========

// 获取差异类型列表
export const getDiffTypes = () => {
  return request.get<string[]>('/warehouse-diff/config/diff-types');
};

// 更新差异类型列表
export const updateDiffTypes = (diffTypes: string[]) => {
  return request.post('/warehouse-diff/config/diff-types', { diffTypes });
};

// ========== 登记记录 API ==========

// 获取登记记录列表
export const getRegistrations = (params?: WarehouseDiffQueryParams) => {
  return request.get('/warehouse-diff/registrations', { params });
};

// 获取登记记录详情
export const getRegistrationById = (id: number) => {
  return request.get<WarehouseDiffRegistration>(`/warehouse-diff/registrations/${id}`);
};

// 创建登记记录
export const createRegistration = (data: WarehouseDiffFormData) => {
  return request.post('/warehouse-diff/registrations', data);
};

// 更新登记记录
export const updateRegistration = (id: number, data: Partial<WarehouseDiffFormData>) => {
  return request.put(`/warehouse-diff/registrations/${id}`, data);
};

// 删除登记记录
export const deleteRegistration = (id: number) => {
  return request.delete(`/warehouse-diff/registrations/${id}`);
};

// ========== 统计 API ==========

// 获取统计数据
export const getStats = () => {
  return request.get<WarehouseDiffStats>('/warehouse-diff/stats');
};

// 按类型统计
export const getTypeStats = (startDate?: string, endDate?: string, period?: string) => {
  return request.get<ChartDataItem[]>('/warehouse-diff/stats/by-type', {
    params: { startDate, endDate, period }
  });
};

// PIC排名统计
export const getPicStats = (startDate?: string, endDate?: string, period?: string) => {
  return request.get<ChartDataItem[]>('/warehouse-diff/stats/by-pic', {
    params: { startDate, endDate, period }
  });
};

// 趋势统计
export const getTrendStats = (period: 'day' | 'week' | 'month' | 'year' = 'day') => {
  return request.get<TrendData>('/warehouse-diff/stats/trend', {
    params: { period }
  });
};

// ========== 导入导出 API ==========

// 批量导入
export const importRegistrations = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/warehouse-diff/registrations/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 导出
export const exportRegistrations = (params?: WarehouseDiffQueryParams) => {
  return request.get('/warehouse-diff/registrations/export', {
    params,
    responseType: 'blob'
  });
};

// 下载导入模板
export const downloadTemplate = () => {
  return request.get('/warehouse-diff/template', {
    responseType: 'blob'
  });
};

// ========== 用户查询 API ==========

// 根据员工工号获取用户姓名
export const getUserRealNameByEmployeeId = (employeeId: string) => {
  return request.get<{ code: number; data: { realName: string | null } }>('/warehouse-diff/user/real-name', {
    params: { employeeId }
  });
};

// ========== 默认导出 ==========

export default {
  // 配置
  getDiffTypes,
  updateDiffTypes,
  // CRUD
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  // 统计
  getStats,
  getTypeStats,
  getPicStats,
  getTrendStats,
  // 导入导出
  importRegistrations,
  exportRegistrations,
  downloadTemplate
};
