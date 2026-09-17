-- 添加部门OLE追踪模块的权限
-- 创建时间: 2026-09-09

-- 添加菜单项到系统模块
INSERT INTO jso_system_modules (code, name, icon, description, route_name, sort_order, parent_id, type, status, created_at)
VALUES ('ole-tracking', '部门OLE追踪', '📊', '部门OLE追踪模块', 'production-tracking', 13, NULL, 'menu', 'active', CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 获取刚插入的模块ID
DO $$
DECLARE
    module_id INTEGER;
BEGIN
    SELECT id INTO module_id FROM jso_system_modules WHERE code = 'ole-tracking';

    -- 添加按钮权限
    INSERT INTO jso_system_permissions (code, name, type, module_code, permission_key, description, sort_order, status, created_at)
    VALUES
        ('ole-tracking:view', '查看部门OLE追踪', 'button', 'ole-tracking', 'view', '查看部门OLE追踪数据', 1, 'active', CURRENT_TIMESTAMP),
        ('ole-tracking:export', '导出部门OLE追踪', 'button', 'ole-tracking', 'export', '导出部门OLE追踪数据', 2, 'active', CURRENT_TIMESTAMP),
        ('ole-tracking:config', '配置效率系数', 'button', 'ole-tracking', 'config', '配置效率系数', 3, 'active', CURRENT_TIMESTAMP)
    ON CONFLICT (code) DO NOTHING;
END $$;

-- 将权限分配给管理员角色
DO $$
DECLARE
    admin_role_id INTEGER;
BEGIN
    SELECT id INTO admin_role_id FROM jso_system_roles WHERE code = 'admin';

    IF admin_role_id IS NOT NULL THEN
        INSERT INTO jso_system_role_permissions (role_id, permission_id)
        SELECT admin_role_id, p.id
        FROM jso_system_permissions p
        WHERE p.module_code = 'ole-tracking'
        AND NOT EXISTS (
            SELECT 1 FROM jso_system_role_permissions rp
            WHERE rp.role_id = admin_role_id AND rp.permission_id = p.id
        );
    END IF;
END $$;
