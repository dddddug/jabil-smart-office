-- 添加加急字段到PNC转仓配置表
ALTER TABLE jso_pnc_transfer_config
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN jso_pnc_transfer_config.is_urgent IS '是否加急';
