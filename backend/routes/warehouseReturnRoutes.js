/**
 * 回仓申请路由
 */
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import warehouseReturnController from '../controllers/warehouseReturnController.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// 通用路由（需认证）
router.get('/documents', authenticateToken, asyncHandler(warehouseReturnController.getDocuments));
router.get('/documents/:id', authenticateToken, asyncHandler(warehouseReturnController.getDocumentById));
router.get('/documents/:id/logs', authenticateToken, asyncHandler(warehouseReturnController.getDocumentLogs));
router.get('/stats', authenticateToken, asyncHandler(warehouseReturnController.getDocumentStats));
router.get('/config/buildings', authenticateToken, asyncHandler(warehouseReturnController.getBuildings));
router.get('/template', authenticateToken, asyncHandler(warehouseReturnController.downloadTemplate));

// 打印预览路由（不需要认证，用于打印页面直接访问）
router.get('/preview/application/:id', asyncHandler(warehouseReturnController.previewApplication));
router.get('/preview/transfer/:id', asyncHandler(warehouseReturnController.previewTransfer));

// IA/MFG 权限路由
router.post('/documents',
  authenticateToken,
  authorize(['ia', 'mfg', 'employee', 'ic_manager', 'dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.createDocument)
);

router.put('/documents/:id',
  authenticateToken,
  authorize(['ia', 'mfg', 'employee', 'ic_manager', 'dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.updateDocument)
);

// 部门管理员/普通员工权限路由
router.post('/documents/:id/receive',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.receiveDocument)
);

router.post('/documents/:id/reconcile',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.reconcileDocument)
);

router.post('/documents/:id/return-items',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.returnItems)
);

router.post('/documents/:id/close-items',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.closeItems)
);

router.post('/documents/:id/confirm-sap-only',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.confirmSapOnly)
);

// 邮件相关
router.post('/documents/:id/resend-email',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.resendReturnEmail)
);

// 配置管理
router.get('/config/email-cc',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.getEmailCcList)
);

router.post('/config/email-cc',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.saveEmailCcConfig)
);

// Building 配置管理
router.get('/config/buildings/all',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.getAllBuildings)
);

router.post('/config/buildings',
  authenticateToken,
  authorize(['dept_admin', 'super_admin', 'plant_admin']),
  asyncHandler(warehouseReturnController.saveBuildingConfig)
);

export default router;
