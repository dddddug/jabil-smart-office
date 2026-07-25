-- [已废弃 - 请使用 014b_delete_plant_id_0_data.sql]
-- 删除所有引用 plant_id = 0 的用户数据
DELETE FROM jso_system_user_management WHERE plant_id = 0;

-- 删除所有引用 plant_id = 0 的部门计算规则数据
DELETE FROM jso_config_dept_calc_rules WHERE plant_id = 0;

-- 删除所有引用 plant_id = 0 的部门数据
DELETE FROM jso_org_department_management WHERE plant_id = 0;

-- 最后，删除 plant_id = 0 的厂区数据
DELETE FROM jso_org_plant_management WHERE id = 0;
