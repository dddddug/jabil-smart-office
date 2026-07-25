import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';

const DEPT_TABLE = 'jso_org_department_management';
const PLANT_TABLE = 'jso_org_plant_management'; // 需要厂区表来获取厂区名称
const USER_TABLE = 'jso_system_user_management'; // 需要用户表来关联 manager_name


// 获取所有部门（带厂区信息）
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.name as plant_name, u.real_name as manager_name, u.id as manager_id
      FROM ${DEPT_TABLE} d 
      JOIN ${PLANT_TABLE} p ON d.plant_id = p.id 
      LEFT JOIN ${USER_TABLE} u ON d.manager_id = u.id
      ORDER BY d.id
    `);
    const departments = result.rows.map(row => ({
      id: row.id,
      plantId: row.plant_id,
      plantName: row.plant_name,
      name: row.name,
      description: row.description,
      managerId: row.manager_id,
      managerName: row.manager_name,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));
    res.json({ code: 200, message: '获取成功', data: { departments } });
  } catch (error) {
    console.error('获取部门失败:', error);
    res.status(500).json({ code: 500, message: '获取部门失败' });
  }
});

// 获取指定厂区的部门
router.get('/plants/:plantId/departments', async (req, res) => {
  try {
    const { plantId } = req.params;
    const result = await pool.query(
      `SELECT d.*, u.real_name as manager_name, u.id as manager_id 
       FROM ${DEPT_TABLE} d 
       LEFT JOIN ${USER_TABLE} u ON d.manager_id = u.id
       WHERE d.plant_id = $1 ORDER BY d.id`,
      [plantId]
    );
    const departments = result.rows.map(row => ({
      id: row.id,
      plantId: row.plant_id,
      name: row.name,
      description: row.description,
      managerId: row.manager_id,
      managerName: row.manager_name,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));
    res.json({ code: 200, message: '获取成功', data: { departments } });
  } catch (error) {
    console.error('获取部门失败:', error);
    res.status(500).json({ code: 500, message: '获取部门失败' });
  }
});

// 创建部门
router.post('/', async (req, res) => {

  try {
    const { plantId, name, description, managerId } = req.body;
    const result = await pool.query(
      `INSERT INTO ${DEPT_TABLE} (plant_id, name, description, manager_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [plantId, name, description, managerId || null]
    );
    const newDept = result.rows[0];
    
    // 获取厂区名称
    const plantResult = await pool.query(`SELECT name FROM ${PLANT_TABLE} WHERE id = $1`, [plantId]);
    const plantName = plantResult.rows[0]?.name || '';
    
    res.json({
      department: {
        id: newDept.id,
        plantId: newDept.plant_id,
        plantName: plantName,
        name: newDept.name,
        description: newDept.description,
        managerId: newDept.manager_id,
        createdAt: dayjs(newDept.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({ error: '创建部门失败' });
  }
});

// 更新部门
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { plantId, name, description, managerId } = req.body;
    const result = await pool.query(
      `UPDATE ${DEPT_TABLE} SET plant_id = $1, name = $2, description = $3, manager_id = $4 WHERE id = $5 RETURNING *`,
      [plantId, name, description, managerId || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    const updatedDept = result.rows[0];
    
    // 获取厂区名称
    const plantResult = await pool.query(`SELECT name FROM ${PLANT_TABLE} WHERE id = $1`, [plantId]);
    const plantName = plantResult.rows[0]?.name || '';
    
    res.json({
      department: {
        id: updatedDept.id,
        plantId: updatedDept.plant_id,
        plantName: plantName,
        name: updatedDept.name,
        description: updatedDept.description,
        managerId: updatedDept.manager_id,
        createdAt: dayjs(updatedDept.created_at).format('YYYY-MM-DD')
      }
    });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ error: '更新部门失败' });
  }
});

// 删除部门
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM ${DEPT_TABLE} WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '部门不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ error: '删除部门失败' });
  }
});

export default router;