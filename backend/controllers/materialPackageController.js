/**
 * 物料包装信息 控制器
 */
import pool from '../config/db.js';
import { success } from '../utils/responseHelper.js';
import { logInfo, logError } from '../utils/logger.js';
import { parseExcel } from '../utils/excelUtils.js';
import * as XLSX from 'xlsx';

const TABLE_NAME = 'jso_material_package';

/**
 * 获取物料包装信息列表（支持分页和搜索）
 */
export const getMaterialPackages = async (req, res, next) => {
  try {
    const { partNo, materialGroup, manufacturer, spec, page, pageSize } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (partNo) {
      whereClause += ` AND part_no ILIKE $${paramIndex}`;
      params.push(`%${partNo}%`);
      paramIndex++;
    }

    if (materialGroup) {
      whereClause += ` AND material_group ILIKE $${paramIndex}`;
      params.push(`%${materialGroup}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer ILIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
      paramIndex++;
    }

    if (spec) {
      whereClause += ` AND spec ILIKE $${paramIndex}`;
      params.push(`%${spec}%`);
      paramIndex++;
    }

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${TABLE_NAME} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页查询
    const pageNum = parseInt(page) || 1;
    const pageSizeNum = parseInt(pageSize) || 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const result = await pool.query(
      `SELECT id, part_no, material_group, manufacturer, spec,
              length, width, height, thickness, remark,
              created_at, updated_at, created_by, updated_by
       FROM ${TABLE_NAME}
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSizeNum, offset]
    );

    const items = result.rows.map(row => ({
      id: row.id,
      partNo: row.part_no,
      materialGroup: row.material_group,
      manufacturer: row.manufacturer,
      spec: row.spec,
      length: row.length ? parseFloat(row.length) : null,
      width: row.width ? parseFloat(row.width) : null,
      height: row.height ? parseFloat(row.height) : null,
      thickness: row.thickness ? parseFloat(row.thickness) : null,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    }));

    success(res, { items, total, page: pageNum, pageSize: pageSizeNum });
  } catch (err) {
    logError('获取物料包装信息列表失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取所有规格列表（下拉选择用）
 */
export const getSpecOptions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT spec FROM ${TABLE_NAME} WHERE spec IS NOT NULL AND spec != '' ORDER BY spec`
    );
    const options = result.rows.map(row => row.spec);
    success(res, options);
  } catch (err) {
    logError('获取规格列表失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取图表统计数据（聚合查询，包含所有记录）
 */
export const getChartStats = async (req, res, next) => {
  try {
    const { partNo, materialGroup, manufacturer, spec } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (partNo) {
      whereClause += ` AND part_no ILIKE $${paramIndex}`;
      params.push(`%${partNo}%`);
      paramIndex++;
    }

    if (materialGroup) {
      whereClause += ` AND material_group ILIKE $${paramIndex}`;
      params.push(`%${materialGroup}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer ILIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
      paramIndex++;
    }

    if (spec) {
      whereClause += ` AND spec ILIKE $${paramIndex}`;
      params.push(`%${spec}%`);
      paramIndex++;
    }

    // 规格分布统计
    const specStats = await pool.query(
      `SELECT spec, COUNT(*) as count FROM ${TABLE_NAME} ${whereClause} AND spec IS NOT NULL AND spec != '' GROUP BY spec ORDER BY count DESC LIMIT 20`,
      params
    );

    // 物料组分布统计
    const materialGroupStats = await pool.query(
      `SELECT material_group, COUNT(*) as count FROM ${TABLE_NAME} ${whereClause} AND material_group IS NOT NULL AND material_group != '' GROUP BY material_group ORDER BY count DESC LIMIT 20`,
      params
    );

    // 制造商分布统计
    const manufacturerStats = await pool.query(
      `SELECT manufacturer, COUNT(*) as count FROM ${TABLE_NAME} ${whereClause} AND manufacturer IS NOT NULL AND manufacturer != '' GROUP BY manufacturer ORDER BY count DESC LIMIT 20`,
      params
    );

    success(res, {
      specStats: specStats.rows,
      materialGroupStats: materialGroupStats.rows,
      manufacturerStats: manufacturerStats.rows
    });
  } catch (err) {
    logError('获取图表统计数据失败', { error: err.message });
    next(err);
  }
};

/**
 * 获取单条物料包装信息
 */
export const getMaterialPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, part_no, material_group, manufacturer, spec,
              length, width, height, thickness, remark,
              created_at, updated_at, created_by, updated_by
       FROM ${TABLE_NAME}
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    const row = result.rows[0];
    const item = {
      id: row.id,
      partNo: row.part_no,
      materialGroup: row.material_group,
      manufacturer: row.manufacturer,
      spec: row.spec,
      length: row.length ? parseFloat(row.length) : null,
      width: row.width ? parseFloat(row.width) : null,
      height: row.height ? parseFloat(row.height) : null,
      thickness: row.thickness ? parseFloat(row.thickness) : null,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };

    success(res, item);
  } catch (err) {
    logError('获取物料包装信息详情失败', { error: err.message });
    next(err);
  }
};

/**
 * 创建物料包装信息
 */
export const createMaterialPackage = async (req, res, next) => {
  try {
    const {
      partNo,
      materialGroup,
      manufacturer,
      spec,
      length,
      width,
      height,
      thickness,
      remark
    } = req.body;

    if (!partNo) {
      return res.status(400).json({ code: 400, message: '物料号不能为空' });
    }

    // 检查是否已存在
    const existResult = await pool.query(
      `SELECT id FROM ${TABLE_NAME} WHERE part_no = $1`,
      [partNo]
    );

    if (existResult.rows.length > 0) {
      return res.status(400).json({ code: 400, message: '该物料号已存在，请使用编辑功能修改' });
    }

    const createdBy = req.user?.username || 'system';

    const result = await pool.query(
      `INSERT INTO ${TABLE_NAME}
       (part_no, material_group, manufacturer, spec, length, width, height, thickness, remark, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING id`,
      [partNo, materialGroup, manufacturer, spec, length, width, height, thickness, remark, createdBy]
    );

    logInfo('创建物料包装信息成功', { id: result.rows[0].id, partNo });
    success(res, { id: result.rows[0].id }, '创建成功');
  } catch (err) {
    logError('创建物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 更新物料包装信息
 */
export const updateMaterialPackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      partNo,
      materialGroup,
      manufacturer,
      spec,
      length,
      width,
      height,
      thickness,
      remark
    } = req.body;

    if (!partNo) {
      return res.status(400).json({ code: 400, message: '物料号不能为空' });
    }

    // 检查是否存在
    const existResult = await pool.query(
      `SELECT id FROM ${TABLE_NAME} WHERE id = $1`,
      [id]
    );

    if (existResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    // 检查物料号是否与其他记录冲突
    const conflictResult = await pool.query(
      `SELECT id FROM ${TABLE_NAME} WHERE part_no = $1 AND id != $2`,
      [partNo, id]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ code: 400, message: '该物料号已存在，请使用其他物料号' });
    }

    const updatedBy = req.user?.username || 'system';

    await pool.query(
      `UPDATE ${TABLE_NAME} SET
       part_no = $1,
       material_group = $2,
       manufacturer = $3,
       spec = $4,
       length = $5,
       width = $6,
       height = $7,
       thickness = $8,
       remark = $9,
       updated_by = $10,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [partNo, materialGroup, manufacturer, spec, length, width, height, thickness, remark, updatedBy, id]
    );

    logInfo('更新物料包装信息成功', { id, partNo });
    success(res, null, '更新成功');
  } catch (err) {
    logError('更新物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 删除物料包装信息
 */
export const deleteMaterialPackage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM ${TABLE_NAME} WHERE id = $1 RETURNING part_no`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    logInfo('删除物料包装信息成功', { id, partNo: result.rows[0].part_no });
    success(res, null, '删除成功');
  } catch (err) {
    logError('删除物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 批量导入物料包装信息
 */
export const batchImportMaterialPackages = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '导入数据不能为空' });
    }

    const result = await processBatchImport(items, req.user?.username || 'system');

    logInfo('批量导入物料包装信息完成', { successCount: result });
    success(res, result, `导入完成：新增 ${result.inserted} 条，更新 ${result.updated} 条`);
  } catch (err) {
    logError('批量导入物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 处理批量导入的核心逻辑（批量优化版）
 * part_no + manufacturer 作为唯一约束
 */
const processBatchImport = async (items, username) => {
  const errors = [];
  let inserted = 0;
  let updated = 0;

  // 过滤有效数据
  const validItems = items.filter(item => item.partNo);
  const invalidItems = items.filter(item => !item.partNo);

  invalidItems.forEach((item, i) => {
    errors.push(`第${i + 2}行：PartNo不能为空`);
  });

  if (validItems.length === 0) {
    return { inserted: 0, updated: 0, errors };
  }

  // 批量处理，每100条一批
  const BATCH_SIZE = 100;

  for (let batchStart = 0; batchStart < validItems.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, validItems.length);
    const batch = validItems.slice(batchStart, batchEnd);

    try {
      // 构建批量 INSERT ... ON CONFLICT 语句
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const item of batch) {
        const manufacturer = item.manufacturer || '';
        values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10})`);
        params.push(
          item.partNo,
          item.materialGroup,
          manufacturer || null,
          item.spec,
          item.length,
          item.width,
          item.height,
          item.thickness,
          item.remark,
          username
        );
        paramIndex += 10;
      }

      const sql = `
        INSERT INTO ${TABLE_NAME}
        (part_no, material_group, manufacturer, spec, length, width, height, thickness, remark, created_by, updated_by)
        VALUES ${values.join(', ')}
        ON CONFLICT (part_no, COALESCE(manufacturer, '')) DO UPDATE SET
        material_group = COALESCE(EXCLUDED.material_group, ${TABLE_NAME}.material_group),
        spec = COALESCE(EXCLUDED.spec, ${TABLE_NAME}.spec),
        length = COALESCE(EXCLUDED.length, ${TABLE_NAME}.length),
        width = COALESCE(EXCLUDED.width, ${TABLE_NAME}.width),
        height = COALESCE(EXCLUDED.height, ${TABLE_NAME}.height),
        thickness = COALESCE(EXCLUDED.thickness, ${TABLE_NAME}.thickness),
        remark = COALESCE(EXCLUDED.remark, ${TABLE_NAME}.remark),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      `;

      await pool.query(sql, params);
      inserted += batch.length;

    } catch (err) {
      // 批量失败，回退到逐条处理
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const rowNum = batchStart + i + 2;
        const manufacturer = item.manufacturer || '';

        try {
          await pool.query(
            `INSERT INTO ${TABLE_NAME}
             (part_no, material_group, manufacturer, spec, length, width, height, thickness, remark, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
             ON CONFLICT (part_no, COALESCE(manufacturer, '')) DO UPDATE SET
             material_group = COALESCE(EXCLUDED.material_group, ${TABLE_NAME}.material_group),
             spec = COALESCE(EXCLUDED.spec, ${TABLE_NAME}.spec),
             length = COALESCE(EXCLUDED.length, ${TABLE_NAME}.length),
             width = COALESCE(EXCLUDED.width, ${TABLE_NAME}.width),
             height = COALESCE(EXCLUDED.height, ${TABLE_NAME}.height),
             thickness = COALESCE(EXCLUDED.thickness, ${TABLE_NAME}.thickness),
             remark = COALESCE(EXCLUDED.remark, ${TABLE_NAME}.remark),
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP`,
            [item.partNo, item.materialGroup, item.manufacturer, item.spec, item.length, item.width, item.height, item.thickness, item.remark, username]
          );
          inserted++;
        } catch (singleErr) {
          errors.push(`第${rowNum}行 ${item.partNo}：${singleErr.message}`);
        }
      }
    }
  }

  return { inserted, updated, errors };
};

/**
 * 导出物料包装信息
 */
export const exportMaterialPackages = async (req, res, next) => {
  try {
    const { partNo, materialGroup, manufacturer, spec } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (partNo) {
      whereClause += ` AND part_no ILIKE $${paramIndex}`;
      params.push(`%${partNo}%`);
      paramIndex++;
    }

    if (materialGroup) {
      whereClause += ` AND material_group ILIKE $${paramIndex}`;
      params.push(`%${materialGroup}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer ILIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
      paramIndex++;
    }

    if (spec) {
      whereClause += ` AND spec ILIKE $${paramIndex}`;
      params.push(`%${spec}%`);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT part_no, material_group, manufacturer, spec,
              length, width, height, thickness, remark,
              created_at, updated_at
       FROM ${TABLE_NAME}
       ${whereClause}
       ORDER BY part_no`,
      params
    );

    const data = result.rows.map(row => ({
      partNo: row.part_no,
      materialGroup: row.material_group,
      manufacturer: row.manufacturer,
      spec: row.spec,
      length: row.length ? parseFloat(row.length) : '',
      width: row.width ? parseFloat(row.width) : '',
      height: row.height ? parseFloat(row.height) : '',
      thickness: row.thickness ? parseFloat(row.thickness) : '',
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    success(res, data);
  } catch (err) {
    logError('导出物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 批量导入物料包装信息（从文件）
 */
export const batchImportWithFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);

    if (rows.length < 2) {
      return res.status(400).json({ code: 400, message: '文件数据不足' });
    }

    // 解析表头
    const headers = rows[0].map(h => String(h).trim());
    const headerMap = {};
    headers.forEach((h, idx) => {
      headerMap[h] = idx;
    });

    // 验证必要字段
    if (headerMap['PartNo*'] === undefined) {
      return res.status(400).json({ code: 400, message: '缺少"PartNo*"列' });
    }

    const items = [];
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const partNo = row[headerMap['PartNo*']];
      if (!partNo) {
        errors.push(`第${i + 1}行：PartNo不能为空`);
        continue;
      }

      items.push({
        partNo: String(partNo).trim(),
        materialGroup: row[headerMap['MaterialGroup']] ? String(row[headerMap['MaterialGroup']]).trim() : null,
        manufacturer: row[headerMap['Manufacturer']] ? String(row[headerMap['Manufacturer']]).trim() : null,
        spec: row[headerMap['规格']] ? String(row[headerMap['规格']]).trim() : null,
        length: row[headerMap['长(cm)']] ? parseFloat(row[headerMap['长(cm)']]) : null,
        width: row[headerMap['宽(cm)']] ? parseFloat(row[headerMap['宽(cm)']]) : null,
        height: row[headerMap['高(cm)']] ? parseFloat(row[headerMap['高(cm)']]) : null,
        thickness: row[headerMap['厚度(mm)']] ? parseFloat(row[headerMap['厚度(mm)']]) : null,
        remark: row[headerMap['备注']] ? String(row[headerMap['备注']]).trim() : null
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的数据行' });
    }

    // 调用通用导入逻辑
    const result = await processBatchImport(items, req.user?.username || 'system');

    logInfo('批量导入物料包装信息完成', { successCount: result.successCount, errorCount: errors.length });
    success(res, result, `导入完成：新增 ${result.inserted} 条，更新 ${result.updated} 条${errors.length > 0 ? `，失败 ${errors.length} 条` : ''}`);
  } catch (err) {
    logError('批量导入物料包装信息失败', { error: err.message });
    next(err);
  }
};

/**
 * 下载导入模板
 */
export const downloadTemplate = async (req, res, next) => {
  try {
    const templateData = [
      {
        'PartNo*': '',
        'MaterialGroup': '',
        'Manufacturer': '',
        '规格': '',
        '长(cm)': '',
        '宽(cm)': '',
        '高(cm)': '',
        '厚度(mm)': '',
        '备注': ''
      },
      {
        'PartNo*': '示例PartNo',
        'MaterialGroup': '示例MaterialGroup',
        'Manufacturer': '示例Manufacturer',
        '规格': '示例规格',
        '长(cm)': '10.5',
        '宽(cm)': '8.5',
        '高(cm)': '5.2',
        '厚度(mm)': '2.0',
        '备注': '示例备注'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物料包装信息模板');

    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 }
    ];

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('物料包装信息导入模板.xlsx'));
    res.send(buffer);
  } catch (err) {
    logError('下载导入模板失败', { error: err.message });
    next(err);
  }
};

export default {
  getMaterialPackages,
  getSpecOptions,
  getChartStats,
  getMaterialPackageById,
  createMaterialPackage,
  updateMaterialPackage,
  deleteMaterialPackage,
  batchImportMaterialPackages,
  batchImportWithFile,
  exportMaterialPackages,
  downloadTemplate
};
