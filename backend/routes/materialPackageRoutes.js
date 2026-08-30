import express from 'express';
import multer from 'multer';
import { parseExcel } from '../utils/excelUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import materialPackageController from '../controllers/materialPackageController.js';

const router = express.Router();

// 内存存储配置
const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// 获取列表（支持分页和搜索）
router.get('/', authenticateToken, asyncHandler(materialPackageController.getMaterialPackages));

// 获取单条详情
router.get('/:id', authenticateToken, asyncHandler(materialPackageController.getMaterialPackageById));

// 新增
router.post('/', authenticateToken, asyncHandler(materialPackageController.createMaterialPackage));

// 更新
router.put('/:id', authenticateToken, asyncHandler(materialPackageController.updateMaterialPackage));

// 删除
router.delete('/:id', authenticateToken, asyncHandler(materialPackageController.deleteMaterialPackage));

// 批量导入（支持文件上传）
router.post('/batch-import', authenticateToken, upload.single('file'), asyncHandler(materialPackageController.batchImportWithFile));

// 批量导入（支持JSON数组）
router.post('/batch-import-json', authenticateToken, asyncHandler(materialPackageController.batchImportMaterialPackages));

// 导出
router.get('/export/all', authenticateToken, asyncHandler(materialPackageController.exportMaterialPackages));

// 下载导入模板（无需认证）
router.get('/template/download', asyncHandler(materialPackageController.downloadTemplate));

export default router;
