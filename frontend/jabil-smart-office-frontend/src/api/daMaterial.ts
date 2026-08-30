import request from '../utils/request';

/**
 * 管控物料 单据模块 API
 * 流程：提交 -> 打印 -> 接收 -> 签收
 */

// 单据状态枚举
export enum DAMaterialStatus {
  SUBMITTED = 'submitted',           // 已提交（待打印/接收）
  PRINTED = 'printed',               // 已打印
  RECEIVED = 'received',             // 已接收
  MATERIAL_ISSUED = 'material_issued', // 已发料（已锁BIN）
  SIGNED = 'signed',                 // 已签收
  COMPLETED = 'completed',           // 已完成
  REJECTED = 'rejected',             // 已拒绝
  RETURNED = 'returned',             // 已退回
  CANCELLED = 'cancelled',           // 已取消
  WITHDRAWN = 'withdrawn'            // 已撤回
}

// 单据状态文本映射
export const DAMaterialStatusText: Record<DAMaterialStatus, string> = {
  [DAMaterialStatus.SUBMITTED]: '已提交',
  [DAMaterialStatus.PRINTED]: '已打印',
  [DAMaterialStatus.RECEIVED]: '已接收',
  [DAMaterialStatus.MATERIAL_ISSUED]: '已发料',
  [DAMaterialStatus.SIGNED]: '已签收',
  [DAMaterialStatus.COMPLETED]: '已完成',
  [DAMaterialStatus.REJECTED]: '已拒绝',
  [DAMaterialStatus.RETURNED]: '已退回',
  [DAMaterialStatus.CANCELLED]: '已取消',
  [DAMaterialStatus.WITHDRAWN]: '已撤回'
};

// 单据状态颜色映射
export const DAMaterialStatusColor: Record<DAMaterialStatus, string> = {
  [DAMaterialStatus.SUBMITTED]: '#FFA500',   // 橙色 - 待处理
  [DAMaterialStatus.PRINTED]: '#1890FF',     // 蓝色 - 已打印
  [DAMaterialStatus.RECEIVED]: '#722ED1',    // 紫色 - 已接收
  [DAMaterialStatus.MATERIAL_ISSUED]: '#13C2C2', // 青色 - 已发料
  [DAMaterialStatus.SIGNED]: '#52C41A',      // 绿色 - 已签收
  [DAMaterialStatus.COMPLETED]: '#13C2C2',   // 青色 - 已完成
  [DAMaterialStatus.REJECTED]: '#FF4D4F',    // 红色 - 拒绝
  [DAMaterialStatus.RETURNED]: '#722ED1',    // 紫色 - 退回
  [DAMaterialStatus.CANCELLED]: '#8C8C8C',   // 灰色 - 已取消
  [DAMaterialStatus.WITHDRAWN]: '#8C8C8C'    // 灰色 - 已撤回
};

// 单据接口定义
export interface DAMaterialDocument {
  id?: number;
  documentNo: string;              // 单号
  wcName: string;                  // W/C名称
  attachmentUrl?: string;          // 附件地址
  attachmentName?: string;         // 附件名称
  daNo: string;                    // DA编号
  ecnNo?: string;                  // ECN编号
  ecnAttachmentUrl?: string;       // ECN附件地址
  ecnAttachmentName?: string;      // ECN附件名称
  submitterName: string;           // 提交人姓名
  isUrgent: boolean;               // 是否加急
  isRush: boolean;                 // 是否催单
  controlType?: string;            // 管控类型
  isTO?: boolean;                 // 是否同步到K045
  deliveryLocation?: string;       // 配送地点
  status: DAMaterialStatus;        // 状态
  submittedAt?: string;            // 提交时间
  printedAt?: string;              // 打印时间
  printedBy?: string;              // 打印人
  receivedAt?: string;             // 接收时间
  receivedBy?: string;             // 接收人
  materialIssuedAt?: string;       // 已发料时间
  materialIssuedBy?: string;       // 已发料操作人
  signedAt?: string;               // 签收时间
  signedBy?: string;               // 签收人
  completedAt?: string;            // 完成时间
  completedBy?: string;            // 完成确认人
  rejectedAt?: string;             // 拒绝时间
  rejectReason?: string;           // 拒绝原因
  returnedAt?: string;             // 退回时间
  returnedBy?: string;             // 退回人
  returnReason?: string;           // 退回原因
  cancelledAt?: string;            // 取消时间
  cancelledBy?: string;            // 取消人
  withdrawnAt?: string;            // 撤回时间
  createdAt?: string;
  updatedAt?: string;
}

// 查询参数
export interface DAMaterialQueryParams {
  documentNo?: string;
  wcName?: string;
  status?: string;  // 支持逗号分隔的多个状态
  startDate?: string;
  endDate?: string;
  submitterName?: string;
  isUrgent?: boolean;
  page?: number;
  pageSize?: number;
}

// 创建/更新单据参数
export interface DAMaterialDocumentForm {
  documentNo: string;
  wcName: string;
  attachmentUrl?: string;
  attachmentName?: string;
  daNo: string;
  ecnNo?: string;
  ecnAttachmentUrl?: string;
  ecnAttachmentName?: string;
  submitterName: string;
  isUrgent: boolean;
  isRush?: boolean;
  controlType?: string;
  isTO?: boolean;
  deliveryLocation?: string;
}

// 上传附件响应
export interface DAMaterialUploadResponse {
  success: boolean;
  fileName: string;
  originalName: string;
  filePath: string;
}

// 上传单据附件（支持PDF、图片等）
export const uploadDAMaterialAttachment = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<DAMaterialUploadResponse>('/da-material/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 创建单据（提交）
export const createDAMaterialDocument = (data: DAMaterialDocumentForm) => {
  return request.post('/da-material/documents', data);
};

// 获取单据列表
export const getDAMaterialDocuments = (params?: DAMaterialQueryParams) => {
  return request.get('/da-material/documents', { params });
};

// 获取单据详情
export const getDAMaterialDocumentById = (id: number) => {
  return request.get(`/da-material/documents/${id}`);
};

// 更新单据
export const updateDAMaterialDocument = (id: number, data: Partial<DAMaterialDocumentForm>) => {
  return request.put(`/da-material/documents/${id}`, data);
};

// 撤回单据（提交部门）
export const withdrawDAMaterialDocument = (id: number) => {
  return request.post(`/da-material/documents/${id}/withdraw`);
};

// 打印单据
export const printDAMaterialDocument = (id: number, printedBy?: string) => {
  return request.post(`/da-material/documents/${id}/print`, { printedBy });
};

// 接收单据
export const receiveDAMaterialDocument = (id: number, receivedBy?: string) => {
  return request.post(`/da-material/documents/${id}/receive`, { receivedBy });
};

// 锁BIN（已发料）
export const lockBinDAMaterialDocument = (id: number, lockedBy?: string, k045Data?: {
  deliveryLocation: string;
  documentNo: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) => {
  return request.post(`/da-material/documents/${id}/lock-bin`, {
    lockedBy,
    deliveryLocation: k045Data?.deliveryLocation,
    k045DocumentNo: k045Data?.documentNo,
    k045AttachmentUrl: k045Data?.attachmentUrl,
    k045AttachmentName: k045Data?.attachmentName
  });
};

// 拒绝单据
export const rejectDAMaterialDocument = (id: number, reason: string) => {
  return request.post(`/da-material/documents/${id}/reject`, { reason });
};

// 退回单据
export const returnDAMaterialDocument = (id: number, reason: string, returnedBy?: string) => {
  return request.post(`/da-material/documents/${id}/return`, { reason, returnedBy });
};

// 签收单据
export const signDAMaterialDocument = (id: number, signedBy?: string) => {
  return request.post(`/da-material/documents/${id}/sign`, { signedBy });
};

// 确认完成
export const confirmDAMaterialComplete = (id: number, completedBy?: string) => {
  return request.post(`/da-material/documents/${id}/confirm-complete`, { completedBy });
};

// 取消单据（已退回状态可取消）
export const cancelDAMaterialDocument = (id: number, cancelledBy?: string) => {
  return request.post(`/da-material/documents/${id}/cancel`, { cancelledBy });
};

// 删除单据
export const deleteDAMaterialDocument = (id: number) => {
  return request.delete(`/da-material/documents/${id}`);
};

// 获取待处理单据统计
export const getDAMaterialStats = () => {
  return request.get('/da-material/stats');
};

// 催单
export const rushDAMaterialDocument = (id: number) => {
  return request.post(`/da-material/documents/${id}/rush`);
};

// 发送邮件通知
export const sendDAMaterialNotification = (id: number) => {
  return request.post(`/da-material/documents/${id}/notify`);
};

// 设置/取消加急
export const setUrgentDAMaterialDocument = (id: number, isUrgent: boolean) => {
  return request.put(`/da-material/documents/${id}`, { isUrgent });
};
