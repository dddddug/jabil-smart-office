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
    // 1. 检查这两个SAP工号在数据库中的总数（不受时间限制）
    console.log('=== 1. 无时间限制的IWS总数 ===');
    const totalResult = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(totalResult.rows);

    // 2. 检查这两个SAP工号在不同时间范围的计数
    console.log('\n=== 2. 16号全天的IWS计数（0:00-23:59）===');
    const fullDay = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 00:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-17 00:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(fullDay.rows);

    // 3. 检查0:00-6:59的记录（这部分属于前一天C班）
    console.log('\n=== 3. 16号0:00-6:59的IWS计数（属于前一天C班）===');
    const morning = await pool.query(`
        SELECT 
            created_by,
            trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned
        WHERE created_by IN ('1447511', '2272967')
            AND trans = 'IWS'
            AND created_at >= '2026-09-16 00:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND created_at < '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY created_by, trans
        ORDER BY created_by
    `);
    console.table(morning.rows);

    // 4. 检查这两个员工是否在其他SAP工号下也有记录（多工号问题）
    console.log('\n=== 4. 查找这两个SAP工号可能关联的其他记录（员工名查询）===');
    const employeeInfo = await pool.query(`
        SELECT id, real_name, sap_employee_id, old_employee_id
        FROM jso_system_user_management
        WHERE sap_employee_id LIKE '%1447511%' 
           OR sap_employee_id LIKE '%2272967%'
           OR old_employee_id = '1447511'
           OR old_employee_id = '2272967'
    `);
    console.table(employeeInfo.rows);

    // 5. 查询16号7:00-17号6:59内这两个员工的所有SAP工号下的IWS
    console.log('\n=== 5. 检查这两个员工所有关联SAP工号的IWS（16号7:00-17号6:59）===');
    const allIws = await pool.query(`
        SELECT 
            t.created_by,
            t.trans,
            COUNT(*) as count
        FROM jso_sap_grn_history_partitioned t
        WHERE t.created_by IN (
            SELECT DISTINCT sap_employee_id 
            FROM jso_system_user_management 
            WHERE sap_employee_id LIKE '%1447511%' 
               OR sap_employee_id LIKE '%2272967%'
               OR old_employee_id IN ('1447511', '2272967')
        )
            AND t.trans = 'IWS'
            AND t.created_at >= '2026-09-16 07:00:00' AT TIME ZONE 'Asia/Shanghai'
            AND t.created_at < '2026-09-17 07:00:00' AT TIME ZONE 'Asia/Shanghai'
        GROUP BY t.created_by, t.trans
        ORDER BY t.created_by
    `);
    console.table(allIws.rows);
    console.log('总计:', allIws.rows.reduce((sum, r) => sum + parseInt(r.count), 0));

    await pool.end();
}

query().catch(console.error);
