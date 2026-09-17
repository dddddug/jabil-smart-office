import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg.default || pg;

const photosDir = 'C:/Users/1167023/Desktop/Jabil/nginx/html/photos';
const backupDir = path.join(photosDir, 'backup');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  timezone: 'Asia/Shanghai',
});

async function main() {
  try {
    // 获取所有员工的工号映射
    const result = await pool.query(`
      SELECT real_name, employee_id, old_employee_id
      FROM jso_system_user_management
      WHERE employee_id IS NOT NULL
      ORDER BY real_name
    `);

    console.log('员工工号映射:');
    console.log('姓名 | employee_id | old_employee_id');
    console.log('-----------------------------------');

    const employeeMap = {};
    for (const row of result.rows) {
      employeeMap[row.real_name] = {
        employeeId: row.employee_id,
        oldEmployeeId: row.old_employee_id
      };
      console.log(`${row.real_name} | ${row.employee_id} | ${row.old_employee_id || '无'}`);
    }

    // 获取 photos 目录下的文件
    const files = fs.readdirSync(photosDir).filter(f =>
      f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
    );

    console.log('\n\n当前 photos 目录文件:');
    for (const f of files) {
      console.log(f);
    }

  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await pool.end();
  }
}

main();
