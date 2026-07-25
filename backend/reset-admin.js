import pool from './config/db.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const result = await pool.query(
      'UPDATE jso_system_user_management SET password = $1 WHERE username = $2 RETURNING id, username',
      [hashedPassword, 'admin']
    );
    console.log('Password reset result:', result.rows);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    await pool.end();
    process.exit(1);
  }
}

resetAdminPassword();
