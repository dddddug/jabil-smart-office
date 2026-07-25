import request from '@/utils/request'; // Assuming you have a request utility

// 获取 Cost 汇总数据
export function getCostSummary(params: any) {
  return request({
    url: '/cost-summary',
    method: 'get',
    params,
  });
}

// 导出 Cost 汇总 Excel
export function exportCostSummaryExcel(params: any) {
  return request({
    url: '/cost-summary/export',
    method: 'get',
    params,
    responseType: 'blob', // Important for file download
  });
}

// 手动重算 Cost 数据
export function recalculateCost(fiscalMonth: string) {
  return request({
    url: '/cost-summary/recalculate',
    method: 'post',
    data: { fiscalMonth },
  });
}

// 获取 Cost 汇总界面的下拉框选项（部门、厂区、岗位）
export function getCostSummaryDropdowns() {
  return request({
    url: '/cost-summary/dropdowns',
    method: 'get',
  });
}
