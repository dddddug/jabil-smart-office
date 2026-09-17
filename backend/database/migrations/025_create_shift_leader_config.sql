-- 创建班次Leader配置表
CREATE TABLE IF NOT EXISTS jso_config_shift_leader (
    id SERIAL PRIMARY KEY,
    shift_name VARCHAR(50) NOT NULL, -- 'A+', 'C+', etc.
    shift_display_name VARCHAR(50) NOT NULL, -- 'A班', 'C班' for display
    leader_name VARCHAR(100) NOT NULL, -- Leader姓名
    leader_code VARCHAR(50), -- Leader工号/Code for photo
    leader_photo_url VARCHAR(255), -- Leader照片URL
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shift_name)
);

-- 添加注释
COMMENT ON TABLE jso_config_shift_leader IS '班次Leader配置表';
COMMENT ON COLUMN jso_config_shift_leader.shift_name IS '班次名称（如A+、C+）';
COMMENT ON COLUMN jso_config_shift_leader.shift_display_name IS '显示名称（如A班、C班）';
COMMENT ON COLUMN jso_config_shift_leader.leader_name IS 'Leader姓名';
COMMENT ON COLUMN jso_config_shift_leader.leader_code IS 'Leader工号，用于照片查找';
COMMENT ON COLUMN jso_config_shift_leader.leader_photo_url IS 'Leader照片URL';

-- 插入默认数据
INSERT INTO jso_config_shift_leader (shift_name, shift_display_name, leader_name, leader_code, status) VALUES
('A+', 'A班', 'A班Leader', NULL, 'active'),
('C+', 'C班', 'C班Leader', NULL, 'active')
ON CONFLICT (shift_name) DO NOTHING;

-- 添加触发器
DROP TRIGGER IF EXISTS update_shift_leader_updated_at ON jso_config_shift_leader;
CREATE TRIGGER update_shift_leader_updated_at
BEFORE UPDATE ON jso_config_shift_leader
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
