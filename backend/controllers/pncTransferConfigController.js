/**
 * PNC转仓打印配置控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';

// 配置表名
const CONFIG_TABLE = 'jso_pnc_transfer_config';
const DEPT_TABLE = 'jso_org_department_management';

/**
 * 获取所有配置
 */
export const getConfigs = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.config_name, c.recipient_email, c.cc_email, c.contact_phone,
             c.recipient_name, c.receiving_address, c.system_location, c.is_active,
             c.department_id, c.created_at, c.updated_at,
             d.name as department_name
      FROM ${CONFIG_TABLE} c
      LEFT JOIN ${DEPT_TABLE} d ON c.department_id = d.id
      ORDER BY c.id
    `);

    const configs = result.rows.map(row => ({
      id: row.id,
      configName: row.config_name,
      recipientEmail: row.recipient_email,
      ccEmail: row.cc_email,
      contactPhone: row.contact_phone,
      recipientName: row.recipient_name,
      receivingAddress: row.receiving_address,
      systemLocation: row.system_location,
      departmentId: row.department_id,
      departmentName: row.department_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    success(res, configs, '获取配置成功');
  } catch (err) {
    logError('获取PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取单个配置
 */
export const getConfigById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT c.id, c.config_name, c.recipient_email, c.cc_email, c.contact_phone,
             c.recipient_name, c.receiving_address, c.system_location, c.is_active,
             c.department_id, c.created_at, c.updated_at,
             d.name as department_name
      FROM ${CONFIG_TABLE} c
      LEFT JOIN ${DEPT_TABLE} d ON c.department_id = d.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    const row = result.rows[0];
    const config = {
      id: row.id,
      configName: row.config_name,
      recipientEmail: row.recipient_email,
      ccEmail: row.cc_email,
      contactPhone: row.contact_phone,
      recipientName: row.recipient_name,
      receivingAddress: row.receiving_address,
      systemLocation: row.system_location,
      departmentId: row.department_id,
      departmentName: row.department_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    success(res, config, '获取配置成功');
  } catch (err) {
    logError('获取PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 创建配置
 */
export const createConfig = async (req, res, next) => {
  try {
    const {
      configName,
      recipientEmail,
      ccEmail,
      contactPhone,
      recipientName,
      receivingAddress,
      systemLocation,
      departmentId,
      isActive = true
    } = req.body;

    // 验证必填字段
    if (!configName) {
      return res.status(400).json({ code: 400, message: '配置名称不能为空' });
    }

    // 检查配置名称是否已存在
    const existingConfig = await pool.query(
      `SELECT id FROM ${CONFIG_TABLE} WHERE config_name = $1`,
      [configName]
    );

    if (existingConfig.rows.length > 0) {
      return res.status(400).json({ code: 400, message: '配置名称已存在' });
    }

    const result = await pool.query(`
      INSERT INTO ${CONFIG_TABLE} (
        config_name, recipient_email, cc_email, contact_phone,
        recipient_name, receiving_address, system_location, department_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      configName,
      recipientEmail || null,
      ccEmail || null,
      contactPhone || null,
      recipientName || null,
      receivingAddress || null,
      systemLocation || null,
      departmentId || null,
      isActive
    ]);

    const row = result.rows[0];

    // 获取部门名称
    let departmentName = null;
    if (row.department_id) {
      const deptResult = await pool.query(`SELECT name FROM ${DEPT_TABLE} WHERE id = $1`, [row.department_id]);
      departmentName = deptResult.rows[0]?.name || null;
    }

    const config = {
      id: row.id,
      configName: row.config_name,
      recipientEmail: row.recipient_email,
      ccEmail: row.cc_email,
      contactPhone: row.contact_phone,
      recipientName: row.recipient_name,
      receivingAddress: row.receiving_address,
      systemLocation: row.system_location,
      departmentId: row.department_id,
      departmentName: departmentName,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    logInfo('PNC转仓打印配置创建成功', { id: row.id, configName });
    success(res, config, '配置创建成功');
  } catch (err) {
    logError('创建PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 更新配置
 */
export const updateConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      configName,
      recipientEmail,
      ccEmail,
      contactPhone,
      recipientName,
      receivingAddress,
      systemLocation,
      departmentId,
      isActive
    } = req.body;

    // 检查配置是否存在
    const existingConfig = await pool.query(
      `SELECT id FROM ${CONFIG_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    // 如果修改了配置名称，检查是否与已有配置重复
    if (configName) {
      const duplicateCheck = await pool.query(
        `SELECT id FROM ${CONFIG_TABLE} WHERE config_name = $1 AND id != $2`,
        [configName, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ code: 400, message: '配置名称已存在' });
      }
    }

    const result = await pool.query(`
      UPDATE ${CONFIG_TABLE}
      SET config_name = COALESCE($1, config_name),
          recipient_email = COALESCE($2, recipient_email),
          cc_email = COALESCE($3, cc_email),
          contact_phone = COALESCE($4, contact_phone),
          recipient_name = COALESCE($5, recipient_name),
          receiving_address = COALESCE($6, receiving_address),
          system_location = COALESCE($7, system_location),
          department_id = $8,
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      configName,
      recipientEmail,
      ccEmail,
      contactPhone,
      recipientName,
      receivingAddress,
      systemLocation,
      departmentId,
      isActive,
      id
    ]);

    const row = result.rows[0];

    // 获取部门名称
    let departmentName = null;
    if (row.department_id) {
      const deptResult = await pool.query(`SELECT name FROM ${DEPT_TABLE} WHERE id = $1`, [row.department_id]);
      departmentName = deptResult.rows[0]?.name || null;
    }

    const config = {
      id: row.id,
      configName: row.config_name,
      recipientEmail: row.recipient_email,
      ccEmail: row.cc_email,
      contactPhone: row.contact_phone,
      recipientName: row.recipient_name,
      receivingAddress: row.receiving_address,
      systemLocation: row.system_location,
      departmentId: row.department_id,
      departmentName: departmentName,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    logInfo('PNC转仓打印配置更新成功', { id, configName });
    success(res, config, '配置更新成功');
  } catch (err) {
    logError('更新PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 删除配置
 */
export const deleteConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingConfig = await pool.query(
      `SELECT id, config_name FROM ${CONFIG_TABLE} WHERE id = $1`,
      [id]
    );

    if (existingConfig.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '配置不存在' });
    }

    await pool.query(`DELETE FROM ${CONFIG_TABLE} WHERE id = $1`, [id]);

    logInfo('PNC转仓打印配置删除成功', { id, configName: existingConfig.rows[0].config_name });
    success(res, null, '配置删除成功');
  } catch (err) {
    logError('删除PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取活跃的配置列表（供下拉选择使用）
 */
export const getActiveConfigs = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.config_name, c.recipient_email, c.cc_email, c.contact_phone,
             c.recipient_name, c.receiving_address, c.system_location, c.department_id,
             d.name as department_name
      FROM ${CONFIG_TABLE} c
      LEFT JOIN ${DEPT_TABLE} d ON c.department_id = d.id
      WHERE c.is_active = TRUE
      ORDER BY c.config_name
    `);

    const configs = result.rows.map(row => ({
      id: row.id,
      configName: row.config_name,
      recipientEmail: row.recipient_email,
      ccEmail: row.cc_email,
      contactPhone: row.contact_phone,
      recipientName: row.recipient_name,
      receivingAddress: row.receiving_address,
      systemLocation: row.system_location,
      departmentId: row.department_id,
      departmentName: row.department_name
    }));

    success(res, configs, '获取配置成功');
  } catch (err) {
    logError('获取活跃PNC转仓打印配置失败', { error: err.message });
    next(err);
  }
};

export default {
  getConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  getActiveConfigs
};
