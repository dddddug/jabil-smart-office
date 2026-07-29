<template>
  <div class="k2-diff-registration-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">K**差异登记</span>
      </div>
    </div>

    <!-- 统计数据图表区域 -->
    <div class="stats-row">
      <!-- 环形图：根据筛选条件统计类型分布 -->
      <div class="stat-card chart-card">
        <div class="stat-label">📊 类型分布</div>
        <div ref="donutChartRef" class="chart-container" style="height: 180px;"></div>
      </div>

      <!-- 饼图：近7天类型分布 -->
      <div class="stat-card chart-card">
        <div class="stat-label">🥧 近7天类型分布</div>
        <div ref="pieChartRef" class="chart-container" style="height: 180px;"></div>
      </div>

      <!-- 簇状图：近14天趋势 -->
      <div class="stat-card chart-card" style="flex: 1.5;">
        <div class="stat-label">📈 近14天趋势</div>
        <div ref="barChartRef" class="chart-container" style="height: 200px;"></div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📋 登记记录</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="loadRegistrations">🔄 刷新</button>
          <button type="button" class="btn btn-secondary" @click="sendEmail">📧 发送邮件</button>
          <button type="button" class="btn btn-primary" @click="showAddDialog">➕ 新增登记</button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <input
          type="date"
          v-model="searchParams.startDate"
          placeholder="开始日期"
          class="search-input"
        />
        <input
          type="date"
          v-model="searchParams.endDate"
          placeholder="结束日期"
          class="search-input"
        />
        <input
          type="text"
          v-model="searchParams.partNo"
          placeholder="Part no"
          class="search-input"
          @keydown.enter="loadRegistrations"
        />
        <input
          type="text"
          v-model="searchParams.grn"
          placeholder="GRN"
          class="search-input"
          @keydown.enter="loadRegistrations"
        />
        <select v-model="searchParams.shift" class="search-input">
          <option value="">全部班次</option>
          <option value="A">A班</option>
          <option value="C">C班</option>
        </select>
        <button type="button" class="btn btn-primary" @click="loadRegistrations">🔍 搜索</button>
      </div>

      <!-- 数据表格 -->
      <div class="table-wrapper">
        <!-- 新增记录输入行 -->
        <div v-if="showAddRow" class="add-row">
          <div class="add-row-cells">
            <span class="add-row-date">{{ currentDate }}</span>
            <span class="add-row-shift">
              <span class="shift-badge" :class="'shift-' + currentShift.toLowerCase()">
                {{ currentShift }}
              </span>
            </span>
            <input
              type="text"
              v-model="formData.location"
              ref="locationInput"
              placeholder="位置"
              class="add-input"
              @keydown.enter.prevent="focusNext('location')"
            />
            <input
              type="text"
              v-model="formData.partNo"
              ref="partNoInput"
              placeholder="Part no *"
              class="add-input"
              @keyup="toUpperCase('partNo')"
              @keydown.enter.prevent="focusNext('partNo')"
            />
            <input
              type="text"
              v-model="formData.grn"
              ref="grnInput"
              placeholder="GRN"
              class="add-input"
              @keyup="toUpperCase('grn')"
              @keydown.enter.prevent="focusNext('qty')"
            />
            <input
              type="text"
              v-model.number="formData.qty"
              ref="qtyInput"
              placeholder="QTY"
              class="add-input add-input-qty"
              @keydown.enter.prevent="submitAndContinue"
            />
            <span class="add-row-time">{{ currentTime }}</span>
            <span class="add-row-recorder">{{ currentRecorder }}</span>
            <div class="add-row-actions">
              <button type="button" class="btn-add-confirm" @click="submitAddRow" title="确认登记">✓</button>
              <button type="button" class="btn-add-cancel" @click="cancelAddRow" title="取消">✕</button>
            </div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>班次</th>
              <th>Part no</th>
              <th>GRN</th>
              <th>QTY</th>
              <th>位置</th>
              <th>问题描述</th>
              <th>登记时间</th>
              <th>退料地点</th>
              <th>记录人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in registrations" :key="item.id">
              <td>{{ formatDate(item.registrationDate) }}</td>
              <td>
                <span class="shift-badge" :class="'shift-' + item.shift.toLowerCase()">
                  {{ item.shift }}
                </span>
              </td>
              <td class="scanner-cell">{{ item.partNo }}</td>
              <td class="scanner-cell">{{ item.grn || '-' }}</td>
              <td class="scanner-cell">{{ item.qty }}</td>
              <td>{{ item.location || '-' }}</td>
              <td>
                <select
                  v-model="editingData[item.id!]"
                  class="edit-select"
                  @change="onTableProblemDescriptionChange(item.id!)"
                >
                  <option value="">-</option>
                  <option v-for="type in differenceTypes" :key="type.id" :value="type.differenceType">
                    {{ type.differenceType }}
                  </option>
                </select>
              </td>
              <td>{{ formatTime(item.registrationTime) }}</td>
              <td>{{ item.returnLocation || '-' }}</td>
              <td>{{ item.recorder }}</td>
              <td style="min-width: 80px;">
                <button class="btn-icon" @click="showEditDialog(item)" title="编辑">✏️</button>
                <span style="margin: 0 2px;"></span>
                <button class="btn-icon btn-delete" @click="confirmDelete(item)" title="删除">🗑️</button>
              </td>
            </tr>
            <tr v-if="registrations.length === 0 && !showAddRow">
              <td colspan="11" class="empty-row">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-info">
          共 {{ pagination.total }} 条记录，第 {{ pagination.page }} / {{ totalPages }} 页
        </span>
        <div class="pagination-controls">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >
            上一页
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            class="btn btn-secondary btn-sm"
            :class="{ active: page === pagination.page, 'page-btn': page !== '...' }"
            :disabled="page === '...'"
            @click="page !== '...' && changePage(Number(page))"
          >
            {{ page }}
          </button>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page >= totalPages"
            @click="changePage(pagination.page + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <!-- 编辑对话框 -->
      <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
        <div class="dialog">
          <div class="dialog-header">
            <h3>编辑登记记录</h3>
            <button class="dialog-close" @click="dialogVisible = false">×</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>Part no *</label>
              <input type="text" v-model="formData.partNo" class="dialog-input" />
            </div>
            <div class="form-group">
              <label>GRN</label>
              <input type="text" v-model="formData.grn" class="dialog-input" />
            </div>
            <div class="form-group">
              <label>数量</label>
              <input type="number" v-model.number="formData.qty" class="dialog-input" />
            </div>
            <div class="form-group">
              <label>位置</label>
              <input type="text" v-model="formData.location" class="dialog-input" />
            </div>
            <div class="form-group">
              <label>问题描述</label>
              <select v-model="formData.problemDescription" class="dialog-input" @change="onProblemDescriptionChange">
                <option value="">-</option>
                <option v-for="type in differenceTypes" :key="type.id" :value="type.differenceType">
                  {{ type.differenceType }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>退料地点</label>
              <input type="text" v-model="formData.returnLocation" class="dialog-input" readonly />
            </div>
            <div class="dialog-actions">
              <button type="button" class="btn btn-secondary" @click="dialogVisible = false">取消</button>
              <button type="button" class="btn btn-primary" @click="saveEdit">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import {
  getK2DiffRegistrations,
  getK2DiffStats,
  getK2DiffTypeStats,
  createK2DiffRegistration,
  updateK2DiffRegistration,
  deleteK2DiffRegistration,
  sendK2DiffBulkNotification,
  getK2DiffConfigs,
  K2_DIFF_CONFIG_KEYS,
  type K2DiffRegistration,
  type K2DiffStats,
  type K2DiffQueryParams
} from '../api/k2Diff';
import { clearRequestCache } from '../utils/request';

// 获取本地日期字符串 (YYYY-MM-DD)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============== 类型定义 ==============

// API 响应类型
interface ApiResponse<T> {
  items?: T[];
  total?: number;
  data?: T[];
}

// 图表数据类型
interface ChartDataItem {
  name: string;
  value: number;
}

// 差异类型列表（从配置解析）
interface DifferenceTypeItem {
  id: number;
  differenceType: string;
  returnLocation: string;
}

// 配置数据（差异类型与退料地点一对一关联）
interface ConfigItem {
  id: number;
  differenceType: string;
  returnLocation: string;
}

// ============== 图表配置常量 ==============

// 图表颜色配置
const CHART_COLORS = ['#0066CC', '#722ED1', '#52C41A', '#FAAD14', '#F5222D', '#13C2C2', '#2F54EB', '#EB2F96'] as const;

// 公共图表选项生成器
const createPieChartOption = (
  data: ChartDataItem[],
  type: 'donut' | 'pie' = 'pie',
  radius: string | [string, string] = '65%'
): echarts.EChartsOption => {
  const chartData = data.length > 0 ? data : [{ name: '暂无数据', value: 0 }];
  const actualRadius = type === 'donut' ? ['45%', '70%'] : radius;

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 5,
      top: 'center',
      textStyle: { fontSize: 11 },
      formatter: (name: string) => {
        const item = chartData.find(d => d.name === name);
        return `${name}: ${item?.value || 0}`;
      }
    },
    series: [{
      type: 'pie',
      radius: actualRadius,
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: type === 'donut' ? 6 : 4,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        fontSize: 11,
        formatter: '{b}\n{c}'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      data: chartData,
      color: [...CHART_COLORS]
    }]
  };
};

// ============== 表单提交逻辑 ==============

// 统一的表单提交数据构建
interface SubmitFormData {
  partNo: string;
  grn?: string;
  qty: number;
  location?: string;
  problemDescription?: string;
  returnLocation?: string;
}

// 表单验证
const validateForm = (): { valid: boolean; qty: number; message?: string } => {
  if (!formData.partNo.trim()) {
    return { valid: false, qty: 0, message: '请输入 Part no' };
  }

  let qty = formData.qty;
  if (isNaN(qty) || qty < 0) {
    qty = 0;
  }
  if (qty > 999999) {
    return { valid: false, qty, message: '数量超出范围，请检查' };
  }

  return { valid: true, qty };
};

// 构建提交数据
const buildSubmitData = (qty: number): SubmitFormData => ({
  partNo: formData.partNo.trim(),
  grn: formData.grn.trim() || undefined,
  qty,
  location: formData.location.trim() || undefined
});
const stats = reactive<K2DiffStats>({
  today: { total: 0, shiftA: 0, shiftC: 0 },
  last7Days: { total: 0, shiftA: 0, shiftC: 0 },
  daily: []
});

// 近14天数据
const last14Days = computed(() => {
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatLocalDate(date);
    const dayData = stats.daily.find(d => d.date === dateStr);
    days.push({
      date: dateStr,
      label: (date.getMonth() + 1) + '/' + date.getDate(),
      shiftA: dayData?.shiftA || 0,
      shiftC: dayData?.shiftC || 0
    });
  }
  return days;
});

// 图表引用
const donutChartRef = ref<HTMLDivElement | null>(null);
const pieChartRef = ref<HTMLDivElement | null>(null);
const barChartRef = ref<HTMLDivElement | null>(null);

// 图表实例
let donutChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

// 渲染环形图（根据筛选条件统计类型分布，使用后端聚合）
const renderDonutChart = async () => {
  if (!donutChartRef.value) {
    console.log('[Chart Debug] donutChartRef not ready');
    return;
  }

  if (!donutChart) {
    donutChart = echarts.init(donutChartRef.value);
  }

  // 根据搜索条件获取日期范围
  const startDate = searchParams.startDate || currentDate.value;
  const endDate = searchParams.endDate || currentDate.value;
  console.log('[Chart Debug] renderDonutChart dates:', startDate, '-', endDate);

  try {
    const typeStats = await getK2DiffTypeStats(startDate, endDate);
    console.log('[Chart Debug] getK2DiffTypeStats returned:', typeStats);
    const chartData: ChartDataItem[] = (typeStats || []).map(item => ({
      name: item.name || '未分类',
      value: item.value
    }));
    console.log('[Chart Debug] chartData:', chartData);
    donutChart.setOption(createPieChartOption(chartData, 'donut'));
  } catch (error) {
    console.error('获取类型统计失败:', error);
  }
};

// 渲染饼图（近7天类型分布，使用后端聚合）
const renderPieChart = async () => {
  if (!pieChartRef.value) {
    console.log('[Chart Debug] pieChartRef not ready');
    return;
  }

  if (!pieChart) {
    pieChart = echarts.init(pieChartRef.value);
  }

  // 近7天日期范围
  const today = new Date();
  const endDate = formatLocalDate(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);
  console.log('[Chart Debug] renderPieChart dates:', formatLocalDate(startDate), '-', endDate);

  try {
    const typeStats = await getK2DiffTypeStats(formatLocalDate(startDate), endDate);
    console.log('[Chart Debug] getK2DiffTypeStats (pie) returned:', typeStats);
    const chartData: ChartDataItem[] = (typeStats || []).map(item => ({
      name: item.name || '未分类',
      value: item.value
    }));
    console.log('[Chart Debug] pie chartData:', chartData);
    pieChart.setOption(createPieChartOption(chartData, 'pie'));
  } catch (error) {
    console.error('获取差异类型统计失败:', error);
  }
};

// 渲染柱状图（近14天趋势 - 每日总数）
const renderBarChart = async () => {
  if (!barChartRef.value) return;

  if (!barChart) {
    barChart = echarts.init(barChartRef.value);
  }

  // 生成近14天日期数组
  const days = last14Days.value;
  const xAxisData = days.map(d => d.label);
  const barData = days.map(d => d.shiftA + d.shiftC);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = params as { axisValue: string; value: number }[];
        const first = p[0];
        if (!first) return '';
        return `${first.axisValue}<br/>总数: ${first.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '20px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
      name: '数量'
    },
    series: [{
      type: 'bar',
      data: barData,
      barWidth: '50%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#0066CC' },
          { offset: 1, color: '#4096ff' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 11,
        color: '#333'
      }
    }]
  };

  barChart.setOption(option);
};

// 渲染所有图表
const renderAllCharts = async () => {
  renderDonutChart();
  renderPieChart();
  await renderBarChart();
};

// 窗口大小变化时重新渲染图表
const handleResize = () => {
  donutChart?.resize();
  pieChart?.resize();
  barChart?.resize();
};

// 登记记录列表
const registrations = ref<K2DiffRegistration[]>([]);

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize) || 1);

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = pagination.page;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    }
  }
  return pages;
});

// 搜索参数
const searchParams = reactive({
  startDate: '',
  endDate: '',
  partNo: '',
  grn: '',
  shift: ''
});

// 初始化搜索日期为今天
const initSearchDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  searchParams.startDate = today;
  searchParams.endDate = today;
};

// 监听搜索参数变化，重新渲染环形图
watch(
  () => [searchParams.startDate, searchParams.endDate, searchParams.partNo, searchParams.shift],
  () => {
    renderDonutChart();
  }
);

// 配置数据（差异类型与退料地点一对一关联）
interface ConfigItem {
  id: number;
  differenceType: string;
  returnLocation: string;
}

// API 返回的配置项类型
interface ApiConfigItem {
  configKey: string;
  configValue: string;
}

const configList = ref<ConfigItem[]>([]);
const differenceTypes = computed(() => configList.value);
const returnLocations = computed(() => configList.value);

// 对话框
const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);

// 表单数据
const formData = reactive({
  partNo: '',
  grn: '',
  qty: 0,
  location: '',
  problemDescription: '',
  returnLocation: ''
});

// 表格行编辑数据
const editingData = reactive<Record<number, string>>({});

// 输入框引用
const partNoInput = ref<HTMLInputElement | null>(null);
const locationInput = ref<HTMLInputElement | null>(null);
const grnInput = ref<HTMLInputElement | null>(null);
const qtyInput = ref<HTMLInputElement | null>(null);
const problemDescriptionInput = ref<HTMLInputElement | null>(null);

// 扫码焦点切换（延迟确保扫码枪字符输入完成）
const focusNext = (field: string) => {
  // 扫码枪输入很快，增加延迟确保所有字符都输入完成
  setTimeout(() => {
    // 位置扫描后自动加上K前缀
    if (field === 'location') {
      const loc = formData.location.trim();
      if (loc && !loc.toUpperCase().startsWith('K')) {
        formData.location = 'K' + loc;
      }
    }

    const focusMap: Record<string, HTMLInputElement | null> = {
      location: locationInput.value,
      partNo: partNoInput.value,
      grn: grnInput.value,
      qty: qtyInput.value,
    };
    const nextField: Record<string, string | undefined> = {
      location: 'partNo',
      partNo: 'grn',
      grn: 'qty'
    };
    const next = nextField[field];
    if (next && focusMap[next]) {
      focusMap[next]?.focus();
      focusMap[next]?.select();
    }
  }, 300); // 增加延迟到300ms，确保扫码枪字符输入完成
};

// 选择问题描述后自动带出退料地点
const onProblemDescriptionChange = () => {
  if (!formData.problemDescription) {
    formData.returnLocation = '';
    return;
  }
  const selected = configList.value.find(
    (item) => item.differenceType === formData.problemDescription
  );
  formData.returnLocation = selected?.returnLocation || '';
};

// 表格行问题描述变更
const onTableProblemDescriptionChange = async (id: number) => {
  const problemDescription = editingData[id];
  const selected = configList.value.find(
    (item) => item.differenceType === problemDescription
  );
  const returnLocation = selected?.returnLocation || '';

  try {
    await updateK2DiffRegistration(id, {
      problemDescription: problemDescription || undefined,
      returnLocation: returnLocation || undefined
    });
    ElMessage.success('更新成功');
    // 清除请求缓存并刷新列表
    clearRequestCache();
    await loadRegistrations();
  } catch (error) {
    console.error('更新失败:', error);
    ElMessage.error('更新失败');
  }
};

// 是否显示新增行
const showAddRow = ref(false);

// 取消新增行
const cancelAddRow = () => {
  showAddRow.value = false;
  resetForm();
};

// 提交新增行
const submitAddRow = async () => {
  const validation = validateForm();
  if (!validation.valid) {
    ElMessage.warning(validation.message);
    if (validation.message?.includes('范围')) {
      qtyInput.value?.focus();
    }
    return;
  }

  try {
    const data = buildSubmitData(validation.qty);
    await createK2DiffRegistration(data);
    ElMessage.success('登记成功');
    showAddRow.value = false;
    resetForm();
    // 清除请求缓存并强制刷新列表
    clearRequestCache();
    await loadRegistrations();
    // 更新统计数据
    loadStats();
  } catch (error) {
    console.error('登记失败:', error);
    ElMessage.error((error as Error)?.message || '登记失败');
  }
};

// 自动大写（扫描枪输入时同步转换）
const toUpperCase = (field: 'partNo' | 'grn') => {
  const val = formData[field].toUpperCase();
  formData[field] = val;
};

// 扫描模式：提交当前行并继续下一行
const submitAndContinue = async () => {
  const validation = validateForm();
  if (!validation.valid) {
    ElMessage.warning(validation.message);
    if (validation.message?.includes('Part no')) {
      partNoInput.value?.focus();
    }
    return;
  }

  if (validation.message?.includes('范围')) {
    qtyInput.value?.focus();
    return;
  }

  try {
    const data = buildSubmitData(validation.qty);
    await createK2DiffRegistration(data);
    ElMessage.success('登记成功');
    // 重置表单但保持新增行显示，准备下一行扫描
    formData.partNo = '';
    formData.grn = '';
    formData.qty = 0;
    formData.location = '';
    // 清除请求缓存并强制刷新列表
    clearRequestCache();
    await loadRegistrations();
    // 重置到第一页以显示最新记录
    pagination.page = 1;
    // 更新统计数据
    loadStats();
    // 聚焦到位置输入框
    locationInput.value?.focus();
  } catch (error) {
    console.error('登记失败:', error);
    ElMessage.error((error as Error)?.message || '登记失败');
  }
};

// 当前用户信息
const currentDate = ref('');
const currentTime = ref('');
const currentShift = ref('');
const currentRecorder = ref('');

// 计算当前班次
const calculateShift = () => {
  const now = new Date();
  const hour = now.getHours();
  currentShift.value = (hour >= 7 && hour < 19) ? 'A' : 'C';
};

// 更新当前时间（使用本地时间）
const updateCurrentTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  currentDate.value = `${year}-${month}-${day}`;
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  calculateShift();
};

// 格式化时间
const formatTime = (timeStr: string | undefined) => {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化日期显示
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  // 如果已经是短格式（YYYY-MM-DD），直接返回
  if (dateStr.length === 10) return dateStr;
  // 否则截取日期部分
  return dateStr.split('T')[0];
};

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await getK2DiffStats();
    stats.today = data.today;
    stats.last7Days = data.last7Days;
    stats.daily = data.daily || [];
    // 更新图表
    renderAllCharts();
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 加载登记记录
const loadRegistrations = async () => {
  try {
    const params: K2DiffQueryParams = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };

    // 默认显示今日数据，支持搜索覆盖
    if (searchParams.startDate) {
      params.startDate = searchParams.startDate;
    } else {
      params.startDate = currentDate.value;
    }
    if (searchParams.endDate) {
      params.endDate = searchParams.endDate;
    } else {
      params.endDate = currentDate.value;
    }

    if (searchParams.partNo) params.partNo = searchParams.partNo;
    if (searchParams.grn) params.grn = searchParams.grn;
    if (searchParams.shift) params.shift = searchParams.shift;

    const response = await getK2DiffRegistrations(params);
    registrations.value = response.items || [];
    // 初始化表格行编辑数据
    registrations.value.forEach((item) => {
      editingData[item.id!] = item.problemDescription || '';
    });
    pagination.total = response.total || 0;
  } catch (error) {
    console.error('加载登记记录失败:', error);
    ElMessage.error('加载数据失败');
  }
};

// 加载配置
const loadConfig = async () => {
  try {
    const response = await getK2DiffConfigs();
    // API 返回格式: { code, message, data: [...] }
    const configs = (response as ApiResponse<ConfigItem>).data || response || [];

    configList.value = [];
    (configs as ApiConfigItem[]).forEach((item) => {
      if (item.configKey === K2_DIFF_CONFIG_KEYS.DIFFERENCE_TYPES && item.configValue) {
        try {
          const parsed = JSON.parse(item.configValue);
          configList.value = parsed.map((p: any) => ({
            id: p.id || 0,
            differenceType: p.differenceType || p.name || '',
            returnLocation: p.returnLocation || ''
          }));
        } catch (e) {
          console.error('解析配置失败:', e);
          configList.value = [];
        }
      }
    });
    console.log('加载配置成功:', configList.value.length, '条');
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

// 切换分页
const changePage = (page: number) => {
  pagination.page = page;
  loadRegistrations();
};

// 重置表单
const resetForm = () => {
  formData.partNo = '';
  formData.grn = '';
  formData.qty = 0;
  formData.location = '';
  formData.problemDescription = '';
  formData.returnLocation = '';
};

// 显示新增 - 聚焦到扫码区
const showAddDialog = async () => {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  showAddRow.value = true;
  // 滚动到表格顶部并聚焦位置输入框
  await nextTick();
  const tableWrapper = document.querySelector('.table-wrapper');
  tableWrapper?.scrollIntoView({ behavior: 'smooth' });
  locationInput.value?.focus();
};

// 显示编辑对话框（保留弹窗编辑，因为编辑不频繁）
const showEditDialog = async (item: K2DiffRegistration) => {
  isEdit.value = true;
  editingId.value = item.id || null;
  formData.partNo = item.partNo;
  formData.grn = item.grn || '';
  formData.qty = item.qty;
  formData.location = item.location || '';
  formData.problemDescription = item.problemDescription || '';
  formData.returnLocation = item.returnLocation || '';
  dialogVisible.value = true;

  await nextTick();
  partNoInput.value?.focus();
};

// 编辑保存
const saveEdit = async () => {
  if (!formData.partNo.trim()) {
    ElMessage.warning('请输入 Part no');
    return;
  }

  if (!editingId.value) {
    ElMessage.error('编辑ID不存在');
    return;
  }

  const finalReturnLocation = formData.returnLocation;

  try {
    await updateK2DiffRegistration(editingId.value, {
      partNo: formData.partNo,
      grn: formData.grn,
      qty: formData.qty,
      location: formData.location,
      problemDescription: formData.problemDescription,
      returnLocation: finalReturnLocation
    });
    ElMessage.success('更新成功');
    dialogVisible.value = false;
    clearRequestCache(); // 清除缓存，确保重新获取最新数据
    loadRegistrations();
    loadStats();
  } catch (error) {
    console.error('更新失败:', error);
    ElMessage.error('操作失败');
  }
};

// 确认删除
const confirmDelete = async (item: K2DiffRegistration) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条登记记录吗？\n日期: ${formatDate(item.registrationDate)}\nPart no: ${item.partNo}`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await deleteK2DiffRegistration(item.id!);
    ElMessage.success('删除成功');
    clearRequestCache(); // 清除缓存，确保重新获取最新数据
    loadRegistrations();
    loadStats();
  } catch (error) {
    if ((error as string) !== 'cancel') {
      console.error('删除失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

// 发送邮件通知（合并当前筛选条件下的所有记录为一封邮件）
const sendEmail = async () => {
  if (registrations.value.length === 0) {
    ElMessage.warning('当前没有登记记录');
    return;
  }

  try {
    const totalCount = registrations.value.length;
    await ElMessageBox.confirm(
      `确定要发送邮件通知吗？\n将汇总发送 ${totalCount} 条记录\n日期范围: ${searchParams.startDate || '不限'} ~ ${searchParams.endDate || '不限'}`,
      '发送邮件确认',
      {
        confirmButtonText: '发送',
        cancelButtonText: '取消',
        type: 'info'
      }
    );

    // 收集所有记录的ID
    const ids = registrations.value.map(item => item.id!);

    // 批量发送，所有记录合并为一封邮件
    const response = await sendK2DiffBulkNotification(ids);
    console.log('邮件响应:', response);
    if (response?.mailtoLink) {
      // 打开邮件客户端
      window.open(response.mailtoLink, '_self');
    }
  } catch (error) {
    if ((error as string) !== 'cancel') {
      console.error('发送邮件失败:', error);
      ElMessage.error('发送邮件失败');
    }
  }
};

// 获取当前用户信息
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      currentRecorder.value = user.oldEmployeeId || user.username || 'Unknown';
    } catch {
      currentRecorder.value = 'Unknown';
    }
  } else {
    currentRecorder.value = 'Unknown';
  }
};

// 初始化
onMounted(() => {
  getCurrentUser();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  initSearchDate(); // 初始化搜索日期为今天
  loadStats();
  loadRegistrations();
  loadConfig();

  // 渲染图表
  setTimeout(renderAllCharts, 100);
  window.addEventListener('resize', handleResize);

  // 扫码枪全局监听（处理扫码枪在任意位置按Enter的情况）
  document.addEventListener('keydown', handleGlobalKeydown);
});

// 扫码枪全局键盘监听
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (!showAddRow.value) return;

  if (e.key === 'Enter' || e.key === 'NumpadEnter') {
    // 找出当前焦点的输入框
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return;

    const classList = activeElement.classList || activeElement.className;
    const className = typeof classList === 'object' ?
      (classList as DOMTokenList).value : String(classList);

    if (className.includes('add-input')) {
      // 根据占位符判断是哪个输入框
      const placeholder = activeElement.getAttribute('placeholder') || '';
      if (placeholder.includes('Part no')) {
        e.preventDefault();
        focusNext('partNo');
      } else if (placeholder.includes('GRN')) {
        e.preventDefault();
        focusNext('grn');
      }
    }
  }
};

// 清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', handleGlobalKeydown);
  donutChart?.dispose();
  pieChart?.dispose();
  barChart?.dispose();
});
</script>

<style scoped>
.k2-diff-registration-container {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding-bottom: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

/* 统计卡片区域 */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.chart-card {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.chart-container {
  width: 100%;
}

.stat-summary {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
}

.shift-a {
  color: #0066CC;
  font-weight: 500;
}

.shift-c {
  color: #722ED1;
  font-weight: 500;
}

/* 图表 */
.week-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 20px 0;
  gap: 16px;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 80px;
}

.bar-label {
  font-size: 12px;
  color: #6B7280;
  margin-bottom: 8px;
}

/* 表格卡片 */
.table-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 16px;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
}

.card-body {
  padding: 24px;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #FAFAFA;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  min-width: 140px;
}

.search-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

/* 数据表格 */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead {
  background-color: #52C41A;
  color: #FFFFFF;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  white-space: nowrap;
}

.data-table th {
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* 扫描输入支持 */
.scanner-cell {
  max-width: 150px;
  word-break: break-all;
  font-family: monospace;
  font-size: 13px;
}

/* 班次标签 */
.shift-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.shift-badge.shift-a {
  background-color: #E6F0FF;
  color: #0066CC;
}

.shift-badge.shift-c {
  background-color: #F3E8FF;
  color: #722ED1;
}

.empty-row {
  text-align: center;
  color: #9CA3AF;
  padding: 40px !important;
  font-style: italic;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background-color: #FAFAFA;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

.page-btn.active {
  background-color: #0066CC !important;
  color: #FFFFFF !important;
  border-color: #0066CC !important;
}

/* 按钮 */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary {
  background-color: #0066CC;
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: #0052A3;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  font-size: 14px;
  transition: all 0.2s;
  position: relative;
  z-index: 1;
}

.btn-icon:hover {
  background-color: #E5E7EB;
}

.btn-icon.btn-delete:hover {
  background-color: #FEE2E2;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #FFFFFF;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background: #F9FAFB;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6B7280;
  padding: 0;
  line-height: 1;
}

.dialog-close:hover {
  color: #111827;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.dialog-input[readonly] {
  background-color: #F3F4F6;
  color: #6B7280;
  cursor: not-allowed;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background: #FAFAFA;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.required {
  color: #FF4D4F;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-input.disabled {
  background-color: #F3F4F6;
  color: #6B7280;
  cursor: not-allowed;
}

/* 扫描输入样式 */
.scanner-input {
  font-family: monospace;
  font-size: 16px;
  letter-spacing: 1px;
}

/* 退料地点自动显示 */
.return-location-display {
  padding: 10px 12px;
  background-color: #F0F9FF;
  border: 1px solid #0066CC;
  border-radius: 8px;
  color: #0066CC;
  font-weight: 500;
  font-size: 14px;
}

/* 新增行样式 */
.add-row {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 2px dashed #F59E0B;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.add-row-cells {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-row-cells > * {
  flex-shrink: 0;
}

.add-row-date {
  font-size: 14px;
  color: #374151;
  min-width: 80px;
}

.add-row-shift {
  min-width: 50px;
}

.add-row-time {
  font-size: 13px;
  color: #6B7280;
  min-width: 70px;
}

.add-row-recorder {
  font-size: 14px;
  color: #374151;
  min-width: 60px;
}

.add-input {
  padding: 8px 10px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  min-width: 80px;
}

.add-input:focus {
  outline: none;
  border-color: #F59E0B;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.add-input-qty {
  width: 70px;
  text-align: center;
}

.add-select {
  min-width: 120px;
  cursor: pointer;
}

/* 表格行编辑下拉框 */
.edit-select {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  outline: none;
}

.edit-select:focus {
  border-color: #F59E0B;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.add-input-disabled {
  background-color: #F3F4F6;
  color: #6B7280;
  cursor: not-allowed;
}

.add-row-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.btn-add-confirm {
  padding: 8px 16px;
  background: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-confirm:hover {
  background: #047857;
}

.btn-add-cancel {
  padding: 8px 16px;
  background: #6B7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-cancel:hover {
  background: #4B5563;
}

/* 扫码录入区域 */
.scanner-section {
  padding: 20px;
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
  border-top: 2px solid #0066CC;
  margin-top: 0;
}

.scanner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.scanner-title {
  font-size: 16px;
  font-weight: 600;
  color: #0066CC;
}

.scanner-info {
  font-size: 14px;
  color: #6B7280;
  background: white;
  padding: 4px 12px;
  border-radius: 16px;
}

.scanner-form {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.1);
}

.scanner-row {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.scanner-row:last-child {
  margin-bottom: 0;
}

.scanner-field {
  display: flex;
  flex-direction: column;
}

.scanner-field.flex-1 {
  flex: 1;
}

.scanner-field label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.scanner-field .required {
  color: #F5222D;
}

.scanner-input {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  min-width: 150px;
}

.scanner-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.scanner-input-disabled {
  background-color: #F9FAFB;
  color: #6B7280;
  cursor: not-allowed;
}

.scanner-field.scanner-action {
  align-self: flex-end;
}

.btn-scanner {
  padding: 10px 24px;
  font-size: 15px;
  white-space: nowrap;
}
</style>
