import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDir = path.resolve(__dirname, '../uploads');

export const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

const normalizeExtensions = (allowedExtensions) => {
  return (allowedExtensions || []).map((ext) => ext.toLowerCase());
};

export const buildFileFilter = ({ allowedMimeTypes = [], allowedExtensions = [], errorMessage = '不支持的文件类型' } = {}) => {
  const normalizedExts = normalizeExtensions(allowedExtensions);

  return (_req, file, cb) => {
    const originalName = file.originalname.toLowerCase();
    const mimeMatch = allowedMimeTypes.length === 0 || allowedMimeTypes.includes(file.mimetype);
    const extMatch = normalizedExts.length === 0 || normalizedExts.some((suffix) => originalName.endsWith(suffix));

    if (mimeMatch || extMatch) {
      return cb(null, true);
    }

    return cb(new Error(errorMessage));
  };
};

export const createMemoryUpload = ({ maxFileSize = 10 * 1024 * 1024, allowedMimeTypes = [], allowedExtensions = [], errorMessage = '不支持的文件类型' } = {}) => multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter: buildFileFilter({ allowedMimeTypes, allowedExtensions, errorMessage }),
});

export const createExcelMemoryUpload = (options = {}) => createMemoryUpload({
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  allowedExtensions: ['.xlsx', '.xls'],
  errorMessage: '只支持Excel文件(.xlsx/.xls)',
  ...options,
});

export const createDiskUpload = ({ destination = uploadsDir, maxFileSize = 10 * 1024 * 1024, allowedMimeTypes = [], allowedExtensions = [], errorMessage = '不支持的文件类型' } = {}) => {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: buildFileFilter({ allowedMimeTypes, allowedExtensions, errorMessage }),
  });
};
