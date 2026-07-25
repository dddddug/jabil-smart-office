ALTER TABLE jso_hr_formal_leave
ADD COLUMN IF NOT EXISTS transfer_date DATE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_transfer_date ON jso_hr_formal_leave(transfer_date);
