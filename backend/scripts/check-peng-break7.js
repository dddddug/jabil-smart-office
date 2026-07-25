
const { Pool } = require('pg');
const dayjs = require('dayjs');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const SCHEDULE_TABLE = 'jso_hr_employee_schedule';

const checkBreak7 = async () => {
  try {
    const startDate = '2026-06-29';
    const endDate = '2026-07-05';
    
    console.log(`检查彭绍勇 ${startDate} 到 ${endDate} 期间的破7休1情况...\n`);
    
    // 查询彭绍勇
    const userResult = await pool.query(`
      SELECT u.id, u.real_name, u.plant_id, u.department_id
      FROM jso_system_user_management u
      WHERE u.real_name = '彭绍勇'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ 未找到彭绍勇');
      process.exit(1);
    }
    
    const peng = userResult.rows[0];
    console.log(`✅ 彭绍勇 ID: ${peng.id}`);
    
    // 查询该日期范围内的排班
    const scheduleResult = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE}
      WHERE employee_id = $1
        AND schedule_date BETWEEN $2 AND $3
      ORDER BY schedule_date
    `, [peng.id, startDate, endDate]);
    
    console.log(`\n📅 排班记录 (${scheduleResult.rows.length}条):`);
    scheduleResult.rows.forEach(row => {
      const date = dayjs(row.schedule_date).format('YYYY-MM-DD');
      const weekday = dayjs(row.schedule_date).format('ddd');
      console.log(`  ${date} (${weekday}): 班次=${row.shift}, 特殊状态=${row.special_status}`);
    });
    
    // 检查彭绍勇更大范围的排班，看看连续工作情况
    const wideStart = '2026-06-22';
    const wideEnd = '2026-07-12';
    const wideScheduleResult = await pool.query(`
      SELECT * FROM ${SCHEDULE_TABLE}
      WHERE employee_id = $1
        AND schedule_date BETWEEN $2 AND $3
      ORDER BY schedule_date
    `, [peng.id, wideStart, wideEnd]);
    
    console.log(`\n🔍 更大范围 (${wideStart} 到 ${wideEnd}) 检查连续工作:`);
    let consecutiveCount = 0;
    let startConsecDate = null;
    
    wideScheduleResult.rows.forEach(row => {
      const date = dayjs(row.schedule_date);
      const shift = row.shift;
      const specialStatus = row.special_status;
      
      // 判断这一天是否是工作日
      const isWorkDay = !specialStatus && !['调休', '请假', '年假', '旷工', '离职'].includes(shift);
      
      if (isWorkDay) {
        consecutiveCount++;
        if (!startConsecDate) {
          startConsecDate = date;
        }
        console.log(`  ${date.format('MM-DD')}: ✅ 工作 (连续 ${consecutiveCount} 天)`);
      } else {
        if (consecutiveCount >= 7) {
          console.log(`  ${date.format('MM-DD')}: 🚨 休息 - 之前从 ${startConsecDate.format('MM-DD')} 开始连续 ${consecutiveCount} 天工作!`);
        } else if (consecutiveCount > 0) {
          console.log(`  ${date.format('MM-DD')}: 🛑 休息 - 之前连续 ${consecutiveCount} 天工作`);
        } else {
          console.log(`  ${date.format('MM-DD')}: 🛑 休息`);
        }
        consecutiveCount = 0;
        startConsecDate = null;
      }
    });
    
    // 检查结束时的连续天数
    if (consecutiveCount >= 7) {
      console.log(`\n⚠️  当前连续工作 ${consecutiveCount} 天 (从 ${startConsecDate.format('MM-DD')} 开始)!`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
};

checkBreak7();
