-- 仓储差异登记 主数据表迁移
-- 创建时间: 2026-09-07
-- 描述: 仓储差异登记模块的主数据表，用于存储差异登记记录

-- 创建仓储差异登记主数据表
CREATE TABLE IF NOT EXISTS jso_warehouse_diff_registration (
    id SERIAL PRIMARY KEY,
    registration_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Shanghai')::date COMMENT '登记日期',
    part_no VARCHAR(100) NOT NULL COMMENT 'P/N 物料编号',
    qty DECIMAL(15, 2) DEFAULT 0 COMMENT '数量',
    diff_type VARCHAR(100) COMMENT '差异类型',
    diff_description TEXT COMMENT '差异描述',
    material_id VARCHAR(100) COMMENT '物料追踪ID/GRN',
    diff_pic VARCHAR(100) COMMENT '差异PIC（负责人）',
    recorder VARCHAR(100) NOT NULL COMMENT '登记人',
    handling_result VARCHAR(200) COMMENT '处理结果',
    remarks TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_date ON jso_warehouse_diff_registration(registration_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_part_no ON jso_warehouse_diff_registration(part_no);
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_type ON jso_warehouse_diff_registration(diff_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_pic ON jso_warehouse_diff_registration(diff_pic);
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_recorder ON jso_warehouse_diff_registration(recorder);
CREATE INDEX IF NOT EXISTS idx_warehouse_diff_created ON jso_warehouse_diff_registration(created_at);

-- 添加注释
COMMENT ON TABLE jso_warehouse_diff_registration IS '仓储差异登记主数据表';
COMMENT ON COLUMN jso_warehouse_diff_registration.registration_date IS '登记日期';
COMMENT ON COLUMN jso_warehouse_diff_registration.part_no IS 'P/N 物料编号';
COMMENT ON COLUMN jso_warehouse_diff_registration.qty IS '差异数量';
COMMENT ON COLUMN jso_warehouse_diff_registration.diff_type IS '差异类型';
COMMENT ON COLUMN jso_warehouse_diff_registration.diff_description IS '差异描述';
COMMENT ON COLUMN jso_warehouse_diff_registration.material_id IS '物料追踪ID/GRN';
COMMENT ON COLUMN jso_warehouse_diff_registration.diff_pic IS '差异PIC（负责人）';
COMMENT ON COLUMN jso_warehouse_diff_registration.recorder IS '登记人';
COMMENT ON COLUMN jso_warehouse_diff_registration.handling_result IS '处理结果';
COMMENT ON COLUMN jso_warehouse_diff_registration.remarks IS '备注';
