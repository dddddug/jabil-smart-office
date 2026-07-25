#!/bin/bash
# ============================================
# Jabil Smart Office - 部署脚本
# 支持 Docker Compose 部署方式
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    log_info "Docker 环境检查通过"
}

# 拉取最新代码（如果使用 git）
pull_code() {
    if command -v git &> /dev/null && [ -d ".git" ]; then
        log_info "正在拉取最新代码..."
        git pull origin main
    fi
}

# 构建并启动服务
deploy() {
    log_info "开始部署 Jabil Smart Office v1.0.0..."

    # 构建 Docker 镜像
    log_info "构建 Docker 镜像..."
    docker-compose build --no-cache

    # 启动服务
    log_info "启动服务..."
    docker-compose up -d

    # 等待服务健康
    log_info "等待服务启动..."
    sleep 10

    # 检查服务状态
    check_status
}

# 仅更新（不重新构建）
update() {
    log_info "快速更新服务..."
    docker-compose pull
    docker-compose up -d
    check_status
}

# 停止服务
stop() {
    log_info "停止服务..."
    docker-compose down
}

# 查看日志
logs() {
    docker-compose logs -f "$@"
}

# 检查服务状态
check_status() {
    log_info "检查服务状态..."

    # 检查容器状态
    docker-compose ps

    # 检查健康状态
    if curl -sf http://localhost/api/users/health > /dev/null 2>&1; then
        log_info "后端服务运行正常"
    else
        log_warn "后端服务可能未就绪，请检查日志"
    fi

    if curl -sf http://localhost/ > /dev/null 2>&1; then
        log_info "前端服务运行正常"
    else
        log_warn "前端服务可能未就绪，请检查日志"
    fi
}

# 数据库迁移
migrate() {
    log_info "执行数据库迁移..."
    docker-compose exec backend node run-migration.js
}

# 查看服务状态
status() {
    docker-compose ps
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost"
    echo "  后端 API: http://localhost/api"
    echo "  健康检查: http://localhost/api/users/health"
}

# 备份数据库
backup() {
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

    log_info "备份数据库到: $BACKUP_FILE"
    docker-compose exec -T postgres pg_dump -U jabiluser jabil_smart_office > "$BACKUP_FILE"
    log_info "备份完成"
}

# 恢复数据库
restore() {
    if [ -z "$1" ]; then
        log_error "请提供备份文件路径"
        echo "用法: $0 restore <backup_file>"
        exit 1
    fi

    BACKUP_FILE="$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "备份文件不存在: $BACKUP_FILE"
        exit 1
    fi

    log_warn "即将恢复数据库，这将覆盖现有数据！"
    read -p "确认继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "取消恢复"
        exit 0
    fi

    log_info "恢复数据库..."
    docker-compose exec -T postgres psql -U jabiluser -d jabil_smart_office < "$BACKUP_FILE"
    log_info "恢复完成"
}

# 清理
clean() {
    log_warn "这将删除所有容器、数据卷和构建缓存！"
    read -p "确认继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log_info "取消清理"
        exit 0
    fi

    docker-compose down -v --rmi local
    docker system prune -f
    log_info "清理完成"
}

# 显示帮助
show_help() {
    echo "Jabil Smart Office 部署脚本"
    echo ""
    echo "用法: $0 <命令>"
    echo ""
    echo "可用命令:"
    echo "  deploy    - 部署服务（构建并启动）"
    echo "  update    - 快速更新服务"
    echo "  stop      - 停止服务"
    echo "  restart   - 重启服务"
    echo "  logs      - 查看日志（可用 -f 跟踪）"
    echo "  status    - 查看服务状态"
    echo "  migrate   - 执行数据库迁移"
    echo "  backup    - 备份数据库"
    echo "  restore   - 恢复数据库"
    echo "  clean     - 清理容器和数据卷"
    echo "  help      - 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 deploy      # 首次部署"
    echo "  $0 update      # 更新到最新版本"
    echo "  $0 logs -f     # 跟踪日志"
    echo "  $0 backup      # 备份数据库"
}

# 主程序
case "${1:-help}" in
    deploy)
        check_docker
        deploy
        ;;
    update)
        check_docker
        update
        ;;
    stop)
        docker-compose stop
        ;;
    restart)
        docker-compose restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    migrate)
        migrate
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
