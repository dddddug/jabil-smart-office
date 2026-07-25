/**
 * 排班验证规则
 */
import { body, param, query } from 'express-validator';
import { idParamValidation, paginationValidation } from './commonValidator.js';

/**
 * 创建排班验证
 */
export const createScheduleValidation = [
  body('employeeId')
    .isInt({ min: 1 })
    .withMessage('员工ID必须是正整数'),
  body('scheduleDate')
    .isISO8601()
    .withMessage('排班日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('shift')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('班次不能为空')
    .isLength({ max: 50 })
    .withMessage('班次长度不能超过50个字符'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('备注长度不能超过500个字符'),
];

/**
 * 批量创建排班验证
 */
export const batchCreateScheduleValidation = [
  body('schedules')
    .isArray({ min: 1 })
    .withMessage('排班数据必须是数组且至少包含一条记录'),
  body('schedules.*.employeeId')
    .isInt({ min: 1 })
    .withMessage('员工ID必须是正整数'),
  body('schedules.*.scheduleDate')
    .isISO8601()
    .withMessage('排班日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('schedules.*.shift')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('班次不能为空'),
];

/**
 * 更新排班验证
 */
export const updateScheduleValidation = [
  ...idParamValidation,
  body('scheduleDate')
    .optional()
    .isISO8601()
    .withMessage('排班日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('shift')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('班次长度不能超过50个字符'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('备注长度不能超过500个字符'),
];

/**
 * 批量更新排班验证
 */
export const batchUpdateScheduleValidation = [
  body('schedules')
    .isArray({ min: 1 })
    .withMessage('排班数据必须是数组且至少包含一条记录'),
  body('schedules.*.id')
    .isInt({ min: 1 })
    .withMessage('排班记录ID必须是正整数'),
  body('schedules.*.scheduleDate')
    .optional()
    .isISO8601()
    .withMessage('排班日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('schedules.*.shift')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('班次不能为空'),
];

/**
 * Excel 批量上传验证
 */
export const excelUploadValidation = [
  body('schedules')
    .isArray({ min: 1 })
    .withMessage('排班数据必须是数组且至少包含一条记录'),
];

/**
 * 查询排班验证
 */
export const queryScheduleValidation = [
  ...paginationValidation,
  query('employeeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('员工ID必须是正整数'),
  query('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('部门ID必须是正整数'),
  query('plantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('厂区ID必须是正整数'),
  query('scheduleDate')
    .optional()
    .isISO8601()
    .withMessage('排班日期必须是有效的日期格式 (YYYY-MM-DD)'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期必须是有效的日期格式 (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期必须是有效的日期格式 (YYYY-MM-DD)'),
  query('shift')
    .optional()
    .isString()
    .trim(),
];

/**
 * 排班 ID 参数验证
 */
export const scheduleIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('排班ID必须是正整数'),
];

export default {
  createScheduleValidation,
  batchCreateScheduleValidation,
  updateScheduleValidation,
  batchUpdateScheduleValidation,
  excelUploadValidation,
  queryScheduleValidation,
  scheduleIdValidation,
};
