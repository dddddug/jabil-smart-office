-- ================================================
-- Stockroom Urgent Pull - 添加 ITEM 计数预计算字段
-- 执行时间：2026-08-26
-- ================================================

-- 1. 添加 item_count 字段（预计算存储）
ALTER TABLE jso_stockroom_urgent_pull_data
ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;

-- 2. 添加索引（用于预计算更新）
CREATE INDEX IF NOT EXISTS idx_stockroom_pull_data_pulllist_date
ON jso_stockroom_urgent_pull_data(pulllist_no, data_date);

-- 3. 查看表结构确认
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jso_stockroom_urgent_pull_data'
ORDER BY ordinal_position;
