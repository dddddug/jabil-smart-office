import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import {
  getData,
  exportData,
  refreshData,
  getRefreshStatusHandler,
  startScheduledRefresh,
  getRefreshStatus,
  getSummaryData
} from '../controllers/stockroomUrgentPullController.js';

// 获取 Stockroom Urgent Pull 数据（从数据库读取）
router.get('/data', authenticateToken, asyncHandler(getData));

// 导出数据
router.get('/export', authenticateToken, asyncHandler(exportData));

// 手动刷新数据
router.post('/refresh', authenticateToken, asyncHandler(refreshData));

// 获取刷新状态
router.get('/refresh-status', authenticateToken, asyncHandler(getRefreshStatusHandler));

// 获取汇总数据（包含主表和归档表）
router.get('/summary-data', authenticateToken, asyncHandler(getSummaryData));

export default router;
export { startScheduledRefresh, getRefreshStatus };
