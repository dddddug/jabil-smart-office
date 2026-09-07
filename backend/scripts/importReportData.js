/**
 * 手动导入 Report 文件夹中的 GRN 和 ITEM 数据
 * 用法: node importReportData.js
 */
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Report 文件夹路径
const REPORT_DIR = 'C:/Users/1167023/report';

// 解析 GRN 文件
function parseGRNFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const records = [];
  let inData = false;

  for (const line of lines) {
    // 跳过空行和标题行
    if (!line.trim() || line.includes('Dynamic List Display')) continue;
    if (line.includes('----')) { inData = true; continue; }
    if (!inData) continue;

    // 解析固定宽度格式的数据
    // 使用 | 作为分隔符
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 20) {
        records.push(parts);
      }
    }
  }

  return records;
}

// 解析 ITEM 文件
function parseITEMFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const records = [];
  let inData = false;

  for (const line of lines) {
    if (!line.trim() || line.includes('Dynamic List Display')) continue;
    if (line.includes('----')) { inData = true; continue; }
    if (!inData) continue;

    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 15) {
        records.push(parts);
      }
    }
  }

  return records;
}

// 导入 GRN 数据
async function importGRNData() {
  const grnFiles = fs.readdirSync(REPORT_DIR)
    .filter(f => f.startsWith('GRN_RollData-'))
    .sort();

  console.log(`\n========== 导入 GRN 数据 ==========`);
  console.log(`找到 ${grnFiles.length} 个 GRN 文件`);

  let totalRecords = 0;
  let totalImported = 0;

  for (const file of grnFiles) {
    const filePath = path.join(REPORT_DIR, file);
    console.log(`\n处理文件: ${file}`);

    const records = parseGRNFile(filePath);
    console.log(`  解析到 ${records.length} 条记录`);

    if (records.length === 0) {
      console.log(`  跳过空文件`);
      fs.unlinkSync(filePath);
      continue;
    }

    let imported = 0;
    for (const r of records) {
      try {
        let dateStr = r[12] || '';
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
        `, [
          r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11],
          dateStr, r[13], r[14], r[15], r[16], r[17], r[18], r[19], r[20], r[21], r[22], r[23], r[24], r[25]
        ]);
        imported++;
      } catch (err) {
        // 忽略重复插入错误
        if (err.code !== '23505') {
          console.error(`  导入失败: ${err.message}`);
        }
      }
    }

    console.log(`  成功导入 ${imported} 条记录`);
    totalRecords += records.length;
    totalImported += imported;

    // 删除已处理的文件
    fs.unlinkSync(filePath);
    console.log(`  已删除文件: ${file}`);
  }

  console.log(`\nGRN 导入完成: ${totalImported}/${totalRecords} 条`);

  // 同步待填充物料表
  if (totalImported > 0) {
    await syncMissingMaterialPackage();
  }

  return totalImported;
}

// 同步待填充物料表
async function syncMissingMaterialPackage() {
  console.log(`\n========== 同步待填充物料表 ==========`);

  try {
    const result = await pool.query(`
      INSERT INTO jso_missing_material_package (material, manufacturer)
      SELECT DISTINCT
        grn.material,
        grn.manufacturer
      FROM v_sap_grn_history_partitioned grn
      WHERE grn.material IS NOT NULL
        AND grn.material != ''
        AND NOT EXISTS (
          SELECT 1 FROM jso_material_package mp
          WHERE mp.part_no = grn.material
        )
      ON CONFLICT (material, COALESCE(manufacturer, '')) DO NOTHING
      RETURNING id
    `);

    console.log(`新增 ${result.rowCount} 条待填充物料`);
  } catch (err) {
    console.error(`同步失败: ${err.message}`);
  }
}

// 导入 ITEM 数据
async function importITEMData() {
  const itemFiles = fs.readdirSync(REPORT_DIR)
    .filter(f => f.startsWith('ITEM_RollData-'))
    .sort();

  console.log(`\n========== 导入 ITEM 数据 ==========`);
  console.log(`找到 ${itemFiles.length} 个 ITEM 文件`);

  let totalRecords = 0;
  let totalImported = 0;

  for (const file of itemFiles) {
    const filePath = path.join(REPORT_DIR, file);
    console.log(`\n处理文件: ${file}`);

    const records = parseITEMFile(filePath);
    console.log(`  解析到 ${records.length} 条记录`);

    if (records.length === 0) {
      console.log(`  跳过空文件`);
      fs.unlinkSync(filePath);
      continue;
    }

    let imported = 0;
    for (const r of records) {
      try {
        // date_created 格式是 MM/DD/YYYY，需要转换为 DATE
        let dateStr = r[10] || '';
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
        `, [
          r[0], r[1], dateStr, r[11] || '', r[12] || '', r[13] || '', r[14] || '', '', '', '',
          r[3] || '', r[4] || '', r[2] || '', r[5] || '', '', '', '', '', '', '', '',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        imported++;
      } catch (err) {
        if (err.code !== '23505') {
          console.error(`  导入失败: ${err.message}`);
        }
      }
    }

    console.log(`  成功导入 ${imported} 条记录`);
    totalRecords += records.length;
    totalImported += imported;

    fs.unlinkSync(filePath);
    console.log(`  已删除文件: ${file}`);
  }

  console.log(`\nITEM 导入完成: ${totalImported}/${totalRecords} 条`);

  return totalImported;
}

// 主程序
async function main() {
  console.log('='.repeat(50));
  console.log('   手动导入 Report 文件夹数据');
  console.log('='.repeat(50));
  console.log(`\nReport 目录: ${REPORT_DIR}`);

  try {
    const grnCount = await importGRNData();
    const itemCount = await importITEMData();

    console.log('\n' + '='.repeat(50));
    console.log(`导入完成! GRN: ${grnCount} 条, ITEM: ${itemCount} 条`);
    console.log('='.repeat(50));

  } catch (err) {
    console.error(`\n导入失败: ${err.message}`);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
