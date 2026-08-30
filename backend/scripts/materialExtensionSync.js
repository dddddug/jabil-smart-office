/**
 * SAP物料延期数据同步脚本 (修复版)
 * 每小时从SAP系统拉取物料延期数据并存储到数据库
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

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || '10.114.100.171',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
};

// SAP API地址
const SAP_API_URL = 'http://cnhuam0wh01:3003/iCReportService/materialExtensionInfos/syncLatestMaterialExtensionData';

const pool = new pg.Pool(DB_CONFIG);

// 解析SAP返回的数据
function parseSAPData(data) {
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
        // SAP返回格式是 YYYY-MM-DD，直接取用
        const parts = item.extensionDate.trim().split(/[-\s]+/);
        if (parts.length >= 3) {
          const yyyy = parts[0];
          const mm = parts[1].padStart(2, '0');
          const dd = parts[2].substring(0, 2).padStart(2, '0');
          extensionDate = `${yyyy}-${mm}-${dd}`;
        }
      }
    } catch (e) {}

    try {
      if (item.updateDate) {
        // SAP返回格式是 YYYY-MM-DD HH:MM:SS，直接解析避免时区问题
        const dateTimeParts = item.updateDate.trim().split(/\s+/);
        const dateParts = dateTimeParts[0].split('-');
        if (dateParts.length === 3) {
          const yyyy = dateParts[0];
          const mm = dateParts[1].padStart(2, '0');
          const dd = dateParts[2].padStart(2, '0');
          const time = dateTimeParts[1] || '00:00:00';
          updateDate = `${yyyy}-${mm}-${dd} ${time}`;
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
      last_sync_time: lastSyncTime
    };
  }).filter(item => item.grn);
}

// 从SAP拉取数据
async function fetchFromSAP(lastSyncTime = null) {
  console.log(`[${new Date().toLocaleString('zh-CN')}] 开始拉取数据...`);

  try {
    let url = SAP_API_URL;
    if (lastSyncTime) {
      url += `?lastSyncTime=${encodeURIComponent(lastSyncTime)}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(180000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(`成功获取 ${data.data?.length || 0} 条数据`);
    return data;

  } catch (err) {
    console.error('拉取失败:', err.message);
    return null;
  }
}

// 获取上次同步时间
async function getLastSyncTime() {
  try {
    const result = await pool.query(`
      SELECT TO_CHAR(MAX(last_sync_time), 'YYYY-MM-DD HH24:MI:SS') as last_sync
      FROM jso_material_extension WHERE last_sync_time IS NOT NULL
    `);
    return result.rows[0]?.last_sync || null;
  } catch (e) {
    console.error('获取上次同步时间失败:', e.message);
    return null;
  }
}

// 逐条保存（避免ON CONFLICT问题）
async function saveToDatabase(items) {
  if (!items || items.length === 0) return 0;

  let savedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      await pool.query(`
        INSERT INTO jso_material_extension (
          grn, date_code, extension_date, extension_file_no,
          user_name, update_date, last_sync_time, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (grn) DO UPDATE SET
          date_code = EXCLUDED.date_code,
          extension_date = EXCLUDED.extension_date,
          extension_file_no = EXCLUDED.extension_file_no,
          user_name = EXCLUDED.user_name,
          update_date = EXCLUDED.update_date,
          last_sync_time = EXCLUDED.last_sync_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        item.grn,
        item.date_code,
        item.extension_date,
        item.extension_file_no,
        item.user_name,
        item.update_date,
        item.last_sync_time
      ]);

      savedCount++;
      if ((i + 1) % 10000 === 0) {
        console.log(`已处理 ${i + 1}/${items.length} 条`);
      }

    } catch (err) {
      errorCount++;
      if (errorCount <= 3) {
        console.error(`保存失败: ${err.message}`);
      }
    }
  }

  console.log(`保存完成: 成功${savedCount}, 失败${errorCount}`);
  return savedCount;
}

// 记录日志到专用表
async function logSync(count, status, errorMsg = null) {
  try {
    await pool.query(`
      INSERT INTO jso_material_extension_pull_log (source_url, records_count, status, error_message, completed_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [SAP_API_URL, count, status, errorMsg]);
  } catch (err) {
    console.error('记录日志失败:', err.message);
  }
}

// 主函数
async function main() {
  console.log('============================================================');
  console.log(`[${new Date().toLocaleString('zh-CN')}] 物料延期数据同步`);
  console.log('============================================================');

  const startTime = Date.now();

  try {
    // 获取上次同步时间，用于增量同步
    const lastSyncTime = await getLastSyncTime();
    if (lastSyncTime) {
      console.log(`上次同步时间: ${lastSyncTime}`);
    }

    const sapData = await fetchFromSAP(lastSyncTime);
    if (!sapData) {
      await logSync(0, 'failed');
      return;
    }

    const items = parseSAPData(sapData);
    console.log(`解析完成，共 ${items.length} 条有效数据`);

    const savedCount = await saveToDatabase(items);
    await logSync(savedCount, 'success');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('============================================================');
    console.log(`✅ 完成! 保存 ${savedCount} 条数据，耗时 ${duration} 秒`);

  } catch (err) {
    console.error('同步失败:', err.message);
    await logSync(0, 'failed');
  } finally {
    await pool.end();
  }
}

main();
