import request from '@/utils/request'

const API_PREFIX = '/api'

export function getUserList(query) {
  return request({
    url: API_PREFIX + '/users',
    method: 'get',
    params: query
  })
}

export function getDepartmentList(query) {
  return request({
    url: API_PREFIX + '/departments',
    method: 'get',
    params: query
  })
}