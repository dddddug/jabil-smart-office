/**
 * 管控物料 规则配置控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';

// 配置表名
const CONFIG_TABLE = 'jso_da_material_notification_config';

/**
 * 获取所有配置
 */
export const getDAMaterialConfigs = async (req, res, next) => {
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
    logError('获取管控物料配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 更新配置
 */
export const updateDAMaterialConfigs = async (req, res, next) => {
  try {
    const configs = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ code: 400, message: '配置数据格式错误' });
    }

    const updatedConfigs = [];

    for (const config of configs) {
      const { configKey, configValue } = config;

      // 使用 INSERT ... ON CONFLICT DO UPDATE 支持插入新记录
      const result = await pool.query(`
        INSERT INTO ${CONFIG_TABLE} (config_key, config_value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (config_key) DO UPDATE SET
          config_value = EXCLUDED.config_value,
          updated_at = NOW()
        RETURNING id, config_key, config_value
      `, [configKey, configValue]);

      if (result.rows.length > 0) {
        updatedConfigs.push(result.rows[0]);
      }
    }

    logInfo('管控物料配置已更新', { configs: updatedConfigs });
    success(res, updatedConfigs, '配置更新成功');
  } catch (err) {
    logError('更新管控物料配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取单个配置值（供其他控制器使用）
 */
export const getDAMaterialConfigValue = async (configKey, defaultValue = '') => {
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
export const getDAMaterialReturnNotificationEmail = async () => {
  return getDAMaterialConfigValue('return_notification_email', '');
};

/**
 * 检查是否启用退回邮件通知
 */
export const isDAMaterialReturnNotificationEnabled = async () => {
  const value = await getDAMaterialConfigValue('return_notification_enabled', 'true');
  return value === 'true';
};

/**
 * 检查退回时是否自动发送邮件
 */
export const isDAMaterialAutoNotifyOnReturn = async () => {
  const value = await getDAMaterialConfigValue('auto_notify_on_return', 'true');
  return value === 'true';
};

/**
 * 获取管控类型列表
 */
export const getControlTypes = async () => {
  const value = await getDAMaterialConfigValue('control_types', '正常,加急,样品');
  return value.split(',').map(s => s.trim()).filter(s => s);
};

/**
 * 获取 W/C 用户分配配置
 */
export const getWCUserAssignment = async () => {
  const value = await getDAMaterialConfigValue('wc_department_assignment', '[]');
  try {
    return JSON.parse(value);
  } catch (e) {
    return [];
  }
};

export default {
  getDAMaterialConfigs,
  updateDAMaterialConfigs,
  getDAMaterialConfigValue,
  getDAMaterialReturnNotificationEmail,
  isDAMaterialReturnNotificationEnabled,
  isDAMaterialAutoNotifyOnReturn,
  getControlTypes,
  getWCUserAssignment
};
