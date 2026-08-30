/**
 * 为所有表添加中文注释
 */

import pg from 'pg';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

// 所有表的注释映射
const comments = {
  // 系统表
  'jso_system_user_management': '系统用户管理表',
  'jso_system_role_management': '系统角色管理表',
  'jso_system_permissions': '系统权限表',
  'jso_system_role_permissions': '角色权限关联表',
  'jso_system_user_permissions': '用户权限关联表',
  'jso_system_modules': '系统模块表',
  'jso_system_migrations': '数据库迁移记录表',
  'jso_system_announcements': '系统公告表',
  'jso_system_notification': '系统通知表',
  'jso_jwt_blacklist': 'JWT令牌黑名单表',
  'operation_logs': '操作日志表',
  'jso_system_permission_logs': '权限变更日志表',

  // 组织架构
  'jso_org_plant_management': '厂区管理表',
  'jso_org_department_management': '部门管理表',
  'jso_position_reason_config': '职位原因配置表',

  // HR员工相关
  'jso_hr_employee_roster': '员工花名册表',
  'jso_hr_employee_schedule': '员工排班表',
  'jso_hr_workstation_arrangement': '工位安排表',
  'jso_hr_formal_leave': '正式请假表',
  'jso_hr_temporary_leave': '临时请假表',
  'jso_hr_temporary_overtime': '临时加班表',
  'jso_hr_special_working_hours': '特殊工时表',
  'jso_hr_resignation_transfer': '离职转岗表',
  'jso_hr_work_hours': '工时记录表',
  'jso_hr_monthly_attendance_summary': '月度考勤汇总表',
  'jso_hr_break7_records': '7连休记录表',
  'jso_hr_weekly_hour_limit_records': '周工时限制记录表',

  // 配置表
  'jso_config_dept_calc_rules': '部门计算规则配置表',
  'jso_config_shift_duration_rules': '班次时长规则配置表',
  'jso_config_welfare': '福利配置表',
  'jso_config_welfare_base_rates': '福利基础费率配置表',
  'jso_config_employee_hourly_rates': '员工时薪配置表',
  'jso_config_workstation': '工位配置表',

  // SAP数据表
  'jso_sap_pull_log_partitioned': 'SAP拉取日志表（按月分区）',
  'jso_sap_grn_history_partitioned': 'SAP收货历史表（按月分区）',
  'jso_sap_item_pull_history': 'SAP物料拉取历史表',
  'jso_sap_grn_pull_history': 'SAP收货拉取历史表',
  'jso_sap_pull_history': 'SAP数据拉取历史表',

  // 预计算表
  'jso_pulllist_item_count_partitioned': '拉取单物料计数预计算表（按月分区）',

  // Stockroom紧急拉取
  'jso_stockroom_urgent_pull_data': 'Stockroom紧急拉取数据表',
  'jso_stockroom_urgent_pull_data_partitioned': 'Stockroom紧急拉取数据表（按月分区）',
  'jso_stockroom_urgent_pull_data_archive': 'Stockroom紧急拉取数据归档表',
  'jso_stockroom_urgent_pull_config': 'Stockroom配置表',

  // K045单据
  'jso_k045_document': 'K045单据表',
  'jso_k045_notification_config': 'K045通知配置表',

  // K2差异
  'jso_k2_diff_registration': 'K2差异登记表',
  'jso_k2_diff_config': 'K2差异配置表',

  // DA管控物料
  'jso_da_material_document': 'DA管控物料单据表',
  'jso_da_material_notification_config': 'DA物料通知配置表',
  'jso_material_extension': '物料延期表',
  'jso_material_extension_pull_log': '物料延期拉取日志表',
  'jso_material_package': '物料包装信息表',

  // PNC转仓
  'jso_pnc_transfer_config': 'PNC转仓配置表',
  'jso_pnc_transfer_document': 'PNC转仓单据表',
  'jso_pnc_transfer_document_item': 'PNC转仓单据明细表',
  'jso_pnc_transfer_print_log': 'PNC转仓打印日志表',

  // 成本
  'jso_cost_summary': '成本汇总表',
  'jso_cost_summary_data': '成本汇总数据表',

  // 公告
  'jso_announcement_read_records': '公告阅读记录表',

  // 任务日志
  'jso_task_log': '任务执行日志表',

  // 其他
  'Customer Email Config': '客户邮箱配置表',
  'cost_summary': '成本汇总表（旧版）',
  'Pull List': '拉取清单表',
  'Pull List Alerts Log': '拉取清单预警日志表',
  'Pull List Legacy': '拉取清单历史表',
  'Pull List Sign History': '拉取清单签收历史表',
  'Pull List Sync': '拉取清单同步表',
  'GRN++': 'GRN增强表',
  'WHGRN++': '仓库GRN增强表'
};

async function addComments() {
  console.log('开始为所有表添加注释...');
  console.log('总计:', Object.keys(comments).length, '个表\n');

  let success = 0;
  let failed = 0;

  for (const [table, comment] of Object.entries(comments)) {
    try {
      const escapedComment = comment.replace(/'/g, "''");
      await pool.query(`COMMENT ON TABLE "${table}" IS '${escapedComment}'`);
      console.log('✓', table);
      success++;
    } catch (e) {
      console.log('✗', table, ':', e.message.split('\n')[0]);
      failed++;
    }
  }

  console.log('\n========== 完成 ==========');
  console.log('成功:', success);
  console.log('失败:', failed);

  await pool.end();
}

addComments().catch(console.error);
