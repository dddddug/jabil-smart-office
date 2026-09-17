-- 仓储差异登记 配置表迁移
-- 创建时间: 2026-09-07
-- 描述: 仓储差异登记模块的配置表，用于存储可配置的差异类型等

-- 创建仓储差异登记配置表
CREATE TABLE IF NOT EXISTS jso_warehouse_diff_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认差异类型配置
INSERT INTO jso_warehouse_diff_config (config_key, config_value, description) VALUES
('diff_types', '["收料差异","领料差异","库存差异","转仓差异","其他"]', '差异类型列表')
ON CONFLICT (config_key) DO NOTHING;

-- 添加注释
COMMENT ON TABLE jso_warehouse_diff_config IS '仓储差异登记配置表';
COMMENT ON COLUMN jso_warehouse_diff_config.config_key IS '配置键';
COMMENT ON COLUMN jso_warehouse_diff_config.config_value IS '配置值（JSON格式）';
COMMENT ON COLUMN jso_warehouse_diff_config.description IS '配置描述';
