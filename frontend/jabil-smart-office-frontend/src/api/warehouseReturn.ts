/**
 * 回仓申请 API
 */
import request from '../utils/request';

// 查询参数类型
interface DocumentQueryParams {
  page?: number;
  pageSize?: number;
  returnNo?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  submitterName?: string;
  bayNo?: string;
}

// 创建/更新参数类型
interface DocumentData {
  bayNo: string;
  receiveBuilding: string;
  items: Array<{
    material: string;
    qty: number;
    bayNo: string;
  }>;
}

// 退回参数类型
interface ReturnItemsData {
  itemIds: number[];
  reason: string;
}

// 关闭参数类型
interface CloseItemsData {
  itemIds: number[];
}

// Building 配置类型
interface BuildingConfig {
  id?: number;
  code: string;
  name: string;
  isActive?: boolean;
  sortOrder?: number;
}

// 邮件抄送配置类型
interface EmailCcConfig {
  email: string;
  emailType?: string;
}

// 获取单据列表
export const getDocuments = (params?: DocumentQueryParams) => {
  return request.get('/warehouse-return/documents', { params });
};

// 获取单据详情
export const getDocumentById = (id: number) => {
  return request.get(`/warehouse-return/documents/${id}`);
};

// 创建回仓申请
export const createDocument = (data: DocumentData) => {
  return request.post('/warehouse-return/documents', data);
};

// 更新回仓申请（退回重提）
export const updateDocument = (id: number, data: DocumentData) => {
  return request.put(`/warehouse-return/documents/${id}`, data);
};

// 接收单据
export const receiveDocument = (id: number) => {
  return request.post(`/warehouse-return/documents/${id}/receive`);
};

// 执行对账
export const reconcileDocument = (id: number) => {
  return request.post(`/warehouse-return/documents/${id}/reconcile`);
};

// 退回选中明细
export const returnItems = (id: number, data: ReturnItemsData) => {
  return request.post(`/warehouse-return/documents/${id}/return-items`, data);
};

// 关闭选中明细
export const closeItems = (id: number, data: CloseItemsData) => {
  return request.post(`/warehouse-return/documents/${id}/close-items`, data);
};

// 确认 SAP 独有项
export const confirmSapOnly = (id: number, data: CloseItemsData) => {
  return request.post(`/warehouse-return/documents/${id}/confirm-sap-only`, data);
};

// 获取对账日志
export const getDocumentLogs = (id: number) => {
  return request.get(`/warehouse-return/documents/${id}/logs`);
};

// 补发邮件
export const resendEmail = (id: number, data: { emailLogId: number }) => {
  return request.post(`/warehouse-return/documents/${id}/resend-email`, data);
};

// 获取统计数据
export const getStats = () => {
  return request.get('/warehouse-return/stats');
};

// 获取 Building 列表
export const getBuildings = () => {
  return request.get('/warehouse-return/config/buildings');
};

// 获取所有 Building 配置（包括未启用的）
export const getAllBuildingConfigs = () => {
  return request.get('/warehouse-return/config/buildings/all');
};

// 保存 Building 配置
export const saveBuildingConfigs = (data: { buildings: BuildingConfig[] }) => {
  return request.post('/warehouse-return/config/buildings', data);
};

// 获取邮件抄送配置
export const getEmailCcConfig = () => {
  return request.get('/warehouse-return/config/email-cc');
};

// 保存邮件抄送配置
export const saveEmailCcConfig = (data: { configs: EmailCcConfig[] }) => {
  return request.post('/warehouse-return/config/email-cc', data);
};

// 下载导入模板
export const getTemplate = () => {
  return request.get('/warehouse-return/template');
};

export default {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  receiveDocument,
  reconcileDocument,
  returnItems,
  closeItems,
  confirmSapOnly,
  getDocumentLogs,
  resendEmail,
  getStats,
  getBuildings,
  getAllBuildingConfigs,
  saveBuildingConfigs,
  getEmailCcConfig,
  saveEmailCcConfig,
  getTemplate
};
