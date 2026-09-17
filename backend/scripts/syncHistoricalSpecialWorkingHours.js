/**
 * 历史特殊工时数据同步脚本
 * 将特殊工时页签的历史记录同步到工位安排表
 * 运行一次即可
 */
import pool from '../config/db.js';

async function syncHistoricalSpecialWorkingHours() {
  const client = await pool.connect();

  try {
    // 查找"特殊工时"工位ID
    const workstationResult = await client.query(
      `SELECT id FROM jso_config_workstation WHERE name LIKE '%特殊工时%' LIMIT 1`
    );

    if (workstationResult.rows.length === 0) {
      console.log('❌ 未找到"特殊工时"工位，请先创建该工位');
      return;
    }

    const specialWorkstationId = workstationResult.rows[0].id;
    console.log(`✅ 找到特殊工时工位，ID: ${specialWorkstationId}`);

    // 查询所有特殊工时记录（关联获取排班表中的班次）
    const specialHoursResult = await client.query(`
      SELECT
        swh.date,
        swh.event,
        swh.employee_name,
        swh.start_time,
        swh.end_time,
        u.id as employee_id,
        s.shift
      FROM jso_hr_special_working_hours swh
      LEFT JOIN jso_system_user_management u ON swh.employee_name = u.real_name
      LEFT JOIN jso_hr_employee_schedule s ON u.id = s.employee_id
        AND DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') = DATE(swh.date)
      WHERE u.id IS NOT NULL
      ORDER BY swh.date DESC
    `);

    console.log(`📊 找到 ${specialHoursResult.rows.length} 条特殊工时记录`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const record of specialHoursResult.rows) {
      try {
        // 从 PostgreSQL 提取时间部分 - 使用 SQL 直接转换
        // 注意：PostgreSQL 返回的 start_time/end_time 是 TIMESTAMP 类型
        // 需要用 SQL 提取 TIME 部分
        const timeResult = await client.query(`
          SELECT
            TO_CHAR($1::TIMESTAMP, 'HH24:MI:SS') as start_time_str,
            TO_CHAR($2::TIMESTAMP, 'HH24:MI:SS') as end_time_str
        `, [record.start_time, record.end_time]);

        const startTimeStr = timeResult.rows[0]?.start_time_str || '00:00:00';
        const endTimeStr = timeResult.rows[0]?.end_time_str || '23:59:59';

        // 使用排班表中的班次，如果没有则报错（不允许使用 default）
        const shiftName = record.shift;
        if (!shiftName) {
          console.log(`  ⚠️ 跳过（无班次）: ${record.date} - ${record.employee_name}`);
          skippedCount++;
          continue;
        }

        // 检查是否已存在工位安排记录
        const existingResult = await client.query(`
          SELECT id FROM jso_hr_workstation_arrangement
          WHERE workstation_id = $1 AND arrangement_date = $2 AND shift_name = $3 AND employee_id = $4
        `, [specialWorkstationId, record.date, shiftName, record.employee_id]);

        if (existingResult.rows.length > 0) {
          // 已存在，更新记录
          await client.query(`
            UPDATE jso_hr_workstation_arrangement
            SET start_time = $4::TIME, end_time = $5::TIME, reason = $6, updated_at = CURRENT_TIMESTAMP
            WHERE workstation_id = $1 AND arrangement_date = $2 AND shift_name = $3 AND employee_id = $7
          `, [specialWorkstationId, record.date, shiftName, startTimeStr, endTimeStr, record.event, record.employee_id]);
          skippedCount++;
          console.log(`  🔄 更新: ${record.date} - ${record.employee_name} (班次: ${shiftName})`);
        } else {
          // 不存在，插入新记录，使用实际班次
          await client.query(`
            INSERT INTO jso_hr_workstation_arrangement
            (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason)
            VALUES ($1, $2, $3, $4, $5::TIME, $6::TIME, $7)
          `, [specialWorkstationId, record.date, shiftName, record.employee_id, startTimeStr, endTimeStr, record.event]);
          syncedCount++;
          console.log(`  ✅ 同步: ${record.date} - ${record.employee_name} (班次: ${shiftName})`);
        }
      } catch (err) {
        errorCount++;
        console.error(`  ❌ 错误: ${record.employee_name} - ${err.message}`);
      }
    }

    console.log('\n========== 同步完成 ==========');
    console.log(`✅ 新增: ${syncedCount} 条`);
    console.log(`🔄 更新: ${skippedCount} 条`);
    console.log(`❌ 错误: ${errorCount} 条`);
    console.log(`📊 总计处理: ${specialHoursResult.rows.length} 条`);

  } catch (error) {
    console.error('同步失败:', error);
  } finally {
    client.release();
    // 不关闭共享 pool
  }
}

syncHistoricalSpecialWorkingHours();
