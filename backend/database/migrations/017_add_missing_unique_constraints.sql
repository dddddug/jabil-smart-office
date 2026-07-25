
-- 017_add_missing_unique_constraints.sql

-- Add unique constraint to jso_actual_work_hours
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'jso_actual_work_hours'::regclass
        AND contype = 'u'
        AND conkey = ARRAY[
            (SELECT attnum FROM pg_attribute WHERE attrelid = 'jso_actual_work_hours'::regclass AND attname = 'employee_id'),
            (SELECT attnum FROM pg_attribute WHERE attrelid = 'jso_actual_work_hours'::regclass AND attname = 'work_date')
        ]
    ) THEN
        ALTER TABLE jso_actual_work_hours
        ADD CONSTRAINT jso_actual_work_hours_unique_employee_date UNIQUE (employee_id, work_date);
    END IF;
END
$$;

-- Add unique constraint to jso_config_welfare_base_rates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'jso_config_welfare_base_rates'::regclass
        AND contype = 'u'
        AND conkey = ARRAY[
            (SELECT attnum FROM pg_attribute WHERE attrelid = 'jso_config_welfare_base_rates'::regclass AND attname = 'id')
        ]
    ) THEN
        ALTER TABLE jso_config_welfare_base_rates
        ADD CONSTRAINT jso_config_welfare_base_rates_unique_id UNIQUE (id);
    END IF;
END
$$;
