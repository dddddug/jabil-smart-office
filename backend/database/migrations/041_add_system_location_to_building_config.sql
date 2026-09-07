/**
 * 为 Building 配置表添加系统位置字段
 */

ALTER TABLE jso_warehouse_return_building_config
ADD COLUMN IF NOT EXISTS system_location VARCHAR(100);

COMMENT ON COLUMN jso_warehouse_return_building_config.system_location IS '系统位置';
