import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// The DB environment variables are loaded from .env and should not be printed in production.
// console.log('Backend DB_PASSWORD:', process.env.DB_PASSWORD); // Do not log sensitive info

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // 时区配置：统一使用 Asia/Shanghai
  timezone: 'Asia/Shanghai',
  // 连接池优化配置
  max: parseInt(process.env.DB_POOL_MAX) || 20,                    // 最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,  // 空闲超时 30秒
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // 连接超时 5秒
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err); // your app will not crash if you don't handle this
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('New database connection established');
});

export default pool;
