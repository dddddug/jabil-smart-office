ALTER TABLE jso_system_user_management
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
