const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const cleanDuplicateData = async () => {
  try {
//     console.log('开始清理重复数�?..\n');
    
    // 1. 查找临时加班的重复数�?    console.log('1. 检查临时加班重复数�?..');
    const overtimeDupResult = await pool.query(`
      SELECT employee_id, overtime_date, start_time, end_time, COUNT(*) as count
      FROM jso_hr_temporary_overtime
      GROUP BY employee_id, overtime_date, start_time, end_time
      HAVING COUNT(*) > 1
    `);
    
    if (overtimeDupResult.rows.length > 0) {
//       console.log(`找到 ${overtimeDupResult.rows.length} 组重复数据，�?${overtimeDupResult.rows.reduce((sum, r) => sum + r.count, 0) - overtimeDupResult.rows.length} 条重复记录`);
      
      // 删除重复数据，保留最早的一�?      const deleteOvertimeResult = await pool.query(`
        DELETE FROM jso_hr_temporary_overtime
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM jso_hr_temporary_overtime
          GROUP BY employee_id, overtime_date, start_time, end_time
        )
      `);
//       console.log(`已删�?${deleteOvertimeResult.rowCount} 条临时加班重复数据\n`);
    } else {
//       console.log('临时加班没有重复数据\n');
    }
    
    // 2. 检查临时请假的重复数据
//     console.log('2. 检查临时请假重复数�?..');
    const tempLeaveDupResult = await pool.query(`
      SELECT employee_id, leave_type, start_date, end_date, COUNT(*) as count
      FROM jso_hr_temporary_leave
      GROUP BY employee_id, leave_type, start_date, end_date
      HAVING COUNT(*) > 1
    `);
    
    if (tempLeaveDupResult.rows.length > 0) {
//       console.log(`找到 ${tempLeaveDupResult.rows.length} 组重复数据，�?${tempLeaveDupResult.rows.reduce((sum, r) => sum + r.count, 0) - tempLeaveDupResult.rows.length} 条重复记录`);
      
      const deleteTempLeaveResult = await pool.query(`
        DELETE FROM jso_hr_temporary_leave
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM jso_hr_temporary_leave
          GROUP BY employee_id, leave_type, start_date, end_date
        )
      `);
//       console.log(`已删�?${deleteTempLeaveResult.rowCount} 条临时请假重复数据\n`);
    } else {
//       console.log('临时请假没有重复数据\n');
    }
    
    // 3. 检查正式请假的重复数据
//     console.log('3. 检查正式请假重复数�?..');
    const formalLeaveDupResult = await pool.query(`
      SELECT employee_id, leave_type, start_date, end_date, COUNT(*) as count
      FROM jso_hr_formal_leave
      GROUP BY employee_id, leave_type, start_date, end_date
      HAVING COUNT(*) > 1
    `);
    
    if (formalLeaveDupResult.rows.length > 0) {
//       console.log(`找到 ${formalLeaveDupResult.rows.length} 组重复数据，�?${formalLeaveDupResult.rows.reduce((sum, r) => sum + r.count, 0) - formalLeaveDupResult.rows.length} 条重复记录`);
      
      const deleteFormalLeaveResult = await pool.query(`
        DELETE FROM jso_hr_formal_leave
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM jso_hr_formal_leave
          GROUP BY employee_id, leave_type, start_date, end_date
        )
      `);
//       console.log(`已删�?${deleteFormalLeaveResult.rowCount} 条正式请假重复数据\n`);
    } else {
//       console.log('正式请假没有重复数据\n');
    }
    
    // 显示清理后的统计
//     console.log('清理完成！当前数据统计：');
    
    const overtimeStats = await pool.query('SELECT COUNT(*) FROM jso_hr_temporary_overtime');
//     console.log(`临时加班�?{overtimeStats.rows[0].count} 条`);
    
    const tempLeaveStats = await pool.query('SELECT COUNT(*) FROM jso_hr_temporary_leave');
//     console.log(`临时请假�?{tempLeaveStats.rows[0].count} 条`);
    
    const formalLeaveStats = await pool.query('SELECT COUNT(*) FROM jso_hr_formal_leave');
//     console.log(`正式请假�?{formalLeaveStats.rows[0].count} 条`);
    
  } catch (error) {
    console.error('清理重复数据失败:', error);
  } finally {
    await pool.end();
  }
};

cleanDuplicateData();
