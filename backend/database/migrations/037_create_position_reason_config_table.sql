-- 岗位原因配置表迁移
-- 创建时间: 2026-07-31
-- 描述: 智能排班模块的岗位原因配置，存储岗位与原因说明的映射关系

-- 创建岗位原因配置表
CREATE TABLE IF NOT EXISTS jso_position_reason_config (
    id SERIAL PRIMARY KEY,
    position VARCHAR(100) NOT NULL UNIQUE,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_position_reason_position ON jso_position_reason_config(position);
