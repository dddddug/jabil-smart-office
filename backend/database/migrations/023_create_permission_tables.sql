-- Jabil Smart Office - 权限管理系统简化迁移 v2
-- 创建日期: 2026-08-04

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

-- 6. 插入初始模块数据
INSERT INTO jso_system_modules (code, name, icon, description, sort_order) VALUES
('schedule', '员工排班', 'calendar', '管理员工排班信息', 1),
('workstation', '工位安排', 'grid', '管理工位分配信息', 2),
('roster', '员工花名册', 'user', '管理员工基本信息', 3),
('leave', '请假管理', 'document', '管理请假申请审批', 4),
('cost', '成本报表', 'money', '查看成本统计报表', 5),
('plant', '厂区管理', 'office-building', '管理厂区信息', 6),
('department', '部门管理', 'organization', '管理部门信息', 7),
('announcement', '公告管理', 'megaphone', '管理系统公告', 8),
('config', '系统配置', 'setting', '系统参数配置', 9)
ON CONFLICT (code) DO NOTHING;

-- 7. 插入初始权限数据
INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('schedule:view', '查看排班', 'button', 'schedule', 'view', '查看员工排班信息', 1),
('schedule:edit', '编辑排班', 'button', 'schedule', 'edit', '创建、修改、删除排班记录', 2),
('schedule:export', '导出排班', 'button', 'schedule', 'export', '导出排班数据', 3),
('workstation:view', '查看工位', 'button', 'workstation', 'view', '查看工位分配信息', 1),
('workstation:edit', '编辑工位', 'button', 'workstation', 'edit', '分配、修改工位', 2),
('roster:view', '查看员工', 'button', 'roster', 'view', '查看员工基本信息', 1),
('roster:edit', '编辑员工', 'button', 'roster', 'edit', '添加、修改员工信息', 2),
('roster:export', '导出员工', 'button', 'roster', 'export', '导出员工数据', 3),
('leave:view', '查看请假', 'button', 'leave', 'view', '查看请假记录', 1),
('leave:edit', '编辑请假', 'button', 'leave', 'edit', '提交请假申请', 2),
('leave:approve', '审批请假', 'button', 'leave', 'approve', '审批请假申请', 3),
('cost:view', '查看报表', 'button', 'cost', 'view', '查看成本统计报表', 1),
('cost:export', '导出报表', 'button', 'cost', 'export', '导出报表数据', 2),
('plant:view', '查看厂区', 'button', 'plant', 'view', '查看厂区信息', 1),
('plant:edit', '编辑厂区', 'button', 'plant', 'edit', '添加、修改厂区', 2),
('department:view', '查看部门', 'button', 'department', 'view', '查看部门信息', 1),
('department:edit', '编辑部门', 'button', 'department', 'edit', '添加、修改部门', 2),
('announcement:view', '查看公告', 'button', 'announcement', 'view', '查看系统公告', 1),
('announcement:edit', '编辑公告', 'button', 'announcement', 'edit', '发布、修改公告', 2),
('config:view', '查看配置', 'button', 'config', 'view', '查看系统配置', 1),
('config:edit', '编辑配置', 'button', 'config', 'edit', '修改系统配置', 2),
('permission:view', '查看权限', 'button', 'config', 'view', '查看权限配置', 3),
('permission:edit', '编辑权限', 'button', 'config', 'edit', '修改权限配置', 4),
('role:view', '查看角色', 'button', 'config', 'view', '查看角色信息', 5),
('role:edit', '编辑角色', 'button', 'config', 'edit', '添加、修改角色', 6)
ON CONFLICT (code) DO NOTHING;

-- 8. 为超级管理员角色分配所有权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 1, p.id, 'all', true
FROM jso_system_permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- 9. 为厂区管理员角色分配基础权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 2, p.id, 'plant', true
FROM jso_system_permissions p
WHERE p.module IN ('schedule', 'workstation', 'roster', 'leave', 'plant', 'department')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 2 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 2, p.id, 'plant', false
FROM jso_system_permissions p
WHERE p.code IN ('announcement:view', 'cost:view')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 2 AND rp.permission_id = p.id
);

-- 10. 为部门管理员角色分配基础权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 3, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.module IN ('schedule', 'workstation', 'roster', 'leave')
AND p.action IN ('view', 'edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 3 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 3, p.id, 'dept', false
FROM jso_system_permissions p
WHERE p.code = 'announcement:view'
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 3 AND rp.permission_id = p.id
);

-- 11. 为普通员工角色分配基础权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 4, p.id, 'self', false
FROM jso_system_permissions p
WHERE p.code IN ('schedule:view', 'roster:view', 'announcement:view', 'cost:view')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 4 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 4, p.id, 'self', true
FROM jso_system_permissions p
WHERE p.code IN ('leave:edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 4 AND rp.permission_id = p.id
);

-- 12. 为IC经理角色分配权限
INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 5, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.module IN ('schedule', 'workstation', 'roster', 'leave', 'cost')
AND p.action IN ('view', 'edit')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 5 AND rp.permission_id = p.id
);

INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
SELECT 5, p.id, 'dept', true
FROM jso_system_permissions p
WHERE p.code IN ('announcement:view', 'cost:export')
AND NOT EXISTS (
    SELECT 1 FROM jso_system_role_permissions rp
    WHERE rp.role_id = 5 AND rp.permission_id = p.id
);
