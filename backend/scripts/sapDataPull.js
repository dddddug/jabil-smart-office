/**
 * SAP 数据定时拉取脚本
 * 从 SAP 下载 GRN 和 ITEM 数据并导入数据库
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const REPORT_DIR = 'C:/Users/1167023/report';

// 记录拉取历史
async function logPullHistory(tableName, fileName, recordCount, status, errorMessage = null) {
  try {
    await pool.query(`
      INSERT INTO ${tableName} (file_name, record_count, status, error_message)
      VALUES ($1, $2, $3, $4)
    `, [fileName, recordCount, status, errorMessage]);
  } catch (err) {
    console.error('记录拉取历史失败:', err.message);
  }
}

// 解析 GRN 文件
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

// 解析 ITEM 文件
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

// 导入 ITEM 数据到分区表
async function importITEMData() {
  const files = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('ITEM_RollData-')).sort();
  if (files.length === 0) return 0;

  let total = 0;
  for (const file of files) {
    const filePath = path.join(REPORT_DIR, file);
    const records = parseITEMFile(filePath);

    try {
      for (const r of records) {
        // date_created 格式可能是 YYYY-MM-DD 或 MM/DD/YYYY，需要转换为 DATE
        const dateCreated = r[2]; // date_created 字段索引
        let dateStr = dateCreated;

        // 解析日期格式
        if (dateCreated && dateCreated.includes('/')) {
          // MM/DD/YYYY -> YYYY-MM-DD
          const parts = dateCreated.split('/');
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
        total++;
      }

      fs.unlinkSync(filePath);
      console.log('[ITEM] ' + file + ': ' + records.length + ' 条');
      await logPullHistory('jso_sap_item_pull_history', file, records.length, 'success');
    } catch (err) {
      console.error('[ITEM] ' + file + ' 导入失败:', err.message);
      await logPullHistory('jso_sap_item_pull_history', file, 0, 'error', err.message);
    }
  }
  return total;
}

// 导入 GRN 数据到分区表
async function importGRNData() {
  const files = fs.readdirSync(REPORT_DIR).filter(f => f.startsWith('GRN_RollData-')).sort();
  if (files.length === 0) return 0;

  let total = 0;
  for (const file of files) {
    const filePath = path.join(REPORT_DIR, file);
    const records = parseGRNFile(filePath);

    try {
      for (const r of records) {
        // creation_date 格式是 MM/DD/YYYY，需要转换为 DATE
        const creationDate = r[12]; // creation_date 字段索引
        let dateStr = creationDate;

        if (creationDate && creationDate.includes('/')) {
          // MM/DD/YYYY -> YYYY-MM-DD
          const parts = creationDate.split('/');
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
        total++;
      }

      fs.unlinkSync(filePath);
      console.log('[GRN] ' + file + ': ' + records.length + ' 条');
      await logPullHistory('jso_sap_grn_pull_history', file, records.length, 'success');
    } catch (err) {
      console.error('[GRN] ' + file + ' 导入失败:', err.message);
      await logPullHistory('jso_sap_grn_pull_history', file, 0, 'error', err.message);
    }
  }
  return total;
}

// 主函数
async function main() {
  try {
    const startTime = new Date().toISOString();
    console.log('[' + startTime + '] 开始定时拉取...');

    const itemCount = await importITEMData();
    const grnCount = await importGRNData();

    console.log('[完成] ITEM: ' + itemCount + ' 条, GRN: ' + grnCount + ' 条');

  } catch (err) {
    console.error('[错误]', err.message);
  } finally {
    await pool.end();
  }
}

main();
