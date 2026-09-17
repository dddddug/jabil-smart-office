/**
 * 为历史所有日期补上特殊职位员工的工位自动分配
 */
import pool from '../config/db.js';

async function backfillWorkstationArrangements() {
  const client = await pool.connect();
  try {
    // 获取职位到工位ID的映射
    const positionToWorkstationId = {
      'Cycle Count': 16,
      'Spare part': 14,
      'MRB': 18,
      'MRO': 17
    };

    // 获取所有需要自动分配的日期（有特殊职位员工排班的日期）
    const datesResult = await client.query(`
      SELECT DISTINCT DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') as schedule_date
      FROM jso_hr_employee_schedule s
      JOIN jso_system_user_management u ON s.employee_id = u.id
      WHERE u.position IN ('Cycle Count', 'Spare part', 'MRB', 'MRO')
        AND s.shift NOT IN ('请假', '调休', '离职', '年假')
        AND u.employee_type != 'Jabil'
      ORDER BY schedule_date
    `);

    const dates = datesResult.rows.map(r => r.schedule_date);
    console.log(`共有 ${dates.length} 个日期需要处理`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let dateCount = 0;

    // 批量处理每个日期
    for (const date of dates) {
      dateCount++;
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;

      // 获取该日期需要自动分配的员工（使用排班表中的实际班次）
      const employeesResult = await client.query(`
        SELECT
          u.id as employee_id,
          u.position,
          s.shift
        FROM jso_hr_employee_schedule s
        JOIN jso_system_user_management u ON s.employee_id = u.id
        WHERE DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') = $1
          AND u.position IN ('Cycle Count', 'Spare part', 'MRB', 'MRO')
          AND s.shift NOT IN ('请假', '调休', '离职', '年假')
          AND u.employee_type != 'Jabil'
      `, [dateStr]);

      let dateInserted = 0;

      for (const emp of employeesResult.rows) {
        const wsId = positionToWorkstationId[emp.position];
        if (!wsId) continue;

        // 检查是否已存在该安排
        const existingResult = await client.query(`
          SELECT id FROM jso_hr_workstation_arrangement
          WHERE workstation_id = $1
            AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = $2
            AND employee_id = $3
        `, [wsId, dateStr, emp.employee_id]);

        if (existingResult.rows.length > 0) {
          // 更新已有的记录，使用实际班次
          await client.query(`
            UPDATE jso_hr_workstation_arrangement
            SET shift_name = $4, updated_at = CURRENT_TIMESTAMP
            WHERE workstation_id = $1
              AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = $2
              AND employee_id = $3
          `, [wsId, dateStr, emp.employee_id, emp.shift]);
          continue;
        }

        // 插入新记录，使用排班表中的实际班次
        await client.query(`
          INSERT INTO jso_hr_workstation_arrangement
          (workstation_id, arrangement_date, shift_name, employee_id)
          VALUES ($1, $2, $3, $4)
        `, [wsId, dateStr, emp.shift, emp.employee_id]);

        totalInserted++;
        dateInserted++;
      }

      if (dateCount % 10 === 0 || dateInserted > 0) {
        console.log(`进度: ${dateCount}/${dates.length} 日期 ${dateStr} - 新增 ${dateInserted} 条`);
      }
    }

    console.log(`\n完成！`);
    console.log(`  总日期数: ${dates.length}`);
    console.log(`  新增记录: ${totalInserted}`);
    console.log(`  跳过(已存在): ${totalSkipped}`);

  } catch (err) {
    console.error('执行失败:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

backfillWorkstationArrangements()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n脚本执行失败:', err);
    process.exit(1);
  });
