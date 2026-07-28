import request from '@/utils/request';

// 通知接口定义
export interface Notification {
  id: number;
  userId: number;
  userName?: string;
  icon: string;
  title: string;
  message: string;
  detail?: string;
  type: string;
  relatedData?: any;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 获取当前用户的通知列表
export function getNotifications(read?: boolean) {
  const params: any = {};
  if (read !== undefined) {
    params.read = read;
  }
  return request({
    url: '/notifications',
    method: 'get',
    params,
  });
}

// 获取未读通知数量
export function getUnreadCount() {
  return request({
    url: '/notifications/unread-count',
    method: 'get',
  });
}

// 标记通知为已读
export function markAsRead(id: number) {
  return request({
    url: `/notifications/${id}/read`,
    method: 'put',
  });
}

// 标记所有通知为已读
export function markAllAsRead() {
  return request({
    url: '/notifications/read-all',
    method: 'put',
  });
}

// 删除通知
export function deleteNotification(id: number) {
  return request({
    url: `/notifications/${id}`,
    method: 'delete',
  });
}
