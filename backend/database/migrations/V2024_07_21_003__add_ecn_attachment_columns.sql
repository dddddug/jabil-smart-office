-- DA物料单据表 - 添加ECN附件字段
-- 创建时间: 2024-07-21
-- 描述: 添加ECN附件字段，用于上传ECN相关的表格或PDF文件

-- 添加ECN附件URL和文件名
ALTER TABLE jso_da_material_document
ADD COLUMN IF NOT EXISTS ecn_attachment_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS ecn_attachment_name VARCHAR(255);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_da_material_document_ecn_attachment
ON jso_da_material_document(ecn_attachment_url);
