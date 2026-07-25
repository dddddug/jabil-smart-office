# Jabil Smart Office - 1.0.0 发布说明

## 📋 版本信息
- **版本号**: v1.0.0
- **发布日期**: 2026-07-25
- **构建号**: 1.0.0

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd jabil-smart-office

# 2. 配置环境变量
cp deploy/env/production.env.example .env
# 编辑 .env 文件，填入实际配置

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps
```

访问地址：
- 前端: http://localhost
- 后端 API: http://localhost/api
- 健康检查: http://localhost/api/users/health

---

## 🐳 Docker 部署详细步骤

### 前置要求
- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ 可用内存

### 步骤 1: 准备环境

```bash
# 创建项目目录
mkdir -p /opt/jabil-smart-office
cd /opt/jabil-smart-office

# 克隆代码
git clone <repository-url> .

# 复制环境配置
cp deploy/env/production.env.example .env
```

### 步骤 2: 配置环境变量

编辑 `.env` 文件：

```env
# 数据库配置
POSTGRES_USER=jabiluser
POSTGRES_PASSWORD=your_secure_password_here
DB_HOST=postgres
DB_PORT=5432
DB_NAME=jabil_smart_office

# JWT 密钥（生产环境必须修改）
JWT_SECRET=generate-a-secure-random-string-here

# CORS 配置
CORS_ORIGIN=https://your-domain.com

# SMTP 配置（可选）
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
```

### 步骤 3: 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 步骤 4: 验证部署

```bash
# 检查后端健康
curl http://localhost/api/users/health

# 检查前端
curl http://localhost/

# 检查数据库连接
docker-compose exec backend node -e "require('./config/db.js').default.query('SELECT 1').then(() => console.log('DB OK')).catch(console.error)"
```

---

## 🌐 传统部署（非 Docker）

### 前置要求
- Node.js 22+
- PostgreSQL 16+
- Nginx 1.20+
- Linux 服务器

### 后端部署

```bash
# 1. 安装依赖
cd backend
npm install --production

# 2. 配置环境
cp .env.example .env
# 编辑 .env 配置数据库等信息

# 3. 初始化数据库
node run-migration.js

# 4. 启动服务
npm start

# 5. 使用 PM2 管理进程（生产环境推荐）
npm install -g pm2
pm2 start server.js --name jabil-backend
pm2 save
pm2 startup
```

### 前端部署

```bash
# 1. 安装依赖
cd frontend/jabil-smart-office-frontend
npm install

# 2. 构建生产版本
# 构建前修改 API 地址（在 vite.config.ts 中配置）
npm run build

# 3. 上传 dist 目录到服务器
scp -r dist/* user@server:/usr/share/nginx/html/

# 4. 配置 Nginx
scp deploy/nginx/production.conf user@server:/etc/nginx/conf.d/jabil.conf
nginx -t && systemctl reload nginx
```

### Nginx 配置

将 `deploy/nginx/production.conf` 复制到服务器，修改 `server_name` 为实际域名。

---

## 🔒 安全配置

### 生产环境必做

1. **修改 JWT 密钥**
   ```env
   JWT_SECRET=<生成一个随机的32位以上字符串>
   ```

2. **配置 HTTPS**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       # ... 其他配置
   }
   ```

3. **设置强数据库密码**
   ```env
   POSTGRES_PASSWORD=<至少16位强密码>
   ```

4. **配置防火墙**
   ```bash
   # 开放必要端口
   firewall-cmd --permanent --add-service=http
   firewall-cmd --permanent --add-service=https
   firewall-cmd --reload
   ```

---

## 📊 系统架构

```
                    ┌─────────────┐
                    │   Nginx     │  :80
                    │  (反向代理)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   前端      │ │   后端 API   │ │   数据库     │
    │  (Vue SPA)  │ │  (Express)  │ │ (PostgreSQL)│
    │   :3000     │ │   :3002     │ │   :5432     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🔧 常用运维命令

### Docker 环境

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [service]

# 进入容器
docker-compose exec backend sh
docker-compose exec postgres psql -U jabiluser -d jabil_smart_office

# 备份数据库
docker-compose exec -T postgres pg_dump -U jabiluser jabil_smart_office > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T postgres psql -U jabiluser -d jabil_smart_office

# 更新服务
docker-compose pull && docker-compose up -d
```

### 传统部署环境

```bash
# 后端日志
pm2 logs jabil-backend

# 重启后端
pm2 restart jabil-backend

# Nginx 日志
tail -f /var/log/nginx/jabil_access.log
tail -f /var/log/nginx/jabil_error.log

# 重载 Nginx
nginx -t && systemctl reload nginx
```

---

## 🐛 故障排查

### 数据库连接失败
```bash
# 检查数据库是否运行
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 测试数据库连接
docker-compose exec backend node -e "const pool = require('./config/db.js').default; pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e))"
```

### 后端启动失败
```bash
# 查看后端日志
docker-compose logs backend

# 常见问题：
# 1. 端口被占用: lsof -i:3002
# 2. 数据库连接失败: 检查 .env 中的 DB_HOST 等配置
# 3. 缺少依赖: docker-compose exec backend npm install
```

### 前端无法访问
```bash
# 检查 Nginx 状态
docker-compose logs frontend

# 检查容器是否运行
docker-compose ps frontend

# 检查端口
netstat -tlnp | grep 80
```

---

## 📞 技术支持

如有问题，请检查：
1. `docker-compose logs` 查看详细日志
2. 确认环境变量配置正确
3. 确认端口未被占用
4. 确认防火墙开放了必要端口

---

## 📝 更新日志

### v1.0.0 (2026-07-25)
- ✅ 首次正式发布
- ✅ 包含员工管理、排班、请假、成本汇总等功能
- ✅ Docker 容器化部署支持
- ✅ CI/CD 自动化流水线
- ✅ 生产环境部署配置
