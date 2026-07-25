-- 为临时请假表添加时间字段
ALTER TABLE jso_hr_temporary_leave 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;
