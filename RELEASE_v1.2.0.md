# v1.2.0 版本说明

**发布日期**: 2026-08-30

---

## 新增功能

### 1. 回仓申请 Building 配置管理
- 在"配置管理"页签新增"接收Building配置"功能
- 支持添加、删除、启用/禁用 Building
- 管理回仓申请的接收 Building 下拉选项

### 2. 离线同步功能
- 新增 IndexedDB 本地缓存
- 网络断开时自动缓存 POST/PUT 请求
- 网络恢复后自动同步数据
- 右下角显示离线状态指示器

### 3. 离线登录
- 登录成功时自动保存账号信息到浏览器
- 网络断开时可选择离线账号登录
- 无需数据库连接即可访问系统

---

## 代码优化

### UserManagementView.vue ESLint 修复
- 修复未使用变量警告
- 修复 TypeScript 类型定义问题
- 优化 Excel 解析代码类型安全

---

## 已知问题

- 部分页面（EmployeeScheduleView, ExpiredMaterialExtensionView）存在 TypeScript 类型检查警告，不影响功能

---

## 技术更新

- 前端: Vue 3 + TypeScript + Element Plus
- 后端: Node.js + Express + PostgreSQL
- 新增离线缓存机制: IndexedDB

---

## 感谢

感谢所有测试和使用本系统的同事！
