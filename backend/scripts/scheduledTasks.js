import pool from '../config/db.js';
import dayjs from 'dayjs';
import cron from 'node-cron';

// 定义全局常量 (Global Constants)
const USER_TABLE = 'jso_system_user_management';
const TEMPORARY_OVERTIME_TABLE = 'jso_hr_temporary_overtime';
const TEMPORARY_LEAVE_TABLE = 'jso_hr_temporary_leave';
const RESIGNATION_TRANSFER_TABLE = 'jso_hr_resignation_transfer';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';

// ========== 自动停用用户功能服务 ==========

// 检查并自动停用需要停用的用户
export const checkAndDeactivateUsers = async () => {
  try {
    console.log('开始检查需要停用的用户...');

    // 获取今天日期
    const today = dayjs();

    // 查询需要停用的用户：离职日期的次月第一天 <= 今天，且状态为 active
    const result = await pool.query(`
      SELECT id, username, real_name, leave_date
      FROM ${USER_TABLE}
      WHERE status = 'active'
        AND leave_date IS NOT NULL
    `);

    let deactivatedCount = 0;

    for (const user of result.rows) {
      // 计算离职日期的次月第一天
      const leaveDate = dayjs(user.leave_date);
      const firstDayOfNextMonth = leaveDate.add(1, 'month').startOf('month');

      // 如果今天 >= 次月第一天，则需要停用
      if (today.isAfter(firstDayOfNextMonth) || today.isSame(firstDayOfNextMonth)) {
        console.log(`正在停用用户: ${user.username} (${user.real_name}) - 离职日期: ${leaveDate.format('YYYY-MM-DD')}`);

        // 更新用户状态
        await pool.query(
          `UPDATE ${USER_TABLE}
           SET status = 'inactive'
           WHERE id = $1`,
          [user.id]
        );

        deactivatedCount++;
      }
    }

    if (deactivatedCount > 0) {
      console.log(`成功停用 ${deactivatedCount} 个用户`);
    } else {
      console.log('没有需要停用的用户');
    }
  } catch (error) {
    console.error('检查并停用用户失败:', error);
  }
};

// 每周一自动提交临时加班和临时请假的定时任务
export const autoSubmitTemporaryLeaves = async () => {
  try {
    console.log('开始检查需要自动提交的临时加班和临时请假...');

    const [overtimeResult, leaveResult] = await Promise.all([
      pool.query(
        `UPDATE ${TEMPORARY_OVERTIME_TABLE}
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'pending'
         RETURNING *`
      ),
      pool.query(
        `UPDATE ${TEMPORARY_LEAVE_TABLE}
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'pending'
         RETURNING *`
      )
    ]);

    const totalCount = overtimeResult.rows.length + leaveResult.rows.length;

    if (totalCount > 0) {
      console.log(`成功自动提交 ${totalCount} 条记录`);
    } else {
      console.log('没有需要自动提交的记录');
    }
  } catch (error) {
    console.error('自动提交临时加班和临时请假失败:', error);
  }
};

// 处理转岗日期到期的定时任务
export const processTransferDates = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('开始检查转岗日期到期的记录...');

    // 查找已审批通过且转岗日期已到的记录
    const today = new Date();
    const result = await client.query(
      `SELECT f.*, p.id as transfer_plant_id
       FROM ${RESIGNATION_TRANSFER_TABLE} f
       LEFT JOIN ${DEPT_TABLE} d ON f.transfer_department_id = d.id
       LEFT JOIN ${PLANT_TABLE} p ON d.plant_id = p.id
       WHERE f.type = '转岗'
         AND f.status = 'approved'
         AND f.transfer_date <= CURRENT_DATE
         AND f.processed = FALSE`,
      []
    );

    if (result.rows.length > 0) {
      console.log(`找到 ${result.rows.length} 条需要处理的转岗记录`);

      for (const record of result.rows) {
        // 更新用户的厂区和部门
        await client.query(
          `UPDATE ${USER_TABLE}
           SET plant_id = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [record.transfer_plant_id, record.transfer_department_id, record.employee_id]
        );

        // 标记记录为已处理
        await client.query(
          `UPDATE ${RESIGNATION_TRANSFER_TABLE}
           SET processed = TRUE, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [record.id]
        );

        console.log(`已处理员工 ${record.employee_id} 的转岗`);
      }
    } else {
      console.log('没有需要处理的转岗记录');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('处理转岗日期失败:', error);
  } finally {
    client.release();
  }
};

export const initScheduledTasks = () => {
  // 设置定时任务：每天凌晨1点执行一次
  cron.schedule('0 1 * * *', () => {
    console.log('定时任务：检查需要停用的用户');
    checkAndDeactivateUsers();
    console.log('定时任务：检查转岗日期到期');
    processTransferDates();
  });

  console.log('定时任务已设置：每天凌晨1点检查需要停用的用户和转岗日期');

  // 设置定时任务：每周一早上8点自动提交临时加班和临时请假
  cron.schedule('0 8 * * 1', () => {
    console.log('定时任务：自动提交临时加班和临时请假');
    autoSubmitTemporaryLeaves();
  });

  console.log('定时任务已设置：每周一早上8点自动提交临时加班和临时请假');
};
