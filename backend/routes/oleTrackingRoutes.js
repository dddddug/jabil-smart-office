/**
 * 部门OLE追踪 路由
 */
import express from 'express';
import * as oleTrackingController from '../controllers/oleTrackingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 所有路由需要认证
router.use(authenticateToken);

// ========== 统计数据 ==========

// 获取OLE追踪统计数据
router.get('/stats', oleTrackingController.getStats);

// 获取效率达标排名
router.get('/ranking', oleTrackingController.getRanking);

// 获取Area效率统计
router.get('/area-stats', oleTrackingController.getAreaStats);

// 获取差异统计数据
router.get('/diff-stats', oleTrackingController.getDiffStats);

// 获取班次明细数据
router.get('/shift-detail', oleTrackingController.getShiftDetail);

// ========== 配置管理 ==========

// 岗位等级目标效率配置
router.get('/config/level-efficiency', oleTrackingController.getLevelEfficiencyConfig);
router.post('/config/level-efficiency', oleTrackingController.createLevelEfficiencyConfig);
router.put('/config/level-efficiency/:id', oleTrackingController.updateLevelEfficiencyConfig);
router.delete('/config/level-efficiency/:id', oleTrackingController.deleteLevelEfficiencyConfig);

// Area效率系数配置
router.get('/config/area-coefficient', oleTrackingController.getAreaCoefficientConfig);
router.post('/config/area-coefficient', oleTrackingController.createAreaCoefficientConfig);
router.put('/config/area-coefficient/:id', oleTrackingController.updateAreaCoefficientConfig);
router.delete('/config/area-coefficient/:id', oleTrackingController.deleteAreaCoefficientConfig);

// 不参与效率计算的Area配置
router.get('/config/excluded-areas', oleTrackingController.getExcludedAreas);
router.put('/config/excluded-areas', oleTrackingController.updateExcludedAreas);
router.post('/config/add-special-hours', oleTrackingController.addSpecialHoursToExcluded);
router.get('/config/all-areas', oleTrackingController.getAllAreas);

// Area效率计算规则配置
router.get('/config/area-rules', oleTrackingController.getAreaRules);
router.post('/config/area-rules', oleTrackingController.createAreaRule);
router.put('/config/area-rules/:id', oleTrackingController.updateAreaRule);
router.delete('/config/area-rules/:id', oleTrackingController.deleteAreaRule);

export default router;
