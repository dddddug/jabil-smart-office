/**
 * 通知辅助函数
 * 用于创建系统通知
 */

const NOTIFICATION_TABLE = 'jso_system_notification';

/**
 * 创建通知
 * @param {Object} pool - 数据库连接池
 * @param {Object} options - 通知选项
 * @param {number} options.userId - 接收通知的用户ID
 * @param {string} options.icon - 通知图标
 * @param {string} options.title - 通知标题
 * @param {string} options.message - 通知消息
 * @param {string} options.type - 通知类型
 * @param {Object} options.relatedData - 关联数据
 */
export const createNotification = async (pool, { userId, icon, title, message, type, relatedData }) => {
  try {
    await pool.query(
      `INSERT INTO ${NOTIFICATION_TABLE} (user_id, icon, title, message, type, related_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, icon, title, message, type, JSON.stringify(relatedData || {})]
    );
  } catch (err) {
    console.error('创建通知失败:', err.message);
  }
};

/**
 * 根据用户姓名获取用户ID
 * @param {Object} pool - 数据库连接池
 * @param {string} userName - 用户真实姓名
 * @returns {number|null} 用户ID
 */
export const getUserIdByName = async (pool, userName) => {
  if (!userName) return null;
  try {
    const result = await pool.query(
      `SELECT id FROM jso_system_user_management WHERE real_name = $1 OR username = $1 LIMIT 1`,
      [userName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (err) {
    console.error('获取用户ID失败:', err.message);
    return null;
  }
};

/**
 * 根据部门ID获取所有用户ID
 * @param {Object} pool - 数据库连接池
 * @param {number} departmentId - 部门ID
 * @returns {number[]} 用户ID数组
 */
export const getUserIdsByDepartment = async (pool, departmentId) => {
  if (!departmentId) return [];
  try {
    const result = await pool.query(
      `SELECT id FROM jso_system_user_management WHERE department_id = $1 AND is_active = true`,
      [departmentId]
    );
    return result.rows.map(row => row.id);
  } catch (err) {
    console.error('获取部门用户失败:', err.message);
    return [];
  }
};

/**
 * 发送通知给单个用户
 */
export const notifyUser = async (pool, userName, icon, title, message, type, relatedData) => {
  const userId = await getUserIdByName(pool, userName);
  if (userId) {
    await createNotification(pool, { userId, icon, title, message, type, relatedData });
  }
};

/**
 * 发送通知给部门所有用户
 */
export const notifyDepartment = async (pool, departmentId, icon, title, message, type, relatedData) => {
  const userIds = await getUserIdsByDepartment(pool, departmentId);
  for (const userId of userIds) {
    await createNotification(pool, { userId, icon, title, message, type, relatedData });
  }
};

export default {
  createNotification,
  getUserIdByName,
  getUserIdsByDepartment,
  notifyUser,
  notifyDepartment
};
