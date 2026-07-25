-- DA物料 单据管理表迁移
-- 创建时间: 2024-07-20
-- 描述: DA物料 单据管理模块，用于管理单据的提交、打印、接收、签收流程

-- 创建DA物料单据表
CREATE TABLE IF NOT EXISTS jso_da_material_document (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(100) NOT NULL UNIQUE,
    wc_name VARCHAR(100) NOT NULL,
    attachment_url VARCHAR(500) NOT NULL,
    attachment_name VARCHAR(255),
    da_no VARCHAR(100) NOT NULL,
    ecn_no VARCHAR(100),
    submitter_name VARCHAR(100) NOT NULL,
    is_urgent BOOLEAN DEFAULT FALSE,
    is_rush BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    printed_at TIMESTAMP,
    printed_by VARCHAR(100),
    received_at TIMESTAMP,
    received_by VARCHAR(100),
    signed_at TIMESTAMP,
    signed_by VARCHAR(100),
    completed_at TIMESTAMP,
    completed_by VARCHAR(100),
    rejected_at TIMESTAMP,
    reject_reason TEXT,
    returned_at TIMESTAMP,
    returned_by VARCHAR(100),
    return_reason TEXT,
    withdrawn_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_da_material_document_status ON jso_da_material_document(status);
CREATE INDEX IF NOT EXISTS idx_da_material_document_document_no ON jso_da_material_document(document_no);
CREATE INDEX IF NOT EXISTS idx_da_material_document_da_no ON jso_da_material_document(da_no);
CREATE INDEX IF NOT EXISTS idx_da_material_document_submitter ON jso_da_material_document(submitter_name);
CREATE INDEX IF NOT EXISTS idx_da_material_document_submitted_at ON jso_da_material_document(submitted_at);
CREATE INDEX IF NOT EXISTS idx_da_material_document_wc_name ON jso_da_material_document(wc_name);
