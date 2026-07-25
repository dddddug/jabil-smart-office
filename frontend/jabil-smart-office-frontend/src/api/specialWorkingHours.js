// src/api/specialWorkingHours.js
import request from '@/utils/request' // 假设存在一个封装了 axios 的 request 工具

const API_PREFIX = '/special-working-hours'

export function getSpecialWorkingHoursList(query) {
  return request({
    url: API_PREFIX,
    method: 'get',
    params: query
  })
}

export function addSpecialWorkingHours(data) {
  return request({
    url: API_PREFIX,
    method: 'post',
    data
  })
}

export function importSpecialWorkingHours(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: API_PREFIX + '/import',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function deleteSpecialWorkingHours(ids) {
  return request({
    url: API_PREFIX,
    method: 'delete',
    params: { ids: ids.join(',') } // 将ID数组作为查询参数发送，用逗号分隔
  })
}

// 根据员工姓名、日期、事件名称删除特殊工时记录（用于工位安排移除时同步删除）
export function deleteSpecialWorkingHoursByCondition(employeeName, date, event) {
  return request({
    url: API_PREFIX,
    method: 'delete',
    params: { employeeName, date, event }
  })
}

export function exportSpecialWorkingHours(query) {
  return request({
    url: API_PREFIX + '/export',
    method: 'get',
    params: query,
    responseType: 'blob' // 重要：导出文件需要设置为 blob 类型
  })
}

export function downloadImportTemplate() {
  return request({
    url: API_PREFIX + '/template',
    method: 'get',
    responseType: 'blob' // 重要：下载文件需要设置为 blob 类型
  })
}
