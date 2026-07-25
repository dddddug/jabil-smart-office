-- 创建索引
CREATE INDEX IF NOT EXISTS idx_jso_hr_special_working_hours_employee_name ON jso_hr_special_working_hours(employee_name);
CREATE INDEX IF NOT EXISTS idx_jso_hr_special_working_hours_date ON jso_hr_special_working_hours(date);

-- 创建触发器
DROP TRIGGER IF EXISTS update_jso_hr_special_working_hours_updated_at ON jso_hr_special_working_hours;
CREATE TRIGGER update_jso_hr_special_working_hours_updated_at
    BEFORE UPDATE ON jso_hr_special_working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
