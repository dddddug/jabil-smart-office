/**
 * 验证中间件
 * 处理 express-validator 的验证结果
 */
import { validationResult } from 'express-validator';
import { BadRequestError } from './errorHandler.js';

/**
 * 验证请求结果中间件
 * 如果验证失败，抛出 BadRequestError
 */
export const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw BadRequestError('请求参数验证失败', errorDetails);
  }

  next();
};

export default { validationMiddleware };
