import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  timezone: 'Asia/Shanghai',
});

async function query() {
    // 查询两个SAP工号在 16号7:00-17号6:59 的 IWS 计数
    const result = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count,
            COUNT(DISTINCT reference) as unique_reference
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.log('=== 16号7:00-17号6:59 IWS计数 ===');
    console.table(result.rows);
    
    // 查询详细信息
    const detail = await pool.query(`
        SELECT 
            created_by,
            trans,
            reference,
            created_at AT TIME ZONE 'Asia/Shanghai' as local_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        ORDER BY created_by, created_at
    `);
    console.log('\n=== 详细记录 ===');
    detail.rows.forEach(row => {
        console.log(`${row.created_by} | ${row.trans} | ${row.reference} | ${row.local_time}`);
    });
    
    console.log(`\n总计: 1447511=${result.rows.find(r => r.created_by === '1447511')?.count || 0}, 2272967=${result.rows.find(r => r.created_by === '2272967')?.count || 0}`);
    
    await pool.end();
}

query().catch(console.error);
