import request from '../utils/request';

// PNC转仓单据明细项接口
export interface PncTransferDocumentItem {
  id?: number;
  sequenceNo: number;
  batch?: string;
  partNumber: string;
  grn?: string;
  quantity: number;
}

// PNC转仓单据接口
export interface PncTransferDocument {
  id?: number;
  transferNo: string;
  configId: number;
  configName?: string;
  departmentId?: number;
  departmentName?: string;
  recipientEmail?: string;
  ccEmail?: string;
  contactPhone?: string;
  recipientName?: string;
  receivingAddress?: string;
  systemLocation?: string;
  creatorName: string;
  status: 'created' | 'sent';
  emailSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  printCount?: number;
  items: PncTransferDocumentItem[];
}

// 获取单据列表
export type GetDocumentsParams = {
  transferNo?: string;
  configName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  creatorName?: string;
  page?: number;
  pageSize?: number;
};

export const getDocuments = (params?: GetDocumentsParams) => {
  return request.get<{
    items: PncTransferDocument[];
    total: number;
    page: number;
    pageSize: number;
  }>('/pnc-transfer/documents', { params });
};

// 获取单据详情
export const getDocumentById = (id: number) => {
  return request.get<PncTransferDocument>(`/pnc-transfer/documents/${id}`);
};

// 创建单据
export const createDocument = (data: {
  configId: number;
  departmentId: number;
  departmentName: string;
  items: PncTransferDocumentItem[];
  creatorName: string;
}) => {
  return request.post<PncTransferDocument>('/pnc-transfer/documents', data);
};

// 更新单据
export const updateDocument = (id: number, data: {
  items: PncTransferDocumentItem[];
}) => {
  return request.put<PncTransferDocument>(`/pnc-transfer/documents/${id}`, data);
};

// 发送邮件
export const sendEmail = (id: number) => {
  return request.post<{
    id: number;
    transferNo: string;
    status: string;
    emailSentAt: string;
    mailtoLink: string;
    emailBody: string;
    subject: string;
  }>(`/pnc-transfer/documents/${id}/send-email`, {});
};

// 删除单据
export const deleteDocument = (id: number) => {
  return request.delete(`/pnc-transfer/documents/${id}`);
};

// 获取统计数据
export const getStats = () => {
  return request.get<{
    created: number;
    sent: number;
    total: number;
  }>('/pnc-transfer/stats');
};

// 记录打印次数
export const recordPrint = (id: number) => {
  return request.post<{
    printCount: number;
  }>(`/pnc-transfer/documents/${id}/print`, {});
};
