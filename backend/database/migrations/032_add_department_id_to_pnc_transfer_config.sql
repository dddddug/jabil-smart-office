-- 添加转仓部门字段到PNC转仓配置表
-- 创建时间: 2026-07-23
-- 描述: 在配置表中增加department_id字段，用于关联部门

-- 添加department_id列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jso_pnc_transfer_config'
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE jso_pnc_transfer_config
        ADD COLUMN department_id INTEGER;

        COMMENT ON COLUMN jso_pnc_transfer_config.department_id IS '转仓部门ID';

        -- 添加外键约束（如果不存在）
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_pnc_transfer_config_department'
        ) THEN
            ALTER TABLE jso_pnc_transfer_config
            ADD CONSTRAINT fk_pnc_transfer_config_department
            FOREIGN KEY (department_id) REFERENCES jso_org_department_management(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_config_department ON jso_pnc_transfer_config(department_id);
