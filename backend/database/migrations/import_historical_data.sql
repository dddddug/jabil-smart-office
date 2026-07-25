-- ================================================
-- 临时加班历史数据导入模板
-- ================================================

-- 模板说明：
-- 1. employee_id: 必须是 jso_system_user_management 表中存在的员工ID
-- 2. plant_id: 必须是 jso_org_plant_management 表中存在的厂区ID (0=公司总部, 1=广州厂区, 2=上海厂区, 3=深圳厂区)
-- 3. department_id: 必须是 jso_org_department_management 表中存在的部门ID
-- 4. status: 'pending'(待提交) 或 'approved'(已提交)
-- 5. overtime_type: 如 '临时加班'、'周末加班'、'节假日加班' 等

-- 示例格式（复制并修改下面的内容）：
/*
INSERT INTO jso_hr_temporary_overtime 
  (employee_id, plant_id, department_id, overtime_type, overtime_date, start_time, end_time, hours, reason, proof_file, status, applicant_id, created_at)
VALUES
  (2, 1, 1, '临时加班', '2024-06-20', '18:00:00', '20:30:00', 2.5, '项目赶工需要', NULL, 'approved', 2, '2024-06-19 16:00:00'),
  (3, 1, 1, '临时加班', '2024-06-22', '19:00:00', '21:00:00', 2.0, '系统上线测试', NULL, 'pending', 3, '2024-06-21 17:00:00');
*/

-- ================================================
-- 临时请假&公差历史数据导入模板
-- ================================================

-- 模板说明：
-- 1. employee_id: 必须是 jso_system_user_management 表中存在的员工ID
-- 2. plant_id: 必须是 jso_org_plant_management 表中存在的厂区ID
-- 3. department_id: 必须是 jso_org_department_management 表中存在的部门ID
-- 4. leave_type: '临时请假' 或 '公差'
-- 5. status: 'pending'(待提交) 或 'approved'(已提交)
-- 6. 注意：公差超过2小时需要提供 proof_file

-- 示例格式（复制并修改下面的内容）：
/*
INSERT INTO jso_hr_temporary_leave 
  (employee_id, plant_id, department_id, leave_type, start_date, end_date, hours, reason, proof_file, status, applicant_id, created_at)
VALUES
  (3, 1, 1, '临时请假', '2024-06-25', '2024-06-25', 4.0, '家里有事需要处理', NULL, 'pending', 3, '2024-06-24 10:00:00'),
  (2, 1, 1, '公差', '2024-06-28', '2024-06-28', 8.0, '出差到深圳厂区', NULL, 'approved', 2, '2024-06-27 09:00:00');
*/

-- ================================================
-- 请假&年假历史数据导入模板
-- ================================================

-- 模板说明：
-- 1. employee_id: 必须是 jso_system_user_management 表中存在的员工ID
-- 2. plant_id: 必须是 jso_org_plant_management 表中存在的厂区ID
-- 3. department_id: 必须是 jso_org_department_management 表中存在的部门ID
-- 4. leave_type: '年假'、'事假'、'病假'、'婚假'、'产假' 等
-- 5. status: 'pending'(待审批)、'approved'(已批准)、'rejected'(已拒绝)
-- 6. days: 天数（可选，可根据起止日期计算）
-- 7. approver_id: 审批人ID（status为approved/rejected时需要）
-- 8. transfer_to_id: 转审人ID（可选）

-- 示例格式（复制并修改下面的内容）：
/*
INSERT INTO jso_hr_formal_leave 
  (employee_id, plant_id, department_id, leave_type, start_date, end_date, days, hours, reason, proof_file, status, applicant_id, approver_id, approval_comment, created_at)
VALUES
  (4, 1, 1, '年假', '2024-07-01', '2024-07-03', 3, 24.0, '回家探亲', NULL, 'pending', 4, NULL, NULL, '2024-06-30 10:00:00'),
  (3, 1, 1, '病假', '2024-06-15', '2024-06-15', 1, 8.0, '感冒发烧', NULL, 'approved', 3, 1, '批准病假', '2024-06-14 09:00:00');
*/

-- ================================================
-- 数据导入注意事项
-- ================================================

/*
1. 请先确认以下表中已存在相应的数据：
   - jso_system_user_management (用户表)
   - jso_org_plant_management (厂区表)
   - jso_org_department_management (部门表)

2. 日期格式：
   - DATE 类型: 'YYYY-MM-DD' (如 '2024-06-30')
   - TIME 类型: 'HH:MM:SS' (如 '18:00:00')
   - TIMESTAMP 类型: 'YYYY-MM-DD HH:MM:SS' (如 '2024-06-30 10:00:00')

3. 时长计算：
   - hours 字段使用 DECIMAL(5,2)，支持小数（如 2.5 表示2.5小时）
   - 可通过 end_time - start_time 计算，也可直接填写

4. 外键约束：
   - 所有引用的 ID 必须在对应表中存在
   - 如果要导入大量历史数据，建议先禁用外键约束，导入完成后再启用

5. 状态设置：
   - 导入历史数据时，status 建议设置为 'approved'（已提交/已批准）
   - 如果是正在进行中的申请，设置为 'pending'

6. 时区问题：
   - created_at 和 updated_at 使用的是数据库服务器的时区
   - 如果数据来自不同时区，请注意转换
*/
