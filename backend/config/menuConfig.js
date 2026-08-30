/**
 * 前端侧边栏菜单配置
 * 此文件与前端 DashboardView.vue 中的 sidebarMenuItems 保持同步
 * 后端服务启动时会自动将此配置同步到数据库 jso_system_modules 表
 */

const menuConfig = {
  // 主菜单分组
  groups: [
    { code: 'business-center', name: '业务中心', icon: '📋', sortOrder: 1 },
    { code: 'data-center', name: '数据中心', icon: '📊', sortOrder: 2 },
    { code: 'hr-center', name: '人事中心', icon: '👥', sortOrder: 3 },
    { code: 'convenient-print', name: '便捷打印', icon: '🖨️', sortOrder: 4 },
    { code: 'org-management', name: '组织管理', icon: '🏢', sortOrder: 5 },
    { code: 'warehouse-management', name: '仓储管理', icon: '📦', sortOrder: 6 },
    { code: 'system-management', name: '系统管理', icon: '⚙️', sortOrder: 7 },
    { code: 'rules-config', name: '规则配置', icon: '⚙️', sortOrder: 8 },
    { code: 'other', name: '其他', icon: '📌', sortOrder: 9 },
  ],
  // 菜单项
  items: [
    // 业务中心
    { code: 'dashboard', name: '仪表盘', icon: '📊', routeName: 'dashboard', group: null, sortOrder: 0 },
    { code: 'employee-schedule', name: '员工排班', icon: '📅', routeName: 'employee-schedule', group: 'business-center', sortOrder: 1 },
    { code: 'station-arrangement', name: '工位安排', icon: '🏭', routeName: 'station-arrangement', group: 'business-center', sortOrder: 2 },
    { code: 'k045', name: 'K045 单据管理', icon: '📦', routeName: 'k045', group: 'business-center', sortOrder: 3 },
    { code: 'da-material', name: '管控物料 单据管理', icon: '📋', routeName: 'da-material', group: 'business-center', sortOrder: 4 },
    { code: 'warehouse-return', name: '回仓申请', icon: '📥', routeName: 'warehouse-return', group: 'business-center', sortOrder: 5 },

    // 数据中心
    { code: 'kpi-indicators', name: '关键KPI', icon: '📉', routeName: 'kpi-indicators', group: 'data-center', sortOrder: 1 },
    { code: 'cost-summary', name: 'Cost汇总', icon: '💰', routeName: 'cost-summary', group: 'data-center', sortOrder: 2 },
    { code: 'production-tracking', name: '生产追踪', icon: '📊', routeName: 'production-tracking', group: 'data-center', sortOrder: 3 },
    { code: 'bonus-evaluation', name: '奖金评估', icon: '🎯', routeName: 'bonus-evaluation', group: 'data-center', sortOrder: 4 },

    // 人事中心
    { code: 'employee-roster', name: '员工花名册', icon: '👥', routeName: 'employee-roster', group: 'hr-center', sortOrder: 1 },
    { code: 'leave-management', name: '请假公差', icon: '📝', routeName: 'leave-management', group: 'hr-center', sortOrder: 2 },

    // 便捷打印
    { code: 'convenient-print', name: 'PNC转仓打印', icon: '📋', routeName: 'convenient-print', group: 'convenient-print', sortOrder: 1 },

    // 组织管理
    { code: 'organizational-structure', name: '组织结构', icon: '🏢', routeName: 'organizational-structure', group: 'org-management', sortOrder: 1 },
    { code: 'plant-management', name: '厂区管理', icon: '🏭', routeName: 'plant-management', group: 'org-management', sortOrder: 2 },
    { code: 'department-management', name: '部门管理', icon: '🏢', routeName: 'department-management', group: 'org-management', sortOrder: 3 },

    // 仓储管理
    { code: 'bin-volume-management', name: 'Bin容量', icon: '📦', routeName: 'bin-volume-management', group: 'warehouse-management', sortOrder: 1 },
    { code: 'expired-material-extension', name: '过期料延期', icon: '⏰', routeName: 'expired-material-extension', group: 'warehouse-management', sortOrder: 2 },
    { code: '6s-management', name: '6S管理', icon: '✨', routeName: '6s-management', group: 'warehouse-management', sortOrder: 3 },
    { code: 'k2-diff-registration', name: 'K**差异登记', icon: '📝', routeName: 'k2-diff-registration', group: 'warehouse-management', sortOrder: 4 },
    { code: 'material-package', name: '物料包装信息', icon: '📦', routeName: 'material-package', group: 'warehouse-management', sortOrder: 5 },

    // 系统管理
    { code: 'announcement-management', name: '系统公告', icon: '📢', routeName: 'announcement-management', group: 'system-management', sortOrder: 1 },
    { code: 'user-management', name: '用户管理', icon: '👤', routeName: 'user-management', group: 'system-management', sortOrder: 2 },
    { code: 'role-management', name: '角色管理', icon: '🎭', routeName: 'role-management', group: 'system-management', sortOrder: 3 },
    { code: 'permission-management', name: '权限管理', icon: '🔐', routeName: 'permission-management', group: 'system-management', sortOrder: 4 },

    // 规则配置
    { code: 'dept-calc-rules-config', name: '部门计算规则', icon: '📐', routeName: 'dept-calc-rules-config', group: 'rules-config', sortOrder: 1 },
    { code: 'shift-duration-rules-config', name: '班次时长规则', icon: '⏰', routeName: 'shift-duration-rules-config', group: 'rules-config', sortOrder: 2 },
    { code: 'smart-schedule-rules-config', name: '智能排班规则', icon: '📋', routeName: 'smart-schedule-rules-config', group: 'rules-config', sortOrder: 3 },
    { code: 'material-config', name: '物料模块 规则配置', icon: '📦', routeName: 'material-config', group: 'rules-config', sortOrder: 4 },
    { code: 'pnc-transfer-config', name: 'PNC转仓打印配置', icon: '📄', routeName: 'pnc-transfer-config', group: 'rules-config', sortOrder: 5 },
    { code: 'k2-diff-config', name: 'K**差异登记 规则配置', icon: '📝', routeName: 'k2-diff-config', group: 'rules-config', sortOrder: 6 },
    { code: 'workstation-config', name: '工位配置', icon: '🏭', routeName: 'workstation-config', group: 'rules-config', sortOrder: 7 },
    { code: 'employee-hourly-rate-config', name: '员工时薪配置', icon: '💵', routeName: 'employee-hourly-rate-config', group: 'rules-config', sortOrder: 8 },
    { code: 'welfare-base-config', name: '福利基础配置', icon: '🎁', routeName: 'welfare-base-config', group: 'rules-config', sortOrder: 9 },

    // 其他
    { code: 'version-info', name: '版本信息', icon: '📋', routeName: 'version-info', group: 'other', sortOrder: 1 },
    { code: 'api-docs', name: '接口文档', icon: '📡', routeName: 'api-docs', group: 'other', sortOrder: 2 },
  ]
};

module.exports = menuConfig;
