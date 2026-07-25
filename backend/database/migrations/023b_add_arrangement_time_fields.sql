-- 为工位安排表添加开始和结束时间字段
ALTER TABLE jso_hr_workstation_arrangement
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;
