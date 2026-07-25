import pool from './config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname, 'database/migrations');

async function runMigrations() {
  const files = [
    '028_create_pnc_transfer_config_table.sql',
    '029_create_pnc_transfer_document_table.sql',
    '030_create_pnc_transfer_document_item_table.sql',
    '031_add_batch_to_pnc_transfer_document_item.sql'
  ];

  for (const file of files) {
    const filePath = path.join(migrationsPath, file);
    console.log(`\n=== Running migration: ${file} ===`);
    try {
      const sql = fs.readFileSync(filePath, 'utf8');

      // 移除注释行（但保留行内注释）
      const lines = sql.split('\n');
      const cleanLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('--');
      });

      // 合并所有语句
      const cleanSql = cleanLines.join('\n');

      // 按分号分割，但小心处理
      const statements = [];
      let buffer = '';
      let depth = 0;
      let inString = false;
      let stringChar = '';

      for (let i = 0; i < cleanSql.length; i++) {
        const char = cleanSql[i];
        const nextChar = cleanSql[i + 1];

        // 处理字符串
        if ((char === "'" || char === '"') && !inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && inString) {
          // 检查是否是转义的引号
          if (cleanSql[i - 1] !== '\\') {
            inString = false;
            stringChar = '';
          }
        }

        // 处理 DO $$ ... $$ 块
        if (char === '$' && nextChar === '$' && !inString) {
          if (depth === 0) {
            depth = 1;
          } else {
            depth = 0;
          }
        }

        if (char === ';' && depth === 0 && !inString) {
          if (buffer.trim()) {
            statements.push(buffer.trim());
          }
          buffer = '';
        } else {
          buffer += char;
        }
      }

      // 添加最后一条语句
      if (buffer.trim()) {
        statements.push(buffer.trim());
      }

      console.log(`Found ${statements.length} statements to execute`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        try {
          await pool.query(stmt);
          console.log(`  ✓ Statement ${i + 1}: OK`);
        } catch (err) {
          console.error(`  ✗ Statement ${i + 1} error: ${err.message}`);
          // 继续执行其他语句
        }
      }

      console.log(`✓ ${file} completed`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error.message);
    }
  }

  // 验证表是否创建
  console.log('\n=== Verifying tables ===');
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%pnc%'
    `);
    console.log('PNC tables created:', result.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Verification query failed:', err.message);
  }

  await pool.end();
  console.log('\nMigration complete!');
}

runMigrations();
