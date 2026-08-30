-- Stockroom Urgent Pull 模块配置表
-- 用于配置 Pull List No 与库位的映射关系

CREATE TABLE IF NOT EXISTS jso_stockroom_urgent_pull_config (
    id SERIAL PRIMARY KEY,
    config_type VARCHAR(50) NOT NULL,  -- 'location_mapping' 或 'wc_mapping' 或 'pulllist_type'
    config_key VARCHAR(255) NOT NULL,   -- 配置键
    config_value TEXT NOT NULL,         -- 配置值
    description VARCHAR(500),            -- 配置描述
    sort_order INTEGER DEFAULT 0,       -- 排序顺序
    is_active BOOLEAN DEFAULT TRUE,     -- 是否启用
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    UNIQUE(config_type, config_key)
);

-- 插入默认的库位映射配置
INSERT INTO jso_stockroom_urgent_pull_config (config_type, config_key, config_value, description, sort_order) VALUES
-- 库位映射
('location_mapping', 'T01', '0100T010', 'T01库位对应的Pull List No包含规则', 1),
('location_mapping', 'T07&T08', '0700T070,0800T080', 'T07&T08库位对应的Pull List No包含规则', 2),
('location_mapping', 'T11', '1100T110', 'T11库位对应的Pull List No包含规则', 3),
('location_mapping', 'T13', '1300T130', 'T13库位对应的Pull List No包含规则', 4),
('location_mapping', 'T16', '1600T160', 'T16库位对应的Pull List No包含规则', 5)
ON CONFLICT (config_type, config_key) DO NOTHING;

-- 插入默认的Pull List类型映射
INSERT INTO jso_stockroom_urgent_pull_config (config_type, config_key, config_value, description, sort_order) VALUES
('pulllist_type', 'TObay', 'TObay单', '包含TOBAY的Pull List No属于TObay单', 1),
('pulllist_type', 'jieliaoshu', '借料单', '包含jieliaoshu的Pull List No属于借料单', 2)
ON CONFLICT (config_type, config_key) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stockroom_config_type ON jso_stockroom_urgent_pull_config(config_type);
CREATE INDEX IF NOT EXISTS idx_stockroom_config_active ON jso_stockroom_urgent_pull_config(is_active);
