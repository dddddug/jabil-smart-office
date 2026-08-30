-- 创建物料包装信息表
CREATE TABLE IF NOT EXISTS jso_material_package (
  id SERIAL PRIMARY KEY,
  part_no VARCHAR(100) NOT NULL,
  material_group VARCHAR(100),
  manufacturer VARCHAR(200),
  spec VARCHAR(200),
  length DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  thickness DECIMAL(10,2),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- 创建唯一索引：同一物料号只能有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_material_package_part_no ON jso_material_package(part_no);

-- 创建索引用于搜索
CREATE INDEX IF NOT EXISTS idx_material_package_material_group ON jso_material_package(material_group);
CREATE INDEX IF NOT EXISTS idx_material_package_manufacturer ON jso_material_package(manufacturer);

-- 添加注释（PostgreSQL语法）
COMMENT ON TABLE jso_material_package IS '物料包装信息表';
COMMENT ON COLUMN jso_material_package.part_no IS '物料号';
COMMENT ON COLUMN jso_material_package.material_group IS '物料组';
COMMENT ON COLUMN jso_material_package.manufacturer IS '制造商';
COMMENT ON COLUMN jso_material_package.spec IS '规格';
COMMENT ON COLUMN jso_material_package.length IS '长度(cm)';
COMMENT ON COLUMN jso_material_package.width IS '宽度(cm)';
COMMENT ON COLUMN jso_material_package.height IS '高度(cm)';
COMMENT ON COLUMN jso_material_package.thickness IS '厚度(mm)';
COMMENT ON COLUMN jso_material_package.remark IS '备注';
