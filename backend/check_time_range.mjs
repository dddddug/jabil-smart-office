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
    // 精确检查 16号7:00-17号6:59 这个时间范围的数据
    // 包括边界情况的处理

    console.log('=== 精确时间范围检查：16号7:00-17号6:59 ===\n');

    // 1447511
    console.log('--- 1447511 ---');
    const r1 = await pool.query(`
        SELECT 
            COUNT(*) as count,
            MIN(created_at AT TIME ZONE 'Asia/Shanghai') as min_time,
            MAX(created_at AT TIME ZONE 'Asia/Shanghai') as max_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by = '1447511'
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
    `);
    console.table(r1.rows);

    // 2272967
    console.log('\n--- 2272967 ---');
    const r2 = await pool.query(`
        SELECT 
            COUNT(*) as count,
            MIN(created_at AT TIME ZONE 'Asia/Shanghai') as min_time,
            MAX(created_at AT TIME ZONE 'Asia/Shanghai') as max_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by = '2272967'
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
    `);
    console.table(r2.rows);

    // 检查17号7:00之后的数据（看是否有07:00之后的记录）
    console.log('\n--- 检查17号7:00之后的数据（应该是17号A班）===');
    const r3 = await pool.query(`
        SELECT 
            created_by,
            COUNT(*) as count,
            MIN(created_at AT TIME ZONE 'Asia/Shanghai') as min_time,
            MAX(created_at AT TIME ZONE 'Asia/Shanghai') as max_time
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 08:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by
        ORDER BY created_by
    `);
    console.table(r3.rows);

    await pool.end();
}

query().catch(console.error);
