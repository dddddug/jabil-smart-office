-- 删除所有测试数据
DELETE FROM jso_warehouse_diff_registration;

-- 重置序列到1
ALTER SEQUENCE jso_warehouse_diff_registration_id_seq RESTART WITH 1;

-- 验证
SELECT '当前最大ID:' as info, COALESCE(MAX(id), 0) as max_id FROM jso_warehouse_diff_registration;
SELECT '序列当前值:' as info, last_value as seq_value FROM jso_warehouse_diff_registration_id_seq;
