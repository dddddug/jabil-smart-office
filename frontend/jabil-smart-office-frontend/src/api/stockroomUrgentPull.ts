import request from '../utils/request';

/**
 * Stockroom Urgent Pull 模块 API
 * 数据来源：外部API - GetBuildPlanDetailsData
 */

export interface StockroomUrgentPullQueryParams {
  QM?: string;          // QM筛选
  Customer?: string;    // 客户筛选
  BPType?: string;      // Build Plan类型
  BuildPlan?: string;   // Build Plan编号
  PulllistNo?: string;  // Pull List编号
  MaterialReqTimeFrom?: string;  // 物料需求时间开始
  MaterialReqTimeTo?: string;    // 物料需求时间结束
  page?: number;
  pageSize?: number;
}

export interface StockroomUrgentPullItem {
  id?: number;
  QM?: string;
  Customer?: string;
  BPType?: string;
  BuildPlan?: string;
  PulllistNo?: string;
  MaterialReqTime?: string;
  MaterialReqTimeFrom?: string;
  MaterialReqTimeTo?: string;
  PartNumber?: string;
  PartDesc?: string;
  Qty?: number;
  QtyRequired?: number;
  QtyAllocated?: number;
  QtyShort?: number;
  BinLocation?: string;
  MaterialStatus?: string;
  LineNo?: string;
  StationName?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Item?: number;  // ITEM计数：与jso_sap_pull_log表reference列模糊关联的数量
}

/**
 * 获取 Stockroom Urgent Pull 数据
 */
export function getStockroomUrgentPullData(params: StockroomUrgentPullQueryParams) {
  return request.get('/stockroom-urgent-pull/data', { params });
}

/**
 * 导出 Stockroom Urgent Pull 数据
 */
export function exportStockroomUrgentPullData(params: StockroomUrgentPullQueryParams) {
  return request.get('/stockroom-urgent-pull/export', {
    params,
    responseType: 'blob'
  });
}

/**
 * 获取库位映射配置
 */
export function getLocationMappings() {
  return request.get('/stockroom-urgent-pull-config/location-mappings');
}

/**
 * 获取Pull List类型映射
 */
export function getPulllistTypeMappings() {
  return request.get('/stockroom-urgent-pull-config/pulllist-type-mappings');
}

/**
 * 获取汇总数据（包含主表和归档表）
 * 用于周汇总、月汇总、年汇总
 */
export interface SummaryDataItem {
  PulllistNo: string;
  MaterialReqTime: string;
  PulledAt: string;
}

export function getStockroomSummaryData() {
  return request.get('/stockroom-urgent-pull/summary-data');
}
