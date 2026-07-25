import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import daMaterialConfigController from '../controllers/daMaterialConfigController.js';

// 获取配置
router.get('/configs', authenticateToken, asyncHandler(daMaterialConfigController.getDAMaterialConfigs));

// 更新配置
router.post('/configs', authenticateToken, asyncHandler(daMaterialConfigController.updateDAMaterialConfigs));

export default router;
