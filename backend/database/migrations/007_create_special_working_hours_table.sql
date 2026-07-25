CREATE TABLE IF NOT EXISTS jso_hr_special_working_hours (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    event VARCHAR(255) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    old_employee_id VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    registered_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
