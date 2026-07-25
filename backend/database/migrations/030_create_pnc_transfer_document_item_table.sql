-- PNC转仓单据明细表
-- 创建时间: 2024-07-23
-- 描述: PNC转仓单据的明细项

CREATE TABLE IF NOT EXISTS jso_pnc_transfer_document_item (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    sequence_no INTEGER NOT NULL,
    batch VARCHAR(100),
    part_number VARCHAR(100) NOT NULL,
    grn VARCHAR(100),
    quantity DECIMAL(15, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_pnc_transfer_document'
    ) THEN
        ALTER TABLE jso_pnc_transfer_document_item
        ADD CONSTRAINT fk_pnc_transfer_document
        FOREIGN KEY (document_id) REFERENCES jso_pnc_transfer_document(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 添加唯一约束：同一单据内序号不能重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_pnc_transfer_item_doc_seq ON jso_pnc_transfer_document_item(document_id, sequence_no);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_pnc_transfer_document_item_doc ON jso_pnc_transfer_document_item(document_id);

-- 添加注释
COMMENT ON TABLE jso_pnc_transfer_document_item IS 'PNC转仓单据明细表';
COMMENT ON COLUMN jso_pnc_transfer_document_item.batch IS 'Batch批号';
COMMENT ON COLUMN jso_pnc_transfer_document_item.part_number IS 'P/N 物料编号';
COMMENT ON COLUMN jso_pnc_transfer_document_item.grn IS 'GRN 物料追踪号';
COMMENT ON COLUMN jso_pnc_transfer_document_item.quantity IS '数量';
