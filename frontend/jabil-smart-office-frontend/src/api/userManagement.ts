import request from '../utils/request'

export interface Department {
  id: number;
  name: string;
  plantId?: number;
  plantName?: string;
  description?: string;
  managerId?: number;
  managerName?: string;
  createdAt?: string;
}

export function getUserList(query?: any) {
  return request({
    url: '/users',
    method: 'get',
    params: query
  })
}

export function getDepartmentList(query?: any): Promise<{ data: { departments: Department[] } }> {
  return request({
    url: '/departments',
    method: 'get',
    params: query
  }) as any
}
