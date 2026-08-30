import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function importData() {
  console.log('读取CSV文件...');

  const content = fs.readFileSync('排除物料.csv', 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('PartNo'));

  console.log('原始数据行数:', lines.length);

  // 去重
  const seen = new Set();
  const uniqueData = [];
  for (const line of lines) {
    const parts = line.split(',');
    const partNo = parts[0]?.trim();
    const division = parts[1]?.trim() || '';

    if (partNo && !seen.has(partNo)) {
      seen.add(partNo);
      uniqueData.push({ partNo, division });
    }
  }

  console.log('去重后数据行数:', uniqueData.length);

  // 批量导入
  const values = [];
  const params = [];
  let idx = 1;

  for (const { partNo, division } of uniqueData) {
    values.push(`($${idx}, $${idx + 1})`);
    params.push(partNo, division);
    idx += 2;
  }

  console.log('准备插入', values.length, '条记录...');

  if (values.length > 0) {
    const query = `
      INSERT INTO jso_class33_materials (part_no, division)
      VALUES ${values.join(', ')}
      ON CONFLICT (part_no) DO UPDATE SET division = EXCLUDED.division, updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, params);
  }

  console.log('✅ 导入完成');

  // 验证
  const count = await pool.query('SELECT COUNT(*) as cnt FROM jso_class33_materials');
  console.log('表中记录数:', count.rows[0].cnt);

  await pool.end();
}

importData().catch(console.error);
