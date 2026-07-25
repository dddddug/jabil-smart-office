/**
 * 统一响应格式工具
 * 提供标准化的 API 响应格式
 */

/**
 * 成功响应
 * @param {Response} res - Express Response 对象
 * @param {any} data - 响应数据
 * @param {string} message - 成功消息
 * @returns {Response}
 */
export const success = (res, data = null, message = '操作成功') => {
  return res.status(200).json({
    code: 200,
    message,
    data,
  });
};

/**
 * 创建成功响应 (201)
 * @param {Response} res - Express Response 对象
 * @param {any} data - 响应数据
 * @param {string} message - 成功消息
 * @returns {Response}
 */
export const created = (res, data = null, message = '创建成功') => {
  return res.status(201).json({
    code: 201,
    message,
    data,
  });
};

/**
 * 分页响应
 * @param {Response} res - Express Response 对象
 * @param {Object} options - 分页选项
 * @param {Array} options.items - 数据项数组
 * @param {number} options.total - 总记录数
 * @param {number} options.page - 当前页码
 * @param {number} options.pageSize - 每页大小
 * @param {string} message - 成功消息
 * @returns {Response}
 */
export const paginated = (res, { items, total, page, pageSize }, message = '获取成功') => {
  return res.status(200).json({
    code: 200,
    message,
    data: {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    },
  });
};

/**
 * 错误响应
 * @param {Response} res - Express Response 对象
 * @param {number} statusCode - HTTP 状态码
 * @param {string} message - 错误消息
 * @param {Array} details - 错误详情数组
 * @returns {Response}
 */
export const error = (res, statusCode, message, details = []) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    details,
  });
};

/**
 * 无内容响应 (204)
 * @param {Response} res - Express Response 对象
 * @returns {Response}
 */
export const noContent = (res) => {
  return res.status(204).send();
};

/**
 * 文件下载响应
 * @param {Response} res - Express Response 对象
 * @param {Buffer|string} data - 文件数据
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 * @returns {Response}
 */
export const download = (res, data, filename, mimeType = 'application/octet-stream') => {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  if (Buffer.isBuffer(data)) {
    res.setHeader('Content-Length', data.length);
  }
  return res.send(data);
};

/**
 * 批量操作结果响应
 * @param {Response} res - Express Response 对象
 * @param {Object} result - 操作结果
 * @param {Array} result.success - 成功项
 * @param {Array} result.failed - 失败项
 * @param {string} message - 成功消息
 * @returns {Response}
 */
export const batchResult = (res, { success: successItems, failed }, message = '批量操作完成') => {
  return res.status(200).json({
    code: 200,
    message,
    data: {
      successCount: successItems?.length || 0,
      failedCount: failed?.length || 0,
      successItems: successItems || [],
      failedItems: failed || [],
    },
  });
};

export default {
  success,
  created,
  paginated,
  error,
  noContent,
  download,
  batchResult,
};
