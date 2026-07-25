-- K差异登记 配置表迁移
-- 创建时间: 2024-07-24
-- 描述: K差异登记模块的配置表，用于存储差异类型、退料地点和邮件通知配置

-- 创建K差异登记配置表
CREATE TABLE IF NOT EXISTS jso_k2_diff_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(255) COMMENT '配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_k_diff_config_key ON jso_k2_diff_config(config_key);

-- 初始化默认配置数据
INSERT INTO jso_k2_diff_config (config_key, config_value, description) VALUES
    ('difference_types', '[]', '差异类型列表，JSON数组格式'),
    ('return_locations', '[]', '退料地点列表，JSON数组格式'),
    ('email_notification_enabled', 'false', '是否启用邮件通知'),
    ('email_recipients', '', '邮件收件人，多个用逗号分隔'),
    ('email_cc', '', '邮件抄送人，多个用逗号分隔')
ON CONFLICT (config_key) DO NOTHING;

-- 添加注释
COMMENT ON TABLE jso_k2_diff_config IS 'K差异登记配置表';
COMMENT ON COLUMN jso_k2_diff_config.config_key IS '配置键，唯一标识';
COMMENT ON COLUMN jso_k2_diff_config.config_value IS '配置值，JSON格式存储复杂数据';
COMMENT ON COLUMN jso_k2_diff_config.description IS '配置项描述';
