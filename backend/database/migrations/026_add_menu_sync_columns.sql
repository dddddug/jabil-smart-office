-- Jabil Smart Office - 菜单同步增强
-- 添加 route_name 和 parent_code 列以支持完整的菜单同步功能

-- 1. 添加 route_name 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jso_system_modules' AND column_name = 'route_name'
    ) THEN
        ALTER TABLE jso_system_modules ADD COLUMN route_name VARCHAR(100);
    END IF;
END $$;

-- 2. 添加 parent_code 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jso_system_modules' AND column_name = 'parent_code'
    ) THEN
        ALTER TABLE jso_system_modules ADD COLUMN parent_code VARCHAR(50);
    END IF;
END $$;

-- 3. 添加 type 列来区分分组和菜单
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jso_system_modules' AND column_name = 'type'
    ) THEN
        ALTER TABLE jso_system_modules ADD COLUMN type VARCHAR(20) DEFAULT 'menu';
    END IF;
END $$;

-- 4. 更新现有数据 - 设置 parent_code 和 type
-- 主菜单分组（根据 sort_order 范围判断）
UPDATE jso_system_modules SET type = 'group' WHERE sort_order BETWEEN 1 AND 9;

-- 子菜单项
UPDATE jso_system_modules SET type = 'menu' WHERE type IS NULL OR type = 'menu';

-- 5. 设置 parent_code
UPDATE jso_system_modules SET parent_code = 'business-center' WHERE code IN (
    'employee-schedule', 'station-arrangement', 'k045', 'da-material'
);

UPDATE jso_system_modules SET parent_code = 'data-center' WHERE code IN (
    'kpi-indicators', 'cost-summary', 'production-tracking', 'bonus-evaluation'
);

UPDATE jso_system_modules SET parent_code = 'hr-center' WHERE code IN (
    'employee-roster', 'leave-management'
);

UPDATE jso_system_modules SET parent_code = 'print-center' WHERE code = 'convenient-print';

UPDATE jso_system_modules SET parent_code = 'org-management' WHERE code IN (
    'organizational-structure', 'plant-management', 'department-management'
);

UPDATE jso_system_modules SET parent_code = 'warehouse' WHERE code IN (
    'bin-volume-management', 'expired-material-extension', 'six-s-management', 'k2-diff-registration'
);

UPDATE jso_system_modules SET parent_code = 'system-management' WHERE code IN (
    'announcement-management', 'user-management', 'role-management', 'permission-management'
);

UPDATE jso_system_modules SET parent_code = 'rules-config' WHERE code IN (
    'dept-calc-rules-config', 'shift-duration-rules-config', 'smart-schedule-rules-config',
    'k045-config', 'da-material-config', 'pnc-transfer-config', 'k2-diff-config',
    'workstation-config', 'employee-hourly-rate-config', 'welfare-base-config'
);

UPDATE jso_system_modules SET parent_code = 'others' WHERE code IN (
    'version-info', 'api-docs'
);

-- 6. 设置 route_name
UPDATE jso_system_modules SET route_name = code WHERE code NOT IN (
    'business-center', 'data-center', 'hr-center', 'print-center', 'org-management',
    'warehouse', 'system-management', 'rules-config', 'others'
);
