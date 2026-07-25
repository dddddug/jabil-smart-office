CREATE TABLE IF NOT EXISTS jso_cost_summary_data (
    id SERIAL PRIMARY KEY,
    fiscal_month VARCHAR(7) NOT NULL, -- YYYY-MM
    department_id INTEGER NOT NULL,
    position VARCHAR(255) NOT NULL,
    available_budget NUMERIC(18, 2) NOT NULL,
    total_cost NUMERIC(18, 2) NOT NULL,
    total_work_hours NUMERIC(10, 2) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    welfare_cost NUMERIC(18, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加唯一约束以防止重复的财月、部门和岗位组合
CREATE UNIQUE INDEX IF NOT EXISTS idx_jso_cost_summary_data_unique_fiscal_dept_pos
ON jso_cost_summary_data (fiscal_month, department_id, position);