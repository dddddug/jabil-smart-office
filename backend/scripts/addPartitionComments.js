/**
 * 为所有分区表添加中文注释
 */

import pg from 'pg';

const pool = new pg.Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function addPartitionComments() {
  // 生成所有分区表的注释
  const comments = {};

  // SAP拉取日志分区表 (2024-2027)
  for (let year = 2024; year <= 2027; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `jso_sap_pull_log_${year}_${String(month).padStart(2, '0')}`;
      comments[key] = `SAP拉取日志${year}年${month}月分区`;
    }
  }

  // SAP收货历史分区表 (2024-2027)
  for (let year = 2024; year <= 2027; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `jso_sap_grn_history_${year}_${String(month).padStart(2, '0')}`;
      comments[key] = `SAP收货历史${year}年${month}月分区`;
    }
  }

  // 拉取单物料计数分区表 (2024-2027)
  for (let year = 2024; year <= 2027; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `jso_pulllist_item_count_${year}_${String(month).padStart(2, '0')}`;
      comments[key] = `拉取单物料计数${year}年${month}月分区`;
    }
  }

  // Stockroom分区表 (2026)
  for (let month = 6; month <= 12; month++) {
    const key = `jso_stockroom_urgent_pull_data_2026_${String(month).padStart(2, '0')}`;
    comments[key] = `Stockroom紧急拉取数据2026年${month}月分区`;
  }

  console.log('开始为分区表添加注释...');
  console.log('总计:', Object.keys(comments).length, '个分区表\n');

  let success = 0;
  let failed = 0;

  for (const [table, comment] of Object.entries(comments)) {
    try {
      const escapedComment = comment.replace(/'/g, "''");
      await pool.query(`COMMENT ON TABLE "${table}" IS '${escapedComment}'`);
      console.log('✓', table);
      success++;
    } catch (e) {
      console.log('✗', table, ':', e.message.split('\n')[0]);
      failed++;
    }
  }

  console.log('\n========== 完成 ==========');
  console.log('成功:', success);
  console.log('失败:', failed);

  await pool.end();
}

addPartitionComments().catch(console.error);
