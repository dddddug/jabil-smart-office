import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
