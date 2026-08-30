import { Pool } from 'pg';
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function migrate() {
  try {
    // Clear
    await pool.query('BEGIN');
    await pool.query('DELETE FROM jso_system_role_permissions');
    await pool.query('DELETE FROM jso_system_permissions');
    await pool.query('COMMIT');
    console.log('Cleared existing data');

    // Batch 1: Employee schedule, station, k045, da-material
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
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
('da-material:approve', '审批管控物料单据', 'button', 'da-material', 'approve', '审批管控物料单据', 3)`);
    console.log('Batch 1 done (11 records)');

    // Batch 2: KPI, Cost, Production, Bonus
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('kpi-indicators:view', '查看关键KPI', 'button', 'kpi-indicators', 'view', '查看关键KPI指标', 1),
('kpi-indicators:export', '导出关键KPI', 'button', 'kpi-indicators', 'export', '导出关键KPI数据', 2),
('cost-summary:view', '查看Cost汇总', 'button', 'cost-summary', 'view', '查看Cost汇总报表', 1),
('cost-summary:export', '导出Cost汇总', 'button', 'cost-summary', 'export', '导出Cost汇总数据', 2),
('production-tracking:view', '查看生产追踪', 'button', 'production-tracking', 'view', '查看生产追踪信息', 1),
('production-tracking:export', '导出生产追踪', 'button', 'production-tracking', 'export', '导出生产追踪数据', 2),
('bonus-evaluation:view', '查看奖金评估', 'button', 'bonus-evaluation', 'view', '查看奖金评估', 1),
('bonus-evaluation:edit', '编辑奖金评估', 'button', 'bonus-evaluation', 'edit', '编辑奖金评估', 2),
('bonus-evaluation:export', '导出奖金评估', 'button', 'bonus-evaluation', 'export', '导出奖金评估数据', 3)`);
    console.log('Batch 2 done (9 records)');

    // Batch 3: Employee roster, Leave, Print
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('employee-roster:view', '查看员工花名册', 'button', 'employee-roster', 'view', '查看员工花名册', 1),
('employee-roster:edit', '编辑员工花名册', 'button', 'employee-roster', 'edit', '编辑员工花名册', 2),
('employee-roster:export', '导出员工花名册', 'button', 'employee-roster', 'export', '导出员工花名册数据', 3),
('leave-management:view', '查看请假公差', 'button', 'leave-management', 'view', '查看请假公差记录', 1),
('leave-management:edit', '编辑请假公差', 'button', 'leave-management', 'edit', '提交请假公差申请', 2),
('leave-management:approve', '审批请假公差', 'button', 'leave-management', 'approve', '审批请假公差申请', 3),
('convenient-print:view', '查看PNC转仓打印', 'button', 'convenient-print', 'view', '查看PNC转仓打印', 1),
('convenient-print:edit', '使用PNC转仓打印', 'button', 'convenient-print', 'edit', '使用PNC转仓打印功能', 2),
('convenient-print:export', '导出打印数据', 'button', 'convenient-print', 'export', '导出打印数据', 3)`);
    console.log('Batch 3 done (9 records)');

    // Batch 4: Organization, Plant, Department
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('organizational-structure:view', '查看组织结构', 'button', 'organizational-structure', 'view', '查看组织结构', 1),
('organizational-structure:edit', '编辑组织结构', 'button', 'organizational-structure', 'edit', '编辑组织结构', 2),
('plant-management:view', '查看厂区管理', 'button', 'plant-management', 'view', '查看厂区信息', 1),
('plant-management:edit', '编辑厂区管理', 'button', 'plant-management', 'edit', '编辑厂区信息', 2),
('department-management:view', '查看部门管理', 'button', 'department-management', 'view', '查看部门信息', 1),
('department-management:edit', '编辑部门管理', 'button', 'department-management', 'edit', '编辑部门信息', 2)`);
    console.log('Batch 4 done (6 records)');

    // Batch 5: Warehouse management
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('bin-volume-management:view', '查看Bin容量', 'button', 'bin-volume-management', 'view', '查看Bin容量', 1),
('bin-volume-management:edit', '编辑Bin容量', 'button', 'bin-volume-management', 'edit', '编辑Bin容量', 2),
('expired-material-extension:view', '查看过期料延期', 'button', 'expired-material-extension', 'view', '查看过期料延期', 1),
('expired-material-extension:edit', '编辑过期料延期', 'button', 'expired-material-extension', 'edit', '编辑过期料延期', 2),
('six-s-management:view', '查看6S管理', 'button', 'six-s-management', 'view', '查看6S管理', 1),
('six-s-management:edit', '编辑6S管理', 'button', 'six-s-management', 'edit', '编辑6S管理', 2),
('k2-diff-registration:view', '查看K2差异登记', 'button', 'k2-diff-registration', 'view', '查看K2差异登记', 1),
('k2-diff-registration:edit', '编辑K2差异登记', 'button', 'k2-diff-registration', 'edit', '编辑K2差异登记', 2)`);
    console.log('Batch 5 done (8 records)');

    // Batch 6: System management
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('announcement-management:view', '查看系统公告', 'button', 'announcement-management', 'view', '查看系统公告', 1),
('announcement-management:edit', '编辑系统公告', 'button', 'announcement-management', 'edit', '发布修改系统公告', 2),
('user-management:view', '查看用户管理', 'button', 'user-management', 'view', '查看用户信息', 1),
('user-management:edit', '编辑用户管理', 'button', 'user-management', 'edit', '编辑用户信息', 2),
('role-management:view', '查看角色管理', 'button', 'role-management', 'view', '查看角色信息', 1),
('role-management:edit', '编辑角色管理', 'button', 'role-management', 'edit', '编辑角色信息', 2),
('permission-management:view', '查看权限管理', 'button', 'permission-management', 'view', '查看权限配置', 1),
('permission-management:edit', '编辑权限管理', 'button', 'permission-management', 'edit', '编辑权限配置', 2)`);
    console.log('Batch 6 done (8 records)');

    // Batch 7: Config permissions
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
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
('pnc-transfer-config:edit', '编辑PNC转仓打印配置', 'button', 'pnc-transfer-config', 'edit', '编辑PNC转仓打印配置', 2)`);
    console.log('Batch 7 done (12 records)');

    // Batch 8: More config
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('k2-diff-config:view', '查看K2差异规则配置', 'button', 'k2-diff-config', 'view', '查看K2差异规则配置', 1),
('k2-diff-config:edit', '编辑K2差异规则配置', 'button', 'k2-diff-config', 'edit', '编辑K2差异规则配置', 2),
('workstation-config:view', '查看工位配置', 'button', 'workstation-config', 'view', '查看工位配置', 1),
('workstation-config:edit', '编辑工位配置', 'button', 'workstation-config', 'edit', '编辑工位配置', 2),
('employee-hourly-rate-config:view', '查看员工时薪配置', 'button', 'employee-hourly-rate-config', 'view', '查看员工时薪配置', 1),
('employee-hourly-rate-config:edit', '编辑员工时薪配置', 'button', 'employee-hourly-rate-config', 'edit', '编辑员工时薪配置', 2),
('welfare-base-config:view', '查看福利基础配置', 'button', 'welfare-base-config', 'view', '查看福利基础配置', 1),
('welfare-base-config:edit', '编辑福利基础配置', 'button', 'welfare-base-config', 'edit', '编辑福利基础配置', 2),
('version-info:view', '查看版本信息', 'button', 'version-info', 'view', '查看版本信息', 1),
('api-docs:view', '查看接口文档', 'button', 'api-docs', 'view', '查看接口文档', 1)`);
    console.log('Batch 8 done (10 records)');

    // Assign role permissions
    console.log('\nAssigning role permissions...');

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 1,p.id,'all',true FROM jso_system_permissions p`);
    console.log('Role 1 (Super Admin): All permissions assigned');

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 2,p.id,'plant',true FROM jso_system_permissions p WHERE p.module IN('employee-schedule','station-arrangement','k045','da-material','organizational-structure','plant-management','department-management','bin-volume-management','expired-material-extension','six-s-management','k2-diff-registration','announcement-management')`);

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 2,p.id,'plant',false FROM jso_system_permissions p WHERE p.module IN('kpi-indicators','cost-summary','production-tracking','bonus-evaluation','employee-roster','leave-management','convenient-print')`);
    console.log('Role 2 (Plant Admin): Assigned');

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 3,p.id,'dept',true FROM jso_system_permissions p WHERE p.module IN('employee-schedule','station-arrangement','k045','da-material','employee-roster','leave-management')AND p.action IN('view','edit')`);

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 3,p.id,'dept',false FROM jso_system_permissions p WHERE p.module IN('kpi-indicators','cost-summary','bonus-evaluation','convenient-print','announcement-management')`);
    console.log('Role 3 (Dept Admin): Assigned');

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 4,p.id,'self',false FROM jso_system_permissions p WHERE p.code IN('employee-schedule:view','employee-roster:view','announcement-management:view','cost-summary:view','convenient-print:view')`);

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 4,p.id,'self',true FROM jso_system_permissions p WHERE p.code IN('leave-management:edit')`);
    console.log('Role 4 (Employee): Assigned');

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 5,p.id,'dept',true FROM jso_system_permissions p WHERE p.module IN('employee-schedule','station-arrangement','k045','da-material','employee-roster','leave-management','kpi-indicators','cost-summary','bonus-evaluation')AND p.action IN('view','edit')`);

    await pool.query(`INSERT INTO jso_system_role_permissions(role_id,permission_id,data_scope,can_edit)
SELECT 5,p.id,'dept',true FROM jso_system_permissions p WHERE p.code IN('announcement-management:view','convenient-print:view','cost-summary:export')`);
    console.log('Role 5 (IC Manager): Assigned');

    // Verify
    const count = await pool.query('SELECT COUNT(*) FROM jso_system_permissions');
    const roleCount = await pool.query('SELECT COUNT(*) FROM jso_system_role_permissions');
    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('Total permissions:', count.rows[0].count);
    console.log('Total role-permission mappings:', roleCount.rows[0].count);
    console.log('========================================');

    // Show sample
    const samples = await pool.query('SELECT code, name, module, action FROM jso_system_permissions ORDER BY module, action LIMIT 10');
    console.log('\nSample permissions (first 10):');
    samples.rows.forEach(r => console.log('  ' + r.code + ' | ' + r.name + ' | ' + r.module + ' | ' + r.action));

  } catch (e) {
    console.error('ERROR:', e.message);
    await pool.query('ROLLBACK');
  } finally {
    await pool.end();
  }
}

migrate();
