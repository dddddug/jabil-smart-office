-- ========================================
-- 迁移：为用户管理表添加旧工号字段
-- ========================================

-- 为用户表添加旧工号字段
ALTER TABLE jso_system_user_management 
ADD COLUMN IF NOT EXISTS old_employee_id VARCHAR(50);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_old_employee_id ON jso_system_user_management(old_employee_id);
