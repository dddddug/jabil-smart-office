-- 添加系统公告相关表

-- 系统公告表
CREATE TABLE IF NOT EXISTS jso_system_announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'normal', -- normal, important, urgent
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    publish_date TIMESTAMP,
    plant_id INTEGER, -- 厂区ID，null表示全部厂区
    target_departments INTEGER[], -- 目标部门ID数组，null表示全部部门
    created_by INTEGER NOT NULL, -- 创建者用户ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统公告已读记录表
CREATE TABLE IF NOT EXISTS jso_announcement_read_records (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER NOT NULL REFERENCES jso_system_announcements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id)
);

-- 添加评论：plant_id 如果为 null，说明是超级管理员发布的全局公告，所有人都可见
-- target_departments 如果为 null，说明目标是全部部门
