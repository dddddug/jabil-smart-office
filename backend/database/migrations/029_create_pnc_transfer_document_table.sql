-- PNC转仓单据表
-- 创建时间: 2024-07-23
-- 描述: PNC转仓单据记录

CREATE TABLE IF NOT EXISTS jso_pnc_transfer_document (
    id SERIAL PRIMARY KEY,
    transfer_no VARCHAR(50) NOT NULL UNIQUE,
    config_id INTEGER,
    config_name VARCHAR(100),
    recipient_email VARCHAR(255),
    cc_email VARCHAR(500),
    contact_phone VARCHAR(50),
    recipient_name VARCHAR(100),
    receiving_address VARCHAR(500),
    system_location VARCHAR(200),
    creator_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'created',
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_pnc_transfer_config'
    ) THEN
        ALTER TABLE jso_pnc_transfer_document
        ADD CONSTRAINT fk_pnc_transfer_config
        FOREIGN KEY (config_id) REFERENCES jso_pnc_transfer_config(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_transfer_no ON jso_pnc_transfer_document(transfer_no);
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_status ON jso_pnc_transfer_document(status);
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_creator ON jso_pnc_transfer_document(creator_name);
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_created_at ON jso_pnc_transfer_document(created_at);

-- 添加注释
COMMENT ON TABLE jso_pnc_transfer_document IS 'PNC转仓单据表';
COMMENT ON COLUMN jso_pnc_transfer_document.transfer_no IS '转仓单号，格式：YYYYMMDD-序号，如：20240723-001';
COMMENT ON COLUMN jso_pnc_transfer_document.config_id IS '关联的PNC转仓打印配置ID';
COMMENT ON COLUMN jso_pnc_transfer_document.config_name IS '配置名称/接收方名称，冗余存储便于查询';
COMMENT ON COLUMN jso_pnc_transfer_document.status IS '单据状态：created-已创建, sent-已发送';
