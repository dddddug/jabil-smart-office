# Jabil Smart Office 部署文档

## 📋 目录

- [项目概述](#项目概述)
- [环境要求](#环境要求)
- [项目结构](#项目结构)
- [快速启动](#快速启动)
- [服务管理](#服务管理)
- [前后端独立启动](#前后端独立启动)
- [Nginx 配置](#nginx-配置)
- [数据库配置](#数据库配置)
- [常见问题](#常见问题)
- [局域网访问](#局域网访问)
- [技术栈](#技术栈)

---

## 项目概述

Jabil Smart Office（捷普智能办公系统）是一套完整的企业内部办公管理平台，包含以下功能模块：

- ✅ 用户认证与权限管理
- ✅ 考勤打卡与签到管理
- ✅ 请假申请与审批流程
- ✅ 临时加班/请假管理
- ✅ 正式请假管理
- ✅ 排班管理
- ✅ 转岗/离职管理
- ✅ 成本汇总报表
- ✅ Dashboard 仪表盘

---

## 环境要求

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.x | 后端运行环境 |
| npm | >= 9.x | 包管理器 |
| PostgreSQL | >= 14.x | 数据库 |
| Nginx | >= 1.24 | 反向代理服务器 |
| Windows | 10/11 | 操作系统 |

---

## 项目结构

```
Jabil/
├── backend/                    # 后端项目
│   ├── config/                 # 配置文件
│   ├── controllers/           # 控制器
│   ├── database/              # 数据库相关
│   │   └── migrations/         # 数据库迁移脚本
│   ├── middlewares/            # 中间件
│   ├── routes/                 # 路由
│   ├── validators/            # 验证器
│   ├── server.js               # 主入口
│   ├── package.json
│   └── .env                   # 环境变量（敏感）
│
├── frontend/                   # 前端项目
│   └── jabil-smart-office-frontend/
│       ├── src/                # 源代码
│       ├── dist/               # 构建输出
│       └── package.json
│
├── nginx/                      # Nginx 配置
│   └── conf/
│       └── nginx.conf
│
└── DEPLOY.md                   # 本文档
```

---

## 快速启动

### 一键启动所有服务

在项目根目录下执行：

```bash
# 启动 Nginx 反向代理
start nginx

# 启动后端服务
cd backend
npm start
```

或者在项目根目录创建启动脚本 `start-all.bat`：

```batch
@echo off
echo Starting Jabil Smart Office...

echo [1/3] Starting Nginx...
start nginx

echo [2/3] Starting Backend...
cd backend
start cmd /k "npm start"

echo [3/3] Waiting for services...
timeout /t 5

echo.
echo ========================================
echo Services started!
echo Frontend: http://localhost
echo Backend API: http://localhost/api
echo ========================================
pause
```

---

## 服务管理

### 查看服务状态

**检查进程是否运行：**

```bash
tasklist | findstr "nginx node"
```

**输出示例（表示服务正常运行）：**
```
nginx.exe                    50388 Console                    1      5,768 K
node.exe                       860 Console                    1     32,680 K
```

### 启动服务

**启动 Nginx：**
```bash
nginx
# 或指定配置文件
nginx -c /path/to/nginx.conf
```

**启动后端：**
```bash
cd backend
npm start
```

**启动前端开发服务器（可选）：**
```bash
cd frontend/jabil-smart-office-frontend
npm run dev
```

### 重启服务

**重启 Nginx：**
```bash
nginx -s reload
```

**重启后端：**

1. 先停止：
```bash
# 找到 Node 进程
tasklist | findstr node

# 结束进程（PID 是上面查到的）
taskkill /PID <PID> /F
```

2. 再启动：
```bash
cd backend
npm start
```

**一键重启脚本 `restart-backend.bat`：**
```batch
@echo off
echo Restarting Backend...

echo [1/2] Stopping backend...
for /f "tokens=5" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr "PID"') do (
    taskkill /PID %%a /F 2>nul
)

echo [2/2] Starting backend...
cd backend
start cmd /k "npm start"

echo Backend restarted!
```

### 停止服务

**停止 Nginx：**
```bash
nginx -s stop
# 或强制关闭
taskkill /IM nginx.exe /F
```

**停止后端：**
```bash
taskkill /IM node.exe /F
```

---

## 前后端独立启动

### 后端独立运行

```bash
cd backend

# 安装依赖（首次运行）
npm install

# 启动服务
npm start

# 后端运行在 http://localhost:3002
```

### 前端独立运行（开发模式）

```bash
cd frontend/jabil-smart-office-frontend

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev

# 前端运行在 http://localhost:5173
# API 会代理到 http://localhost:3002
```

### 前端生产构建

```bash
cd frontend/jabil-smart-office-frontend

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

---

## Nginx 配置

Nginx 作为反向代理，配置文件位于 `nginx/conf/nginx.conf`。

### 默认配置说明

```nginx
server {
    listen       80;                    # 监听端口
    server_name  localhost;

    # 前端静态文件目录（根据实际路径修改）
    root   C:/Users/1167023/Desktop/Jabil/frontend/jabil-smart-office-frontend/dist;
    index  index.html;

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        # ... 其他代理设置
    }

    # Vue Router SPA 支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 修改配置后生效

```bash
nginx -s reload
```

### 常见配置问题

**1. 修改前端路径**
```nginx
root   D:/path/to/your/frontend/dist;
```

**2. 修改后端端口**
```nginx
proxy_pass http://127.0.0.1:3002/api/;
# 把 3002 改为你实际的端口
```

---

## 数据库配置

### 配置文件

后端数据库配置在 `backend/.env`：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jabil_smart_office
DB_USER=your_username
DB_PASSWORD=your_password
DB_MAX=20
DB_IDLE_TIMEOUTMillis=30000
DB_CONNECTION_TIMEOUT_MILLIS=2000

PORT=3002
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### 数据库初始化

首次运行需要执行数据库迁移：

```bash
cd backend/database/migrations

# 使用 psql 或 pgAdmin 执行以下文件（按顺序）：
001_add_password_security_fields.sql
002_add_old_employee_id_field.sql
003_add_temp_matter_to_schedule.sql
004_update_temp_tables_to_support_datetime.sql
005_add_time_fields_to_temporary_leave.sql
006_create_attendance_tables.sql
007_create_special_working_hours_table.sql
008_add_indexes_and_triggers_to_special_working_hours.sql
009_add_transfer_department_to_formal_leave.sql
010_add_transfer_date_to_formal_leave.sql
011_create_dept_calc_rules_table.sql
012_add_start_end_time_to_dept_calc_rules.sql
012_create_shift_duration_rules_table.sql
013_add_description_to_shift_duration_rules.sql
014_create_resignation_transfer_table.sql
014_delete_plant_id_0_data.sql
015_create_cost_summary_tables.sql
016_create_employee_hourly_rates_table.sql
017_add_missing_unique_constraints.sql
018_add_unique_constraint_to_cost_summary.sql
019_create_jwt_blacklist_table.sql
020_add_last_login_at_to_user_management.sql
021_add_performance_indexes.sql
```

### 创建数据库

```sql
CREATE DATABASE jabil_smart_office;
```

---

## 常见问题

### 1. 访问显示 502 Bad Gateway

**原因：** Nginx 无法连接到后端

**解决：**
```bash
# 检查后端是否运行
tasklist | findstr node

# 如果没有运行，启动后端
cd backend
npm start
```

### 2. 访问显示 503 Service Unavailable

**原因：** 后端数据库连接失败

**解决：**
1. 检查 PostgreSQL 是否运行
2. 检查 `backend/.env` 数据库配置是否正确
3. 检查数据库是否存在

### 3. 前端静态资源 404

**原因：** 路径配置错误

**解决：**
修改 `nginx/conf/nginx.conf` 中的 root 路径，指向正确的前端 dist 目录：
```nginx
root   C:/完整路径/to/frontend/jabil-smart-office-frontend/dist;
```

然后重新加载：
```bash
nginx -s reload
```

### 4. 端口被占用

**检查端口占用：**
```bash
netstat -ano | findstr "80 3002"
```

**结束占用进程：**
```bash
taskkill /PID <PID> /F
```

### 5. Node 版本不兼容

**检查 Node 版本：**
```bash
node -v
```

**需要 Node.js >= 18.x，可从 https://nodejs.org/ 下载安装**

### 6. 数据库连接失败

**排查步骤：**
1. 确认 PostgreSQL 服务运行：`services.msc` 查看
2. 测试连接：`psql -h localhost -U username -d database_name`
3. 检查防火墙是否允许 5432 端口

---

## 局域网访问

### 查看本机局域网 IP

```bash
ipconfig
```

查找 "IPv4 地址" 或 "IPv4 Address"：

```
以太网适配器 Wi-Fi:
   IPv4 地址 . . . . . . . . . . . . : 192.168.1.100
```

### 访问地址

| 环境 | 访问地址 |
|------|----------|
| 本机 | http://localhost |
| 本机 | http://127.0.0.1 |
| 局域网 | http://192.168.1.100 |

### 前提条件

- 防火墙允许 80 端口入站
- 其他电脑在同一网络（同一 WiFi/局域网）

### 防火墙设置（如需要）

```bash
# 允许 80 端口（Windows 防火墙）
netsh advfirewall firewall add rule name="Jabil Office HTTP" dir=in action=allow protocol=tcp localport=80
```

---

## 技术栈

### 前端
- **框架：** Vue 3
- **语言：** TypeScript
- **构建工具：** Vite
- **UI 组件库：** Element Plus
- **路由：** Vue Router
- **状态管理：** Pinia
- **HTTP 客户端：** Axios

### 后端
- **运行时：** Node.js
- **框架：** Express
- **数据库：** PostgreSQL
- **认证：** JWT
- **密码加密：** bcrypt

### 基础设施
- **反向代理：** Nginx
- **版本控制：** Git

---

## 联系方式

如有技术问题，请联系开发团队。

---

*文档版本：v1.0.0*
*最后更新：2026-07-25*
