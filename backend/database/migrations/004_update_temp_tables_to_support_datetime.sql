-- 修改临时加班和临时请假表，支持完整的日期时间
-- 临时加班表保持原有结构，但我们发送数据时需要注意格式
-- 修改临时请假表，将日期字段改为支持时间的字段

-- 为临时请假表添加时间字段
ALTER TABLE jso_hr_temporary_leave 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 如果需要的话，可以将现有数据迁移
-- 但考虑到现有数据可能只是日期，我们暂时保持兼容性
