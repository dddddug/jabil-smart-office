/**
 * 诊断脚本：检查过期预警中 Reference M72419740100T010 的问题
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321',
});

async function diagnose() {
  console.log('=== 诊断过期预警 Reference M72419740100T010 ===\n');

  const targetRef = 'M72419740100T010';
  const targetDate = '2026-09-17';

  try {
    // 1. 检查管控物料单据表中是否存在该单号
    console.log('1. 检查 jso_da_material_document 表中是否存在该单号:');
    const docResult = await pool.query(`
      SELECT id, document_no, control_type, status, submitted_at
      FROM jso_da_material_document
      WHERE document_no = $1
    `, [targetRef]);

    if (docResult.rows.length > 0) {
      console.log('   找到记录:', docResult.rows[0]);
    } else {
      console.log('   ❌ 未找到记录');
    }

    // 2. 检查仓库历史表中该 Reference 的所有记录
    console.log('\n2. 检查 jso_sap_grn_history_partitioned 表中该 Reference 的记录:');
    const grnResult = await pool.query(`
      SELECT
        id, trans, material, quantity, warehouse, reference, creation_date,
        sled, date_code, is_processed, process_result
      FROM jso_sap_grn_history_partitioned
      WHERE reference = $1
      AND creation_date >= $2::date
      AND creation_date < ($2::date + interval '1 day')
      ORDER BY creation_date DESC
    `, [targetRef, targetDate]);

    console.log(`   找到 ${grnResult.rows.length} 条记录:`);
    grnResult.rows.forEach((row, idx) => {
      console.log(`   [${idx + 1}] id=${row.id}, trans=${row.trans}, material=${row.material}, warehouse=${row.warehouse}`);
      console.log(`       date_code=${row.date_code}, sled=${row.sled}, is_processed=${row.is_processed}`);
    });

    // 3. 检查物料的保质期配置
    if (grnResult.rows.length > 0) {
      const materials = [...new Set(grnResult.rows.map(r => r.material))];
      console.log('\n3. 检查物料保质期配置:');
      for (const mat of materials) {
        const slResult = await pool.query(`
          SELECT material, shelf_life, period_indicator
          FROM jso_material_shelf_life
          WHERE material = $1
        `, [mat]);

        if (slResult.rows.length > 0) {
          console.log(`   ${mat}: shelf_life=${slResult.rows[0].shelf_life}, period_indicator=${slResult.rows[0].period_indicator}`);
        } else {
          console.log(`   ${mat}: ❌ 未找到保质期配置`);
        }
      }
    }

    // 4. 检查该 Reference 的 Trans 类型与过滤条件的关系
    console.log('\n4. 分析 Trans 类型与过滤条件:');
    const transTypes = [...new Set(grnResult.rows.map(r => r.trans))];
    console.log(`   该 Reference 的 Trans 类型: ${transTypes.join(', ')}`);
    console.log('   ');
    console.log('   过期预警过滤逻辑:');
    console.log('   - 如果 trans = PLR：会检查 reference 是否在"过期物料"管控单据中');
    console.log('   - 如果 trans != PLR（FLR/IWS）：不会检查，直接显示');

    // 5. 检查是否有未处理的过期记录
    console.log('\n5. 检查该 Reference 是否有未处理的过期记录:');
    const unprocessedResult = await pool.query(`
      SELECT
        h.id, h.trans, h.material, h.reference, h.sled, h.date_code,
        h.is_processed, sl.shelf_life, sl.period_indicator,
        e.extension_date
      FROM jso_sap_grn_history_partitioned h
      LEFT JOIN jso_material_shelf_life sl ON sl.material = h.material AND sl.plant = h.plant
      LEFT JOIN jso_material_extension e ON e.grn = h.gr_document
      WHERE h.reference = $1
      AND h.creation_date >= $2::date
      AND h.creation_date < ($2::date + interval '1 day')
      AND (h.is_processed IS NULL OR h.is_processed = FALSE)
    `, [targetRef, targetDate]);

    if (unprocessedResult.rows.length > 0) {
      console.log(`   ❌ 找到 ${unprocessedResult.rows.length} 条未处理的记录:`);
      unprocessedResult.rows.forEach((row, idx) => {
        console.log(`   [${idx + 1}] id=${row.id}, trans=${row.trans}, material=${row.material}`);
        console.log(`       sled=${row.sled}, date_code=${row.date_code}, shelf_life=${row.shelf_life}`);
      });
    } else {
      console.log('   ✅ 所有记录都已处理');
    }

    // 6. 结论
    console.log('\n=== 结论 ===');
    if (grnResult.rows.length === 0) {
      console.log('该 Reference 在今日仓库记录中不存在。');
    } else if (transTypes.every(t => t !== 'PLR')) {
      console.log(`该 Reference 只有 ${transTypes.join(', ')} 类型记录，不在 PLR（发料）管控范围内。`);
      console.log('过期预警仅对 PLR 类型检查"过期物料"管控单据。');
    } else if (docResult.rows.length > 0) {
      console.log('该 Reference 在管控物料单据中存在，但可能存在以下问题:');
      console.log('  - 管控单据的 control_type 可能不是"过期物料"');
      console.log('  - 或者 reference 字段存在细微差异（如空格）');
    } else {
      console.log('该 Reference 不在管控物料单据表中。');
    }

  } catch (error) {
    console.error('诊断出错:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
