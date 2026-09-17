-- 部门OLE追踪 - 岗位等级目标效率配置表
-- 创建时间: 2026-09-09
-- 描述: 配置不同岗位等级的目标效率

CREATE TABLE IF NOT EXISTS jso_ole_level_efficiency_config (
    id SERIAL PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL UNIQUE,
    target_efficiency DECIMAL(5, 4),
    description VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_level_efficiency_status ON jso_ole_level_efficiency_config(status);

INSERT INTO jso_ole_level_efficiency_config (level_name, target_efficiency, description, status) VALUES
('3 Level', 0.75, '3级岗位目标效率', 'active'),
('4 Level', 0.80, '4级岗位目标效率', 'active'),
('5 Level', 0.85, '5级岗位目标效率', 'active'),
('6 Level', 0.90, '6级岗位目标效率', 'active'),
('其他', NULL, '其他等级无目标效率', 'active')
ON CONFLICT (level_name) DO NOTHING;
