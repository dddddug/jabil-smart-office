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
    // 检查16号这个日期范围内，所有IWS记录的时间分布
    console.log('=== 1447511 和 2272967 在16号全天的IWS时间分布 ===\n');
    
    // 按小时统计
    console.log('--- 1447511 按小时分布 ---');
    const h1 = await pool.query(`
        SELECT 
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Shanghai') as hour,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by = '1447511'
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 00:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY hour
        ORDER BY hour
    `);
    console.table(h1.rows);
    console.log('总计:', h1.rows.reduce((sum, r) => sum + parseInt(r.count), 0));

    console.log('\n--- 2272967 按小时分布 ---');
    const h2 = await pool.query(`
        SELECT 
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Shanghai') as hour,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by = '2272967'
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 00:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY hour
        ORDER BY hour
    `);
    console.table(h2.rows);
    console.log('总计:', h2.rows.reduce((sum, r) => sum + parseInt(r.count), 0));

    // 检查最新的IWS记录时间（看数据同步到什么时候）
    console.log('\n--- 最新IWS记录时间 ---');
    const latest = await pool.query(`
        SELECT 
            created_by,
            MAX(created_at AT TIME ZONE 'Asia/Shanghai') as latest_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
        GROUP BY created_by
    `);
    console.table(latest.rows);

    await pool.end();
}

query().catch(console.error);
