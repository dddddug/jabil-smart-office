/**
 * 分区表数据迁移脚本
 *
 * 功能：
 * 1. 创建分区表结构
 * 2. 从原表迁移数据到分区表
 * 3. 创建视图保持向后兼容
 *
 * 使用方式：
 *   node backend/scripts/migrateToPartitioned.js
 *
 * 警告：执行前请确保已备份数据！
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || '10.114.100.171',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

// 日志函数
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : '');
};

const logInfo = (msg, data) => log('INFO', msg, data);
const logError = (msg, data) => log('ERROR', msg, data);
const logSuccess = (msg, data) => log('SUCCESS', msg, data);

/**
 * 检查表是否存在
 */
async function tableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as exists
  `, [tableName]);
  return result.rows[0]?.exists || false;
}

/**
 * 获取分区表已存在的分区
 */
async function getExistingPartitions(parentTable) {
  const result = await pool.query(`
    SELECT child.relname AS partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    WHERE parent.relname = $1
    ORDER BY child.relname
  `, [parentTable]);
  return result.rows.map(r => r.partition_name);
}

/**
 * 创建分区表结构
 */
async function createPartitionedTables() {
  logInfo('开始创建分区表结构...');

  try {
    // 1. 创建分区主表（匹配原表结构）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jso_sap_pull_log_partitioned (
        id SERIAL,
        plant VARCHAR(20),
        warehouse VARCHAR(20),
        date_created DATE,  -- 从 VARCHAR 转换
        time_created VARCHAR(10),
        user_name VARCHAR(100),
        seq_no VARCHAR(50),
        trans VARCHAR(20),
        rf_ind VARCHAR(10),
        success VARCHAR(10),
        mvt VARCHAR(10),
        from_sloc VARCHAR(20),
        to_sloc VARCHAR(20),
        material VARCHAR(100),
        quantity VARCHAR(50),  -- 保持 VARCHAR 以匹配原表
        supplier VARCHAR(100),
        type VARCHAR(50),
        storage_bin VARCHAR(100),
        s1 VARCHAR(100),
        s2 VARCHAR(100),
        batch VARCHAR(100),
        new_batch VARCHAR(100),
        reference VARCHAR(200),
        rec_mat VARCHAR(100),
        old_grn VARCHAR(100),
        new_grn VARCHAR(100),
        ip_address VARCHAR(50),
        term_id VARCHAR(50),
        mat_doc VARCHAR(50),
        item1 VARCHAR(20),
        to_number VARCHAR(100),
        item2 VARCHAR(20),
        doc VARCHAR(50),
        item3 VARCHAR(20),
        is_ind VARCHAR(20),
        rv VARCHAR(50),
        vnt VARCHAR(50),
        hu VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 使用 created_at 而非 started_at
        PRIMARY KEY (id, date_created)
      ) PARTITION BY RANGE (date_created)
    `);
    logSuccess('jso_sap_pull_log_partitioned 创建成功');

    // 2. 创建 GRN 分区表（匹配原表结构）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jso_sap_grn_history_partitioned (
        id SERIAL,
        plant VARCHAR(20),
        warehouse VARCHAR(20),
        to_number VARCHAR(100),
        to_item VARCHAR(20),
        gr_document VARCHAR(100),
        to_qty VARCHAR(50),
        material VARCHAR(100),
        quantity VARCHAR(50),
        movmt_type VARCHAR(20),
        special VARCHAR(50),
        vendor VARCHAR(100),
        batch VARCHAR(100),
        creation_date DATE,  -- 从 VARCHAR(MM/DD/YYYY) 转换
        creation_time VARCHAR(10),
        created_by VARCHAR(100),
        trans VARCHAR(20),
        from_sloc VARCHAR(20),
        to_sloc VARCHAR(20),
        reference VARCHAR(200),
        masked_mpn VARCHAR(100),
        manufacturer VARCHAR(100),
        media_code VARCHAR(50),
        lot_code VARCHAR(100),
        date_code VARCHAR(50),
        cert_type VARCHAR(50),
        sled VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_processed BOOLEAN DEFAULT FALSE,
        processed_at TIMESTAMP,
        gr_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mfg_date VARCHAR(50),
        manufacturer_code VARCHAR(100),
        process_result TEXT,
        processed_by VARCHAR(100),
        PRIMARY KEY (id, creation_date)
      ) PARTITION BY RANGE (creation_date)
    `);
    logSuccess('jso_sap_grn_history_partitioned 创建成功');

    // 3. 创建预计算表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jso_pulllist_item_count (
        id SERIAL PRIMARY KEY,
        pulllist_no VARCHAR(100) NOT NULL,
        data_date DATE NOT NULL,
        item_count INTEGER DEFAULT 0,
        last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pulllist_no, data_date)
      )
    `);
    logSuccess('jso_pulllist_item_count 创建成功');

    return true;

  } catch (error) {
    logError('创建分区表失败', { error: error.message });
    return false;
  }
}

/**
 * 创建月度分区
 */
async function createMonthlyPartitions() {
  logInfo('开始创建月度分区...');

  const tables = [
    { parent: 'jso_sap_pull_log_partitioned', prefix: 'jso_sap_pull_log_' },
    { parent: 'jso_sap_grn_history_partitioned', prefix: 'jso_sap_grn_history_' }
  ];

  const months = [];
  // 2024年1月到2027年12月
  for (let year = 2024; year <= 2027; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push({ year, month });
    }
  }

  for (const table of tables) {
    let created = 0;
    let skipped = 0;

    for (const { year, month } of months) {
      const partitionName = `${table.prefix}${year}_${String(month).padStart(2, '0')}`;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${table.parent}
          FOR VALUES FROM ('${startDate}') TO ('${endDate}')
        `);
        created++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipped++;
        } else {
          logError(`创建分区 ${partitionName} 失败`, { error: error.message });
        }
      }
    }

    logSuccess(`表 ${table.parent} 分区创建完成`, { created, skipped });
  }
}

/**
 * 创建索引
 */
async function createIndexes() {
  logInfo('开始创建索引...');

  try {
    // Pull Log 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pull_partitioned_date ON jso_sap_pull_log_partitioned(date_created)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pull_partitioned_reference ON jso_sap_pull_log_partitioned(reference)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pull_partitioned_to_number ON jso_sap_pull_log_partitioned(to_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pull_partitioned_trans ON jso_sap_pull_log_partitioned(trans)`);

    // GRN History 索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_grn_partitioned_date ON jso_sap_grn_history_partitioned(creation_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_grn_partitioned_material ON jso_sap_grn_history_partitioned(material)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_grn_partitioned_to_number ON jso_sap_grn_history_partitioned(to_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_grn_partitioned_trans ON jso_sap_grn_history_partitioned(trans)`);

    // 预计算表索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pulllist_date ON jso_pulllist_item_count(data_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pulllist_pulllist ON jso_pulllist_item_count(pulllist_no)`);

    logSuccess('索引创建完成');
    return true;
  } catch (error) {
    logError('创建索引失败', { error: error.message });
    return false;
  }
}

/**
 * 迁移 Pull Log 数据
 */
async function migratePullLog() {
  logInfo('开始迁移 jso_sap_pull_log 数据...');

  try {
    // 检查原表数据量
    const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM jso_sap_pull_log`);
    const totalCount = parseInt(countResult.rows[0]?.cnt || 0);
    logInfo(`原表数据量: ${totalCount}`);

    if (totalCount === 0) {
      logSuccess('jso_sap_pull_log 无数据需要迁移');
      return true;
    }

    // 迁移数据（分批）
    const batchSize = 5000;
    let migrated = 0;

    while (migrated < totalCount) {
      // date_created 原表是 VARCHAR，转换为 DATE
      // 使用 created_at 字段来提取日期（因为 date_created 可能为空或格式不对）
      const result = await pool.query(`
        INSERT INTO jso_sap_pull_log_partitioned
          (plant, warehouse, date_created, time_created, user_name, seq_no, trans, rf_ind, success, mvt,
           from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
           reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
           created_at)
        SELECT
          plant, warehouse,
          CASE
            WHEN date_created IS NOT NULL AND date_created ~ E'^\\d{4}-\\d{2}-\\d{2}' THEN date_created::date
            WHEN date_created IS NOT NULL AND date_created ~ E'^\\d{2}/\\d{2}/\\d{4}' THEN TO_DATE(date_created, 'MM/DD/YYYY')
            ELSE created_at::date
          END as date_created,
          time_created, user_name, seq_no, trans, rf_ind, success, mvt,
          from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
          reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu,
          created_at
        FROM jso_sap_pull_log
        ORDER BY created_at
        LIMIT ${batchSize}
        OFFSET ${migrated}
        ON CONFLICT DO NOTHING
        RETURNING id
      `);

      migrated += result.rowCount;
      if (result.rowCount > 0) {
        process.stdout.write(`\r进度: ${migrated}/${totalCount} (${Math.round(migrated/totalCount*100)}%)`);
      }

      // 如果这一批没有数据插入，退出循环（可能已经没有可迁移的数据）
      if (result.rowCount === 0 && migrated >= totalCount) {
        break;
      }
    }

    console.log(''); // 换行

    // 验证迁移结果
    const partitionCount = await pool.query(`SELECT COUNT(*) as cnt FROM jso_sap_pull_log_partitioned`);
    logSuccess('jso_sap_pull_log 迁移完成', {
      原表: totalCount,
      分区表: parseInt(partitionCount.rows[0]?.cnt || 0)
    });

    return true;

  } catch (error) {
    logError('迁移 jso_sap_pull_log 失败', { error: error.message });
    return false;
  }
}

/**
 * 迁移 GRN History 数据
 */
async function migrateGrnHistory() {
  logInfo('开始迁移 jso_sap_grn_history 数据...');

  try {
    // 检查原表数据量
    const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM jso_sap_grn_history`);
    const totalCount = parseInt(countResult.rows[0]?.cnt || 0);
    logInfo(`原表数据量: ${totalCount}`);

    if (totalCount === 0) {
      logSuccess('jso_sap_grn_history 无数据需要迁移');
      return true;
    }

    // 迁移数据（分批）
    const batchSize = 5000;
    let migrated = 0;

    while (migrated < totalCount) {
      const result = await pool.query(`
        INSERT INTO jso_sap_grn_history_partitioned
          (plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
           special, vendor, batch, creation_date, creation_time, created_by, trans, from_sloc, to_sloc,
           reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
           created_at, is_processed, processed_at, gr_date, mfg_date, manufacturer_code, process_result, processed_by)
        SELECT
          plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
          special, vendor, batch,
          CASE
            WHEN creation_date IS NOT NULL AND creation_date != '' THEN TO_DATE(creation_date, 'MM/DD/YYYY')::date
            ELSE CURRENT_DATE
          END as creation_date,
          creation_time, created_by, trans, from_sloc, to_sloc,
          reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled,
          created_at, is_processed, processed_at, gr_date, mfg_date, manufacturer_code, process_result, processed_by
        FROM jso_sap_grn_history
        ORDER BY gr_date
        LIMIT ${batchSize}
        OFFSET ${migrated}
        ON CONFLICT DO NOTHING
        RETURNING id
      `);

      migrated += result.rowCount;
      if (result.rowCount > 0) {
        process.stdout.write(`\r进度: ${migrated}/${totalCount} (${Math.round(migrated/totalCount*100)}%)`);
      }

      if (result.rowCount === 0) break;
    }

    console.log(''); // 换行

    // 验证迁移结果
    const partitionCount = await pool.query(`SELECT COUNT(*) as cnt FROM jso_sap_grn_history_partitioned`);
    logSuccess('jso_sap_grn_history 迁移完成', {
      原表: totalCount,
      分区表: parseInt(partitionCount.rows[0]?.cnt || 0)
    });

    return true;

  } catch (error) {
    logError('迁移 jso_sap_grn_history 失败', { error: error.message });
    return false;
  }
}

/**
 * 创建视图保持向后兼容
 */
async function createViews() {
  logInfo('创建视图保持向后兼容...');

  try {
    // 删除旧视图（如果存在）
    await pool.query(`DROP VIEW IF EXISTS jso_sap_pull_log_view`);
    await pool.query(`DROP VIEW IF EXISTS jso_sap_grn_history_view`);

    // 创建视图（直接指向分区表）
    await pool.query(`
      CREATE OR REPLACE VIEW jso_sap_pull_log AS
      SELECT * FROM jso_sap_pull_log_partitioned
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW jso_sap_grn_history AS
      SELECT * FROM jso_sap_grn_history_partitioned
    `);

    logSuccess('视图创建完成');
    return true;
  } catch (error) {
    logError('创建视图失败', { error: error.message });
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========== 分区表数据迁移 ==========\n');
  const startTime = Date.now();

  try {
    // 1. 检查原表是否存在
    const pullLogExists = await tableExists('jso_sap_pull_log');
    const grnHistoryExists = await tableExists('jso_sap_grn_history');

    if (!pullLogExists) {
      logError('jso_sap_pull_log 表不存在，跳过');
    }
    if (!grnHistoryExists) {
      logError('jso_sap_grn_history 表不存在，跳过');
    }

    if (!pullLogExists && !grnHistoryExists) {
      logError('没有找到需要迁移的表，退出');
      await pool.end();
      process.exit(1);
    }

    // 2. 创建分区表结构
    const tablesCreated = await createPartitionedTables();
    if (!tablesCreated) {
      throw new Error('创建分区表失败');
    }

    // 3. 创建月度分区
    await createMonthlyPartitions();

    // 4. 创建索引
    await createIndexes();

    // 5. 迁移数据
    if (pullLogExists) {
      const pullLogMigrated = await migratePullLog();
      if (!pullLogMigrated) {
        throw new Error('迁移 jso_sap_pull_log 失败');
      }
    }

    if (grnHistoryExists) {
      const grnMigrated = await migrateGrnHistory();
      if (!grnMigrated) {
        throw new Error('迁移 jso_sap_grn_history 失败');
      }
    }

    // 6. 创建视图
    await createViews();

    // 7. 显示分区信息
    console.log('\n========== 分区状态 ==========');
    const pullPartitions = await getExistingPartitions('jso_sap_pull_log_partitioned');
    const grnPartitions = await getExistingPartitions('jso_sap_grn_history_partitioned');
    console.log(`jso_sap_pull_log_partitioned: ${pullPartitions.length} 个分区`);
    console.log(`jso_sap_grn_history_partitioned: ${grnPartitions.length} 个分区`);

    const elapsed = Date.now() - startTime;
    console.log(`\n========== 迁移完成！耗时: ${Math.round(elapsed/1000)}s ==========\n`);

    await pool.end();
    process.exit(0);

  } catch (error) {
    logError('迁移过程出错', { error: error.message });
    await pool.end();
    process.exit(1);
  }
}

// 执行
main();
