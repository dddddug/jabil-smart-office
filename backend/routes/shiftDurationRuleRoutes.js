import express from 'express';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { buildWhereClause, buildPagination } from '../utils/sqlUtils.js';
const router = express.Router();

const SHIFT_DURATION_RULES_TABLE = 'jso_config_shift_duration_rules';
const PLANT_TABLE = 'jso_org_plant_management'; // 需要厂区表来获取厂区名称
const DEPT_TABLE = 'jso_org_department_management'; // 需要部门表来获取部门名称

// 获取班次时长规则列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, plantId, departmentId, shiftName, status } = req.query;
    const { limit, offset, page: currentPage } = buildPagination(page, pageSize);

    const where = buildWhereClause([
      { sql: ' AND r.plant_id = ?', value: plantId },
      { sql: ' AND r.department_id = ?', value: departmentId },
      { sql: ' AND r.shift_name ILIKE ?', value: shiftName, transform: (val) => `%${val}%` },
      { sql: ' AND r.status = ?', value: status }
    ]);

    const query = `
      SELECT r.*, p.name as plant_name, d.name as department_name
      FROM ${SHIFT_DURATION_RULES_TABLE} r
      JOIN ${PLANT_TABLE} p ON r.plant_id = p.id
      JOIN ${DEPT_TABLE} d ON r.department_id = d.id
    ` + where.clause + ` ORDER BY r.created_at DESC LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}`;

    const countQuery = `SELECT COUNT(*) FROM ${SHIFT_DURATION_RULES_TABLE} r` + where.clause;

    const result = await pool.query(query, [...where.values, limit, offset]);
    const totalResult = await pool.query(countQuery, where.values);

    const rules = result.rows.map(row => ({
      id: row.id,
      plantId: row.plant_id,
      plantName: row.plant_name,
      departmentId: row.department_id,
      departmentName: row.department_name,
      shiftName: row.shift_name,
      durationHours: parseFloat(row.duration_hours),
      description: row.description,
      status: row.status,
      enabledAt: row.enabled_at ? dayjs(row.enabled_at).format('YYYY-MM-DD HH:mm:ss') : null,
      disabledAt: row.disabled_at ? dayjs(row.disabled_at).format('YYYY-MM-DD HH:mm:ss') : null,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: row.updated_at ? dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss') : null,
    }));

    const total = parseInt(totalResult.rows[0].count, 10);
    res.json({ code: 200, message: '获取成功', data: { list: rules, total, page: currentPage, pageSize: limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('获取班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '获取班次时长规则失败', error: error.message });
  }
});

// 创建班次时长规则
router.post('/', async (req, res) => {
  try {
    const { plantId, departmentId, shiftName, durationHours, description = '' } = req.body;

    const result = await pool.query(
      `INSERT INTO ${SHIFT_DURATION_RULES_TABLE} (plant_id, department_id, shift_name, duration_hours, description, status, enabled_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [plantId, departmentId, shiftName, durationHours, description, 'active']
    );
    const newRule = result.rows[0];
    res.json({ code: 200, message: '创建成功', data: newRule });
  } catch (error) {
    console.error('创建班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '创建班次时长规则失败', error: error.message });
  }
});

// 更新班次时长规则
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { shiftName, durationHours, description = '' } = req.body;

    const result = await pool.query(
      `UPDATE ${SHIFT_DURATION_RULES_TABLE} SET shift_name = $1, duration_hours = $2, description = $3 WHERE id = $4 RETURNING *`,
      [shiftName, durationHours, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('更新班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '更新班次时长规则失败', error: error.message });
  }
});

// 删除班次时长规则
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${SHIFT_DURATION_RULES_TABLE} WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '删除班次时长规则失败', error: error.message });
  }
});

// 启用班次时长规则
router.post('/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${SHIFT_DURATION_RULES_TABLE} SET status = 'active', enabled_at = NOW(), disabled_at = NULL WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '启用成功', data: result.rows[0] });
  } catch (error) {
    console.error('启用班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '启用班次时长规则失败', error: error.message });
  }
});

// 停用班次时长规则
router.post('/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${SHIFT_DURATION_RULES_TABLE} SET status = 'inactive', disabled_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '规则不存在' });
    }
    res.json({ code: 200, message: '停用成功', data: result.rows[0] });
  } catch (error) {
    console.error('停用班次时长规则失败:', error);
    res.status(500).json({ code: 500, message: '停用班次时长规则失败', error: error.message });
  }
});

export default router;
