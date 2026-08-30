import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'stockroom_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('开始执行回仓申请模块数据库迁移...\n');

    // 读取 SQL 文件
    const sqlFile = join(__dirname, 'database', 'migrations', '040_create_warehouse_return_tables.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // 移除注释行
    sql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // 按分号分割，但保留完整的 CREATE TABLE 语句
    // 匹配 CREATE TABLE 和对应的结束分号
    const createTablePattern = /CREATE\s+TABLE[^;]+;/gi;
    const matches = sql.match(createTablePattern);

    if (matches) {
      console.log(`找到 ${matches.length} 个 CREATE TABLE 语句\n`);

      for (let i = 0; i < matches.length; i++) {
        const stmt = matches[i].trim();
        try {
          await client.query(stmt);
          // 提取表名
          const tableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : `表${i + 1}`;
          console.log(`[${i + 1}/${matches.length}] ✓ ${tableName}`);
        } catch (err) {
          if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
            const tableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
            const tableName = tableMatch ? tableMatch[1] : `表${i + 1}`;
            console.log(`[${i + 1}/${matches.length}] ✓ ${tableName} (已存在)`);
          } else {
            console.error(`[${i + 1}] ✗ 错误: ${err.message}`);
          }
        }
      }
    }

    // 处理 INSERT 语句
    const insertPattern = /INSERT\s+INTO[^;]+;/gi;
    const insertMatches = sql.match(insertPattern);

    if (insertMatches) {
      console.log(`\n找到 ${insertMatches.length} 个 INSERT 语句`);
      for (const stmt of insertMatches) {
        try {
          await client.query(stmt);
          console.log('  ✓ 插入默认 Building 数据');
        } catch (err) {
          if (err.message.includes('duplicate key') || err.message.includes('already exists')) {
            console.log('  ✓ Building 数据已存在');
          } else {
            console.error(`  ✗ 错误: ${err.message}`);
          }
        }
      }
    }

    // 处理 CREATE SEQUENCE 语句
    const seqPattern = /CREATE\s+SEQUENCE[^;]+;/gi;
    const seqMatches = sql.match(seqPattern);

    if (seqMatches) {
      for (const stmt of seqMatches) {
        try {
          await client.query(stmt);
          console.log('  ✓ 创建序列');
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log('  ✓ 序列已存在');
          } else {
            console.error(`  ✗ 错误: ${err.message}`);
          }
        }
      }
    }

    // 处理 CREATE INDEX 语句
    const indexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX[^;]+;/gi;
    const indexMatches = sql.match(indexPattern);

    if (indexMatches) {
      console.log(`\n找到 ${indexMatches.length} 个 INDEX 语句`);
      for (const stmt of indexMatches) {
        try {
          await client.query(stmt);
          console.log('  ✓ 创建索引');
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log('  ✓ 索引已存在');
          } else {
            console.error(`  ✗ 错误: ${err.message}`);
          }
        }
      }
    }

    // 验证表是否创建成功
    console.log('\n========================================');
    console.log('验证已创建的表:');
    console.log('========================================');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'jso_warehouse%'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('警告: 没有找到任何回仓申请相关的表！');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }

    console.log('\n数据库迁移完成！');

  } catch (error) {
    console.error('迁移失败:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
