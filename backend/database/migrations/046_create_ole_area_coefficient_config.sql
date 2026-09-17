-- 部门OLE追踪 - Area效率系数配置表
-- 创建时间: 2026-09-09
-- 描述: 配置不同Area的效率计算系数

CREATE TABLE IF NOT EXISTS jso_ole_area_coefficient_config (
    id SERIAL PRIMARY KEY,
    area_name VARCHAR(100) NOT NULL UNIQUE,
    iws_coefficient DECIMAL(10, 4) NOT NULL DEFAULT 15,
    plr_coefficient DECIMAL(10, 4) NOT NULL DEFAULT 22,
    flr_coefficient DECIMAL(10, 4) NOT NULL DEFAULT 11.53,
    description VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_area_coefficient_status ON jso_ole_area_coefficient_config(status);

INSERT INTO jso_ole_area_coefficient_config (area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status) VALUES
('C 区', 15, 23, 11.53, 'C区效率系数', 'active'),
('C 区 & 借料', 15, 35, 11.53, 'C区借料效率系数', 'active'),
('EMERSON', 15, 23, 11.53, 'EMERSON效率系数', 'active'),
('HMP', 35, 22, 11.53, 'HMP效率系数', 'active'),
('HMP&HP', 35, 22, 11.53, 'HMP&HP效率系数', 'active'),
('HMP&TO BAY', 35, 40, 11.53, 'HMP&TO BAY效率系数', 'active'),
('HMP & 借料', 35, 35, 11.53, 'HMP借料效率系数', 'active'),
('HMP & 收料', 35, 22, 11.53, 'HMP收料效率系数', 'active'),
('HMP / 借料', 35, 35, 11.53, 'HMP借料效率系数', 'active'),
('HP', 15, 22, 11.53, 'HP效率系数', 'active'),
('TO BAY', 15, 40, 11.53, 'TO BAY效率系数', 'active'),
('VALEO', 15, 23, 11.53, 'VALEO效率系数', 'active'),
('借料', 15, 35, 11.53, '借料效率系数', 'active'),
('回仓', 15, 22, 11.53, '回仓效率系数', 'active'),
('回仓 & EMERSON', 15, 23, 11.53, '回仓EMERSON效率系数', 'active'),
('收料', 15, 22, 11.53, '收料效率系数', 'active')
ON CONFLICT (area_name) DO NOTHING;
