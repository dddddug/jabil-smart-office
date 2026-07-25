/**
 * K045 规则配置控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';

// 配置表名
const CONFIG_TABLE = 'jso_k045_notification_config';

/**
 * 获取所有配置
 */
export const getK045Configs = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, config_key, config_value, description, created_at, updated_at
      FROM ${CONFIG_TABLE}
      ORDER BY id
    `);

    const configs = result.rows.map(row => ({
      id: row.id,
      configKey: row.config_key,
      configValue: row.config_value,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    success(res, configs, '获取配置成功');
  } catch (err) {
    logError('获取K045配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 更新配置
 */
export const updateK045Configs = async (req, res, next) => {
  try {
    const configs = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ code: 400, message: '配置数据格式错误' });
    }

    const updatedConfigs = [];

    for (const config of configs) {
      const { configKey, configValue } = config;

      const result = await pool.query(`
        UPDATE ${CONFIG_TABLE}
        SET config_value = $1, updated_at = NOW()
        WHERE config_key = $2
        RETURNING id, config_key, config_value
      `, [configValue, configKey]);

      if (result.rows.length > 0) {
        updatedConfigs.push(result.rows[0]);
      }
    }

    logInfo('K045配置已更新', { configs: updatedConfigs });
    success(res, updatedConfigs, '配置更新成功');
  } catch (err) {
    logError('更新K045配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取单个配置值（供其他控制器使用）
 */
export const getConfigValue = async (configKey, defaultValue = '') => {
  try {
    const result = await pool.query(
      `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = $1`,
      [configKey]
    );
    return result.rows.length > 0 ? result.rows[0].config_value : defaultValue;
  } catch (err) {
    logError('获取配置值失败', { configKey, error: err.message });
    return defaultValue;
  }
};

/**
 * 获取退回通知邮箱
 */
export const getReturnNotificationEmail = async () => {
  return getConfigValue('return_notification_email', '');
};

/**
 * 检查是否启用退回邮件通知
 */
export const isReturnNotificationEnabled = async () => {
  const value = await getConfigValue('return_notification_enabled', 'true');
  return value === 'true';
};

/**
 * 检查退回时是否自动发送邮件
 */
export const isAutoNotifyOnReturn = async () => {
  const value = await getConfigValue('auto_notify_on_return', 'true');
  return value === 'true';
};

/**
 * 获取配送地点列表
 */
export const getDeliveryLocations = async () => {
  const value = await getConfigValue('delivery_locations', 'Kitting,仓库');
  return value.split(',').map(s => s.trim()).filter(s => s);
};

/**
 * 获取允许签收分料的用户列表
 */
export const getAllowedSignUsers = async () => {
  const value = await getConfigValue('allowed_sign_users', '');
  return value.split(',').map(s => s.trim()).filter(s => s);
};

/**
 * 检查用户是否有权限签收分料
 */
export const isUserAllowedToSign = async (username) => {
  const allowedUsers = await getAllowedSignUsers();
  if (allowedUsers.length === 0) {
    return true; // 如果没有配置任何用户，则允许所有人
  }
  return allowedUsers.includes(username);
};

export default {
  getK045Configs,
  updateK045Configs,
  getConfigValue,
  getReturnNotificationEmail,
  isReturnNotificationEnabled,
  isAutoNotifyOnReturn,
  getDeliveryLocations,
  getAllowedSignUsers,
  isUserAllowedToSign
};
