import request from '../utils/request';

/**
 * K045 单据模块 API
 * 流程：提交 -> 接收打印 -> 签收分料
 */

// 单据状态枚举
export enum K045Status {
  SUBMITTED = 'submitted',           // 已提交
  RECEIVED = 'received',             // 已接收（打印部门接单）
  REJECTED = 'rejected',             // 已拒绝
  RETURNED = 'returned',             // 已退回
  CANCELLED = 'cancelled',           // 已取消
  SIGNED = 'signed',                 // 已签收（分料部门签收）
  DISTRIBUTION_ENDED = 'distribution_ended', // 分料结束
  COMPLETED = 'completed',          // 已完成（提交人确认）
  WITHDRAWN = 'withdrawn'            // 已撤回
}

// 单据状态文本映射
export const K045StatusText: Record<K045Status, string> = {
  [K045Status.SUBMITTED]: '已提交',
  [K045Status.RECEIVED]: '已接收',
  [K045Status.REJECTED]: '已拒绝',
  [K045Status.RETURNED]: '已退回',
  [K045Status.CANCELLED]: '已取消',
  [K045Status.SIGNED]: '已签收',
  [K045Status.DISTRIBUTION_ENDED]: '分料结束',
  [K045Status.COMPLETED]: '已完成',
  [K045Status.WITHDRAWN]: '已撤回'
};

// 单据状态颜色映射
export const K045StatusColor: Record<K045Status, string> = {
  [K045Status.SUBMITTED]: '#FFA500',   // 橙色 - 待处理
  [K045Status.RECEIVED]: '#1890FF',    // 蓝色 - 进行中
  [K045Status.REJECTED]: '#FF4D4F',   // 红色 - 拒绝
  [K045Status.RETURNED]: '#722ED1',   // 紫色 - 退回
  [K045Status.CANCELLED]: '#8C8C8C',   // 灰色 - 已取消
  [K045Status.SIGNED]: '#52C41A',      // 绿色 - 已签收
  [K045Status.DISTRIBUTION_ENDED]: '#13C2C2', // 青色 - 分料结束
  [K045Status.COMPLETED]: '#52C41A',   // 绿色 - 已完成
  [K045Status.WITHDRAWN]: '#8C8C8C'    // 灰色 - 已撤回
};

// 单据接口定义
export interface K045Document {
  id?: number;
  documentNo: string;           // 单号
  wcName: string;                // W/C名称
  attachmentUrl?: string;       // 附件地址
  attachmentName?: string;      // 附件名称
  deliveryLocation: string;     // 配送地点
  submitterName: string;        // 提交人姓名
  isUrgent: boolean;            // 是否加急
  isRush: boolean;              // 是否催单
  status: K045Status;           // 状态
  submittedAt?: string;         // 提交时间
  receivedAt?: string;          // 接收时间
  receivedBy?: string;          // 接收人
  signedAt?: string;             // 签收时间
  signedBy?: string;             // 签收人
  distributionEndedAt?: string;  // 分料结束时间
  completedAt?: string;         // 完成时间
  completedBy?: string;         // 完成确认人
  rejectedAt?: string;          // 拒绝时间
  rejectReason?: string;        // 拒绝原因
  returnedAt?: string;          // 退回时间
  returnedBy?: string;         // 退回人
  returnReason?: string;        // 退回原因
  cancelledAt?: string;         // 取消时间
  cancelledBy?: string;         // 取消人
  withdrawnAt?: string;         // 撤回时间
  createdAt?: string;
  updatedAt?: string;
}

// 查询参数
export interface K045QueryParams {
  documentNo?: string;
  wcName?: string;
  status?: string;  // 支持逗号分隔的多个状态
  startDate?: string;
  endDate?: string;
  submitterName?: string;
  page?: number;
  pageSize?: number;
}

// 创建/更新单据参数
export interface K045DocumentForm {
  documentNo: string;
  wcName: string;
  attachmentUrl?: string;
  attachmentName?: string;
  deliveryLocation: string;
  submitterName: string;
  isUrgent: boolean;
  isRush: boolean;
}

// 上传附件响应
export interface K045UploadResponse {
  success: boolean;
  fileName: string;
  originalName: string;
  filePath: string;
}

// 上传单据附件（只支持PDF）
export const uploadK045Attachment = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<K045UploadResponse>('/k045/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 创建单据（提交）
export const createK045Document = (data: K045DocumentForm) => {
  return request.post('/k045/documents', data);
};

// 获取单据列表
export const getK045Documents = (params?: K045QueryParams) => {
  return request.get('/k045/documents', { params });
};

// 获取单据详情
export const getK045DocumentById = (id: number) => {
  return request.get(`/k045/documents/${id}`);
};

// 更新单据
export const updateK045Document = (id: number, data: Partial<K045DocumentForm>) => {
  return request.put(`/k045/documents/${id}`, data);
};

// 撤回单据（提交部门）
export const withdrawK045Document = (id: number) => {
  return request.post(`/k045/documents/${id}/withdraw`);
};

// 接收单据（接收打印部门）
export const receiveK045Document = (id: number, receivedBy?: string) => {
  return request.post(`/k045/documents/${id}/receive`, { receivedBy });
};

// 拒绝单据（接收打印部门）
export const rejectK045Document = (id: number, reason: string) => {
  return request.post(`/k045/documents/${id}/reject`, { reason });
};

// 退回单据（签收分料部门）
export const returnK045Document = (id: number, reason: string, returnedBy?: string) => {
  return request.post(`/k045/documents/${id}/return`, { reason, returnedBy });
};

// 签收单据（签收分料部门）
export const signK045Document = (id: number, signedBy?: string) => {
  return request.post(`/k045/documents/${id}/sign`, { signedBy });
};

// 分料结束（签收分料部门）
export const endDistributionK045Document = (id: number) => {
  return request.post(`/k045/documents/${id}/end-distribution`);
};

// 确认完成（提交人签收）
export const confirmCompleteK045Document = (id: number, completedBy?: string) => {
  return request.post(`/k045/documents/${id}/confirm-complete`, { completedBy });
};

// 取消单据（已退回状态可取消）
export const cancelK045Document = (id: number, cancelledBy?: string) => {
  return request.post(`/k045/documents/${id}/cancel`, { cancelledBy });
};

// 发送邮件通知
export const sendK045Notification = (id: number) => {
  return request.post(`/k045/documents/${id}/notify`);
};

// 删除单据
export const deleteK045Document = (id: number) => {
  return request.delete(`/k045/documents/${id}`);
};

// 获取待处理单据统计
export const getK045Stats = () => {
  return request.get('/k045/stats');
};

// 催单
export const rushK045Document = (id: number) => {
  return request.post(`/k045/documents/${id}/rush`);
};
