import express from 'express';
import { parseExcel } from '../utils/excelUtils.js';
import { createExcelMemoryUpload } from '../utils/fileUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件
import {
  handleTemporaryOvertimeUpload,
  handleTemporaryLeaveUpload,
  handleFormalLeaveUpload,
  handleResignationTransferUpload,
  handleScheduleUpload
} from '../services/batchUploadService.js';

const router = express.Router();

const memoryUpload = createExcelMemoryUpload();

// 批量上传临时加班
router.post('/temporary-overtime/batch-upload', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const applicantId = req.body.applicantId || 1;
    const result = await handleTemporaryOvertimeUpload(rows, applicantId);

    if (result.errors.length > 0 && result.insertedCount === 0) {
      return res.status(400).json({ error: '数据验证失败', details: result.errors });
    }

    res.json(result);
  } catch (error) {
    console.error('批量上传临时加班失败:', error);
    res.status(500).json({ error: '批量上传失败', message: error.message });
  }
});

// 批量上传临时请假&公差
router.post('/temporary-leave/batch-upload', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const applicantId = req.body.applicantId || 1;
    const result = await handleTemporaryLeaveUpload(rows, applicantId);

    if (result.errors.length > 0 && result.insertedCount === 0) {
      return res.status(400).json({ error: '数据验证失败', details: result.errors });
    }

    res.json(result);
  } catch (error) {
    console.error('批量上传临时请假&公差失败:', error);
    res.status(500).json({ error: '批量上传失败', message: error.message });
  }
});

// 批量上传正式请假
router.post('/formal-leave/batch-upload', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const applicantId = req.body.applicantId || 1;
    const result = await handleFormalLeaveUpload(rows, applicantId);

    if (result.errors.length > 0 && result.insertedCount === 0) {
      return res.status(400).json({ error: '数据验证失败', details: result.errors });
    }

    res.json(result);
  } catch (error) {
    console.error('批量上传正式请假失败:', error);
    res.status(500).json({ error: '批量上传失败', message: error.message });
  }
});

// 批量上传离职/转岗
router.post('/resignation-transfer/batch-upload', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const applicantId = req.body.applicantId || 1;
    const result = await handleResignationTransferUpload(rows, applicantId);

    if (result.errors.length > 0 && result.insertedCount === 0) {
      return res.status(400).json({ error: '数据验证失败', details: result.errors });
    }

    res.json(result);
  } catch (error) {
    console.error('批量上传离职/转岗失败:', error);
    res.status(500).json({ error: '批量上传失败', message: error.message });
  }
});

// 批量上传员工排班
router.post('/schedule/batch-upload', authenticateToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, error: '请上传Excel文件' });
    }

    const rows = parseExcel(req.file.buffer);
    const result = await handleScheduleUpload(rows);


    if (!result.success) {
      return res.status(400).json({ code: 400, message: '数据验证失败', data: result.errors });
    }

    const responseData = {
      code: 200,
      message: '批量上传成功',
      data: result
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('批量上传排班失败:', error);
    res.status(500).json({ code: 500, message: '批量上传失败', data: error.message });
  }
});


// 下载Excel模板 (Updated to use static files)
router.get('/:type/download-template', authenticateToken, async (req, res) => {
  const { type } = req.params;
  
  let templateFileName;

  switch (type) {
    case 'temporary-overtime':
      templateFileName = '临时加班导入模板.xlsx';
      break;
    case 'temporary-leave':
      templateFileName = '临时请假&公差导入模板.xlsx';
      break;
    case 'formal-leave':
      templateFileName = '正式请假导入模板.xlsx';
      break;
    case 'resignation-transfer':
      templateFileName = '离职转岗导入模板.xlsx';
      break;
    case 'schedule': 
      templateFileName = 'EmployeeScheduleImportTemplate.xlsx';
      break;
    default:
      return res.status(400).json({ error: '无效的模板类型' });
  }

  // Redirect to the static file serving endpoint
  // The actual static serving is handled by server.js at /api/templates
  const redirectUrl = `/api/templates/${encodeURIComponent(templateFileName)}`;
  res.redirect(redirectUrl);
});

export default router;