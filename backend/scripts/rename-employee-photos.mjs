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
    const result = await pool.query(`
      SELECT real_name, employee_id, old_employee_id
      FROM jso_system_user_management
      WHERE old_employee_id IS NOT NULL AND old_employee_id != ''
      ORDER BY real_name
    `);

    const nameToOldId = {};
    for (const row of result.rows) {
      nameToOldId[row.real_name] = row.old_employee_id;
    }

    console.log('姓名 -> old_employee_id 映射:');
    for (const [name, oldId] of Object.entries(nameToOldId)) {
      console.log(`  ${name} -> ${oldId}`);
    }

    const files = fs.readdirSync(backupDir).filter(f =>
      f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
    );

    console.log(`\n找到 ${files.length} 个文件需要处理\n`);

    let renamed = 0;
    let skipped = 0;

    for (const file of files) {
      const nameMatch = file.match(/^[A-Z0-9]*(.+)(\.jpg|\.jpeg|\.png)$/i);

      if (!nameMatch) {
        console.log(`  [跳过] 无法解析: ${file}`);
        skipped++;
        continue;
      }

      const fullName = nameMatch[1].trim();
      const ext = nameMatch[2].toLowerCase();
      const oldId = nameToOldId[fullName];

      if (!oldId) {
        let found = false;
        for (const [name, id] of Object.entries(nameToOldId)) {
          if (fullName.includes(name) || name.includes(fullName.replace(/\s+/g, ''))) {
            const newName = `${id}${ext}`;
            const src = path.join(backupDir, file);
            const dst = path.join(backupDir, newName);

            if (src !== dst) {
              fs.renameSync(src, dst);
              console.log(`  [重命名] ${file} -> ${newName}`);
              renamed++;
              found = true;
            }
            break;
          }
        }
        if (!found) {
          console.log(`  [跳过] 未找到对应员工: ${file}`);
          skipped++;
        }
      } else {
        const newName = `${oldId}${ext}`;
        const src = path.join(backupDir, file);
        const dst = path.join(backupDir, newName);

        if (src !== dst) {
          if (fs.existsSync(dst)) {
            console.log(`  [覆盖] ${file} -> ${newName}`);
            fs.copyFileSync(src, dst);
          } else {
            fs.renameSync(src, dst);
            console.log(`  [重命名] ${file} -> ${newName}`);
          }
          renamed++;
        } else {
          console.log(`  [跳过] 已是正确名称: ${file}`);
          skipped++;
        }
      }
    }

    console.log(`\n处理完成: 重命名 ${renamed} 个, 跳过 ${skipped} 个`);

    console.log('\nbackup 目录最终文件:');
    const finalFiles = fs.readdirSync(backupDir).filter(f =>
      f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
    ).sort();
    for (const f of finalFiles) {
      console.log(`  ${f}`);
    }

  } catch (err) {
    console.error('处理失败:', err);
  } finally {
    await pool.end();
  }
}

main();
