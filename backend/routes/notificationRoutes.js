import express from 'express';
import pool from '../config/db.js';
import dayjs from 'dayjs';
import { buildWhereClause } from '../utils/sqlUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件

const router = express.Router();

const NOTIFICATION_TABLE = 'jso_system_notification';
const USER_TABLE = 'jso_system_user_management';

// ========== 通知管理 API ==========

// 获取当前用户的通知列表
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, read } = req.query;
    const where = buildWhereClause([
      { sql: ' AND n.user_id = ?', value: userId },
      { sql: ' AND n.read = ?', value: read !== undefined ? read === 'true' : undefined }
    ]);

    const query = `
      SELECT n.*, u.real_name as user_name
      FROM ${NOTIFICATION_TABLE} n
      LEFT JOIN ${USER_TABLE} u ON n.user_id = u.id
    ` + where.clause + ` ORDER BY n.created_at DESC`;

    const result = await pool.query(query, where.values);
    
    const notifications = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      icon: row.icon,
      title: row.title,
      message: row.message,
      detail: row.detail,
      type: row.type,
      relatedData: row.related_data,
      read: row.read,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs(row.updated_at).format('YYYY-MM-DD HH:mm:ss')
    }));
    
    res.json({ notifications });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 获取未读通知数量
router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const where = buildWhereClause([
      { sql: ' AND read = false', value: true },
      { sql: ' AND user_id = ?', value: userId }
    ]);

    const query = `SELECT COUNT(*) as count FROM ${NOTIFICATION_TABLE}` + where.clause;
    const result = await pool.query(query, where.values);
    const count = parseInt(result.rows[0].count);
    
    res.json({ count });
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    res.status(500).json({ error: '获取未读通知数量失败' });
  }
});

// 标记通知为已读
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE ${NOTIFICATION_TABLE} SET read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('标记通知为已读失败:', error);
    res.status(500).json({ error: '标记通知为已读失败' });
  }
});

// 标记所有通知为已读
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const where = buildWhereClause([
      { sql: ' AND read = false', value: true },
      { sql: ' AND user_id = ?', value: userId }
    ]);

    const query = `UPDATE ${NOTIFICATION_TABLE} SET read = true, updated_at = CURRENT_TIMESTAMP` + where.clause;
    await pool.query(query, where.values);

    res.json({ success: true });
  } catch (error) {
    console.error('标记所有通知为已读失败:', error);
    res.status(500).json({ error: '标记所有通知为已读失败' });
  }
});

// 创建通知
router.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, icon, title, message, detail, type, relatedData } = req.body;
    
    const result = await pool.query(
      `INSERT INTO ${NOTIFICATION_TABLE} 
       (user_id, icon, title, message, detail, type, related_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, icon, title, message, detail, type, relatedData]
    );
    
    const newNotification = result.rows[0];
    
    res.json({
      notification: {
        id: newNotification.id,
        userId: newNotification.user_id,
        icon: newNotification.icon,
        title: newNotification.title,
        message: newNotification.message,
        detail: newNotification.detail,
        type: newNotification.type,
        relatedData: newNotification.related_data,
        read: newNotification.read,
        createdAt: dayjs(newNotification.created_at).format('YYYY-MM-DD HH:mm:ss')
      }
    });
  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json({ error: '创建通知失败' });
  }
});

// 删除通知
router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`DELETE FROM ${NOTIFICATION_TABLE} WHERE id = $1 RETURNING *`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ error: '删除通知失败' });
  }
});

export default router;