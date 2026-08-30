import request from '../utils/request';

/**
 * 物料包装信息 API
 */

export interface MaterialPackage {
  id?: number;
  partNo: string;
  materialGroup?: string;
  manufacturer?: string;
  spec?: string;
  length?: number;
  width?: number;
  height?: number;
  thickness?: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface MaterialPackageQueryParams {
  partNo?: string;
  materialGroup?: string;
  manufacturer?: string;
  page?: number;
  pageSize?: number;
}

export interface MaterialPackageListResponse {
  items: MaterialPackage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchImportResult {
  inserted: number;
  updated: number;
  errors: string[];
}

// 获取物料包装信息列表
export const getMaterialPackages = (params?: MaterialPackageQueryParams) => {
  return request.get<MaterialPackageListResponse>('/material-package', { params });
};

// 获取单条物料包装信息
export const getMaterialPackageById = (id: number) => {
  return request.get<MaterialPackage>(`/material-package/${id}`);
};

// 创建物料包装信息
export const createMaterialPackage = (data: Partial<MaterialPackage>) => {
  return request.post('/material-package', data);
};

// 更新物料包装信息
export const updateMaterialPackage = (id: number, data: Partial<MaterialPackage>) => {
  return request.put(`/material-package/${id}`, data);
};

// 删除物料包装信息
export const deleteMaterialPackage = (id: number) => {
  return request.delete(`/material-package/${id}`);
};

// 批量导入物料包装信息（文件上传）
export const batchImportMaterialPackages = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<BatchImportResult>('/material-package/batch-import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 下载导入模板
export const downloadMaterialPackageTemplate = () => {
  const token = localStorage.getItem('jabil-token') || localStorage.getItem('token');
  const url = `/api/material-package/template/download`;
  const link = document.createElement('a');
  link.href = url;
  link.download = '物料包装信息导入模板.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 导出物料包装信息
export const exportMaterialPackages = (params?: MaterialPackageQueryParams) => {
  return request.get<MaterialPackage[]>('/material-package/export/all', { params });
};
