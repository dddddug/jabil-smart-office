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
        <div class="metrics-row">
          <!-- 左侧：6个指标卡片 -->
          <div class="metrics-grid" :class="{ 'daily-mode': currentTimeDimension === 'daily' }">
            <!-- 第一行：3个卡片 -->
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

            <!-- 每日平均费用卡片 -->
            <div class="metric-card daily-cost-card">
              <div class="metric-icon daily-cost-icon">
                <i class="icon">💲</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">{{ dimensionAwareMetrics.label }}</div>
                <div class="metric-value">$ {{ formatNumber(keyMetrics.averageDailyCostUSD) }}</div>
                <div class="metric-trend positive">
                  <i class="trend-icon">🚀</i>
                  {{ dimensionAwareMetrics.subtitle }}
                </div>
              </div>
            </div>

            <!-- 日度专属：累计消耗卡片 -->
            <div v-if="currentTimeDimension === 'daily'" class="metric-card cumulative-card">
              <div class="metric-icon cumulative-icon">
                <i class="icon">📈</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">月累计消耗</div>
                <div class="metric-value">$ {{ formatNumber(keyMetrics.cumulativeCost) }}</div>
                <div class="metric-trend" :class="getCumulativeTrendClass()">
                  <i class="trend-icon">{{ getCumulativeStatusIcon() }}</i>
                  {{ getCumulativeStatusLabel() }}
                </div>
              </div>
            </div>

            <!-- 日度专属：预算进度卡片 -->
            <div v-if="currentTimeDimension === 'daily'" class="metric-card progress-card">
              <div class="metric-icon progress-icon">
                <i class="icon">⏱️</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">预算进度</div>
                <div class="metric-value">{{ keyMetrics.costProgressRatio.toFixed(1) }}%</div>
                <div class="metric-progress">
                  <div class="progress-bar-container">
                    <div class="progress-bar-bg"></div>
                    <div class="progress-bar-time" :style="{ width: (keyMetrics.timeProgressRatio * 100) + '%' }"></div>
                    <div class="progress-bar-cost" :style="{ width: Math.min(keyMetrics.costProgressRatio * 100, 100) + '%' }"></div>
                  </div>
                  <div class="progress-labels">
                    <span class="label-time">时间进度 {{ (keyMetrics.timeProgressRatio * 100).toFixed(0) }}%</span>
                    <span class="label-cost">费用进度 {{ (keyMetrics.costProgressRatio * 100).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 日度专属：滚动平均卡片 -->
            <div v-if="currentTimeDimension === 'daily'" class="metric-card rolling-card">
              <div class="metric-icon rolling-icon">
                <i class="icon">📊</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">7日/30日均</div>
                <div class="metric-value">
                  <span class="avg-7">${{ formatNumber(keyMetrics.avg7Day) }}</span>
                  <span class="avg-divider">/</span>
                  <span class="avg-30">${{ formatNumber(keyMetrics.avg30Day) }}</span>
                </div>
                <div class="metric-trend" :class="getRollingTrendClass()">
                  <i class="trend-icon">{{ getRollingTrendIcon() }}</i>
                  {{ getRollingTrendLabel() }}
                </div>
              </div>
            </div>

            <!-- 日度专属：异常预警卡片 -->
            <div v-if="currentTimeDimension === 'daily'" class="metric-card anomaly-card" :class="{ 'has-anomaly': keyMetrics.hasAnomaly }">
              <div class="metric-icon anomaly-icon">
                <i class="icon">{{ keyMetrics.hasAnomaly ? '🚨' : '✅' }}</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">异常检测</div>
                <div class="metric-value">{{ keyMetrics.anomalyStatus }}</div>
                <div class="metric-trend" :class="keyMetrics.anomalyStatus === 'normal' ? 'positive' : 'warning'">
                  <i class="trend-icon">{{ keyMetrics.anomalyCount > 0 ? '⚠' : '✓' }}</i>
                  {{ keyMetrics.anomalyCount > 0 ? keyMetrics.anomalyCount + ' 项异常' : '暂无异常' }}
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
                  {{ remainingStatusLabel }}
                </div>
              </div>
            </div>

            <!-- 第二行：3个卡片 -->
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

            <div class="metric-card ratio-card">
              <div class="metric-icon ratio-icon">
                <i class="icon">💱</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">本月汇率</div>
                <div class="metric-value">{{ exchangeRate.toFixed(4) }}</div>
                <div class="metric-trend positive">
                  <i class="trend-icon">CNY/USD</i>
                </div>
              </div>
            </div>

            <!-- 预警卡片 -->
            <div class="metric-card warning-card">
              <div class="metric-icon warning-icon">
                <i class="icon">🚨</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">预警提示</div>
                <div class="metric-value">{{ warningCardLabel }}</div>
                <div class="metric-trend" :class="keyMetrics.overBudgetCount > 0 ? 'danger' : 'positive'">
                  <i class="trend-icon">{{ keyMetrics.overBudgetCount > 0 ? '⚠' : '✓' }}</i>
                  {{ keyMetrics.overBudgetCount > 0 ? '超支 ' + keyMetrics.overBudgetCount + ' 项' : '暂无超支' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：同期对比分析卡片 -->
          <div class="comparison-card">
            <div class="metric-card">
              <div class="metric-icon comparison-icon">
                <i class="icon">📊</i>
              </div>
              <div class="metric-content">
                <div class="metric-label">同期对比分析</div>
                <div class="comparison-desc">与历史{{ dimensionAwareMetrics.periodLabel }}数据对比</div>
                <div class="comparison-values">
                  <div class="comparison-item">
                    <div class="comparison-item-header">
                      <span class="comparison-label">同比</span>
                      <span class="comparison-label-hint">{{ currentTimeDimension === 'weekly' ? 'vs 上年同周' : currentTimeDimension === 'monthly' ? 'vs 去年同期' : 'vs 上年' }}</span>
                    </div>
                    <div class="comparison-item-value" :class="getComparisonClass(chartData.yoyComparison.percentage)">
                      <span class="comparison-arrow">{{ chartData.yoyComparison.percentage >= 0 ? '↑' : '↓' }}</span>
                      <span class="comparison-number">{{ Math.abs(chartData.yoyComparison.percentage).toFixed(1) }}%</span>
                    </div>
                    <div class="comparison-diff">
                      {{ chartData.yoyComparison.value >= 0 ? '+' : '' }}{{ formatNumber(chartData.yoyComparison.value) }} USD
                    </div>
                  </div>
                  <div class="comparison-divider"></div>
                  <div class="comparison-item">
                    <div class="comparison-item-header">
                      <span class="comparison-label">环比</span>
                      <span class="comparison-label-hint">{{ currentTimeDimension === 'weekly' ? 'vs 上周' : currentTimeDimension === 'monthly' ? 'vs 上月同期' : 'vs 上季度' }}</span>
                    </div>
                    <div class="comparison-item-value" :class="getComparisonClass(chartData.momComparison.percentage)">
                      <span class="comparison-arrow">{{ chartData.momComparison.percentage >= 0 ? '↑' : '↓' }}</span>
                      <span class="comparison-number">{{ Math.abs(chartData.momComparison.percentage).toFixed(1) }}%</span>
                    </div>
                    <div class="comparison-diff">
                      {{ chartData.momComparison.value >= 0 ? '+' : '' }}{{ formatNumber(chartData.momComparison.value) }} USD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 预警区域 -->
      <div v-if="warningAlerts.length > 0" class="warning-section">
        <div class="warning-header">
          <i class="warning-icon">🚨</i>
          <span>预警提醒</span>
          <span class="warning-count">{{ warningAlerts.length }} 项需要关注</span>
        </div>
        <div class="warning-list">
          <div
            v-for="(alert, index) in warningAlerts"
            :key="index"
            :class="['warning-item', alert.type]"
          >
            <div class="warning-badge">
              <span v-if="alert.type === 'danger'" class="badge-text danger">超支</span>
              <span v-else class="badge-text warning">预警</span>
            </div>
            <div class="warning-content">
              <div class="warning-title">{{ alert.department }} - {{ alert.position }}</div>
              <div class="warning-detail">
                已消耗 $ {{ formatNumber(alert.consumedCost) }} / 预算 $ {{ formatNumber(alert.availableBudget) }}
              </div>
            </div>
            <div class="warning-ratio">
              <span :class="['ratio-value', alert.type]">{{ alert.consumptionRatio.toFixed(1) }}%</span>
              <div class="warning-progress">
                <div class="warning-progress-fill" :class="alert.type" :style="{ width: Math.min(alert.consumptionRatio, 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <cost-summary-charts
          :chart-data="chartData"
          :trend-forecast="trendForecast"
          :time-dimension="currentTimeDimension"
          :detail-data="detailTable.items"
          class="custom-charts"
        ></cost-summary-charts>
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
              :time-dimension="currentTimeDimension"
              :anomaly-data="anomalyData"
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
import { ref, reactive, computed, onMounted } from 'vue';
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
  // 新增日度维度指标
  cumulativeCost: number; // 月累计消耗
  costProgressRatio: number; // 费用消耗比
  timeProgressRatio: number; // 时间进度比
  avg7Day: number; // 7日滚动平均
  avg30Day: number; // 30日滚动平均
  rollingTrend: string; // 滚动趋势
  hasAnomaly: boolean; // 是否有异常
  anomalyCount: number; // 异常数量
  anomalyStatus: string; // 异常状态
  // 原有的
  totalWarningCount: number;
  overBudgetCount: number;
  trendForecast: {
    predictedTotalCost: number;
    isOverBudget: boolean;
    daysRemaining: number;
    budgetUsedRatio: number;
  };
}

interface ChartData {
  positionRanking: any[];
  monthlyTrend: any[];
  yoyComparison: {
    value: number;
    percentage: number;
  };
  momComparison: {
    value: number;
    percentage: number;
  };
  trendForecast: TrendForecast | null;
  detailData: any[];
  // 日度数据
  dailyTrendData: DailyTrendData | null;
  dailyBudgetProgress: DailyBudgetProgress | null;
}

interface DailyTrendData {
  dates: string[];
  dailyCosts: number[];
  avg7Day: number[];
  avg30Day: number[];
  anomalyFlags: boolean[];
}

interface DailyBudgetProgress {
  fiscalStart: string;
  fiscalEnd: string;
  fiscalMonth: string;
  totalAvailableBudget: number;
  totalConsumedCost: number;
  daysElapsed: number;
  totalDays: number;
  timeProgressRatio: number;
  costProgressRatio: number;
  status: 'normal' | 'warning' | 'danger';
  statusMessage: string;
}

interface WarningAlert {
  type: 'danger' | 'warning';
  department: string;
  position: string;
  consumptionRatio: number;
  consumedCost: number;
  availableBudget: number;
  message: string;
}

interface TrendForecast {
  currentCost: number;
  dailyAverageCost: number;
  daysElapsed: number;
  daysRemaining: number;
  predictedTotalCost: number;
  budgetUsedRatio: number;
  costUsedRatio: number;
  isOverBudget: boolean;
}

interface DetailTable {
  total: number;
  items: any[];
}

const loading = ref(false);
const exportDialogVisible = ref(false);
const currentFilterParams = ref({});
const exchangeRate = ref(7.25); // 默认汇率测试值

const keyMetrics = reactive<KeyMetrics>({
  availableBudget: 0,
  consumedCost: 0,
  remainingCost: 0,
  consumptionRatio: 0,
  averageDailyCostUSD: 0,
  // 日度维度新增指标
  cumulativeCost: 0,
  costProgressRatio: 0,
  timeProgressRatio: 0,
  avg7Day: 0,
  avg30Day: 0,
  rollingTrend: 'stable',
  hasAnomaly: false,
  anomalyCount: 0,
  anomalyStatus: 'normal',
  // 原有指标
  totalWarningCount: 0,
  overBudgetCount: 0,
  trendForecast: {
    predictedTotalCost: 0,
    isOverBudget: false,
    daysRemaining: 0,
    budgetUsedRatio: 0,
  },
});

const chartData = reactive<ChartData>({
  positionRanking: [],
  monthlyTrend: [],
  yoyComparison: { value: 0, percentage: 0 },
  momComparison: { value: 0, percentage: 0 },
  trendForecast: null,
  detailData: [],
  // 日度数据
  dailyTrendData: null,
  dailyBudgetProgress: null,
});

const anomalyData = ref({
  anomalyFlags: [] as boolean[],
  anomalyDates: [] as string[],
});

const warningAlerts = ref<WarningAlert[]>([]);
const trendForecast = reactive<TrendForecast>({
  currentCost: 0,
  dailyAverageCost: 0,
  daysElapsed: 0,
  daysRemaining: 0,
  predictedTotalCost: 0,
  budgetUsedRatio: 0,
  costUsedRatio: 0,
  isOverBudget: false,
});

const detailTable = reactive<DetailTable>({
  total: 0,
  items: [],
});

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
});

const currentTimeDimension = ref('weekly');

const timeDimensionLabels: Record<string, string> = {
  daily: '日度费用分析看板',
  weekly: '周度费用分析看板',
  monthly: '月度费用分析看板',
  yearly: '年度费用分析看板',
};

// 获取看板标题
const getDashboardTitle = (): string => {
  return timeDimensionLabels[currentTimeDimension.value] || '费用分析看板';
};

// 维度感知指标计算
const dimensionAwareMetrics = computed(() => {
  const dimension = currentTimeDimension.value;
  let label = '';
  let subtitle = '';
  let periodLabel = '';

  switch (dimension) {
    case 'daily':
      label = '7日滚动均值';
      subtitle = '最近7天平均消耗';
      periodLabel = '日度';
      break;
    case 'weekly':
      label = '每周平均费用';
      subtitle = '本周日均消耗';
      periodLabel = '本周';
      break;
    case 'monthly':
      label = '每日平均费用 (USD)';
      subtitle = '财月日均消耗';
      periodLabel = '财月';
      break;
    case 'yearly':
      label = '每日平均费用 (USD)';
      subtitle = '年度日均消耗';
      periodLabel = '年度';
      break;
  }

  return { label, subtitle, periodLabel };
});

// 预警提示标签
const warningCardLabel = computed(() => {
  const count = keyMetrics.totalWarningCount;
  if (count === 0) return '暂无预警';
  return `${count} 项预警`;
});

// 剩余费用状态标签
const remainingStatusLabel = computed(() => {
  const ratio = keyMetrics.consumptionRatio;
  if (ratio >= 90) return '⚠ 即将耗尽';
  if (ratio >= 70) return '⚠ 需关注';
  return '✓ 充足';
});

// 处理时间维度变化
const handleTimeDimensionChange = (dimension: string) => {
  currentTimeDimension.value = dimension;
  // 重置分页并刷新数据
  pagination.currentPage = 1;
  fetchCostSummary();
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

// 获取排名样式类名
const getRankingClass = (index: number): string => {
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
  return '';
};

// 获取对比分析样式类名
const getComparisonClass = (percentage: number): string => {
  if (percentage > 10) return 'text-danger';
  if (percentage > 0) return 'text-warning';
  return 'text-positive';
};

// 日度维度：累计消耗状态类名
const getCumulativeTrendClass = (): string => {
  const progressDiff = keyMetrics.costProgressRatio - keyMetrics.timeProgressRatio;
  if (progressDiff > 0.1 || keyMetrics.costProgressRatio > 1) return 'danger';
  if (progressDiff > 0.05 || keyMetrics.costProgressRatio > 0.8) return 'warning';
  return 'success';
};

// 日度维度：累计消耗状态图标
const getCumulativeStatusIcon = (): string => {
  const progressDiff = keyMetrics.costProgressRatio - keyMetrics.timeProgressRatio;
  if (progressDiff > 0.1 || keyMetrics.costProgressRatio > 1) return '⚠';
  if (progressDiff > 0.05 || keyMetrics.costProgressRatio > 0.8) return '❗';
  return '✓';
};

// 日度维度：累计消耗状态标签
const getCumulativeStatusLabel = (): string => {
  const progressDiff = keyMetrics.costProgressRatio - keyMetrics.timeProgressRatio;
  if (progressDiff > 0.1 || keyMetrics.costProgressRatio > 1) return '超支预警';
  if (progressDiff > 0.05 || keyMetrics.costProgressRatio > 0.8) return '需关注';
  return '正常';
};

// 日度维度：滚动趋势类名
const getRollingTrendClass = (): string => {
  if (keyMetrics.rollingTrend === 'rising') return 'warning';
  if (keyMetrics.rollingTrend === 'falling') return 'positive';
  return 'success';
};

// 日度维度：滚动趋势图标
const getRollingTrendIcon = (): string => {
  if (keyMetrics.rollingTrend === 'rising') return '📈';
  if (keyMetrics.rollingTrend === 'falling') return '📉';
  return '➡️';
};

// 日度维度：滚动趋势标签
const getRollingTrendLabel = (): string => {
  if (keyMetrics.rollingTrend === 'rising') return '趋势上升';
  if (keyMetrics.rollingTrend === 'falling') return '趋势下降';
  return '趋势平稳';
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
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await getCostSummary(params);
    if (data) { // 检查数据是否存在，即使是空数据也可能是有效响应
      console.log('[DEBUG] API response keys:', Object.keys(data));
      console.log('[DEBUG] exchangeRate in API response:', data.exchangeRate, 'type:', typeof data.exchangeRate);
      console.log('[DEBUG] data object:', JSON.stringify(data, null, 2).slice(0, 1000));

      // 基础指标
      keyMetrics.availableBudget = data.availableBudget;
      keyMetrics.consumedCost = data.consumedCost;
      keyMetrics.remainingCost = data.remainingCost;
      keyMetrics.consumptionRatio = data.consumptionRatio * 100;
      keyMetrics.averageDailyCostUSD = data.averageDailyCostUSD;
      exchangeRate.value = data.exchangeRate || 0;
      console.log('[DEBUG] exchangeRate after assignment:', exchangeRate.value);

      // 日度维度：累计与预算进度对比
      if (data.dailyBudgetProgress) {
        keyMetrics.cumulativeCost = data.dailyBudgetProgress.currentCost || 0;
        keyMetrics.costProgressRatio = (data.dailyBudgetProgress.costProgressRatio || 0);
        keyMetrics.timeProgressRatio = (data.dailyBudgetProgress.timeProgressRatio || 0);
      }

      // 日度维度：滚动平均
      if (data.rollingAverages) {
        keyMetrics.avg7Day = data.rollingAverages.avg7Day || 0;
        keyMetrics.avg30Day = data.rollingAverages.avg30Day || 0;
        keyMetrics.rollingTrend = data.rollingAverages.trendIndicator || 'stable';
      }

      // 日度维度：异常检测
      if (data.anomalyFlags) {
        keyMetrics.hasAnomaly = data.anomalyFlags.hasAnomaly || false;
        keyMetrics.anomalyCount = data.anomalyFlags.anomalyCount || 0;
        keyMetrics.anomalyStatus = data.anomalyFlags.overallStatus || 'normal';
      }

      chartData.positionRanking = data.chartData.positionRanking || [];
      chartData.monthlyTrend = data.chartData.monthlyTrend || [];
      chartData.yoyComparison = data.chartData.yoyComparison || { value: 0, percentage: 0 };
      chartData.momComparison = data.chartData.momComparison || { value: 0, percentage: 0 };
      chartData.trendForecast = data.chartData.trendForecast || null;
      chartData.detailData = data.chartData.detailData || [];

      // 日度维度：图表数据
      if (currentTimeDimension.value === 'daily') {
        // 每日趋势数据（包含滚动平均）
        if (data.dailyTrendData) {
          chartData.dailyTrendData = data.dailyTrendData;
        }
        // 每日预算进度数据
        if (data.dailyBudgetProgress) {
          chartData.dailyBudgetProgress = data.dailyBudgetProgress;
        }
        // 异常数据
        if (data.anomalyFlags) {
          anomalyData.value = {
            anomalyFlags: data.anomalyFlags.flags || [],
            anomalyDates: data.anomalyFlags.anomalyDates || [],
          };
        }
      }

      // 预警提示
      warningAlerts.value = data.warningAlerts || [];
      keyMetrics.totalWarningCount = warningAlerts.value.length;
      keyMetrics.overBudgetCount = warningAlerts.value.filter(a => a.type === 'danger').length;

      // 趋势预测
      if (data.trendForecast) {
        trendForecast.currentCost = data.trendForecast.currentCost || 0;
        trendForecast.dailyAverageCost = data.trendForecast.dailyAverageCost || 0;
        trendForecast.daysElapsed = data.trendForecast.daysElapsed || 0;
        trendForecast.daysRemaining = data.trendForecast.daysRemaining || 0;
        trendForecast.predictedTotalCost = data.trendForecast.predictedTotalCost || 0;
        trendForecast.budgetUsedRatio = data.trendForecast.budgetUsedRatio || 0;
        trendForecast.costUsedRatio = data.trendForecast.costUsedRatio || 0;
        trendForecast.isOverBudget = data.trendForecast.isOverBudget || false;
        keyMetrics.trendForecast = {
          predictedTotalCost: trendForecast.predictedTotalCost,
          isOverBudget: trendForecast.isOverBudget,
          daysRemaining: trendForecast.daysRemaining,
          budgetUsedRatio: trendForecast.budgetUsedRatio,
        };
      }

      detailTable.total = data.detailTable.total;
      detailTable.items = data.detailTable.items;
    } else {
      ElMessage.error('获取数据失败或数据格式异常');
    }
  } catch (error: any) {
    const errMsg = error?.response?.data?.message || error?.message || '获取数据异常';
    ElMessage.error(errMsg);
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = (filters: any) => {
  currentFilterParams.value = { ...filters, timeDimension: currentTimeDimension.value };
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
        // 拦截器已自动解包 data，res 直接是响应体
        const resData = await recalculateCost(messageDate);
        if (resData?.code === 200) {
          ElMessage.success(resData.message);
          fetchCostSummary();
        } else {
          ElMessage.error(resData?.message || '重算失败');
        }
      } catch (error: any) {
        const errMsg = error?.response?.data?.message || error?.message || '重算异常';
        ElMessage.error(errMsg);
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
    fetchCostSummary();
  }
});
</script>

<style scoped>
.cost-dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.dashboard-header {
  background: white;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  flex: 0 0 auto;
}

.main-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 2px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dashboard-icon {
  font-size: 20px;
}

.subtitle {
  color: #94a3b8;
  font-size: 12px;
  margin: 0;
}

.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.dashboard-content {
  max-width: 1600px;
  margin: 0 auto;
}

.metrics-section {
  margin-bottom: 16px;
}

.metrics-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 0 0 60%;
}

.metrics-grid .metric-card {
  flex: none;
  max-width: none;
}

/* 日度维度：4列布局 */
.metrics-grid.daily-mode {
  grid-template-columns: repeat(4, 1fr);
}

.comparison-card {
  flex: 0 0 calc(50% - 16px);
  display: flex;
  flex-direction: column;
}

.comparison-card .metric-card {
  height: 100%;
  max-width: 100%;
  align-items: flex-start;
  flex-direction: column;
  padding: 20px;
}

.comparison-card .metric-icon {
  margin-bottom: 12px;
  align-self: flex-start;
}

.comparison-card .metric-content {
  width: 100%;
}

.comparison-card .metric-label {
  text-align: left;
  margin-bottom: 4px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
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
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
}

.cumulative-card::before {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.progress-card::before {
  background: linear-gradient(90deg, #f97316, #fb923c);
}

.rolling-card::before {
  background: linear-gradient(90deg, #14b8a6, #2dd4bf);
}

.anomaly-card::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.anomaly-card.has-anomaly::before {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.cumulative-icon {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.progress-icon {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
}

.rolling-icon {
  background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
}

.anomaly-icon {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.anomaly-card.has-anomaly .anomaly-icon {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.warning-card::before {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
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
  background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
}

.warning-icon {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.forecast-icon {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
}

.prediction-icon {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.metric-trend {
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-trend.positive {
  color: #10b981;
}

.metric-trend.success {
  color: #10b981;
}

.metric-trend.warning {
  color: #f59e0b;
}

.metric-trend.danger {
  color: #ef4444;
}

/* 日度维度：进度条样式 */
.metric-progress {
  margin-top: 4px;
}

.progress-bar-container {
  position: relative;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
}

.progress-bar-time {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(59, 130, 246, 0.3);
  border-right: 2px dashed #3b82f6;
  transition: width 0.3s ease;
}

.progress-bar-cost {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-cost.over-budget {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 10px;
}

.label-time {
  color: #3b82f6;
}

.label-cost {
  color: #10b981;
}

/* 日度维度：滚动均值样式 */
.avg-7 {
  color: #14b8a6;
  font-weight: 600;
}

.avg-divider {
  color: #94a3b8;
  margin: 0 2px;
}

.avg-30 {
  color: #64748b;
  font-weight: 500;
}

.trend-icon {
  font-size: 12px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
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
  margin-bottom: 16px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-header {
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 16px;
}

.table-section {
  margin-bottom: 16px;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-header {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-stats {
  color: #64748b;
  font-size: 12px;
}

.stat-item strong {
  color: #1e293b;
  font-weight: 600;
}

.table-body {
  padding: 0 16px 16px;
}

/* 预警区域样式 */
.warning-section {
  margin-bottom: 16px;
}

.warning-header {
  background: white;
  border-radius: 12px 12px 0 0;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border-bottom: 2px solid #ef4444;
}

.warning-icon {
  font-size: 16px;
}

.warning-header span:nth-child(2) {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.warning-count {
  color: #ef4444;
  font-size: 12px;
  margin-left: auto;
}

.warning-list {
  background: white;
  border-radius: 0 0 12px 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.warning-item.warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.warning-badge {
  flex-shrink: 0;
}

.badge-text {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.badge-text.danger {
  background: #ef4444;
  color: white;
}

.badge-text.warning {
  background: #f59e0b;
  color: white;
}

.warning-content {
  flex: 1;
  min-width: 0;
}

.warning-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 2px;
}

.warning-detail {
  font-size: 11px;
  color: #64748b;
}

.warning-ratio {
  flex-shrink: 0;
  width: 80px;
  text-align: right;
}

.ratio-value {
  font-size: 14px;
  font-weight: 700;
}

.ratio-value.danger {
  color: #ef4444;
}

.ratio-value.warning {
  color: #f59e0b;
}

.warning-progress {
  width: 100%;
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.warning-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.warning-progress-fill.danger {
  background: #ef4444;
}

.warning-progress-fill.warning {
  background: #f59e0b;
}

/* 同期对比样式 */
.comparison-card .metric-card::before {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.comparison-card .comparison-icon {
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
}

.comparison-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.comparison-values {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.comparison-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.comparison-item-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.comparison-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.comparison-label-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.comparison-item-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.comparison-arrow {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.comparison-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.comparison-item-value.text-danger .comparison-arrow,
.comparison-item-value.text-danger .comparison-number {
  color: #ef4444;
}

.comparison-item-value.text-warning .comparison-arrow,
.comparison-item-value.text-warning .comparison-number {
  color: #f59e0b;
}

.comparison-item-value.text-positive .comparison-arrow,
.comparison-item-value.text-positive .comparison-number {
  color: #10b981;
}

.comparison-diff {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.comparison-divider {
  width: 12px;
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .comparison-card {
    flex: 0 0 280px;
  }

  .comparison-card .metric-card {
    padding: 16px;
  }

  .comparison-number {
    font-size: 22px;
  }
}

@media (max-width: 992px) {
  .metrics-row {
    flex-direction: column;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .comparison-card {
    flex: none;
    width: 100%;
  }

  .comparison-card .metric-card {
    max-width: 100%;
    padding: 16px;
  }

  .comparison-values {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .cost-dashboard-container {
    padding: 12px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 18px;
  }
}
</style>
