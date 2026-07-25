-- 为工位安排表添加原因字段
ALTER TABLE jso_hr_workstation_arrangement
ADD COLUMN IF NOT EXISTS reason VARCHAR(500);
