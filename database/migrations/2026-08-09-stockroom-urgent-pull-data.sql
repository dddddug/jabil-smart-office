-- Stockroom Urgent Pull 数据表
-- 用于存储从外部API拉取的数据，支持定时刷新

CREATE TABLE IF NOT EXISTS jso_stockroom_urgent_pull_data (
    id SERIAL PRIMARY KEY,
    build_plan VARCHAR(255),
    customer VARCHAR(255),
    material_req_time TIMESTAMP,
    pulllist_no VARCHAR(255),
    part_number VARCHAR(255),
    part_desc TEXT,
    qty_required INTEGER DEFAULT 0,
    qty_allocated INTEGER DEFAULT 0,
    qty_short INTEGER DEFAULT 0,
    bin_location VARCHAR(100),
    is_pull_list_shortage BOOLEAN DEFAULT FALSE,
    -- 外部API原始字段
    build_plan_id INTEGER,
    bp_type VARCHAR(50),
    qm VARCHAR(50),
    sloc VARCHAR(50),
    storage_area VARCHAR(100),
    step VARCHAR(50),
    factory_ma_route VARCHAR(255),
    sets INTEGER DEFAULT 0,
    sap_model VARCHAR(255),
    assembly TEXT,
    creator VARCHAR(255),
    create_time TIMESTAMP,
    -- 元数据
    data_date DATE NOT NULL,  -- 数据日期（用于去重和刷新）
    pulled_at TIMESTAMP DEFAULT NOW(),  -- 数据拉取时间
    UNIQUE(pulllist_no, data_date)  -- 同一日期内同一PullListNo唯一
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_date ON jso_stockroom_urgent_pull_data(data_date);
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_pulllist ON jso_stockroom_urgent_pull_data(pulllist_no);
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_buildplan ON jso_stockroom_urgent_pull_data(build_plan);

-- 清理旧数据：只保留最近30天的数据（可选，按需执行）
-- DELETE FROM jso_stockroom_urgent_pull_data WHERE data_date < CURRENT_DATE - INTERVAL '30 days';
