import request from '@/utils/request';

// 获取 Cost 汇总数据
export function getCostSummary(params: any): Promise<any> {
  return request.get('/cost-summary', { params });
}

// 导出 Cost 汇总 Excel
export function exportCostSummaryExcel(params: any) {
  return request.get('/cost-summary/export', {
    params,
    responseType: 'blob', // Important for file download
  });
}

// 手动重算 Cost 数据
export function recalculateCost(fiscalMonth: string): Promise<any> {
  return request.post('/cost-summary/recalculate', { fiscalMonth });
}

// 获取 Cost 汇总界面的下拉框选项（部门、厂区、岗位）
export function getCostSummaryDropdowns() {
  return request.get('/cost-summary/dropdowns');
}
