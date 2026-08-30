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
    const { partNo, materialGroup, manufacturer, page, pageSize } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (partNo) {
      whereClause += ` AND part_no LIKE $${paramIndex}`;
      params.push(`%${partNo}%`);
      paramIndex++;
    }

    if (materialGroup) {
      whereClause += ` AND material_group LIKE $${paramIndex}`;
      params.push(`%${materialGroup}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer LIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
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
 * 处理批量导入的核心逻辑
 */
const processBatchImport = async (items, username) => {
  const errors = [];
  const successCount = { inserted: 0, updated: 0 };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 2;

    try {
      if (!item.partNo) {
        errors.push(`第${rowNum}行：PartNo不能为空`);
        continue;
      }

      // 先按 PartNo + Manufacturer 查找
      const existResult = await pool.query(
        `SELECT id FROM ${TABLE_NAME} WHERE part_no = $1`,
        [item.partNo]
      );

      if (existResult.rows.length > 0) {
        // 物料号已存在，检查Manufacturer是否一致
        const existing = await pool.query(
          `SELECT manufacturer FROM ${TABLE_NAME} WHERE part_no = $1`,
          [item.partNo]
        );

        const existingManufacturer = existing.rows[0]?.manufacturer || '';
        const importManufacturer = item.manufacturer || '';

        // 如果Manufacturer一致，则更新
        if (existingManufacturer === importManufacturer) {
          await pool.query(
            `UPDATE ${TABLE_NAME} SET
             material_group = COALESCE(NULLIF($1, ''), material_group),
             spec = COALESCE(NULLIF($2, ''), spec),
             length = CASE WHEN $3 IS NOT NULL THEN $3 ELSE length END,
             width = CASE WHEN $4 IS NOT NULL THEN $4 ELSE width END,
             height = CASE WHEN $5 IS NOT NULL THEN $5 ELSE height END,
             thickness = CASE WHEN $6 IS NOT NULL THEN $6 ELSE thickness END,
             remark = COALESCE(NULLIF($7, ''), remark),
             updated_by = $8,
             updated_at = CURRENT_TIMESTAMP
             WHERE part_no = $9`,
            [item.materialGroup, item.spec, item.length, item.width, item.height, item.thickness, item.remark, username, item.partNo]
          );
          successCount.updated++;
        } else {
          // Manufacturer不一致，新增一条记录
          await pool.query(
            `INSERT INTO ${TABLE_NAME}
             (part_no, material_group, manufacturer, spec, length, width, height, thickness, remark, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
            [item.partNo, item.materialGroup, item.manufacturer, item.spec, item.length, item.width, item.height, item.thickness, item.remark, username]
          );
          successCount.inserted++;
        }
      } else {
        // 新增记录
        await pool.query(
          `INSERT INTO ${TABLE_NAME}
           (part_no, material_group, manufacturer, spec, length, width, height, thickness, remark, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
          [item.partNo, item.materialGroup, item.manufacturer, item.spec, item.length, item.width, item.height, item.thickness, item.remark, username]
        );
        successCount.inserted++;
      }
    } catch (itemErr) {
      errors.push(`第${rowNum}行：${itemErr.message}`);
    }
  }

  return {
    inserted: successCount.inserted,
    updated: successCount.updated,
    errors
  };
};

/**
 * 导出物料包装信息
 */
export const exportMaterialPackages = async (req, res, next) => {
  try {
    const { partNo, materialGroup, manufacturer } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (partNo) {
      whereClause += ` AND part_no LIKE $${paramIndex}`;
      params.push(`%${partNo}%`);
      paramIndex++;
    }

    if (materialGroup) {
      whereClause += ` AND material_group LIKE $${paramIndex}`;
      params.push(`%${materialGroup}%`);
      paramIndex++;
    }

    if (manufacturer) {
      whereClause += ` AND manufacturer LIKE $${paramIndex}`;
      params.push(`%${manufacturer}%`);
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
        materialGroup: row[headerMap['MaterialGroup']] ? String(row[headerMap['MaterialGroup']]).trim() : undefined,
        manufacturer: row[headerMap['Manufacturer']] ? String(row[headerMap['Manufacturer']]).trim() : undefined,
        spec: row[headerMap['规格']] ? String(row[headerMap['规格']]).trim() : undefined,
        length: row[headerMap['长(cm)']] ? parseFloat(row[headerMap['长(cm)']]) : undefined,
        width: row[headerMap['宽(cm)']] ? parseFloat(row[headerMap['宽(cm)']]) : undefined,
        height: row[headerMap['高(cm)']] ? parseFloat(row[headerMap['高(cm)']]) : undefined,
        thickness: row[headerMap['厚度(mm)']] ? parseFloat(row[headerMap['厚度(mm)']]) : undefined,
        remark: row[headerMap['备注']] ? String(row[headerMap['备注']]).trim() : undefined
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
  getMaterialPackageById,
  createMaterialPackage,
  updateMaterialPackage,
  deleteMaterialPackage,
  batchImportMaterialPackages,
  batchImportWithFile,
  exportMaterialPackages,
  downloadTemplate
};
