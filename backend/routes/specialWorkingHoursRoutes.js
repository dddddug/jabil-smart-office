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
import { SPECIAL_WORKING_HOURS_TABLE, USER_TABLE, WORKSTATION_ARRANGEMENT_TABLE } from '../config/db_constants.js';
import { handleSpecialWorkingHoursUpload } from '../services/batchUploadService.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件

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

    // 组合日期和时间 - 更稳健的处理
    const startDateTimeStr = date + ' ' + startTime;
    const endDateTimeStr = date + ' ' + endTime;

    const combinedStartTime = dayjs(startDateTimeStr);
    const combinedEndTime = dayjs(endDateTimeStr);

    // 验证日期格式
    if (!combinedStartTime.isValid() || !combinedEndTime.isValid()) {
      return res.status(400).json({ code: 400, message: '日期时间格式无效' });
    }

    // 业务强制规则：开始时间、结束时间不允许跨天
    const startDay = combinedStartTime.format('YYYY-MM-DD');
    const endDay = combinedEndTime.format('YYYY-MM-DD');
    if (startDay !== endDay) {
      return res.status(400).json({ code: 400, message: '开始时间、结束时间不允许跨天' });
    }
    
    // 固定使用超级管理员
    const registeredBy = '超级管理员';

    const recordsToInsert = [];
    for (const employeeName of employeeNames) {
      // 关联 jso_system_user_management 表，依据所选姓名回写对应 old_employee_id
      const userResult = await pool.query(
        `SELECT old_employee_id FROM ${USER_TABLE} WHERE real_name = $1`,
        [employeeName]
      );
      if (userResult.rows.length === 0) {
        return res.status(400).json({ code: 400, message: `未找到匹配的员工姓名：${employeeName}` });
      }
      const oldEmployeeId = userResult.rows[0].old_employee_id;

      recordsToInsert.push({
        date: date, // 直接使用字符串，PostgreSQL 会自动解析
        event: event,
        employee_name: employeeName,
        old_employee_id: oldEmployeeId,
        start_time: startDateTimeStr,
        end_time: endDateTimeStr,
        registered_by: registeredBy
      });
    }

    // 使用事务确保数据一致性
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertedRows = [];
      for (const record of recordsToInsert) {
        // Check for duplicates before inserting (optional, but good practice)
        // For simplicity, let's assume no duplicate check for now,
        // or add it if needed based on business rules.

        const result = await client.query(
          `INSERT INTO ${SPECIAL_WORKING_HOURS_TABLE} 
           (date, event, employee_name, old_employee_id, start_time, end_time, registered_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING *`,
          [record.date, record.event, record.employee_name, record.old_employee_id, record.start_time, record.end_time, record.registered_by]
        );
        insertedRows.push(result.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json({ code: 201, message: '特殊工时记录添加成功', data: insertedRows });
    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('特殊工时事务处理失败:', transactionError);
      throw transactionError; // Re-throw to be caught by outer catch
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('创建特殊工时记录失败:', error);
    res.status(500).json({ code: 500, message: '创建特殊工时记录失败', error: error.message });
  }
});

// 批量删除特殊工时记录
router.delete('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids, employeeName, date, event } = req.query; // 获取查询参数

    // 如果有 ids 参数，使用原有的批量删除逻辑
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      if (idList.length === 0) {
        return res.status(400).json({ error: '请提供有效的特殊工时记录ID' });
      }

      // 构建IN查询的占位符，例如：$1, $2, $3
      const placeholders = idList.map((_, index) => `$${index + 1}`).join(', ');

      // 先查询要删除的记录，获取员工姓名和日期，用于删除工位安排表中的记录
      const recordsToDelete = await client.query(
        `SELECT date, employee_name FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE id IN (${placeholders})`,
        idList
      );

      // 使用事务删除数据
      await client.query('BEGIN');

      // 删除特殊工时记录
      const deleteResult = await client.query(
        `DELETE FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE id IN (${placeholders}) RETURNING *`,
        idList
      );

      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '没有找到匹配的特殊工时记录进行删除' });
      }

      // 删除工位安排表中对应的记录（根据员工姓名和日期，删除特殊工时工位的安排）
      for (const record of recordsToDelete.rows) {
        // 查找该员工在该日期的特殊工时工位安排并删除
        await client.query(
          `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE}
           WHERE arrangement_date = $1
           AND employee_id IN (
             SELECT id FROM ${USER_TABLE} WHERE real_name = $2
           )
           AND workstation_id IN (
             SELECT id FROM jso_config_workstation WHERE name LIKE '%特殊工时%'
           )`,
          [record.date, record.employee_name]
        );
      }

      await client.query('COMMIT');
      return res.json({ success: true, deletedCount: deleteResult.rows.length });
    }

    // 如果有 employeeName, date, event 参数，根据这些条件删除
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

      // 删除工位安排表中对应的记录
      await client.query(
        `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE}
         WHERE arrangement_date = $1
         AND employee_id IN (
           SELECT id FROM ${USER_TABLE} WHERE real_name = $2
         )
         AND workstation_id IN (
           SELECT id FROM jso_config_workstation WHERE name LIKE '%特殊工时%'
         )`,
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
router.get('/template', authenticateToken, (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'resources', 'excel_templates', 'SpecialWorkingHoursImportTemplate.xlsx');
    if (fs.existsSync(filePath)) {
      res.download(filePath, 'SpecialWorkingHoursImportTemplate.xlsx');
    } else {
      res.status(404).json({ message: '导入模板文件不存在' });
    }
  } catch (error) {
    console.error('下载特殊工时导入模板失败:', error);
    res.status(500).json({ message: '下载特殊工时导入模板失败' });
  }
});

// 批量导入特殊工时
router.post('/import', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const registeredBy = '超级管理员';
    const result = await handleSpecialWorkingHoursUpload(rows, registeredBy);

    if (!result.success) {
      return res.status(400).json({ code: 400, message: '数据验证失败', details: result.errors });
    }

    res.json({
      code: 200,
      message: `成功导入 ${result.insertedCount} 条特殊工时记录`,
      insertedCount: result.insertedCount,
      errors: result.errors,
      ids: result.ids
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('特殊工时记录');

    // 设置列头
    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '事项', key: 'event', width: 25 },
      { header: '工号', key: 'oldEmployeeId', width: 15 },
      { header: '姓名', key: 'employeeName', width: 15 },
      { header: '开始时间', key: 'startTime', width: 15 },
      { header: '结束时间', key: 'endTime', width: 15 },
      { header: '登记人', key: 'registeredBy', width: 15 }
    ];

    // 添加数据
    specialWorkingHours.forEach(row => {
      worksheet.addRow({
        date: dayjs(row.date).format('YYYY-MM-DD'),
        event: row.event,
        oldEmployeeId: row.old_employee_id,
        employeeName: row.employee_name,
        startTime: dayjs(row.start_time).format('HH:mm'),
        endTime: dayjs(row.end_time).format('HH:mm'),
        registeredBy: row.registered_by
      });
    });

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('特殊工时记录.xlsx'));

    // 将 workbook 写入 res 响应
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('导出特殊工时失败:', error);
    res.status(500).json({ code: 500, message: '导出特殊工时失败', error: error.message });
  }
});

export default router;
