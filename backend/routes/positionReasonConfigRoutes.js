import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import positionReasonConfigController from '../controllers/positionReasonConfigController.js';

// 获取岗位原因配置
router.get('/', authenticateToken, asyncHandler(positionReasonConfigController.getPositionReasons));

// 保存岗位原因配置
router.post('/', authenticateToken, asyncHandler(positionReasonConfigController.savePositionReasons));

export default router;
