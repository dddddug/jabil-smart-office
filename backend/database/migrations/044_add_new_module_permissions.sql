-- 添加收发差异登记等新模块的权限
INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
-- 仓储管理新模块权限
('warehouse-monitor:view', '查看物料进出效期监控', 'button', 'warehouse-monitor', 'view', '查看物料进出效期监控', 1),
('warehouse-monitor:edit', '编辑物料进出效期监控', 'button', 'warehouse-monitor', 'edit', '编辑物料进出效期监控', 2),
('material-package:view', '查看物料包装信息', 'button', 'material-package', 'view', '查看物料包装信息', 1),
('material-package:edit', '编辑物料包装信息', 'button', 'material-package', 'edit', '编辑物料包装信息', 2),
('missing-material-package:view', '查看待填充料号', 'button', 'missing-material-package', 'view', '查看待填充料号', 1),
('missing-material-package:edit', '编辑待填充料号', 'button', 'missing-material-package', 'edit', '编辑待填充料号', 2),
('warehouse-diff-registration:view', '查看收发差异登记', 'button', 'warehouse-diff-registration', 'view', '查看收发差异登记', 1),
('warehouse-diff-registration:edit', '编辑收发差异登记', 'button', 'warehouse-diff-registration', 'edit', '编辑收发差异登记', 2),
('warehouse-return:view', '查看回仓申请', 'button', 'warehouse-return', 'view', '查看回仓申请', 1),
('warehouse-return:edit', '编辑回仓申请', 'button', 'warehouse-return', 'edit', '编辑回仓申请', 2),
-- 数据中心新模块权限
('stockroom-urgent-pull:view', '查看Stockroom Urgent Pull', 'button', 'stockroom-urgent-pull', 'view', '查看Stockroom Urgent Pull', 1),
('stockroom-urgent-pull:edit', '编辑Stockroom Urgent Pull', 'button', 'stockroom-urgent-pull', 'edit', '编辑Stockroom Urgent Pull', 2),
-- 规则配置新模块权限
('stockroom-urgent-pull-config:view', '查看Stockroom Urgent Pull配置', 'button', 'stockroom-urgent-pull-config', 'view', '查看Stockroom Urgent Pull配置', 1),
('stockroom-urgent-pull-config:edit', '编辑Stockroom Urgent Pull配置', 'button', 'stockroom-urgent-pull-config', 'edit', '编辑Stockroom Urgent Pull配置', 2)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;
