import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import k2DiffConfigController from '../controllers/k2DiffConfigController.js';

// 获取所有配置
router.get('/configs', authenticateToken, asyncHandler(k2DiffConfigController.getConfigs));

// 更新配置
router.post('/configs', authenticateToken, asyncHandler(k2DiffConfigController.updateConfigs));

// 获取差异类型列表
router.get('/difference-types', authenticateToken, asyncHandler(k2DiffConfigController.getDifferenceTypes));

// 获取退料地点列表
router.get('/return-locations', authenticateToken, asyncHandler(k2DiffConfigController.getReturnLocations));

// 获取邮件配置
router.get('/email-config', authenticateToken, asyncHandler(k2DiffConfigController.getEmailConfig));

export default router;
