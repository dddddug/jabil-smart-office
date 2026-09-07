-- 更新 jso_material_shelf_life 表：只保留最新一次拉取的数据
-- 1. 删除旧约束 (plant, material, report_date)
-- 2. 添加新约束 (plant, material)
-- 3. 清理旧数据（保留每个 plant+material 组合的最新一条）

-- 删除旧的唯一约束
ALTER TABLE jso_material_shelf_life DROP CONSTRAINT IF EXISTS jso_material_shelf_life_plant_material_report_date_key;

-- 添加新的唯一约束（只按 plant + material）
ALTER TABLE jso_material_shelf_life ADD CONSTRAINT jso_material_shelf_life_plant_material_key UNIQUE (plant, material);

-- 删除旧数据（保留每个 plant+material 组合的最新一条）
DELETE FROM jso_material_shelf_life a
USING jso_material_shelf_life b
WHERE a.plant = b.plant
  AND a.material = b.material
  AND a.report_date < b.report_date;
