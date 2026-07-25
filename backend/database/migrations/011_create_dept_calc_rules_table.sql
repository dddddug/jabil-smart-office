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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists before creating it
DROP TRIGGER IF EXISTS update_dept_calc_rules_updated_at ON jso_config_dept_calc_rules;

-- Add a trigger to update 'updated_at' on each update
CREATE TRIGGER update_dept_calc_rules_updated_at
BEFORE UPDATE ON jso_config_dept_calc_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
