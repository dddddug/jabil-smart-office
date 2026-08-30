/**
 * 从网络路径读取GRN历史数据并导入到数据库
 * 数据源：\\CNHUAM0AWSFGW01\s3000-475137724643-hua-icdata\System\Z_HISTORY_GRN
 */
import pg from 'pg';
import { execSync } from 'child_process';

const pool = new pg.Pool({
  host: process.env.DB_HOST || '10.114.100.171',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321'
});

const NETWORK_PATH = '\\\\CNHUAM0AWSFGW01\\s3000-475137724643-hua-icdata\\System\\Z_HISTORY_GRN';

function readFileWithPowerShell(filePath) {
  try {
    const escapedPath = filePath.replace(/'/g, "''");
    const cmd = `powershell -Command "Get-Content -Path '${escapedPath}' -Encoding UTF8"`;
    return execSync(cmd, { encoding: 'utf8', timeout: 60000 });
  } catch (error) {
    console.error(`读取文件失败: ${error.message}`);
    return '';
  }
}

function parseGrnTextFile(content) {
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('+') && !line.startsWith('='));
  const records = [];

  let dataStarted = false;
  for (const line of lines) {
    if (line.includes('History of the movements')) {
      dataStarted = false;
      continue;
    }

    if (line.includes('--------') || line.includes('Whse No.')) {
      dataStarted = true;
      continue;
    }

    if (!dataStarted) continue;

    const parts = line.split('|').map(p => p.trim()).filter(p => p);

    if (parts.length >= 12) {
      const dateStr = parts[7] || '';
      const timeStr = parts[8] || '';

      // 日期格式: MM-DD-YYYY
      let grDate = null;
      if (dateStr && dateStr.includes('-')) {
        const dateParts = dateStr.split('-');
        if (dateParts.length === 3) {
          // 转换为 YYYY-MM-DD
          grDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        }
      }

      // 数量格式: 1,000.000 -> 1000
      let qty = 0;
      const qtyStr = parts[10] || '';
      const cleanQty = qtyStr.replace(/,/g, '');
      qty = parseFloat(cleanQty) || 0;

      records.push({
        warehouse: parts[0] || '',
        material: parts[1] || '',
        movmt_type: parts[2] || '',
        trans: parts[3] || '',
        from_sloc: parts[4] || '',
        reference: parts[5] || '',
        gr_document: parts[6] || '',
        creation_date: grDate,
        creation_time: timeStr,
        created_by: parts[9] || '',
        quantity: qty,
        to_number: parts[11] || ''
      });
    }
  }

  return records;
}

function getGrnFiles() {
  try {
    const result = execSync(`powershell -Command "Get-ChildItem -Path '${NETWORK_PATH}' -Filter '*.txt' | Select-Object -ExpandProperty FullName"`, {
      encoding: 'utf8',
      timeout: 60000
    });
    return result.split('\n').map(line => line.trim()).filter(line => line.endsWith('.txt'));
  } catch (error) {
    console.error('获取文件列表失败:', error.message);
    return [];
  }
}

async function importData() {
  console.log('🚀 开始从网络路径导入GRN历史数据到分区表...');
  console.log('路径:', NETWORK_PATH);

  console.log('⚠️ 注意：不再清空分区表，直接追加数据');

  const files = getGrnFiles();
  console.log(`📁 找到 ${files.length} 个文件`);

  let totalRecords = 0;
  let totalFiles = 0;

  for (const filePath of files) {
    try {
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
      console.log(`📖 读取文件: ${fileName}`);

      const content = readFileWithPowerShell(filePath);
      if (!content) {
        console.log(`   ⚠️ 文件内容为空`);
        continue;
      }

      const records = parseGrnTextFile(content);

      if (records.length === 0) {
        console.log(`   ⚠️ 无有效数据`);
        continue;
      }

      // 批量插入到分区表
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const values = [];
        const params = [];
        let paramIndex = 1;

        for (const r of batch) {
          values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);

          // 转换日期格式 MM/DD/YYYY -> YYYY-MM-DD
          let creationDate = null;
          if (r.creation_date) {
            const parts = r.creation_date.split('-');
            if (parts.length === 3) {
              creationDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
          }

          params.push(
            r.gr_document,    // gr_document
            creationDate,     // creation_date (DATE)
            r.warehouse || 'T01',  // plant
            r.warehouse || 'MAIN', // warehouse
            r.material,      // material
            r.quantity,      // quantity
            r.to_number,     // to_number
            r.movmt_type,    // movmt_type
            r.trans,         // trans
            r.from_sloc,     // from_sloc
            r.created_by     // created_by
          );
        }

        await pool.query(`
          INSERT INTO jso_sap_grn_history_partitioned (
            gr_document, creation_date, plant, warehouse, material, quantity,
            to_number, movmt_type, trans, from_sloc, created_by
          ) VALUES ${values.join(', ')}
          ON CONFLICT DO NOTHING
        `, params);
      }

      totalRecords += records.length;
      totalFiles++;
      console.log(`   ✅ 导入 ${records.length} 条记录`);

    } catch (error) {
      console.error(`   ❌ 导入失败:`, error.message);
    }
  }

  console.log(`\n📊 导入完成！`);
  console.log(`   文件数: ${totalFiles}`);
  console.log(`   记录数: ${totalRecords}`);

  await pool.end();
}

importData().catch(console.error);
