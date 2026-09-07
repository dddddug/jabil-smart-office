/**
 * 重置 Building 配置表 - 支持重复Building
 */
import pool from '../config/db.js';

const resetAndMigrate = async () => {
  const tableName = 'jso_warehouse_return_building_config';

  try {
    console.log('开始重置 Building 配置表（支持重复Building）...');

    // 删除表
    await pool.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    console.log('✓ 已删除旧表');

    // 重新创建表（移除了 building_code 的 UNIQUE 约束，改用 id 唯一）
    await pool.query(`
      CREATE TABLE ${tableName} (
        id SERIAL PRIMARY KEY,
        building VARCHAR(100) NOT NULL,
        warehouse_location VARCHAR(100),
        system_location VARCHAR(100),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ 已创建新表（支持重复Building）');

    console.log('\n✅ 迁移完成！表结构：');
    const result = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position`);
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  }
};

resetAndMigrate();
