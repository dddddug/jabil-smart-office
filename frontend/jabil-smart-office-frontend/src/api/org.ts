import request from '@/utils/request'; // Assuming you have a request utility

// 获取所有部门
export function getDepartments() {
  return request({
    url: '/departments',
    method: 'get',
  }).then(res => res.data?.departments || []);
}

// 获取所有厂区
export function getPlants() {
  return request({
    url: '/plants',
    method: 'get',
  }).then(res => res.data?.plants || []);
}

// 获取所有岗位
export function getPositions() {
  return request({
    url: '/positions',
    method: 'get',
  }).then(res => res.data || []);
}
