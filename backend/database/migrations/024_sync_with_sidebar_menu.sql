-- Jabil Smart Office - 权限管理系统 - 与前端菜单一一对应
-- 创建日期: 2026-08-05
-- 与 DashboardView.vue 中的 sidebarMenuItems 一一对应

-- 1. 创建模块配置表
CREATE TABLE IF NOT EXISTS jso_system_modules (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建权限定义表
CREATE TABLE IF NOT EXISTS jso_system_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'button',
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20),
    description TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建角色权限关联表
CREATE TABLE IF NOT EXISTS jso_system_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    data_scope VARCHAR(20) NOT NULL DEFAULT 'self',
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- 4. 创建用户权限覆盖表
CREATE TABLE IF NOT EXISTS jso_system_user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    data_scope VARCHAR(20),
    can_edit BOOLEAN,
    is_temporary BOOLEAN DEFAULT false,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    reason TEXT,
    granted_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- 5. 创建权限变更日志表
CREATE TABLE IF NOT EXISTS jso_system_permission_logs (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER NOT NULL,
    target_user_id INTEGER,
    target_role_id INTEGER,
    action VARCHAR(20) NOT NULL,
    permission_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. 插入模块数据 - 与 DashboardView sidebarMenuItems 一一对应
-- 主菜单分组（is_header: true 的项）
INSERT INTO jso_system_modules (code, name, icon, description, sort_order) VALUES
('business-center', '业务中心', '📋', '业务中心主菜单', 1),
('data-center', '数据中心', '📊', '数据中心主菜单', 2),
('hr-center', '人事中心', '👥', '人事中心主菜单', 3),
('print-center', '便捷打印', '🖨️', '便捷打印主菜单', 4),
('org-management', '组织管理', '🏢', '组织管理主菜单', 5),
('warehouse', '仓储管理', '📦', '仓储管理主菜单', 6),
('system-management', '系统管理', '⚙️', '系统管理主菜单', 7),
('rules-config', '规则配置', '⚙️', '规则配置主菜单', 8),
('others', '其他', '📌', '其他主菜单', 9)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 子菜单模块（实际的菜单项）
INSERT INTO jso_system_modules (code, name, icon, description, sort_order) VALUES
-- 业务中心子菜单
('employee-schedule', '员工排班', '📅', '员工排班管理', 101),
('station-arrangement', '工位安排', '🏭', '工位安排管理', 102),
('k045', 'K045 单据管理', '📦', 'K045单据管理', 103),
('da-material', '管控物料 单据管理', '📋', '管控物料单据管理', 104),
-- 数据中心子菜单
('kpi-indicators', '关键KPI', '📉', '关键KPI指标', 201),
('cost-summary', 'Cost汇总', '💰', 'Cost汇总报表', 202),
('production-tracking', '生产追踪', '📊', '生产追踪', 203),
('bonus-evaluation', '奖金评估', '🎯', '奖金评估', 204),
-- 人事中心子菜单
('employee-roster', '员工花名册', '👥', '员工花名册', 301),
('leave-management', '请假公差', '📝', '请假公差管理', 302),
-- 便捷打印子菜单
('convenient-print', 'PNC转仓打印', '📋', 'PNC转仓打印', 401),
-- 组织管理子菜单
('organizational-structure', '组织结构', '🏢', '组织结构', 501),
('plant-management', '厂区管理', '🏭', '厂区管理', 502),
('department-management', '部门管理', '🏢', '部门管理', 503),
-- 仓储管理子菜单
('bin-volume-management', 'Bin容量', '📦', 'Bin容量管理', 601),
('expired-material-extension', '过期料延期', '⏰', '过期料延期管理', 602),
('six-s-management', '6S管理', '✨', '6S管理', 603),
('k2-diff-registration', 'K**差异登记', '📝', 'K**差异登记', 604),
-- 系统管理子菜单
('announcement-management', '系统公告', '📢', '系统公告', 701),
('user-management', '用户管理', '👤', '用户管理', 702),
('role-management', '角色管理', '🎭', '角色管理', 703),
('permission-management', '权限管理', '🔐', '权限管理', 704),
-- 规则配置子菜单
('dept-calc-rules-config', '部门计算规则', '📐', '部门计算规则配置', 801),
('shift-duration-rules-config', '班次时长规则', '⏰', '班次时长规则配置', 802),
('smart-schedule-rules-config', '智能排班规则', '📋', '智能排班规则配置', 803),
('k045-config', 'K045 规则配置', '📄', 'K045规则配置', 804),
('da-material-config', '管控物料 规则配置', '📋', '管控物料规则配置', 805),
('pnc-transfer-config', 'PNC转仓打印配置', '📄', 'PNC转仓打印配置', 806),
('k2-diff-config', 'K**差异登记 规则配置', '📝', 'K**差异登记规则配置', 807),
('workstation-config', '工位配置', '🏭', '工位配置', 808),
('employee-hourly-rate-config', '员工时薪配置', '💵', '员工时薪配置', 809),
('welfare-base-config', '福利基础配置', '🎁', '福利基础配置', 810),
-- 其他子菜单
('version-info', '版本信息', '📋', '版本信息', 901),
('api-docs', '接口文档', '📡', '接口文档', 902)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 7. 插入权限数据 - 每个模块的 view 和 edit 权限
INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
-- 业务中心权限
('employee-schedule:view', '查看员工排班', 'button', 'employee-schedule', 'view', '查看员工排班信息', 1),
('employee-schedule:edit', '编辑员工排班', 'button', 'employee-schedule', 'edit', '编辑员工排班信息', 2),
('employee-schedule:export', '导出员工排班', 'button', 'employee-schedule', 'export', '导出员工排班数据', 3),
('station-arrangement:view', '查看工位安排', 'button', 'station-arrangement', 'view', '查看工位安排信息', 1),
('station-arrangement:edit', '编辑工位安排', 'button', 'station-arrangement', 'edit', '编辑工位安排信息', 2),
('k045:view', '查看K045单据', 'button', 'k045', 'view', '查看K045单据', 1),
('k045:edit', '编辑K045单据', 'button', 'k045', 'edit', '编辑K045单据', 2),
('k045:approve', '审批K045单据', 'button', 'k045', 'approve', '审批K045单据', 3),
('da-material:view', '查看管控物料单据', 'button', 'da-material', 'view', '查看管控物料单据', 1),
('da-material:edit', '编辑管控物料单据', 'button', 'da-material', 'edit', '编辑管控物料单据', 2),
('da-material:approve', '审批管控物料单据', 'button', 'da-material', 'approve', '审批管控物料单据', 3),

-- 数据中心权限
('kpi-indicators:view', '查看关键KPI', 'button', 'kpi-indicators', 'view', '查看关键KPI指标', 1),
('kpi-indicators:export', '导出关键KPI', 'button', 'kpi-indicators', 'export', '导出关键KPI数据', 2),
('cost-summary:view', '查看Cost汇总', 'button', 'cost-summary', 'view', '查看Cost汇总报表', 1),
('cost-summary:export', '导出Cost汇总', 'button', 'cost-summary', 'export', '导出Cost汇总数据', 2),
('production-tracking:view', '查看生产追踪', 'button', 'production-tracking', 'view', '查看生产追踪信息', 1),
('production-tracking:export', '导出生产追踪', 'button', 'production-tracking', 'export', '导出生产追踪数据', 2),
('bonus-evaluation:view', '查看奖金评估', 'button', 'bonus-evaluation', 'view', '查看奖金评估', 1),
('bonus-evaluation:edit', '编辑奖金评估', 'button', 'bonus-evaluation', 'edit', '编辑奖金评估', 2),
('bonus-evaluation:export', '导出奖金评估', 'button', 'bonus-evaluation', 'export', '导出奖金评估数据', 3),

-- 人事中心权限
('employee-roster:view', '查看员工花名册', 'button', 'employee-roster', 'view', '查看员工花名册', 1),
('employee-roster:edit', '编辑员工花名册', 'button', 'employee-roster', 'edit', '编辑员工花名册', 2),
('employee-roster:export', '导出员工花名册', 'button', 'employee-roster', 'export', '导出员工花名册数据', 3),
('leave-management:view', '查看请假公差', 'button', 'leave-management', 'view', '查看请假公差记录', 1),
('leave-management:edit', '编辑请假公差', 'button', 'leave-management', 'edit', '提交请假公差申请', 2),
('leave-management:approve', '审批请假公差', 'button', 'leave-management', 'approve', '审批请假公差申请', 3),

-- 便捷打印权限
('convenient-print:view', '查看PNC转仓打印', 'button', 'convenient-print', 'view', '查看PNC转仓打印', 1),
('convenient-print:edit', '使用PNC转仓打印', 'button', 'convenient-print', 'edit', '使用PNC转仓打印功能', 2),
('convenient-print:export', '导出打印数据', 'button', 'convenient-print', 'export', '导出打印数据', 3),

-- 组织管理权限
('organizational-structure:view', '查看组织结构', 'button', 'organizational-structure', 'view', '查看组织结构', 1),
('organizational-structure:edit', '编辑组织结构', 'button', 'organizational-structure', 'edit', '编辑组织结构', 2),
('plant-management:view', '查看厂区管理', 'button', 'plant-management', 'view', '查看厂区信息', 1),
('plant-management:edit', '编辑厂区管理', 'button', 'plant-management', 'edit', '编辑厂区信息', 2),
('department-management:view', '查看部门管理', 'button', 'department-management', 'view', '查看部门信息', 1),
('department-management:edit', '编辑部门管理', 'button', 'department-management', 'edit', '编辑部门信息', 2),

-- 仓储管理权限
('bin-volume-management:view', '查看Bin容量', 'button', 'bin-volume-management', 'view', '查看Bin容量', 1),
('bin-volume-management:edit', '编辑Bin容量', 'button', 'bin-volume-management', 'edit', '编辑Bin容量', 2),
('expired-material-extension:view', '查看过期料延期', 'button', 'expired-material-extension', 'view', '查看过期料延期', 1),
('expired-material-extension:edit', '编辑过期料延期', 'button', 'expired-material-extension', 'edit', '编辑过期料延期', 2),
('six-s-management:view', '查看6S管理', 'button', 'six-s-management', 'view', '查看6S管理', 1),
('six-s-management:edit', '编辑6S管理', 'button', 'six-s-management', 'edit', '编辑6S管理', 2),
('k2-diff-registration:view', '查看K**差异登记', 'button', 'k2-diff-registration', 'view', '查看K**差异登记', 1),
('k2-diff-registration:edit', '编辑K**差异登记', 'button', 'k2-diff-registration', 'edit', '编辑K**差异登记', 2),

-- 系统管理权限
('announcement-management:view', '查看系统公告', 'button', 'announcement-management', 'view', '查看系统公告', 1),
('announcement-management:edit', '编辑系统公告', 'button', 'announcement-management', 'edit', '发布修改系统公告', 2),
('user-management:view', '查看用户管理', 'button', 'user-management', 'view', '查看用户信息', 1),
('user-management:edit', '编辑用户管理', 'button', 'user-management', 'edit', '编辑用户信息', 2),
('role-management:view', '查看角色管理', 'button', 'role-management', 'view', '查看角色信息', 1),
('role-management:edit', '编辑角色管理', 'button', 'role-management', 'edit', '编辑角色信息', 2),
('permission-management:view', '查看权限管理', 'button', 'permission-management', 'view', '查看权限配置', 1),
('permission-management:edit', '编辑权限管理', 'button', 'permission-management', 'edit', '编辑权限配置', 2),

-- 规则配置权限
('dept-calc-rules-config:view', '查看部门计算规则', 'button', 'dept-calc-rules-config', 'view', '查看部门计算规则', 1),
('dept-calc-rules-config:edit', '编辑部门计算规则', 'button', 'dept-calc-rules-config', 'edit', '编辑部门计算规则', 2),
('shift-duration-rules-config:view', '查看班次时长规则', 'button', 'shift-duration-rules-config', 'view', '查看班次时长规则', 1),
('shift-duration-rules-config:edit', '编辑班次时长规则', 'button', 'shift-duration-rules-config', 'edit', '编辑班次时长规则', 2),
('smart-schedule-rules-config:view', '查看智能排班规则', 'button', 'smart-schedule-rules-config', 'view', '查看智能排班规则', 1),
('smart-schedule-rules-config:edit', '编辑智能排班规则', 'button', 'smart-schedule-rules-config', 'edit', '编辑智能排班规则', 2),
('k045-config:view', '查看K045规则配置', 'button', 'k045-config', 'view', '查看K045规则配置', 1),
('k045-config:edit', '编辑K045规则配置', 'button', 'k045-config', 'edit', '编辑K045规则配置', 2),
('da-material-config:view', '查看管控物料规则配置', 'button', 'da-material-config', 'view', '查看管控物料规则配置', 1),
('da-material-config:edit', '编辑管控物料规则配置', 'button', 'da-material-config', 'edit', '编辑管控物料规则配置', 2),
('pnc-transfer-config:view', '查看PNC转仓打印配置', 'button', 'pnc-transfer-config', 'view', '查看PNC转仓打印配置', 1),
('pnc-transfer-config:edit', '编辑PNC转仓打印配置', 'button', 'pnc-transfer-config', 'edit', '编辑PNC转仓打印配置', 2),
('k2-diff-config:view', '查看K**差异规则配置', 'button', 'k2-diff-config', 'view', '查看K**差异规则配置', 1),
('k2-diff-config:edit', '编辑K**差异规则配置', 'button', 'k2-diff-config', 'edit', '编辑K**差异规则配置', 2),
('workstation-config:view', '查看工位配置', 'button', 'workstation-config', 'view', '查看工位配置', 1),
('workstation-config:edit', '编辑工位配置', 'button', 'workstation-config', 'edit', '编辑工位配置', 2),
('employee-hourly-rate-config:view', '查看员工时薪配置', 'button', 'employee-hourly-rate-config', 'view', '查看员工时薪配置', 1),
('employee-hourly-rate-config:edit', '编辑员工时薪配置', 'button', 'employee-hourly-rate-config', 'edit', '编辑员工时薪配置', 2),
('welfare-base-config:view', '查看福利基础配置', 'button', 'welfare-base-config', 'view', '查看福利基础配置', 1),
('welfare-base-config:edit', '编辑福利基础配置', 'button', 'welfare-base-config', 'edit', '编辑福利基础配置', 2),

-- 其他权限
('version-info:view', '查看版本信息', 'button', 'version-info', 'view', '查看版本信息', 1),
('api-docs:view', '查看接口文档', 'button', 'api-docs', 'view', '查看接口文档', 1)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

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
