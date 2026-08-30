-- ================================================================================
-- 修正时间字段存储类型：将 TIMESTAMP WITH TIME ZONE 改为 TIMESTAMP WITHOUT TIME ZONE
-- 问题：TIMESTAMP WITH TIME ZONE 会将本地时间当作 UTC 存储，导致时区转换错误
-- 解决：使用 TIMESTAMP WITHOUT TIME ZONE，按原值存储，不再进行时区转换
-- ================================================================================

-- 1. jso_config_dept_calc_rules 表
ALTER TABLE jso_config_dept_calc_rules
    ALTER COLUMN enabled_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN disabled_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 2. jso_hr_employee_hourly_rates 表
ALTER TABLE jso_hr_employee_hourly_rates
    ALTER COLUMN start_time TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN end_time TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 3. jso_hr_cost_summary 表
ALTER TABLE jso_hr_cost_summary
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 4. jso_hr_cost_summary_data 表
ALTER TABLE jso_hr_cost_summary_data
    ALTER COLUMN operation_time TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 5. jso_hr_shift_duration_rules 表
ALTER TABLE jso_hr_shift_duration_rules
    ALTER COLUMN enabled_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN disabled_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 6. jwt_blacklist 表
ALTER TABLE jwt_blacklist
    ALTER COLUMN exp TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 7. jso_system_user_management 表
ALTER TABLE jso_system_user_management
    ALTER COLUMN last_login_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 8. jso_hr_formal_leave 表 (created_at, updated_at)
ALTER TABLE jso_hr_formal_leave
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 9. jso_hr_temporary_leave 表 (created_at, updated_at)
ALTER TABLE jso_hr_temporary_leave
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 10. jso_hr_temporary_overtime 表 (created_at, updated_at)
ALTER TABLE jso_hr_temporary_overtime
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 11. jso_system_role_management 表
ALTER TABLE jso_system_role_management
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 12. jso_org_plant_management 表
ALTER TABLE jso_org_plant_management
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 13. jso_org_department_management 表
ALTER TABLE jso_org_department_management
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 14. jso_system_notification 表
ALTER TABLE jso_system_notification
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 15. jso_hr_special_working_hours 表
ALTER TABLE jso_hr_special_working_hours
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 16. jso_resignation_transfer 表
ALTER TABLE jso_resignation_transfer
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 17. jso_system_announcements 表
ALTER TABLE jso_system_announcements
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 18. jso_attendance_records 表
ALTER TABLE jso_attendance_records
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 19. jso_attendance_schedule 表
ALTER TABLE jso_attendance_schedule
    ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
    ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;

-- 20. jso_arrangement_records 表 (如果存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_arrangement_records') THEN
        ALTER TABLE jso_arrangement_records
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 21. jso_k045_document 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_k045_document') THEN
        ALTER TABLE jso_k045_document
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 22. jso_da_material_document 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_da_material_document') THEN
        ALTER TABLE jso_da_material_document
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 23. jso_pnc_transfer_document 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_pnc_transfer_document') THEN
        ALTER TABLE jso_pnc_transfer_document
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 24. jso_pnc_transfer_config 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_pnc_transfer_config') THEN
        ALTER TABLE jso_pnc_transfer_config
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 25. jso_k_diff_config 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_k_diff_config') THEN
        ALTER TABLE jso_k_diff_config
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 26. jso_k_diff_registration 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_k_diff_registration') THEN
        ALTER TABLE jso_k_diff_registration
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 27. jso_workstation 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_workstation') THEN
        ALTER TABLE jso_workstation
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 28. jso_workstation_area 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_workstation_area') THEN
        ALTER TABLE jso_workstation_area
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 29. jso_position_reason_config 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_position_reason_config') THEN
        ALTER TABLE jso_position_reason_config
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 30. jso_material_package 表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_material_package') THEN
        ALTER TABLE jso_material_package
            ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE,
            ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- 31. 权限相关表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_permissions') THEN
        ALTER TABLE jso_permissions ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_roles') THEN
        ALTER TABLE jso_roles ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_role_permissions') THEN
        ALTER TABLE jso_role_permissions ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jso_user_roles') THEN
        ALTER TABLE jso_user_roles ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE;
    END IF;
END $$;

-- ================================================================================
-- 验证：查询所有 TIMESTAMP WITH TIME ZONE 字段
-- ================================================================================
-- SELECT
--     table_name,
--     column_name,
--     data_type,
--     udt_name
-- FROM information_schema.columns
-- WHERE udt_name = 'timestamptz'
-- ORDER BY table_name, column_name;
