-- 创建三个HR表（如果不存在）

-- 创建临时加班表
CREATE TABLE IF NOT EXISTS jso_hr_temporary_overtime (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    overtime_type VARCHAR(50),
    overtime_date DATE,
    start_time TIME,
    end_time TIME,
    hours DECIMAL(5,2),
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_overtime_employee_id ON jso_hr_temporary_overtime(employee_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_overtime_plant_id ON jso_hr_temporary_overtime(plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_overtime_department_id ON jso_hr_temporary_overtime(department_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_overtime_status ON jso_hr_temporary_overtime(status);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_overtime_date ON jso_hr_temporary_overtime(overtime_date);

-- 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_hr_temporary_overtime_updated_at ON jso_hr_temporary_overtime;
CREATE TRIGGER update_jso_hr_temporary_overtime_updated_at
    BEFORE UPDATE ON jso_hr_temporary_overtime
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建临时请假&公差表
CREATE TABLE IF NOT EXISTS jso_hr_temporary_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    leave_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    hours DECIMAL(5,2),
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_leave_employee_id ON jso_hr_temporary_leave(employee_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_leave_plant_id ON jso_hr_temporary_leave(plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_leave_department_id ON jso_hr_temporary_leave(department_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_leave_status ON jso_hr_temporary_leave(status);
CREATE INDEX IF NOT EXISTS idx_jso_hr_temporary_leave_date ON jso_hr_temporary_leave(start_date, end_date);

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_hr_temporary_leave_updated_at ON jso_hr_temporary_leave;
CREATE TRIGGER update_jso_hr_temporary_leave_updated_at
    BEFORE UPDATE ON jso_hr_temporary_leave
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建正式请假表
CREATE TABLE IF NOT EXISTS jso_hr_formal_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    leave_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    days INTEGER,
    hours DECIMAL(5,2),
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    approver_id INTEGER REFERENCES jso_system_user_management(id),
    transfer_to_id INTEGER REFERENCES jso_system_user_management(id),
    transfer_reason TEXT,
    approval_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_employee_id ON jso_hr_formal_leave(employee_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_plant_id ON jso_hr_formal_leave(plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_department_id ON jso_hr_formal_leave(department_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_status ON jso_hr_formal_leave(status);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_date ON jso_hr_formal_leave(start_date, end_date);

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_hr_formal_leave_updated_at ON jso_hr_formal_leave;
CREATE TRIGGER update_jso_hr_formal_leave_updated_at
    BEFORE UPDATE ON jso_hr_formal_leave
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
