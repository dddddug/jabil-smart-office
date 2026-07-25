-- 添加邮箱字段到用户表
ALTER TABLE jso_system_user_management
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 创建邮箱索引
CREATE INDEX IF NOT EXISTS idx_user_email ON jso_system_user_management(email);
