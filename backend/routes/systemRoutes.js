import express from 'express';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// 读取 package.json 获取版本号
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const appVersion = packageJson.version;

const versionHistory = [
  { version: '1.1.9', date: '2026-08-04' },
  { version: '1.1.6', date: '2026-07-30' },
  { version: '1.1.5', date: '2026-07-29' },
  { version: '1.1.4', date: '2026-07-29' },
  { version: '1.1.3', date: '2026-07-26' },
  { version: '1.1.2', date: '2026-07-19' },
  { version: '1.1.1', date: '2026-07-18' },
  { version: '1.1.0', date: '2026-07-13' },
  { version: '1.0.0', date: '2026-07-03' },
];

// 获取 git 提交历史
const getGitHistory = () => {
  try {
    const gitLog = execSync('git log --format="%H|%s|%ad|%D" --date=iso -30', {
      encoding: 'utf-8',
      cwd: join(__dirname, '..')
    });
    return gitLog.trim().split('\n').map(line => {
      const parts = line.match(/^"([^"]+)"|^([^\n]+)/);
      if (!parts) return null;
      const data = (parts[1] || parts[2]).replace(/"/g, '');
      const [hash, message, dateStr, refs] = data.split('|');
      return {
        hash: hash.substring(0, 7),
        fullHash: hash,
        message: message,
        date: dateStr,
        refs: refs || '',
        time: formatTimeAgo(dateStr)
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('获取 git 历史失败:', error);
    return [];
  }
};

// 格式化时间为相对时间（中文）
const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);

  if (days > 30) {
    return date.toLocaleDateString('zh-CN');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  }
  return '刚刚';
};

// 版本信息
router.get('/version', (req, res) => {
  const buildTime = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const versionInfo = {
    currentVersion: appVersion,
    backendVersion: appVersion,
    releaseDate: versionHistory[0]?.date || new Date().toISOString().split('T')[0],
    buildTime: buildTime,
    description: 'Jabil Smart Office System',
    nodeVersion: process.version,
    versions: versionHistory,
    gitHistory: getGitHistory()
  };

  res.json(versionInfo);
});

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
