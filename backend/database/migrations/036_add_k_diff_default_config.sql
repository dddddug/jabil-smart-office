-- K差异登记 默认配置数据迁移
-- 创建时间: 2026-07-24
-- 描述: 仅当配置为空时才添加默认差异类型和退料地点配置
-- 注意: 此迁移仅用于初始化空配置，不会覆盖用户已有数据

-- 仅当差异类型配置为空时才添加默认类型
INSERT INTO jso_k2_diff_config (config_key, config_value, description)
SELECT 'difference_types', '[{"id": 1, "differenceType": "来料异常", "returnLocation": "K001-IQC"}, {"id": 2, "differenceType": "制程异常", "returnLocation": "K002-WIP"}, {"id": 3, "differenceType": "品质异常", "returnLocation": "K003-QC"}, {"id": 4, "differenceType": "库存盘点差异", "returnLocation": "K004-WH"}, {"id": 5, "differenceType": "其他差异", "returnLocation": "K005-OTHER"}]', '差异类型列表，JSON数组格式'
WHERE NOT EXISTS (
  SELECT 1 FROM jso_k2_diff_config WHERE config_key = 'difference_types'
);

-- 仅当退料地点配置为空时才添加默认地点
INSERT INTO jso_k2_diff_config (config_key, config_value, description)
SELECT 'return_locations', '["K001-IQC", "K002-WIP", "K003-QC", "K004-WH", "K005-OTHER", "K096"]', '退料地点列表，JSON数组格式'
WHERE NOT EXISTS (
  SELECT 1 FROM jso_k2_diff_config WHERE config_key = 'return_locations'
);
