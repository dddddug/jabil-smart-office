/**
 * 用户验证规则
 */
import { body, param } from 'express-validator';
import { idParamValidation } from './commonValidator.js';

/**
 * 登录验证
 */
export const loginValidation = [
  body('username')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ max: 50 })
    .withMessage('用户名长度不能超过50个字符'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('密码不能为空'),
];

/**
 * 创建用户验证
 */
export const createUserValidation = [
  body('username')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度必须在6-100个字符之间'),
  body('realName')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('真实姓名不能为空')
    .isLength({ max: 100 })
    .withMessage('真实姓名长度不能超过100个字符'),
  body('employeeId')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('工号长度不能超过50个字符'),
  body('oldEmployeeId')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('旧工号长度不能超过50个字符'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isString()
    .trim()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式不正确'),
  body('gender')
    .optional()
    .isIn(['男', '女', '其他'])
    .withMessage('性别必须是男、女或其他'),
  body('roleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),
  body('plantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('厂区ID必须是正整数'),
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('部门ID必须是正整数'),
  body('position')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('职位长度不能超过100个字符'),
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('入职日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('状态必须是 active 或 inactive'),
];

/**
 * 更新用户验证
 */
export const updateUserValidation = [
  ...idParamValidation,
  body('username')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .optional()
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('密码长度必须在6-100个字符之间'),
  body('realName')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('真实姓名不能为空')
    .isLength({ max: 100 })
    .withMessage('真实姓名长度不能超过100个字符'),
  body('employeeId')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('工号长度不能超过50个字符'),
  body('oldEmployeeId')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('旧工号长度不能超过50个字符'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isString()
    .trim()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式不正确'),
  body('gender')
    .optional()
    .isIn(['男', '女', '其他'])
    .withMessage('性别必须是男、女或其他'),
  body('roleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('角色ID必须是正整数'),
  body('plantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('厂区ID必须是正整数'),
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('部门ID必须是正整数'),
  body('position')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('职位长度不能超过100个字符'),
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('入职日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('leaveDate')
    .optional()
    .isISO8601()
    .withMessage('离职日期必须是有效的日期格式 (YYYY-MM-DD)'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('状态必须是 active 或 inactive'),
];

/**
 * 批量导入验证
 */
export const batchImportValidation = [
  body('users')
    .isArray({ min: 1 })
    .withMessage('用户数据必须是数组且至少包含一条记录'),
  body('users.*.username')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间'),
  body('users.*.realName')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('真实姓名不能为空'),
  body('users.*.password')
    .optional()
    .isString()
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
];

/**
 * 密码修改验证
 */
export const changePasswordValidation = [
  body('oldPassword')
    .isString()
    .notEmpty()
    .withMessage('旧密码不能为空'),
  body('newPassword')
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('新密码长度必须在6-100个字符之间'),
];

/**
 * 重置密码验证
 */
export const resetPasswordValidation = [
  ...idParamValidation,
  body('newPassword')
    .optional()
    .isString()
    .isLength({ min: 6, max: 100 })
    .withMessage('新密码长度必须在6-100个字符之间'),
];

/**
 * 用户 ID 参数验证
 */
export const userIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),
];

export default {
  loginValidation,
  createUserValidation,
  updateUserValidation,
  batchImportValidation,
  changePasswordValidation,
  resetPasswordValidation,
  userIdValidation,
};
