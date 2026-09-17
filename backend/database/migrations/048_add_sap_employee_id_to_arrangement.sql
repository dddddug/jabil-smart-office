-- 为工位安排表添加 SAP 工号字段
ALTER TABLE jso_hr_workstation_arrangement
ADD COLUMN IF NOT EXISTS sap_employee_id VARCHAR(100);
