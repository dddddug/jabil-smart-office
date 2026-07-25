import express from 'express';
const router = express.Router();
import { createExcelMemoryUpload } from '../utils/fileUtils.js';
import { parseExcel } from '../utils/excelUtils.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import scheduleController from '../controllers/scheduleController.js';

const memoryUpload = createExcelMemoryUpload();

// ========== 员工排班管理 API ==========

// 初始化排班表
const initScheduleTable = async () => {
  const pool = (await import('../config/db.js')).default;
  const { SCHEDULE_TABLE } = await import('../config/db_constants.js');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEDULE_TABLE} (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        schedule_date DATE NOT NULL,
        shift VARCHAR(20) NOT NULL,
        special_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, schedule_date)
      )
    `);
  } catch (error) {
    console.error('排班表初始化失败:', error);
  }
};

// 调用初始化
initScheduleTable();

// 获取员工排班和工时统计
router.get('/employees', asyncHandler(scheduleController.getEmployeesWithSchedule));

// 保存员工排班
router.post('/save', asyncHandler(scheduleController.saveSchedule));

// 删除员工排班
router.delete('/:employeeId/:scheduleDate', asyncHandler(scheduleController.deleteSchedule));

// 测试路由：直接查询jso_hr_employee_schedule表
router.get('/test-db', asyncHandler(scheduleController.testDatabase));

// 批量上传员工排班
router.post('/batch-upload', memoryUpload.single('file'), asyncHandler(scheduleController.batchUploadSchedule));

// 下载排班模板
router.get('/download-template', asyncHandler(scheduleController.downloadTemplate));

// 获取所有可用班次
router.get('/shifts', asyncHandler(scheduleController.getShifts));

export default router;
