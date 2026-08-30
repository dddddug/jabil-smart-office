<template>
  <div class="stockroom-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="breadcrumb">
        <span>首页</span>
        <span class="sep">/</span>
        <span>数据中心</span>
        <span class="sep">/</span>
        <span class="active">Stockroom Urgent Pull</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="handleExport" :disabled="isLoading">
          📤 导出
        </button>
        <button class="btn btn-primary" @click="loadData" :disabled="isLoading">
          {{ isLoading ? '加载中...' : '🔄 刷新' }}
        </button>
      </div>
    </div>

    <!-- 汇总区 -->
    <div class="summary-section">
      <div class="summary-tabs">
        <button
          v-for="t in summaryTabs"
          :key="t.key"
          :class="['summary-tab', { active: activeSummary === t.key }]"
          @click="activeSummary = t.key; saveActiveSummary()"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="summary-table-wrapper">
        <table class="summary-table">
          <thead>
            <tr>
              <th class="row-header" rowspan="2">{{ summaryPeriodLabel }}</th>
              <th v-for="loc in locationList" :key="loc">{{ loc }}</th>
              <th class="total-col">Total</th>
            </tr>
            <tr>
              <th v-for="loc in locationList" :key="loc + '-p'" class="period-header">{{ loc }}</th>
              <th class="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in summaryDataRows" :key="idx"
                :class="{ 'selected-row': selectedPeriodFilter?.key === row.key }"
                @click="filterBySummaryPeriod(row)">
              <td class="row-header">
                <span class="clickable-label">{{ row.label }}</span>
              </td>
              <td v-for="loc in locationList" :key="loc + '-r-' + idx">
                {{ row.data[loc] || 0 }}
              </td>
              <td class="total-col">{{ row.total }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td class="row-header total-cell"><strong>合计</strong></td>
              <td v-for="loc in locationList" :key="loc + '-f'">
                <strong>{{ summaryTotalRow?.data[loc] || 0 }}</strong>
              </td>
              <td class="total-col"><strong>{{ summaryTotalRow?.total || 0 }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 数据列表 -->
    <div class="data-section">
      <div class="data-header">
        <span class="data-title">📋 数据列表</span>
        <div class="data-filters">
          <span class="filter-label">仓位:</span>
          <select v-model="filterLocation" class="filter-select">
            <option value="">全部</option>
            <option v-for="loc in locationList" :key="loc" :value="loc">{{ loc }}</option>
          </select>
          <span class="filter-label">日期:</span>
          <input type="date" v-model="filterDateFrom" class="filter-input" />
          <span>至</span>
          <input type="date" v-model="filterDateTo" class="filter-input" />
          <span class="filter-label">客户:</span>
          <select v-model="filterCustomer" class="filter-select">
            <option value="">全部</option>
            <option v-for="cust in customerList" :key="cust" :value="cust">{{ cust }}</option>
          </select>
        </div>
        <span class="data-info" v-if="selectedPeriodFilter">
          <span style="color: #409EFF;">已筛选: {{ selectedPeriodFilter.key }}</span>
          <button class="btn-link" @click="selectedPeriodFilter = null; currentPage = 1;">清除筛选</button>
        </span>
        <span class="data-info" v-else>共 {{ total }} 条记录</span>
      </div>
      <div class="data-table-wrapper" v-loading="isLoading">
        <table class="data-table">
          <thead>
            <tr>
              <th>仓位</th>
              <th>Build Plan</th>
              <th>客户</th>
              <th>物料需求时间</th>
              <th>Pull List No</th>
              <th>ITEM</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in paginatedData" :key="index">
              <td>{{ getLocationByPullListNo(row) }}</td>
              <td>{{ row.BuildPlan || '-' }}</td>
              <td>{{ row.Customer || '-' }}</td>
              <td>{{ formatDate(row.MaterialReqTime) }}</td>
              <td>{{ row.PulllistNo || '-' }}</td>
              <td>{{ row.Item || 0 }}</td>
            </tr>
            <tr v-if="paginatedData.length === 0 && !isLoading">
              <td colspan="6" class="empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getStockroomUrgentPullData,
  exportStockroomUrgentPullData,
  getLocationMappings,
  getPulllistTypeMappings,
  getStockroomSummaryData,
  type StockroomUrgentPullItem
} from '../api/stockroomUrgentPull';

const isLoading = ref(false);
const tableData = ref<StockroomUrgentPullItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(50);

// 用于汇总的全部数据（包含主表和归档表）
const allDataForSummary = ref<StockroomUrgentPullItem[]>([]);
const summaryDataLoaded = ref(false);  // 标记汇总数据是否已加载

// 数据列表筛选
const filterLocation = ref('');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filterCustomer = ref('');

// 客户列表
const customerList = computed(() => {
  const customers = new Set<string>();
  tableData.value.forEach(row => {
    if (row.Customer) {
      customers.add(row.Customer);
    }
  });
  return Array.from(customers).sort();
});

// 库位配置
const locationList = ref<string[]>([]);
const locationMappings = ref<Record<string, string[]>>({});

// Pull List类型映射 - config_key是关键词，config_value是类型（如"借料"）
// Pull List类型映射 - 按仓位分组
// 格式: { "T01": { "JIELIAO": "借料", "MFG": "借料" }, "T11": { "JIELIAO": "借料" } }
const pulllistTypeMappings = ref<Record<string, Record<string, string>>>({});

// 汇总状态
const activeSummary = ref<'week' | 'month' | 'year'>((localStorage.getItem('stockroom_summary_type') as 'week' | 'month' | 'year') || 'week');

// 选中的汇总筛选周期（null表示显示全部）
const selectedPeriodFilter = ref<{type: 'week' | 'month' | 'year', key: string} | null>(
  (() => {
    const saved = localStorage.getItem('stockroom_selected_period');
    return saved ? JSON.parse(saved) : null;
  })()
);

// 点击汇总行筛选
const filterBySummaryPeriod = async (period: {label: string, type: 'week' | 'month' | 'year', key: string}) => {
  console.log('[filterBySummaryPeriod] 选择周期:', period);

  if (selectedPeriodFilter.value?.key === period.key && selectedPeriodFilter.value?.type === period.type) {
    // 取消选中
    selectedPeriodFilter.value = null;
    localStorage.removeItem('stockroom_selected_period');
    // 重置日期筛选
    initDateRange();
    await loadData();
  } else {
    selectedPeriodFilter.value = period;
    localStorage.setItem('stockroom_selected_period', JSON.stringify(period));

    // 根据选择的周期设置日期筛选范围
    let dateFrom = '';
    let dateTo = '';

    if (period.type === 'week') {
      // 周格式: FY26-WK01
      const match = period.key.match(/FY(\d+)-WK(\d+)/);
      if (match && match[1] && match[2]) {
        const fyYear = 2000 + parseInt(match[1]);
        const weekNum = parseInt(match[2]);

        // 计算该周的起始和结束日期
        const jan4 = new Date(fyYear, 0, 4);
        const dayOfJan4 = jan4.getDay() || 7;
        const mondayOfJan4 = new Date(jan4);
        mondayOfJan4.setDate(jan4.getDate() - dayOfJan4 + 1);

        const weekStart = new Date(mondayOfJan4);
        weekStart.setDate(mondayOfJan4.getDate() + (weekNum - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        dateFrom = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        dateTo = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
      }
    } else if (period.type === 'month') {
      // 月格式: FY26-Aug
      const match = period.key.match(/FY(\d+)-(\w+)/);
      if (match && match[1] && match[2]) {
        const fyYear = 2000 + parseInt(match[1]);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = months.indexOf(match[2]);

        if (monthIdx >= 0) {
          dateFrom = `${fyYear}-${String(monthIdx + 1).padStart(2, '0')}-01`;
          const lastDay = new Date(fyYear, monthIdx + 1, 0).getDate();
          dateTo = `${fyYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
      }
    } else {
      // 年格式: FY26
      const match = period.key.match(/FY(\d+)/);
      if (match && match[1]) {
        const fyYear = 2000 + parseInt(match[1]);
        dateFrom = `${fyYear}-01-01`;
        dateTo = `${fyYear}-12-31`;
      }
    }

    console.log('[filterBySummaryPeriod] 计算的日期范围:', { dateFrom, dateTo });

    searchParams.MaterialReqTimeFrom = dateFrom;
    searchParams.MaterialReqTimeTo = dateTo;

    // 重新加载数据
    await loadData();
  }
  // 重置到第一页
  currentPage.value = 1;
};

// 保存汇总类型到localStorage
const saveActiveSummary = () => {
  localStorage.setItem('stockroom_summary_type', activeSummary.value);
};
const summaryTabs = [
  { key: 'week' as const, label: '周汇总' },
  { key: 'month' as const, label: '月汇总' },
  { key: 'year' as const, label: '年汇总' }
];

// 搜索参数
const searchParams = reactive({
  BuildPlan: '',
  Customer: '',
  QM: '',
  BPType: '',
  PulllistNo: '',
  MaterialReqTimeFrom: '',
  MaterialReqTimeTo: '',
  page: 1,
  pageSize: 50  // 默认50条，后端分页
});

// 设置默认日期范围
const initDateRange = () => {
  // 默认加载最近30天的数据
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
  searchParams.MaterialReqTimeFrom = thirtyDaysAgoStr;
  searchParams.MaterialReqTimeTo = todayStr;
};

// 获取中国本地当前日期 (YYYY-MM-DD)
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式化日期
const formatDate = (s?: string) => {
  if (!s) return '-';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    // 使用本地时间格式化
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch { return s; }
};

const formatNumber = (n?: number) => {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString();
};

// 加载库位映射
const loadLocationMappings = async () => {
  try {
    const res = await getLocationMappings();
    const mappings = res.data || res || {};
    locationMappings.value = mappings;
    locationList.value = Object.keys(mappings);
  } catch (e) {
    // 默认库位
    locationList.value = ['T01', 'T07&T08', 'T11', 'T13', 'T16'];
  }
};

// 加载Pull List类型映射
const loadPulllistTypeMappings = async () => {
  try {
    const res = await getPulllistTypeMappings();
    const mappings = res.data || res || {};
    pulllistTypeMappings.value = mappings;
  } catch (e) {
    console.error('加载Pull List类型映射失败', e);
  }
};

// 判断是否为借料记录
const isBorrowMaterial = (row: StockroomUrgentPullItem): boolean => {
  const pulllistNo = row.PulllistNo || '';
  const buildPlan = row.BuildPlan || '';
  const location = getLocationByPullListNo(row);

  // 仓位为"其他"的不显示
  if (location === '其他') {
    return false;
  }

  const plNoUpper = pulllistNo.toUpperCase();

  // 检查该仓位是否有Pull List类型配置
  const locationMapping = pulllistTypeMappings.value[location];
  if (!locationMapping) {
    return false; // 没有配置就不显示
  }

  // 检查Pull List No是否匹配该仓位的借料关键词
  for (const [keyword, docType] of Object.entries(locationMapping)) {
    if (docType === '借料' && plNoUpper.includes(keyword.toUpperCase())) {
      return true; // 匹配借料关键词
    }
  }

  // T01、T07&T08、T11、T13、T14、T16仓位，如果没有匹配借料关键词，也显示（放宽限制）
  const defaultLocations = ['T01', 'T07&T08', 'T11', 'T13', 'T14', 'T16'];
  if (defaultLocations.includes(location)) {
    // 检查是否包含MFG或JIELIAO关键词（放宽匹配）
    if (plNoUpper.includes('MFG') || plNoUpper.includes('JIELIAO') || plNoUpper.includes('MPL')) {
      return true;
    }
    // 如果是T01仓位，也显示（因为很多T01数据没有特定关键词）
    if (location === 'T01' && pulllistNo) {
      return true;
    }
  }

  return false; // 不匹配任何借料关键词
};

// 根据 Pull List No 判断仓位
const getLocationByPullListNo = (row: StockroomUrgentPullItem): string => {
  const pulllistNo = (row.PulllistNo || '').toUpperCase();

  // 如果locationMappings还没加载，使用默认配置
  const mappings = Object.keys(locationMappings.value).length > 0 ? locationMappings.value : {
    'T01': ['0100T010'],
    'T11': ['1100T110'],
    'T16': ['1600T160'],
    'T07&T08': ['0700T070', '0800T080'],
    'T14': ['1400T140'],
    'T13': ['1300T130']
  };

  for (const [loc, keywords] of Object.entries(mappings)) {
    const upperKeywords = keywords.map(k => k.toUpperCase());
    // 只检查 Pull List No 字段
    if (upperKeywords.some(kw => pulllistNo.includes(kw))) {
      return loc;
    }
  }
  return '其他';
};

// 汇总周期标签
const summaryPeriodLabel = computed(() => {
  return activeSummary.value === 'week' ? '周' : activeSummary.value === 'month' ? '月' : '年';
});

// 计算周数（FY格式，如 FY26-WK01，使用本地日期）
const getWeekKey = (date: Date): {week: number, key: string} => {
  // 使用本地日期的年、月、日
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate(); // 1-31

  // 找到该年的第1周（包含1月4日的那一周，周一为起始）
  const jan4 = new Date(year, 0, 4); // 1月4日
  const dayOfJan4 = jan4.getDay() || 7; // 周几（1=周一，7=周日）
  const mondayOfJan4 = new Date(jan4);
  mondayOfJan4.setDate(jan4.getDate() - dayOfJan4 + 1); // 该周周一

  // 计算当前日期是第几周
  const daysSinceJan4 = Math.floor((date.getTime() - mondayOfJan4.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.floor(daysSinceJan4 / 7) + 1;

  // 如果是负数，说明在第1周之前（属于上一年）
  const fyYear = week <= 0 ? (year - 1).toString().slice(-2) : year.toString().slice(-2);
  const actualWeek = week <= 0 ? 52 + week : week;

  return {
    week: actualWeek,
    key: `FY${fyYear}-WK${String(actualWeek).padStart(2, '0')}`
  };
};

// 计算汇总数据（使用包含归档数据的 allDataForSummary）
const summaryRows = computed(() => {
  const dataSource = allDataForSummary.value.length > 0 ? allDataForSummary.value : tableData.value;
  console.log('[summaryRows] 计算中...', { allDataLength: allDataForSummary.value.length, tableLength: tableData.value.length, dataSourceLength: dataSource.length });
  if (dataSource.length === 0) {
    return [];
  }

  // 只保留近53周的数据
  const today = new Date();
  const weeks53Ago = new Date(today.getTime() - 53 * 7 * 24 * 60 * 60 * 1000);

  // 默认仓位列表
  const defaultLocations = ['T01', 'T11', 'T16', 'T07&T08', 'T14', 'T13'];
  const locs = locationList.value.length > 0 ? locationList.value : defaultLocations;

  const buckets: Record<string, Record<string, number>> = {};

  // 统计各仓位总数
  let t01Total = 0, t11Total = 0, t16Total = 0, t07t08Total = 0, t14Total = 0, t13Total = 0, otherTotal = 0;

  dataSource.forEach((row: any) => {
    const dateStr = row.MaterialReqTime;
    if (!dateStr) return;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    // 过滤：只保留近53周
    if (date < weeks53Ago) return;

    let key = '';
    if (activeSummary.value === 'week') {
      // 周：FY26-WK01 格式
      const weekInfo = getWeekKey(date);
      key = weekInfo.key;
    } else if (activeSummary.value === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = `${date.getFullYear()}年`;
    }

    const loc = getLocationByPullListNo(row);

    // 统计
    if (loc === 'T01') t01Total++;
    else if (loc === 'T11') t11Total++;
    else if (loc === 'T16') t16Total++;
    else if (loc === 'T07&T08') t07t08Total++;
    else if (loc === 'T14') t14Total++;
    else if (loc === 'T13') t13Total++;
    else otherTotal++;

    // 仓位为"其他"的不计入汇总
    if (loc === '其他') return;

    if (!buckets[key]) {
      buckets[key] = {};
      locs.forEach(l => { buckets[key]![l] = 0; });
    }
    // 统计记录数量
    buckets[key]![loc] = (buckets[key]![loc] || 0) + 1;
  });

  console.log('[summaryRows] 统计结果:', { t01Total, t11Total, t16Total, t07t08Total, t14Total, t13Total, otherTotal });

  // 调试日志

  // 转换为行数据，显示所有周期（包括数据为0的周期）
  let allPeriods: string[] = [];

  if (activeSummary.value === 'week') {
    // 周汇总：生成所有周
    const currentDate = new Date();
    const currentWeekInfo = getWeekKey(currentDate);
    const maxWeek = currentWeekInfo.week;
    const fyYear = currentWeekInfo.key.split('-')[0];
    for (let w = maxWeek; w >= 1; w--) {
      allPeriods.push(`${fyYear}-WK${String(w).padStart(2, '0')}`);
    }
  } else if (activeSummary.value === 'month') {
    // 月汇总：从当前月开始往前排
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11

    // 先添加当前年份的月份（从当前月往前）
    for (let m = currentMonth; m >= 0; m--) {
      allPeriods.push(`FY${String(currentYear).slice(-2)}-${months[m]}`);
    }
    // 再添加前一年12月到当前年1月之间的月份
    for (let y = currentYear - 1; y >= currentYear - 1; y--) {
      for (let m = 11; m >= 0; m--) {
        // 跳过已经添加的月份
        if (y === currentYear - 1 && m > currentMonth) continue;
        allPeriods.push(`FY${String(y).slice(-2)}-${months[m]}`);
      }
    }
  } else {
    // 年汇总：生成所有年份 (FY格式)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
      allPeriods.push(`FY${String(y).slice(-2)}`);
    }
  }

  // 转换buckets的key格式
  const convertKey = (key: string) => {
    if (activeSummary.value === 'week') {
      return key;
    } else if (activeSummary.value === 'month') {
      // 2026-08 -> FY26-Aug
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const parts = key.split('-');
      if (parts.length === 2) {
        const yearPart = parts[0] || '';
        const monthPart = parts[1] || '';
        const y = yearPart.slice(-2);
        const m = parseInt(monthPart) || 0;
        const monthName = months[m - 1] || '';
        return `FY${y}-${monthName}`;
      }
      return key;
    } else {
      // 2026年 -> FY26
      const year = key.replace('年', '');
      return `FY${year.slice(-2)}`;
    }
  };

  const convertedBuckets: Record<string, Record<string, number>> = {};
  for (const [key, data] of Object.entries(buckets)) {
    const convertedKey = convertKey(key);
    convertedBuckets[convertedKey] = data;
  }

  // 生成行数据
  const rows = allPeriods
    .map(label => {
      const data = convertedBuckets[label] || {};
      const rowData: Record<string, number> = {};
      locs.forEach(l => {
        rowData[l] = data[l] || 0;
      });
      const total = Object.values(rowData).reduce((s, v) => s + v, 0);
      return { label, data: rowData, total, isTotal: false, type: activeSummary.value, key: label };
    });

  // 添加合计行
  const totalData: Record<string, number> = {};
  locs.forEach(l => totalData[l] = 0);
  rows.forEach(r => {
    Object.keys(r.data || {}).forEach(k => {
      totalData[k] = (totalData[k] || 0) + (r.data[k] || 0);
    });
  });
  const grandTotal = Object.values(totalData).reduce((s, v) => s + v, 0);
  rows.push({ label: '合计', data: totalData, total: grandTotal, isTotal: true, type: activeSummary.value, key: 'total' });

  return rows;
});

// 分离数据行和合计行
const summaryDataRows = computed(() => summaryRows.value.filter(r => !r.isTotal));
const summaryTotalRow = computed(() => summaryRows.value.find(r => r.isTotal));

// 根据选中的汇总周期过滤数据
const filteredTableData = computed(() => {
  // 始终使用 tableData（包含完整字段）
  let data = tableData.value;
  console.log('[filteredTableData] 计算中, tableData.length:', data.length, 'dateFrom:', searchParams.MaterialReqTimeFrom, 'dateTo:', searchParams.MaterialReqTimeTo);

  // 过滤掉仓位为"其他"的记录
  const beforeFilter = data.length;
  data = data.filter(row => getLocationByPullListNo(row) !== '其他');
  console.log('[filteredTableData] 过滤仓位后:', beforeFilter, '->', data.length);

  // 应用数据列表筛选
  if (filterLocation.value) {
    data = data.filter(row => getLocationByPullListNo(row) === filterLocation.value);
  }
  if (filterCustomer.value) {
    data = data.filter(row => (row.Customer || '').toLowerCase().includes(filterCustomer.value.toLowerCase()));
  }
  if (filterDateFrom.value) {
    data = data.filter(row => {
      if (!row.MaterialReqTime) return false;
      const d = new Date(row.MaterialReqTime).toISOString().slice(0, 10);
      return d >= filterDateFrom.value;
    });
  }
  if (filterDateTo.value) {
    data = data.filter(row => {
      if (!row.MaterialReqTime) return false;
      const d = new Date(row.MaterialReqTime).toISOString().slice(0, 10);
      return d <= filterDateTo.value;
    });
  }

  // 不再需要汇总筛选过滤，因为 loadData 会根据日期筛选加载数据
  return data;
});

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const filtered = filteredTableData.value;
  const slice = filtered.slice(start, end);
  console.log('[paginatedData] 计算:', {
    currentPage: currentPage.value,
    pageSize: pageSize.value,
    start,
    end,
    filteredLength: filtered.length,
    sliceLength: slice.length
  });
  return slice;
});

// 计算周数
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// 加载数据
const loadData = async () => {
  console.log('[loadData] 开始加载...');
  console.log('[loadData] searchParams:', JSON.stringify(searchParams));
  isLoading.value = true;
  try {
    // 刷新汇总数据（包含归档数据）- 只加载一次
    if (!summaryDataLoaded.value || allDataForSummary.value.length === 0) {
      console.log('[loadData] 加载汇总数据...');
      await loadSummaryData();
    }

    // 加载全部数据用于列表显示（前端分页）
    const params = {
      ...searchParams,
      page: 1,
      pageSize: 50000, // 一次性加载足够数据
    };

    console.log('[loadData] 发送请求参数:', JSON.stringify(params));
    const res = await getStockroomUrgentPullData(params);
    console.log('[loadData] 收到响应');

    const resultData = res.data?.data || res.data || res;
    console.log('[loadData] resultData.total:', resultData.total);
    console.log('[loadData] resultData.items?.length:', resultData.items?.length);

    tableData.value = resultData.items || [];
    total.value = resultData.total || resultData.items?.length || 0;
    console.log('[loadData] 设置后: tableData.value.length =', tableData.value.length, 'total.value =', total.value);

    // 如果有选中的汇总筛选，重置筛选
    if (selectedPeriodFilter.value) {
      selectedPeriodFilter.value = null;
    }

  } catch (e: any) {
    console.error('[loadData] 失败:', e);
    ElMessage.error(e.message || '加载数据失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
};

// 加载分页数据
const loadPaginatedData = async () => {
  console.log('[loadPaginatedData] 开始加载...', { page: currentPage.value, pageSize: pageSize.value });
  console.log('[loadPaginatedData] searchParams:', JSON.stringify(searchParams));
  isLoading.value = true;
  try {
    const params = {
      ...searchParams,
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    console.log('[loadPaginatedData] 发送请求, params:', JSON.stringify(params));
    const res = await getStockroomUrgentPullData(params);
    console.log('[loadPaginatedData] 收到响应, res.status:', res.status);
    console.log('[loadPaginatedData] res:', JSON.stringify(res).substring(0, 500));
    console.log('[loadPaginatedData] res.data:', res.data);
    console.log('[loadPaginatedData] res.data?.data:', res.data?.data);

    const resultData = res.data?.data || res.data || res;
    console.log('[loadPaginatedData] resultData:', JSON.stringify(resultData).substring(0, 500));
    console.log('[loadPaginatedData] resultData.items:', resultData.items?.length);
    console.log('[loadPaginatedData] resultData.total:', resultData.total);
    console.log('[loadPaginatedData] resultData.page:', resultData.page);
    console.log('[loadPaginatedData] resultData.totalPages:', resultData.totalPages);

    tableData.value = resultData.items || [];
    total.value = resultData.total || 0;
    console.log('[loadPaginatedData] 设置后: tableData.value.length =', tableData.value.length, 'total.value =', total.value);
  } catch (e: any) {
    console.error('[loadPaginatedData] 加载失败:', e);
    tableData.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadData();
};

const resetSearch = () => {
  searchParams.BuildPlan = '';
  searchParams.Customer = '';
  searchParams.QM = '';
  searchParams.BPType = '';
  searchParams.PulllistNo = '';
  searchParams.MaterialReqTimeFrom = '';
  searchParams.MaterialReqTimeTo = '';
  currentPage.value = 1;
  loadData();
};

const handlePageChange = async (p: number) => {
  currentPage.value = p;
  // 数据已在 loadData 中全部加载，前端自动处理分页
};

const handleSizeChange = async (s: number) => {
  pageSize.value = s;
  currentPage.value = 1;
  // 数据已在 loadData 中全部加载，前端自动处理分页
};

const handleExport = async () => {
  try {
    ElMessage.info('正在导出数据...');
    const res = await exportStockroomUrgentPullData(searchParams);
    const blob = new Blob([res], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StockroomUrgentPull_${getTodayString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (e: any) {
    ElMessage.error(e.message || '导出失败');
  }
};

let dataRefreshTimer: any = null;

// 自动刷新数据（每2分钟刷新一次）
const startAutoRefresh = () => {
  if (dataRefreshTimer) clearInterval(dataRefreshTimer);
  dataRefreshTimer = setInterval(() => {
    loadData();
  }, 2 * 60 * 1000); // 2分钟
};

// 停止自动刷新
const stopAutoRefresh = () => {
  if (dataRefreshTimer) {
    clearInterval(dataRefreshTimer);
    dataRefreshTimer = null;
  }
};

onMounted(async () => {
  initDateRange();  // 初始化日期范围
  await loadLocationMappings();
  await loadPulllistTypeMappings();  // 加载Pull List类型映射
  await loadSummaryData();  // 加载汇总数据（包含归档数据）
  await loadData();  // 等待数据加载完成
  startAutoRefresh();  // 启动自动刷新
});

// 加载汇总数据（包含主表和归档表）- 只加载一次
const loadSummaryData = async () => {
  // 如果已经加载过，不再重复加载
  if (summaryDataLoaded.value && allDataForSummary.value.length > 0) {
    console.log('[loadSummaryData] 已加载，跳过');
    return;
  }

  try {
    console.log('[loadSummaryData] 开始加载...');
    const res = await getStockroomSummaryData();
    const data = res.data?.data || res.data || [];

    console.log('[loadSummaryData] 获取到数据:', data.length, '条');
    console.log('[loadSummaryData] 即将设置 allDataForSummary...');

    allDataForSummary.value = data;
    summaryDataLoaded.value = true;

    console.log('[loadSummaryData] 设置完成，allDataForSummary.length =', allDataForSummary.value.length);
  } catch (e: any) {
    console.error('[loadSummaryData] 加载失败:', e);
    // 不再降级使用 tableData
    console.log('[loadSummaryData] 保持 allDataForSummary 为空');
  }
};

// 刷新汇总数据（仅在数据为空且未加载过时）
const refreshSummaryData = async () => {
  if (!summaryDataLoaded.value || allDataForSummary.value.length === 0) {
    await loadSummaryData();
  }
};

// 调试用
const debugData = () => {
  console.log('allDataForSummary:', allDataForSummary.value.length);
  console.log('tableData:', tableData.value.length);
  console.log('locationMappings:', locationMappings.value);
  console.log('activeSummary:', activeSummary.value);
};

onUnmounted(() => {
  stopAutoRefresh();  // 组件卸载时停止刷新
});
</script>

<style scoped>
.stockroom-container {
  padding: 16px;
  background: #f0f2f5;
  min-height: calc(100vh - 52px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.breadcrumb {
  font-size: 13px;
  color: #666;
}
.breadcrumb .sep { margin: 0 6px; color: #ccc; }
.breadcrumb .active { color: #1890ff; font-weight: 500; }

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: none;
}
.btn-primary {
  background: #1890ff;
  color: white;
  border: 1px solid #1890ff;
}
.btn-primary:hover { background: #40a9ff; border-color: #40a9ff; }
.btn-primary:disabled { background: #bae7ff; border-color: #bae7ff; cursor: not-allowed; }
.btn-secondary {
  background: white;
  color: #606266;
  border: 1px solid #d9d9d9;
}
.btn-secondary:hover { border-color: #1890ff; color: #1890ff; }

/* 筛选区 */
.filter-bar {
  background: white;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  color: #606266;
}

.filter-item input {
  padding: 5px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}
.filter-item input:focus { border-color: #1890ff; }

.date-range {
  display: flex;
  align-items: center;
  gap: 4px;
}
.date-range input { flex: 1; }
.date-range span { color: #999; font-size: 12px; }

.filter-actions {
  display: flex;
  gap: 8px;
  grid-column: span 2;
}

/* 汇总区 */
.summary-section {
  background: white;
  border-radius: 4px;
  margin-bottom: 12px;
}

.summary-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 4px 4px 0 0;
}

.summary-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  border-bottom: 2px solid transparent;
}

.summary-tab:hover { color: #1890ff; }
.summary-tab.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  background: white;
}

.summary-table-wrapper {
  padding: 12px;
  overflow-x: auto;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.summary-table th, .summary-table td {
  padding: 6px 10px;
  border: 1px solid #f0f0f0;
  text-align: center;
}

.summary-table th {
  background: #fafafa;
  font-weight: 600;
  color: #333;
}

.summary-table td.row-header,
.summary-table th.row-header {
  background: #fafafa;
  font-weight: 600;
  color: #333;
}

.summary-table .total-col {
  background: #fff7e6;
  font-weight: 600;
}

.summary-table .total-row {
  background: #f6ffed;
  font-weight: 600;
}

.summary-table tbody tr:not(.total-row) {
  cursor: pointer;
}

.summary-table tbody tr:not(.total-row):hover {
  background: #e6f7ff;
}

.summary-table .selected-row {
  background: #bae7ff !important;
}

.summary-table .clickable-label {
  color: #1890ff;
  text-decoration: underline;
}

.summary-table-wrapper {
  max-height: 200px;
  overflow-y: auto;
  position: relative;
}

.summary-table {
  border-collapse: separate;
}

.summary-table tfoot tr {
  position: sticky;
  bottom: 0;
  background: #f6ffed;
  z-index: 1;
}

.summary-table-wrapper::-webkit-scrollbar {
  width: 8px;
}

.summary-table-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.summary-table-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.summary-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.summary-table .total-cell {
  background: #f6ffed;
}

/* 数据区 */
.data-section {
  background: white;
  border-radius: 4px;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 4px 4px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}

.data-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.data-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-filters .filter-label {
  font-size: 12px;
  color: #606266;
}

.data-filters .filter-select,
.data-filters .filter-input {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}

.data-filters .filter-select:focus,
.data-filters .filter-input:focus {
  border-color: #1890ff;
}

.data-filters select {
  min-width: 80px;
}

.data-filters input[type="date"] {
  min-width: 110px;
}

.data-filters input[type="text"] {
  min-width: 100px;
}

.data-info {
  font-size: 12px;
  color: #909399;
}

.data-table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table thead {
  background: #fafafa;
}

.data-table th {
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.data-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f5f5f5;
  color: #606266;
}

.data-table tbody tr:hover { background: #f5f5f5; }

.data-table .mono { font-family: monospace; }
.data-table .num { text-align: right; font-family: monospace; }
.data-table .shortage { color: #ff4d4f; font-weight: 600; }
.data-table .empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.status-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
.status-tag.short { background: #fff1f0; color: #ff4d4f; }
.status-tag.ok { background: #f6ffed; color: #52c41a; }

.pagination {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
}
</style>