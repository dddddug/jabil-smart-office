const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3002;

// 先清除可能已存在的环境变�?delete process.env.OAUTH_CLIENT_ID;
delete process.env.OAUTH_CLIENT_SECRET;
delete process.env.OAUTH_REFRESH_TOKEN;

// 手动加载.env文件
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// OAuth2 配置
let CLIENT_ID = process.env.OAUTH_CLIENT_ID || '';
let CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  'https://outlook.office365.com/SMTP.Send',
  'offline_access'
];
const TENANT_ID = 'common';

// 步骤1: 生成授权URL
function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    response_mode: 'query'
  });
  
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

// 步骤2: 用授权码获取令牌
function getToken(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }).toString();
    
    const options = {
      hostname: 'login.microsoftonline.com',
      port: 443,
      path: `/${TENANT_ID}/oauth2/v2.0/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(jsonData.error_description || jsonData.error || '获取令牌失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败: ' + data));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// 更新 .env 文件
function updateEnvFile(key, value) {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
  
  fs.writeFileSync(envPath, envContent.trim());
}

app.use(express.json());

app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Office 365 OAuth2 配置工具</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #0078d4; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
        textarea { height: 100px; font-family: monospace; }
        button { background: #0078d4; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; margin: 5px; }
        button:hover { background: #005a9e; }
        button.secondary { background: #6c757d; }
        button.secondary:hover { background: #5a6268; }
        .status { padding: 15px; margin: 15px 0; border-radius: 4px; }
        .success { background: #dff6dd; border: 1px solid #28a745; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #dc3545; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #17a2b8; color: #0c5460; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        .step { margin-bottom: 30px; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Office 365 OAuth2 配置工具</h1>
        
        <div class="info status">
            <strong>使用说明�?/strong><br>
            <strong>方式一：使�?Azure AD（推荐）</strong><br>
            1. �?Azure Portal (https://portal.azure.com) 注册应用<br>
            2. 应用名称: Jabil Smart Office Mailer<br>
            3. 重定�?URI: http://localhost:${PORT}/callback<br>
            4. 获取 Client ID �?Client Secret<br>
            5. 配置 API 权限: SMTP.Send<br>
            <br>
            <strong>方式二：直接提供授权�?/strong><br>
            如果你已经有授权码，可以直接粘贴在下�?        </div>
        
        <div id="configSection">
            <div class="step">
                <h2>步骤1: 配置 OAuth2 凭证</h2>
                <div class="form-group">
                    <label>Client ID</label>
                    <input type="text" id="clientId" placeholder="输入你的 Client ID" value="${CLIENT_ID}">
                </div>
                <div class="form-group">
                    <label>Client Secret</label>
                    <input type="text" id="clientSecret" placeholder="输入你的 Client Secret" value="${CLIENT_SECRET}">
                </div>
                <button onclick="saveConfig()">保存配置</button>
            </div>
            
            <div class="step" id="authStep">
                <h2>步骤2: 开始授�?/h2>
                <button onclick="startAuth()">🚀 开始授�?/button>
            </div>
        </div>
        
        <div class="step hidden" id="codeSection">
            <h2>步骤2: 输入授权�?/h2>
            <div class="info status">
                如果你已经从其他地方获取了授权码，请直接粘贴到下�?            </div>
            <div class="form-group">
                <label>授权�?/label>
                <textarea id="authCode" placeholder="粘贴你的授权�?></textarea>
            </div>
            <button onclick="exchangeCode()">兑换令牌</button>
            <button class="secondary" onclick="showAuthStep()">返回</button>
        </div>
        
        <div id="status"></div>
    </div>

    <script>
        function showStatus(message, type) {
            const div = document.getElementById('status');
            div.innerHTML = '<div class="' + type + ' status">' + message + '</div>';
        }
        
        async function saveConfig() {
            const clientId = document.getElementById('clientId').value;
            const clientSecret = document.getElementById('clientSecret').value;
            
            try {
                const response = await fetch('/save-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, clientSecret })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('配置已保存！现在可以开始授权了�?, 'success');
                }
            } catch (e) {
                showStatus('保存失败: ' + e.message, 'error');
            }
        }
        
        function startAuth() {
            window.location.href = '/auth';
        }
        
        async function exchangeCode() {
            const code = document.getElementById('authCode').value;
            if (!code) {
                showStatus('请输入授权码', 'error');
                return;
            }
            
            try {
                const response = await fetch('/exchange-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('🎉 授权成功！凭证已保存�?.env 文件�?br><br><strong>刷新令牌:</strong><br><pre>' + data.refreshToken + '</pre><br><br><button onclick="window.close()">关闭此页�?/button>', 'success');
                } else {
                    showStatus('失败: ' + data.error, 'error');
                }
            } catch (e) {
                showStatus('兑换失败: ' + e.message, 'error');
            }
        }
        
        function showAuthStep() {
            document.getElementById('configSection').classList.remove('hidden');
            document.getElementById('codeSection').classList.add('hidden');
        }
        
        // 检查URL参数
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');
        const code = params.get('code');
        
        if (error) {
            showStatus('授权失败: ' + error, 'error');
        } else if (code) {
            // 自动填充授权�?            document.getElementById('configSection').classList.add('hidden');
            document.getElementById('codeSection').classList.remove('hidden');
            document.getElementById('authCode').value = code;
            showStatus('已获取授权码，点�?兑换令牌"继续', 'info');
        } else if (token) {
            try {
                const tokenData = JSON.parse(decodeURIComponent(token));
                showStatus('🎉 授权成功！凭证已保存�?.env 文件�?br><br><strong>刷新令牌:</strong><br><pre>' + tokenData.refresh_token + '</pre><br><br>现在可以重启后端服务器使用了�?, 'success');
            } catch(e) {
                showStatus('授权成功�?, 'success');
            }
        }
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

app.post('/save-config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  
  CLIENT_ID = clientId;
  CLIENT_SECRET = clientSecret;
  
  updateEnvFile('OAUTH_CLIENT_ID', clientId);
  updateEnvFile('OAUTH_CLIENT_SECRET', clientSecret);
  
  res.json({ success: true });
});

app.get('/auth', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
          <h1>⚠️ 请先配置凭证</h1>
          <p>请先返回首页配置 Client ID �?Client Secret</p>
          <a href="/">返回首页</a>
        </body>
      </html>
    `);
    return;
  }
  res.redirect(getAuthUrl());
});

app.post('/exchange-code', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.json({ success: false, error: '缺少授权�? });
  }
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.json({ success: false, error: '请先配置 Client ID �?Client Secret' });
  }
  
  try {
    const tokenData = await getToken(code);
    
    updateEnvFile('OAUTH_REFRESH_TOKEN', tokenData.refresh_token);
    if (tokenData.access_token) {
      updateEnvFile('OAUTH_ACCESS_TOKEN', tokenData.access_token);
    }
    
    res.json({ 
      success: true, 
      refreshToken: tokenData.refresh_token,
      tokenData: tokenData
    });
  } catch (error) {
    console.error('获取令牌失败:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;
  
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.send('<html><body><h1>授权失败！缺少授权码</h1></body></html>');
  }
  
  try {
    const tokenData = await getToken(code);
    
    updateEnvFile('OAUTH_REFRESH_TOKEN', tokenData.refresh_token);
    if (tokenData.access_token) {
      updateEnvFile('OAUTH_ACCESS_TOKEN', tokenData.access_token);
    }
    
    res.redirect(`/?token=${encodeURIComponent(JSON.stringify(tokenData))}`);
  } catch (error) {
    console.error('获取令牌失败:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

app.listen(PORT, () => {
//   console.log('========================================');
//   console.log('🔐 OAuth2 配置工具已启�?);
//   console.log('');
//   console.log('📖 使用说明:');
//   console.log('');
//   console.log('1. 在浏览器中打开:');
//   console.log(`   http://localhost:${PORT}`);
//   console.log('');
//   console.log('2. 按照页面提示配置 OAuth2 凭证');
//   console.log('');
//   console.log('3. 如果还没�?Azure AD 应用注册:');
//   console.log('   a. 访问 https://portal.azure.com');
//   console.log('   b. 搜索 "Azure Active Directory"');
//   console.log('   c. 点击 "应用注册" -> "新注�?');
//   console.log('   d. 应用名称: Jabil Smart Office Mailer');
//   console.log(`   e. 重定�?URI: http://localhost:${PORT}/callback`);
//   console.log('   f. 注册后获�?Client ID');
//   console.log('   g. �?"证书和密�? 中创�?Client Secret');
//   console.log('   h. �?"API 权限" 中添�?SMTP.Send 权限');
//   console.log('');
//   console.log('========================================');
//   console.log('');
  
  // 尝试打开浏览�?  const url = `http://localhost:${PORT}`;
//   console.log(`正在打开浏览�?..`);
  
  const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
  exec(start + ' ' + url, (err) => {
    if (err) {
//       console.log(`请手动打开浏览器访�? ${url}`);
    }
  });
});
