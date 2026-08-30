import request from '../utils/request';

/**
 * Stockroom Urgent Pull 配置模块 API
 */

export interface ConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ConfigType {
  location_mapping?: ConfigItem[];  // 库位映射配置
  wc_mapping?: ConfigItem[];         // WC名称映射配置
  pulllist_type?: ConfigItem[];      // Pull List类型映射配置
}

/**
 * 获取所有配置
 */
export function getStockroomUrgentPullConfigs() {
  return request.get('/stockroom-urgent-pull-config/configs');
}

/**
 * 保存单个配置
 */
export function saveStockroomUrgentPullConfig(config: {
  config_type: string;
  config_key: string;
  config_value: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  return request.post('/stockroom-urgent-pull-config/configs', config);
}

/**
 * 批量保存配置
 */
export function saveStockroomUrgentPullConfigs(configs: Array<{
  config_type: string;
  config_key: string;
  config_value: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}>) {
  return request.post('/stockroom-urgent-pull-config/configs/batch', { configs });
}

/**
 * 删除配置
 */
export function deleteStockroomUrgentPullConfig(id: number) {
  return request.delete(`/stockroom-urgent-pull-config/configs/${id}`);
}

/**
 * 获取库位映射配置（用于数据处理）
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
