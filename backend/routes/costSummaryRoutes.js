import express from 'express';
import * as costSummaryController from '../controllers/costSummaryController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// 获取 Cost 汇总数据
router.get(
  '/',
  authenticateToken,
  authorize(['super_admin', 'plant_admin', 'dept_admin', 'ic_manager', 'employee']),
  costSummaryController.getCostSummaryData
);

// 导出 Cost 汇总 Excel
router.get(
  '/export',
  authenticateToken,
  authorize(['super_admin', 'plant_admin', 'ic_manager']),
  costSummaryController.exportCostSummary
);

// 获取 Cost 汇总界面下拉框选项
router.get(
  '/dropdowns',
  authenticateToken,
  authorize(['super_admin', 'plant_admin', 'dept_admin', 'ic_manager', 'employee']),
  costSummaryController.getCostSummaryDropdownOptions
);

// 手动触发 Cost 数据重算
router.post(
    '/recalculate',
    authenticateToken,
    authorize(['super_admin', 'ic_manager']),
    costSummaryController.recalculateCostData
  );

// 手动触发所有月份的 Cost 数据重算
router.post(
    '/recalculate-all',
    authenticateToken,
    authorize(['super_admin', 'ic_manager']),
    costSummaryController.recalculateAllCostData
  );

export default router;
