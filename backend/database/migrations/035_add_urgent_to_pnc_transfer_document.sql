-- 添加加急字段到PNC转仓单据表
ALTER TABLE jso_pnc_transfer_document
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN jso_pnc_transfer_document.is_urgent IS '是否加急';
