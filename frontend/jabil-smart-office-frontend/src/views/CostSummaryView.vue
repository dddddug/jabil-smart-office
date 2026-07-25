<template>
  <div class="cost-dashboard-container">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <div class="title-section">
          <h1 class="main-title">
            <i class="dashboard-icon">💰</i>
            {{ getDashboardTitle() }}
          </h1>
          <p class="subtitle">智能数据分析 · 实时费用监控</p>
        </div>
      </div>
      <div class="header-right">
        <cost-summary-filters
          @filter-change="handleFilterChange"
          @export-data="handleExportData"
          @recalculate-data="handleRecalculateData"
          @time-dimension-change="handleTimeDimensionChange"
        ></cost-summary-filters>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="dashboard-content">
      <!-- 关键指标卡片 -->
      <div class="metrics-section">
        <div class="metrics-grid">
          <div class="metric-card budget-card">
            <div class="metric-icon budget-icon">
              <i class="icon">📊</i>
            </div>
            <div class="metric-content">
              <div class="metric-label">可用预算额度</div>
              <div class="metric-value">$ {{ formatNumber(keyMetrics.availableBudget) }}</div>
              <div class="metric-trend positive">
                <i class="trend-icon">↑</i>
                充足
              </div>
            </div>
          </div>
          
          <div class="metric-card consumed-card">
            <div class="metric-icon consumed-icon">
              <i class="icon">💸</i>
            </div>
            <div class="metric-content">
              <div class="metric-label">已消耗费用</div>
              <div class="metric-value">$ {{ formatNumber(keyMetrics.consumedCost) }}</div>
              <div class="metric-trend" :class="getRatioClass()">
                <i class="trend-icon">{{ keyMetrics.consumptionRatio > 80 ? '⚠' : '✓' }}</i>
                {{ keyMetrics.consumptionRatio > 80 ? '高消耗' : '正常' }}
              </div>
            </div>
          </div>
          
          <div class="metric-card remaining-card">
            <div class="metric-icon remaining-icon">
              <i class="icon">💵</i>
            </div>
            <div class="metric-content">
              <div class="metric-label">剩余可用费用</div>
              <div class="metric-value">$ {{ formatNumber(keyMetrics.remainingCost) }}</div>
              <div class="metric-trend" :class="getRatioClass()">
                <i class="trend-icon">{{ keyMetrics.consumptionRatio > 80 ? '⚠' : '✓' }}</i>
                {{ keyMetrics.consumptionRatio > 80 ? '需关注' : '充足' }}
              </div>
            </div>
          </div>
          
          <div class="metric-card ratio-card">
            <div class="metric-icon ratio-icon">
              <i class="icon">📈</i>
            </div>
            <div class="metric-content">
              <div class="metric-label">费用消耗占比</div>
              <div class="metric-value">{{ keyMetrics.consumptionRatio.toFixed(1) }}%</div>
              <div class="progress-bar">
                <div class="progress-fill" :class="getRatioClass()" :style="{ width: Math.min(keyMetrics.consumptionRatio, 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- 每日平均费用卡片 -->
          <div class="metric-card daily-cost-card">
            <div class="metric-icon daily-cost-icon">
              <i class="icon">💲</i>
            </div>
            <div class="metric-content">
              <div class="metric-label">每日平均费用 (USD)</div>
              <div class="metric-value">$ {{ formatNumber(keyMetrics.averageDailyCostUSD) }}</div>
              <div class="metric-trend positive">
                <i class="trend-icon">🚀</i>
                实时估算
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <div class="charts-grid">
          <!-- 部门费用消耗 -->
          <div class="chart-card large-chart">
            <div class="chart-header">
              <div class="chart-title">
                <i class="title-icon">🏢</i>
                部门费用消耗分布
              </div>
            </div>
            <div class="chart-body">
              <cost-summary-charts :chart-data="chartData" class="custom-charts"></cost-summary-charts>
            </div>
          </div>
        </div>
      </div>

      <!-- 详细数据表格 -->
      <div class="table-section">
        <div class="table-card">
          <div class="table-header">
            <div class="table-title">
              <i class="title-icon">📋</i>
              费用明细数据
            </div>
            <div class="table-stats">
              <span class="stat-item">共 <strong>{{ detailTable.total }}</strong> 条记录</span>
            </div>
          </div>
          <div class="table-body">
            <cost-summary-table
              :table-data="detailTable.items"
              :total="detailTable.total"
              :loading="loading"
              @page-change="handlePageChange"
              @size-change="handleSizeChange"
            ></cost-summary-table>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <cost-summary-export-dialog
      :visible="exportDialogVisible"
      :filter-params="currentFilterParams"
      @close="exportDialogVisible = false"
    ></cost-summary-export-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CostSummaryFilters from './cost-summary/CostSummaryFilters.vue';
import CostSummaryCharts from './cost-summary/CostSummaryCharts.vue';
import CostSummaryTable from './cost-summary/CostSummaryTable.vue';
import CostSummaryExportDialog from './cost-summary/CostSummaryExportDialog.vue';
import { getCostSummary, recalculateCost } from '@/api/costSummary';
import { getToken, removeToken } from '@/utils/request';

interface KeyMetrics {
  availableBudget: number;
  consumedCost: number;
  remainingCost: number;
  consumptionRatio: number;
  averageDailyCostUSD: number;
}

interface ChartData {
  departmentConsumption: any[];
  monthlyTrend: any[];
  yoyComparison: {
    value: number;
    percentage: number;
  };
  momComparison: {
    value: number;
    percentage: number;
  };
}

interface DetailTable {
  total: number;
  items: any[];
}

const loading = ref(false);
const exportDialogVisible = ref(false);
const currentFilterParams = ref({});

const keyMetrics = reactive<KeyMetrics>({
  availableBudget: 0,
  consumedCost: 0,
  remainingCost: 0,
  consumptionRatio: 0,
  averageDailyCostUSD: 0,
});

const chartData = reactive<ChartData>({
  departmentConsumption: [],
  monthlyTrend: [],
  yoyComparison: { value: 0, percentage: 0 },
  momComparison: { value: 0, percentage: 0 },
});

const detailTable = reactive<DetailTable>({
  total: 0,
  items: [],
});

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
});

const currentTimeDimension = ref('monthly');

const timeDimensionLabels: Record<string, string> = {
  monthly: '月度费用分析看板',
  yearly: '年度费用分析看板',
  weekly: '周度费用分析看板',
  last7days: '近7天费用分析看板',
  last14days: '近14天费用分析看板',
  customRange: '自定义费用分析看板',
};

// 获取看板标题
const getDashboardTitle = (): string => {
  return timeDimensionLabels[currentTimeDimension.value] || '费用分析看板';
};

// 处理时间维度变化
const handleTimeDimensionChange = (dimension: string) => {
  currentTimeDimension.value = dimension;
};

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 获取占比类名
const getRatioClass = (): string => {
  const ratio = keyMetrics.consumptionRatio;
  if (ratio >= 90) return 'danger';
  if (ratio >= 70) return 'warning';
  return 'success';
};

// 方法
const fetchCostSummary = async () => {
  loading.value = true;
  try {
    const params = {
      ...currentFilterParams.value,
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
    };
    const data = await getCostSummary(params);
    if (data) { // 检查数据是否存在，即使是空数据也可能是有效响应
      keyMetrics.availableBudget = data.availableBudget;
      keyMetrics.consumedCost = data.consumedCost;
      keyMetrics.remainingCost = data.remainingCost;
      keyMetrics.consumptionRatio = data.consumptionRatio * 100;
      keyMetrics.averageDailyCostUSD = data.averageDailyCostUSD;

      chartData.departmentConsumption = data.chartData.departmentConsumption;
      chartData.monthlyTrend = data.chartData.monthlyTrend;
      chartData.yoyComparison = data.chartData.yoyComparison;
      chartData.momComparison = data.chartData.momComparison;

      detailTable.total = data.detailTable.total;
      detailTable.items = data.detailTable.items;
    } else {
      ElMessage.error('获取数据失败或数据格式异常');
    }
  } catch (error) {

    ElMessage.error(error.message || '获取数据异常');
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = (filters: any) => {
  currentFilterParams.value = filters;
  pagination.currentPage = 1;
  fetchCostSummary();
};

const handleExportData = (filters: any) => {
  currentFilterParams.value = filters;
  exportDialogVisible.value = true;
};

const handleRecalculateData = async (dateParam: string | string[]) => {
  let messageDate = '';
  if (Array.isArray(dateParam)) {
    messageDate = `${dateParam[0]} 至 ${dateParam[1]}`;
  } else {
    messageDate = dateParam;
  }

  ElMessageBox.confirm(
    `确认要重新核算 ${messageDate} 的 Cost 数据吗？此操作不可逆。`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      loading.value = true;
      try {
        const res = await recalculateCost(dateParam);
        if (res.code === 200) {
          ElMessage.success(res.message);
          fetchCostSummary();
        } else {
          ElMessage.error(res.message || '重算失败');
        }
      } catch (error) {
        ElMessage.error('重算异常');
      } finally {
        loading.value = false;
      }
    })
    .catch(() => {
      ElMessage.info('已取消重算');
    });
};

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
  fetchCostSummary();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.currentPage = 1;
  fetchCostSummary();
};

onMounted(() => {
  const token = getToken();
  if (!token) {
    ElMessage.error('会话已过期，请重新登录');
    removeToken();

    window.location.href = '/login';
  } else {
    // fetchCostSummary(); // Removed initial fetch
  }
});
</script>

<style scoped>
.cost-dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.dashboard-header {
  background: white;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
}

.header-left {
  flex: 0 0 auto;
  min-width: auto;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dashboard-icon {
  font-size: 24px;
}

.subtitle {
  color: #64748b;
  font-size: 12px;
  margin: 0;
  font-weight: 400;
}

.header-right {
  flex: 1;
  min-width: auto;
}

.dashboard-content {
  max-width: 1600px;
  margin: 0 auto;
}

.metrics-section {
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.metric-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}

.budget-card::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.consumed-card::before {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.remaining-card::before {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.ratio-card::before {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.daily-cost-card::before {
  background: linear-gradient(90deg, #60a5fa, #3b82f6); /* Example gradient, adjust as needed */
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.budget-icon {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.consumed-icon {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.remaining-icon {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.ratio-icon {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.daily-cost-icon {
  background: linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%); /* Light blueish gradient */
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
}

.metric-trend {
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-trend.positive {
  color: #10b981;
}

.metric-trend.warning {
  color: #f59e0b;
}

.metric-trend.danger {
  color: #ef4444;
}

.trend-icon {
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-fill.success {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.progress-fill.danger {
  background: linear-gradient(90deg, #ef4444, #fca5a5);
}

.charts-section {
  margin-bottom: 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.large-chart {
  min-height: 400px;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
}

.chart-body {
  height: calc(100% - 50px);
}

.custom-charts {
  height: 100%;
}

.table-section {
  margin-bottom: 20px;
}

.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.table-header {
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-stats {
  color: #64748b;
  font-size: 13px;
}

.stat-item strong {
  color: #1e293b;
  font-weight: 600;
}

.table-body {
  padding: 0 20px 20px;
}

@media (max-width: 768px) {
  .cost-dashboard-container {
    padding: 12px;
  }

  .dashboard-header {
    padding: 16px;
  }

  .main-title {
    font-size: 20px;
  }

  .header-right {
    min-width: 100%;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 20px;
  }
}
</style>
