/**
 * 手动拉取 Stockroom 数据
 * 用法: node manualPullData.js [dateFrom] [dateTo]
 * 例如: node manualPullData.js 2026-09-01 2026-09-05
 */
import pool from '../config/db.js';

const DATA_TABLE = 'jso_stockroom_urgent_pull_data_partitioned';

// 获取今天的日期字符串
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 从外部API拉取数据的核心逻辑
const pullDataFromExternalAPI = async (dateFrom, dateTo) => {
  const axios = (await import('axios')).default;

  console.log(`开始从外部API拉取数据: ${dateFrom} ~ ${dateTo}`);

  try {
    const queryString = `QM=&Customer=&BPType=&BuildPlan=&PulllistNo=`
      + `&MaterialReqTimeFrom=${encodeURIComponent(dateFrom)}`
      + `&MaterialReqTimeTo=${encodeURIComponent(dateTo)}`;

    const apiUrl = `http://huasfmmwebapi/SFMMWebAPI/api/ExternalApp/GetBuildPlanDetailsData?${queryString}`;

    console.log(`API URL: ${apiUrl}`);

    const response = await axios.get(apiUrl, {
      timeout: 120000,
      headers: { 'Accept': 'application/json' }
    });

    let rawData = response.data;
    let items = [];

    if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.Data)) {
        items = rawData.Data;
      } else if (rawData.data) {
        items = Array.isArray(rawData.data) ? rawData.data : [rawData.data];
      }
    }

    console.log(`外部API返回 ${items.length} 条数据`);

    if (items.length === 0) {
      return { success: true, count: 0 };
    }

    const getLocalDate = (apiDateStr) => {
      if (!apiDateStr) return null;
      return apiDateStr.substring(0, 10);
    };

    // 对 items 按 (pulllist_no, data_date) 去重
    const seenKeys = new Set();
    const uniqueItems = [];
    for (const item of items) {
      const dataDate = getLocalDate(item.MaterialReqTime);
      const key = `${item.PulllistNo || ''}__${dataDate}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueItems.push(item);
      }
    }

    console.log(`去重后 ${uniqueItems.length} 条数据`);

    // 构建批量插入数据
    const values = uniqueItems.map((item, idx) => {
      const offset = idx * 27;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27})`;
    }).join(',');

    // 准备参数
    const params = uniqueItems.flatMap(item => {
      const dataDate = getLocalDate(item.MaterialReqTime);

      return [
        item.BuildPlan || '',
        item.Customer || '',
        item.MaterialReqTime || null,
        item.PulllistNo || '',
        item.SAPModel || '',
        item.Assembly || '',
        item.QtyRequired || item.Qty || 0,
        item.QtyAllocated || 0,
        item.QtyShort || 0,
        item.StorageArea || '',
        item.isPullListShortage || false,
        item.BuildPlanID || null,
        item.BPType || '',
        item.QM || '',
        item.SLOC || '',
        item.StorageArea || '',
        item.Step || '',
        item.FactoryMARoute || '',
        item.Sets || 0,
        item.SAPModel || '',
        item.Assembly || '',
        item.Creator || '',
        item.CreateTime || null,
        dataDate,
        new Date(),
        item.Warehouse || '',
        0
      ];
    });

    // 批量插入
    await pool.query(`
      INSERT INTO ${DATA_TABLE} (
        build_plan, customer, material_req_time, pulllist_no,
        part_number, part_desc, qty_required, qty_allocated, qty_short,
        bin_location, is_pull_list_shortage,
        build_plan_id, bp_type, qm, sloc, storage_area, step,
        factory_ma_route, sets, sap_model, assembly, creator, create_time,
        data_date, pulled_at, warehouse, item_count
      ) VALUES ${values}
      ON CONFLICT (pulllist_no, data_date)
      DO UPDATE SET
        build_plan = EXCLUDED.build_plan,
        customer = EXCLUDED.customer,
        material_req_time = EXCLUDED.material_req_time,
        part_number = EXCLUDED.part_number,
        part_desc = EXCLUDED.part_desc,
        qty_required = EXCLUDED.qty_required,
        qty_allocated = EXCLUDED.qty_allocated,
        qty_short = EXCLUDED.qty_short,
        bin_location = EXCLUDED.bin_location,
        is_pull_list_shortage = EXCLUDED.is_pull_list_shortage,
        step = EXCLUDED.step,
        warehouse = EXCLUDED.warehouse,
        pulled_at = EXCLUDED.pulled_at
    `, params);

    console.log(`✅ 成功保存 ${uniqueItems.length} 条数据到数据库`);

    return { success: true, count: uniqueItems.length };

  } catch (error) {
    console.error(`❌ 拉取失败: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 主程序
const main = async () => {
  const args = process.argv.slice(2);
  const today = getTodayString();

  // 如果没有参数，使用今天
  let dateFrom = args[0] || today;
  let dateTo = args[1] || today;

  console.log(`\n========== 手动拉取 Stockroom 数据 ==========`);
  console.log(`日期范围: ${dateFrom} ~ ${dateTo}`);
  console.log('');

  const result = await pullDataFromExternalAPI(dateFrom, dateTo);

  if (result.success) {
    console.log(`\n✅ 拉取成功! 共保存 ${result.count} 条记录`);
  } else {
    console.log(`\n❌ 拉取失败: ${result.error}`);
  }

  // 关闭数据库连接
  await pool.end();

  process.exit(result.success ? 0 : 1);
};

main();
