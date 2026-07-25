-- =====================================================
-- 工位管理模块：工位基础配置表和工位安排表
-- =====================================================

-- 工位基础配置表
CREATE TABLE IF NOT EXISTS jso_config_workstation (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    plant_id INTEGER,
    department_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workstation_plant FOREIGN KEY (plant_id) REFERENCES jso_org_plant_management(id) ON DELETE SET NULL,
    CONSTRAINT fk_workstation_dept FOREIGN KEY (department_id) REFERENCES jso_org_department_management(id) ON DELETE SET NULL
);

-- 工位安排表（每天每个班次的员工分配）
CREATE TABLE IF NOT EXISTS jso_hr_workstation_arrangement (
    id SERIAL PRIMARY KEY,
    workstation_id INTEGER NOT NULL,
    arrangement_date DATE NOT NULL,
    shift_name VARCHAR(50) NOT NULL,
    employee_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_arrangement_workstation FOREIGN KEY (workstation_id) REFERENCES jso_config_workstation(id) ON DELETE CASCADE,
    CONSTRAINT fk_arrangement_employee FOREIGN KEY (employee_id) REFERENCES jso_system_user_management(id) ON DELETE CASCADE,
    CONSTRAINT uk_workstation_date_shift_employee UNIQUE (workstation_id, arrangement_date, shift_name, employee_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_workstation_plant ON jso_config_workstation(plant_id);
CREATE INDEX IF NOT EXISTS idx_workstation_dept ON jso_config_workstation(department_id);
CREATE INDEX IF NOT EXISTS idx_workstation_status ON jso_config_workstation(status);
CREATE INDEX IF NOT EXISTS idx_arrangement_date ON jso_hr_workstation_arrangement(arrangement_date);
CREATE INDEX IF NOT EXISTS idx_arrangement_shift ON jso_hr_workstation_arrangement(shift_name);
CREATE INDEX IF NOT EXISTS idx_arrangement_employee ON jso_hr_workstation_arrangement(employee_id);
CREATE INDEX IF NOT EXISTS idx_arrangement_date_shift ON jso_hr_workstation_arrangement(arrangement_date, shift_name);
