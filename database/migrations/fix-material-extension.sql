-- 迁移 jso_material_extension 表
-- 将 raw_data JSON 字段内容提取到个别字段，然后删除 raw_data

-- 1. 先用 raw_data 更新 extension_date（因为它是正确的中国本地日期）
UPDATE jso_material_extension
SET extension_date = TO_DATE(raw_data->>'extensionDate', 'YYYY-MM-DD')
WHERE raw_data->>'extensionDate' IS NOT NULL;

-- 2. 删除 raw_data 字段
ALTER TABLE jso_material_extension DROP COLUMN IF EXISTS raw_data;

-- 3. 验证结果
SELECT COUNT(*) as total,
       COUNT(extension_date) as with_date,
       COUNT(user_name) as with_user,
       COUNT(extension_file_no) as with_file_no
FROM jso_material_extension;
