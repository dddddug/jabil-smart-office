# SMTP 邮件配置指南

## 📧 邮件功能说明

系统现在支持通过SMTP发送邮件。你可以选择以下几种方式：

1. **模拟模式（默认）** - 不真实发送邮件，只在控制台打印
2. **真实SMTP发送** - 配置SMTP信息后真实发送邮件

---

## 🔧 配置步骤

### 方式1: 使用环境变量（推荐）✅

#### 1.1 创建 .env 文件

在 `backend` 目录下创建 `.env` 文件（已自动创建）

#### 1.2 配置SMTP信息

编辑 `backend/.env` 文件，填入你的SMTP配置：

```env
# Office 365 / Outlook 配置（Jabil推荐）
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.name@jabil.com
SMTP_PASS=your_email_password

# 或者使用Jabil内部SMTP（请联系IT获取准确配置）
# SMTP_HOST=smtp.jabil.com
# SMTP_PORT=25
# SMTP_SECURE=false
# SMTP_USER=your.name@jabil.com
# SMTP_PASS=your_email_password
```

#### 1.3 重启后端服务器

```powershell
# 在 backend 目录下
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm start
```

---

## 📋 常用SMTP配置

### Office 365 / Outlook (Jabil常用)
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.name@jabil.com
SMTP_PASS=your_password
```

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password  # 需要应用专用密码，不是邮箱密码！
```

### Gmail配置注意事项：
1. 需要开启两步验证
2. 创建应用专用密码：https://myaccount.google.com/apppasswords
3. 使用应用专用密码代替邮箱密码

---

## 🔍 验证配置

启动后端服务器后，你会看到类似这样的输出：

✅ **配置成功**：
```
📧 SMTP配置: 已配置 (smtp.office365.com:587)
📧 发件人: your.name@jabil.com
```

❌ **未配置**：
```
📧 SMTP配置: 未配置（模拟模式）
   提示: 在 .env 文件中配置SMTP信息以启用真实邮件发送
```

---

## 📝 获取Jabil SMTP配置

如果不确定正确的SMTP配置，请：

1. **联系IT部门** - 询问Jabil内部的SMTP服务器信息
2. **检查Outlook设置** - 在Outlook中查看服务器配置
3. **尝试Office 365配置** - 大多数Jabil邮箱使用Office 365

---

## 🛡️ 安全注意事项

1. **不要提交 .env 文件到Git** - `.gitignore` 已包含此文件
2. **使用应用专用密码** - 不要使用主密码，特别是Gmail
3. **不要在代码中硬编码密码** - 始终使用环境变量

---

## 🧪 测试邮件发送

配置完成后：

1. 启动前端和后端
2. 访问 http://localhost:5173/
3. 进入"破7休1和周工时上限、公差补卡申请"页面
4. 填写原因说明
5. 点击"发送邮件"按钮
6. 检查后端控制台和收件箱

---

## ❓ 故障排查

### 问题1: 连接超时
- 检查网络连接
- 确认防火墙没有阻止SMTP端口
- 尝试不同的端口（587, 465, 25）

### 问题2: 认证失败
- 确认用户名和密码正确
- 对于Gmail，使用应用专用密码
- 确认账户没有被锁定

### 问题3: 邮件被拒收
- 检查发件人是否有权限
- 确认邮件内容没有被识别为垃圾邮件
- 尝试使用公司认可的发件人地址
