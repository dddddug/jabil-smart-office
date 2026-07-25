import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';

const DEPT_RULES_TABLE = 'jso_config_dept_calc_rules';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';

// 获取所有部门计算规则 (包含完整信息)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.plant_id, r.department_id, r.business_month, 
        r.estimated_cost, r.exchange_rate, r.rate_coefficient, 
        r.start_time, r.end_time, r.created_at, r.updated_at,
        p.name as "plantName",
        d.name as "departmentName"
      FROM ${DEPT_RULES_TABLE} r
      LEFT JOIN ${PLANT_TABLE} p ON r.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON r.department_id = d.id
      ORDER BY r.plant_id, r.department_id, r.start_time DESC
    `;
    const result = await pool.query(query);
    
    res.json(result.rows.map(row => ({
      ...row,
      startTime: row.start_time ? dayjs(row.start_time).format('YYYY-MM-DD HH:mm:ss') : null,
      endTime: row.end_time ? dayjs(row.end_time).format('YYYY-MM-DD HH:mm:ss') : null,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss'),
    })));
  } catch (error) {
    console.error('Error fetching department calculation rules:', error);
    res.status(500).json({ message: 'Error fetching department calculation rules', error });
  }
});

// 新增部门计算规则
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { plantId, departmentId, businessMonth, estimatedCost, exchangeRate, rateCoefficient, startTime, endTime } = req.body;

    await client.query('BEGIN');

    // 停用重叠的旧规则
    await client.query(
      `UPDATE ${DEPT_RULES_TABLE} SET end_time = $1 
       WHERE plant_id = $2 AND department_id = $3 AND business_month = $4 AND (end_time IS NULL OR end_time > $1)`,
      [startTime, plantId, departmentId, businessMonth]
    );

    // 插入新规则
    const result = await client.query(
      `INSERT INTO ${DEPT_RULES_TABLE} (plant_id, department_id, business_month, estimated_cost, exchange_rate, rate_coefficient, start_time, end_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [plantId, departmentId, businessMonth, estimatedCost, exchangeRate, rateCoefficient, startTime, endTime || null]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating department calculation rule:', error);
    res.status(500).json({ message: 'Error creating department calculation rule', error });
  } finally {
    client.release();
  }
});

// 停用部门计算规则
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${DEPT_RULES_TABLE} SET end_time = CURRENT_TIMESTAMP WHERE id = $1 AND end_time IS NULL RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rule not found or already deactivated' });
    }
    res.json({ message: 'Rule deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating rule:', error);
    res.status(500).json({ message: 'Error deactivating rule', error });
  }
});

export default router;
