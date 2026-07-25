-- 添加转岗审批相关字段
ALTER TABLE jso_hr_formal_leave 
ADD COLUMN IF NOT EXISTS transfer_out_approver_id INTEGER REFERENCES jso_system_user_management(id),
ADD COLUMN IF NOT EXISTS transfer_out_approval_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transfer_out_approval_comment TEXT,
ADD COLUMN IF NOT EXISTS transfer_in_approver_id INTEGER REFERENCES jso_system_user_management(id),
ADD COLUMN IF NOT EXISTS transfer_in_approval_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transfer_in_approval_comment TEXT,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_transfer_out_approver_id ON jso_hr_formal_leave(transfer_out_approver_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_transfer_in_approver_id ON jso_hr_formal_leave(transfer_in_approver_id);
