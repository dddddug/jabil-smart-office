# Jabil Smart Office 部署文档

## 当前部署方式

本项目采用 **Nginx + Node.js** 方式部署：

- **前端**：Nginx 提供静态文件服务
- **后端**：Node.js 直接运行

---

## 环境要求

- Node.js >= 22.18.0
- npm >= 10.x
- PostgreSQL 数据库
- Nginx
- Windows 系统

---

## 目录结构

```
Jabil/
├── backend/                    # 后端服务（Node.js）
│   ├── server.js              # 入口文件
│   ├── controllers/           # 控制器
│   ├── models/                 # 数据模型
│   ├── routes/                 # 路由
│   └── package.json
├── frontend/                   # 前端项目
│   └── jabil-smart-office-frontend/
│       ├── src/               # 源代码
│       ├── dist/              # 构建产物（部署用）
│       └── package.json
├── nginx/                      # Nginx（本地开发用）
│   ├── nginx.exe
│   └── conf/nginx.conf
└── deploy/                     # 部署文档
    └── README.md
```

---

## 部署步骤

### 1. 构建前端

```bash
cd frontend/jabil-smart-office-frontend
npm install
npm run build
```

构建产物在 `frontend/jabil-smart-office-frontend/dist/` 目录。

### 2. 部署前端（Nginx）

把 `dist/` 目录复制到服务器的 Nginx 配置目录，然后重启 Nginx：

```bash
# 停止 Nginx
taskkill /F /IM nginx.exe

# 启动 Nginx（根据实际路径）
cd nginx
nginx.exe
```

### 3. 部署后端

```bash
cd backend
npm install
node server.js
```

后台运行方式：

```bash
cd backend
nohup node server.js > logs/app.log 2>&1 &
```

PM2 方式（可选）：

```bash
cd backend
npm install -g pm2
pm2 start server.js --name jabil-backend
pm2 save
```

---

## 配置说明

### 后端环境变量

在 `backend/.env` 中配置：

```env
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jabil_smart_office
DB_USER=jabiluser
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
ADMIN_PASSWORD=admin_password
```

### Nginx 配置

```nginx
server {
    listen       80;
    server_name  localhost 10.114.32.157;

    # 前端静态文件目录（部署时修改为实际路径）
    root   /path/to/Jabil/frontend/jabil-smart-office-frontend/dist;
    index  index.html;

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Vue Router SPA 支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 版本更新流程

1. 修改 `frontend/jabil-smart-office-frontend/package.json` 中的 `version` 字段
2. 重新构建前端：`npm run build`
3. 复制 `dist/` 到服务器
4. 重启 Nginx
5. 重启后端（如需要）

---

## 常用命令

```bash
# 构建前端
cd frontend/jabil-smart-office-frontend && npm run build

# 重启 Nginx
taskkill /F /IM nginx.exe && cd nginx && nginx.exe

# 重启后端
taskkill /F /IM node.exe && cd backend && node server.js

# 或后台运行后端
cd backend && nohup node server.js > logs/app.log 2>&1 &
```

---

## 常见问题

### 1. 端口被占用
```bash
netstat -ano | findstr :3002   # 查后端端口
netstat -ano | findstr :80     # 查 Nginx 端口

# 结束进程
taskkill /PID <进程ID> /F
```

### 2. 前端修改后不生效
- 清除浏览器缓存（Ctrl+Shift+R）
- 或重启 Nginx

### 3. 数据库连接失败
- 检查 `.env` 中的数据库配置
- 确认 PostgreSQL 服务已启动

---

## 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| 后端 API | http://localhost/api |
