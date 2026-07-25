# Jabil Smart Office - 智能办公系统

> Jabil 智能办公系统 v1.0.0 - 企业级办公自动化解决方案

## 📋 项目简介

Jabil Smart Office 是一款面向企业的智能办公系统，提供员工管理、排班调度、请假审批、成本汇总等核心功能。

### 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 前端 | Vue 3 + TypeScript + Vite | 3.x |
| 后端 | Node.js + Express | 22.x |
| 数据库 | PostgreSQL | 16.x |
| UI 框架 | Element Plus | 2.x |

### 核心功能

- ✅ 用户认证与权限管理 (RBAC)
- ✅ 员工信息管理
- ✅ 排班调度管理
- ✅ 请假申请与审批
- ✅ 加班申请管理
- ✅ 成本汇总与分析
- ✅ 部门配置管理
- ✅ 薪资规则配置
- ✅ 仪表盘数据展示
- ✅ 数据导入导出

---

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd jabil-smart-office

# 2. 配置环境变量
cp deploy/env/production.env.example .env
# 编辑 .env 文件填入实际配置

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps
```

访问地址：
- 前端: http://localhost
- 后端 API: http://localhost/api
- 健康检查: http://localhost/api/users/health

### 默认账户

- 用户名: `admin`
- 密码: `123456` （首次登录后请修改）

---

## 📁 项目结构

```
jabil-smart-office/
├── backend/                      # 后端服务
│   ├── config/                   # 配置文件
│   ├── controllers/              # 控制器
│   ├── database/                 # 数据库迁移脚本
│   ├── middlewares/              # 中间件
│   ├── routes/                   # 路由
│   ├── services/                 # 业务逻辑
│   ├── utils/                    # 工具函数
│   ├── validators/               # 验证器
│   └── server.js                 # 入口文件
│
├── frontend/
│   └── jabil-smart-office-frontend/  # 前端应用
│       ├── src/
│       │   ├── api/              # API 调用
│       │   ├── components/       # 组件
│       │   ├── composables/      # 组合式函数
│       │   ├── router/           # 路由配置
│       │   ├── services/         # 业务服务
│       │   ├── types/            # TypeScript 类型
│       │   ├── utils/            # 工具函数
│       │   └── views/            # 页面视图
│       └── dist/                 # 构建产物
│
├── deploy/                       # 部署配置
│   ├── env/                      # 环境变量模板
│   ├── nginx/                    # Nginx 配置
│   ├── deploy.sh                 # 部署脚本
│   └── DEPLOYMENT_CHECKLIST.md   # 部署检查清单
│
├── .github/
│   └── workflows/                # CI/CD 流水线
│       └── ci-cd.yml
│
├── Dockerfile.backend            # 后端 Docker 镜像
├── Dockerfile.frontend           # 前端 Docker 镜像
├── docker-compose.yml            # Docker Compose 配置
├── RELEASE_v1.0.0.md             # 发布说明
└── README.md                     # 项目文档
```

---

## 🔧 开发指南

### 前端开发

```bash
cd frontend/jabil-smart-office-frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 构建生产版本
npm run build
```

### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 开发模式
npm run dev

# 启动服务
npm start
```

### 数据库迁移

```bash
cd backend

# 运行所有迁移
node run-migration.js
```

---

## 🐳 Docker 部署

### 环境要求

- Docker 24.0+
- Docker Compose 2.20+
- 2GB+ 可用内存

### 配置说明

创建 `.env` 文件：

```env
# 数据库配置
POSTGRES_USER=jabiluser
POSTGRES_PASSWORD=your_secure_password
DB_HOST=postgres
DB_PORT=5432
DB_NAME=jabil_smart_office

# JWT 密钥（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key

# CORS 配置
CORS_ORIGIN=http://localhost

# SMTP 配置（可选）
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
```

### 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 备份数据库
./deploy/deploy.sh backup

# 恢复数据库
./deploy/deploy.sh restore backup.sql
```

---

## 🔒 安全配置

### 生产环境必做

1. **修改 JWT 密钥**
   ```env
   JWT_SECRET=<生成一个随机的32位以上字符串>
   ```

2. **设置强数据库密码**
   ```env
   POSTGRES_PASSWORD=<至少16位强密码>
   ```

3. **配置 HTTPS**
   编辑 `deploy/nginx/production.conf` 启用 SSL

4. **配置防火墙**
   ```bash
   firewall-cmd --permanent --add-service=http
   firewall-cmd --permanent --add-service=https
   firewall-cmd --reload
   ```

---

## 📊 API 文档

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/users/login | 用户登录 |
| POST | /api/users/logout | 用户登出 |
| GET | /api/users/me | 获取当前用户 |

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 获取用户列表 |
| POST | /api/users | 创建用户 |
| PUT | /api/users/:id | 更新用户 |
| DELETE | /api/users/:id | 删除用户 |

### 排班管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/schedule | 获取排班列表 |
| POST | /api/schedule | 创建排班 |
| PUT | /api/schedule/:id | 更新排班 |
| DELETE | /api/schedule/:id | 删除排班 |

---

## 🐛 故障排查

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres
```

### 后端启动失败

```bash
# 查看后端日志
docker-compose logs backend

# 检查端口
netstat -tlnp | grep 3002
```

---

## 📝 许可证

ISC

---

## 📞 技术支持

如有问题，请查看：
1. `docker-compose logs` 查看详细日志
2. 确认环境变量配置正确
3. 确认端口未被占用
