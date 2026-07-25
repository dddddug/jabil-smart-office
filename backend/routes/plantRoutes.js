import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';

const PLANT_TABLE = 'jso_org_plant_management';
const USER_TABLE = 'jso_system_user_management'; // 需要用户表来关联 manager_name

// 获取所有厂区
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.real_name as manager_name, u.id as manager_id
      FROM ${PLANT_TABLE} p 
      LEFT JOIN ${USER_TABLE} u ON p.manager_id = u.id
      ORDER BY p.id
    `);
    const plants = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      managerId: row.manager_id,
      managerName: row.manager_name,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));
    res.json({ code: 200, message: '获取成功', data: { plants } });
  } catch (error) {
    console.error('获取厂区失败:', error);
    res.status(500).json({ code: 500, message: '获取厂区失败' });
  }
});

// 创建厂区
router.post('/', async (req, res) => {
  try {
    const { name, description, managerId } = req.body;
    const result = await pool.query(
      `INSERT INTO ${PLANT_TABLE} (name, description, manager_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, description, managerId || null]
    );
    const newPlant = result.rows[0];
    res.json({
      plant: {
        id: newPlant.id,
        name: newPlant.name,
        description: newPlant.description,
        managerId: newPlant.manager_id,
        createdAt: dayjs(newPlant.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('创建厂区失败:', error);
    res.status(500).json({ error: '创建厂区失败' });
  }
});

// 更新厂区
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, managerId } = req.body;
    const result = await pool.query(
      `UPDATE ${PLANT_TABLE} SET name = $1, description = $2, manager_id = $3 WHERE id = $4 RETURNING *`,
      [name, description, managerId || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '厂区不存在' });
    }
    const updatedPlant = result.rows[0];
    res.json({
      plant: {
        id: updatedPlant.id,
        name: updatedPlant.name,
        description: updatedPlant.description,
        managerId: updatedPlant.manager_id,
        createdAt: dayjs(updatedPlant.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('更新厂区失败:', error);
    res.status(500).json({ error: '更新厂区失败' });
  }
});

// 删除厂区
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // 启动事务
    await client.query('BEGIN');

    // 删除关联的用户
    await client.query(`DELETE FROM jso_system_user_management WHERE plant_id = $1`, [id]);

    // 删除厂区 (关联部门将通过 ON DELETE CASCADE 自动删除)
    const result = await client.query(`DELETE FROM ${PLANT_TABLE} WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 404, message: '厂区不存在' });
    }

    await client.query('COMMIT');
    res.json({ code: 200, message: '删除成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('删除厂区失败:', error);
    res.status(500).json({ code: 500, message: '删除厂区失败' });
  } finally {
    client.release();
  }
});

export default router;