-- 为工位安排表添加工时字段
-- 创建时间: 2026-09-09
-- 描述: 为工位安排表添加工时字段用于效率计算

ALTER TABLE jso_hr_workstation_arrangement
ADD COLUMN IF NOT EXISTS hours DECIMAL(5, 2) DEFAULT 8;

-- 添加注释
COMMENT ON COLUMN jso_hr_workstation_arrangement.hours IS '工时（小时）';
