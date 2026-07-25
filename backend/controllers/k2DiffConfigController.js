/**
 * K**差异登记 配置控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logDebug } from '../utils/logger.js';

// 配置键常量
export const K2_DIFF_CONFIG_KEYS = {
  DIFFERENCE_TYPES: 'difference_types',
  RETURN_LOCATIONS: 'return_locations',
  EMAIL_NOTIFICATION_ENABLED: 'email_notification_enabled',
  EMAIL_RECIPIENTS: 'email_recipients',
  EMAIL_CC: 'email_cc'
};

// 配置表名
const K2_DIFF_CONFIG_TABLE = 'jso_k2_diff_config';

/**
 * 获取所有配置
 */
export const getConfigs = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_key, config_value, description
      FROM ${K2_DIFF_CONFIG_TABLE}
      ORDER BY id
    `);

    const configs = result.rows.map(row => ({
      configKey: row.config_key,
      configValue: row.config_value,
      description: row.description
    }));

    success(res, configs, '获取配置成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 更新配置
 */
export const updateConfigs = async (req, res, next) => {
  try {
    const configs = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '配置数据格式错误，请提供配置数组'
      });
    }

    // 批量更新配置
    for (const config of configs) {
      const { configKey, configValue } = config;

      if (!configKey) {
        continue;
      }

      await pool.query(`
        INSERT INTO ${K2_DIFF_CONFIG_TABLE} (config_key, config_value)
        VALUES ($1, $2)
        ON CONFLICT (config_key)
        DO UPDATE SET config_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [configKey, configValue]);
    }

    logInfo('K**差异登记配置更新成功', { count: configs.length });
    success(res, null, '配置保存成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取差异类型列表
 */
export const getDifferenceTypes = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_value
      FROM ${K2_DIFF_CONFIG_TABLE}
      WHERE config_key = $1
    `, [K2_DIFF_CONFIG_KEYS.DIFFERENCE_TYPES]);

    let types = [];
    if (result.rows.length > 0 && result.rows[0].config_value) {
      try {
        types = JSON.parse(result.rows[0].config_value);
      } catch {
        types = [];
      }
    }

    success(res, types, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取退料地点列表
 */
export const getReturnLocations = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_value
      FROM ${K2_DIFF_CONFIG_TABLE}
      WHERE config_key = $1
    `, [K2_DIFF_CONFIG_KEYS.RETURN_LOCATIONS]);

    let locations = [];
    if (result.rows.length > 0 && result.rows[0].config_value) {
      try {
        locations = JSON.parse(result.rows[0].config_value);
      } catch {
        locations = [];
      }
    }

    success(res, locations, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取邮件配置
 */
export const getEmailConfig = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_key, config_value
      FROM ${K2_DIFF_CONFIG_TABLE}
      WHERE config_key IN ($1, $2, $3)
    `, [
      K2_DIFF_CONFIG_KEYS.EMAIL_NOTIFICATION_ENABLED,
      K2_DIFF_CONFIG_KEYS.EMAIL_RECIPIENTS,
      K2_DIFF_CONFIG_KEYS.EMAIL_CC
    ]);

    const config = {
      enabled: false,
      recipients: '',
      cc: ''
    };

    result.rows.forEach(row => {
      switch (row.config_key) {
        case K2_DIFF_CONFIG_KEYS.EMAIL_NOTIFICATION_ENABLED:
          config.enabled = row.config_value === 'true';
          break;
        case K2_DIFF_CONFIG_KEYS.EMAIL_RECIPIENTS:
          config.recipients = row.config_value || '';
          break;
        case K2_DIFF_CONFIG_KEYS.EMAIL_CC:
          config.cc = row.config_value || '';
          break;
      }
    });

    success(res, config, '获取成功');
  } catch (err) {
    next(err);
  }
};

export default {
  K2_DIFF_CONFIG_KEYS,
  getConfigs,
  updateConfigs,
  getDifferenceTypes,
  getReturnLocations,
  getEmailConfig
};
