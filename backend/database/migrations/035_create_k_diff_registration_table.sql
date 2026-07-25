-- K差异登记 主数据表迁移
-- 创建时间: 2024-07-24
-- 描述: K差异登记模块的主数据表，用于存储差异登记记录

-- 创建K差异登记主数据表
CREATE TABLE IF NOT EXISTS jso_k2_diff_registration (
    id SERIAL PRIMARY KEY,
    registration_date DATE NOT NULL COMMENT '登记日期',
    shift VARCHAR(10) NOT NULL COMMENT '班次: A-白班(7:00-19:00), C-夜班(19:00-次日7:00)',
    part_no VARCHAR(100) NOT NULL COMMENT 'Part no 物料编号',
    grn VARCHAR(100) COMMENT 'GRN 批次号',
    qty DECIMAL(10, 2) DEFAULT 0 COMMENT '数量',
    location VARCHAR(200) COMMENT '位置/工位',
    problem_description TEXT COMMENT '问题描述',
    registration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '登记时间',
    return_location VARCHAR(200) COMMENT '退料地点',
    recorder VARCHAR(100) NOT NULL COMMENT '记录人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_date ON jso_k2_diff_registration(registration_date);
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_shift ON jso_k2_diff_registration(shift);
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_part_no ON jso_k2_diff_registration(part_no);
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_grn ON jso_k2_diff_registration(grn);
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_recorder ON jso_k2_diff_registration(recorder);
CREATE INDEX IF NOT EXISTS idx_k_diff_registration_created ON jso_k2_diff_registration(created_at);

-- 添加注释
COMMENT ON TABLE jso_k2_diff_registration IS 'K差异登记主数据表';
COMMENT ON COLUMN jso_k2_diff_registration.registration_date IS '登记日期';
COMMENT ON COLUMN jso_k2_diff_registration.shift IS '班次: A-白班(7:00-19:00), C-夜班(19:00-次日7:00)';
COMMENT ON COLUMN jso_k2_diff_registration.part_no IS 'Part no 物料编号';
COMMENT ON COLUMN jso_k2_diff_registration.grn IS 'GRN 批次号';
COMMENT ON COLUMN jso_k2_diff_registration.qty IS '差异数量';
COMMENT ON COLUMN jso_k2_diff_registration.location IS '位置/工位';
COMMENT ON COLUMN jso_k2_diff_registration.problem_description IS '问题描述';
COMMENT ON COLUMN jso_k2_diff_registration.registration_time IS '登记时间';
COMMENT ON COLUMN jso_k2_diff_registration.return_location IS '退料地点';
COMMENT ON COLUMN jso_k2_diff_registration.recorder IS '记录人';
