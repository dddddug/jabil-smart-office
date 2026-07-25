--- =====================================================
--- 工位管理模块：移除 code 和 area 字段
--- =====================================================

-- 移除 code 列（不再需要工位编码）
ALTER TABLE jso_config_workstation DROP COLUMN IF EXISTS code;

-- 移除 area 列（不再需要所属区域）
ALTER TABLE jso_config_workstation DROP COLUMN IF EXISTS area;
