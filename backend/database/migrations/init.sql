
-- Jabil Smart Office - 数据库初始化脚本
-- 创建日期: 2026-06-30
-- 表名命名规范: jso_系统模块_功能表名
-- jso = Jabil Smart Office

-- 创建系统管理 - 角色管理表
CREATE TABLE IF NOT EXISTS jso_system_role_management (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始角色数据
INSERT INTO jso_system_role_management (id, name, description, status) VALUES
(1, 'super_admin', '拥有系统所有权限的超级管理员', 'active'),
(2, 'plant_admin', '拥有管理特定厂区权限的管理员', 'active'),
(3, 'department_admin', '拥有管理特定部门权限的管理员', 'active'),
(4, 'normal_employee', '普通员工，拥有基本查看和操作权限', 'active'),
(5, 'ic_manager', '集成电路部门经理', 'active')
ON CONFLICT (id) DO NOTHING;
SELECT setval('jso_system_role_management_id_seq', (SELECT MAX(id) FROM jso_system_role_management));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_system_role_management_status ON jso_system_role_management(status);
CREATE INDEX IF NOT EXISTS idx_jso_system_role_management_name ON jso_system_role_management(name);



-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_system_role_management_updated_at ON jso_system_role_management;
CREATE TRIGGER update_jso_system_role_management_updated_at
    BEFORE UPDATE ON jso_system_role_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建组织管理 - 厂区管理表
CREATE TABLE IF NOT EXISTS jso_org_plant_management (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始厂区数据
INSERT INTO jso_org_plant_management (id, name, description) VALUES
(1, 'Jabil', '捷普集团')
ON CONFLICT (id) DO NOTHING;
SELECT setval('jso_org_plant_management_id_seq', (SELECT MAX(id) FROM jso_org_plant_management));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_org_plant_management_name ON jso_org_plant_management(name);



-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_org_plant_management_updated_at ON jso_org_plant_management;
CREATE TRIGGER update_jso_org_plant_management_updated_at
    BEFORE UPDATE ON jso_org_plant_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建组织管理 - 部门管理表
CREATE TABLE IF NOT EXISTS jso_org_department_management (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES jso_org_plant_management(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plant_id, name)
);

-- 插入初始部门数据（暂无默认部门，实际部门由业务需求创建）
-- INSERT INTO jso_org_department_management (id, plant_id, name, description) VALUES
-- (1, 1, 'IT', '信息技术部')
-- ON CONFLICT (id) DO NOTHING;
-- SELECT setval('jso_org_department_management_id_seq', (SELECT MAX(id) FROM jso_org_department_management));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_org_department_management_plant_id ON jso_org_department_management(plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_org_department_management_name ON jso_org_department_management(name);



-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_org_department_management_updated_at ON jso_org_department_management;
CREATE TRIGGER update_jso_org_department_management_updated_at
    BEFORE UPDATE ON jso_org_department_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建部门计算规则配置表
CREATE TABLE IF NOT EXISTS jso_config_dept_calc_rules (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES jso_org_plant_management(id),
    department_id INTEGER NOT NULL REFERENCES jso_org_department_management(id),
    business_month VARCHAR(7) NOT NULL, -- YYYY-MM format
    estimated_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    exchange_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
    rate_coefficient DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
    status VARCHAR(10) NOT NULL DEFAULT 'active', -- 'active' or 'inactive'
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plant_id, department_id, business_month) -- Ensure unique rule per plant, department, and month
);

-- Add an index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_dept_calc_rules_plant_dept_month ON jso_config_dept_calc_rules (plant_id, department_id, business_month);

-- Add a function for updating 'updated_at' column
-- This function is already defined globally as update_updated_at_column(), no need to redefine

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS update_dept_calc_rules_updated_at ON jso_config_dept_calc_rules;

-- Add a trigger to update 'updated_at' on each update
CREATE TRIGGER update_dept_calc_rules_updated_at
BEFORE UPDATE ON jso_config_dept_calc_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 创建系统管理 - 用户管理表（已合并员工花名册字段）
CREATE TABLE IF NOT EXISTS jso_system_user_management (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    employee_id VARCHAR(50),
    role_id INTEGER REFERENCES jso_system_role_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 员工花名册字段
    sap_employee_id VARCHAR(50),
    gender VARCHAR(20),
    position VARCHAR(100),
    level VARCHAR(50),
    phone VARCHAR(20),
    hire_date DATE,
    leave_date DATE,
    ic_card_number VARCHAR(50),
    employee_type VARCHAR(50),
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始用户数据
INSERT INTO jso_system_user_management (id, username, password, real_name, role_id, plant_id, department_id, status) VALUES
(1, 'admin', '$2b$10$me.vjgh4AwyYoWEoTKzr4O/pRdZAPg7V8T6s65SXgiXjiuyJ63KeS', '管理员', 1, 1, 1, 'active')
ON CONFLICT (id) DO NOTHING;
SELECT setval('jso_system_user_management_id_seq', (SELECT MAX(id) FROM jso_system_user_management));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_username ON jso_system_user_management(username);
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_role_id ON jso_system_user_management(role_id);
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_plant_id ON jso_system_user_management(plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_department_id ON jso_system_user_management(department_id);
CREATE INDEX IF NOT EXISTS idx_jso_system_user_management_status ON jso_system_user_management(status);



-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_system_user_management_updated_at ON jso_system_user_management;
CREATE TRIGGER update_jso_system_user_management_updated_at
    BEFORE UPDATE ON jso_system_user_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建系统管理 - 通知表
CREATE TABLE IF NOT EXISTS jso_system_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES jso_system_user_management(id),
    icon VARCHAR(20),
    title VARCHAR(200),
    message TEXT,
    detail TEXT,
    type VARCHAR(50),
    related_data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_system_notification_user_id ON jso_system_notification(user_id);
CREATE INDEX IF NOT EXISTS idx_jso_system_notification_read ON jso_system_notification(read);
CREATE INDEX IF NOT EXISTS idx_jso_system_notification_type ON jso_system_notification(type);

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_system_notification_updated_at ON jso_system_notification;
CREATE TRIGGER update_jso_system_notification_updated_at
    BEFORE UPDATE ON jso_system_notification
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- 创建人力资源管理 - 临时加班表
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
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved
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

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_hr_temporary_overtime_updated_at ON jso_hr_temporary_overtime;
CREATE TRIGGER update_jso_hr_temporary_overtime_updated_at
    BEFORE UPDATE ON jso_hr_temporary_overtime
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- 创建人力资源管理 - 临时请假&公差表
CREATE TABLE IF NOT EXISTS jso_hr_temporary_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    leave_type VARCHAR(50), -- 临时请假, 公差
    start_date DATE,
    end_date DATE,
    hours DECIMAL(5,2),
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved
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



-- 创建人力资源管理 - 请假&年假表
CREATE TABLE IF NOT EXISTS jso_hr_formal_leave (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    leave_type VARCHAR(50), -- 年假, 事假, 病假, 婚假, 产假等
    start_date DATE,
    end_date DATE,
    days INTEGER,
    hours DECIMAL(5,2),
    reason TEXT,
    proof_file VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
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









