-- 仓库监控性能优化 - 添加缺失索引
-- 执行时间：应该在业务低峰期执行

-- 1. jso_material_shelf_life 表：添加 (material, plant) 复合索引
-- 这是 expiry-alerts 接口中最常用的 JOIN 条件
CREATE INDEX IF NOT EXISTS idx_shelf_life_material_plant
ON jso_material_shelf_life(material, plant);

-- 2. jso_material_extension 表：添加 grn 索引（用于 LEFT JOIN）
CREATE INDEX IF NOT EXISTS idx_material_extension_grn
ON jso_material_extension(grn);

-- 3. jso_sap_grn_history_partitioned 表：添加 (creation_date, plant, is_processed) 复合索引
-- 这是过期预警查询的核心筛选条件
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_date_plant_processed
ON jso_sap_grn_history_partitioned(creation_date, plant, is_processed);

-- 4. jso_sap_grn_history_partitioned 表：添加 (creation_date, trans) 复合索引
-- 用于按日期和类型筛选
CREATE INDEX IF NOT EXISTS idx_grn_partitioned_date_trans
ON jso_sap_grn_history_partitioned(creation_date, trans);

-- 5. jso_sap_pull_log_partitioned 表：添加 (to_number, rf_ind, date_created DESC) 复合索引
-- 用于 LATERAL JOIN 获取最新的 type, storage_bin, user_name
CREATE INDEX IF NOT EXISTS idx_pull_partitioned_to_number_rf
ON jso_sap_pull_log_partitioned(to_number, rf_ind, date_created DESC)
WHERE rf_ind IS NOT NULL AND rf_ind != '';

-- 6. jso_class33_materials 表：确保 part_no 有索引
CREATE INDEX IF NOT EXISTS idx_class33_part_no
ON jso_class33_materials(part_no);

-- 7. jso_da_material_document 表：添加 (document_no, control_type) 复合索引
-- 用于过期物料清单查询
CREATE INDEX IF NOT EXISTS idx_da_material_doc_no_control
ON jso_da_material_document(document_no, control_type);

-- 验证索引是否创建成功
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE tablename IN (
--   'jso_material_shelf_life',
--   'jso_material_extension',
--   'jso_sap_grn_history_partitioned',
--   'jso_sap_pull_log_partitioned',
--   'jso_class33_materials',
--   'jso_da_material_document'
-- );

-- 验证查询计划（查看是否使用分区裁剪和索引）
-- EXPLAIN ANALYZE
-- SELECT COUNT(*) FROM jso_sap_grn_history_partitioned h
-- LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
-- WHERE h.creation_date = '2026-09-01'
-- AND h.is_processed IS NULL;
