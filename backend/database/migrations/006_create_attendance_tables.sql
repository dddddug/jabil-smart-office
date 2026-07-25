-- ================================================
-- 创建破7休1和周工时上限相关数据表
-- ================================================

-- 1. 破7休1记录表
CREATE TABLE IF NOT EXISTS jso_hr_break7_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER REFERENCES jso_org_department_management(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    consecutive_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    approver_id INTEGER REFERENCES jso_system_user_management(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 周工时上限超限记录表
CREATE TABLE IF NOT EXISTS jso_hr_weekly_hour_limit_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES jso_system_user_management(id),
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER NOT NULL REFERENCES jso_org_department_management(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    week_number VARCHAR(10) NOT NULL, -- 如 2026-WK26
    total_hours NUMERIC(5,2) NOT NULL,
    over_limit_hours NUMERIC(5,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    approver_id INTEGER REFERENCES jso_system_user_management(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 破7休1和周工时汇总表（用于汇总数据）
CREATE TABLE IF NOT EXISTS jso_hr_monthly_attendance_summary (
    id SERIAL PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- 如 2026-06
    plant_id INTEGER REFERENCES jso_org_plant_management(id),
    department_id INTEGER NOT NULL REFERENCES jso_org_department_management(id),
    applicant_id INTEGER REFERENCES jso_system_user_management(id),
    break7_count INTEGER DEFAULT 0,
    weekly_limit_count INTEGER DEFAULT 0,
    implementation_period VARCHAR(50),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, plant_id, department_id)
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_break7_employee ON jso_hr_break7_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_break7_date ON jso_hr_break7_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_limit_employee ON jso_hr_weekly_hour_limit_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_limit_week ON jso_hr_weekly_hour_limit_records(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_summary_month ON jso_hr_monthly_attendance_summary(month);

-- ================================================
-- 注释说明
-- ================================================

-- jso_hr_break7_records: 记录员工连续工作超过7天的情况
-- jso_hr_weekly_hour_limit_records: 记录员工周工时超过63.75小时的情况
-- jso_hr_monthly_attendance_summary: 按月汇总部门的破7休1和周工时超限情况，用于填写原因说明和审批

-- status字段说明:
-- pending: 待审批/待处理
-- approved: 已批准
-- rejected: 已拒绝
