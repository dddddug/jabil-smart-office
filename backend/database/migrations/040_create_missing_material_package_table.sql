-- 创建待填充物料表：存储 GRN 表中去重后的 material + manufacturer 数据
CREATE TABLE IF NOT EXISTS jso_missing_material_package (
  id SERIAL PRIMARY KEY,
  material VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建唯一索引：同一 material + manufacturer 组合只能有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_material_package_unique
ON jso_missing_material_package(material, COALESCE(manufacturer, ''));

-- 创建索引用于搜索
CREATE INDEX IF NOT EXISTS idx_missing_material_package_material
ON jso_missing_material_package(material);
CREATE INDEX IF NOT EXISTS idx_missing_material_package_manufacturer
ON jso_missing_material_package(manufacturer);

-- 添加注释
COMMENT ON TABLE jso_missing_material_package IS '待填充物料表 - GRN表中去重的物料信息';
COMMENT ON COLUMN jso_missing_material_package.material IS '物料号';
COMMENT ON COLUMN jso_missing_material_package.manufacturer IS '制造商';
