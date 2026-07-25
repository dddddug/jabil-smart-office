const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function runMigration() {
  try {
//     console.log('开始执行数据库迁移...');
    
    // 为用户表添加字段
//     console.log('1. 为用户表添加字段...');
    try {
      await pool.query(`ALTER TABLE jso_system_user_management ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE`);
//       console.log('   �?must_change_password 添加成功');
//     } catch (e) { console.log('   �?must_change_password 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_system_user_management ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`);
//       console.log('   �?password_changed_at 添加成功');
//     } catch (e) { console.log('   �?password_changed_at 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_system_user_management ADD COLUMN IF NOT EXISTS security_question VARCHAR(255)`);
//       console.log('   �?security_question 添加成功');
//     } catch (e) { console.log('   �?security_question 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_system_user_management ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255)`);
//       console.log('   �?security_answer 添加成功');
//     } catch (e) { console.log('   �?security_answer 可能已存�?); }
    
    // 更新现有用户
//     console.log('\n2. 更新现有用户...');
    try {
      await pool.query(`UPDATE jso_system_user_management SET must_change_password = FALSE WHERE username IN ('admin')`);
//       console.log('   �?admin 用户设置成功');
//     } catch (e) { console.log('   �?更新失败:', e.message); }
    
    // 为员工花名册表添加字�?    console.log('\n3. 为员工花名册表添加字�?..');
    try {
      await pool.query(`ALTER TABLE jso_hr_employee_roster ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE`);
//       console.log('   �?must_change_password 添加成功');
//     } catch (e) { console.log('   �?must_change_password 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_hr_employee_roster ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP`);
//       console.log('   �?password_changed_at 添加成功');
//     } catch (e) { console.log('   �?password_changed_at 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_hr_employee_roster ADD COLUMN IF NOT EXISTS security_question VARCHAR(255)`);
//       console.log('   �?security_question 添加成功');
//     } catch (e) { console.log('   �?security_question 可能已存�?); }
    
    try {
      await pool.query(`ALTER TABLE jso_hr_employee_roster ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255)`);
//       console.log('   �?security_answer 添加成功');
//     } catch (e) { console.log('   �?security_answer 可能已存�?); }
    
//     console.log('\n�?数据库迁移完成！');
  } catch (error) {
    console.error('�?数据库迁移失�?', error);
  } finally {
    await pool.end();
  }
}

runMigration();
