const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// 先清除可能已存在的环境变�?delete process.env.SMTP_HOST;
delete process.env.SMTP_PORT;
delete process.env.SMTP_SECURE;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.OAUTH_CLIENT_ID;
delete process.env.OAUTH_CLIENT_SECRET;
delete process.env.OAUTH_REFRESH_TOKEN;
delete process.env.OAUTH_ACCESS_TOKEN;

// 手动加载.env文件
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// 解析.env文件内容
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value && !key.startsWith('#')) {
    process.env[key.trim()] = value.trim();
  }
});

// console.log('📧 开始测试SMTP配置...\n');
// console.log('所有环境变�?');
// console.log('SMTP_HOST:', process.env.SMTP_HOST);
// console.log('SMTP_PORT:', process.env.SMTP_PORT);
// console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
// console.log('SMTP_USER:', process.env.SMTP_USER);
// console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***已设�?**' : '未设�?);
// console.log('OAUTH_CLIENT_ID:', process.env.OAUTH_CLIENT_ID ? '***已设�?**' : '未设�?);
// console.log('OAUTH_CLIENT_SECRET:', process.env.OAUTH_CLIENT_SECRET ? '***已设�?**' : '未设�?);
// console.log('OAUTH_REFRESH_TOKEN:', process.env.OAUTH_REFRESH_TOKEN ? '***已设�?**' : '未设�?);
// console.log('');

// 检查是否使用OAuth2
const useOAuth2 = process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET && process.env.OAUTH_REFRESH_TOKEN;

const mailConfig = {
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
};

if (useOAuth2) {
  mailConfig.auth = {
    type: 'OAuth2',
    user: process.env.SMTP_USER || '',
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    accessToken: process.env.OAUTH_ACCESS_TOKEN || undefined
  };
} else {
  mailConfig.auth = {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  };
}

// console.log('配置信息:');
// console.log('  Host:', mailConfig.host);
// console.log('  Port:', mailConfig.port);
// console.log('  User:', mailConfig.auth.user);
// console.log('  认证方式:', useOAuth2 ? 'OAuth2' : '基本认证');
// console.log('');

async function testSMTP() {
  try {
//     console.log('🔍 正在验证SMTP连接...');
    const transporter = nodemailer.createTransport(mailConfig);
    
    // 验证SMTP连接
    await transporter.verify();
//     console.log('�?SMTP连接验证成功�?);
//     console.log('');
    
    // 发送测试邮�?    console.log('📧 正在发送测试邮�?..');
    const info = await transporter.sendMail({
      from: mailConfig.auth.user,
      to: mailConfig.auth.user, // 发送给自己
      subject: 'SMTP配置测试 - Jabil Smart Office',
      text: '如果您收到此邮件，说明SMTP配置成功！\n\n发送时�? ' + new Date().toLocaleString()
    });
    
//     console.log('�?测试邮件发送成功！');
//     console.log('  Message ID:', info.messageId);
//     console.log('');
//     console.log('🎉 SMTP配置完全正常�?);
    
  } catch (error) {
    console.error('�?SMTP配置测试失败�?);
    console.error('');
    console.error('错误详情:');
    console.error('  错误名称:', error.name);
    console.error('  错误消息:', error.message);
    console.error('');
    
    if (error.response) {
      console.error('  服务器响�?', error.response);
    }
    
    console.error('');
    console.error('💡 解决方案建议:');
    console.error('  1. 检查用户名和密码是否正�?);
    console.error('  2. Office 365用户可能需要使�?应用密码"');
    console.error('  3. 检查账户是否启用了多因素认�?MFA)');
    console.error('  4. 联系IT部门获取Jabil内部SMTP服务器配�?);
    console.error('  5. 尝试使用Jabil内部SMTP服务器（如smtp.jabil.com�?);
  }
}

testSMTP();
