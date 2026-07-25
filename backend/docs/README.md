# Jabil Smart Office - 后端服务

## 数据库配置

数据库连接信息已在 `server.js` 中配置：
- 主机: 10.114.100.171
- 端口: 5432
- 数据库: stockroom_db
- 用户: postgres
- 密码: 74454321

## 初始化数据库

1. 连接到 PostgreSQL 数据库
2. 执行 `database/init.sql` 脚本创建表和初始数据

## 安装依赖

```bash
cd backend
npm install
```

## 启动后端服务

```bash
npm start
```

服务将在 http://localhost:3001 启动

## API 接口

### 角色管理

- `GET /api/roles` - 获取所有角色
- `POST /api/roles` - 创建新角色
- `PUT /api/roles/:id` - 更新指定角色
- `DELETE /api/roles/:id` - 删除指定角色
- `PUT /api/roles` - 批量同步角色（覆盖更新）
