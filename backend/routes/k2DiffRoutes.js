import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import k2DiffController from '../controllers/k2DiffController.js';

// 获取登记记录列表
router.get('/registrations', authenticateToken, asyncHandler(k2DiffController.getRegistrations));

// 获取登记记录详情
router.get('/registrations/:id', authenticateToken, asyncHandler(k2DiffController.getRegistrationById));

// 创建登记记录
router.post('/registrations', authenticateToken, asyncHandler(k2DiffController.createRegistration));

// 更新登记记录
router.put('/registrations/:id', authenticateToken, asyncHandler(k2DiffController.updateRegistration));

// 删除登记记录
router.delete('/registrations/:id', authenticateToken, asyncHandler(k2DiffController.deleteRegistration));

// 获取统计数据
router.get('/stats', authenticateToken, asyncHandler(k2DiffController.getStats));

// 获取类型统计（数据库聚合）
router.get('/type-stats', authenticateToken, asyncHandler(k2DiffController.getTypeStats));

// 批量发送邮件通知（合并所有记录为一封邮件）
router.post('/registrations/notify-bulk', authenticateToken, asyncHandler(k2DiffController.sendBulkNotification));

// 发送邮件通知（单个记录）
router.post('/registrations/:id/notify', authenticateToken, asyncHandler(k2DiffController.sendNotification));

export default router;
