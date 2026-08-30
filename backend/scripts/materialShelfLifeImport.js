/**
 * 物料有效期数据导入脚本
 * - 拉取成功后删除文件
 * - 记录拉取日志到数据库
 * - 新数据覆盖旧数据
 */

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

const DB_CONFIG = {
  host: process.env.DB_HOST || '10.114.100.171',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
};

const REPORT_DIR = 'C:/Users/1167023/report';
const FILE_PREFIX = 'SQ00_MM_MM101UZH';

const pool = new pg.Pool(DB_CONFIG);

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const records = [];

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
        records.push([
          parts[0],                    // plant
          parts[1],                    // material_group
          parts[2],                    // material
          parts[3],                    // material_description
          parseInt(parts[4]) || 0,     // shelf_life
          parseInt(parts[5]) || 0,     // remaining_shelf_life
          parts[6],                    // storage_indicator
          parts[parts.length - 1],     // period_indicator (最后一个字段)
          reportDate
        ]);
      }
    }
  }
  return records;
}

async function saveBatch(records) {
  if (!records.length) return 0;

  const BATCH_SIZE = 1000;
  let savedCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    try {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const r of batch) {
        values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8})`);
        params.push(...r);
        paramIndex += 9;
      }

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
      throw err;
    }
  }

  return savedCount;
}

async function logPullResult(pool, sourceFile, recordsCount, status, errorMessage, fileSize) {
  try {
    await pool.query(`
      INSERT INTO jso_material_shelf_life_pull_log (source_file, records_count, status, error_message, file_size)
      VALUES ($1, $2, $3, $4, $5)
    `, [sourceFile, recordsCount, status, errorMessage, fileSize]);
  } catch (err) {
    console.error('记录日志失败:', err.message);
  }
}

async function main() {
  console.log('============================================================');
  console.log(`[${new Date().toLocaleString('zh-CN')}] 物料有效期数据导入`);

  const startTime = Date.now();
  let sourceFile = null;
  let fileSize = 0;

  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    sourceFile = `${FILE_PREFIX}-${today}.txt`;
    const todayFile = path.join(REPORT_DIR, sourceFile);

    if (!fs.existsSync(todayFile)) {
      console.log(`文件不存在: ${todayFile}`);
      return;
    }

    fileSize = fs.statSync(todayFile).size;
    console.log(`读取文件: ${todayFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const records = parseFile(todayFile);
    console.log(`解析完成，共 ${records.length} 条数据`);

    const savedCount = await saveBatch(records);
    console.log(`保存完成: ${savedCount} 条`);

    // 删除文件
    fs.unlinkSync(todayFile);
    console.log(`文件已删除: ${todayFile}`);

    // 记录成功日志
    await logPullResult(pool, sourceFile, savedCount, 'success', null, fileSize);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('============================================================');
    console.log(`✅ 完成! 保存 ${savedCount} 条数据，耗时 ${duration} 秒`);

  } catch (err) {
    console.error('导入失败:', err.message);
    await logPullResult(pool, sourceFile, 0, 'failed', err.message, fileSize);
  } finally {
    await pool.end();
  }
}

main();
