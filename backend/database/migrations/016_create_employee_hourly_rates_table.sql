-- 016_create_employee_hourly_rates_table.sql

CREATE TABLE IF NOT EXISTS jso_config_employee_hourly_rates (
    id SERIAL PRIMARY KEY,
    level VARCHAR(50) NOT NULL,
    standard_rate NUMERIC(10, 2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE, -- Nullable, indicates active if null
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Ensure only one active rate per level at any given time, or more precisely,
    -- no overlapping time ranges for the same level. This unique constraint ensures
    -- that for a given level, each start_time is unique.
    UNIQUE(level, start_time)
);

-- Add an index for faster lookups by level
CREATE INDEX IF NOT EXISTS idx_employee_hourly_rates_level ON jso_config_employee_hourly_rates (level);

-- Add a trigger to update 'updated_at' on each update
-- Assuming update_updated_at_column() is already defined as a global function (from init.sql)
DROP TRIGGER IF EXISTS update_jso_config_employee_hourly_rates_updated_at ON jso_config_employee_hourly_rates;
CREATE TRIGGER update_jso_config_employee_hourly_rates_updated_at
BEFORE UPDATE ON jso_config_employee_hourly_rates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
