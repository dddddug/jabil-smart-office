/**
 * 执行索引创建脚本
 * 运行方式: node backend/scripts/run-index-migration.js
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321',
});

const indexes = [
  // 1. jso_material_shelf_life 表：添加 (material, plant) 复合索引
  `CREATE INDEX IF NOT EXISTS idx_shelf_life_material_plant ON jso_material_shelf_life(material, plant)`,

  // 2. jso_material_extension 表：添加 grn 索引（用于 LEFT JOIN）
  `CREATE INDEX IF NOT EXISTS idx_material_extension_grn ON jso_material_extension(grn)`,

  // 3. jso_sap_grn_history_partitioned 表：添加 (creation_date, plant, is_processed) 复合索引
  `CREATE INDEX IF NOT EXISTS idx_grn_partitioned_date_plant_processed ON jso_sap_grn_history_partitioned(creation_date, plant, is_processed)`,

  // 4. jso_sap_grn_history_partitioned 表：添加 (creation_date, trans) 复合索引
  `CREATE INDEX IF NOT EXISTS idx_grn_partitioned_date_trans ON jso_sap_grn_history_partitioned(creation_date, trans)`,

  // 5. jso_sap_pull_log_partitioned 表：添加 (to_number, rf_ind, date_created DESC) 复合索引
  `CREATE INDEX IF NOT EXISTS idx_pull_partitioned_to_number_rf ON jso_sap_pull_log_partitioned(to_number, rf_ind, date_created DESC) WHERE rf_ind IS NOT NULL AND rf_ind != ''`,

  // 6. jso_class33_materials 表：确保 part_no 有索引
  `CREATE INDEX IF NOT EXISTS idx_class33_part_no ON jso_class33_materials(part_no)`,

  // 7. jso_da_material_document 表：添加 (document_no, control_type) 复合索引
  `CREATE INDEX IF NOT EXISTS idx_da_material_doc_no_control ON jso_da_material_document(document_no, control_type)`,
];

async function runMigrations() {
  console.log('开始创建索引...\n');

  for (const sql of indexes) {
    try {
      await pool.query(sql);
      // 提取索引名用于显示
      const match = sql.match(/INDEX IF NOT EXISTS (\w+)/);
      const idxName = match ? match[1] : 'unknown';
      console.log(`✓ 创建索引: ${idxName}`);
    } catch (error) {
      console.error(`✗ 创建索引失败: ${error.message}`);
    }
  }

  console.log('\n索引创建完成！');

  // 验证索引
  console.log('\n验证已创建的索引:');
  const result = await pool.query(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE tablename IN (
      'jso_material_shelf_life',
      'jso_material_extension',
      'jso_sap_grn_history_partitioned',
      'jso_sap_pull_log_partitioned',
      'jso_class33_materials',
      'jso_da_material_document'
    )
    AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  `);

  result.rows.forEach(row => {
    console.log(`  - ${row.tablename}.${row.indexname}`);
  });

  await pool.end();
}

runMigrations().catch(console.error);
