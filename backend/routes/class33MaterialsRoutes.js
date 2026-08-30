/**
 * 33类物料清单 API
 */

import express from 'express';
import pg from 'pg';

const router = express.Router();
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '10.114.100.171',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '74454321',
  timezone: 'Asia/Shanghai',
});

const TABLE = 'jso_class33_materials';

// 获取所有物料清单
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, pageSize = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = '';
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause = `WHERE part_no ILIKE $${paramIdx} OR division ILIKE $${paramIdx}`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM ${TABLE} ${whereClause}`,
      params
    );

    // 获取列表
    const result = await pool.query(
      `SELECT id, part_no, division, created_at, updated_at
       FROM ${TABLE} ${whereClause}
       ORDER BY part_no
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('获取33类物料清单失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

// 添加物料
router.post('/', async (req, res) => {
  try {
    const { part_no, division } = req.body;

    if (!part_no) {
      return res.status(400).json({ success: false, message: '物料编号不能为空' });
    }

    const result = await pool.query(
      `INSERT INTO ${TABLE} (part_no, division) VALUES ($1, $2)
       RETURNING id, part_no, division, created_at`,
      [part_no.trim(), division || '']
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: '物料编号已存在' });
    }
    console.error('添加物料失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 批量添加物料
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '请提供有效的物料列表' });
    }

    const values = [];
    const params = [];
    let idx = 1;

    for (const item of items) {
      if (item.part_no) {
        values.push(`($${idx}, $${idx + 1})`);
        params.push(item.part_no.trim(), item.division || '');
        idx += 2;
      }
    }

    if (values.length === 0) {
      return res.status(400).json({ success: false, message: '没有有效的物料数据' });
    }

    const query = `
      INSERT INTO ${TABLE} (part_no, division)
      VALUES ${values.join(', ')}
      ON CONFLICT (part_no) DO UPDATE SET division = EXCLUDED.division, updated_at = CURRENT_TIMESTAMP
      RETURNING id, part_no, division
    `;

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('批量添加物料失败:', error);
    res.status(500).json({ success: false, message: '批量添加失败' });
  }
});

// 删除物料
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM ${TABLE} WHERE id = $1 RETURNING id, part_no`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '物料不存在' });
    }

    res.json({ success: true, message: '删除成功', data: result.rows[0] });
  } catch (error) {
    console.error('删除物料失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 更新物料
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { division } = req.body;

    const result = await pool.query(
      `UPDATE ${TABLE} SET division = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, part_no, division`,
      [division || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '物料不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('更新物料失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 批量删除物料
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要删除的ID列表' });
    }

    const result = await pool.query(
      `DELETE FROM ${TABLE} WHERE id = ANY($1) RETURNING id, part_no`,
      [ids]
    );

    res.json({ success: true, message: `删除成功 ${result.rows.length} 条`, data: result.rows });
  } catch (error) {
    console.error('批量删除物料失败:', error);
    res.status(500).json({ success: false, message: '批量删除失败' });
  }
});

// 检查物料是否在清单中（用于高亮显示）
router.post('/check', async (req, res) => {
  try {
    const { materialNos } = req.body;

    if (!Array.isArray(materialNos) || materialNos.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.query(
      `SELECT part_no FROM ${TABLE} WHERE part_no = ANY($1)`,
      [materialNos]
    );

    const matchedParts = new Set(result.rows.map(r => r.part_no));
    const isClass33 = materialNos.map(no => ({
      part_no: no,
      is_class33: matchedParts.has(no)
    }));

    res.json({ success: true, data: isClass33 });
  } catch (error) {
    console.error('检查物料失败:', error);
    res.status(500).json({ success: false, message: '检查失败' });
  }
});

// 获取所有物料编号（用于前端缓存）
router.get('/all-parts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT part_no FROM ${TABLE} ORDER BY part_no`
    );

    res.json({ success: true, data: result.rows.map(r => r.part_no) });
  } catch (error) {
    console.error('获取物料列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败' });
  }
});

export default router;
