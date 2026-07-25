-- 013_add_description_to_shift_duration_rules.sql

ALTER TABLE jso_config_shift_duration_rules
ADD COLUMN IF NOT EXISTS description VARCHAR(255);
