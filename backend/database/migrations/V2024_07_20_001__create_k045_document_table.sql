-- K045 单据管理表迁移
-- 创建时间: 2024-07-20
-- 描述: K045 单据管理模块，用于管理单据的提交、接收打印、签收分料流程

-- 创建K045单据表
CREATE TABLE IF NOT EXISTS jso_k045_document (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(100) NOT NULL UNIQUE COMMENT '单号',
    wc_name VARCHAR(100) NOT NULL COMMENT 'W/C名称',
    attachment_url VARCHAR(500) COMMENT '附件URL',
    attachment_name VARCHAR(255) COMMENT '附件名称',
    delivery_location VARCHAR(200) NOT NULL COMMENT '配送地点',
    submitter_name VARCHAR(100) NOT NULL COMMENT '提交人姓名',
    is_urgent BOOLEAN DEFAULT FALSE COMMENT '是否加急',
    is_rush BOOLEAN DEFAULT FALSE COMMENT '是否催单',
    status VARCHAR(50) DEFAULT 'submitted' COMMENT '状态: submitted-已提交, received-已接收, rejected-已拒绝, signed-已签收, distribution_ended-分料结束, withdrawn-已撤回',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    received_at TIMESTAMP COMMENT '接收时间',
    received_by VARCHAR(100) COMMENT '接收人',
    signed_at TIMESTAMP COMMENT '签收时间',
    signed_by VARCHAR(100) COMMENT '签收人',
    distribution_ended_at TIMESTAMP COMMENT '分料结束时间',
    rejected_at TIMESTAMP COMMENT '拒绝时间',
    reject_reason TEXT COMMENT '拒绝原因',
    withdrawn_at TIMESTAMP COMMENT '撤回时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_k045_document_status ON jso_k045_document(status);
CREATE INDEX IF NOT EXISTS idx_k045_document_document_no ON jso_k045_document(document_no);
CREATE INDEX IF NOT EXISTS idx_k045_document_submitter ON jso_k045_document(submitter_name);
CREATE INDEX IF NOT EXISTS idx_k045_document_submitted_at ON jso_k045_document(submitted_at);
CREATE INDEX IF NOT EXISTS idx_k045_document_wc_name ON jso_k045_document(wc_name);

-- 添加注释
COMMENT ON TABLE jso_k045_document IS 'K045单据管理表';
COMMENT ON COLUMN jso_k045_document.document_no IS '单号，唯一标识';
COMMENT ON COLUMN jso_k045_document.wc_name IS 'W/C名称，生产线或工作站名称';
COMMENT ON COLUMN jso_k045_document.attachment_url IS '单据附件的存储路径';
COMMENT ON COLUMN jso_k045_document.attachment_name IS '附件原始文件名';
COMMENT ON COLUMN jso_k045_document.delivery_location IS '配送目的地';
COMMENT ON COLUMN jso_k045_document.submitter_name IS '提交人姓名';
COMMENT ON COLUMN jso_k045_document.is_urgent IS '是否加急处理';
COMMENT ON COLUMN jso_k045_document.is_rush IS '是否被催单';
COMMENT ON COLUMN jso_k045_document.status IS '单据状态：submitted-已提交待接收, received-已接收待签收, rejected-已拒绝, signed-已签收待分料, distribution_ended-分料结束, withdrawn-已撤回';
