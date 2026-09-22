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
    // 1. 16号7:00-23:59
    console.log('=== 1. 16号7:00-23:59 ===');
    const result1 = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-16 23:59:59' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(result1.rows);

    // 2. 17号0:00-6:59（属于16号C班）
    console.log('\n=== 2. 17号0:00-6:59（属于16号C班）===');
    const result2 = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(result2.rows);

    // 3. 合并：16号7:00 + 17号0:00-6:59 = 16号OLE班次日
    console.log('\n=== 3. 汇总：16号7:00-17号6:59 ===');
    const result3 = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND (
                (created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai' 
                 AND created_at < '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai')
                OR
                (created_at >= '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai' 
                 AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai')
            )
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(result3.rows);

    // 4. 检查16号23:00-17号7:00之间有没有数据（可能有跨天问题）
    console.log('\n=== 4. 16号23:00-17号7:00的记录 ===');
    const result4 = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count,
            MIN(created_at AT TIME ZONE 'Asia/Shanghai') as min_time,
            MAX(created_at AT TIME ZONE 'Asia/Shanghai') as max_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 23:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(result4.rows);

    await pool.end();
}

query().catch(console.error);
