/**
 * 产线回仓通用配置表
 * 执行方式: psql -h localhost -U postgres -d your_database -f 041_create_warehouse_return_config_table.sql
 */

-- 支持同warehouse多个user_name的配置表
CREATE TABLE IF NOT EXISTS jso_warehouse_return_config (
    id SERIAL PRIMARY KEY,
    warehouse VARCHAR(100),                           -- warehouse 字段值
    username VARCHAR(100),                           -- 关联的 user_name
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse, username)
);

COMMENT ON TABLE jso_warehouse_return_config IS '产线回仓通用配置表（warehouse与user_name映射）';
COMMENT ON COLUMN jso_warehouse_return_config.warehouse IS 'warehouse字段值';
COMMENT ON COLUMN jso_warehouse_return_config.username IS '关联的user_name';
COMMENT ON COLUMN jso_warehouse_return_config.is_active IS '是否启用';
