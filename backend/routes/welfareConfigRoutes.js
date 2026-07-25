import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件

const WELFARE_TABLE = 'jso_config_welfare';

// 获取所有福利配置（按员工类型分组，展示所有历史）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${WELFARE_TABLE} ORDER BY employee_type, start_time DESC`);
    res.json(result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount), // 确保 amount 是数字
      startTime: dayjs(row.start_time).format('YYYY-MM-DD HH:mm:ss'),
      endTime: row.end_time ? dayjs(row.end_time).format('YYYY-MM-DD HH:mm:ss') : null,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching welfare config', error });
  }
});

// 新增一条福利规则（会自动停用同类型的旧规则）
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { employee_type, amount, startTime, endTime } = req.body;

    // 检查是否存在当前生效的福利配置
    const activeConfig = await client.query(
      `SELECT * FROM ${WELFARE_TABLE} WHERE employee_type = $1 AND end_time IS NULL`,
      [employee_type]
    );

    if (activeConfig.rows.length > 0) {
      return res.status(409).json({ message: '已有生效的福利配置，请先停用现有配置再新增。' });
    }

    await client.query('BEGIN');

    // 插入新规则
    const result = await client.query(
      `INSERT INTO ${WELFARE_TABLE} (employee_type, amount, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *`,
      [employee_type, amount, startTime, endTime || null]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error creating welfare config', error });
  } finally {
    client.release();
  }
});

// 停用一条规则
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE ${WELFARE_TABLE} SET end_time = CURRENT_TIMESTAMP WHERE id = $1 AND end_time IS NULL RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rule not found or already deactivated' });
    }
    res.json({ message: 'Rule deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating rule', error });
  }
});

export default router;
