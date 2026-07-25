import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || '10.114.100.171',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'stockroom_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '74454321',
});

const runMigration = async (migrationFileName) => {
    const client = await pool.connect();
    try {
        console.log(`执行数据库脚本: ${migrationFileName}...`);
        const sqlPath = path.resolve(__dirname, `../database/migrations/${migrationFileName}`);
        const sql = await fs.readFile(sqlPath, 'utf8');

        const statements = sql
            .split(/;\s*$/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await client.query(statement);
        }

        console.log(`✅ ${migrationFileName} 执行成功。`);
    } catch (error) {
        console.error(`❌ 数据库脚本执行失败 (${migrationFileName}):`, error);
    } finally {
        client.release();
        await pool.end();
    }
};

// Get migration file name from command line arguments
const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Usage: node run-migration.js <script_file_name>');
    process.exit(1);
}

runMigration(migrationFile);