# Office 365 OAuth2 配置指南

## 概述

Office 365 已禁用基本认证（Basic Authentication），必须使用 OAuth2 认证。本指南将帮助你配置 OAuth2 认证。

## 优点

- ✅ **不依赖密码**：密码每三个月变更一次也不会影响
- ✅ **长期有效**：Refresh Token 长期有效
- ✅ **安全可靠**：使用现代认证方式
- ✅ **一次配置，长期使用**：不需要频繁更新配置

## 配置步骤

### 方式一：使用在线工具（简单快捷）

推荐使用这个在线工具快速获取 OAuth2 凭证：

**https://oauth2.dance/**

步骤：
1. 访问该网站
2. 选择 "Microsoft 365 / Outlook"
3. 登录你的 Jabil 邮箱账户
4. 授权访问
5. 获取以下凭证：
   - Client ID
   - Client Secret
   - Refresh Token

### 方式二：在 Azure Portal 中手动注册应用（推荐）

#### 步骤 1：注册 Azure AD 应用

1. 访问 [Azure Portal](https://portal.azure.com)
2. 使用你的 Jabil 账户登录
3. 进入 **Azure Active Directory**
4. 点击 **应用注册** -> **新注册**
5. 填写信息：
   - 名称：`Jabil Smart Office Mailer`
   - 支持的账户类型：`仅限此组织目录中的账户`
   - 重定向 URI：`https://oauth2.dance/`
6. 点击 **注册**
7. 复制 **应用程序(客户端) ID**，这就是 `OAUTH_CLIENT_ID`

#### 步骤 2：创建客户端密钥

1. 在应用注册页面，点击 **证书和密码**
2. 点击 **新客户端密码**
3. 添加描述和过期时间
4. 点击 **添加**
5. **立即复制值**，这就是 `OAUTH_CLIENT_SECRET`（只显示一次！）

#### 步骤 3：配置 API 权限

1. 点击 **API 权限** -> **添加权限**
2. 选择 **Microsoft Graph** -> **委托的权限**
3. 搜索并添加以下权限：
   - `SMTP.Send`
   - `Mail.Send`（可选）
4. 点击 **添加权限**
5. 点击 **授予管理员同意...**（需要管理员权限）

#### 步骤 4：获取 Refresh Token

有多种方式获取 Refresh Token：

**方式 A：使用 Python 脚本**

```python
import requests

# 使用 Microsoft OAuth2 端点
token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
auth_url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"

# 你的应用信息
client_id = "你的客户端ID"
client_secret = "你的客户端密钥"
redirect_uri = "https://oauth2.dance/"
scope = "https://outlook.office365.com/SMTP.Send offline_access"

# 步骤1: 获取授权码（需要在浏览器中完成）
print(f"请访问以下URL进行授权:")
print(f"{auth_url}?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&scope={scope}")
print("\n授权后，输入重定向URL中的code参数:")
code = input("> ")

# 步骤2: 获取访问令牌和刷新令牌
data = {
    "client_id": client_id,
    "client_secret": client_secret,
    "code": code,
    "redirect_uri": redirect_uri,
    "grant_type": "authorization_code"
}

response = requests.post(token_url, data=data)
result = response.json()

print("\n获取到的令牌:")
print(f"Access Token: {result.get('access_token')}")
print(f"Refresh Token: {result.get('refresh_token')}")
print("\n请将Refresh Token保存到.env文件中！")
```

**方式 B：使用在线工具**

访问 https://oauth2.dance/ 并按照提示操作。

## 配置 .env 文件

获取到所有凭证后，更新 `.env` 文件：

```env
# ==================== OAuth2 配置 ====================
OAUTH_CLIENT_ID=你的客户端ID
OAUTH_CLIENT_SECRET=你的客户端密钥
OAUTH_REFRESH_TOKEN=你的刷新令牌
# OAUTH_ACCESS_TOKEN=（可选，会自动刷新）

# ==================== SMTP 配置 ====================
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=DaLong_Deng@Jabil.com
# SMTP_PASS=（OAuth2不需要密码）
```

## 测试配置

配置完成后，运行测试脚本验证：

```bash
cd backend
node test-smtp.js
```

如果配置正确，你会看到：
```
✅ SMTP连接验证成功！
✅ 测试邮件发送成功！
```

## 重启后端服务器

配置完成后，需要重启后端服务器：

1. 停止当前运行的服务器（Ctrl+C）
2. 重新启动：
```bash
cd backend
npm start
```

## Token 自动刷新

- ✅ **Access Token** 会自动在需要时刷新（有效期通常1小时）
- ✅ **Refresh Token** 长期有效（除非撤销）
- ✅ **不需要关注密码变更**：OAuth2 不依赖账户密码

## 常见问题

### Q: Refresh Token 过期了怎么办？
A: 如果 Refresh Token 过期（通常需要重新授权），重新运行获取 Refresh Token 的步骤即可。

### Q: 需要管理员权限吗？
A: 如果是在自己的租户中注册应用，不需要。但需要授予权限时可能需要管理员同意。

### Q: 可以在多个环境使用同一套凭证吗？
A: 可以，但建议为不同环境创建不同的应用注册。

### Q: 如何撤销访问？
A: 在 Azure Portal 中删除应用注册或取消授权即可。

## 技术支持

如果配置过程中遇到问题：
1. 检查 Azure Portal 的日志
2. 查看后端服务器的输出
3. 联系 Jabil IT 部门寻求 Azure AD 相关支持
