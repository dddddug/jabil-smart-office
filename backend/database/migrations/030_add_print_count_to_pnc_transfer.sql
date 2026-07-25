-- 添加打印次数字段到PNC转仓单据表
ALTER TABLE jso_pnc_transfer_document
ADD COLUMN IF NOT EXISTS print_count INTEGER DEFAULT 0;

-- 创建打印记录表，用于详细追踪每次打印
CREATE TABLE IF NOT EXISTS jso_pnc_transfer_print_log (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES jso_pnc_transfer_document(id) ON DELETE CASCADE,
  printed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  printed_by VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_print_log_document_id ON jso_pnc_transfer_print_log(document_id);
CREATE INDEX IF NOT EXISTS idx_print_log_printed_at ON jso_pnc_transfer_print_log(printed_at);
