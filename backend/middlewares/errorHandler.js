import logger from '../utils/logger.js';

// 自定义应用错误类
export class AppError extends Error {
  constructor(statusCode, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 常用错误工厂方法
export const BadRequestError = (message = '请求参数错误', details = []) =>
  new AppError(400, message, details);

export const UnauthorizedError = (message = '未授权访问') =>
  new AppError(401, message);

export const ForbiddenError = (message = '权限不足') =>
  new AppError(403, message);

export const NotFoundError = (message = '资源不存在') =>
  new AppError(404, message);

export const ConflictError = (message = '资源冲突') =>
  new AppError(409, message);

// 全局错误处理中间件
export const handleError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 记录错误日志
  if (err.statusCode >= 500) {
    logger.error('服务器错误', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      ip: req.ip,
      userId: req.user?.id,
    });
  } else if (err.statusCode >= 400) {
    logger.warn('客户端错误', {
      error: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV !== 'production') {
    res.status(err.statusCode).json({
      code: err.statusCode,
      status: err.status,
      message: err.message,
      details: err.details,
      stack: err.stack,
    });
  } else {
    // 生产环境隐藏详细信息
    res.status(err.statusCode).json({
      code: err.statusCode,
      status: err.status,
      message: err.isOperational ? err.message : '服务器内部错误',
      details: err.details || [],
    });
  }
};

// 404 处理
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    code: 404,
    status: 'fail',
    message: `路由 ${req.originalUrl} 不存在`,
  });
};

// 异步错误处理包装器 - 捕获 Promise  rejections
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default { handleError, notFoundHandler, asyncHandler, AppError };
