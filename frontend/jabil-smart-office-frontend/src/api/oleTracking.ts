import request from '@/utils/request';

/**
 * 部门OLE追踪 API
 */

// ========== 类型定义 ==========

// OLE统计查询参数
export interface OleTrackingQueryParams {
  startDate?: string;
  endDate?: string;
  fiscalMonth?: string;
  employeeId?: number;
  areaName?: string;
  shiftType?: 'day' | 'night' | 'all';
  departmentId?: number;
  limit?: number;
}

// 班次明细查询参数
export interface OleShiftDetailQueryParams {
  date: string;
  shift: string;
  departmentId?: number;
  areaName?: string;
}

// 效率排名查询参数
export interface OleRankingQueryParams {
  startDate?: string;
  endDate?: string;
  fiscalMonth?: string;
  departmentId?: number;
  limit?: number;
}

// 配置项接口 (使用snake_case以匹配后端API响应)
export interface LevelEfficiencyConfig {
  id?: number;
  level_name?: string;
  levelName?: string;
  target_efficiency?: number | null;
  targetEfficiency?: number;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AreaCoefficientConfig {
  id?: number;
  area_name?: string;
  areaName?: string;
  iws_coefficient?: number;
  iwsCoefficient?: number;
  plr_coefficient?: number;
  plrCoefficient?: number;
  flr_coefficient?: number;
  flrCoefficient?: number;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ========== API 函数 ==========

// 获取OLE追踪统计数据
export const getOleTrackingStats = (params: OleTrackingQueryParams) => {
  return request.get('/ole-tracking/stats', { params });
};

// 获取效率达标排名
export const getOleTrackingRanking = (params: OleRankingQueryParams) => {
  return request.get('/ole-tracking/ranking', { params });
};

// 获取Area效率统计
export const getOleAreaStats = (params: OleTrackingQueryParams) => {
  return request.get('/ole-tracking/area-stats', { params });
};

// 获取差异统计数据
export const getOleDiffStats = (params: OleTrackingQueryParams) => {
  return request.get('/ole-tracking/diff-stats', { params });
};

// 获取班次明细数据
export const getOleShiftDetail = (params: OleShiftDetailQueryParams) => {
  return request.get('/ole-tracking/shift-detail', { params });
};

// ========== 配置管理 ==========

// 岗位等级目标效率配置
export const getLevelEfficiencyConfig = () => {
  return request.get('/ole-tracking/config/level-efficiency');
};

export const createLevelEfficiencyConfig = (data: LevelEfficiencyConfig) => {
  return request.post('/ole-tracking/config/level-efficiency', data);
};

export const updateLevelEfficiencyConfig = (id: number, data: LevelEfficiencyConfig) => {
  return request.put(`/ole-tracking/config/level-efficiency/${id}`, data);
};

export const deleteLevelEfficiencyConfig = (id: number) => {
  return request.delete(`/ole-tracking/config/level-efficiency/${id}`);
};

// Area效率系数配置
export const getAreaCoefficientConfig = () => {
  return request.get('/ole-tracking/config/area-coefficient');
};

export const createAreaCoefficientConfig = (data: AreaCoefficientConfig) => {
  return request.post('/ole-tracking/config/area-coefficient', data);
};

export const updateAreaCoefficientConfig = (id: number, data: AreaCoefficientConfig) => {
  return request.put(`/ole-tracking/config/area-coefficient/${id}`, data);
};

export const deleteAreaCoefficientConfig = (id: number) => {
  return request.delete(`/ole-tracking/config/area-coefficient/${id}`);
};

// ========== 不参与效率计算的Area配置 ==========

export interface ExcludedArea {
  id?: number;
  area_name: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getExcludedAreas = () => {
  return request.get('/ole-tracking/config/excluded-areas');
};

export const updateExcludedAreas = (areas: ExcludedArea[]) => {
  return request.put('/ole-tracking/config/excluded-areas', { areas });
};

export const getAllAreas = () => {
  return request.get('/ole-tracking/config/all-areas');
};

// ========== Area效率计算规则配置 ==========

export interface AreaCalcRule {
  id?: number;
  area_list: string;
  iws_enabled: boolean;
  flr_enabled: boolean;
  plr_enabled: boolean;
  enabled: boolean;
  iws_seconds?: number;
  flr_seconds?: number;
  plr_seconds?: number;
  created_at?: string;
  updated_at?: string;
}

export const getAreaRules = () => {
  return request.get('/ole-tracking/config/area-rules');
};

export const createAreaRule = (data: Partial<AreaCalcRule>) => {
  return request.post('/ole-tracking/config/area-rules', data);
};

export const updateAreaRule = (id: number, data: Partial<AreaCalcRule>) => {
  return request.put(`/ole-tracking/config/area-rules/${id}`, data);
};

export const deleteAreaRule = (id: number) => {
  return request.delete(`/ole-tracking/config/area-rules/${id}`);
};
