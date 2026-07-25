import request from '@/utils/request'

export function getUserList(query) {
  return request({
    url: '/users',
    method: 'get',
    params: query
  })
}

export function getDepartmentList(query) {
  return request({
    url: '/departments',
    method: 'get',
    params: query
  })
}