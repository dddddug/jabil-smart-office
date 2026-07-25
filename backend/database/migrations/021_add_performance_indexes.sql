-- 性能优化索引迁移
-- 创建日期: 2026-07-17
-- 描述: 为常用查询字段添加索引，提升数据库查询性能

-- ============================================
-- 用户表索引
-- ============================================

-- 用户名索引（登录查询）
CREATE INDEX IF NOT EXISTS idx_user_username ON jso_system_user_management(username);

-- 厂区索引（按厂区筛选用户）
CREATE INDEX IF NOT EXISTS idx_user_plant ON jso_system_user_management(plant_id);

-- 部门索引（按部门筛选用户）
CREATE INDEX IF NOT EXISTS idx_user_department ON jso_system_user_management(department_id);

-- 状态索引（筛选在职/离职用户）
CREATE INDEX IF NOT EXISTS idx_user_status ON jso_system_user_management(status);

-- 离职日期索引（排除离职员工）
CREATE INDEX IF NOT EXISTS idx_user_leave_date ON jso_system_user_management(leave_date);

-- 角色索引（权限检查）
CREATE INDEX IF NOT EXISTS idx_user_role ON jso_system_user_management(role_id);

-- 复合索引（批量导入/更新时查找现有用户）
CREATE INDEX IF NOT EXISTS idx_user_name_old_id ON jso_system_user_management(real_name, old_employee_id);

-- ============================================
-- 排班表索引
-- ============================================

-- 复合索引（查询某员工某日期的排班）
CREATE INDEX IF NOT EXISTS idx_schedule_employee_date ON jso_hr_employee_schedule(employee_id, schedule_date);

-- 日期索引（按日期查询排班）
CREATE INDEX IF NOT EXISTS idx_schedule_date ON jso_hr_employee_schedule(schedule_date);

-- 班次索引（按班次类型筛选）
CREATE INDEX IF NOT EXISTS idx_schedule_shift ON jso_hr_employee_schedule(shift);

-- ============================================
-- 临时加班表索引
-- ============================================

-- 复合索引（查询某员工某日期的加班）
CREATE INDEX IF NOT EXISTS idx_overtime_employee_date ON jso_hr_temporary_overtime(employee_id, overtime_date);

-- 状态索引（查询待审批加班）
CREATE INDEX IF NOT EXISTS idx_overtime_status ON jso_hr_temporary_overtime(status);

-- ============================================
-- 临时请假表索引
-- ============================================

-- 复合索引（查询某员工某日期的请假）
CREATE INDEX IF NOT EXISTS idx_leave_employee_date ON jso_hr_temporary_leave(employee_id, start_date);

-- 状态索引（查询待审批请假）
CREATE INDEX IF NOT EXISTS idx_leave_status ON jso_hr_temporary_leave(status);

-- ============================================
-- 正式请假表索引
-- ============================================

-- 员工索引
CREATE INDEX IF NOT EXISTS idx_formal_leave_employee ON jso_hr_formal_leave(employee_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_formal_leave_status ON jso_hr_formal_leave(status);

-- ============================================
-- 离职转岗表索引
-- ============================================

-- 员工索引
CREATE INDEX IF NOT EXISTS idx_resignation_employee ON jso_hr_resignation_transfer(employee_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_resignation_status ON jso_hr_resignation_transfer(status);

-- ============================================
-- 特殊工时表索引
-- ============================================

-- 员工和日期复合索引
CREATE INDEX IF NOT EXISTS idx_special_working_hours_employee_date ON jso_hr_special_working_hours(employee_id, working_date);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_special_working_hours_status ON jso_hr_special_working_hours(status);

-- ============================================
-- JWT 黑名单表索引
-- ============================================

-- JTI 索引（快速查找 Token 是否在黑名单）
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_jti ON jso_jwt_blacklist(jti);

-- 过期时间索引（清理过期记录）
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_exp ON jso_jwt_blacklist(exp);

-- ============================================
-- 通知表索引
-- ============================================

-- 用户索引（查询某用户的通知）
CREATE INDEX IF NOT EXISTS idx_notification_user ON jso_system_notification(user_id);

-- 状态索引（查询未读通知）
CREATE INDEX IF NOT EXISTS idx_notification_status ON jso_system_notification(status);

-- ============================================
-- 成本汇总表索引
-- ============================================

-- 复合索引（按年月和厂区/部门查询）
CREATE INDEX IF NOT EXISTS idx_cost_summary_ym_plant_dept ON jso_cost_summary_data(year_month, plant_id, department_id);

-- 员工索引
CREATE INDEX IF NOT EXISTS idx_cost_summary_employee ON jso_cost_summary_data(employee_id);

-- ============================================
-- 部门计算规则表索引
-- ============================================

-- 厂区和部门复合索引
CREATE INDEX IF NOT EXISTS idx_dept_calc_rules_plant_dept ON jso_config_dept_calc_rules(plant_id, department_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_dept_calc_rules_status ON jso_config_dept_calc_rules(status);

-- ============================================
-- 班次时长规则表索引
-- ============================================

-- 厂区和部门复合索引
CREATE INDEX IF NOT EXISTS idx_shift_duration_rules_plant_dept ON jso_config_shift_duration_rules(plant_id, department_id);

-- 状态索引
CREATE INDEX IF NOT EXISTS idx_shift_duration_rules_status ON jso_config_shift_duration_rules(status);

-- ============================================
-- 操作日志表索引
-- ============================================

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(user_id);

-- 操作类型索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);

-- 时间索引（按时间范围查询）
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- 记录迁移完成
INSERT INTO schema_migrations (migration_name, executed_at)
VALUES ('021_add_performance_indexes', NOW())
ON CONFLICT (migration_name) DO NOTHING;
