/**
 * 岗位原因配置控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';

const TABLE_NAME = 'jso_position_reason_config';

/**
 * 获取所有岗位原因配置
 */
export const getPositionReasons = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, position, reason, created_at, updated_at
      FROM ${TABLE_NAME}
      ORDER BY id
    `);

    const data = result.rows.map(row => ({
      id: row.id,
      position: row.position,
      reason: row.reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    success(res, data, '获取成功');
  } catch (err) {
    logError('获取岗位原因配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 保存岗位原因配置（批量更新）
 */
export const savePositionReasons = async (req, res, next) => {
  try {
    const { reasons } = req.body;

    if (!Array.isArray(reasons)) {
      return res.status(400).json({
        code: 400,
        message: '配置数据格式错误，请提供配置数组'
      });
    }

    // 开启事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 清空现有配置
      await client.query(`DELETE FROM ${TABLE_NAME}`);

      // 批量插入新配置
      for (const item of reasons) {
        if (item.position && item.reason) {
          await client.query(`
            INSERT INTO ${TABLE_NAME} (position, reason)
            VALUES ($1, $2)
          `, [item.position.trim(), item.reason.trim()]);
        }
      }

      await client.query('COMMIT');
      logInfo('岗位原因配置保存成功', { count: reasons.length });
      success(res, null, '配置保存成功');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logError('保存岗位原因配置失败', { error: err.message });
    next(err);
  }
};

export default {
  getPositionReasons,
  savePositionReasons
};
