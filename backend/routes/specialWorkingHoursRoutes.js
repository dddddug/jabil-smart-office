import express from 'express';
import fs from 'fs';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import path, { dirname } from 'path';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { createExcelMemoryUpload } from '../utils/fileUtils.js';
import { parseExcel } from '../utils/excelUtils.js';
import { buildWhereClause, buildPagination } from '../utils/sqlUtils.js';
import { SPECIAL_WORKING_HOURS_TABLE, USER_TABLE, WORKSTATION_ARRANGEMENT_TABLE, WORKSTATION_TABLE } from '../config/db_constants.js';
import { handleSpecialWorkingHoursUpload } from '../services/batchUploadService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const memoryUpload = createExcelMemoryUpload();

// 获取特殊工时列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, event, employeeName, startDate, endDate, pageNum = 1, pageSize = 10 } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(pageNum, pageSize);

    const where = buildWhereClause([
      { sql: ' AND date >= ?', value: startDate },
      { sql: ' AND date <= ?', value: endDate },
      { sql: ' AND date = ?', value: date },
      { sql: ' AND event ILIKE ?', value: event, transform: (val) => `%${val}%` },
      { sql: ' AND employee_name ILIKE ?', value: employeeName, transform: (val) => `%${val}%` }
    ]);

    const query = `
      SELECT id, date, event, employee_name, old_employee_id, start_time, end_time, registered_by
      FROM ${SPECIAL_WORKING_HOURS_TABLE}
    ` + where.clause + ` ORDER BY date DESC, start_time DESC LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`;
    const result = await pool.query(query, [...where.values, limit, offset]);

    const totalQuery = `SELECT COUNT(*) FROM ${SPECIAL_WORKING_HOURS_TABLE}` + where.clause;
    const totalResult = await pool.query(totalQuery, where.values);
    const total = parseInt(totalResult.rows[0].count, 10);

    const specialWorkingHours = result.rows.map(row => ({
      id: row.id,
      date: dayjs(row.date).format('YYYY-MM-DD'),
      event: row.event,
      employeeName: row.employee_name,
      oldEmployeeId: row.old_employee_id,
      startTime: dayjs(row.start_time).format('HH:mm'),
      endTime: dayjs(row.end_time).format('HH:mm'),
      registeredBy: row.registered_by
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: specialWorkingHours,
        total: total,
        pageNum: parseInt(pageNum, 10),
        pageSize: parseInt(pageSize, 10)
      }
    });
  } catch (error) {
    console.error('获取特殊工时失败:', error);
    res.status(500).json({ code: 500, message: '获取特殊工时失败' });
  }
});

// 新增单条特殊工时记录
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, event, employeeNames, startTime, endTime } = req.body;

    if (!date || !event || !employeeNames || employeeNames.length === 0 || !startTime || !endTime) {
      return res.status(400).json({ code: 400, message: '所有字段为必填项' });
    }

    const startDateTimeStr = date + ' ' + startTime;
    const endDateTimeStr = date + ' ' + endTime;

    const combinedStartTime = dayjs(startDateTimeStr);
    const combinedEndTime = dayjs(endDateTimeStr);

    if (!combinedStartTime.isValid() || !combinedEndTime.isValid()) {
      return res.status(400).json({ code: 400, message: '日期时间格式无效' });
    }

    const startDay = combinedStartTime.format('YYYY-MM-DD');
    const endDay = combinedEndTime.format('YYYY-MM-DD');
    if (startDay !== endDay) {
      return res.status(400).json({ code: 400, message: '开始时间、结束时间不允许跨天' });
    }

    const userResult = await pool.query(`SELECT real_name FROM ${USER_TABLE} WHERE id = $1`, [req.user.id]);
    const registeredBy = userResult.rows.length > 0 ? userResult.rows[0].real_name : '未知用户';

    const recordsToInsert = [];
    for (const employeeName of employeeNames) {
      const userResult = await pool.query(
        `SELECT old_employee_id FROM ${USER_TABLE} WHERE real_name = $1`,
        [employeeName]
      );
      if (userResult.rows.length === 0) {
        return res.status(400).json({ code: 400, message: `未找到匹配的员工姓名：${employeeName}` });
      }
      const oldEmployeeId = userResult.rows[0].old_employee_id;

      recordsToInsert.push({
        date: date,
        event: event,
        employee_name: employeeName,
        old_employee_id: oldEmployeeId,
        start_time: startDateTimeStr,
        end_time: endDateTimeStr,
        registered_by: registeredBy
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 查找"特殊工时"工位ID
      const workstationResult = await client.query(
        `SELECT id FROM ${WORKSTATION_TABLE} WHERE name LIKE '%特殊工时%' LIMIT 1`
      );
      const specialWorkstationId = workstationResult.rows.length > 0 ? workstationResult.rows[0].id : null;

      const insertedRows = [];
      for (const record of recordsToInsert) {
        // 插入特殊工时记录
        const result = await client.query(
          `INSERT INTO ${SPECIAL_WORKING_HOURS_TABLE}
           (date, event, employee_name, old_employee_id, start_time, end_time, registered_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [record.date, record.event, record.employee_name, record.old_employee_id, record.start_time, record.end_time, record.registered_by]
        );
        insertedRows.push(result.rows[0]);

        // 同步创建工位安排记录（如果有特殊工时工位）
        if (specialWorkstationId) {
          // 获取用户的主键 ID（不是 old_employee_id）
          const userResult = await client.query(
            `SELECT id FROM ${USER_TABLE} WHERE real_name = $1 LIMIT 1`,
            [record.employee_name]
          );
          const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;

          if (userId) {
            // 从排班表获取该员工的班次
            const scheduleResult = await client.query(
              `SELECT shift FROM jso_hr_employee_schedule
               WHERE employee_id = $1
                 AND DATE(schedule_date AT TIME ZONE 'Asia/Shanghai') = DATE($2::text)
               LIMIT 1`,
              [userId, record.date]
            );
            const shiftName = scheduleResult.rows.length > 0 ? scheduleResult.rows[0].shift : null;

            if (!shiftName) {
              // 如果没有找到班次，不插入工位安排记录
              console.log(`⚠️ 跳过工位安排（无班次）: ${record.employee_name} @ ${record.date}`);
            } else {
              // 提取时间部分 (HH:mm:ss)
              const timeParts = record.start_time.split(' ')[1] || record.start_time;
              const endTimeParts = record.end_time.split(' ')[1] || record.end_time;

              await client.query(
                `INSERT INTO ${WORKSTATION_ARRANGEMENT_TABLE}
                 (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason)
                 VALUES ($1, $2, $3, $4, $5::TIME, $6::TIME, $7)
                 ON CONFLICT (workstation_id, arrangement_date, shift_name, employee_id, start_time)
                 DO UPDATE SET end_time = $6::TIME, reason = $7, updated_at = CURRENT_TIMESTAMP`,
                [specialWorkstationId, record.date, shiftName, userId, timeParts, endTimeParts, record.event]
              );
            }
          }
        }
      }
      await client.query('COMMIT');
      res.status(201).json({ code: 201, message: '特殊工时记录添加成功', data: insertedRows });
    } catch (transactionError) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    console.error('特殊工时事务处理失败:', transactionError);
    throw transactionError;
    } finally {
      client.release();
    }
  } catch (error) {
    // 确保事务回滚
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    console.error('创建特殊工时记录失败:', error);
    res.status(500).json({ code: 500, message: '创建特殊工时记录失败', error: error.message });
  }
});

// 批量删除特殊工时记录
router.delete('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids, employeeName, date, event } = req.query;

    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (idList.length === 0) {
        return res.status(400).json({ error: '请提供有效的特殊工时记录ID' });
      }

      const placeholders = idList.map((_, index) => `$${index + 1}`).join(', ');

      const recordsToDelete = await client.query(
        `SELECT date, employee_name FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE id IN (${placeholders})`,
        idList
      );

      await client.query('BEGIN');

      const deleteResult = await client.query(
        `DELETE FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE id IN (${placeholders}) RETURNING *`,
        idList
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '没有找到匹配的特殊工时记录进行删除' });
      }

      for (const record of recordsToDelete.rows) {
        await client.query(
          `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE}
           WHERE arrangement_date = $1
           AND employee_id IN (SELECT id FROM ${USER_TABLE} WHERE real_name = $2)
           AND workstation_id IN (SELECT id FROM jso_config_workstation WHERE name LIKE '%特殊工时%')`,
          [record.date, record.employee_name]
        );
      }

      await client.query('COMMIT');
      return res.json({ success: true, deletedCount: deleteResult.rows.length });
    }

    if (employeeName && date && event) {
      await client.query('BEGIN');

      const deleteResult = await client.query(
        `DELETE FROM ${SPECIAL_WORKING_HOURS_TABLE}
         WHERE employee_name = $1 AND date = $2 AND event = $3 RETURNING *`,
        [employeeName, date, event]
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '没有找到匹配的特殊工时记录进行删除' });
      }

      await client.query(
        `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE}
         WHERE arrangement_date = $1
         AND employee_id IN (SELECT id FROM ${USER_TABLE} WHERE real_name = $2)
         AND workstation_id IN (SELECT id FROM jso_config_workstation WHERE name LIKE '%特殊工时%')`,
        [date, employeeName]
      );

      await client.query('COMMIT');
      return res.json({ success: true, deletedCount: deleteResult.rows.length });
    }

    return res.status(400).json({ error: '请提供要删除的特殊工时记录ID或员工姓名、日期、事件名称' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('批量删除特殊工时记录失败:', error);
    res.status(500).json({ error: '批量删除特殊工时记录失败' });
  } finally {
    client.release();
  }
});

// 下载特殊工时导入模板
router.get('/template', authenticateToken, async (req, res) => {
  try {
    // 获取事项列表
    const eventResult = await pool.query(`SELECT DISTINCT event FROM ${SPECIAL_WORKING_HOURS_TABLE} ORDER BY event LIMIT 10`);
    const events = eventResult.rows.map(r => r.event);

    // 创建Excel模板
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('特殊工时导入');

    // 设置列头
    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '事项', key: 'event', width: 25 },
      { header: '姓名', key: 'employeeName', width: 15 },
      { header: '开始时间', key: 'startTime', width: 15 },
      { header: '结束时间', key: 'endTime', width: 15 }
    ];

    // 添加表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' }
    };

    // 添加示例数据
    const today = dayjs().format('YYYY-MM-DD');
    const eventsExample = events.length > 0 ? events[0] : '请选择事项';

    // 示例行（黄色字体标记为示例，请删除后填写实际数据）
    const exampleRow = worksheet.addRow({
      date: today,
      event: eventsExample,
      employeeName: '示例员工姓名',
      startTime: '09:00',
      endTime: '12:00'
    });
    exampleRow.font = { color: { argb: 'FFFF0000' } };

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('特殊工时导入模板.xlsx'));

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('生成特殊工时导入模板失败:', error);
    res.status(500).json({ message: '生成导入模板失败' });
  }
});

// 批量导入特殊工时
router.post('/import', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const userResult = await pool.query(`SELECT real_name FROM ${USER_TABLE} WHERE id = $1`, [req.user.id]);
    const registeredBy = userResult.rows.length > 0 ? userResult.rows[0].real_name : '未知用户';
    const result = await handleSpecialWorkingHoursUpload(rows, registeredBy);

    if (!result.success) {
      return res.status(400).json({ code: 400, message: '数据验证失败', details: result.errors });
    }

    res.json({
      code: 200,
      message: `成功导入 ${result.insertedCount} 条特殊工时记录`,
      data: {
        insertedCount: result.insertedCount,
        errors: result.errors,
        ids: result.ids
      }
    });
  } catch (error) {
    console.error('批量导入特殊工时失败:', error);
    res.status(500).json({ code: 500, message: '批量导入失败', error: error.message });
  }
});

// 导出特殊工时
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { date, event, employeeName, startDate, endDate } = req.query;

    const where = buildWhereClause([
      { sql: ' AND date >= ?', value: startDate },
      { sql: ' AND date <= ?', value: endDate },
      { sql: ' AND date = ?', value: date?.trim() ? date : undefined },
      { sql: ' AND event ILIKE ?', value: event?.trim(), transform: (val) => `%${val}%` },
      { sql: ' AND employee_name ILIKE ?', value: employeeName?.trim(), transform: (val) => `%${val}%` }
    ]);

    const query = `
      SELECT id, date, event, employee_name, old_employee_id, start_time, end_time, registered_by
      FROM ${SPECIAL_WORKING_HOURS_TABLE}
    ` + where.clause + ` ORDER BY date DESC, start_time DESC`;

    const result = await pool.query(query, where.values);
    const specialWorkingHours = result.rows;

    // 统计各事项用时
    const statsQuery = `
      SELECT event,
             SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as total_hours
      FROM ${SPECIAL_WORKING_HOURS_TABLE}
    ` + where.clause + ` GROUP BY event ORDER BY total_hours DESC`;

    const statsResult = await pool.query(statsQuery, where.values);
    const eventStats = statsResult.rows;

    // 计算总计用时
    const totalHours = eventStats.reduce((sum, row) => sum + parseFloat(row.total_hours || 0), 0);

    const workbook = new ExcelJS.Workbook();

    // 第一个Sheet：特殊工时记录
    const worksheet = workbook.addWorksheet('特殊工时记录');

    // 设置列头
    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '事项', key: 'event', width: 25 },
      { header: '工号', key: 'oldEmployeeId', width: 15 },
      { header: '姓名', key: 'employeeName', width: 15 },
      { header: '开始时间', key: 'startTime', width: 15 },
      { header: '结束时间', key: 'endTime', width: 15 },
      { header: '用时(小时)', key: 'hours', width: 15 },
      { header: '登记人', key: 'registeredBy', width: 15 }
    ];

    // 添加数据
    specialWorkingHours.forEach(row => {
      const start = dayjs(row.start_time);
      const end = dayjs(row.end_time);
      const hours = end.diff(start, 'hour', true);
      worksheet.addRow({
        date: dayjs(row.date).format('YYYY-MM-DD'),
        event: row.event,
        oldEmployeeId: row.old_employee_id,
        employeeName: row.employee_name,
        startTime: dayjs(row.start_time).format('HH:mm'),
        endTime: dayjs(row.end_time).format('HH:mm'),
        hours: hours.toFixed(1),
        registeredBy: row.registered_by
      });
    });

    // 第二个Sheet：统计汇总
    const statsSheet = workbook.addWorksheet('用时统计');

    statsSheet.columns = [
      { header: '事项', key: 'event', width: 30 },
      { header: '用时(小时)', key: 'totalHours', width: 15 }
    ];

    // 添加各事项用时
    eventStats.forEach(row => {
      statsSheet.addRow({
        event: row.event,
        totalHours: parseFloat(row.total_hours || 0).toFixed(1)
      });
    });

    // 添加空白行和总计
    statsSheet.addRow({ event: '', totalHours: '' });
    statsSheet.addRow({ event: '总计', totalHours: totalHours.toFixed(1) });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('特殊工时记录.xlsx'));

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('导出特殊工时失败:', error);
    res.status(500).json({ code: 500, message: '导出特殊工时失败', error: error.message });
  }
});

export default router;
