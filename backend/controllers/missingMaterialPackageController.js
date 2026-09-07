/**
 * 待填充物料控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';

const GRN_VIEW = 'v_sap_grn_history_partitioned';  // 使用分区视图
const PACKAGE_TABLE = 'jso_material_package';
const MISSING_TABLE = 'jso_missing_material_package';

/**
 * 同步待填充物料数据
 * 从 GRN 视图中获取去重的 material + manufacturer 数据，
 * 排除已经在 jso_material_package 表中的数据
 */
export const syncMissingMaterials = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 清空待填充表
      await client.query(`TRUNCATE TABLE ${MISSING_TABLE} RESTART IDENTITY`);

      // 从 GRN 视图中获取去重的 material + manufacturer 数据
      // 排除已经在 material_package 表中的数据
      const insertResult = await client.query(`
        INSERT INTO ${MISSING_TABLE} (material, manufacturer)
        SELECT DISTINCT
          grn.material,
          grn.manufacturer
        FROM ${GRN_VIEW} grn
        WHERE grn.material IS NOT NULL
          AND grn.material != ''
          -- 排除已经在 material_package 表中的数据
          AND NOT EXISTS (
            SELECT 1 FROM ${PACKAGE_TABLE} mp
            WHERE mp.part_no = grn.material
          )
        ON CONFLICT (material, COALESCE(manufacturer, '')) DO NOTHING
        RETURNING id
      `);

      await client.query('COMMIT');

      const countResult = await pool.query(`SELECT COUNT(*) FROM ${MISSING_TABLE}`);
      const count = parseInt(countResult.rows[0].count);

      logInfo('同步待填充物料成功', { count });
      success(res, { count }, `同步完成，共 ${count} 条待填充物料`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logError('同步待填充物料失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取待填充物料列表（支持分页和搜索）
 */
export const getMissingMaterials = async (req, res, next) => {
  try {
    const { material, manufacturer, page, pageSize } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (material) {
      whereClause += ` AND material LIKE $${paramIndex}`;
      params.push(`%${material}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer LIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
      paramIndex++;
    }

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${MISSING_TABLE} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页查询
    const pageNum = parseInt(page) || 1;
    const pageSizeNum = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const result = await pool.query(
      `SELECT id, material, manufacturer, created_at
       FROM ${MISSING_TABLE}
       ${whereClause}
       ORDER BY material ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSizeNum, offset]
    );

    const items = result.rows.map(row => ({
      id: row.id,
      material: row.material,
      manufacturer: row.manufacturer,
      createdAt: row.created_at
    }));

    success(res, { items, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err) {
    logError('获取待填充物料列表失败', { error: err.message });
    next(err);
  }
};

/**
 * 导出待填充物料（全部数据）
 */
export const exportMissingMaterials = async (req, res, next) => {
  try {
    const { material, manufacturer } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (material) {
      whereClause += ` AND material LIKE $${paramIndex}`;
      params.push(`%${material}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer LIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT material, manufacturer, created_at
       FROM ${MISSING_TABLE}
       ${whereClause}
       ORDER BY material ASC`,
      params
    );

    const data = result.rows.map(row => ({
      material: row.material,
      manufacturer: row.manufacturer || '',
      createdAt: row.created_at
    }));

    success(res, data);
  } catch (err) {
    logError('导出待填充物料失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取待填充物料统计
 */
export const getMissingMaterialsStats = async (req, res, next) => {
  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${MISSING_TABLE}`);
    const total = parseInt(countResult.rows[0].count);

    // 统计不同 manufacturer 的数量
    const mfrResult = await pool.query(
      `SELECT COUNT(DISTINCT manufacturer) FROM ${MISSING_TABLE} WHERE manufacturer IS NOT NULL`
    );
    const manufacturerCount = parseInt(mfrResult.rows[0].count);

    // 统计 material_package 表中已有数量
    const packageResult = await pool.query(`SELECT COUNT(*) FROM ${PACKAGE_TABLE}`);
    const packageCount = parseInt(packageResult.rows[0].count);

    success(res, {
      missingCount: total,
      manufacturerCount,
      packageCount
    });
  } catch (err) {
    logError('获取待填充物料统计失败', { error: err.message });
    next(err);
  }
};

export default {
  syncMissingMaterials,
  getMissingMaterials,
  exportMissingMaterials,
  getMissingMaterialsStats
};
