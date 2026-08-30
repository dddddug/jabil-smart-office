-- ================================================
-- Stockroom Urgent Pull 性能优化索引
-- 执行时间：2026-08-26
-- ================================================

-- 1. material_req_time 索引（最常用的筛选条件）
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_material_req_time
ON jso_stockroom_urgent_pull_data(material_req_time);

-- 2. pulled_at 索引（用于去重查询的关键字段）
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_pulled_at
ON jso_stockroom_pull_data(pulled_at);

-- 3. 复合索引：支持常见的筛选+去重查询
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_date_pulled
ON jso_stockroom_urgent_pull_data(data_date, pulled_at DESC);

-- 4. material_req_time + pulled_at 复合索引
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_req_pulled
ON jso_stockroom_urgent_pull_data(material_req_time, pulled_at DESC);

-- 5. customer 索引（支持客户筛选）
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_customer
ON jso_stockroom_urgent_pull_data(customer);

-- 6. 仅保留最近90天数据的清理策略（可选，按需执行）
-- DELETE FROM jso_stockroom_urgent_pull_data WHERE data_date < CURRENT_DATE - INTERVAL '90 days';

-- 7. 查看当前索引情况
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'jso_stockroom_urgent_pull_data';
