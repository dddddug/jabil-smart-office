-- 添加临时事项字段到排班表
ALTER TABLE jso_hr_employee_schedule 
ADD COLUMN IF NOT EXISTS temp_matter_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS temp_matter_start_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS temp_matter_end_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS temp_matter_reason TEXT,
ADD COLUMN IF NOT EXISTS temp_matter_proof BOOLEAN DEFAULT FALSE;
