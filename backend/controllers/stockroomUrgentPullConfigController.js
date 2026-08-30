/**
 * Stockroom Urgent Pull 配置控制器
 */
import pool from '../config/db.js';
import { logInfo, logError } from '../utils/logger.js';

const TABLE_NAME = 'jso_stockroom_urgent_pull_config';

/**
 * 获取所有配置
 */
export const getConfigs = async (req, res, next) => {
  try {
    const { config_type } = req.query;

    let query = `SELECT * FROM ${TABLE_NAME} WHERE is_active = true`;
    const params = [];

    if (config_type) {
      query += ` AND config_type = $1`;
      params.push(config_type);
    }

    query += ` ORDER BY config_type, sort_order, id`;

    const result = await pool.query(query, params);

    // 按类型分组返回
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.config_type]) {
        grouped[row.config_type] = [];
      }
      grouped[row.config_type].push({
        id: row.id,
        configKey: row.config_key,
        configValue: row.config_value,
        docType: row.description || '借料',
        description: row.description,
        sortOrder: row.sort_order,
        isActive: row.is_active
      });
    });

    res.json({
      code: 200,
      message: 'success',
      data: grouped
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '获取配置失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '获取配置失败: ' + error.message
    });
  }
};

/**
 * 创建或更新配置
 */
export const saveConfig = async (req, res, next) => {
  try {
    const { config_type, config_key, config_value, description, doc_type, sort_order, is_active } = req.body;
    const userId = req.user?.id;

    if (!config_type || !config_key || config_value === undefined) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数: config_type, config_key, config_value'
      });
    }

    // 对于 pulllist_type，只允许有效的仓位名称
    if (config_type === 'pulllist_type') {
      const validLocations = ['T01', 'T11', 'T13', 'T14', 'T16', 'T07&T08', 'T07', 'T08'];
      const normalizedKey = config_key?.toUpperCase().replace(/[^A-Z0-9&]/g, '');
      const isValidLocation = validLocations.some(loc =>
        normalizedKey.includes(loc.replace('&', '').toUpperCase())
      );
      if (!isValidLocation) {
        return res.status(400).json({
          code: 400,
          message: '无效的仓位名称'
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO ${TABLE_NAME} (config_type, config_key, config_value, description, sort_order, is_active, created_by, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW())
      ON CONFLICT (config_type, config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `, [config_type, config_key, config_value, doc_type || description || '借料', sort_order || 0, is_active !== false, userId]);

    logInfo('StockroomUrgentPullConfig', '保存配置成功', { config_type, config_key });

    res.json({
      code: 200,
      message: '保存成功',
      data: result.rows[0]
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '保存配置失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '保存配置失败: ' + error.message
    });
  }
};

/**
 * 批量保存配置
 */
export const saveConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        code: 400,
        message: 'configs 必须是数组且不能为空'
      });
    }

    // 对于 pulllist_type，只允许有效的仓位名称
    const validLocations = ['T01', 'T11', 'T13', 'T14', 'T16', 'T07&T08', 'T07', 'T08'];

    const results = [];
    for (const config of configs) {
      const { config_type, config_key, config_value, doc_type, sort_order, is_active } = config;

      // 跳过无效的配置
      if (config_type === 'pulllist_type') {
        const normalizedKey = config_key?.toUpperCase().replace(/[^A-Z0-9&]/g, '');
        const isValidLocation = validLocations.some(loc =>
          normalizedKey.includes(loc.replace('&', '').toUpperCase())
        );
        if (!isValidLocation) {
          continue;
        }
      }

      const result = await pool.query(`
        INSERT INTO ${TABLE_NAME} (config_type, config_key, config_value, description, sort_order, is_active, created_by, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW())
        ON CONFLICT (config_type, config_key)
        DO UPDATE SET
          config_value = EXCLUDED.config_value,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `, [config_type, config_key, config_value, doc_type || '借料', sort_order || 0, is_active !== false, userId]);

      results.push(result.rows[0]);
    }

    logInfo('StockroomUrgentPullConfig', '批量保存配置成功', { count: results.length });

    res.json({
      code: 200,
      message: '保存成功',
      data: results
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '批量保存配置失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '批量保存配置失败: ' + error.message
    });
  }
};

/**
 * 删除配置
 */
export const deleteConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少参数: id'
      });
    }

    await pool.query(`DELETE FROM ${TABLE_NAME} WHERE id = $1`, [id]);

    logInfo('StockroomUrgentPullConfig', '删除配置成功', { id });

    res.json({
      code: 200,
      message: '删除成功'
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '删除配置失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '删除配置失败: ' + error.message
    });
  }
};

/**
 * 获取库位映射配置（用于数据处理）
 */
export const getLocationMappings = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_key, config_value
      FROM ${TABLE_NAME}
      WHERE config_type = 'location_mapping' AND is_active = true
      ORDER BY sort_order
    `);

    const mappings = {};
    result.rows.forEach(row => {
      mappings[row.config_key] = row.config_value.split(',').map(v => v.trim());
    });

    res.json({
      code: 200,
      message: 'success',
      data: mappings
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '获取库位映射失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '获取库位映射失败: ' + error.message
    });
  }
};

/**
 * 获取Pull List类型映射
 * 返回格式: { "仓位": { "关键词": "类型", ... }, ... }
 * 配置格式: config_key=仓位名称(T01), config_value=关键词(T010), description=类型
 */
export const getPulllistTypeMappings = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT config_key, config_value, description
      FROM ${TABLE_NAME}
      WHERE config_type = 'pulllist_type' AND is_active = true
      ORDER BY sort_order
    `);

    // 返回格式: { "T01": { "JIELIAO": "借料", ... }, "T11": { "JIELIAO": "借料" }, ... }
    const mappings = {};
    result.rows.forEach(row => {
      const location = row.config_key;
      const docType = row.description || '借料';

      if (!mappings[location]) {
        mappings[location] = {};
      }

      // config_value 是关键词，逗号分隔
      const keywords = (row.config_value || '').split(',').map((k) => k.trim()).filter(Boolean);
      keywords.forEach(keyword => {
        mappings[location][keyword.toUpperCase()] = docType;
      });
    });

    res.json({
      code: 200,
      message: 'success',
      data: mappings
    });

  } catch (error) {
    logError('StockroomUrgentPullConfig', '获取Pull List类型映射失败', { message: error.message });
    res.status(500).json({
      code: 500,
      message: '获取Pull List类型映射失败: ' + error.message
    });
  }
};
