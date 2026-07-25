import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import dashboardController from '../controllers/dashboardController.js';

// 获取仪表盘统计数据
router.get('/stats', authenticateToken, asyncHandler(dashboardController.getDashboardStats));

// 获取今日排班概览
router.get('/today-schedule', authenticateToken, asyncHandler(dashboardController.getTodaySchedule));

// 获取待审批列表
router.get('/pending-approvals', authenticateToken, asyncHandler(dashboardController.getPendingApprovals));

// 获取工时趋势数据
router.get('/working-hours-trend', authenticateToken, asyncHandler(dashboardController.getWorkingHoursTrend));

// 获取部门工时分布
router.get('/department-distribution', authenticateToken, asyncHandler(dashboardController.getDepartmentDistribution));

export default router;
