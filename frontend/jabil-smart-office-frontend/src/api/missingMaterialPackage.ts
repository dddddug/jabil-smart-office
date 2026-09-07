import request from '../utils/request';

/**
 * 待填充物料 API
 */

export interface MissingMaterial {
  id?: number;
  material: string;
  manufacturer?: string;
  createdAt?: string;
}

export interface MissingMaterialQueryParams {
  material?: string;
  manufacturer?: string;
  page?: number;
  pageSize?: number;
}

export interface MissingMaterialListResponse {
  items: MissingMaterial[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MissingMaterialStats {
  missingCount: number;
  manufacturerCount: number;
  packageCount: number;
}

// 获取待填充物料列表
export const getMissingMaterials = (params?: MissingMaterialQueryParams) => {
  return request.get<MissingMaterialListResponse>('/missing-material-package', { params });
};

// 获取待填充物料统计
export const getMissingMaterialsStats = () => {
  return request.get<MissingMaterialStats>('/missing-material-package/stats');
};

// 同步待填充物料数据
export const syncMissingMaterials = () => {
  return request.post('/missing-material-package/sync');
};

// 导出待填充物料
export const exportMissingMaterials = (params?: MissingMaterialQueryParams) => {
  return request.get<MissingMaterial[]>('/missing-material-package/export', { params });
};
