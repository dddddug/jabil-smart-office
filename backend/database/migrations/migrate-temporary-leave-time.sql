-- 迁移临时请假表，将日期字段改为支持时间
ALTER TABLE jso_hr_temporary_leave 
ALTER COLUMN start_date TYPE TIMESTAMP,
ALTER COLUMN end_date TYPE TIMESTAMP;

-- 如果有默认值需要重新设置（可选）
-- ALTER TABLE jso_hr_temporary_leave ALTER COLUMN start_date DROP DEFAULT;
-- ALTER TABLE jso_hr_temporary_leave ALTER COLUMN end_date DROP DEFAULT;
