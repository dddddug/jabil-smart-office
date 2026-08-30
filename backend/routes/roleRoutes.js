import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件

const TABLE_NAME = 'jso_system_role_management';

// 获取所有角色
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${TABLE_NAME} ORDER BY id`);
    const roles = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));
    res.json({ code: 200, message: 'success', data: roles });
  } catch (error) {
    console.error('获取角色失败:', error);
    res.status(500).json({ code: 500, message: '获取角色失败' });
  }
});

// 创建角色
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO ${TABLE_NAME} (name, description, status) VALUES ($1, $2, $3) RETURNING *`,
      [name, description, status || 'active']
    );
    const newRole = result.rows[0];
    res.json({
      code: 200,
      message: 'success',
      data: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        status: newRole.status,
        createdAt: dayjs(newRole.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ code: 500, message: '创建角色失败' });
  }
});

// 更新角色
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const result = await pool.query(
      `UPDATE ${TABLE_NAME} SET name = $1, description = $2, status = $3 WHERE id = $4 RETURNING *`,
      [name, description, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    const updatedRole = result.rows[0];
    res.json({
      code: 200,
      message: 'success',
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        status: updatedRole.status,
        createdAt: dayjs(updatedRole.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ code: 500, message: '更新角色失败' });
  }
});

// 删除角色
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    res.json({ code: 200, message: 'success', data: null });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ code: 500, message: '删除角色失败' });
  }
});

// 批量同步角色（覆盖更新）
router.put('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { roles } = req.body;

    // 清空现有数据
    await client.query(`DELETE FROM ${TABLE_NAME}`);

    // 重置序列
    await client.query(`ALTER SEQUENCE ${TABLE_NAME}_id_seq RESTART WITH 1`);

    // 插入新数据
    for (const role of roles) {
      await client.query(
        `INSERT INTO ${TABLE_NAME} (id, name, description, status, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [role.id, role.name, role.description, role.status, role.createdAt]
      );
    }

    await client.query('COMMIT');

    // 返回最新数据
    const result = await pool.query(`SELECT * FROM ${TABLE_NAME} ORDER BY id`);
    const savedRoles = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));

    res.json({ code: 200, message: 'success', data: savedRoles });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('同步角色失败:', error);
    res.status(500).json({ code: 500, message: '同步角色失败' });
  } finally {
    client.release();
  }
});

export default router;
