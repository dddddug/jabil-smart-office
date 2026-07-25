-- =====================================================
-- Jabil Smart Office 测试数据文件
-- =====================================================
-- 注意：此文件用于初始化测试数据
-- 如需重新插入数据，请取消相应 INSERT 语句的注释
-- =====================================================

-- 员工实际工时数据 (示例数据，如有需要请取消注释)
-- INSERT INTO jso_actual_work_hours (employee_id, work_date, hours) VALUES
-- (3, '2026-01-01', 8.0), (3, '2026-01-02', 8.0), ...
-- ON CONFLICT (employee_id, work_date) DO UPDATE SET hours = EXCLUDED.hours;

-- 员工时薪配置 (如有需要请取消注释并修改)
-- INSERT INTO jso_config_employee_hourly_rates (level, standard_rate, start_time) VALUES
-- ('Your Level', 0.00, '2026-01-01')
-- ON CONFLICT (level, start_time) DO NOTHING;

-- 福利基准配置 (如有需要请取消注释并修改)
-- INSERT INTO jso_config_welfare_base_rates (base_amount, effective_date) VALUES
-- (0.00, '2026-01-01')
-- ON CONFLICT (effective_date) DO NOTHING;

-- 部门计算规则配置 (示例，已注释)
-- INSERT INTO jso_config_dept_calc_rules (department_id, plant_id, business_month, estimated_cost, status, exchange_rate) VALUES
-- (50, 1, '2026-01', 0.00, 'active', 7.14)
-- ON CONFLICT (department_id, plant_id, business_month) DO NOTHING;
