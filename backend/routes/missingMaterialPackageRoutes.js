import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import missingMaterialPackageController from '../controllers/missingMaterialPackageController.js';

const router = express.Router();

// 获取待填充物料列表（支持分页和搜索）
router.get('/', authenticateToken, asyncHandler(missingMaterialPackageController.getMissingMaterials));

// 同步待填充物料数据
router.post('/sync', authenticateToken, asyncHandler(missingMaterialPackageController.syncMissingMaterials));

// 获取待填充物料统计
router.get('/stats', authenticateToken, asyncHandler(missingMaterialPackageController.getMissingMaterialsStats));

// 导出待填充物料
router.get('/export', authenticateToken, asyncHandler(missingMaterialPackageController.exportMissingMaterials));

export default router;
