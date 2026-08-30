/**
 * PostgreSQL 分区表创建脚本
 *
 * 功能：
 * 1. 创建 jso_sap_pull_log_partitioned 分区表
 * 2. 创建 jso_sap_grn_history_partitioned 分区表
 * 3. 创建预计算表 jso_pulllist_item_count
 * 4. 迁移历史数据
 * 5. 创建视图保持向后兼容
 *
 * 执行方式：
 *   psql -h 10.114.100.171 -U postgres -d stockroom_db -f create_partitioned_tables.sql
 *
 * 或在 pgAdmin 中执行
 */

-- =====================================================
-- 1. 创建分区表：jso_sap_pull_log_partitioned
-- =====================================================

-- 基础分区表（按 date_created 月度分区）
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_partitioned (
    id SERIAL,
    plant VARCHAR(20),
    warehouse VARCHAR(20),
    date_created DATE,                           -- 分区键（从 started_at 提取）
    time_created VARCHAR(10),
    user_name VARCHAR(100),
    seq_no VARCHAR(50),
    trans VARCHAR(20),
    rf_ind VARCHAR(10),
    success VARCHAR(10),
    mvt VARCHAR(10),
    from_sloc VARCHAR(20),
    to_sloc VARCHAR(20),
    material VARCHAR(100),
    quantity DECIMAL(15,3),
    supplier VARCHAR(100),
    type VARCHAR(50),
    storage_bin VARCHAR(100),
    s1 VARCHAR(100),
    s2 VARCHAR(100),
    batch VARCHAR(100),
    new_batch VARCHAR(100),
    reference VARCHAR(200),
    rec_mat VARCHAR(100),
    old_grn VARCHAR(100),
    new_grn VARCHAR(100),
    ip_address VARCHAR(50),
    term_id VARCHAR(50),
    mat_doc VARCHAR(50),
    item1 VARCHAR(20),
    to_number VARCHAR(100),
    item2 VARCHAR(20),
    doc VARCHAR(50),
    item3 VARCHAR(20),
    is_ind VARCHAR(20),
    rv VARCHAR(50),
    vnt VARCHAR(50),
    hu VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 保留原字段
    completed_at TIMESTAMP,
    PRIMARY KEY (id, date_created)
) PARTITION BY RANGE (date_created);

COMMENT ON TABLE jso_sap_pull_log_partitioned IS 'SAP拉取日志分区表（按月分区）';

-- =====================================================
-- 2. 创建分区表：jso_sap_grn_history_partitioned
-- =====================================================

CREATE TABLE IF NOT EXISTS jso_sap_grn_history_partitioned (
    id SERIAL,
    plant VARCHAR(20),
    warehouse VARCHAR(20),
    to_number VARCHAR(100),
    to_item VARCHAR(20),
    gr_document VARCHAR(100),
    to_qty DECIMAL(15,3),
    material VARCHAR(100),
    quantity DECIMAL(15,3),
    movmt_type VARCHAR(20),
    special VARCHAR(50),
    vendor VARCHAR(100),
    batch VARCHAR(100),
    creation_date DATE,                          -- 分区键（从 gr_date 提取）
    creation_time VARCHAR(10),
    created_by VARCHAR(100),
    trans VARCHAR(20),
    from_sloc VARCHAR(20),
    to_sloc VARCHAR(20),
    reference VARCHAR(200),
    masked_mpn VARCHAR(100),
    manufacturer VARCHAR(100),
    media_code VARCHAR(50),
    lot_code VARCHAR(100),
    date_code VARCHAR(50),
    cert_type VARCHAR(50),
    sled VARCHAR(50),                             -- 到期日期
    gr_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 保留原字段
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed BOOLEAN DEFAULT FALSE,
    process_result TEXT,
    processed_by VARCHAR(100),
    processed_at TIMESTAMP,
    PRIMARY KEY (id, creation_date)
) PARTITION BY RANGE (creation_date);

COMMENT ON TABLE jso_sap_grn_history_partitioned IS 'SAP收货历史分区表（按月分区）';

-- =====================================================
-- 3. 创建预计算表：jso_pulllist_item_count
-- 用于替代模糊查询 reference 字段
-- =====================================================

CREATE TABLE IF NOT EXISTS jso_pulllist_item_count (
    id SERIAL PRIMARY KEY,
    pulllist_no VARCHAR(100) NOT NULL,
    data_date DATE NOT NULL,
    item_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pulllist_no, data_date)
);

CREATE INDEX IF NOT EXISTS idx_pulllist_date ON jso_pulllist_item_count(data_date);
CREATE INDEX IF NOT EXISTS idx_pulllist_pulllist ON jso_pulllist_item_count(pulllist_no);

COMMENT ON TABLE jso_pulllist_item_count IS '预计算的ITEM计数表（替代模糊查询）';

-- =====================================================
-- 4. 创建月度分区（2024-01 到 2027-12）
-- =====================================================

-- 2024年分区
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_01 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_02 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_03 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_04 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_05 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_06 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_07 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_08 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_09 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_10 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_11 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2024_12 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- 2025年分区
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_01 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_02 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_03 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_04 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_05 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_06 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_07 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_08 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_09 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_10 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_11 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2025_12 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 2026年分区
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_01 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_02 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_03 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_04 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_05 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_06 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_07 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_08 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_09 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_10 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_11 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2026_12 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 2027年分区
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_01 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_02 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_03 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_04 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_05 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_06 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_07 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_08 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_09 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_10 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_11 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_pull_log_2027_12 PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

-- GRN History 分区
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_01 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_02 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_03 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_04 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_05 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_06 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_07 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_08 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_09 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_10 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_11 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2024_12 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_01 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_02 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_03 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_04 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_05 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_06 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_07 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_08 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_09 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_10 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_11 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2025_12 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_01 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_02 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_03 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_04 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_05 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_06 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_07 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_08 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_09 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_10 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_11 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2026_12 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_01 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_02 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_03 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_04 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_05 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_06 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_07 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_08 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_09 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_10 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_11 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
CREATE TABLE IF NOT EXISTS jso_sap_grn_history_2027_12 PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');

-- =====================================================
-- 5. 创建索引（分区表索引会自动继承到各分区）
-- =====================================================

-- Pull Log 索引
CREATE INDEX IF NOT EXISTS idx_pull_partitioned_ref_date ON jso_sap_pull_log_partitioned(reference, date_created);
CREATE INDEX IF NOT EXISTS idx_pull_partitioned_date_trans ON jso_sap_pull_log_partitioned(date_created, trans);
CREATE INDEX IF NOT EXISTS idx_pull_partitioned_to_number ON jso_sap_pull_log_partitioned(to_number);

-- GRN History 索引
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_material_date ON jso_sap_grn_history_partitioned(material, creation_date);
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_to_number ON jso_sap_grn_history_partitioned(to_number);
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_trans_date ON jso_sap_grn_history_partitioned(trans, creation_date);
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_reference ON jso_sap_grn_history_partitioned(reference);

-- =====================================================
-- 6. 创建视图保持向后兼容
-- =====================================================

-- Pull Log 视图
CREATE OR REPLACE VIEW jso_sap_pull_log AS
SELECT * FROM jso_sap_pull_log_partitioned;

-- GRN History 视图
CREATE OR REPLACE VIEW jso_sap_grn_history AS
SELECT * FROM jso_sap_grn_history_partitioned;

-- =====================================================
-- 7. 数据迁移（从原表迁移到分区表）
-- 注意：执行此步骤前请先备份数据！
-- =====================================================

-- 迁移 Pull Log 数据
-- INSERT INTO jso_sap_pull_log_partitioned
--   (plant, warehouse, date_created, time_created, user_name, seq_no, trans, rf_ind, success, mvt,
--    from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
--    reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
--    started_at)
-- SELECT
--   plant, warehouse,
--   CASE
--     WHEN date_created IS NOT NULL THEN date_created::date
--     ELSE CURRENT_DATE
--   END as date_created,
--   time_created, user_name, seq_no, trans, rf_ind, success, mvt,
--   from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
--   reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
--   started_at
-- FROM jso_sap_pull_log;

-- 迁移 GRN History 数据
-- INSERT INTO jso_sap_grn_history_partitioned
--   (plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
--    special, vendor, batch, creation_date, creation_time, created_by, trans, from_sloc, to_sloc,
--    reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
--    gr_date, pulled_at, is_processed, process_result, processed_by, processed_at)
-- SELECT
--   plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
--   special, vendor, batch,
--   CASE
--     WHEN creation_date IS NOT NULL THEN TO_DATE(creation_date, 'MM/DD/YYYY')::date
--     ELSE CURRENT_DATE
--   END as creation_date,
--   creation_time, created_by, trans, from_sloc, to_sloc,
--   reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
--   gr_date, pulled_at, is_processed, process_result, processed_by, processed_at
-- FROM jso_sap_grn_history;

-- =====================================================
-- 8. 创建函数：自动创建未来分区
-- =====================================================

CREATE OR REPLACE FUNCTION create_future_partitions()
RETURNS void AS $$
DECLARE
    i INTEGER;
    curr_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- 为未来6个月创建分区
    FOR i IN 0..5 LOOP
        curr_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::interval;
        start_date := curr_date;
        end_date := curr_date + '1 month'::interval;

        partition_name := 'jso_sap_pull_log_' || TO_CHAR(curr_date, 'YYYY_MM');

        -- 创建 Pull Log 分区
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF jso_sap_pull_log_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        ) ON CONFLICT DO NOTHING;

        partition_name := 'jso_sap_grn_history_' || TO_CHAR(curr_date, 'YYYY_MM');

        -- 创建 GRN History 分区
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF jso_sap_grn_history_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. 创建定时任务：自动创建分区
-- 建议：每月1号凌晨2点执行
-- =====================================================

-- 在 psql 中执行（需要 pg_cron 扩展）
-- SELECT cron.schedule('auto-create-partitions', '0 2 1 * *', 'SELECT create_future_partitions()');

-- =====================================================
-- 验证分区信息
-- =====================================================

-- SELECT
--     parent.relname AS parent_table,
--     child.relname AS partition_name,
--     pg_get_expr(child.relpartbound, child.oid, true) AS partition_range
-- FROM pg_inherits
-- JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
-- JOIN pg_class child ON pg_inherits.inhrelid = child.oid
-- WHERE parent.relname IN ('jso_sap_pull_log_partitioned', 'jso_sap_grn_history_partitioned')
-- ORDER BY parent.relname, child.relname;

-- =====================================================
-- 提示：执行步骤
-- =====================================================
-- 1. 在生产环境执行前，先在测试环境验证
-- 2. 建议分步执行：
--    a. 先创建分区表结构（步骤1-5）
--    b. 测试应用兼容性
--    c. 备份原表数据
--    d. 执行数据迁移（步骤7，取消注释）
--    e. 验证数据完整性
--    f. 修改应用代码使用新表
--    g. 确认无误后删除原表
-- =====================================================
