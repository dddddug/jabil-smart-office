-- DA物料单据表 - 添加已发料字段
-- 创建时间: 2024-07-21
-- 描述: 添加 material_issued_at 和 material_issued_by 字段用于记录已发料（已锁BIN）状态

-- 添加已发料时间戳和操作人字段
ALTER TABLE jso_da_material_document
ADD COLUMN IF NOT EXISTS material_issued_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS material_issued_by VARCHAR(100);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_da_material_document_material_issued
ON jso_da_material_document(material_issued_at);
