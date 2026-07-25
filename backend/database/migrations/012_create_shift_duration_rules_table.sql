-- 012_create_shift_duration_rules_table.sql

CREATE TABLE IF NOT EXISTS jso_config_shift_duration_rules (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES jso_org_plant_management(id),
    department_id INTEGER NOT NULL REFERENCES jso_org_department_management(id),
    shift_name VARCHAR(50) NOT NULL, -- e.g., 'A班', 'B班', 'N班'
    duration_hours DECIMAL(4, 2) NOT NULL, -- e.g., 8.00, 9.50
    status VARCHAR(10) NOT NULL DEFAULT 'active', -- 'active' or 'inactive'
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plant_id, department_id, shift_name) -- Ensure unique shift rule per plant, department, and shift name
);

-- Add an index for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_duration_rules_plant_dept_shift ON jso_config_shift_duration_rules (plant_id, department_id, shift_name);

-- Add a trigger to update 'updated_at' on each update
-- Assuming update_updated_at_column() is already defined as a global function
DROP TRIGGER IF EXISTS update_shift_duration_rules_updated_at ON jso_config_shift_duration_rules;
CREATE TRIGGER update_shift_duration_rules_updated_at
BEFORE UPDATE ON jso_config_shift_duration_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
