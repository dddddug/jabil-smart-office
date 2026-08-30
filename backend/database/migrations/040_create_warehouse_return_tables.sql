/**
 * 回仓申请模块 - 数据库表结构
 * 执行方式: psql -h localhost -U postgres -d your_database -f 040_create_warehouse_return_tables.sql
 */

-- =====================================================
-- 1. 回仓申请表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_request (
    id SERIAL PRIMARY KEY,
    return_no VARCHAR(50) UNIQUE NOT NULL,           -- 回仓单号（如：HC-20260829-001）
    bay_no VARCHAR(50) NOT NULL,                    -- Bay 号
    receive_building VARCHAR(100) NOT NULL,         -- 接收 Building
    status VARCHAR(50) NOT NULL DEFAULT 'pending_receiving',  -- 单据状态
    pending_count INTEGER DEFAULT 0,                -- 待处理明细条数（部分关闭后）
    submitter_id INTEGER NOT NULL,                  -- 提交人 ID
    submitter_name VARCHAR(100) NOT NULL,           -- 提交人姓名
    submitter_account VARCHAR(100) NOT NULL,        -- 提交人账号
    received_by VARCHAR(100),                       -- 接收人
    received_at TIMESTAMP,                          -- 接收时间
    closed_at TIMESTAMP,                            -- 完结时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE jso_warehouse_return_request IS '回仓申请表';
COMMENT ON COLUMN jso_warehouse_return_request.return_no IS '回仓单号';
COMMENT ON COLUMN jso_warehouse_return_request.bay_no IS 'Bay号';
COMMENT ON COLUMN jso_warehouse_return_request.receive_building IS '接收Building';
COMMENT ON COLUMN jso_warehouse_return_request.status IS '单据状态';
COMMENT ON COLUMN jso_warehouse_return_request.pending_count IS '待处理明细条数';
COMMENT ON COLUMN jso_warehouse_return_request.submitter_id IS '提交人ID';
COMMENT ON COLUMN jso_warehouse_return_request.submitter_name IS '提交人姓名';
COMMENT ON COLUMN jso_warehouse_return_request.submitter_account IS '提交人账号';

-- =====================================================
-- 2. 回仓物料明细表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES jso_warehouse_return_request(id) ON DELETE CASCADE,
    material VARCHAR(50) NOT NULL,                  -- 物料号
    qty DECIMAL(15,3) NOT NULL,                   -- 数量
    bay_no VARCHAR(50) NOT NULL,                   -- Bay 号（来自清单）
    -- SAP 日志附加字段（不参与匹配，仅展示）
    to_sloc VARCHAR(50),                           -- 目标库位
    type VARCHAR(50),                              -- 类型
    trans VARCHAR(50),                              -- 事务
    rf_ind VARCHAR(10),                            -- RF 标识
    -- 匹配状态
    match_status VARCHAR(20) DEFAULT 'pending',     -- pending/matched/returned/closed
    sap_item_id INTEGER,                           -- 匹配的 SAP 日志 ID
    sap_material VARCHAR(50),                      -- SAP 物料号（冗余存储）
    sap_quantity DECIMAL(15,3),                   -- SAP 数量（冗余存储）
    sap_from_sloc VARCHAR(50),                     -- SAP 源库位（冗余存储）
    return_reason TEXT,                            -- 退回原因
    returned_at TIMESTAMP,                         -- 退回时间
    closed_at TIMESTAMP,                           -- 关闭时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE jso_warehouse_return_items IS '回仓物料明细表';
COMMENT ON COLUMN jso_warehouse_return_items.material IS '物料号';
COMMENT ON COLUMN jso_warehouse_return_items.qty IS '数量';
COMMENT ON COLUMN jso_warehouse_return_items.bay_no IS 'Bay号';
COMMENT ON COLUMN jso_warehouse_return_items.match_status IS '匹配状态';
COMMENT ON COLUMN jso_warehouse_return_items.return_reason IS '退回原因';

-- =====================================================
-- 3. 对账日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_reconciliation_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES jso_warehouse_return_request(id) ON DELETE CASCADE,
    return_no VARCHAR(50) NOT NULL,
    operator_id INTEGER NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    operator_account VARCHAR(100) NOT NULL,
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 对账结果快照（JSON）
    matched_items JSONB,                            -- 匹配成功的明细
    list_only_items JSONB,                         -- 清单有 SAP 无的明细
    sap_only_items JSONB,                          -- SAP 有清单无的明细
    manual_confirmed_items JSONB,                  -- 人工确认的明细
    returned_items JSONB,                          -- 退回的明细
    remark TEXT                                    -- 备注
);

COMMENT ON TABLE jso_warehouse_return_reconciliation_logs IS '回仓对账日志表';

-- =====================================================
-- 4. 邮件日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_email_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES jso_warehouse_return_request(id) ON DELETE CASCADE,
    return_no VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    cc_emails TEXT,                                -- 抄送，多个用逗号分隔
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    status VARCHAR(20) DEFAULT 'pending',         -- pending/success/failed
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE jso_warehouse_return_email_logs IS '回仓邮件日志表';

-- =====================================================
-- 5. Building 配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_building_config (
    id SERIAL PRIMARY KEY,
    building_code VARCHAR(50) UNIQUE NOT NULL,
    building_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE jso_warehouse_return_building_config IS '回仓Building配置表';

-- 插入默认 Building 配置
INSERT INTO jso_warehouse_return_building_config (building_code, building_name, sort_order) VALUES
    ('B1', 'B1 Building', 1),
    ('B2', 'B2 Building', 2),
    ('B3', 'B3 Building', 3),
    ('B4', 'B4 Building', 4),
    ('B5', 'B5 Building', 5),
    ('B6', 'B6 Building', 6),
    ('B7', 'B7 Building', 7),
    ('B8', 'B8 Building', 8)
ON CONFLICT (building_code) DO NOTHING;

-- =====================================================
-- 6. 邮件抄送配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS jso_warehouse_return_email_cc_config (
    id SERIAL PRIMARY KEY,
    dept_id INTEGER,                               -- 部门 ID（NULL 表示全局配置）
    role_type VARCHAR(50),                        -- 角色类型
    email VARCHAR(255) NOT NULL,
    email_type VARCHAR(20) DEFAULT 'cc',          -- to/cc
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE jso_warehouse_return_email_cc_config IS '回仓邮件抄送配置表';

-- =====================================================
-- 7. 单号生成序列
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS jso_warehouse_return_no_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO CYCLE;

-- =====================================================
-- 索引
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_warehouse_return_status ON jso_warehouse_return_request(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_submitter ON jso_warehouse_return_request(submitter_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_created ON jso_warehouse_return_request(created_at);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_items_request ON jso_warehouse_return_items(request_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_items_match ON jso_warehouse_return_items(match_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_reconciliation_request ON jso_warehouse_return_reconciliation_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_return_email_request ON jso_warehouse_return_email_logs(request_id);
