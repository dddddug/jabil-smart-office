-- ================================================
-- Stockroom Urgent Pull 数据生命周期管理
-- 分区策略：热数据（30天）+ 冷数据（历史）
-- ================================================

-- 1. 创建分区表函数
CREATE OR REPLACE FUNCTION create_partition_if_not_exists(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- 根据日期创建月度分区
    start_date := date_trunc('month', partition_date)::DATE;
    end_date := (start_date + INTERVAL '1 month')::DATE;
    partition_name := 'jso_stockroom_urgent_pull_data_' || to_char(start_date, 'YYYY_MM');

    -- 检查分区是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF jso_stockroom_urgent_pull_data
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE '创建分区: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建主表（使用声明式分区）
DROP TABLE IF EXISTS jso_stockroom_urgent_pull_data CASCADE;

CREATE TABLE jso_stockroom_urgent_pull_data (
    id SERIAL,
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
    data_date DATE NOT NULL,
    pulled_at TIMESTAMP DEFAULT NOW(),
    warehouse VARCHAR(100),
    item_count INTEGER DEFAULT 0,
    PRIMARY KEY (id, data_date),
    UNIQUE(pulllist_no, data_date)
) PARTITION BY RANGE (data_date);

-- 3. 创建索引（在主表上，分区会自动继承）
CREATE INDEX idx_stockroom_pull_data_pulllist ON jso_stockroom_urgent_pull_data(pulllist_no);
CREATE INDEX idx_stockroom_pull_data_pulled_at ON jso_stockroom_urgent_pull_data(pulled_at);

-- 4. 创建初始分区（当前月份和前后各2个月）
SELECT create_partition_if_not_exists(CURRENT_DATE);
SELECT create_partition_if_not_exists(CURRENT_DATE - INTERVAL '1 month');
SELECT create_partition_if_not_exists(CURRENT_DATE - INTERVAL '2 months');
SELECT create_partition_if_not_exists(CURRENT_DATE + INTERVAL '1 month');
SELECT create_partition_if_not_exists(CURRENT_DATE + INTERVAL '2 months');

-- 5. 查看分区信息
SELECT
    parent.relname as parent_table,
    child.relname as partition_name,
    pg_get_expr(child.relpartbound, child.oid) as partition_range
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
JOIN pg_namespace n ON n.oid = parent.relnamespace
WHERE parent.relname = 'jso_stockroom_urgent_pull_data';

-- 6. 创建函数：自动创建未来分区（定时任务调用）
CREATE OR REPLACE FUNCTION create_future_partitions(months_ahead INTEGER DEFAULT 3)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    partition_date DATE;
BEGIN
    FOR i IN 0..months_ahead LOOP
        partition_date := (CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
        PERFORM create_partition_if_not_exists(partition_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数：清理过期分区（删除超过指定天数的分区）
CREATE OR REPLACE FUNCTION drop_old_partitions(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(dropped_partition TEXT, dropped_records BIGINT) AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_days || ' days')::INTERVAL;

    FOR partition_record IN
        SELECT child.relname as partition_name,
               (SELECT COUNT(*) FROM jso_stockroom_urgent_pull_data p WHERE child.relname = p.tableoid::regclass::TEXT)::BIGINT as record_count
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = 'jso_stockroom_urgent_pull_data'
    LOOP
        -- 从分区名提取日期（格式: jso_stockroom_urgent_pull_data_YYYY_MM）
        IF partition_record.partition_name ~ 'jso_stockroom_urgent_pull_data_\d{4}_\d{2}' THEN
            DECLARE
                partition_date DATE;
            BEGIN
                partition_date := to_date(
                    regexp_replace(partition_record.partition_name, 'jso_stockroom_urgent_pull_data_', ''),
                    'YYYY_MM'
                )::DATE;

                -- 如果分区日期早于保留期，删除分区
                IF partition_date < date_trunc('month', cutoff_date) THEN
                    EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
                    dropped_partition := partition_record.partition_name;
                    dropped_records := partition_record.record_count;
                    RETURN NEXT;
                END IF;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. 查看当前分区和数据统计
SELECT
    child.relname as partition_name,
    pg_size_pretty(pg_relation_size(child.oid)) as partition_size,
    (SELECT COUNT(*) FROM jso_stockroom_urgent_pull_data p WHERE child.oid = p.tableoid) as record_count
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'jso_stockroom_urgent_pull_data'
ORDER BY child.relname;
