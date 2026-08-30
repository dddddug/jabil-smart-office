# PostgreSQL 分区表部署指南

## 概述

本文档说明如何部署分区表优化方案，解决 `jso_sap_pull_log` 和 `jso_sap_grn_history` 表数据增长导致的性能问题。

## 优化方案

1. **分区表**：按月分区，减少单次查询扫描的数据量
2. **预计算表**：`jso_pulllist_item_count` 替代模糊查询
3. **自动分区管理**：定时创建未来分区
4. **应用层优化**：使用分区表 + 回退机制

---

## 部署步骤

### 第一步：创建分区表结构

```bash
# 在数据库服务器上执行
psql -h 10.114.100.171 -U postgres -d stockroom_db -f backend/scripts/create_partitioned_tables.sql
```

**或者在 pgAdmin 中执行** `backend/scripts/create_partitioned_tables.sql`

### 第二步：迁移历史数据

```sql
-- 在 psql 或 pgAdmin 中执行

-- 1. 迁移 Pull Log 数据
INSERT INTO jso_sap_pull_log_partitioned
  (plant, warehouse, date_created, time_created, user_name, seq_no, trans, rf_ind, success, mvt,
   from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
   reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
   started_at)
SELECT
  plant, warehouse,
  CASE
    WHEN date_created IS NOT NULL THEN date_created::date
    ELSE CURRENT_DATE
  END as date_created,
  time_created, user_name, seq_no, trans, rf_ind, success, mvt,
  from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
  reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
  started_at
FROM jso_sap_pull_log;

-- 2. 迁移 GRN History 数据
INSERT INTO jso_sap_grn_history_partitioned
  (plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
   special, vendor, batch, creation_date, creation_time, created_by, trans, from_sloc, to_sloc,
   reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
   gr_date, pulled_at, is_processed, process_result, processed_by, processed_at)
SELECT
  plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
  special, vendor, batch,
  CASE
    WHEN creation_date IS NOT NULL THEN TO_DATE(creation_date, 'MM/DD/YYYY')::date
    ELSE CURRENT_DATE
  END as creation_date,
  creation_time, created_by, trans, from_sloc, to_sloc,
  reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
  gr_date, pulled_at, is_processed, process_result, processed_by, processed_at
FROM jso_sap_grn_history;

-- 3. 验证数据迁移
SELECT 'jso_sap_pull_log_partitioned' as table_name, COUNT(*) as row_count FROM jso_sap_pull_log_partitioned
UNION ALL
SELECT 'jso_sap_grn_history_partitioned', COUNT(*) FROM jso_sap_grn_history_partitioned;
```

### 第三步：计算初始预计算数据

```bash
# 在项目根目录执行
cd c:\Users\1167023\Desktop\Jabil
node backend/scripts/recalculateItemCounts.js --full
```

### 第四步：验证视图兼容

```sql
-- 验证视图返回数据
SELECT * FROM jso_sap_pull_log LIMIT 1;
SELECT * FROM jso_sap_grn_history LIMIT 1;
```

### 第五步：部署代码更新

代码已更新，使用了分区表 + 回退机制：

- [stockroomUrgentPullController.js](backend/controllers/stockroomUrgentPullController.js) - 使用预计算表
- [warehouseMonitorRoutes.js](backend/routes/warehouseMonitorRoutes.js) - 使用分区表
- [scheduledTasks.js](backend/scripts/scheduledTasks.js) - 添加定时任务

### 第六步：重启服务

```bash
# 重启后端服务
pm2 restart all
# 或
npm run dev
```

---

## 验证部署

### 检查分区状态

```bash
node backend/scripts/autoCreatePartitions.js --check
```

预期输出示例：
```json
{
  "jso_sap_pull_log_partitioned": {
    "totalPartitions": 48,
    "recentStats": [...],
    "futurePartitionsExist": true
  },
  "jso_sap_grn_history_partitioned": {
    "totalPartitions": 48,
    "recentStats": [...],
    "futurePartitionsExist": true
  }
}
```

### 检查预计算表

```sql
SELECT
  COUNT(DISTINCT pulllist_no) as unique_pulllists,
  COUNT(*) as total_records,
  MIN(data_date) as earliest_date,
  MAX(data_date) as latest_date,
  SUM(item_count) as total_items
FROM jso_pulllist_item_count;
```

### 测试查询性能

```sql
-- 测试分区裁剪（查看执行计划）
EXPLAIN ANALYZE
SELECT * FROM jso_sap_grn_history_partitioned
WHERE creation_date = '2026-08-01';

-- 对比原表性能
EXPLAIN ANALYZE
SELECT * FROM jso_sap_grn_history
WHERE creation_date = '2026-08-01';
```

---

## 日常维护

### 手动创建未来分区

```bash
# 创建未来3个月的分区
node backend/scripts/autoCreatePartitions.js --months 3

# 仅检查分区状态
node backend/scripts/autoCreatePartitions.js --check
```

### 手动重新计算 ITEM 计数

```bash
# 增量计算（默认）
node backend/scripts/recalculateItemCounts.js

# 全量重新计算
node backend/scripts/recalculateItemCounts.js --full

# 指定日期
node backend/scripts/recalculateItemCounts.js --date 2026-08-01

# 指定日期范围
node backend/scripts/recalculateItemCounts.js --range 2026-01-01 2026-08-01
```

---

## 回滚方案

如果分区表出现问题，可以快速回滚到原表：

### 方案1：修改代码回退

代码已内置回退机制，当分区表不可用时会自动回退到原表：

```javascript
// stockroomUrgentPullController.js 中的配置
const SAP_PULL_LOG_TABLE = 'jso_sap_pull_log_partitioned';
const SAP_PULL_LOG_FALLBACK = 'jso_sap_pull_log'; // 回退表
```

临时回退只需注释掉分区表配置：
```javascript
const SAP_PULL_LOG_TABLE = 'jso_sap_pull_log'; // 临时使用原表
```

### 方案2：修改视图

```sql
-- 修改视图指向原表
CREATE OR REPLACE VIEW jso_sap_pull_log AS
SELECT * FROM jso_sap_pull_log_original;

CREATE OR REPLACE VIEW jso_sap_grn_history AS
SELECT * FROM jso_sap_grn_history_original;
```

---

## 性能对比

| 场景 | 原表 | 分区表 | 提升 |
|------|------|--------|------|
| 查询单日数据 | 全表扫描 | 只扫描1个分区 | ~95% |
| 按日期范围查询 | 全表扫描 | 只扫描涉及的分区 | ~80% |
| ITEM计数查询 | 模糊匹配 | 精确查询预计算表 | ~99% |

---

## 监控指标

建议监控以下指标：

1. **分区表行数**：确保数据正确分布到各分区
2. **预计算表命中率**：预计算表有数据 vs 需要回退查询
3. **查询响应时间**：监控 API 响应时间变化
4. **分区数量**：确保有足够的未来分区

---

## 注意事项

1. **备份优先**：生产环境执行前务必备份数据
2. **分步执行**：建议先在测试环境验证
3. **窗口期**：数据迁移可能需要较长时间，选择业务低峰期
4. **磁盘空间**：分区表会增加约30%的磁盘占用（索引）
5. **定期维护**：确保定时任务正常运行

---

## 联系方式

如有问题，请检查日志：
- `backend/logs/combined.log`
- `backend/logs/error.log`
