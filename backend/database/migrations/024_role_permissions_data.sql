-- Insert role permission assignments

-- 8. 为超级管理员角色分配所有权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 1, p.id, 'all', true
FROM jso_system_permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- 9. 为厂区管理员角色分配业务中心和部分数据中心权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 2, p.id, 'plant', true
FROM jso_system_permissions p
WHERE p.module IN ('employee-schedule', 'station-arrangement', 'k045', 'da-material',
                   'organizational-structure', 'plant-management', 'department-management',
                   'bin-volume-management', 'expired-material-extension', 'six-s-management', 'k2-diff-registration',
                   'announcement-management')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 2 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 2, p.id, 'plant', false
FROM jso_system_permissions p
WHERE p.module IN ('kpi-indicators', 'cost-summary', 'production-tracking', 'bonus-evaluation',
                   'employee-roster', 'leave-management', 'convenient-print')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 2 AND rp.permission_id = p.id
);

-- 10. 为部门管理员角色分配权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 3, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.module IN ('employee-schedule', 'station-arrangement', 'k045', 'da-material',
                   'employee-roster', 'leave-management')
AND p.action IN ('view', 'edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 3 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 3, p.id, 'dept', false
FROM jso_system_permissions p
WHERE p.module IN ('kpi-indicators', 'cost-summary', 'bonus-evaluation',
                   'convenient-print', 'announcement-management')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 3 AND rp.permission_id = p.id
);

-- 11. 为普通员工角色分配基础权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 4, p.id, 'self', false
FROM jso_system_permissions p
WHERE p.code IN ('employee-schedule:view', 'employee-roster:view', 'announcement-management:view',
                 'cost-summary:view', 'convenient-print:view')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 4 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 4, p.id, 'self', true
FROM jso_system_permissions p
WHERE p.code IN ('leave-management:edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 4 AND rp.permission_id = p.id
);

-- 12. 为IC经理角色分配权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 5, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.module IN ('employee-schedule', 'station-arrangement', 'k045', 'da-material',
                   'employee-roster', 'leave-management', 'kpi-indicators', 'cost-summary', 'bonus-evaluation')
AND p.action IN ('view', 'edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 5 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 5, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.code IN ('announcement-management:view', 'convenient-print:view', 'cost-summary:export')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 5 AND rp.permission_id = p.id
);
