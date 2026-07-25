-- 添加Batch字段到PNC转仓单据明细表
-- 创建时间: 2026-07-23
-- 描述: 在明细表中增加Batch批号字段

-- 添加batch列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jso_pnc_transfer_document_item'
        AND column_name = 'batch'
    ) THEN
        ALTER TABLE jso_pnc_transfer_document_item
        ADD COLUMN batch VARCHAR(100);

        COMMENT ON COLUMN jso_pnc_transfer_document_item.batch IS 'Batch批号';
    END IF;
END $$;
