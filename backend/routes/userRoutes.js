import express from 'express';
const router = express.Router();
import pool from '../config/db.js';
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

// 健康检查端点（无需认证）
router.get('/health', asyncHandler(async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
}));

// 用户登录
router.post('/login', loginValidation, validationMiddleware, asyncHandler(userController.login));

// 用户登出
router.post('/logout', authenticateToken, asyncHandler(userController.logout));

// 获取所有用户列表
router.get('/', authenticateToken, asyncHandler(userController.getAllUsers));

// 获取审批人列表
router.get('/approvers', authenticateToken, asyncHandler(userController.getApprovers));

// 创建用户
router.post('/', createUserValidation, validationMiddleware, asyncHandler(userController.createUser));

// 批量导入用户
router.post('/batch', batchImportValidation, validationMiddleware, asyncHandler(userController.batchImportUsers));

// 更新用户
router.put('/:id', updateUserValidation, validationMiddleware, asyncHandler(userController.updateUser));

// 管理员重置密码
router.post('/:id/admin-reset-password', authenticateToken, authorize(['super_admin']), resetPasswordValidation, validationMiddleware, asyncHandler(userController.adminResetPassword));

// 验证安全问题用于密码重置（无需认证）
router.post('/reset-password/verify', asyncHandler(userController.verifySecurityQuestion));

// 重置用户密码（无需认证）
router.post('/reset-password', asyncHandler(userController.resetUserPassword));

// 修改当前用户密码（需要认证）
router.post('/change-password', authenticateToken, asyncHandler(userController.changePassword));

// 设置安全问题（需要认证）
router.post('/set-security-question', authenticateToken, asyncHandler(userController.setSecurityQuestion));

// 删除用户
router.delete('/:id', authenticateToken, asyncHandler(userController.deleteUser));

export default router;
