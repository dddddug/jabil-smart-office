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
      { sql: ' AND a.arrangement_date = ?', value: arrangementDate },
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
             u.id as employee_id, u.real_name as employee_name, u.sap_employee_id
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

    const { workstationId, arrangementDate, shiftName, employeeIds, startTime, endTime, reason } = req.body;

    if (!workstationId || !arrangementDate || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ code: 400, message: '工位ID、日期和员工ID列表不能为空' });
    }

    // 如果 shiftName 为空，使用 'default' 作为默认值
    const effectiveShiftName = shiftName || 'default';

    // 删除该工位当日该班次的所有安排
    await client.query(
      `DELETE FROM ${WORKSTATION_ARRANGEMENT_TABLE} WHERE workstation_id = $1 AND arrangement_date = $2 AND shift_name = $3`,
      [workstationId, arrangementDate, effectiveShiftName]
    );

    // 批量插入新的安排
    if (employeeIds.length > 0) {
      const params = [workstationId, arrangementDate, effectiveShiftName, ...employeeIds];

      // 显式转换时间值为 TIME 类型（PostgreSQL 需要显式类型转换）
      const startTimeValue = startTime && startTime.trim() ? `'${startTime.trim()}'::TIME` : null;
      const endTimeValue = endTime && endTime.trim() ? `'${endTime.trim()}'::TIME` : null;

      // 处理原因字段
      const reasonValue = reason && reason.trim() ? reason.trim() : null;

      let insertSql;
      if (startTimeValue && endTimeValue) {
        // 两种时间都有 - 直接在 SQL 中嵌入时间值
        const valueRows = employeeIds.map((empId, index) => {
          const empParam = `$${4 + index}`;
          return `($1, $2, $3, ${empParam}, ${startTimeValue}, ${endTimeValue}, ${reasonValue ? `$${4 + employeeIds.length + 1}` : 'NULL'})`;
        }).join(', ');
        insertSql = `INSERT INTO ${WORKSTATION_ARRANGEMENT_TABLE} (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason) VALUES ${valueRows}`;
        if (reasonValue) {
          params.push(reasonValue);
        }
      } else if (startTimeValue) {
        // 只有开始时间
        const valueRows = employeeIds.map((empId, index) => {
          const empParam = `$${4 + index}`;
          return `($1, $2, $3, ${empParam}, ${startTimeValue}, NULL::TIME, ${reasonValue ? `$${4 + employeeIds.length + 1}` : 'NULL'})`;
        }).join(', ');
        insertSql = `INSERT INTO ${WORKSTATION_ARRANGEMENT_TABLE} (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason) VALUES ${valueRows}`;
        if (reasonValue) {
          params.push(reasonValue);
        }
      } else if (endTimeValue) {
        // 只有结束时间
        const valueRows = employeeIds.map((empId, index) => {
          const empParam = `$${4 + index}`;
          return `($1, $2, $3, ${empParam}, NULL::TIME, ${endTimeValue}, ${reasonValue ? `$${4 + employeeIds.length + 1}` : 'NULL'})`;
        }).join(', ');
        insertSql = `INSERT INTO ${WORKSTATION_ARRANGEMENT_TABLE} (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason) VALUES ${valueRows}`;
        if (reasonValue) {
          params.push(reasonValue);
        }
      } else {
        // 没有时间
        const valueRows = employeeIds.map((empId, index) => {
          const empParam = `$${4 + index}`;
          return `($1, $2, $3, ${empParam}, NULL::TIME, NULL::TIME, ${reasonValue ? `$${4 + employeeIds.length + 1}` : 'NULL'})`;
        }).join(', ');
        insertSql = `INSERT INTO ${WORKSTATION_ARRANGEMENT_TABLE} (workstation_id, arrangement_date, shift_name, employee_id, start_time, end_time, reason) VALUES ${valueRows}`;
        if (reasonValue) {
          params.push(reasonValue);
        }
      }

      await client.query(insertSql, params);
    }

    await client.query('COMMIT');
    res.json({ code: 200, message: '保存成功', data: { workstationId, arrangementDate, shiftName: effectiveShiftName, employeeCount: employeeIds.length, startTime, endTime, reason } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('保存工位安排失败:', error);
    res.status(500).json({ code: 500, message: '保存工位安排失败', error: error.message });
  } finally {
    client.release();
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

// 获取某日期所有工位的员工分配情况（用于工位安排视图）
router.get('/arrangements/by-date-shift', authenticateToken, async (req, res) => {
  try {
    const { arrangementDate, shiftName, plantId, departmentId } = req.query;

    if (!arrangementDate) {
      return res.status(400).json({ code: 400, message: '日期不能为空' });
    }

    // 日期条件在 ON 子句中，不要放在 WHERE 里
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
              'sapEmployeeId', u.sap_employee_id,
              'startTime', a.start_time,
              'endTime', a.end_time,
              'reason', a.reason
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as employees
      FROM ${WORKSTATION_TABLE} w
      LEFT JOIN ${WORKSTATION_ARRANGEMENT_TABLE} a ON w.id = a.workstation_id AND a.arrangement_date = $1${shiftCondition}
      LEFT JOIN ${USER_TABLE} u ON a.employee_id = u.id
      ${where}
      GROUP BY w.id, w.name, w.status
      ORDER BY w.id
    `;

    const result = await pool.query(query, params);

    const workstations = result.rows.map(row => ({
      workstationId: row.workstation_id,
      workstationName: row.workstation_name,
      workstationStatus: row.workstation_status,
      employees: row.employees,
    }));

    res.json({ code: 200, message: '获取成功', data: workstations });
  } catch (error) {
    console.error('获取工位安排情况失败:', error);
    res.status(500).json({ code: 500, message: '获取工位安排情况失败', error: error.message });
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

export default router;
