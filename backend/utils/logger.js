import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志目录
const logDir = path.join(__dirname, '../logs');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0 && meta.stack === undefined) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    const stackStr = meta.stack ? `\n${meta.stack}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${stackStr}`;
  })
);

// 创建 Logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'jabil-smart-office' },
  transports: [
    // 错误日志 - 单独记录错误
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // 综合日志 - 记录所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    })
  );
}

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // 请求结束时记录
  res.on('finish', () => {
    const duration = Date.now() - start;

    // 构建日志元数据
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
      contentLength: res.get('content-length') || 0,
    };

    // 根据状态码选择日志级别
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// 便捷的日志方法
export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export const logError = (message, error = null, meta = {}) => {
  if (error instanceof Error) {
    logger.error(message, { ...meta, error: error.message, stack: error.stack });
  } else {
    logger.error(message, { ...meta, error });
  }
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// 用户操作日志
export const logUserAction = (userId, username, action, details = {}) => {
  logger.info('User Action', {
    type: 'user_action',
    userId,
    username,
    action,
    ...details,
  });
};

// 数据库操作日志
export const logDatabase = (operation, table, details = {}) => {
  logger.debug('Database Operation', {
    type: 'database',
    operation,
    table,
    ...details,
  });
};

export default logger;
