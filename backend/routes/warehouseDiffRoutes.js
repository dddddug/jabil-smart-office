/**
 * 仓储差异登记路由
 * 创建时间: 2026-09-07
 */
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import warehouseDiffController from '../controllers/warehouseDiffController.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import multer from 'multer';

const router = express.Router();

// 内存存储配置
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB限制

// ========== 配置接口 ==========

// 获取差异类型列表
router.get('/config/diff-types',
  authenticateToken,
  asyncHandler(warehouseDiffController.getDiffTypes)
);

// 更新差异类型列表
router.post('/config/diff-types',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseDiffController.updateDiffTypes)
);

// 根据员工工号获取用户姓名
router.get('/user/real-name',
  authenticateToken,
  asyncHandler(warehouseDiffController.getUserRealNameByEmployeeId)
);

// ========== CRUD接口 ==========

// 获取登记记录列表
router.get('/registrations',
  authenticateToken,
  asyncHandler(warehouseDiffController.getRegistrations)
);

// 导出登记记录
router.get('/registrations/export',
  authenticateToken,
  asyncHandler(warehouseDiffController.exportRegistrations)
);

// 获取登记记录详情
router.get('/registrations/:id',
  authenticateToken,
  asyncHandler(warehouseDiffController.getRegistrationById)
);

// 创建登记记录
router.post('/registrations',
  authenticateToken,
  authorize(['ia', 'mfg', 'employee', 'ic_manager', 'dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseDiffController.createRegistration)
);

// 更新登记记录
router.put('/registrations/:id',
  authenticateToken,
  authorize(['ia', 'mfg', 'ic_manager', 'dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseDiffController.updateRegistration)
);

// 删除登记记录
router.delete('/registrations/:id',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseDiffController.deleteRegistration)
);

// ========== 批量导入 ==========

// 批量导入登记记录
router.post('/registrations/import',
  authenticateToken,
  authorize(['ia', 'mfg', 'ic_manager', 'dept_admin', 'super_admin', 'plant_admin']),
  upload.single('file'),
  asyncHandler(warehouseDiffController.importRegistrations)
);

// 下载导入模板
router.get('/template',
  authenticateToken,
  asyncHandler(warehouseDiffController.downloadTemplate)
);

// ========== 统计接口 ==========

// 获取统计数据
router.get('/stats',
  authenticateToken,
  asyncHandler(warehouseDiffController.getStats)
);

// 按类型统计
router.get('/stats/by-type',
  authenticateToken,
  asyncHandler(warehouseDiffController.getTypeStats)
);

// PIC排名统计
router.get('/stats/by-pic',
  authenticateToken,
  asyncHandler(warehouseDiffController.getPicStats)
);

// 趋势统计
router.get('/stats/trend',
  authenticateToken,
  asyncHandler(warehouseDiffController.getTrendStats)
);

export default router;
