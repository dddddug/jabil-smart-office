-- 添加转仓部门字段到PNC转仓单据表
-- 创建时间: 2026-07-23
-- 描述: 在单据表中增加department_id和department_name字段

-- 添加department_id列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jso_pnc_transfer_document'
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE jso_pnc_transfer_document
        ADD COLUMN department_id INTEGER;

        COMMENT ON COLUMN jso_pnc_transfer_document.department_id IS '转仓部门ID';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jso_pnc_transfer_document'
        AND column_name = 'department_name'
    ) THEN
        ALTER TABLE jso_pnc_transfer_document
        ADD COLUMN department_name VARCHAR(200);

        COMMENT ON COLUMN jso_pnc_transfer_document.department_name IS '转仓部门名称';
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_department ON jso_pnc_transfer_document(department_id);
