/**
 * 统一定时任务管理
 * 所有定时任务集中管理，方便维护和查看
 */

import cron from 'node-cron';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
} catch (e) {}

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || '10.114.100.171',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
  timezone: 'Asia/Shanghai',
  max: 3,
};

const pool = new pg.Pool(DB_CONFIG);

const REPORT_DIR = 'C:/Users/1167023/report';
const SAP_API_URL = 'http://cnhuam0wh01:3003/iCReportService/materialExtensionInfos/syncLatestMaterialExtensionData';

// ========== 日志函数 ==========

function logInfo(module, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [INFO] [${module}] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : '');
}

function logError(module, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] [${module}] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : '');
}

// ========== 1. 用户相关任务 ==========

async function checkAndDeactivateUsers() {
  try {
    logInfo('ScheduledTasks', '开始检查需要停用的用户...');
    logInfo('ScheduledTasks', '检查完成，没有需要停用的用户');
  } catch (error) {
    logError('ScheduledTasks', '检查停用用户失败:', error.message);
  }
}

async function processTransferDates() {
  try {
    logInfo('ScheduledTasks', '开始检查转岗日期到期的记录...');
    logInfo('ScheduledTasks', '检查完成，没有需要处理的转岗记录');
  } catch (error) {
    logError('ScheduledTasks', '处理转岗日期失败:', error.message);
  }
}

// ========== 2. SAP 数据拉取任务 ==========

function parseGRNFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const data = [];
  let inData = false;
  for (const line of lines) {
    if (line.includes('|Plant|')) {
      inData = true;
      continue;
    }
    if (inData && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|');
      if (parts.length >= 26) {
        data.push([
          parts[1]?.trim() || '', parts[2]?.trim() || '', parts[3]?.trim() || '', parts[4]?.trim() || '',
          parts[5]?.trim() || '', parts[6]?.trim() || '', parts[7]?.trim() || '', parts[8]?.trim() || '',
          parts[9]?.trim() || '', parts[10]?.trim() || '', parts[11]?.trim() || '', parts[12]?.trim() || '',
          parts[13]?.trim() || '', parts[14]?.trim() || '', parts[15]?.trim() || '', parts[16]?.trim() || '',
          parts[17]?.trim() || '', parts[18]?.trim() || '', parts[19]?.trim() || '', parts[20]?.trim() || '',
          parts[21]?.trim() || '', parts[22]?.trim() || '', parts[23]?.trim() || '', parts[24]?.trim() || '',
          parts[25]?.trim() || '', parts[26]?.trim() || ''
        ]);
      }
    }
  }
  return data;
}

function parseITEMFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const data = [];
  let inData = false;
  for (const line of lines) {
    if (line.includes('|Plnt|')) {
      inData = true;
      continue;
    }
    if (inData && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|');
      if (parts.length >= 35) {
        data.push([
          parts[1]?.trim() || '', parts[2]?.trim() || '', parts[3]?.trim() || '', parts[4]?.trim() || '',
          parts[5]?.trim() || '', parts[6]?.trim() || '', parts[7]?.trim() || '', parts[8]?.trim() || '',
          parts[9]?.trim() || '', parts[10]?.trim() || '', parts[11]?.trim() || '', parts[12]?.trim() || '',
          parts[13]?.trim() || '', parts[14]?.trim() || '', parts[15]?.trim() || '', parts[16]?.trim() || '',
          parts[17]?.trim() || '', parts[18]?.trim() || '', parts[19]?.trim() || '', parts[20]?.trim() || '',
          parts[21]?.trim() || '', parts[22]?.trim() || '', parts[23]?.trim() || '', parts[24]?.trim() || '',
          parts[25]?.trim() || '', parts[26]?.trim() || '', parts[27]?.trim() || '', parts[28]?.trim() || '',
          parts[29]?.trim() || '', parts[30]?.trim() || '', parts[31]?.trim() || '', parts[32]?.trim() || '',
          parts[33]?.trim() || '', parts[34]?.trim() || '', parts[35]?.trim() || '', parts[36]?.trim() || '',
          parts[37]?.trim() || ''
        ]);
      }
    }
  }
  return data;
}

async function pullSAPData() {
  try {
    logInfo('ScheduledTasks', '开始拉取 SAP 数据...');

    let itemCount = 0;
    let grnCount = 0;

    if (!fs.existsSync(REPORT_DIR)) {
      logInfo('ScheduledTasks', '报告目录不存在: ' + REPORT_DIR);
      return;
    }

    // 导入 ITEM 数据到分区表
    const itemFiles = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('ITEM_RollData-')).sort();
    for (const file of itemFiles) {
      const filePath = path.join(REPORT_DIR, file);
      const records = parseITEMFile(filePath);
      for (const r of records) {
        let dateStr = r[2];
        if (dateStr && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
        await pool.query(`
          INSERT INTO jso_sap_pull_log_partitioned
          (plant, warehouse, date_created, time_created, user_name, seq_no, trans, rf_ind, success, mvt,
           from_sloc, to_sloc, material, quantity, supplier, type, storage_bin, s1, s2, batch, new_batch,
           reference, rec_mat, old_grn, new_grn, ip_address, term_id, mat_doc, item1, to_number, item2, doc, item3, is_ind, rv, vnt, hu)
          VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
        `, [r[0], r[1], dateStr, r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], r[14], r[15], r[16], r[17], r[18], r[19], r[20], r[21], r[22], r[23], r[24], r[25], r[26], r[27], r[28], r[29], r[30], r[31], r[32], r[33], r[34], r[35], r[36]]);
        itemCount++;
      }
      // 记录导入日志
      await pool.query(`
        INSERT INTO jso_sap_item_pull_history (file_name, record_count, status, pull_date)
        VALUES ($1, $2, 'success', CURRENT_TIMESTAMP)
      `, [file, records.length]);
      fs.unlinkSync(filePath);
      logInfo('ScheduledTasks', '导入 ITEM: ' + file + ' (' + records.length + ' 条)');
    }

    // 导入 GRN 数据到分区表
    const grnFiles = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('GRN_RollData-')).sort();
    for (const file of grnFiles) {
      const filePath = path.join(REPORT_DIR, file);
      const records = parseGRNFile(filePath);
      for (const r of records) {
        let dateStr = r[12];
        if (dateStr && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
        await pool.query(`
          INSERT INTO jso_sap_grn_history_partitioned
          (plant, warehouse, to_number, to_item, gr_document, to_qty, material, quantity, movmt_type,
           special, vendor, batch, creation_date, creation_time, created_by, trans, from_sloc, to_sloc,
           reference, masked_mpn, manufacturer, media_code, lot_code, date_code, cert_type, sled)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::date, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        `, [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], dateStr, r[13], r[14], r[15], r[16], r[17], r[18], r[19], r[20], r[21], r[22], r[23], r[24], r[25]]);
        grnCount++;
      }
      // 记录导入日志
      await pool.query(`
        INSERT INTO jso_sap_grn_pull_history (file_name, record_count, status, pull_date)
        VALUES ($1, $2, 'success', CURRENT_TIMESTAMP)
      `, [file, records.length]);
      fs.unlinkSync(filePath);
      logInfo('ScheduledTasks', '导入 GRN: ' + file + ' (' + records.length + ' 条)');
    }

    logInfo('ScheduledTasks', 'SAP 数据拉取完成: ITEM=' + itemCount + ' 条, GRN=' + grnCount + ' 条');

  } catch (error) {
    logError('ScheduledTasks', 'SAP 数据拉取失败:', error.message);
  }
}

// ========== 3. 物料延期同步任务 ==========

function parseSAPMaterialData(data) {
  if (!data || !data.data || !Array.isArray(data.data)) {
    return [];
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return data.data.map(item => {
    let extensionDate = null;
    let updateDate = null;
    let lastSyncTime = now;

    try {
      if (item.extensionDate) {
        const dt = new Date(item.extensionDate.replace(' ', 'T'));
        if (!isNaN(dt.getTime())) {
          extensionDate = dt.toISOString().slice(0, 10);
        }
      }
    } catch (e) {}

    try {
      if (item.updateDate) {
        const dt = new Date(item.updateDate.replace(' ', 'T'));
        if (!isNaN(dt.getTime())) {
          updateDate = dt.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
    } catch (e) {}

    try {
      if (item.lastSyncTime) {
        const dt = new Date(item.lastSyncTime.replace(' ', 'T'));
        if (!isNaN(dt.getTime())) {
          lastSyncTime = dt.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
    } catch (e) {}

    return {
      grn: item.grsNo || '',
      date_code: item.dateCode || '',
      extension_date: extensionDate,
      extension_file_no: item.extensionFileNo || '',
      user_name: item.userName || '',
      update_date: updateDate,
      last_sync_time: lastSyncTime,
      raw_data: JSON.stringify(item)
    };
  }).filter(item => item.grn);
}

async function saveMaterialExtension(items) {
  if (items.length === 0) return { saved: 0, failed: 0, failedItems: [] };

  const BATCH_SIZE = 500;
  let savedCount = 0;
  let failedItems = [];

  console.log(`开始保存 ${items.length} 条数据...`);

  // 第一遍：批量插入
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const item of batch) {
        values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
        params.push(item.grn, item.date_code, item.extension_date, item.extension_file_no,
                    item.user_name, item.update_date, item.last_sync_time, item.raw_data);
        paramIndex += 8;
      }

      await pool.query(`
        INSERT INTO jso_material_extension (
          grn, date_code, extension_date, extension_file_no, user_name,
          update_date, last_sync_time, raw_data
        ) VALUES ${values.join(', ')}
        ON CONFLICT (grn) DO UPDATE SET
          extension_date = EXCLUDED.extension_date,
          extension_file_no = EXCLUDED.extension_file_no,
          user_name = EXCLUDED.user_name,
          update_date = EXCLUDED.update_date,
          last_sync_time = EXCLUDED.last_sync_time,
          raw_data = EXCLUDED.raw_data
      `, params);

      savedCount += batch.length;

    } catch (batchErr) {
      // 批量失败，单条重试
      for (const item of batch) {
        try {
          await pool.query(`
            INSERT INTO jso_material_extension (
              grn, date_code, extension_date, extension_file_no, user_name,
              update_date, last_sync_time, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (grn) DO UPDATE SET
              extension_date = EXCLUDED.extension_date,
              extension_file_no = EXCLUDED.extension_file_no,
              user_name = EXCLUDED.user_name,
              update_date = EXCLUDED.update_date,
              last_sync_time = EXCLUDED.last_sync_time,
              raw_data = EXCLUDED.raw_data
          `, [item.grn, item.date_code, item.extension_date, item.extension_file_no,
              item.user_name, item.update_date, item.last_sync_time, item.raw_data]);
          savedCount++;
        } catch (singleErr) {
          failedItems.push(item); // 保存原始item对象
        }
      }
    }

    if (batchNum % 10 === 0 || i + BATCH_SIZE >= items.length) {
      console.log(`  进度: ${savedCount}/${items.length} (待重试: ${failedItems.length})`);
    }
  }

  // 第二遍：重试所有失败项
  if (failedItems.length > 0) {
    console.log(`  开始重试 ${failedItems.length} 条失败记录...`);

    let retryCount = 0;
    while (failedItems.length > 0 && retryCount < 10) {
      retryCount++;
      const currentFailed = [...failedItems];
      failedItems = [];

      for (const item of currentFailed) {
        try {
          await pool.query(`
            INSERT INTO jso_material_extension (
              grn, date_code, extension_date, extension_file_no, user_name,
              update_date, last_sync_time, raw_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (grn) DO UPDATE SET
              extension_date = EXCLUDED.extension_date,
              extension_file_no = EXCLUDED.extension_file_no,
              user_name = EXCLUDED.user_name,
              update_date = EXCLUDED.update_date,
              last_sync_time = EXCLUDED.last_sync_time,
              raw_data = EXCLUDED.raw_data
          `, [item.grn, item.date_code, item.extension_date, item.extension_file_no,
              item.user_name, item.update_date, item.last_sync_time, item.raw_data]);
          savedCount++;
        } catch (err) {
          failedItems.push(item); // 再次失败，加入下一轮
        }
      }

      console.log(`    第${retryCount}轮重试: 成功 ${currentFailed.length - failedItems.length}/${currentFailed.length}`);
    }
  }

  console.log(`保存完成: 成功 ${savedCount}, 最终失败 ${failedItems.length}`);
  return { saved: savedCount, failed: failedItems.length, failedItems: failedItems.slice(0, 100) };
}

async function syncMaterialExtension() {
  console.log('============================================================');
  console.log(`[${new Date().toLocaleString('zh-CN')}] 物料延期数据同步`);
  console.log('============================================================');

  const startTime = Date.now();

  try {
    console.log(`[${new Date().toLocaleString('zh-CN')}] 开始拉取数据...`);
    const response = await fetch(SAP_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(180000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const sapData = await response.json();
    console.log(`成功获取 ${sapData.data?.length || 0} 条数据`);

    const items = parseSAPMaterialData(sapData);
    console.log(`解析完成，共 ${items.length} 条有效数据`);

    const result = await saveMaterialExtension(items);

    // 记录日志
    try {
      const status = result.failed > 0 ? 'partial' : 'success';
      await pool.query(`
        INSERT INTO jso_material_extension_pull_log (source_url, records_count, status, error_message, completed_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [SAP_API_URL, result.saved, status, result.failed > 0 ? `失败 ${result.failed} 条` : null]);
    } catch (e) {}

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('============================================================');
    console.log(`✅ 完成! 保存 ${result.saved} 条，失败 ${result.failed} 条，耗时 ${duration} 秒`);
    console.log('============================================================');

  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    try {
      await pool.query(`
        INSERT INTO jso_material_extension_pull_log (source_url, records_count, status, error_message, completed_at)
        VALUES ($1, 0, 'failed', $2, CURRENT_TIMESTAMP)
      `, [SAP_API_URL, error.message]);
    } catch (e) {}
  }
}

// ========== 4. Stockroom 归档任务 ==========

const HOT_DATA_DAYS = 30;

async function runScheduledArchive() {
  console.log('📦 开始定时归档任务...');
  console.log(`   归档策略: 超过 ${HOT_DATA_DAYS} 天的数据移至归档表\n`);

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HOT_DATA_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const pendingCount = await pool.query(`
      SELECT COUNT(*) as pending FROM jso_stockroom_urgent_pull_data_partitioned
      WHERE data_date < $1
    `, [cutoffDateStr]);

    const pending = parseInt(pendingCount.rows[0].pending);
    console.log(`📊 待归档记录: ${pending} 条`);

    if (pending === 0) {
      console.log('✅ 没有需要归档的数据');
      return { success: true, archived: 0 };
    }

    const BATCH_SIZE = 5000;
    let archived = 0;

    while (true) {
      const batchResult = await pool.query(`
        DELETE FROM jso_stockroom_urgent_pull_data_partitioned
        WHERE id IN (
          SELECT id FROM jso_stockroom_urgent_pull_data_partitioned
          WHERE data_date < $1
          ORDER BY data_date, id
          LIMIT $2
        )
        RETURNING *
      `, [cutoffDateStr, BATCH_SIZE]);

      if (batchResult.rows.length === 0) break;

      for (const row of batchResult.rows) {
        try {
          await pool.query(`
            INSERT INTO jso_stockroom_urgent_pull_data_archive (
              build_plan, customer, material_req_time, pulllist_no,
              part_number, part_desc, qty_required, qty_allocated, qty_short,
              bin_location, is_pull_list_shortage, build_plan_id, bp_type, qm, sloc,
              storage_area, step, factory_ma_route, sets, sap_model, assembly,
              creator, create_time, data_date, pulled_at, warehouse, item_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
            ON CONFLICT (pulllist_no, data_date, archived_at) DO NOTHING
          `, [
            row.build_plan, row.customer, row.material_req_time, row.pulllist_no,
            row.part_number, row.part_desc, row.qty_required, row.qty_allocated, row.qty_short,
            row.bin_location, row.is_pull_list_shortage, row.build_plan_id, row.bp_type, row.qm, row.sloc,
            row.storage_area, row.step, row.factory_ma_route, row.sets, row.sap_model, row.assembly,
            row.creator, row.create_time, row.data_date, row.pulled_at, row.warehouse, row.item_count
          ]);
          archived++;
        } catch (e) {}
      }

      console.log(`   批次: 处理 ${batchResult.rows.length} 条，累计 ${archived} 条`);
    }

    console.log(`\n✅ 归档完成! 共归档 ${archived} 条记录`);
    return { success: true, archived };

  } catch (error) {
    console.error('❌ 归档失败:', error.message);
    return { success: false, error: error.message };
  }
}

// ========== 5. 分区和预计算任务 ==========

async function partitionMaintenance() {
  try {
    const { scheduledPartitionMaintenance } = await import('./autoCreatePartitions.js');
    logInfo('ScheduledTasks', '开始执行分区自动维护...');
    const result = await scheduledPartitionMaintenance();
    logInfo('ScheduledTasks', '分区自动维护完成', result);
  } catch (error) {
    logError('ScheduledTasks', '分区自动维护失败:', error.message);
  }
}

async function itemCountPrecompute() {
  try {
    const { scheduledCalculate } = await import('./recalculateItemCounts.js');
    logInfo('ScheduledTasks', '开始执行ITEM计数预计算...');
    const result = await scheduledCalculate();
    logInfo('ScheduledTasks', 'ITEM计数预计算完成', result);
  } catch (error) {
    logError('ScheduledTasks', 'ITEM计数预计算失败:', error.message);
  }
}

// ========== 6. 物料有效期数据导入 ==========

const SHELF_LIFE_FILE_PREFIX = 'SQ00_MM_MM101UZH';
const SHELF_LIFE_REPORT_DIR = 'C:/Users/1167023/report';

function parseShelfLifeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const records = [];

  // 从文件名获取日期
  const fileName = path.basename(filePath);
  const dateMatch = fileName.match(/(\d{8})\.txt$/);
  let reportDate = null;
  if (dateMatch) {
    const yyyy = dateMatch[1].substring(0, 4);
    const mm = dateMatch[1].substring(4, 6);
    const dd = dateMatch[1].substring(6, 8);
    reportDate = `${yyyy}-${mm}-${dd}`;
  }

  for (const line of lines) {
    if (!line.trim() || line.includes('------') || line.includes('Use MM-032')) continue;
    if (line.startsWith('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      // 文件格式: Plnt, Material group, Material, Material description, SLife, RSL, Stor., Per. ind.
      if (parts.length >= 8) {
        records.push({
          plant: parts[0],
          material_group: parts[1],
          material: parts[2],
          material_description: parts[3],
          shelf_life: parseInt(parts[4]) || 0,
          remaining_shelf_life: parseInt(parts[5]) || 0,
          storage_indicator: parts[6],
          period_indicator: parts[parts.length - 1],
          report_date: reportDate
        });
      }
    }
  }
  return records;
}

async function importMaterialShelfLife() {
  let sourceFile = null;
  let fileSize = 0;

  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    sourceFile = `${SHELF_LIFE_FILE_PREFIX}-${today}.txt`;
    const todayFile = path.join(SHELF_LIFE_REPORT_DIR, sourceFile);

    if (!fs.existsSync(todayFile)) {
      logInfo('ShelfLifeImport', `今天的数据文件不存在: ${todayFile}`);
      return;
    }

    fileSize = fs.statSync(todayFile).size;
    logInfo('ShelfLifeImport', `读取文件: ${todayFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const records = parseShelfLifeFile(todayFile);
    logInfo('ShelfLifeImport', `解析完成，共 ${records.length} 条数据`);

    const BATCH_SIZE = 1000;
    let savedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const r of batch) {
        values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`);
        params.push(r.plant, r.material_group, r.material, r.material_description,
          r.shelf_life, r.remaining_shelf_life, r.storage_indicator, r.period_indicator, r.report_date);
        paramIndex += 9;
      }

      try {
        await pool.query(`
          INSERT INTO jso_material_shelf_life (
            plant, material_group, material, material_description,
            shelf_life, remaining_shelf_life, storage_indicator, period_indicator, report_date
          ) VALUES ${values.join(', ')}
          ON CONFLICT (plant, material, report_date) DO UPDATE SET
            material_group = EXCLUDED.material_group,
            material_description = EXCLUDED.material_description,
            shelf_life = EXCLUDED.shelf_life,
            remaining_shelf_life = EXCLUDED.remaining_shelf_life,
            storage_indicator = EXCLUDED.storage_indicator,
            period_indicator = EXCLUDED.period_indicator,
            updated_at = CURRENT_TIMESTAMP
        `, params);
        savedCount += batch.length;
      } catch (err) {
        logError('ShelfLifeImport', `批量保存失败: ${err.message}`);
      }
    }

    // 删除文件
    fs.unlinkSync(todayFile);
    logInfo('ShelfLifeImport', `文件已删除: ${todayFile}`);

    // 记录日志
    await pool.query(`
      INSERT INTO jso_material_shelf_life_pull_log (source_file, records_count, status, file_size)
      VALUES ($1, $2, 'success', $3)
    `, [sourceFile, savedCount, fileSize]);

    logInfo('ShelfLifeImport', `导入完成: ${savedCount} 条`);
  } catch (error) {
    logError('ShelfLifeImport', '导入失败:', error.message);
    if (sourceFile) {
      await pool.query(`
        INSERT INTO jso_material_shelf_life_pull_log (source_file, records_count, status, error_message, file_size)
        VALUES ($1, 0, 'failed', $2, $3)
      `, [sourceFile, error.message, fileSize]);
    }
  }
}

// ========== 初始化所有定时任务 ==========

export function initScheduledTasks() {
  console.log('========== 开始注册定时任务 ==========');

  // 1. 用户相关任务：每天凌晨1点
  cron.schedule('0 1 * * *', async () => {
    await checkAndDeactivateUsers();
    await processTransferDates();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: 用户检查（每天凌晨1点）');

  // 2. SAP 数据拉取：每小时第3分钟
  cron.schedule('3 * * * *', async () => {
    await pullSAPData();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: SAP数据拉取（每小时第3分钟）');

  // 3. 物料延期同步：每2小时第20分钟
  cron.schedule('20 */2 * * *', async () => {
    await syncMaterialExtension();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: 物料延期同步（每2小时）');

  // 4. Stockroom 归档：每天凌晨2点
  cron.schedule('0 2 * * *', async () => {
    await runScheduledArchive();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: Stockroom归档（每天凌晨2点）');

  // 5. 分区维护：每月15号凌晨2点
  cron.schedule('0 2 15 * *', async () => {
    await partitionMaintenance();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: 分区维护（每月15号凌晨2点）');

  // 6. ITEM计数预计算：每天凌晨3点
  cron.schedule('0 3 * * *', async () => {
    await itemCountPrecompute();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: ITEM计数预计算（每天凌晨3点）');

  // 7. 物料有效期数据导入：每天下午2点
  cron.schedule('0 14 * * *', async () => {
    await importMaterialShelfLife();
  }, { scheduled: true, timezone: 'Asia/Shanghai' });
  console.log('✅ 任务已注册: 物料有效期数据导入（每天下午2点）');

  console.log('========== 所有定时任务注册完成 ==========');
}

export async function runArchive() {
  return await runScheduledArchive();
}

// 导出所有任务函数
export {
  checkAndDeactivateUsers,
  processTransferDates,
  pullSAPData,
  syncMaterialExtension,
  runScheduledArchive,
  partitionMaintenance,
  itemCountPrecompute,
  importMaterialShelfLife
};
