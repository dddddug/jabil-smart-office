import pool from '../config/db.js';

const checkAnnouncements = async () => {
  try {
    console.log('\n=== 检查所有公告 ===');
    const allAnnouncementsResult = await pool.query(`SELECT * FROM jso_system_announcements ORDER BY created_at DESC`);
    console.log(`共有 ${allAnnouncementsResult.rows.length} 条公告`);
    console.log('所有公告详情:', JSON.stringify(allAnnouncementsResult.rows, null, 2));
    
    console.log('\n=== 检查已发布的公告 ===');
    const publishedAnnouncementsResult = await pool.query(`SELECT * FROM jso_system_announcements WHERE status = 'published' ORDER BY created_at DESC`);
    console.log(`共有 ${publishedAnnouncementsResult.rows.length} 条已发布公告`);
    console.log('已发布公告详情:', JSON.stringify(publishedAnnouncementsResult.rows, null, 2));

    console.log('\n✅ 公告检查完成');
    return { success: true, message: '公告检查完成' };
  } catch (error) {
    console.error('检查公告数据失败:', error);
    return { success: false, message: '检查公告数据失败', error: error.message };
  }
};

const checkUsers = async () => {
  try {
    console.log('\n=== 检查特定用户数据 ===');
    const userResult = await pool.query('SELECT id, username, real_name, role_name FROM jso_system_user_management WHERE username LIKE $1 OR real_name LIKE $1', ['%LINX5%']);
    console.log('特定用户数据:', JSON.stringify(userResult.rows, null, 2));
    console.log(`共有 ${userResult.rows.length} 条符合条件的用户数据`);

    console.log('\n✅ 用户检查完成');
    return { success: true, message: '用户检查完成' };
  } catch (error) {
    console.error('检查用户数据失败:', error);
    return { success: false, message: '检查用户数据失败', error: error.message };
  }
};

const runAllChecks = async () => {
    await checkAnnouncements();
    await checkUsers();
    process.exit(0);
}

runAllChecks();
