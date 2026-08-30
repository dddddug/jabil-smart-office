/**
 * SAP 数据拉取 - 数据库表结构
 *
 * 执行方式:
 *   psql -h localhost -U postgres -d your_database -f sap_tables.sql
 *
 * 或者在 pgAdmin 中执行
 */

-- =====================================================
-- 基础表：所有 SAP 数据表统一字段
-- =====================================================

-- 通用元数据表（可选，用于记录拉取历史）
CREATE TABLE IF NOT EXISTS jso_sap_pull_log (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,
    pull_type VARCHAR(50) NOT NULL,          -- 'daily' 或 'incremental'
    file_path VARCHAR(500),
    records_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',    -- pending, success, failed
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- =====================================================
-- NSQ00 查询事务表 (SQ00 查询)
-- =====================================================

-- SQ00-IC-75M 库存差异查询
CREATE TABLE IF NOT EXISTS jso_sap_sq00_ic_75m (
    id SERIAL PRIMARY KEY,
    data_date DATE NOT NULL,                  -- 数据日期
    query_report VARCHAR(100),                -- 查询报表名
    -- 以下字段根据实际导出的列动态添加，这里是示例
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    value DECIMAL(15,2),
    batch VARCHAR(50),
    -- 通用字段
    raw_data JSONB,                           -- 原始数据备份
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 去重约束：同一日期 + 物料 + 工厂 + 库位
    UNIQUE(data_date, material, plant, storage_location)
);

-- SQ00-IC-20
CREATE TABLE IF NOT EXISTS jso_sap_sq00_ic_20 (
    id SERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    query_report VARCHAR(100),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    value DECIMAL(15,2),
    batch VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data_date, material, plant, storage_location)
);

-- SQ00-MM-MM-002B 物料主数据
CREATE TABLE IF NOT EXISTS jso_sap_sq00_mm_002b (
    id SERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    query_report VARCHAR(100),
    material VARCHAR(50),
    material_type VARCHAR(50),
    description TEXT,
    material_group VARCHAR(50),
    unit VARCHAR(10),
    old_material_no VARCHAR(50),
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data_date, material, plant)
);

-- SQ00-IMWM-039 库存数据
CREATE TABLE IF NOT EXISTS jso_sap_sq00_imwm_039 (
    id SERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    query_report VARCHAR(100),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    warehouse VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    value DECIMAL(15,2),
    batch VARCHAR(50),
    special_stock VARCHAR(20),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data_date, material, plant, warehouse, batch)
);

-- SQ00-IMWM-101B 库存数据
CREATE TABLE IF NOT EXISTS jso_sap_sq00_imwm_101b (
    id SERIAL PRIMARY KEY,
    data_date DATE NOT NULL,
    query_report VARCHAR(100),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    warehouse VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    value DECIMAL(15,2),
    batch VARCHAR(50),
    special_stock VARCHAR(20),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(data_date, material, plant, warehouse, batch)
);

-- =====================================================
-- MB51 物料凭证查询表
-- =====================================================

-- MB51-**98 库存转储
CREATE TABLE IF NOT EXISTS jso_sap_mb51_stock_transfer (
    id SERIAL PRIMARY KEY,
    document_date DATE NOT NULL,
    posting_date DATE,
    material_document VARCHAR(20),
    material_document_year VARCHAR(4),
    item VARCHAR(10),
    movement_type VARCHAR(10),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    cost_center VARCHAR(20),
    purchase_order VARCHAR(20),
    vendor VARCHAR(20),
    batch VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 去重约束：物料凭证 + 年份 + 行项目
    UNIQUE(material_document, material_document_year, item)
);

-- MB51-101 收货
CREATE TABLE IF NOT EXISTS jso_sap_mb51_goods_receipt (
    id SERIAL PRIMARY KEY,
    document_date DATE NOT NULL,
    posting_date DATE,
    material_document VARCHAR(20),
    material_document_year VARCHAR(4),
    item VARCHAR(10),
    movement_type VARCHAR(10),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    purchase_order VARCHAR(20),
    purchase_order_item VARCHAR(10),
    vendor VARCHAR(20),
    invoice_no VARCHAR(20),
    batch VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_document, material_document_year, item)
);

-- MB51-0100&KT13 库存余额
CREATE TABLE IF NOT EXISTS jso_sap_mb51_stock_balance (
    id SERIAL PRIMARY KEY,
    document_date DATE NOT NULL,
    posting_date DATE,
    material_document VARCHAR(20),
    material_document_year VARCHAR(4),
    item VARCHAR(10),
    movement_type VARCHAR(10),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    cost_center VARCHAR(20),
    batch VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_document, material_document_year, item)
);

-- MB51-0180-551 其他收货
CREATE TABLE IF NOT EXISTS jso_sap_mb51_other_receipt (
    id SERIAL PRIMARY KEY,
    document_date DATE NOT NULL,
    posting_date DATE,
    material_document VARCHAR(20),
    material_document_year VARCHAR(4),
    item VARCHAR(10),
    movement_type VARCHAR(10),
    material VARCHAR(50),
    description TEXT,
    plant VARCHAR(20),
    storage_location VARCHAR(20),
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    cost_center VARCHAR(20),
    batch VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_document, material_document_year, item)
);

-- =====================================================
-- WM 仓库管理表（增量拉取）
-- =====================================================

-- NZM_RFTRAN3 仓库移库记录
CREATE TABLE IF NOT EXISTS jso_sap_wm_transfer (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,      -- 移库事务ID
    transaction_date TIMESTAMP NOT NULL,      -- 移库时间
    warehouse VARCHAR(20),
    source_storage_type VARCHAR(20),
    source_storage_bin VARCHAR(50),
    target_storage_type VARCHAR(20),
    target_storage_bin VARCHAR(50),
    material VARCHAR(50),
    description TEXT,
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    batch VARCHAR(50),
    transfer_type VARCHAR(20),                -- plr, flr, iws 等
    status VARCHAR(20),
    operator VARCHAR(50),
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 去重约束：事务ID + 时间
    UNIQUE(transaction_id, transaction_date)
);

-- NZ_HISTORY_GRN 收货历史
CREATE TABLE IF NOT EXISTS jso_sap_grn_history (
    id SERIAL PRIMARY KEY,
    gr_document VARCHAR(50) NOT NULL,         -- 收货单号
    gr_date TIMESTAMP NOT NULL,               -- 收货时间
    plant VARCHAR(20),
    warehouse VARCHAR(20),
    material VARCHAR(50),
    description TEXT,
    quantity DECIMAL(15,3),
    unit VARCHAR(10),
    unit_cost DECIMAL(15,4),
    total_value DECIMAL(15,2),
    po_number VARCHAR(20),
    po_item VARCHAR(10),
    vendor VARCHAR(20),
    batch VARCHAR(50),
    storage_type VARCHAR(20),
    storage_bin VARCHAR(50),
    transfer_indicator VARCHAR(20),           -- PLR, FLR, IWS
    raw_data JSONB,
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 去重约束：收货单号 + 行项目（如果有）
    UNIQUE(gr_document, material)
);

-- =====================================================
-- 索引
-- =====================================================

-- 通用索引
CREATE INDEX IF NOT EXISTS idx_sap_pull_log_task ON jso_sap_pull_log(task_name, status);
CREATE INDEX IF NOT EXISTS idx_sap_pull_log_date ON jso_sap_pull_log(started_at);

-- 各表索引
CREATE INDEX IF NOT EXISTS idx_sq00_ic_date ON jso_sap_sq00_ic_75m(data_date);
CREATE INDEX IF NOT EXISTS idx_sq00_ic_material ON jso_sap_sq00_ic_75m(material);
CREATE INDEX IF NOT EXISTS idx_sq00_ic_plant ON jso_sap_sq00_ic_75m(plant);

CREATE INDEX IF NOT EXISTS idx_mb51_doc_date ON jso_sap_mb51_stock_transfer(document_date);
CREATE INDEX IF NOT EXISTS idx_mb51_material ON jso_sap_mb51_stock_transfer(material);
CREATE INDEX IF NOT EXISTS idx_mb51_plant ON jso_sap_mb51_stock_transfer(plant);

CREATE INDEX IF NOT EXISTS idx_wm_transfer_date ON jso_sap_wm_transfer(transaction_date);
CREATE INDEX IF NOT EXISTS idx_wm_transfer_material ON jso_sap_wm_transfer(material);
CREATE INDEX IF NOT EXISTS idx_wm_transfer_warehouse ON jso_sap_wm_transfer(warehouse);

CREATE INDEX IF NOT EXISTS idx_grn_date ON jso_sap_grn_history(gr_date);
CREATE INDEX IF NOT EXISTS idx_grn_material ON jso_sap_grn_history(material);
CREATE INDEX IF NOT EXISTS idx_grn_vendor ON jso_sap_grn_history(vendor);

-- =====================================================
-- 注释说明
-- =====================================================

COMMENT ON TABLE jso_sap_sq00_ic_75m IS 'SQ00-IC-75M 库存差异查询';
COMMENT ON TABLE jso_sap_sq00_ic_20 IS 'SQ00-IC-20 库存差异查询';
COMMENT ON TABLE jso_sap_sq00_mm_002b IS 'SQ00-MM-MM-002B 物料主数据';
COMMENT ON TABLE jso_sap_sq00_imwm_039 IS 'SQ00-IMWM-039 库存数据';
COMMENT ON TABLE jso_sap_sq00_imwm_101b IS 'SQ00-IMWM-101B 库存数据';
COMMENT ON TABLE jso_sap_mb51_stock_transfer IS 'MB51 库存转储凭证';
COMMENT ON TABLE jso_sap_mb51_goods_receipt IS 'MB51 采购收货凭证';
COMMENT ON TABLE jso_sap_mb51_stock_balance IS 'MB51 库存余额调整';
COMMENT ON TABLE jso_sap_mb51_other_receipt IS 'MB51 其他收货凭证';
COMMENT ON TABLE jso_sap_wm_transfer IS 'WM仓库移库记录（每小时增量）';
COMMENT ON TABLE jso_sap_grn_history IS 'WM收货历史（每小时增量）';
COMMENT ON TABLE jso_sap_pull_log IS 'SAP数据拉取日志';
