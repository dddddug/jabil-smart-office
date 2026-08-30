-- 创建物料有效期数据表
CREATE TABLE IF NOT EXISTS jso_material_shelf_life (
    id SERIAL PRIMARY KEY COMMENT '主键ID',
    plant VARCHAR(10) NOT NULL COMMENT '工厂代码',
    material_group VARCHAR(50) NOT NULL COMMENT '物料组',
    material VARCHAR(100) NOT NULL COMMENT '物料编码',
    material_description VARCHAR(500) COMMENT '物料描述',
    shelf_life INTEGER DEFAULT 0 COMMENT '保质期(天)',
    remaining_shelf_life INTEGER DEFAULT 0 COMMENT '剩余保质期(天)',
    storage_indicator VARCHAR(10) DEFAULT '0' COMMENT '存储指示',
    period_indicator VARCHAR(10) COMMENT '周期指示',
    report_date DATE NOT NULL COMMENT '报表日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE(plant, material, report_date)
) COMMENT '物料有效期数据表';

CREATE INDEX IF NOT EXISTS idx_shelf_life_material ON jso_material_shelf_life(material) COMMENT '物料编码索引';
CREATE INDEX IF NOT EXISTS idx_shelf_life_report_date ON jso_material_shelf_life(report_date) COMMENT '报表日期索引';

-- 创建拉取日志表
CREATE TABLE IF NOT EXISTS jso_material_shelf_life_pull_log (
    id SERIAL PRIMARY KEY COMMENT '主键ID',
    source_file VARCHAR(255) NOT NULL COMMENT '源文件名',
    records_count INTEGER DEFAULT 0 COMMENT '导入记录数量',
    status VARCHAR(20) NOT NULL COMMENT '状态: success-成功, failed-失败',
    error_message TEXT COMMENT '错误信息',
    file_size BIGINT COMMENT '文件大小(字节)',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间'
) COMMENT '物料有效期数据拉取日志表';

CREATE INDEX IF NOT EXISTS idx_pull_log_completed_at ON jso_material_shelf_life_pull_log(completed_at) COMMENT '完成时间索引';
