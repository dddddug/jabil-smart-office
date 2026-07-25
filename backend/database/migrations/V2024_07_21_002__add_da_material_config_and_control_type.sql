-- DA物料配置和管控类型迁移
-- 创建时间: 2024-07-21
-- 描述: 创建DA物料配置表和控制类型字段

-- 创建DA物料配置表
CREATE TABLE IF NOT EXISTS jso_da_material_notification_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认配置数据
INSERT INTO jso_da_material_notification_config (config_key, config_value, description)
VALUES
    ('control_types', '正常,加急,样品', '管控类型列表，用逗号分隔'),
    ('return_notification_email', '', '退回通知邮箱地址'),
    ('return_notification_enabled', 'true', '是否启用退回邮件通知'),
    ('auto_notify_on_return', 'true', '退回时是否自动发送邮件')
ON CONFLICT (config_key) DO NOTHING;

-- 添加 control_type 字段到单据表
ALTER TABLE jso_da_material_document
ADD COLUMN IF NOT EXISTS control_type VARCHAR(50) DEFAULT '正常';

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_da_material_document_control_type
ON jso_da_material_document(control_type);
