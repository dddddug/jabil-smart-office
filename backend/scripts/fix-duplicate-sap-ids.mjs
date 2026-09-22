/**
 * 修复工位安排表中 SAP 工号的重复数据
 * 运行一次即可
 */
import pg from 'pg';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321',
  timezone: 'Asia/Shanghai',
});

async function fixDuplicateSapIds() {
  const client = await pool.connect();

  try {
    console.log('开始修复 SAP 工号重复数据...\n');

    // 1. 查询所有有 SAP 工号的记录
    const result = await client.query(`
      SELECT id, sap_employee_id
      FROM jso_hr_workstation_arrangement
      WHERE sap_employee_id IS NOT NULL AND sap_employee_id != ''
    `);

    console.log(`找到 ${result.rows.length} 条有 SAP 工号的记录\n`);

    let fixedCount = 0;
    let alreadyCleanCount = 0;

    for (const row of result.rows) {
      const originalSapId = row.sap_employee_id;

      // 拆分、去重、重新合并
      const sapIds = originalSapId.split('&')
        .map(s => s.trim())
        .filter(Boolean);

      const uniqueSapIds = [...new Set(sapIds)];
      const deduplicatedSapId = uniqueSapIds.join('&');

      // 如果去重后与原值不同，则更新
      if (deduplicatedSapId !== originalSapId) {
        await client.query(
          `UPDATE jso_hr_workstation_arrangement SET sap_employee_id = $1 WHERE id = $2`,
          [deduplicatedSapId, row.id]
        );
        console.log(`修复: ID=${row.id}`);
        console.log(`  原值: "${originalSapId}"`);
        console.log(`  新值: "${deduplicatedSapId}"`);
        fixedCount++;
      } else {
        alreadyCleanCount++;
      }
    }

    console.log('\n========== 修复完成 ==========');
    console.log(`已修复: ${fixedCount} 条`);
    console.log(`已是干净数据: ${alreadyCleanCount} 条`);
    console.log(`总计扫描: ${result.rows.length} 条`);

    // 2. 检查蒋学军的当前数据
    console.log('\n========== 蒋学军 2026-09-19 数据检查 ==========');
    const jiangResult = await client.query(`
      SELECT
        wa.id,
        wa.arrangement_date,
        wa.sap_employee_id,
        wa.shift_name,
        wa.workstation_id
      FROM jso_hr_workstation_arrangement wa
      JOIN jso_system_user_management u ON wa.employee_id = u.id
      WHERE u.real_name = '蒋学军'
        AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') = '2026-09-19'
    `);

    if (jiangResult.rows.length === 0) {
      console.log('没有找到蒋学军 2026-09-19 的工位安排记录');
    } else {
      for (const row of jiangResult.rows) {
        console.log(`ID: ${row.id}`);
        console.log(`日期: ${row.arrangement_date}`);
        console.log(`班次: ${row.shift_name}`);
        console.log(`SAP工号: "${row.sap_employee_id}"`);
        console.log(`工位ID: ${row.workstation_id}`);
        console.log('---');
      }
    }

    // 3. 检查排班表中的数据
    console.log('\n========== 蒋学军 2026-09-19 排班数据检查 ==========');
    const scheduleResult = await client.query(`
      SELECT
        s.id,
        s.schedule_date,
        s.shift,
        s.employee_id,
        u.real_name
      FROM jso_hr_employee_schedule s
      JOIN jso_system_user_management u ON s.employee_id = u.id
      WHERE u.real_name = '蒋学军'
        AND DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') = '2026-09-19'
    `);

    if (scheduleResult.rows.length === 0) {
      console.log('没有找到蒋学军 2026-09-19 的排班记录');
    } else {
      for (const row of scheduleResult.rows) {
        console.log(`排班ID: ${row.id}`);
        console.log(`日期: ${row.schedule_date}`);
        console.log(`班次: ${row.shift}`);
        console.log('---');
      }
    }

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDuplicateSapIds();
