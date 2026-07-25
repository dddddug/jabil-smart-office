const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const open = require('open');

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
const CLIENT_ID = process.env.OAUTH_CLIENT_ID || '需要配�?;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '需要配�?;
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
async function getToken(code) {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code'
  });
  
  const response = await axios.post(tokenUrl, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return response.data;
}

// HTML 模板
const indexHtml = `
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
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        button { background: #0078d4; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #005a9e; }
        .status { padding: 15px; margin: 15px 0; border-radius: 4px; }
        .success { background: #dff6dd; border: 1px solid #28a745; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #dc3545; color: #721c24; }
        .info { background: #d1ecf1; border: 1px solid #17a2b8; color: #0c5460; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .step { margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Office 365 OAuth2 配置工具</h1>
        
        <div class="info status">
            <strong>使用说明�?/strong><br>
            1. �?Azure Portal 注册应用<br>
            2. 获取 Client ID �?Client Secret<br>
            3. 填入下方表单<br>
            4. 点击"开始授�?<br>
            5. 完成后会自动保存�?.env 文件
        </div>
        
        <div class="step">
            <h2>步骤1: 配置 OAuth2 凭证</h2>
            <div class="form-group">
                <label>Client ID</label>
                <input type="text" id="clientId" placeholder="输入你的 Client ID">
            </div>
            <div class="form-group">
                <label>Client Secret</label>
                <input type="text" id="clientSecret" placeholder="输入你的 Client Secret">
            </div>
            <button onclick="saveConfig()">保存配置</button>
        </div>
        
        <div class="step">
            <h2>步骤2: 开始授�?/h2>
            <button onclick="startAuth()">🚀 开始授�?/button>
        </div>
        
        <div id="status"></div>
    </div>

    <script>
        let config = {
            clientId: '',
            clientSecret: ''
        };
        
        function saveConfig() {
            config.clientId = document.getElementById('clientId').value;
            config.clientSecret = document.getElementById('clientSecret').value;
            
            fetch('/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            .then(r => r.json())
            .then(data => {
                showStatus('配置已保存！现在可以开始授权了�?, 'success');
            });
        }
        
        function startAuth() {
            window.location.href = '/auth';
        }
        
        function showStatus(message, type) {
            const div = document.getElementById('status');
            div.innerHTML = '<div class="' + type + ' status">' + message + '</div>';
        }
        
        // 检查URL参数
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) {
            try {
                const tokenData = JSON.parse(decodeURIComponent(token));
                showStatus('🎉 授权成功！凭证已保存�?.env 文件�?br><br><strong>刷新令牌:</strong><br><pre>' + tokenData.refresh_token + '</pre>', 'success');
            } catch(e) {
                showStatus('授权成功�?, 'success');
            }
        }
    </script>
</body>
</html>
`;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(indexHtml);
});

app.post('/save-config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  
  // 更新或添�?OAuth2 配置
  const updateEnv = (key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  };
  
  updateEnv('OAUTH_CLIENT_ID', clientId);
  updateEnv('OAUTH_CLIENT_SECRET', clientSecret);
  
  fs.writeFileSync(envPath, envContent.trim());
  
  res.json({ success: true });
});

app.get('/auth', (req, res) => {
  res.redirect(getAuthUrl());
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.send('<html><body><h1>授权失败�?/h1></body></html>');
  }
  
  try {
    const tokenData = await getToken(code);
    
    // 更新 .env 文件
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    const updateEnv = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    };
    
    updateEnv('OAUTH_REFRESH_TOKEN', tokenData.refresh_token);
    if (tokenData.access_token) {
      updateEnv('OAUTH_ACCESS_TOKEN', tokenData.access_token);
    }
    
    fs.writeFileSync(envPath, envContent.trim());
    
    res.redirect(`/?token=${encodeURIComponent(JSON.stringify(tokenData))}`);
  } catch (error) {
    console.error('获取令牌失败:', error.response?.data || error.message);
    res.send(`<html><body><h1>获取令牌失败�?/h1><pre>${error.message}</pre></body></html>`);
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
//   console.log('   b. 注册新应�?);
//   console.log(`   c. 设置重定�?URI �? http://localhost:${PORT}/callback`);
//   console.log('   d. 配置权限: SMTP.Send');
//   console.log('');
//   console.log('========================================');
//   console.log('');
  
  // 自动打开浏览�?  open(`http://localhost:${PORT}`).catch(() => {
//     console.log(`请手动打开浏览器访�? http://localhost:${PORT}`);
  });
});
