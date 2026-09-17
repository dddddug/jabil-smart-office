import dotenv from 'dotenv';
import sharp from 'sharp';
import pg from 'pg';
import path from 'path';

dotenv.config();

const { Pool } = pg.default || pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  timezone: 'Asia/Shanghai',
});

const inputDir = 'C:/Users/1167023/report';
const outputDir = 'C:/Users/1167023/Desktop/Jabil/nginx/html/photos';

async function process() {
  // 获取所有员工，用 old_employee_id 命名
  const result = await pool.query(`SELECT real_name, employee_id, old_employee_id FROM jso_system_user_management WHERE employee_id IS NOT NULL`);
  const empMap = {};
  for (const r of result.rows) empMap[r.real_name] = r;
  
  const files = ['刘林林.png', '周健.png', '成晓睿.png', '易卫平.png', '邓大龙.png', '黄凤燕.png'];
  
  for (const file of files) {
    const name = file.replace('.png', '');
    const emp = empMap[name];
    if (!emp) { console.log('未找到:', name); continue; }
    
    // 使用 old_employee_id 命名（如果没有则用 employee_id）
    const code = emp.old_employee_id || emp.employee_id;
    const outputPath = path.join(outputDir, `${code}.jpg`);
    
    console.log(`处理 ${name}: ${code}`);
    await sharp(path.join(inputDir, file))
      .resize(360, 360, { fit: 'cover', position: 'top' })
      .sharpen({ sigma: 1.0 })
      .modulate({ brightness: 1.03 })
      .jpeg({ quality: 95 })
      .toFile(outputPath);
    console.log(`✅ 保存为 ${code}.jpg`);
  }
  await pool.end();
}
process();
