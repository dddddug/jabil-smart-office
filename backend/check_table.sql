-- 检查表结构
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'jso_pnc_transfer_document_item'
ORDER BY ordinal_position;

-- 检查所有相关表
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%pnc%';
