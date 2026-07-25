-- 015_create_cost_summary_tables.sql

-- Cost 汇总中间统计表
CREATE TABLE IF NOT EXISTS cost_summary (
    id SERIAL PRIMARY KEY,
    fiscal_month VARCHAR(7) NOT NULL, -- 财月 (YYYY-MM)
    department_id INTEGER NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    personnel_type VARCHAR(50), -- 人员类型 (例如: '正式工', '3PL')
    position VARCHAR(255),
    available_budget NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    consumed_cost NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    remaining_cost NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    consumption_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    hourly_wage_base NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    hourly_wage_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    welfare_cost NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    yoy_consumed_cost NUMERIC(18, 2) DEFAULT 0.00,
    mom_consumed_cost NUMERIC(18, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_cost_summary_month_dept_type_pos UNIQUE (fiscal_month, department_id, personnel_type, position)
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    module VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    account_id INTEGER NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    target_id VARCHAR(255),
    details JSONB,
    operation_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cost_summary_timestamp') THEN
        CREATE TRIGGER update_cost_summary_timestamp
        BEFORE UPDATE ON cost_summary
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;
END
$$;
