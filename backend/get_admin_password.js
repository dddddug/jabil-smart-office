import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || '10.114.100.171',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'stockroom_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '74454321',
});

async function getAdminPassword() {
    const client = await pool.connect();
    try {
        console.log('Attempting to retrieve admin user password...');
        const result = await client.query(
            `SELECT password FROM jso_system_user_management WHERE username = 'admin'`
        );

        if (result.rows.length > 0) {
            console.log('Admin password from DB:', result.rows[0].password);
        } else {
            console.log('Admin user not found.');
        }
    } catch (error) {
        console.error('Error retrieving admin password:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

getAdminPassword();