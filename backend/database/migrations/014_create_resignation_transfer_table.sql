-- 创建人力资源管理 - 离职&转岗表
CREATE TABLE IF NOT EXISTS jso_hr_resignation_transfer (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES jso_system_user_management(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    type VARCHAR(50) NOT NULL, -- '离职' or '转岗'
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    approver_id INTEGER REFERENCES jso_system_user_management(id), -- For overall approval if type is '离职'
    approval_comment TEXT, -- For overall approval if type is '离职'
    
    -- Transfer specific fields
    transfer_to_id INTEGER REFERENCES jso_system_user_management(id), -- If type is '转岗', the employee transferring to
    transfer_reason TEXT, -- Reason for transfer
    transfer_plant_id INTEGER REFERENCES jso_org_plant_management(id), -- Target plant for transfer
    transfer_department_id INTEGER REFERENCES jso_org_department_management(id), -- Target department for transfer
    transfer_date DATE, -- Effective date of transfer/resignation
    
    -- Dual approval for transfer
    transfer_out_approver_id INTEGER REFERENCES jso_system_user_management(id),
    transfer_out_approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    transfer_out_approval_comment TEXT,
    transfer_in_approver_id INTEGER REFERENCES jso_system_user_management(id),
    transfer_in_approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    transfer_in_approval_comment TEXT,
    processed BOOLEAN DEFAULT FALSE, -- Flag to indicate if the transfer/resignation has been fully processed (e.g., user status updated)
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_employee_id ON jso_hr_resignation_transfer(employee_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_status ON jso_hr_resignation_transfer(status);
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_type ON jso_hr_resignation_transfer(type);
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_transfer_date ON jso_hr_resignation_transfer(transfer_date);
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_transfer_out_approver_id ON jso_hr_resignation_transfer(transfer_out_approver_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_resignation_transfer_transfer_in_approver_id ON jso_hr_resignation_transfer(transfer_in_approver_id);

-- Create trigger for updated_at column
DROP TRIGGER IF EXISTS update_jso_hr_resignation_transfer_updated_at ON jso_hr_resignation_transfer;
CREATE TRIGGER update_jso_hr_resignation_transfer_updated_at
    BEFORE UPDATE ON jso_hr_resignation_transfer
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 从 jso_hr_formal_leave 表中迁移离职和转岗数据
-- INSERT INTO jso_hr_resignation_transfer (
--     id, employee_id, plant_id, department_id, type, reason, proof_file, status, applicant_id, approver_id, approval_comment,
--     transfer_to_id, transfer_reason, transfer_plant_id, transfer_department_id, transfer_date,
--     transfer_out_approver_id, transfer_out_approval_status, transfer_out_approval_comment,
--     transfer_in_approver_id, transfer_in_approval_status, transfer_in_approval_comment, processed,
--     created_at, updated_at
-- )
-- SELECT
--     id, employee_id, plant_id, department_id, leave_type AS type, reason, proof_file, status, applicant_id, approver_id, approval_comment,
--     transfer_to_id, transfer_reason, transfer_plant_id, transfer_department_id, transfer_date,
--     transfer_out_approver_id, transfer_out_approval_status, transfer_out_approval_comment,
--     transfer_in_approver_id, transfer_in_approval_status, transfer_in_approval_comment, processed,
--     created_at, updated_at
-- FROM jso_hr_formal_leave
-- WHERE leave_type IN ('离职', '转岗');

-- -- 删除 jso_hr_formal_leave 表中已迁移的离职和转岗数据
-- DELETE FROM jso_hr_formal_leave WHERE leave_type IN ('离职', '转岗');

-- 调整 jso_hr_formal_leave 表的 leave_type 字段，移除 '离职' 和 '转岗' 选项
-- 这可能需要手动处理ENUM类型，或者在应用层限制
-- ALTER TABLE jso_hr_formal_leave DROP CONSTRAINT IF EXISTS jso_hr_formal_leave_leave_type_check; -- 如果有ENUM CHECK
-- ALTER TABLE jso_hr_formal_leave ALTER COLUMN leave_type TYPE VARCHAR(50); -- 如果需要改变类型
-- UPDATE jso_hr_formal_leave SET leave_type = 'UNKNOWN' WHERE leave_type IN ('离职', '转岗'); -- 或者更新现有数据

-- 注意：这里暂时不修改 jso_hr_formal_leave 的 leave_type 约束，假设应用层会处理
-- 如果 leave_type 是 ENUM 类型，需要更复杂的 ALTER TABLE 语句来移除枚举值。
-- 目前假设 leave_type 是 VARCHAR，应用层进行逻辑判断。

-- 删除 jso_hr_formal_leave 中与转岗/离职相关的字段
ALTER TABLE jso_hr_formal_leave
DROP COLUMN IF EXISTS transfer_plant_id,
DROP COLUMN IF EXISTS transfer_department_id,
DROP COLUMN IF EXISTS transfer_date,
DROP COLUMN IF EXISTS transfer_to_id,
DROP COLUMN IF EXISTS transfer_reason,
DROP COLUMN IF EXISTS transfer_out_approver_id,
DROP COLUMN IF EXISTS transfer_out_approval_status,
DROP COLUMN IF EXISTS transfer_out_approval_comment,
DROP COLUMN IF EXISTS transfer_in_approver_id,
DROP COLUMN IF EXISTS transfer_in_approval_status,
DROP COLUMN IF EXISTS transfer_in_approval_comment,
DROP COLUMN IF EXISTS processed;
