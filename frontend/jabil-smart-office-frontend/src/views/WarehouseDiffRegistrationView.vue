<template>
  <div class="warehouse-diff-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">仓储管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">差异登记</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="loadAll">🔄 刷新</button>
      </div>
    </div>

    <!-- 图表区域 - 三列并排 -->
    <div class="charts-row">
      <!-- 差异类型分布饼图 -->
      <div class="chart-card">
        <div class="chart-title">📊 差异类型分布</div>
        <div class="chart-header">
          <div class="chart-tabs">
            <button
              v-for="p in ['day', 'week', 'month', 'year']"
              :key="p"
              :class="['tab-btn', { active: typePeriod === p }]"
              @click="typePeriod = p as 'day' | 'week' | 'month' | 'year'; renderTypeChart()"
            >{{ p === 'day' ? '天' : p === 'week' ? '周' : p === 'month' ? '月' : '年' }}</button>
          </div>
          <div class="chart-filter" v-if="typePeriod === 'week'">
            <el-date-picker
              v-model="typeWeekDate"
              type="week"
              format="YYYY-WW周"
              placeholder="选择周"
              :clearable="false"
              @change="renderTypeChart"
            />
          </div>
          <div class="chart-filter" v-else-if="typePeriod === 'month'">
            <el-date-picker
              v-model="typeMonthDate"
              type="month"
              format="YYYY-MM"
              placeholder="选择月"
              :clearable="false"
              @change="renderTypeChart"
            />
          </div>
          <div class="chart-filter" v-else-if="typePeriod === 'year'">
            <el-date-picker
              v-model="typeYearDate"
              type="year"
              format="YYYY"
              placeholder="选择年"
              :clearable="false"
              @change="renderTypeChart"
            />
          </div>
        </div>
        <div ref="typeChartRef" class="chart-container"></div>
      </div>

      <!-- PIC排名TOP10 -->
      <div class="chart-card">
        <div class="chart-title">👤 PIC排名TOP10</div>
        <div class="chart-header">
          <div class="chart-tabs">
            <button
              v-for="p in ['day', 'week', 'month', 'year']"
              :key="p"
              :class="['tab-btn', { active: picPeriod === p }]"
              @click="picPeriod = p as 'day' | 'week' | 'month' | 'year'; loadPicStats()"
            >{{ p === 'day' ? '天' : p === 'week' ? '周' : p === 'month' ? '月' : '年' }}</button>
          </div>
          <div class="chart-filter" v-if="picPeriod === 'week'">
            <el-date-picker
              v-model="picWeekDate"
              type="week"
              format="YYYY-WW周"
              placeholder="选择周"
              :clearable="false"
              @change="loadPicStats"
            />
          </div>
          <div class="chart-filter" v-else-if="picPeriod === 'month'">
            <el-date-picker
              v-model="picMonthDate"
              type="month"
              format="YYYY-MM"
              placeholder="选择月"
              :clearable="false"
              @change="loadPicStats"
            />
          </div>
          <div class="chart-filter" v-else-if="picPeriod === 'year'">
            <el-date-picker
              v-model="picYearDate"
              type="year"
              format="YYYY"
              placeholder="选择年"
              :clearable="false"
              @change="loadPicStats"
            />
          </div>
        </div>
        <div ref="picChartRef" class="chart-container"></div>
      </div>

      <!-- 趋势图 -->
      <div class="chart-card">
        <div class="chart-title">📈 差异趋势</div>
        <div class="chart-tabs">
          <button
            v-for="p in ['day', 'week', 'month', 'year']"
            :key="p"
            :class="['tab-btn', { active: trendPeriod === p }]"
            @click="trendPeriod = p as 'day' | 'week' | 'month' | 'year'; loadTrendStats()"
          >{{ p === 'day' ? '按天' : p === 'week' ? '按周' : p === 'month' ? '按月' : p === 'year' ? '按年' : '' }}</button>
        </div>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 数据表格卡片 -->
    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📋 登记记录</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="handleExport">📥 导出</button>
          <button type="button" class="btn btn-secondary" @click="showImportModal = true">📤 导入</button>
          <button type="button" class="btn btn-primary" @click="openAddDialog">➕ 新增登记</button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-item">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
          />
        </div>
        <div class="search-item">
          <el-select v-model="searchParams.diffType" placeholder="差异类型" clearable @change="handleSearch">
            <el-option v-for="type in diffTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </div>
        <div class="search-item">
          <input type="text" v-model="searchParams.diffPic" placeholder="差异PIC" @keyup.enter="handleSearch" class="search-input" />
        </div>
        <div class="search-item">
          <input type="text" v-model="searchParams.search" placeholder="搜索P/N/差异/ID" @keyup.enter="handleSearch" class="search-input" />
        </div>
        <button type="button" class="btn btn-primary" @click="handleSearch">🔍 搜索</button>
        <button type="button" class="btn btn-secondary" @click="resetSearch">重置</button>
        <!-- 图表筛选提示 -->
        <div class="filter-tip" v-if="chartFilterActive">
          <span class="filter-tag">
            图表筛选: {{ chartFilterText }}
            <button class="filter-clear" @click="clearChartFilter">✕</button>
          </span>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" :class="{ 'sort-active': sortField === 'registrationDate' }" @click="toggleSort('registrationDate')">
                日期 <span class="sort-icon">{{ getSortIcon('registrationDate') }}</span>
              </th>
              <th class="sortable" :class="{ 'sort-active': sortField === 'partNo' }" @click="toggleSort('partNo')">
                P/N <span class="sort-icon">{{ getSortIcon('partNo') }}</span>
              </th>
              <th class="sortable" :class="{ 'sort-active': sortField === 'qty' }" @click="toggleSort('qty')">
                Qty <span class="sort-icon">{{ getSortIcon('qty') }}</span>
              </th>
              <th class="sortable" :class="{ 'sort-active': sortField === 'diffType' }" @click="toggleSort('diffType')">
                差异类型 <span class="sort-icon">{{ getSortIcon('diffType') }}</span>
              </th>
              <th class="sortable" :class="{ 'sort-active': sortField === 'materialId' }" @click="toggleSort('materialId')">
                ID <span class="sort-icon">{{ getSortIcon('materialId') }}</span>
              </th>
              <th class="sortable" :class="{ 'sort-active': sortField === 'diffPic' }" @click="toggleSort('diffPic')">
                差异PIC <span class="sort-icon">{{ getSortIcon('diffPic') }}</span>
              </th>
              <th>处理结果</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in registrations" :key="item.id">
              <td>{{ item.registrationDate }}</td>
              <td class="mono">{{ item.partNo }}</td>
              <td>{{ item.qty }}</td>
              <td class="type-cell"><span :style="getTypeTagStyle(item.diffType || '')">{{ item.diffType || '-' }}</span></td>
              <td class="mono">{{ item.materialId || '-' }}</td>
              <td class="pic-cell">{{ item.diffPic || '-' }}</td>
              <td class="result-cell">{{ item.handlingResult || '-' }}</td>
              <td class="remarks-cell">{{ item.remarks || '-' }}</td>
              <td class="action-cell">
                <button class="action-btn edit" @click="openEditDialog(item)" title="编辑">✏️</button>
                <button class="action-btn delete" @click="confirmDelete(item)" title="删除">🗑️</button>
              </td>
            </tr>
            <tr v-if="registrations.length === 0">
              <td colspan="9" class="empty-cell">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-info">共 {{ pagination.total }} 条记录</span>
        <div class="pagination-controls">
          <button class="btn btn-sm btn-secondary" :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">上一页</button>
          <button
            v-for="page in visiblePages"
            :key="page"
            :class="['btn btn-sm', { 'btn-primary': page === pagination.page, 'btn-secondary': page !== pagination.page }]"
            :disabled="page === '...'"
            @click="page !== '...' && changePage(Number(page))"
          >{{ page }}</button>
          <button class="btn btn-sm btn-secondary" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="showDialog = false">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>{{ isEdit ? '✏️ 编辑差异登记' : '➕ 新增差异登记' }}</h3>
          <button class="dialog-close" @click="showDialog = false">×</button>
        </div>

        <!-- 模式切换 -->
        <div v-if="!isEdit" class="dialog-tabs">
          <button :class="['dialog-tab', { active: !batchMode }]" @click="batchMode = false">📝 单条录入</button>
          <button :class="['dialog-tab', { active: batchMode }]" @click="batchMode = true">📋 批量粘贴</button>
        </div>

        <!-- 单条录入模式 -->
        <div v-if="!batchMode || isEdit" class="dialog-body">
          <div class="form-row">
            <div class="form-group">
              <label class="required">日期</label>
              <el-date-picker
                v-model="formData.registrationDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
              />
            </div>
            <div class="form-group">
              <label class="required">P/N *</label>
              <input type="text" v-model="formData.partNo" class="form-input" placeholder="请输入物料编号" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Qty</label>
              <input type="number" v-model.number="formData.qty" class="form-input" placeholder="数量" />
            </div>
            <div class="form-group">
              <label>差异类型</label>
              <el-select v-model="formData.diffType" placeholder="选择类型" clearable style="width: 100%">
                <el-option v-for="type in diffTypes" :key="type" :label="type" :value="type" />
              </el-select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>员工工号</label>
              <input
                type="text"
                v-model="formData.materialId"
                class="form-input"
                placeholder="填写后自动带出姓名"
                @blur="handleMaterialIdBlur"
              />
            </div>
            <div class="form-group">
              <label>差异PIC</label>
              <input type="text" v-model="formData.diffPic" class="form-input" placeholder="自动带出" readonly />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>处理结果</label>
              <input type="text" v-model="formData.handlingResult" class="form-input" placeholder="处理结果" />
            </div>
            <div class="form-group">
              <label>备注</label>
              <input type="text" v-model="formData.remarks" class="form-input" placeholder="备注信息" />
            </div>
          </div>
        </div>

        <!-- 批量粘贴模式 -->
        <div v-if="batchMode && !isEdit" class="dialog-body batch-body">
          <div class="batch-hint">
            💡 <strong>提示：</strong>直接复制Excel中的多行数据（无需选中整列），在此区域 <kbd>Ctrl+V</kbd> 粘贴即可
          </div>

          <!-- 粘贴区域 -->
          <div
            class="paste-area"
            :class="{ 'paste-active': pasteAreaFocused }"
            @focus="pasteAreaFocused = true"
            @blur="pasteAreaFocused = false"
            @paste="handleBatchPaste"
            tabindex="0"
          >
            <div v-if="batchRows.length === 0" class="paste-placeholder">
              点击此处或按 Ctrl+V 粘贴Excel数据...
            </div>
            <table v-else class="batch-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>P/N *</th>
                  <th>Qty</th>
                  <th>差异类型</th>
                  <th>员工工号</th>
                  <th>差异PIC</th>
                  <th>处理结果</th>
                  <th>备注</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in batchRows" :key="index">
                  <td><input type="text" v-model="row.registrationDate" class="batch-input" placeholder="日期" /></td>
                  <td><input type="text" v-model="row.partNo" class="batch-input" placeholder="P/N *" /></td>
                  <td><input type="number" v-model.number="row.qty" class="batch-input" style="width: 70px" /></td>
                  <td>
                    <select v-model="row.diffType" class="batch-select">
                      <option value="">请选择</option>
                      <option v-for="type in diffTypes" :key="type" :value="type">{{ type }}</option>
                    </select>
                  </td>
                  <td><input type="text" v-model="row.materialId" class="batch-input" placeholder="工号" @blur="autoFillPic(index)" /></td>
                  <td><input type="text" v-model="row.diffPic" class="batch-input" placeholder="自动带出" readonly /></td>
                  <td><input type="text" v-model="row.handlingResult" class="batch-input" placeholder="处理结果" /></td>
                  <td><input type="text" v-model="row.remarks" class="batch-input" placeholder="备注" /></td>
                  <td><button class="batch-delete" @click="removeBatchRow(index)">×</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="batch-actions">
            <button class="btn btn-secondary" @click="addBatchRow">➕ 添加行</button>
            <span class="batch-count">共 {{ batchRows.length }} 条</span>
            <button class="btn btn-secondary" @click="clearBatchRows">🗑️ 清空</button>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="showDialog = false">取消</button>
          <button class="btn btn-primary" @click="handleSave" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button v-if="batchMode && !isEdit && batchRows.length > 0" class="btn btn-success" @click="handleBatchSave" :disabled="saving">
            {{ saving ? '保存中...' : '批量保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 导入弹窗 -->
    <WarehouseDiffImportModal
      v-model:visible="showImportModal"
      @success="loadRegistrations"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import * as api from '../api/warehouseDiff';
import { downloadFile } from '../utils/excelUtils';
import WarehouseDiffImportModal from '../components/warehouseDiff/WarehouseDiffImportModal.vue';

// ========== 类型定义 ==========

interface Registration {
  id?: number;
  seqNo: number;
  registrationDate: string;
  partNo: string;
  qty: number;
  diffType?: string;
  materialId?: string;
  diffPic?: string;
  handlingResult?: string;
  remarks?: string;
}

interface Stats {
  today: number;
  week: number;
  month: number;
  pending: number;
}

// ========== 状态 ==========

const stats = reactive<Stats>({ today: 0, week: 0, month: 0, pending: 0 });
const registrations = ref<Registration[]>([]);
const diffTypes = ref<string[]>([]);
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });
const sortField = ref('registrationDate');
const sortOrder = ref<'asc' | 'desc'>('desc');

const toggleSort = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'desc';
  }
  pagination.page = 1;
  loadRegistrations();
};

const getSortIcon = (field: string) => {
  if (sortField.value !== field) return '⇅';
  return sortOrder.value === 'asc' ? '↑' : '↓';
};
const searchParams = reactive({ startDate: '', endDate: '', diffType: '', diffPic: '', search: '' });
const dateRange = ref<[string, string] | null>(null);
const showDialog = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const showImportModal = ref(false);

// 批量模式
const batchMode = ref(false);
const batchRows = ref<any[]>([]);
const pasteAreaFocused = ref(false);

const formData = reactive({
  registrationDate: '',
  partNo: '',
  qty: 0,
  diffType: '',
  materialId: '',
  diffPic: '',
  handlingResult: '',
  remarks: ''
});

// 图表相关
const typeChartRef = ref<HTMLDivElement | null>(null);
const picChartRef = ref<HTMLDivElement | null>(null);
const trendChartRef = ref<HTMLDivElement | null>(null);
let typeChart: echarts.ECharts | null = null;
let picChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;

const trendPeriod = ref<'day' | 'week' | 'month' | 'year'>('month');
const picPeriod = ref<'day' | 'week' | 'month' | 'year'>('month');
const typePeriod = ref<'day' | 'week' | 'month' | 'year'>('month');

// 周/月/年选择器日期
const typeWeekDate = ref<Date | null>(null);
const typeMonthDate = ref<Date | null>(null);
const typeYearDate = ref<Date | null>(null);
const picWeekDate = ref<Date | null>(null);
const picMonthDate = ref<Date | null>(null);
const picYearDate = ref<Date | null>(null);

// 图表筛选状态
const chartFilterActive = ref(false);
const chartFilterText = ref('');

// 清除图表筛选
const clearChartFilter = () => {
  searchParams.diffType = '';
  searchParams.diffPic = '';
  chartFilterActive.value = false;
  chartFilterText.value = '';
  pagination.page = 1;
  loadRegistrations();
};

// ========== 计算属性 ==========

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

// ========== 图表配置 ==========

const CHART_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

const createPieChartOption = (data: { name: string; value: number }[], title?: string) => {
  const chartData = data.length > 0 ? data : [{ name: '暂无数据', value: 0 }];
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, fontSize: 11, formatter: '{b}\n{c}' },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data: chartData,
      color: [...CHART_COLORS]
    }]
  };
};

// 点击饼图类型筛选
const handleTypeClick = (params: any) => {
  console.log('饼图点击事件触发, name:', params?.name, 'value:', params?.value);
  if (params && params.name && params.name !== '暂无数据') {
    console.log('应用类型筛选:', params.name);
    searchParams.diffType = params.name;
    searchParams.diffPic = '';
    chartFilterActive.value = true;
    chartFilterText.value = `差异类型: ${params.name}`;
    pagination.page = 1;
    loadRegistrations();
  } else {
    console.log('点击参数不满足条件, name:', params?.name);
  }
};

const createBarChartOption = (data: { name: string; value: number }[]) => {
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '10px', containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.name).reverse(),
      axisLabel: { fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: sortedData.map(d => d.value).reverse(),
      barWidth: '50%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#667eea' },
          { offset: 1, color: '#764ba2' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      label: { show: true, position: 'right', fontSize: 11 }
    }]
  };
};

// 点击柱状图PIC筛选
const handlePicClick = (params: any) => {
  const name = params?.name;
  const value = params?.value;
  console.log('PIC图表点击事件触发, name:', name, 'value:', value);
  if (name) {
    console.log('应用PIC筛选:', name);
    console.log('当前searchParams.diffPic设置:', name);
    searchParams.diffPic = name;
    searchParams.diffType = '';
    chartFilterActive.value = true;
    chartFilterText.value = `差异PIC: ${name}`;
    pagination.page = 1;
    loadRegistrations();
  }
};

const createLineChartOption = (xAxis: string[], data: number[]) => {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '30px', containLabel: true },
    xAxis: { type: 'category', data: xAxis, axisLabel: { fontSize: 11, rotate: xAxis.length > 10 ? 45 : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 }, name: '数量' },
    series: [{
      type: 'line',
      data,
      smooth: true,
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(102, 126, 234, 0.3)' }, { offset: 1, color: 'rgba(118, 75, 162, 0.05)' }]) },
      lineStyle: { color: '#667eea', width: 2 },
      itemStyle: { color: '#667eea' },
      label: { show: true, position: 'top', fontSize: 10 }
    }]
  };
};

// 点击趋势图筛选
const handleTrendClick = (params: any, xAxis: string[]) => {
  const name = params?.name;
  if (name) {
    console.log('趋势图点击事件:', name, 'period:', trendPeriod.value);
    const now = new Date();

    if (trendPeriod.value === 'day') {
      // 点击某一天，格式为 YYYY-MM-DD
      searchParams.startDate = name;
      searchParams.endDate = name;
    } else if (trendPeriod.value === 'week') {
      // 点击某一月，格式为 YYYY-MM（周视图显示的也是年月）
      searchParams.startDate = name + '-01';
      // 获取该月最后一天
      const [year, month] = name.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      searchParams.endDate = `${year}-${month}-${lastDay}`;
    } else if (trendPeriod.value === 'month') {
      // 点击某一月，格式为 YYYY-MM
      searchParams.startDate = name + '-01';
      // 获取该月最后一天
      const [year, month] = name.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      searchParams.endDate = `${year}-${month}-${lastDay}`;
    } else if (trendPeriod.value === 'year') {
      // 点击某一年
      searchParams.startDate = name + '-01-01';
      searchParams.endDate = name + '-12-31';
    }
    searchParams.diffType = '';
    searchParams.diffPic = '';
    chartFilterActive.value = true;
    chartFilterText.value = `时间: ${name}`;
    pagination.page = 1;
    loadRegistrations();
  }
};

// ========== 图表渲染 ==========

// 计算指定日期所在周的开始日期和结束日期
const getWeekRange = (date: Date): { start: string; end: string } => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一开始
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0] || '',
    end: sunday.toISOString().split('T')[0] || ''
  };
};

const renderTypeChart = async () => {
  if (!typeChartRef.value) return;

  // 等待 DOM 准备就绪
  await nextTick();

  if (!typeChart) {
    typeChart = echarts.init(typeChartRef.value);
    console.log('初始化饼图实例:', typeChart);
  }

  try {
    let startDate: string | undefined;
    let endDate: string | undefined;

    // 根据维度计算日期范围
    if (typePeriod.value === 'day') {
      // 今日
      const today = new Date();
      startDate = endDate = today.toISOString().split('T')[0];
    } else if (typePeriod.value === 'week' && typeWeekDate.value) {
      const range = getWeekRange(typeWeekDate.value);
      startDate = range.start;
      endDate = range.end;
    } else if (typePeriod.value === 'month' && typeMonthDate.value) {
      const d = typeMonthDate.value;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
      // 获取月份最后一天
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      endDate = `${year}-${month}-${lastDay}`;
    } else if (typePeriod.value === 'year' && typeYearDate.value) {
      const year = typeYearDate.value.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const res: any = await api.getTypeStats(startDate, endDate, typePeriod.value);
    const typeStats = res?.data || [];
    console.log('类型统计数据:', typeStats);
    const option = createPieChartOption(typeStats);
    typeChart.setOption(option);
    // 添加点击事件
    typeChart.off('click');
    typeChart.on('click', (params: any) => {
      console.log('饼图原生点击事件');
      handleTypeClick(params);
    });
  } catch (error) {
    console.error('获取类型统计失败:', error);
  }
};

const loadPicStats = async () => {
  if (!picChartRef.value) {
    console.log('PIC图表ref不存在');
    return;
  }

  // 等待 DOM 准备就绪
  await nextTick();

  if (!picChart) {
    picChart = echarts.init(picChartRef.value);
    console.log('初始化PIC图表实例:', picChart);
  }

  try {
    let startDate: string | undefined;
    let endDate: string | undefined;

    // 根据维度计算日期范围
    if (picPeriod.value === 'day') {
      // 今日
      const today = new Date();
      startDate = endDate = today.toISOString().split('T')[0];
    } else if (picPeriod.value === 'week' && picWeekDate.value) {
      const range = getWeekRange(picWeekDate.value);
      startDate = range.start;
      endDate = range.end;
    } else if (picPeriod.value === 'month' && picMonthDate.value) {
      const d = picMonthDate.value;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      startDate = `${year}-${month}-01`;
      // 获取月份最后一天
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      endDate = `${year}-${month}-${lastDay}`;
    } else if (picPeriod.value === 'year' && picYearDate.value) {
      const year = picYearDate.value.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      // 默认最近6个月
      const now = new Date();
      endDate = now.toISOString().split('T')[0];
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      startDate = sixMonthsAgo.toISOString().split('T')[0];
    }

    const res: any = await api.getPicStats(startDate, endDate, picPeriod.value);
    const picStats = res?.data || [];
    console.log('PIC统计数据:', picStats);
    const option = createBarChartOption(picStats);
    picChart.setOption(option);
    // 添加点击事件
    picChart.off('click');
    picChart.on('click', (params: any) => {
      console.log('PIC图表原生点击事件, params:', params);
      handlePicClick(params);
    });
    console.log('PIC图表点击事件已绑定');
  } catch (error) {
    console.error('获取PIC统计失败:', error);
  }
};

const loadTrendStats = async () => {
  if (!trendChartRef.value) return;

  // 等待 DOM 准备就绪
  await nextTick();

  if (!trendChart) trendChart = echarts.init(trendChartRef.value);

  try {
    const res: any = await api.getTrendStats(trendPeriod.value);
    const trendData = res?.data || { xAxis: [], data: [] };
    trendChart.setOption(createLineChartOption(trendData.xAxis || [], trendData.data || []));
    // 添加点击事件
    trendChart.off('click');
    trendChart.on('click', (params: any) => handleTrendClick(params, trendData.xAxis || []));
  } catch (error) {
    console.error('获取趋势统计失败:', error);
  }
};

const handleResize = () => {
  typeChart?.resize();
  picChart?.resize();
  trendChart?.resize();
};

// ========== 数据加载 ==========

const loadStats = async () => {
  try {
    const res: any = await api.getStats();
    Object.assign(stats, res?.data || {});
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

const loadDiffTypes = async () => {
  try {
    const res: any = await api.getDiffTypes();
    diffTypes.value = res?.data || [];
  } catch (error) {
    console.error('加载差异类型失败:', error);
  }
};

const loadRegistrations = async () => {
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      sortField: sortField.value,
      sortOrder: sortOrder.value
    };

    if (searchParams.startDate) params.startDate = searchParams.startDate;
    if (searchParams.endDate) params.endDate = searchParams.endDate;
    if (searchParams.diffType) params.diffType = searchParams.diffType;
    if (searchParams.diffPic) params.diffPic = searchParams.diffPic;
    if (searchParams.search) params.search = searchParams.search;

    const res: any = await api.getRegistrations(params);
    registrations.value = res?.data?.items || [];
    pagination.total = res?.data?.pagination?.total || res?.pagination?.total || 0;
  } catch (error) {
    console.error('加载登记记录失败:', error);
    ElMessage.error('加载数据失败');
  }
};

const loadAll = async () => {
  // 初始化日期选择器默认值
  const now = new Date();
  // 设置默认月份为当前月
  typeMonthDate.value = new Date(now.getFullYear(), now.getMonth(), 1);
  picMonthDate.value = new Date(now.getFullYear(), now.getMonth(), 1);
  // 设置默认年份为当前年
  typeYearDate.value = new Date(now.getFullYear(), 0, 1);
  picYearDate.value = new Date(now.getFullYear(), 0, 1);

  await Promise.all([
    loadStats(),
    loadDiffTypes(),
    loadRegistrations()
  ]);
  await nextTick();
  renderTypeChart();
  loadPicStats();
  loadTrendStats();
};

// ========== 搜索和分页 ==========

const handleSearch = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.startDate = dateRange.value[0];
    searchParams.endDate = dateRange.value[1];
  } else {
    searchParams.startDate = '';
    searchParams.endDate = '';
  }
  pagination.page = 1;
  loadRegistrations();
  // 更新图表（使用搜索条件）
  renderTypeChart();
  loadPicStats();
  loadTrendStats();
};

const resetSearch = () => {
  dateRange.value = null;
  searchParams.startDate = '';
  searchParams.endDate = '';
  searchParams.diffType = '';
  searchParams.diffPic = '';
  searchParams.search = '';
  pagination.page = 1;
  loadRegistrations();
  // 重置图表
  renderTypeChart();
  loadPicStats();
  loadTrendStats();
};

const changePage = (page: number) => {
  pagination.page = page;
  loadRegistrations();
};

const quickFilter = (type: string) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0] as string;

  if (type === 'today') {
    dateRange.value = [today, today] as [string, string];
  } else if (type === 'week') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayStr = monday.toISOString().split('T')[0] as string;
    dateRange.value = [mondayStr, today] as [string, string];
  } else if (type === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0] as string;
    dateRange.value = [monthStartStr, today] as [string, string];
  } else if (type === 'pending') {
    dateRange.value = null;
    searchParams.startDate = '';
    searchParams.endDate = '';
    searchParams.diffType = '';
    searchParams.diffPic = '';
    searchParams.search = '';
    // 特殊筛选：待处理
  }
  handleSearch();
};

// ========== CRUD操作 ==========

const openAddDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  batchMode.value = false;
  batchRows.value = [];
  resetForm();
  const today = new Date().toISOString().split('T')[0] as string;
  formData.registrationDate = today;
  showDialog.value = true;
};

const openEditDialog = (item: Registration) => {
  isEdit.value = true;
  editingId.value = item.id || null;
  Object.assign(formData, {
    registrationDate: item.registrationDate,
    partNo: item.partNo,
    qty: item.qty,
    diffType: item.diffType || '',
    materialId: item.materialId || '',
    diffPic: item.diffPic || '',
    handlingResult: item.handlingResult || '',
    remarks: item.remarks || ''
  });
  showDialog.value = true;
};

const resetForm = () => {
  Object.assign(formData, {
    registrationDate: '',
    partNo: '',
    qty: 0,
    diffType: '',
    materialId: '',
    diffPic: '',
    handlingResult: '',
    remarks: ''
  });
};

// 根据员工工号自动带出姓名
const handleMaterialIdBlur = async () => {
  if (!formData.materialId?.trim()) {
    formData.diffPic = '';
    return;
  }
  try {
    const res: any = await api.getUserRealNameByEmployeeId(formData.materialId.trim());
    const realName = res?.data?.realName;
    if (realName) {
      formData.diffPic = realName;
    }
  } catch (err) {
    console.error('查询用户姓名失败:', err);
  }
};

// 根据差异类型获取标签样式
const getTypeTagStyle = (diffType: string) => {
  const colors: Record<string, { bg: string; color: string }> = {
    '收料差异': { bg: '#E6F7FF', color: '#1890FF' },
    '发料多拿': { bg: '#FFF1E6', color: '#FA8C16' },
    '发料混料': { bg: '#FFF7E6', color: '#D46B08' },
    '发料漏拿': { bg: '#FFF2E8', color: '#AD6800' },
    '回仓差异': { bg: '#F6FFED', color: '#52C41A' },
    '扣数差异': { bg: '#FFF1F0', color: '#FF4D4F' },
    '其他': { bg: '#F3E8FF', color: '#722ED1' }
  };
  const style = colors[diffType] || { bg: '#F3E8FF', color: '#722ED1' };
  return {
    display: 'inline-block',
    padding: '2px 8px',
    background: style.bg,
    color: style.color,
    borderRadius: '4px',
    fontSize: '12px'
  };
};

// 批量粘贴处理 - 智能识别列映射
const handleBatchPaste = async (event: ClipboardEvent) => {
  event.preventDefault();
  const clipboardData = event.clipboardData?.getData('text');
  if (!clipboardData) return;

  const lines = clipboardData.split('\n').filter((line: string) => line.trim());
  if (lines.length === 0) return;

  const today = new Date().toISOString().split('T')[0];

  // 定义标准表头名称映射（支持多种写法）
  const headerMappings: Record<string, string> = {
    '日期': 'registrationDate',
    'date': 'registrationDate',
    '登记日期': 'registrationDate',
    'p/n': 'partNo',
    'p n': 'partNo',
    'pn': 'partNo',
    'partnumber': 'partNo',
    'part_no': 'partNo',
    '零件号': 'partNo',
    '料号': 'partNo',
    'qty': 'qty',
    '数量': 'qty',
    'qty数量': 'qty',
    '差异类型': 'diffType',
    '类型': 'diffType',
    '差异': 'diffType',
    'type': 'diffType',
    '员工工号': 'materialId',
    '工号': 'materialId',
    'id': 'materialId',
    '物料id': 'materialId',
    'pic': 'diffPic',
    '差异pic': 'diffPic',
    '负责人': 'diffPic',
    '处理结果': 'handlingResult',
    '结果': 'handlingResult',
    '处理': 'handlingResult',
    '备注': 'remarks',
    'remark': 'remarks',
    'note': 'remarks',
    '备注信息': 'remarks'
  };

  // 创建行模板
  const createRowTemplate = (): any => ({
    registrationDate: today,
    partNo: '',
    qty: 0,
    diffType: '',
    materialId: '',
    diffPic: '',
    handlingResult: '',
    remarks: ''
  });

  // 第一行是否是表头的判断
  const firstLine = lines[0] || '';
  const firstCells = firstLine.split(/[\t,;]/).map((c: string) => c.trim().toLowerCase());
  const isHeaderRow = firstCells.some((cell: string) => headerMappings[cell]);

  // 如果是表头行，解析列位置映射
  const colIndexMap: Record<string, number> = {};
  let startLineIndex = 0;

  if (isHeaderRow) {
    firstCells.forEach((cell: string, index: number) => {
      const mappedField = headerMappings[cell];
      if (mappedField) {
        colIndexMap[mappedField] = index;
      }
    });
    startLineIndex = 1; // 跳过表头行
  }

  // 处理数据行
  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i] || '';
    const cells = line.split(/[\t,;]/).map((c: string) => c.trim());

    if (cells.length === 0 || cells.every((c: string) => !c)) continue;

    const row = createRowTemplate();
    let hasValidData = false;

    if (isHeaderRow && Object.keys(colIndexMap).length > 0) {
      // 有表头，按列位置映射
      Object.entries(colIndexMap).forEach(([field, colIndex]) => {
        const cellValue = cells[colIndex as unknown as number] || '';
        if (cellValue) {
          hasValidData = true;
          row[field] = parseCellValue(field, cellValue);
        }
      });
    } else {
      // 无表头或无法识别，使用智能匹配
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        if (!cell) continue;

        // 尝试识别字段
        const field = detectField(cell, j, cells, diffTypes.value);
        if (field) {
          hasValidData = true;
          row[field] = parseCellValue(field, cell);
        } else if (!row.partNo) {
          // 如果还没找到P/N，把这个当作P/N
          row.partNo = cell;
          hasValidData = true;
        }
      }
    }

    if (hasValidData && row.partNo) {
      batchRows.value.push(row);
    }
  }

  // 自动填充PIC
  await fillBatchPics();
};

// 解析单元格值（根据字段类型转换）
const parseCellValue = (field: string, value: string): any => {
  const trimmed = value.trim();
  if (!trimmed) return field === 'qty' ? 0 : '';

  switch (field) {
    case 'qty':
      // 尝试解析数字
      const num = parseFloat(trimmed.replace(/,/g, ''));
      return isNaN(num) ? 0 : num;
    case 'diffType':
      // 匹配差异类型
      return trimmed;
    default:
      return trimmed;
  }
};

// 智能检测字段类型（无表头时使用）
const detectField = (cell: string, index: number, allCells: string[], availableTypes: string[]): string | null => {
  const upperCell = cell.toLowerCase();
  const trimmed = cell.trim();

  // 匹配差异类型
  if (availableTypes.some((t: string) => t.toLowerCase() === upperCell || t.includes(trimmed))) {
    return 'diffType';
  }

  // 如果是纯数字，可能是Qty（除非在很后面的位置）
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    // 如果前面已经有非数字列，且当前在合理位置（不是第一列或最后一列），则当作Qty
    if (index > 0 && index < allCells.length - 2) {
      const prevCell = allCells[index - 1];
      if (prevCell && /[A-Za-z]/.test(prevCell)) {
        return 'qty';
      }
    }
  }

  // 员工工号通常是数字/字母组合，6-10位（支持纯数字工号，如2272973）
  if (/^[A-Za-z0-9]{6,10}$/.test(trimmed)) {
    return 'materialId';
  }
  // 也支持较短但带字母的工号
  if (/^[A-Za-z]{1,}[A-Za-z0-9]{4,9}$/i.test(trimmed)) {
    return 'materialId';
  }

  // 日期格式 (YYYY-MM-DD, YYYY/MM/DD, MM-DD, MM/DD等)
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed) || /^\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    return 'registrationDate';
  }

  return null;
};

// 自动填充PIC（根据员工工号）
const autoFillPic = async (index: number) => {
  const row = batchRows.value[index];
  if (!row?.materialId?.trim()) {
    row.diffPic = '';
    return;
  }
  try {
    const res: any = await api.getUserRealNameByEmployeeId(row.materialId.trim());
    const realName = res?.data?.realName;
    if (realName) {
      row.diffPic = realName;
    }
  } catch (err) {
    console.error('查询用户姓名失败:', err);
  }
};

// 批量填充PIC
const fillBatchPics = async () => {
  for (let i = 0; i < batchRows.value.length; i++) {
    if (batchRows.value[i].materialId && !batchRows.value[i].diffPic) {
      await autoFillPic(i);
    }
  }
};

// 添加一行
const addBatchRow = () => {
  const today = new Date().toISOString().split('T')[0];
  batchRows.value.push({
    registrationDate: today,
    partNo: '',
    qty: 0,
    diffType: '',
    materialId: '',
    diffPic: '',
    handlingResult: '',
    remarks: ''
  });
};

// 删除一行
const removeBatchRow = (index: number) => {
  batchRows.value.splice(index, 1);
};

// 清空批量数据
const clearBatchRows = () => {
  batchRows.value = [];
};

// 批量保存
const handleBatchSave = async () => {
  const validRows = batchRows.value.filter(row => row.partNo?.trim());
  if (validRows.length === 0) {
    ElMessage.warning('请至少填写一条P/N');
    return;
  }

  saving.value = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const row of validRows) {
      try {
        await api.createRegistration({
          registrationDate: row.registrationDate,
          partNo: row.partNo,
          qty: row.qty || 0,
          diffType: row.diffType || '',
          materialId: row.materialId || '',
          diffPic: row.diffPic || '',
          handlingResult: row.handlingResult || '',
          remarks: row.remarks || ''
        });
        successCount++;
      } catch (err) {
        failCount++;
        console.error('保存失败:', row, err);
      }
    }

    if (successCount > 0) {
      ElMessage.success(`批量保存完成：成功 ${successCount} 条${failCount > 0 ? `，失败 ${failCount} 条` : ''}`);
      showDialog.value = false;
      batchMode.value = false;
      batchRows.value = [];
      loadRegistrations();
      loadStats();
      renderTypeChart();
    } else {
      ElMessage.error('批量保存失败');
    }
  } finally {
    saving.value = false;
  }
};

const handleSave = async () => {
  if (!formData.partNo.trim()) {
    ElMessage.warning('请输入 P/N');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value && editingId.value) {
      await api.updateRegistration(editingId.value, formData);
      ElMessage.success('更新成功');
    } else {
      await api.createRegistration(formData);
      ElMessage.success('新增成功');
    }
    showDialog.value = false;
    loadRegistrations();
    loadStats();
    renderTypeChart();
  } catch (error: any) {
    console.error('保存失败:', error);
    ElMessage.error(error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const confirmDelete = async (item: Registration) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条登记记录吗？\n日期: ${item.registrationDate}\nP/N: ${item.partNo}`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    );

    await api.deleteRegistration(item.id!);
    ElMessage.success('删除成功');
    loadRegistrations();
    loadStats();
    renderTypeChart();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

// ========== 导出 ==========

const handleExport = async () => {
  try {
    const params: any = {};
    if (searchParams.startDate) params.startDate = searchParams.startDate;
    if (searchParams.endDate) params.endDate = searchParams.endDate;
    if (searchParams.diffType) params.diffType = searchParams.diffType;
    if (searchParams.diffPic) params.diffPic = searchParams.diffPic;
    if (searchParams.search) params.search = searchParams.search;

    const res = await api.exportRegistrations(params);
    downloadFile(res, `仓储差异登记_${searchParams.startDate || '开始'}_${searchParams.endDate || '结束'}.xlsx`);
    ElMessage.success('导出成功');
  } catch (error: any) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  }
};

// ========== 生命周期 ==========

onMounted(() => {
  loadAll();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  typeChart?.dispose();
  picChart?.dispose();
  trendChart?.dispose();
});
</script>

<style scoped>
.warehouse-diff-container {
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

.breadcrumb-item { color: #666666; }
.breadcrumb-item.active { color: #333333; font-weight: 600; }
.breadcrumb-separator { color: #CCCCCC; }

.header-actions { display: flex; gap: 12px; }

/* 统计卡片 - 现代化设计 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-card.orange .stat-icon-bg { background: #FFF7E6; }
.stat-card.blue .stat-icon-bg { background: #E6F0FF; }
.stat-card.green .stat-icon-bg { background: #E6FFF0; }
.stat-card.red .stat-icon-bg { background: #FFE6E6; }

.stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
.stat-label { font-size: 13px; color: #666666; margin-top: 4px; }

/* 图表区域 - 三列并排 */
.charts-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.chart-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.chart-filter {
  flex-shrink: 0;
}

.chart-filter .el-date-editor {
  width: 140px !important;
}

.chart-filter .el-input__wrapper {
  padding: 0 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 12px;
}

.chart-container {
  width: 100%;
  height: 260px;
}

/* 图表标签 - 药片样式 */
.chart-tabs {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.tab-btn {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  color: #666666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f5f5f5;
  color: #333333;
}

.tab-btn.active {
  background: linear-gradient(135deg, #1890FF, #096DD9);
  color: #ffffff;
  border-color: #1890FF;
}

/* 表格卡片 */
.table-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #F9FAFB;
}

.table-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.table-card-actions { display: flex; gap: 10px; }

/* 搜索栏 */
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #FAFAFA;
  align-items: center;
}

.search-item { display: flex; align-items: center; }
.search-input {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
}

.search-input:focus {
  outline: none;
  border-color: #1890FF;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

/* 图表筛选提示 */
.filter-tip {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #E6F7FF;
  border: 1px solid #91D5FF;
  border-radius: 4px;
  font-size: 12px;
  color: #1890FF;
}

.filter-clear {
  background: none;
  border: none;
  color: #1890FF;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
}

.filter-clear:hover {
  color: #096DD9;
}

/* 数据表格 */
.table-wrapper { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead {
  background: linear-gradient(135deg, #1890FF, #096DD9);
  color: #FFFFFF;
}

.data-table th,
.data-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.data-table th {
  font-weight: 600;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: rgba(255, 255, 255, 0.2);
}

.data-table th.sort-active {
  background: rgba(255, 255, 255, 0.3);
}

.sort-icon {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.data-table th.sort-active .sort-icon {
  opacity: 1;
}

.data-table tbody tr { transition: background 0.15s; }
.data-table tbody tr:hover { background-color: #F3F4F6; }
.data-table tbody tr:last-child td { border-bottom: none; }

.mono {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
  color: #333333;
}

.type-cell {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pic-cell {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc-cell, .remarks-cell {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-cell {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-cell { white-space: nowrap; }

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn.edit:hover { background: #E6F0FF; }
.action-btn.delete:hover { background: #FFE6E6; }

.empty-cell { text-align: center; color: #999999; padding: 40px !important; }

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background-color: #FAFAFA;
}

.pagination-info { font-size: 13px; color: #666666; }
.pagination-controls { display: flex; gap: 4px; }

/* 按钮 - 蓝色主题 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  gap: 6px;
}

.btn-primary {
  background: linear-gradient(135deg, #1890FF, #096DD9);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #096DD9, #0050B3);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: #ffffff;
  color: #333333;
  border: 1px solid #d9d9d9;
}
.btn-secondary:hover {
  background: #f5f5f5;
  border-color: #1890FF;
  color: #1890FF;
}

.btn-refresh {
  background: #ffffff;
  border: 1px solid #d9d9d9;
  color: #666666;
}
.btn-refresh:hover {
  background: #f5f5f5;
  border-color: #1890FF;
  color: #1890FF;
}

.btn-sm { padding: 6px 12px; font-size: 12px; }

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
  background: #fff;
  border-radius: 20px;
  width: 90%;
  max-width: 640px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #f8fafc, #ffffff);
}

.dialog-header h3 { margin: 0; font-size: 17px; font-weight: 600; color: #1e293b; }

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.dialog-close:hover { background: #fee2e2; color: #ef4444; }

.dialog-body { padding: 24px; overflow-y: auto; flex: 1; }

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.form-row .form-group { margin-bottom: 0; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 6px; }
.form-group label.required::after { content: ' *'; color: #ef4444; }

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
  resize: vertical;
  transition: all 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 对话框尺寸 */
.dialog-large {
  max-width: 1100px;
  max-height: 90vh;
}

/* 弹窗Tab切换 */
.dialog-tabs {
  display: flex;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.dialog-tab {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.dialog-tab:hover {
  color: #3b82f6;
}

.dialog-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 500;
}

/* 批量模式 */
.batch-body {
  padding: 16px 24px !important;
}

.batch-hint {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #e0f2fe;
}

.batch-hint kbd {
  padding: 2px 6px;
  background: #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
}

.paste-area {
  min-height: 200px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
  transition: all 0.2s;
}

.paste-area:focus,
.paste-area.paste-active {
  border-color: #3b82f6;
  background: #f0f9ff;
  outline: none;
}

.paste-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: #9ca3af;
  font-size: 14px;
  cursor: text;
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.batch-table th,
.batch-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.batch-table th {
  background: #f3f4f6;
  font-weight: 500;
  color: #4b5563;
  white-space: nowrap;
}

.batch-input {
  width: 100%;
  min-width: 60px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 13px;
}

.batch-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.batch-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.batch-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.batch-delete:hover {
  background: #fecaca;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.batch-count {
  font-size: 14px;
  color: #6b7280;
}

/* 成功按钮 */
.btn-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
}
</style>
