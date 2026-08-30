import request from '@/utils/request'

export function getUserList(query) {
  const params = query || {}
  params.pageSize = 10000
  return request({
    url: '/users',
    method: 'get',
    params: params
  }).then((res) => {
    const data = res && res.data ? res.data : (res || {})
    return { users: data.items || data.users || [], total: data.pagination?.total || data.total || 0 }
  })
}

export function getDepartmentList(query) {
  return request({
    url: '/departments',
    method: 'get',
    params: query
  }).then((res) => {
    const data = res && res.data ? res.data : (res || {})
    return { departments: data.departments || data.items || [] }
  })
}