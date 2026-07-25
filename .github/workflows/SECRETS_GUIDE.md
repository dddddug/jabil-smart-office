# ============================================
# GitHub Actions Secrets 配置指南
# ============================================
# 在 GitHub 仓库的 Settings > Secrets and variables > Actions 中配置以下密钥：
# ============================================

# Docker Hub 认证（如果使用 Docker Hub）
# DOCKER_USERNAME - Docker Hub 用户名
# DOCKER_PASSWORD - Docker Hub 访问令牌

# 生产环境服务器 SSH（用于直接部署）
# PRODUCTION_SSH_HOST - 服务器 IP 或域名
# PRODUCTION_SSH_USER - SSH 用户名
# PRODUCTION_SSH_KEY - SSH 私钥

# 数据库配置（生产环境）
# PRODUCTION_DB_HOST
# PRODUCTION_DB_PORT
# PRODUCTION_DB_NAME
# PRODUCTION_DB_USER
# PRODUCTION_DB_PASSWORD

# JWT 密钥
# JWT_SECRET - 生产环境 JWT 密钥

# SMTP 配置
# SMTP_HOST
# SMTP_PORT
# SMTP_USER
# SMTP_PASS
