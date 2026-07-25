ALTER TABLE jso_hr_formal_leave
ADD COLUMN IF NOT EXISTS transfer_plant_id INTEGER REFERENCES jso_org_plant_management(id),
ADD COLUMN IF NOT EXISTS transfer_department_id INTEGER REFERENCES jso_org_department_management(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_transfer_plant_id ON jso_hr_formal_leave(transfer_plant_id);
CREATE INDEX IF NOT EXISTS idx_jso_hr_formal_leave_transfer_department_id ON jso_hr_formal_leave(transfer_department_id);
