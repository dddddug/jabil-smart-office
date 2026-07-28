-- 添加 special_status 字段到排班表
ALTER TABLE jso_hr_employee_schedule
ADD COLUMN IF NOT EXISTS special_status VARCHAR(50);

-- 添加注释
COMMENT ON COLUMN jso_hr_employee_schedule.special_status IS '特殊状态：调休、休息等';
