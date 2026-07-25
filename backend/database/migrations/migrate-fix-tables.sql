-- 修复请假公差系统的数据库表结构
-- 1. 修改临时请假&公差表的日期字段为TIMESTAMP
-- 2. 为正式请假表添加转岗相关字段

-- 修改临时请假&公差表，将DATE字段改为TIMESTAMP
ALTER TABLE jso_hr_temporary_leave 
ALTER COLUMN start_date TYPE TIMESTAMP,
ALTER COLUMN end_date TYPE TIMESTAMP;

-- 为正式请假表添加转入部门ID字段
ALTER TABLE jso_hr_formal_leave 
ADD COLUMN IF NOT EXISTS transfer_department_id INTEGER REFERENCES jso_org_department_management(id);

-- 为正式请假表添加转入日期字段
ALTER TABLE jso_hr_formal_leave 
ADD COLUMN IF NOT EXISTS transfer_date DATE;
