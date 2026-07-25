import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import {
  loginValidation,
  createUserValidation,
  updateUserValidation,
  batchImportValidation,
  resetPasswordValidation
} from '../validators/userValidator.js';
import { validationMiddleware } from '../middlewares/validationMiddleware.js';
import userController from '../controllers/userController.js';

// 获取当前登录用户信息
router.get('/me', authenticateToken, asyncHandler(userController.getCurrentUser));

// 用户登录
router.post('/login', loginValidation, validationMiddleware, asyncHandler(userController.login));

// 用户登出
router.post('/logout', authenticateToken, asyncHandler(userController.logout));

// 获取所有用户列表
router.get('/', asyncHandler(userController.getAllUsers));

// 获取审批人列表
router.get('/approvers', asyncHandler(userController.getApprovers));

// 创建用户
router.post('/', createUserValidation, validationMiddleware, asyncHandler(userController.createUser));

// 批量导入用户
router.post('/batch', batchImportValidation, validationMiddleware, asyncHandler(userController.batchImportUsers));

// 更新用户
router.put('/:id', updateUserValidation, validationMiddleware, asyncHandler(userController.updateUser));

// 管理员重置密码
router.post('/:id/admin-reset-password', authenticateToken, authorize(['super_admin']), resetPasswordValidation, validationMiddleware, asyncHandler(userController.adminResetPassword));

// 删除用户
router.delete('/:id', authenticateToken, asyncHandler(userController.deleteUser));

export default router;
