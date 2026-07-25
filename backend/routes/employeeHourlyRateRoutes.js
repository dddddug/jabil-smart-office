import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
import dayjs from 'dayjs';

const HOURLY_RATES_TABLE = 'jso_config_employee_hourly_rates';

// 获取所有时薪配置，包括历史记录
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ${HOURLY_RATES_TABLE} ORDER BY level, start_time DESC`);
    
    const rates = result.rows.map(row => {
      try {
        return {
          id: row.id,
          level: row.level,
          standardRate: parseFloat(row.standard_rate),
          startTime: row.start_time ? dayjs(row.start_time).format('YYYY-MM-DD HH:mm:ss') : null,
          endTime: row.end_time ? dayjs(row.end_time).format('YYYY-MM-DD HH:mm:ss') : null,
        };
      } catch (parseError) {
        console.error('Error parsing row data:', row, parseError); // Log parsing errors
          throw parseError; // Re-throw to be caught by the main catch block
      }
    });
    
    res.json(rates);
  } catch (error) {
    console.error('获取时薪配置失败:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ code: 500, message: '获取时薪配置失败' });
  }
});

// 新增一个时薪标准
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { level, standardRate, startTime, endTime } = req.body;

    if (!level || typeof standardRate === 'undefined' || !startTime) {
      return res.status(400).json({ code: 400, message: '级别、费率和启用时间不能为空' });
    }

    await client.query('BEGIN');

    // 将与新标准时间范围重叠的同级别旧标准“截断”
    // Find active rates for the same level that overlap with the new rate's start time
    const overlappingRates = await client.query(
      `SELECT id FROM ${HOURLY_RATES_TABLE}
       WHERE level = $1 AND (end_time IS NULL OR end_time > $2) AND start_time < $2`,
      [level, startTime]
    );

    if (overlappingRates.rows.length > 0) {
      // For each overlapping rate, set its end_time to the new rate's start_time
      for (const row of overlappingRates.rows) {
        await client.query(
          `UPDATE ${HOURLY_RATES_TABLE}
           SET end_time = $1
           WHERE id = $2`,
          [startTime, row.id]
        );
      }
    }

    // 插入新标准
    const result = await client.query(
      `INSERT INTO ${HOURLY_RATES_TABLE} (level, standard_rate, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *`,
      [level, standardRate, startTime, endTime || null]
    );

    await client.query('COMMIT');
    
    res.status(201).json({ code: 201, message: '新增成功', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('新增时薪标准失败:', error);
    res.status(500).json({ code: 500, message: '新增时薪标准失败' });
  } finally {
    client.release();
  }
});



// 停用一个时薪标准（即设置其结束时间为当前）
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE ${HOURLY_RATES_TABLE} SET end_time = CURRENT_TIMESTAMP WHERE id = $1 AND end_time IS NULL RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '该标准不存在或已被停用' });
    }
    
    res.json({ code: 200, message: '停用成功' });
  } catch (error) {
    console.error('停用时薪标准失败:', error);
    res.status(500).json({ code: 500, message: '停用时薪标准失败' });
  }
});

export default router;
