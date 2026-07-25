-- 性能优化索引迁移 V2
-- 创建日期: 2026-07-25
-- 描述: 为成本汇总和排班查询添加额外索引

-- ============================================
-- 排班表增强索引
-- ============================================

-- 排班表复合索引（成本汇总按员工+日期+班次查询）
CREATE INDEX IF NOT EXISTS idx_schedule_employee_date_shift
    ON jso_hr_employee_schedule(employee_id, (schedule_date AT TIME ZONE 'Asia/Shanghai'), shift);

-- 排班表日期表达式索引（支持 AT TIME ZONE 查询）
CREATE INDEX IF NOT EXISTS idx_schedule_date_shanghai
    ON jso_hr_employee_schedule((schedule_date AT TIME ZONE 'Asia/Shanghai'));

-- 排班表状态索引（筛选有效排班）
CREATE INDEX IF NOT EXISTS idx_schedule_is_active
    ON jso_hr_employee_schedule(is_active)
    WHERE is_active = true;

-- ============================================
-- 班次时长规则表索引
-- ============================================

-- 班次时长规则复合索引（排班时快速查找班次时长）
CREATE INDEX IF NOT EXISTS idx_shift_duration_rules_plant_dept_shift
    ON jso_config_shift_duration_rules(plant_id, department_id, shift_name)
    WHERE status = 'active';

-- ============================================
-- 用户表增强索引
-- ============================================

-- 用户表复合索引（成本汇总按在职状态+部门+厂区筛选）
CREATE INDEX IF NOT EXISTS idx_user_status_dept_plant
    ON jso_system_user_management(status, department_id, plant_id)
    WHERE status = 'active';

-- 用户表员工类型索引（筛选3PL员工）
CREATE INDEX IF NOT EXISTS idx_user_employee_type
    ON jso_system_user_management(employee_type)
    WHERE employee_type IS NOT NULL;

-- 用户表员工类型+部门复合索引（成本汇总按员工类型+部门查询）
CREATE INDEX IF NOT EXISTS idx_user_employee_type_dept
    ON jso_system_user_management(employee_type, department_id);

-- ============================================
-- 临时加班表增强索引
-- ============================================

-- 临时加班表复合索引（按员工+日期+状态查询）
CREATE INDEX IF NOT EXISTS idx_overtime_employee_date_status
    ON jso_hr_temporary_overtime(employee_id, overtime_date, status);

-- 临时加班表日期+状态索引（批量审批查询）
CREATE INDEX IF NOT EXISTS idx_overtime_date_status
    ON jso_hr_temporary_overtime(overtime_date, status)
    WHERE status = 'pending';

-- ============================================
-- 临时请假表增强索引
-- ============================================

-- 临时请假表复合索引（按员工+日期+状态查询）
CREATE INDEX IF NOT EXISTS idx_leave_employee_date_status
    ON jso_hr_temporary_leave(employee_id, start_date, status);

-- 临时请假表日期+状态索引（批量审批查询）
CREATE INDEX IF NOT EXISTS idx_leave_date_status
    ON jso_hr_temporary_leave(start_date, status)
    WHERE status = 'pending';

-- ============================================
-- 正式请假表增强索引
-- ============================================

-- 正式请假表复合索引（按员工+日期+状态查询）
CREATE INDEX IF NOT EXISTS idx_formal_leave_employee_date_status
    ON jso_hr_formal_leave(employee_id, start_date, status);

-- 正式请假表审批人索引（查询待审批）
CREATE INDEX IF NOT EXISTS idx_formal_leave_approver_status
    ON jso_hr_formal_leave(approver_id, status)
    WHERE status = 'pending';

-- ============================================
-- 部门计算规则表增强索引
-- ============================================

-- 部门计算规则表财月+状态索引
CREATE INDEX IF NOT EXISTS idx_dept_calc_rules_month_status
    ON jso_config_dept_calc_rules(business_month, status)
    WHERE status = 'active';

-- ============================================
-- 组织架构表索引
-- ============================================

-- 部门表厂区+ID索引（部门到厂区映射）
CREATE INDEX IF NOT EXISTS idx_department_plant
    ON jso_org_department_management(plant_id, id);

-- ============================================
-- 成本汇总数据表增强索引
-- ============================================

-- 成本汇总表年月+状态索引
CREATE INDEX IF NOT EXISTS idx_cost_summary_month_status
    ON jso_cost_summary_data(year_month, status);

-- 成本汇总表年月+部门索引（按财月+部门查询）
CREATE INDEX IF NOT EXISTS idx_cost_summary_month_dept
    ON jso_cost_summary_data(year_month, department_id);

-- ============================================
-- 特殊工时表增强索引
-- ============================================

-- 特殊工时表员工+日期+状态复合索引
CREATE INDEX IF NOT EXISTS idx_special_working_hours_employee_date_status
    ON jso_hr_special_working_hours(employee_id, working_date, status)
    WHERE status = 'approved';

-- ============================================
-- 通知表增强索引
-- ============================================

-- 通知表用户+已读状态索引
CREATE INDEX IF NOT EXISTS idx_notification_user_read
    ON jso_system_notification(user_id, read)
    WHERE read = false;

-- ============================================
-- 记录迁移完成
-- ============================================
INSERT INTO schema_migrations (migration_name, executed_at)
VALUES ('022_add_cost_summary_indexes', NOW())
ON CONFLICT (migration_name) DO NOTHING;
