import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import pncTransferController from '../controllers/pncTransferController.js';
import pncTransferConfigController from '../controllers/pncTransferConfigController.js';

// ========== PNC转仓打印配置路由 ==========

// 获取所有配置
router.get('/configs', authenticateToken, asyncHandler(pncTransferConfigController.getConfigs));

// 获取单个配置
router.get('/configs/:id', authenticateToken, asyncHandler(pncTransferConfigController.getConfigById));

// 创建配置
router.post('/configs', authenticateToken, asyncHandler(pncTransferConfigController.createConfig));

// 更新配置
router.put('/configs/:id', authenticateToken, asyncHandler(pncTransferConfigController.updateConfig));

// 删除配置
router.delete('/configs/:id', authenticateToken, asyncHandler(pncTransferConfigController.deleteConfig));

// 获取活跃的配置列表（供下拉选择使用）
router.get('/configs/active/list', authenticateToken, asyncHandler(pncTransferConfigController.getActiveConfigs));

// ========== PNC转仓单据路由 ==========

// 获取单据列表
router.get('/documents', authenticateToken, asyncHandler(pncTransferController.getDocuments));

// 获取单据详情
router.get('/documents/:id', authenticateToken, asyncHandler(pncTransferController.getDocumentById));

// 创建单据
router.post('/documents', authenticateToken, asyncHandler(pncTransferController.createDocument));

// 更新单据
router.put('/documents/:id', authenticateToken, asyncHandler(pncTransferController.updateDocument));

// 发送邮件
router.post('/documents/:id/send-email', authenticateToken, asyncHandler(pncTransferController.sendEmail));

// 删除单据
router.delete('/documents/:id', authenticateToken, asyncHandler(pncTransferController.deleteDocument));

// 获取统计数据
router.get('/stats', authenticateToken, asyncHandler(pncTransferController.getStats));

// 记录打印次数
router.post('/documents/:id/print', authenticateToken, asyncHandler(pncTransferController.recordPrint));

export default router;
