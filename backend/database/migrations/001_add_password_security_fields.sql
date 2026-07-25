-- ========================================
-- 迁移：添加密码和安全问题相关字段
-- ========================================

-- 为用户表添加字段
ALTER TABLE jso_system_user_management 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS security_question VARCHAR(255),
ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255);

-- 更新现有用户，将系统管理员设置为不需要首次修改密码
UPDATE jso_system_user_management 
SET must_change_password = FALSE 
WHERE username IN ('admin');
