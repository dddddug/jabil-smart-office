import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import k045Controller from '../controllers/k045Controller.js';
import k045ConfigController from '../controllers/k045ConfigController.js';
import { createDiskUpload, uploadsDir } from '../utils/fileUtils.js';
import path from 'path';
import fs from 'fs';

// 配置multer - K045单据附件上传（只允许PDF）
const k045Upload = createDiskUpload({
  destination: uploadsDir,
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
  errorMessage: '只支持 PDF 格式文件'
});

// 上传单据附件
router.post('/upload', authenticateToken, k045Upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error('请上传文件');
  }

  res.json({
    success: true,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    filePath: `/uploads/${req.file.filename}`
  });
}));

// 获取单据列表
router.get('/documents', authenticateToken, asyncHandler(k045Controller.getDocuments));

// 获取单据详情
router.get('/documents/:id', authenticateToken, asyncHandler(k045Controller.getDocumentById));

// 创建单据（提交）
router.post('/documents', authenticateToken, asyncHandler(k045Controller.createDocument));

// 更新单据
router.put('/documents/:id', authenticateToken, asyncHandler(k045Controller.updateDocument));

// 撤回单据（提交部门）
router.post('/documents/:id/withdraw', authenticateToken, asyncHandler(k045Controller.withdrawDocument));

// 接收单据（接收打印部门）
router.post('/documents/:id/receive', authenticateToken, asyncHandler(k045Controller.receiveDocument));

// 催单
router.post('/documents/:id/rush', authenticateToken, asyncHandler(k045Controller.rushDocument));

// 退回单据（签收分料部门退回）
router.post('/documents/:id/return', authenticateToken, asyncHandler(k045Controller.returnDocument));

// 取消单据（已退回状态可取消）
router.post('/documents/:id/cancel', authenticateToken, asyncHandler(k045Controller.cancelDocument));

// 签收单据（签收分料部门）
router.post('/documents/:id/sign', authenticateToken, asyncHandler(k045Controller.signDocument));

// 分料结束（签收分料部门）
router.post('/documents/:id/end-distribution', authenticateToken, asyncHandler(k045Controller.endDistribution));

// 确认完成（提交人签收）
router.post('/documents/:id/confirm-complete', authenticateToken, asyncHandler(k045Controller.confirmComplete));

// 发送邮件通知
router.post('/documents/:id/notify', authenticateToken, asyncHandler(k045Controller.sendNotification));

// 删除单据
router.delete('/documents/:id', authenticateToken, asyncHandler(k045Controller.deleteDocument));

// 获取待处理单据统计
router.get('/stats', authenticateToken, asyncHandler(k045Controller.getStats));

// 下载单据附件（需要认证）
router.get('/documents/:id/download', authenticateToken, asyncHandler(k045Controller.downloadAttachment));

// 预览单据附件（不需要认证，通过文件路径访问）
router.get('/preview/:fileName', asyncHandler(async (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(uploadsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error('文件不存在');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

// K045 规则配置
router.get('/configs', authenticateToken, asyncHandler(k045ConfigController.getK045Configs));
router.post('/configs', authenticateToken, asyncHandler(k045ConfigController.updateK045Configs));

export default router;
