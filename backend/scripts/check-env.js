const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log('读取.env文件:', envPath);
console.log('');

try {
  const content = fs.readFileSync(envPath, 'utf-8');
  console.log('文件内容:');
  console.log('----------------------------------------');
  console.log(content);
  console.log('----------------------------------------');
} catch (error) {
  console.error('读取失败:', error.message);
}

console.log('');
console.log('当前环境变量:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***已设置***' : '未设置');
