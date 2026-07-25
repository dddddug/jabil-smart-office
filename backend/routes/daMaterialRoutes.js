import express from 'express';
const router = express.Router();
import { authenticateToken } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import daMaterialController from '../controllers/daMaterialController.js';
import { createDiskUpload, uploadsDir } from '../utils/fileUtils.js';
import path from 'path';
import fs from 'fs';

// 配置multer - 管控物料单据附件上传（支持PDF、图片、Excel、CSV）
const daMaterialUpload = createDiskUpload({
  destination: uploadsDir,
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.xls', '.xlsx', '.csv'],
  errorMessage: '只支持 PDF、JPG、PNG、Excel、CSV 格式文件'
});

// 上传单据附件
router.post('/upload', authenticateToken, daMaterialUpload.single('file'), asyncHandler(async (req, res) => {
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
router.get('/documents', authenticateToken, asyncHandler(daMaterialController.getDocuments));

// 获取单据详情
router.get('/documents/:id', authenticateToken, asyncHandler(daMaterialController.getDocumentById));

// 创建单据（提交）
router.post('/documents', authenticateToken, asyncHandler(daMaterialController.createDocument));

// 更新单据
router.put('/documents/:id', authenticateToken, asyncHandler(daMaterialController.updateDocument));

// 撤回单据（提交部门）
router.post('/documents/:id/withdraw', authenticateToken, asyncHandler(daMaterialController.withdrawDocument));

// 打印单据（打印部门）
router.post('/documents/:id/print', authenticateToken, asyncHandler(daMaterialController.printDocument));

// 接收单据（接收部门）
router.post('/documents/:id/receive', authenticateToken, asyncHandler(daMaterialController.receiveDocument));

// 已锁BIN/已发料（仓库操作）
router.post('/documents/:id/lock-bin', authenticateToken, asyncHandler(daMaterialController.lockBinDocument));

// 拒绝单据（接收部门）
router.post('/documents/:id/reject', authenticateToken, asyncHandler(daMaterialController.rejectDocument));

// 退回单据（签收部门退回）
router.post('/documents/:id/return', authenticateToken, asyncHandler(daMaterialController.returnDocument));

// 取消单据（已退回状态可取消）
router.post('/documents/:id/cancel', authenticateToken, asyncHandler(daMaterialController.cancelDocument));

// 签收单据（签收部门）
router.post('/documents/:id/sign', authenticateToken, asyncHandler(daMaterialController.signDocument));

// 确认完成（提交人确认）
router.post('/documents/:id/confirm-complete', authenticateToken, asyncHandler(daMaterialController.confirmComplete));

// 发送邮件通知
router.post('/documents/:id/notify', authenticateToken, asyncHandler(daMaterialController.sendNotification));

// 删除单据
router.delete('/documents/:id', authenticateToken, asyncHandler(daMaterialController.deleteDocument));

// 获取待处理单据统计
router.get('/stats', authenticateToken, asyncHandler(daMaterialController.getStats));

// 下载单据附件（需要认证）
router.get('/documents/:id/download', authenticateToken, asyncHandler(daMaterialController.downloadAttachment));

// 预览单据附件（不需要认证，通过文件路径访问）
router.get('/preview/:fileName', asyncHandler(async (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(uploadsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error('文件不存在');
  }

  // 根据文件类型设置Content-Type
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv'
  };

  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}));

// 催单
router.post('/documents/:id/rush', authenticateToken, asyncHandler(daMaterialController.rushDocument));

export default router;
