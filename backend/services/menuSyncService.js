/**
 * 菜单同步服务
 * 功能：将前端菜单配置自动同步到数据库 jso_system_modules 表
 * 在后端启动时自动执行
 */

// 内联菜单配置
const menuConfig = {
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
  items: [
    { code: 'dashboard', name: '仪表盘', icon: '📊', routeName: 'dashboard', group: null, sortOrder: 0 },
    { code: 'employee-schedule', name: '员工排班', icon: '📅', routeName: 'employee-schedule', group: 'business-center', sortOrder: 1 },
    { code: 'station-arrangement', name: '工位安排', icon: '🏭', routeName: 'station-arrangement', group: 'business-center', sortOrder: 2 },
    { code: 'k045', name: 'K045 单据管理', icon: '📦', routeName: 'k045', group: 'business-center', sortOrder: 3 },
    { code: 'da-material', name: '管控物料 单据管理', icon: '📋', routeName: 'da-material', group: 'business-center', sortOrder: 4 },
    { code: 'warehouse-return', name: '回仓申请', icon: '📥', routeName: 'warehouse-return', group: 'business-center', sortOrder: 5 },
    { code: 'kpi-indicators', name: '关键KPI', icon: '📉', routeName: 'kpi-indicators', group: 'data-center', sortOrder: 1 },
    { code: 'cost-summary', name: 'Cost汇总', icon: '💰', routeName: 'cost-summary', group: 'data-center', sortOrder: 2 },
    { code: 'production-tracking', name: '生产追踪', icon: '📊', routeName: 'production-tracking', group: 'data-center', sortOrder: 3 },
    { code: 'bonus-evaluation', name: '奖金评估', icon: '🎯', routeName: 'bonus-evaluation', group: 'data-center', sortOrder: 4 },
    { code: 'employee-roster', name: '员工花名册', icon: '👥', routeName: 'employee-roster', group: 'hr-center', sortOrder: 1 },
    { code: 'leave-management', name: '请假公差', icon: '📝', routeName: 'leave-management', group: 'hr-center', sortOrder: 2 },
    { code: 'convenient-print', name: 'PNC转仓打印', icon: '📋', routeName: 'convenient-print', group: 'convenient-print', sortOrder: 1 },
    { code: 'organizational-structure', name: '组织结构', icon: '🏢', routeName: 'organizational-structure', group: 'org-management', sortOrder: 1 },
    { code: 'plant-management', name: '厂区管理', icon: '🏭', routeName: 'plant-management', group: 'org-management', sortOrder: 2 },
    { code: 'department-management', name: '部门管理', icon: '🏢', routeName: 'department-management', group: 'org-management', sortOrder: 3 },
    { code: 'bin-volume-management', name: 'Bin容量', icon: '📦', routeName: 'bin-volume-management', group: 'warehouse-management', sortOrder: 1 },
    { code: 'expired-material-extension', name: '过期料延期', icon: '⏰', routeName: 'expired-material-extension', group: 'warehouse-management', sortOrder: 2 },
    { code: '6s-management', name: '6S管理', icon: '✨', routeName: '6s-management', group: 'warehouse-management', sortOrder: 3 },
    { code: 'k2-diff-registration', name: 'K**差异登记', icon: '📝', routeName: 'k2-diff-registration', group: 'warehouse-management', sortOrder: 4 },
    { code: 'material-package', name: '物料包装信息', icon: '📦', routeName: 'material-package', group: 'warehouse-management', sortOrder: 5 },
    { code: 'announcement-management', name: '系统公告', icon: '📢', routeName: 'announcement-management', group: 'system-management', sortOrder: 1 },
    { code: 'user-management', name: '用户管理', icon: '👤', routeName: 'user-management', group: 'system-management', sortOrder: 2 },
    { code: 'role-management', name: '角色管理', icon: '🎭', routeName: 'role-management', group: 'system-management', sortOrder: 3 },
    { code: 'permission-management', name: '权限管理', icon: '🔐', routeName: 'permission-management', group: 'system-management', sortOrder: 4 },
    { code: 'dept-calc-rules-config', name: '部门计算规则', icon: '📐', routeName: 'dept-calc-rules-config', group: 'rules-config', sortOrder: 1 },
    { code: 'shift-duration-rules-config', name: '班次时长规则', icon: '⏰', routeName: 'shift-duration-rules-config', group: 'rules-config', sortOrder: 2 },
    { code: 'smart-schedule-rules-config', name: '智能排班规则', icon: '📋', routeName: 'smart-schedule-rules-config', group: 'rules-config', sortOrder: 3 },
    { code: 'material-config', name: '物料模块 规则配置', icon: '📦', routeName: 'material-config', group: 'rules-config', sortOrder: 4 },
    { code: 'pnc-transfer-config', name: 'PNC转仓打印配置', icon: '📄', routeName: 'pnc-transfer-config', group: 'rules-config', sortOrder: 5 },
    { code: 'k2-diff-config', name: 'K**差异登记 规则配置', icon: '📝', routeName: 'k2-diff-config', group: 'rules-config', sortOrder: 6 },
    { code: 'workstation-config', name: '工位配置', icon: '🏭', routeName: 'workstation-config', group: 'rules-config', sortOrder: 7 },
    { code: 'employee-hourly-rate-config', name: '员工时薪配置', icon: '💵', routeName: 'employee-hourly-rate-config', group: 'rules-config', sortOrder: 8 },
    { code: 'welfare-base-config', name: '福利基础配置', icon: '🎁', routeName: 'welfare-base-config', group: 'rules-config', sortOrder: 9 },
    { code: 'version-info', name: '版本信息', icon: '📋', routeName: 'version-info', group: 'other', sortOrder: 1 },
    { code: 'api-docs', name: '接口文档', icon: '📡', routeName: 'api-docs', group: 'other', sortOrder: 2 },
  ]
};

/**
 * 同步菜单到数据库
 * @param {Object} pool - PostgreSQL 连接池
 */
async function syncMenusToDatabase(pool) {
  console.log('开始同步菜单到数据库...');

  const { groups, items } = menuConfig;

  try {
    // 获取数据库中现有的模块
    const existingModules = await pool.query(
      'SELECT code, name, icon, parent_code, sort_order FROM jso_system_modules'
    );

    const existingMap = new Map();
    existingModules.rows.forEach(row => {
      existingMap.set(row.code, row);
    });

    let addedCount = 0;
    let updatedCount = 0;

    // 1. 同步分组（父菜单）
    for (const group of groups) {
      const existing = existingMap.get(group.code);

      if (!existing) {
        await pool.query(
          `INSERT INTO jso_system_modules (code, name, icon, parent_code, sort_order)
           VALUES ($1, $2, $3, NULL, $4)
           ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           sort_order = EXCLUDED.sort_order`,
          [group.code, group.name, group.icon, group.sortOrder]
        );
        addedCount++;
        console.log(`  新增分组: ${group.name} (${group.code})`);
      } else if (existing.name !== group.name || existing.icon !== group.icon ||
                 existing.sort_order !== group.sortOrder) {
        await pool.query(
          `UPDATE jso_system_modules
           SET name = $1, icon = $2, sort_order = $3
           WHERE code = $4`,
          [group.name, group.icon, group.sortOrder, group.code]
        );
        updatedCount++;
        console.log(`  更新分组: ${group.name} (${group.code})`);
      }
    }

    // 2. 同步菜单项
    for (const item of items) {
      const existing = existingMap.get(item.code);
      const parentCode = item.group;

      if (!existing) {
        await pool.query(
          `INSERT INTO jso_system_modules (code, name, icon, route_name, parent_code, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           route_name = EXCLUDED.route_name,
           parent_code = EXCLUDED.parent_code,
           sort_order = EXCLUDED.sort_order`,
          [item.code, item.name, item.icon, item.routeName, parentCode, item.sortOrder]
        );
        addedCount++;
        console.log(`  新增菜单: ${item.name} (${item.code})`);
      } else if (existing.name !== item.name || existing.icon !== item.icon ||
                 existing.route_name !== item.routeName || existing.parent_code !== parentCode ||
                 existing.sort_order !== item.sortOrder) {
        await pool.query(
          `UPDATE jso_system_modules
           SET name = $1, icon = $2, route_name = $3, parent_code = $4, sort_order = $5
           WHERE code = $6`,
          [item.name, item.icon, item.routeName, parentCode, item.sortOrder, item.code]
        );
        updatedCount++;
        console.log(`  更新菜单: ${item.name} (${item.code})`);
      }
    }

    console.log(`菜单同步完成！新增: ${addedCount}, 更新: ${updatedCount}`);
    return { addedCount, updatedCount };

  } catch (error) {
    console.error('菜单同步失败:', error.message);
    throw error;
  }
}

/**
 * 初始化数据库表结构（如果不存在）
 * @param {Object} pool - PostgreSQL 连接池
 */
async function initModulesTable(pool) {
  try {
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'jso_system_modules'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('创建 jso_system_modules 表...');
      await pool.query(`
        CREATE TABLE jso_system_modules (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(50),
          route_name VARCHAR(100),
          parent_code VARCHAR(50),
          sort_order INTEGER DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (parent_code) REFERENCES jso_system_modules(code) ON DELETE SET NULL
        )
      `);
      console.log('jso_system_modules 表创建成功');
    }
  } catch (error) {
    console.error('初始化模块表失败:', error.message);
    throw error;
  }
}

export {
  syncMenusToDatabase,
  initModulesTable
};
