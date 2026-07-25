import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ensureUploadsDir, createDiskUpload, uploadsDir } from '../utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 确保 uploads 目录存在
ensureUploadsDir();

// 配置multer - 证明文件上传（磁盘存储）
const proofUpload = createDiskUpload({
  destination: uploadsDir,
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'],
  errorMessage: '不支持的文件类型'
});

// 上传证明文件
router.post('/upload', proofUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }
    
    res.json({
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('上传证明文件失败:', error);
    res.status(500).json({ error: '上传证明文件失败' });
  }
});

// 下载证明文件
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.download(filePath, (err) => {
      if (err) {
        console.error('下载证明文件失败:', err);
        res.status(500).json({ error: '下载证明文件失败' });
      }
    });
  } catch (error) {
    console.error('下载证明文件失败:', error);
    res.status(500).json({ error: '下载证明文件失败' });
  }
});

export default router;