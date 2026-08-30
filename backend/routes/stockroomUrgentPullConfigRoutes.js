import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { getConfigs, saveConfig, saveConfigs, deleteConfig, getLocationMappings, getPulllistTypeMappings } from '../controllers/stockroomUrgentPullConfigController.js';

// 获取所有配置
router.get('/configs', authenticateToken, asyncHandler(getConfigs));

// 保存单个配置
router.post('/configs', authenticateToken, asyncHandler(saveConfig));

// 批量保存配置
router.post('/configs/batch', authenticateToken, asyncHandler(saveConfigs));

// 删除配置
router.delete('/configs/:id', authenticateToken, asyncHandler(deleteConfig));

// 获取库位映射（用于数据处理）
router.get('/location-mappings', authenticateToken, asyncHandler(getLocationMappings));

// 获取Pull List类型映射
router.get('/pulllist-type-mappings', authenticateToken, asyncHandler(getPulllistTypeMappings));

export default router;
