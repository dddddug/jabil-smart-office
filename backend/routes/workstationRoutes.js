import express from 'express';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { buildWhereClause, buildPagination } from '../utils/sqlUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件
const router = express.Router();

// 工位配置表
const WORKSTATION_TABLE = 'jso_config_workstation';
const WORKSTATION_ARRANGEMENT_TABLE = 'jso_hr_workstation_arrangement';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';
const USER_TABLE = 'jso_system_user_management';
const SPECIAL_WORKING_HOURS_TABLE = 'jso_hr_special_working_hours';

// ==================== 工位配置接口 ====================

// 获取工位列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, plantId, departmentId, status } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    const where = buildWhereClause([
      { sql: ' AND w.plant_id = ?', value: plantId },
      { sql: ' AND w.department_id = ?', value: departmentId },
      { sql: ' AND w.status = ?', value: status },
    ]);

    const query = `
      SELECT w.*, p.name as plant_name, d.name as department_name
      FROM ${WORKSTATION_TABLE} w
      LEFT JOIN ${PLANT_TABLE} p ON w.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON w.department_id = d.id
    ` + where.clause + ` ORDER BY w.created_at DESC LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`;

    const countQuery = `SELECT COUNT(*) FROM ${WORKSTATION_TABLE} w` + where.clause;

    const result = await pool.query(query, [...where.values, limit, offset]);
    const totalResult = await pool.query(countQuery, where.values);

    const workstations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      plantId: row.plant_id,
      plantName: row.plant_name,
      departmentId: row.department_id,
      departmentName: row.department_name,
      status: row.status,
      description: row.description,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: row.updated_at ? dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
    }));

    const total = parseInt(totalResult.rows[0].count, 10);
    res.json({ code: 200, message: '获取成功', data: { list: workstations, total, page: currentPage, pageSize: limit } });
  } catch (error) {
    console.error('获取工位列表失败:', error);
    res.status(500).json({ code: 500, message: '获取工位列表失败', error: error.message });
  }
});

// 创建工位
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, plantId, departmentId, description = '' } = req.body;

    if (!name) {
      return res.status(400).json({ code: 400, message: '工位名称不能为空' });
    }

    const result = await pool.query(
      `INSERT INTO ${WORKSTATION_TABLE} (name, plant_id, department_id, description, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [name, plantId || null, departmentId || null, description]
    );
    res.json({ code: 200, message: '创建成功', data: result.rows[0] });
  } catch (error) {
    console.error('创建工位失败:', error);
    res.status(500).json({ code: 500, message: '创建工位失败', error: error.message });
  }
});

// 获取所有启用的工位（用于下拉选择）- 必须在 /:id 之前
router.get('/active-list', authenticateToken, async (req, res) => {
  try {
    const { plantId, departmentId } = req.query;

    let where = ' WHERE w.status = \'active\'';
    const values = [];

    if (plantId) {
      values.push(plantId);
      where += ` AND w.plant_id = $${values.length}`;
    }
    if (departmentId) {
      values.push(departmentId);
      where += ` AND w.department_id = $${values.length}`;
    }

    const query = `
      SELECT w.*, p.name as plant_name, d.name as department_name
      FROM ${WORKSTATION_TABLE} w
      LEFT JOIN ${PLANT_TABLE} p ON w.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON w.department_id = d.id
      ${where}
      ORDER BY w.created_at DESC
    `;

    const result = await pool.query(query, values);
    const workstations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      plantId: row.plant_id,
      plantName: row.plant_name,
      departmentId: row.department_id,
      departmentName: row.department_name,
    }));

    res.json({ code: 200, message: '获取成功', data: workstations });
  } catch (error) {
    console.error('获取启用工位列表失败:', error);
    res.status(500).json({ code: 500, message: '获取启用工位列表失败', error: error.message });
  }
});

// ==================== 工位安排接口 ====================
// 注意：所有 /arrangements 路由必须在 /:id 路由之前定义！

// 获取工位安排列表
router.get('/arrangements', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, arrangementDate, shiftName, workstationId, plantId, departmentId } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    let where = buildWhereClause([
      { sql: " AND DATE(a.arrangement_date AT TIME ZONE 'Asia/Shanghai') = ?::date", value: arrangementDate },
      { sql: ' AND a.shift_name = ?', value: shiftName },
      { sql: ' AND a.workstation_id = ?', value: workstationId },
    ]);

    // 工位关联查询
    let joinClause = `
      JOIN ${WORKSTATION_TABLE} w ON a.workstation_id = w.id
    `;

    if (plantId) {
      where.values.push(plantId);
      where.clause += ` AND w.plant_id = $${where.values.length}`;
    }
    if (departmentId) {
      where.values.push(departmentId);
      where.clause += ` AND w.department_id = $${where.values.length}`;
    }

    const query = `
      SELECT a.*,
             w.name as workstation_name,
             u.id as employee_id, u.real_name as employee_name
      FROM ${WORKSTATION_ARRANGEMENT_TABLE} a
      ${joinClause}
      JOIN ${USER_TABLE} u ON a.employee_id = u.id
      ${where.clause}
      ORDER BY a.created_at DESC
      LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM ${WORKSTATION_ARRANGEMENT_TABLE} a
      ${joinClause}
      ${where.clause}
    `;

    const result = await pool.query(query, [...where.values, limit, offset]);
    const totalResult = await pool.query(countQuery, where.values);

    const arrangements = result.rows.map(row => ({
      id: row.id,
      workstationId: row.workstation_id,
      workstationName: row.workstation_name,
      arrangementDate: row.arrangement_date,
      shiftName: row.shift_name,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      sapEmployeeId: row.sap_employee_id,
      startTime: row.start_time,
      endTime: row.end_time,
      hours: row.hours ? parseFloat(row.hours) : null,
      reason: row.reason,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
    }));

    const total = parseInt(totalResult.rows[0].count, 10);
    res.json({ code: 200, message: '获取成功', data: { list: arrangements, total, page: currentPage, pageSize: limit } });
  } catch (error) {
    console.error('获取工位安排列表失败:', error);
    res.status(500).json({ code: 500, message: '获取工位安排列表失败', error: error.message });
  }
});

// 批量保存工位安排（每天每个班次，批量分配员工到工位）
router.post('/arrangements', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { workstationId, arrangementDate, shiftName, employeeIds, startTime, endTime, hours, reason, sapEmployeeIds, append } = req.body;

    if (!workstationId || !arrangementDate || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ code: 400, message: '工位ID、日期和员工ID列表不能为空' });
    }

    // 如果 shiftName 为空，抛出错误（不允许使用 default）
    if (!shiftName) {
      return res.status(400).json({ code: 400, message: '班次不能为空，请从排班表获取正确的班次' });
    }

    // 将日期转换为纯日期字符串（避免时区问题）
    const pureDate = arrangementDate.substring(0, 10);

    // 预先获取特殊工时工位ID（用于后续同步）
    const specialWorkstationResult = await client.query(
      `SELECT id FROM ${WORKSTATION_TABLE} WHERE name LIKE '%特殊工时%' LIMIT 1`
    );
    const specialWorkstationId = specialWorkstationResult.rows.length > 0 ? specialWorkstationResult.rows[0].id : null;

    // 如果是追加模式，先过滤掉已存在的员工，并同步过滤 sapEmployeeIds
    let employeesToInsert = employeeIds;
    let sapIdsToInsert = sapEmployeeIds || [];
    if (append) {
      // 对于特殊工时工位（有时段的情况），使用更细粒度的检查
      if (startTime && endTime) {
        // 基于员工ID+开始时间来检查是否存在（允许同一员工多个时间段）
        const existingResult = await client.query(
          `SELECT employee_id, start_time FROM ${WORKSTATION_ARRANGEMENT_TABLE}
           WHERE workstation_id = $1 AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = DATE($2::text) AND shift_name = $3 AND start_time = $4`,
          [workstationId, pureDate, shiftName, startTime]
        );
        const existingKeys = new Set(existingResult.rows.map(r => `${r.employee_id}_${r.start_time}`));

        const filteredEmployees = [];
        const filteredSapIds = [];
        for (let i = 0; i < employeeIds.length; i++) {
          const key = `${employeeIds[i]}_${startTime}`;
          if (!existingKeys.has(key)) {
            filteredEmployees.push(employeeIds[i]);
            filteredSapIds.push(sapIdsToInsert[i] || null);
          }
        }
        employeesToInsert = filteredEmployees;
        sapIdsToInsert = filteredSapIds;
      } else {
        // 没有时段的情况，使用原有的员工ID过滤逻辑
        const existingResult = await client.query(
          `SELECT employee_id FROM ${WORKSTATION_ARRANGEMENT_TABLE}
           WHERE workstation_id = $1 AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = DATE($2::text) AND shift_name = $3`,
          [workstationId, pureDate, shiftName]
        );
        const existingEmployeeIds = new Set(existingResult.rows.map(r => r.employee_id));

        const filteredEmployees = [];
        const filteredSapIds = [];
        for (let i = 0; i < employeeIds.length; i++) {
          if (!existingEmployeeIds.has(employeeIds[i])) {
            filteredEmployees.push(employeeIds[i]);
            filteredSapIds.push(sapIdsToInsert[i] || null);
          }
        }
        employeesToInsert = filteredEmployees;
        sapIdsToInsert = filteredSapIds;
      }

      console.log(`追加模式: 过滤掉 ${employeeIds.length - employeesToInsert.length} 个已存在的员工，剩余 ${employeesToInsert.length} 个待插入`);
    } else {
      // 非追加模式，删除该工位当日该班次的所有安排
      await client.query(
        `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE} WHERE workstation_id = $1 AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = DATE($2::text) AND shift_name = $3`,
        [workstationId, pureDate, shiftName]
      );
    }

    // 批量插入新的安排
    if (employeesToInsert.length > 0) {
      // 处理 SAP 工号
      const normalizedSapIds = employeesToInsert.map((_, index) => {
        const sapId = sapIdsToInsert[index];
        return (sapId !== undefined && sapId !== null && sapId !== '' && !isNaN(Number(sapId)))
          ? String(sapId)
          : null;
      });

      // 处理原因字段
      const reasonValue = reason && reason.trim() ? reason.trim() : null;

      // 构建参数数组
      const params = [workstationId, pureDate, shiftName];
      let nextParamIndex = 4;  // 下一个可用的参数索引

      // 构建 VALUES 子句，每个员工一行
      const valueRows = employeesToInsert.map((empId, index) => {
        const empParamIndex = nextParamIndex;
        nextParamIndex += 6;  // 每个员工使用6个参数

        params.push(empId);
        params.push(startTime || null);
        params.push(endTime || null);
        params.push(reasonValue);
        params.push(hours || null);
        params.push(normalizedSapIds[index]);

        // 使用字符串拼接避免模板字符串解析问题
        const rowStr = '(' +
          '\$1, \$2::date, \$3, ' +
          '\$' + empParamIndex + ', ' +
          '\$' + (empParamIndex + 1) + ', ' +
          '\$' + (empParamIndex + 2) + ', ' +
          '\$' + (empParamIndex + 3) + ', ' +
          '\$' + (empParamIndex + 4) + ', ' +
          '\$' + (empParamIndex + 5) + ')';
        return rowStr;
      });

      // 构建完整 INSERT SQL
      const insertSql = 'INSERT INTO ' + WORKSTATION_ARRANGEMENT_TABLE + ' ' +
        '(workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason, hours, sap_employee_id) ' +
        'VALUES ' + valueRows.join(', ');

      await client.query(insertSql, params);

      // 同步到特殊工时页签（如果是特殊工时工位且有 reason）
      if (reasonValue && specialWorkstationId) {
        // 查找工位名称
        const workstationResult = await client.query(
          `SELECT name FROM ${WORKSTATION_TABLE} WHERE id = $1`,
          [workstationId]
        );
        const workstationName = workstationResult.rows[0]?.name || '';

        if (workstationName.includes('特殊工时')) {
          // 获取当前用户名
          const userResult = await client.query(`SELECT real_name FROM ${USER_TABLE} WHERE id = $1`, [req.user.id]);
          const registeredBy = userResult.rows.length > 0 ? userResult.rows[0].real_name : '未知用户';

          // 为每个员工创建特殊工时记录
          for (const empId of employeesToInsert) {
            // 获取员工姓名
            const empResult = await client.query(`SELECT real_name FROM ${USER_TABLE} WHERE id = $1`, [empId]);
            const empName = empResult.rows[0]?.real_name;
            if (!empName) continue;

            // 构建完整时间字符串
            const startTimeStr = startTime ? `${pureDate} ${startTime}` : `${pureDate} 00:00`;
            const endTimeStr = endTime ? `${pureDate} ${endTime}` : `${pureDate} 23:59`;

            // 检查是否已存在记录（同时检查时间以支持同一天多条记录）
            const existingResult = await client.query(
              `SELECT id FROM ${SPECIAL_WORKING_HOURS_TABLE} WHERE employee_name = $1 AND date = $2 AND event = $3 AND start_time = $4`,
              [empName, pureDate, reasonValue, startTimeStr]
            );

            if (existingResult.rows.length === 0) {
              // 获取 old_employee_id
              const oldEmpResult = await client.query(
                `SELECT old_employee_id FROM ${USER_TABLE} WHERE id = $1`,
                [empId]
              );
              const oldEmployeeId = oldEmpResult.rows[0]?.old_employee_id;

              await client.query(
                `INSERT INTO ${SPECIAL_WORKING_HOURS_TABLE}
                 (date, event, employee_name, old_employee_id, start_time, end_time, registered_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [pureDate, reasonValue, empName, oldEmployeeId, startTimeStr, endTimeStr, registeredBy]
              );
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ code: 200, message: '保存成功', data: { workstationId, arrangementDate, shiftName, employeeCount: employeesToInsert.length, startTime, endTime, reason } });
  } catch (error) {
    // 确保事务回滚
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    console.error('保存工位安排失败:', error);
    res.status(500).json({ code: 500, message: '保存工位安排失败', error: error.message });
  } finally {
    client.release();
  }
});

// 修复：同步 jso_hr_workstation_arrangement 表的 sap_employee_id 字段
router.post('/arrangements/fix-sap-id', authenticateToken, async (req, res) => {
  try {
    // 从 jso_system_user_management 表同步 employee_id 到 jso_hr_workstation_arrangement 表的 sap_employee_id
    const result = await pool.query(`
      UPDATE ${WORKSTATION_ARRANGEMENT_TABLE} wa
      SET sap_employee_id = u.employee_id
      FROM ${USER_TABLE} u
      WHERE wa.employee_id = u.id
        AND (wa.sap_employee_id IS NULL OR wa.sap_employee_id = '')
        AND u.employee_id IS NOT NULL AND u.employee_id != ''
    `);

    console.log(`同步 sap_employee_id 成功，影响 ${result.rowCount} 条记录`);
    res.json({ code: 200, message: '同步成功', data: { updatedCount: result.rowCount } });
  } catch (error) {
    console.error('同步 sap_employee_id 失败:', error);
    res.status(500).json({ code: 500, message: '同步失败', error: error.message });
  }
});

// 删除工位安排（按工位ID、日期、员工ID）
router.delete('/arrangements', authenticateToken, async (req, res) => {
  try {
    const { workstationId, arrangementDate, employeeId } = req.body;

    if (!workstationId || !arrangementDate || !employeeId) {
      return res.status(400).json({ code: 400, message: '工位ID、日期和员工ID不能为空' });
    }

    const result = await pool.query(
      `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE}
       WHERE workstation_id = $1 AND arrangement_date = $2 AND employee_id = $3
       RETURNING *`,
      [workstationId, arrangementDate, employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '安排记录不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除工位安排失败:', error);
    res.status(500).json({ code: 500, message: '删除工位安排失败', error: error.message });
  }
});

// 删除单条工位安排
router.delete('/arrangements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE} WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '安排记录不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除工位安排失败:', error);
    res.status(500).json({ code: 500, message: '删除工位安排失败', error: error.message });
  }
});

// 更新工位安排的 SAP 工号
router.put('/arrangements/:id/sap-employee-id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sapEmployeeId } = req.body;

    const result = await pool.query(
      `UPDATE ${WORKSTATION_ARRANGEMENT_TABLE} SET sap_employee_id = $1 WHERE id = $2 RETURNING *`,
      [sapEmployeeId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '安排记录不存在' });
    }
    res.json({ code: 200, message: '更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('更新SAP工号失败:', error);
    res.status(500).json({ code: 500, message: '更新SAP工号失败', error: error.message });
  }
});

// 更新工位安排的备注
router.put('/arrangements/:id/remark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remark, arrangementDate } = req.body;

    // 如果提供了日期，则同时验证日期匹配，防止更新到错误日期的记录
    if (arrangementDate) {
      const pureDate = arrangementDate.substring(0, 10);
      const result = await pool.query(
        `UPDATE ${WORKSTATION_ARRANGEMENT_TABLE} SET remark = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = $3::date RETURNING *`,
        [remark || '', id, pureDate]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ code: 404, message: '安排记录不存在或日期不匹配' });
      }
      res.json({ code: 200, message: '更新成功', data: result.rows[0] });
    } else {
      // 兼容旧版本：没有日期时只根据id更新
      const result = await pool.query(
        `UPDATE ${WORKSTATION_ARRANGEMENT_TABLE} SET remark = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [remark || '', id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ code: 404, message: '安排记录不存在' });
      }
      res.json({ code: 200, message: '更新成功', data: result.rows[0] });
    }
  } catch (error) {
    console.error('更新备注失败:', error);
    res.status(500).json({ code: 500, message: '更新备注失败', error: error.message });
  }
});

// 批量更新工位安排的 SAP 工号和时间（根据员工ID和日期和工位ID）
router.put('/arrangements/batch-sap-employee-id', authenticateToken, async (req, res) => {
  try {
    const { employeeId, arrangementDate, sapEmployeeId, workstationId, startTime, endTime } = req.body;

    if (!employeeId || !arrangementDate) {
      return res.status(400).json({ code: 400, message: '员工ID和日期不能为空' });
    }

    // 将日期转换为纯日期字符串（避免时区问题）
    const pureDate = arrangementDate.substring(0, 10);

    console.log(`[DEBUG] batch-sap-employee-id 接收参数: employeeId=${employeeId}, date=${pureDate}, workstationId=${workstationId}, sapEmployeeId=${sapEmployeeId}`);

    // 构建更新字段和参数
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // sap_employee_id 更新
    if (sapEmployeeId !== undefined) {
      updates.push(`sap_employee_id = $${paramIndex}`);
      values.push(sapEmployeeId);
      paramIndex++;
    }
    // start_time 更新
    if (startTime !== undefined) {
      if (startTime) {
        updates.push(`start_time = $${paramIndex}::TIME`);
        values.push(startTime);
        paramIndex++;
      } else {
        updates.push(`start_time = NULL`);
      }
    }
    // end_time 更新
    if (endTime !== undefined) {
      if (endTime) {
        updates.push(`end_time = $${paramIndex}::TIME`);
        values.push(endTime);
        paramIndex++;
      } else {
        updates.push(`end_time = NULL`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    // 构建WHERE子查询：选择第一条匹配的记录
    // employee_id 参数
    values.push(employeeId);
    const employeeIdParam = `$${paramIndex}`;
    paramIndex++;

    // date 参数
    values.push(pureDate);
    const dateParam = `$${paramIndex}`;
    paramIndex++;

    let whereSubquery = `(SELECT id FROM jso_hr_workstation_arrangement WHERE employee_id = ${employeeIdParam} AND DATE(arrangement_date AT TIME ZONE 'Asia/Shanghai') = ${dateParam}::date`;

    // 如果指定了工位ID，则同时按工位过滤
    if (workstationId) {
      values.push(workstationId);
      whereSubquery += ` AND workstation_id = $${paramIndex}`;
      paramIndex++;
    }

    whereSubquery += ` ORDER BY id LIMIT 1)`;

    const sql = `UPDATE jso_hr_workstation_arrangement SET ${updates.join(', ')} WHERE id = ${whereSubquery} RETURNING *`;

    console.log(`[DEBUG] SQL: ${sql}`);
    console.log(`[DEBUG] 参数: ${JSON.stringify(values)}`);

    const result = await pool.query(sql, values);

    console.log(`[DEBUG] 更新结果: rowCount=${result.rowCount}`);
    if (result.rows.length > 0) {
      console.log(`[DEBUG] 更新的记录: id=${result.rows[0].id}, sap_employee_id=${result.rows[0].sap_employee_id}`);
    }

    res.json({ code: 200, message: '更新成功', data: { updatedCount: result.rowCount } });
  } catch (error) {
    console.error('批量更新失败:', error);
    res.status(500).json({ code: 500, message: '批量更新失败: ' + error.message });
  }
});

// ==================== Power BI 数据接口 ====================

// Power BI 数据接口（无需认证，返回工位安排汇总数据）
router.get('/powerbi/arrangements', async (req, res) => {
  try {
    const { startDate, endDate, plantId, departmentId } = req.query;

    // 构建日期条件
    let dateCondition = '';
    const params = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateCondition = `AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= $${paramIndex} AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      dateCondition = `AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    } else if (endDate) {
      dateCondition = `AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    } else {
      // 默认查询最近30天
      dateCondition = `AND DATE(wa.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    // 构建工位条件
    let workstationCondition = '';
    if (plantId) {
      workstationCondition += ` AND w.plant_id = $${paramIndex}`;
      params.push(plantId);
      paramIndex++;
    }
    if (departmentId) {
      workstationCondition += ` AND w.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    const query = `
      SELECT
        wa.id,
        wa.workstation_id,
        w.name as workstation_name,
        w.plant_id,
        p.name as plant_name,
        w.department_id,
        d.name as department_name,
        wa.arrangement_date,
        wa.shift_name,
        wa.employee_id,
        u.real_name as employee_name,
        u.old_employee_id,
        wa.start_time,
        wa.end_time,
        wa.hours,
        wa.reason,
        wa.sap_employee_id,
        wa.created_at,
        wa.updated_at
      FROM ${WORKSTATION_ARRANGEMENT_TABLE} wa
      JOIN ${WORKSTATION_TABLE} w ON wa.workstation_id = w.id
      LEFT JOIN ${PLANT_TABLE} p ON w.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON w.department_id = d.id
      LEFT JOIN ${USER_TABLE} u ON wa.employee_id = u.id
      WHERE 1=1 ${dateCondition} ${workstationCondition}
      ORDER BY wa.arrangement_date DESC, w.name, wa.start_time
    `;

    const result = await pool.query(query, params);

    // 转换为 Power BI 友好的格式
    const data = result.rows.map(row => ({
      ID: row.id,
      工位ID: row.workstation_id,
      工位名称: row.workstation_name,
      厂区ID: row.plant_id,
      厂区名称: row.plant_name,
      部门ID: row.department_id,
      部门名称: row.department_name,
      安排日期: dayjs(row.arrangement_date).format('YYYY-MM-DD'),
      班次: row.shift_name,
      员工ID: row.employee_id,
      员工姓名: row.employee_name,
      工号: row.old_employee_id,
      开始时间: row.start_time,
      结束时间: row.end_time,
      时长: row.hours ? parseFloat(row.hours) : null,
      原因: row.reason,
      SAP工号: row.sap_employee_id,
      创建时间: row.created_at,
      更新时间: row.updated_at
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: data,
      total: data.length
    });
  } catch (error) {
    console.error('获取 Power BI 数据失败:', error);
    res.status(500).json({ code: 500, message: '获取数据失败', error: error.message });
  }
});

// ==================== 特殊工时 Power BI 数据接口 ====================

// Power BI 特殊工时数据接口（无需认证）
router.get('/powerbi/special-working-hours', async (req, res) => {
  try {
    const { startDate, endDate, event, employeeName } = req.query;

    let dateCondition = '';
    const params = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateCondition = `AND date >= $${paramIndex} AND date <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      dateCondition = `AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    } else if (endDate) {
      dateCondition = `AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    } else {
      dateCondition = `AND date >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    let eventCondition = '';
    if (event) {
      eventCondition = `AND event ILIKE $${paramIndex}`;
      params.push(`%${event}%`);
      paramIndex++;
    }

    let nameCondition = '';
    if (employeeName) {
      nameCondition = `AND employee_name ILIKE $${paramIndex}`;
      params.push(`%${employeeName}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        id,
        date,
        event,
        employee_name,
        old_employee_id,
        start_time,
        end_time,
        registered_by,
        created_at
      FROM ${SPECIAL_WORKING_HOURS_TABLE}
      WHERE 1=1 ${dateCondition} ${eventCondition} ${nameCondition}
      ORDER BY date DESC, start_time
    `;

    const result = await pool.query(query, params);

    const data = result.rows.map(row => ({
      ID: row.id,
      日期: dayjs(row.date).format('YYYY-MM-DD'),
      事项: row.event,
      员工姓名: row.employee_name,
      工号: row.old_employee_id,
      开始时间: row.start_time ? dayjs(row.start_time).format('HH:mm') : null,
      结束时间: row.end_time ? dayjs(row.end_time).format('HH:mm') : null,
      登记人: row.registered_by,
      创建时间: row.created_at
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: data,
      total: data.length
    });
  } catch (error) {
    console.error('获取特殊工时数据失败:', error);
    res.status(500).json({ code: 500, message: '获取数据失败', error: error.message });
  }
});

// 获取某日期所有工位的员工分配情况（用于工位安排视图）
router.get('/arrangements/by-date-shift', authenticateToken, async (req, res) => {
  try {
    const { arrangementDate, shiftName, plantId, departmentId } = req.query;

    if (!arrangementDate) {
      return res.status(400).json({ code: 400, message: '日期不能为空' });
    }

    // 日期条件在 ON 子句中，使用 AT TIME ZONE 转换为上海时区的日期
    let where = ` WHERE w.status = 'active'`;
    let shiftCondition = '';
    const params = [arrangementDate];
    let paramIndex = 2;

    if (shiftName) {
      shiftCondition = ` AND a.shift_name = $${paramIndex}`;
      params.push(shiftName);
      paramIndex++;
    }

    if (plantId) {
      where += ` AND w.plant_id = $${paramIndex}`;
      params.push(plantId);
      paramIndex++;
    }
    if (departmentId) {
      where += ` AND w.department_id = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    const query = `
      SELECT
        w.id as workstation_id,
        w.name as workstation_name,
        w.status as workstation_status,
        COALESCE(
          json_agg(
            json_build_object(
              'arrangementId', a.id,
              'employeeId', u.id,
              'employeeName', u.real_name,
              'sapEmployeeId', a.sap_employee_id,
              'startTime', a.start_time,
              'endTime', a.end_time,
              'reason', a.reason,
              'remark', a.remark,
              'level', u.level
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as employees
      FROM ${WORKSTATION_TABLE} w
      LEFT JOIN ${WORKSTATION_ARRANGEMENT_TABLE} a ON w.id = a.workstation_id AND DATE(a.arrangement_date AT TIME ZONE 'Asia/Shanghai') = $1::date${shiftCondition}
      LEFT JOIN ${USER_TABLE} u ON a.employee_id = u.id
      ${where}
      GROUP BY w.id, w.name, w.status
      ORDER BY w.id
    `;

    const result = await pool.query(query, params);

    // Debug: 打印蒋学军的记录
    const jiangEmployee = result.rows.find(r =>
      r.employees && r.employees.some(e => e.employeeName === '蒋学军')
    );
    if (jiangEmployee) {
      const jiangRecord = jiangEmployee.employees.find(e => e.employeeName === '蒋学军');
      console.log(`[DEBUG] 工位安排 API - 蒋学军 sapEmployeeId: ${jiangRecord ? jiangRecord.sapEmployeeId : 'null'}, 工位: ${jiangEmployee.workstation_name}`);
    }

    // 获取特殊工时记录（用于计算无产出时长）
    const specialHoursQuery = `
      SELECT TO_CHAR(DATE(date AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') as date, employee_name, event, start_time, end_time
      FROM ${SPECIAL_WORKING_HOURS_TABLE}
      WHERE DATE(date AT TIME ZONE 'Asia/Shanghai') = $1::date
      ORDER BY start_time
    `;
    const specialHoursResult = await pool.query(specialHoursQuery, [arrangementDate]);
    const specialHoursMap = {};
    for (const row of specialHoursResult.rows) {
      const key = `${row.employee_name}_${row.date}`;
      if (!specialHoursMap[key]) {
        specialHoursMap[key] = [];
      }
      specialHoursMap[key].push({
        startTime: row.start_time ? dayjs(row.start_time).format('HH:mm') : null,
        endTime: row.end_time ? dayjs(row.end_time).format('HH:mm') : null,
        event: row.event,
      });
    }

    const workstations = result.rows.map(row => ({
      workstationId: row.workstation_id,
      workstationName: row.workstation_name,
      workstationStatus: row.workstation_status,
      employees: row.employees,
    }));

    res.json({ code: 200, message: '获取成功', data: { workstations, specialHoursMap } });
  } catch (error) {
    console.error('获取工位安排情况失败:', error);
    res.status(500).json({ code: 500, message: '获取工位安排情况失败', error: error.message });
  }
});

// ==================== 自动分配规则接口 ====================

// 获取自动分配规则列表
router.get('/auto-assign-rules', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT r.*,
             u.real_name as employee_name,
             u.sap_employee_id as employee_sap_id,
             w.name as workstation_name
      FROM jso_hr_workstation_auto_assign_rules r
      JOIN jso_system_user_management u ON r.employee_id = u.id
      JOIN jso_config_workstation w ON r.workstation_id = w.id
      ORDER BY r.priority DESC, r.id ASC
    `;
    const result = await pool.query(query);

    const rules = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeSapId: row.employee_sap_id,
      workstationId: row.workstation_id,
      workstationName: row.workstation_name,
      priority: row.priority,
      isActive: row.is_active,
    }));

    res.json({ code: 200, message: '获取成功', data: rules });
  } catch (error) {
    console.error('获取自动分配规则失败:', error);
    res.status(500).json({ code: 500, message: '获取自动分配规则失败', error: error.message });
  }
});

// 创建或更新自动分配规则
router.post('/auto-assign-rules', authenticateToken, async (req, res) => {
  try {
    const { employeeId, workstationId, priority = 0 } = req.body;

    if (!employeeId || !workstationId) {
      return res.status(400).json({ code: 400, message: '员工ID和工位ID不能为空' });
    }

    // 使用 upsert 模式，存在则更新，不存在则插入
    const query = `
      INSERT INTO jso_hr_workstation_auto_assign_rules (employee_id, workstation_id, priority)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id)
      DO UPDATE SET workstation_id = $2, priority = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [employeeId, workstationId, priority]);
    res.json({ code: 200, message: '保存成功', data: result.rows[0] });
  } catch (error) {
    console.error('保存自动分配规则失败:', error);
    res.status(500).json({ code: 500, message: '保存自动分配规则失败', error: error.message });
  }
});

// 删除自动分配规则
router.delete('/auto-assign-rules/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM jso_hr_workstation_auto_assign_rules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除自动分配规则失败:', error);
    res.status(500).json({ code: 500, message: '删除自动分配规则失败', error: error.message });
  }
});

// 切换规则启用状态
router.put('/auto-assign-rules/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE jso_hr_workstation_auto_assign_rules SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '状态更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('切换规则状态失败:', error);
    res.status(500).json({ code: 500, message: '切换规则状态失败', error: error.message });
  }
});

// 获取员工列表（用于选择）
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const { keyword } = req.query;
    let where = ' WHERE u.status = \'active\'';
    const values = [];

    if (keyword) {
      values.push(`%${keyword}%`);
      where += ` AND (u.real_name LIKE $${values.length} OR u.sap_employee_id LIKE $${values.length})`;
    }

    const query = `
      SELECT u.id, u.real_name, u.sap_employee_id, u.position
      FROM jso_system_user_management u
      ${where}
      ORDER BY u.real_name
      LIMIT 100
    `;

    const result = await pool.query(query, values);
    const employees = result.rows.map(row => ({
      id: row.id,
      realName: row.real_name,
      sapId: row.sap_employee_id,
      position: row.position,
    }));

    res.json({ code: 200, message: '获取成功', data: employees });
  } catch (error) {
    console.error('获取员工列表失败:', error);
    res.status(500).json({ code: 500, message: '获取员工列表失败', error: error.message });
  }
});

// ==================== 工位配置接口 - 带 ID 参数的路由 ====================
// 注意：这些路由必须在所有 /arrangements 相关路由之后定义！

// 更新工位
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plantId, departmentId, description } = req.body;

    const result = await pool.query(
      `UPDATE ${WORKSTATION_TABLE} SET name = $1, plant_id = $2, department_id = $3, description = $4, updated_at = NOW() WHERE id = $5 RETURNING *`,
      [name, plantId || null, departmentId || null, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '工位不存在' });
    }
    res.json({ code: 200, message: '更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('更新工位失败:', error);
    res.status(500).json({ code: 500, message: '更新工位失败', error: error.message });
  }
});

// 删除工位
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${WORKSTATION_TABLE} WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '工位不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除工位失败:', error);
    res.status(500).json({ code: 500, message: '删除工位失败', error: error.message });
  }
});

// 启用/停用工位
router.post('/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    const result = await pool.query(
      `UPDATE ${WORKSTATION_TABLE} SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '工位不存在' });
    }
    res.json({ code: 200, message: '状态更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('更新工位状态失败:', error);
    res.status(500).json({ code: 500, message: '更新工位状态失败', error: error.message });
  }
});

// 清空所有工位安排（用于重新导入）
router.post('/arrangements/clear-all', authenticateToken, async (req, res) => {
  try {
    // 添加 sap_employee_id 字段（如果不存在）
    await pool.query(`ALTER TABLE ${WORKSTATION_ARRANGEMENT_TABLE} ADD COLUMN IF NOT EXISTS sap_employee_id VARCHAR(100)`);

    // 清空表并重置ID
    await pool.query(`TRUNCATE TABLE ${WORKSTATION_ARRANGEMENT_TABLE} RESTART IDENTITY CASCADE`);

    res.json({ code: 200, message: '工位安排已清空，ID已重置' });
  } catch (error) {
    console.error('清空工位安排失败:', error);
    res.status(500).json({ code: 500, message: '清空工位安排失败', error: error.message });
  }
});

export default router;
