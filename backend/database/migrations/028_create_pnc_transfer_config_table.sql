-- PNC转仓打印配置表
-- 创建时间: 2024-07-23
-- 描述: PNC转仓打印的接收方配置信息

CREATE TABLE IF NOT EXISTS jso_pnc_transfer_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255),
    cc_email VARCHAR(500),
    contact_phone VARCHAR(50),
    recipient_name VARCHAR(100),
    receiving_address VARCHAR(500),
    system_location VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加唯一约束：配置名称不能重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_pnc_transfer_config_name ON jso_pnc_transfer_config(config_name);

-- 添加注释
COMMENT ON TABLE jso_pnc_transfer_config IS 'PNC转仓打印配置表';
COMMENT ON COLUMN jso_pnc_transfer_config.config_name IS '配置名称/接收方名称，唯一标识';
COMMENT ON COLUMN jso_pnc_transfer_config.recipient_email IS '邮件收件人';
COMMENT ON COLUMN jso_pnc_transfer_config.cc_email IS '邮件抄送人，多个用逗号分隔';
COMMENT ON COLUMN jso_pnc_transfer_config.contact_phone IS '联系电话';
COMMENT ON COLUMN jso_pnc_transfer_config.recipient_name IS '接收人';
COMMENT ON COLUMN jso_pnc_transfer_config.receiving_address IS '接收地址';
COMMENT ON COLUMN jso_pnc_transfer_config.system_location IS '系统位置';
COMMENT ON COLUMN jso_pnc_transfer_config.is_active IS '是否启用此配置';
