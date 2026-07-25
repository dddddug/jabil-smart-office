/**
 * 通用验证规则
 */
import { body, param, query } from 'express-validator';

/**
 * ID 参数验证
 */
export const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数'),
];

/**
 * 分页参数验证
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页大小必须在1-100之间'),
  query('sortBy')
    .optional()
    .isString()
    .trim()
    .escape(),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向必须是 asc 或 desc'),
];

/**
 * 日期范围验证
 */
export const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期必须是有效的日期格式 (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期必须是有效的日期格式 (YYYY-MM-DD)'),
];

/**
 * 状态验证
 */
export const statusValidation = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'pending', 'approved', 'rejected'])
    .withMessage('状态值无效'),
];

/**
 * 员工 ID 验证
 */
export const employeeIdValidation = [
  param('employeeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('员工ID必须是正整数'),
  body('employeeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('员工ID必须是正整数'),
];

/**
 * 日期验证
 */
export const dateValidation = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期必须是有效的日期格式 (YYYY-MM-DD)'),
];

export default {
  idParamValidation,
  paginationValidation,
  dateRangeValidation,
  statusValidation,
  employeeIdValidation,
  dateValidation,
};
