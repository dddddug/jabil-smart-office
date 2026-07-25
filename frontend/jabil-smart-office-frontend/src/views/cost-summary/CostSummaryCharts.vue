<template>
  <div class="cost-summary-charts">
    <!-- 月度视图：完整图表 -->
    <template v-if="timeDimension === 'monthly'">
      <!-- 预算使用进度 + 费用趋势与预测 左右布局 -->
      <el-row :gutter="20" class="mb-5">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[320px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">预算使用进度</span>
                <el-tooltip placement="top">
                  <template #content>
                    当前期间的预算使用情况，红色表示超支风险
                  </template>
                  <el-icon><InfoFilled class="text-gray-400" /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div ref="budgetProgressChart" class="chart w-full h-[260px]"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[320px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">费用趋势与预测</span>
                <div class="flex items-center gap-2">
                  <el-radio-group v-model="drillDownLevel" size="small">
                    <el-radio-button value="department">按部门</el-radio-button>
                    <el-radio-button value="position">按岗位</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </template>
            <div ref="trendForecastChart" class="chart w-full h-[260px]"></div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 周度视图：简化图表 -->
    <template v-else-if="timeDimension === 'weekly'">
      <!-- 本周预算进度 + 每日消耗趋势 左右布局 -->
      <el-row :gutter="20" class="mb-5">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[280px]">
            <template #header>
              <div class="card-header">
                <span class="text-lg font-semibold">本周预算进度</span>
              </div>
            </template>
            <div ref="budgetProgressChart" class="chart w-full h-[220px]"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[280px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">每日消耗趋势</span>
                <div class="flex items-center gap-2">
                  <el-radio-group v-model="drillDownLevel" size="small">
                    <el-radio-button value="department">按部门</el-radio-button>
                    <el-radio-button value="position">按岗位</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </template>
            <div ref="trendForecastChart" class="chart w-full h-[220px]"></div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 日度视图：每日趋势与滚动平均 -->
    <template v-else-if="timeDimension === 'daily'">
      <el-row :gutter="20" class="mb-5">
        <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
          <el-card shadow="hover" class="chart-card h-[320px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">每日费用趋势</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">
                    <span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>日费用
                    <span class="inline-block w-3 h-3 rounded-full bg-orange-400 ml-2 mr-1"></span>7日均值
                    <span class="inline-block w-3 h-3 rounded-full bg-green-500 ml-2 mr-1"></span>30日均值
                  </span>
                </div>
              </div>
            </template>
            <div ref="dailyTrendChart" class="chart w-full h-[260px]"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
          <el-card shadow="hover" class="chart-card h-[320px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">时间进度 vs 费用进度</span>
                <el-tooltip placement="top">
                  <template #content>
                    对比时间流逝进度与预算消耗进度，红色区域表示费用消耗快于时间进度
                  </template>
                  <el-icon><InfoFilled class="text-gray-400" /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div ref="dailyProgressChart" class="chart w-full h-[260px]"></div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 年度视图：月度趋势 左右布局 -->
    <template v-else>
      <el-row :gutter="20" class="mb-5">
        <!-- 年度预算进度 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[280px]">
            <template #header>
              <div class="card-header">
                <span class="text-lg font-semibold">年度预算进度</span>
              </div>
            </template>
            <div ref="budgetProgressChart" class="chart w-full h-[220px]"></div>
          </el-card>
        </el-col>
        <!-- 年度费用趋势 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card shadow="hover" class="chart-card h-[280px]">
            <template #header>
              <div class="card-header flex justify-between items-center">
                <span class="text-lg font-semibold">年度费用趋势 (按月)</span>
              </div>
            </template>
            <div ref="monthlyTrendChart" class="chart w-full h-[220px]"></div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 钻取详情对话框 -->
    <el-dialog
      v-model="drillDownDialogVisible"
      :title="drillDownDialogTitle"
      width="600px"
      destroy-on-close
    >
      <div v-if="drillDownData.length > 0" class="drill-down-list">
        <div
          v-for="(item, index) in drillDownData"
          :key="index"
          class="drill-down-item"
        >
          <div class="drill-down-name">{{ item.name }}</div>
          <div class="drill-down-value">$ {{ formatNumber(item.value) }}</div>
          <div class="drill-down-bar">
            <div
              class="drill-down-bar-fill"
              :style="{ width: getBarWidth(item.value) + '%' }"
            ></div>
          </div>
          <div class="drill-down-percent">{{ getPercent(item.value) }}%</div>
        </div>
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        暂无数据
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import * as echarts from 'echarts';
import { InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
    default: () => ({
      positionRanking: [],
      monthlyTrend: [],
      yoyComparison: { value: 0, percentage: 0 },
      momComparison: { value: 0, percentage: 0 },
      trendForecast: null,
      detailData: null, // 包含按部门和岗位的详细数据
    }),
  },
  timeDimension: {
    type: String,
    default: 'monthly', // monthly, weekly, yearly
  },
});

const budgetProgressChart = ref<HTMLElement | null>(null);
const monthlyTrendChart = ref<HTMLElement | null>(null);
const positionRankingChart = ref<HTMLElement | null>(null);
const trendForecastChart = ref<HTMLElement | null>(null);
const dailyTrendChart = ref<HTMLElement | null>(null);
const dailyProgressChart = ref<HTMLElement | null>(null);

let budgetChartInstance: echarts.ECharts | null = null;
let trendChartInstance: echarts.ECharts | null = null;
let positionChartInstance: echarts.ECharts | null = null;
let forecastChartInstance: echarts.ECharts | null = null;
let dailyTrendInstance: echarts.ECharts | null = null;
let dailyProgressInstance: echarts.ECharts | null = null;

// 钻取功能
const drillDownLevel = ref<'department' | 'position'>('department');
const drillDownDialogVisible = ref(false);
const drillDownDialogTitle = ref('');
const drillDownData = ref<any[]>([]);

// 计算总额用于百分比
const totalValue = computed(() => {
  if (drillDownData.value.length === 0) return 1;
  return drillDownData.value.reduce((sum, item) => sum + item.value, 0);
});

const formatCurrency = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return value.toFixed(2);
};

const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getBarWidth = (value: number): number => {
  return (value / totalValue.value) * 100;
};

const getPercent = (value: number): string => {
  return ((value / totalValue.value) * 100).toFixed(1);
};

const initCharts = () => {
  if (budgetProgressChart.value) {
    budgetChartInstance = echarts.init(budgetProgressChart.value);
    updateBudgetProgressChart(props.chartData.trendForecast);
  }
  if (monthlyTrendChart.value) {
    trendChartInstance = echarts.init(monthlyTrendChart.value);
    updateMonthlyTrendChart(props.chartData.monthlyTrend);
  }
  if (positionRankingChart.value) {
    positionChartInstance = echarts.init(positionRankingChart.value);
    updatePositionRankingChart(props.chartData.positionRanking);
  }
  if (trendForecastChart.value) {
    forecastChartInstance = echarts.init(trendForecastChart.value);
    updateTrendForecastChart();
  }
  if (dailyTrendChart.value) {
    dailyTrendInstance = echarts.init(dailyTrendChart.value);
    updateDailyTrendChart();
  }
  if (dailyProgressChart.value) {
    dailyProgressInstance = echarts.init(dailyProgressChart.value);
    updateDailyProgressChart();
  }
};

const updateBudgetProgressChart = (data: any) => {
  if (!budgetChartInstance) return;

  if (!data) {
    budgetChartInstance.setOption({
      title: {
        text: '暂无预算数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 },
      },
    });
    return;
  }

  const usedRatio = data.costUsedRatio || 0;
  const currentCost = data.currentCost || 0;
  const totalBudget = data.totalAvailableBudget || 0;
  const predictedCost = data.predictedTotalCost || 0;

  const options = {
    tooltip: {
      formatter: () => {
        return `当前消耗: ¥${formatCurrency(currentCost)}<br/>预算总额: ¥${formatCurrency(totalBudget)}<br/>预计消耗: ¥${formatCurrency(predictedCost)}`;
      },
    },
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -160,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '90%',
        center: ['50%', '55%'],
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [usedRatio > 1 ? 1 : usedRatio, usedRatio > 1 ? '#ff4d4f' : (usedRatio > 0.8 ? '#faad14' : '#52c41a')],
              [1, '#e8e8e8'],
            ],
          },
        },
        pointer: {
          icon: 'circle',
          length: '55%',
          width: 6,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: usedRatio > 0.8 ? '#ff4d4f' : '#5470c6',
          },
        },
        axisTick: {
          distance: -15,
          length: 4,
          lineStyle: { color: '#fff', width: 1 },
        },
        splitLine: {
          distance: -20,
          length: 10,
          lineStyle: { color: '#fff', width: 2 },
        },
        axisLabel: {
          distance: -10,
          color: '#999',
          fontSize: 9,
          formatter: '{value}%',
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '40%'],
          fontSize: 16,
          fontWeight: 'bold',
          formatter: (value: number) => `${(usedRatio * 100).toFixed(1)}%`,
          color: usedRatio > 0.8 ? '#ff4d4f' : '#333',
        },
        title: {
          offsetCenter: [0, '70%'],
          fontSize: 11,
          color: '#666',
        },
        data: [
          {
            value: (usedRatio * 100).toFixed(1),
            name: `已用 ¥${formatCurrency(currentCost)} / ¥${formatCurrency(totalBudget)}`,
          },
        ],
      },
    ],
  };
  budgetChartInstance.setOption(options);
};

const updateMonthlyTrendChart = (data: any[]) => {
  if (!trendChartInstance) return;

  const chartData = data.length > 0 ? data : [
    { month: '1月', cost: 0 },
    { month: '2月', cost: 0 },
    { month: '3月', cost: 0 },
    { month: '4月', cost: 0 },
    { month: '5月', cost: 0 },
    { month: '6月', cost: 0 },
  ];

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>费用: ¥${formatCurrency(item.value)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item: any) => item.month),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    series: [
      {
        name: '月度费用',
        type: 'bar',
        data: chartData.map((item: any) => item.cost),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 1, color: '#188df0' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '50%',
      },
    ],
  };
  trendChartInstance.setOption(options);
};

const updatePositionRankingChart = (data: any[]) => {
  if (!positionChartInstance) return;

  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 10);
  const names = sortedData.map((item: any) => item.name);
  const values = sortedData.map((item: any) => item.value);

  const colorList = ['#FFD700', '#C0C0C0', '#CD7F32', '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452'];

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        return `${params[0].name}<br/>费用: ¥${formatCurrency(params[0].value)}`;
      },
    },
    grid: {
      left: '3%',
      right: '12%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    yAxis: {
      type: 'category',
      data: names.reverse(),
      axisLabel: {
        interval: 0,
        fontSize: 11,
      },
    },
    series: [
      {
        name: '岗位费用',
        type: 'bar',
        data: values.reverse(),
        itemStyle: {
          color: (params: any) => colorList[params.dataIndex % colorList.length],
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => formatCurrency(params.value),
          fontSize: 10,
        },
      },
    ],
  };

  // 添加点击事件进行钻取
  positionChartInstance.off('click');
  positionChartInstance.on('click', (params: any) => {
    const positionName = params.name;
    // 获取该岗位的详细数据
    const detailByDept = getPositionDetailByDepartment(positionName);
    drillDownDialogTitle.value = `岗位: ${positionName} - 部门明细`;
    drillDownData.value = detailByDept;
    drillDownDialogVisible.value = true;
  });

  positionChartInstance.setOption(options);
};

// 获取岗位按部门的详细数据
const getPositionDetailByDepartment = (positionName: string): any[] => {
  if (!props.chartData.detailData) return [];
  const deptMap = new Map();
  for (const item of props.chartData.detailData) {
    if (item.position === positionName) {
      const deptName = item.department_name || '未知部门';
      deptMap.set(deptName, (deptMap.get(deptName) || 0) + item.total_cost);
    }
  }
  return Array.from(deptMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

const updateTrendForecastChart = () => {
  if (!forecastChartInstance) return;

  const data = props.chartData.trendForecast;
  if (!data) {
    forecastChartInstance.setOption({
      title: {
        text: '暂无预测数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 },
      },
    });
    return;
  }

  // 根据钻取级别获取数据
  let chartData: any[] = [];
  let chartTitle = '';

  if (drillDownLevel.value === 'department') {
    chartData = getDepartmentTrendData();
    chartTitle = '部门费用趋势';
  } else {
    chartData = getPositionTrendData();
    chartTitle = '岗位费用趋势';
  }

  const currentCost = data.currentCost || 0;
  const predictedCost = data.predictedTotalCost || 0;
  const totalBudget = data.totalAvailableBudget || 0;
  const isOverBudget = data.isOverBudget || false;

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let result = params[0].name + '<br/>';
        params.forEach((p: any) => {
          result += `${p.seriesName}: ¥${formatCurrency(p.value)}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: chartData.map((d: any) => d.name),
      top: 0,
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: chartData.length > 5 ? '60px' : '35px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['当前消耗', '预测消耗', '预算总额'],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    series: [
      ...chartData.slice(0, 8).map((item: any, index: number) => ({
        name: item.name,
        type: 'bar',
        stack: 'total',
        data: [
          item.currentValue || 0,
          item.predictedValue || 0,
          item.budgetValue || 0,
        ],
        itemStyle: {
          color: getChartColor(index),
        },
      })),
      {
        name: '预测总额',
        type: 'line',
        data: [currentCost, predictedCost, totalBudget],
        lineStyle: { color: '#ff4d4f', type: 'dashed', width: 2 },
        itemStyle: { color: '#ff4d4f' },
        symbol: 'circle',
        symbolSize: 8,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value),
          fontSize: 10,
        },
      },
    ],
  };

  // 添加点击事件
  forecastChartInstance.off('click');
  forecastChartInstance.on('click', (params: any) => {
    if (params.componentType === 'series' && params.seriesName !== '预测总额') {
      const itemName = params.seriesName;
      drillDownDialogTitle.value = `${drillDownLevel.value === 'department' ? '部门' : '岗位'}: ${itemName} - 费用明细`;
      drillDownData.value = getItemDetail(itemName);
      drillDownDialogVisible.value = true;
    }
  });

  forecastChartInstance.setOption(options);
};

const updateDailyTrendChart = () => {
  if (!dailyTrendInstance) return;

  const data = props.chartData.dailyTrendData;
  const dates = data?.dates || [];
  const dailyCosts = data?.dailyCosts || [];
  const avg7Day = data?.avg7Day || [];
  const avg30Day = data?.avg30Day || [];
  const anomalyFlags = data?.anomalyFlags || [];

  // 构建异常标记数据
  const anomalyMarks = anomalyFlags.map((flag: boolean, index: number) => {
    if (flag && dailyCosts[index] !== undefined) {
      return {
        coord: [index, dailyCosts[index]],
        itemStyle: {
          color: '#ff4d4f',
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 5,
          shadowColor: 'rgba(255, 77, 79, 0.5)'
        }
      };
    }
    return null;
  }).filter(Boolean);

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        const date = params[0]?.name || '';
        let result = `<strong>${date}</strong><br/>`;
        params.forEach((p: any) => {
          if (p.value !== undefined && p.seriesName !== '异常') {
            result += `${p.marker} ${p.seriesName}: ¥${formatCurrency(p.value)}<br/>`;
          }
        });
        const idx = dates.indexOf(date);
        if (idx >= 0 && anomalyFlags[idx]) {
          result += `<span style="color:#ff4d4f">⚠️ 异常费用</span>`;
        }
        return result;
      }
    },
    legend: {
      data: ['日费用', '7日均值', '30日均值'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '40px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
    series: [
      {
        name: '日费用',
        type: 'line',
        data: dailyCosts,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
        itemStyle: { color: '#5470c6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
            { offset: 1, color: 'rgba(84, 112, 198, 0.05)' }
          ])
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 12,
          data: anomalyMarks,
        },
      },
      {
        name: '7日均值',
        type: 'line',
        data: avg7Day,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#fa8c16' },
      },
      {
        name: '30日均值',
        type: 'line',
        data: avg30Day,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, type: 'dotted' },
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  dailyTrendInstance.setOption(options);
};

const updateDailyProgressChart = () => {
  if (!dailyProgressInstance) return;

  const data = props.chartData.dailyBudgetProgress;
  if (!data) {
    dailyProgressInstance.setOption({
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 },
      },
    });
    return;
  }

  const timeProgress = (data.timeProgressRatio || 0) * 100;
  const costProgress = (data.costProgressRatio || 0) * 100;
  const progressDiff = costProgress - timeProgress;
  const statusColor = progressDiff > 10 ? '#ff4d4f' : (progressDiff > 5 ? '#fa8c16' : '#52c41a');

  const options = {
    tooltip: {
      formatter: () => {
        return `<strong>时间 vs 费用进度对比</strong><br/>
          时间进度: ${timeProgress.toFixed(1)}%<br/>
          费用进度: ${costProgress.toFixed(1)}%<br/>
          <span style="color:${statusColor}">差异: ${progressDiff > 0 ? '+' : ''}${progressDiff.toFixed(1)}%</span>`;
      },
    },
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '120%',
        center: ['50%', '70%'],
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [1, '#e8e8e8'],
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '70%',
          width: 8,
          offsetCenter: [0, '-15%'],
          itemStyle: {
            color: statusColor,
          },
        },
        axisTick: {
          distance: -25,
          length: 5,
          lineStyle: { color: '#fff', width: 1 },
        },
        splitLine: {
          distance: -30,
          length: 15,
          lineStyle: { color: '#fff', width: 2 },
        },
        axisLabel: {
          distance: -20,
          color: '#999',
          fontSize: 10,
          formatter: '{value}%',
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-30%'],
          fontSize: 20,
          fontWeight: 'bold',
          formatter: (value: number) => `${value.toFixed(1)}%`,
          color: statusColor,
        },
        title: {
          offsetCenter: [0, '15%'],
          fontSize: 12,
          color: '#666',
        },
        data: [
          {
            value: timeProgress,
            name: `时间进度`,
          },
        ],
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '50%',
        top: '55%',
        style: {
          text: `费用: ${costProgress.toFixed(1)}%`,
          fill: statusColor,
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
        },
        z: 100,
      },
      {
        type: 'text',
        left: '50%',
        top: '75%',
        style: {
          text: `差异: ${progressDiff > 0 ? '+' : ''}${progressDiff.toFixed(1)}%`,
          fill: progressDiff > 0 ? '#ff4d4f' : '#52c41a',
          fontSize: 12,
          textAlign: 'center',
        },
        z: 100,
      },
    ],
  };

  dailyProgressInstance.setOption(options);
};

const getChartColor = (index: number): string => {
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];
  return colors[index % colors.length];
};

const getDepartmentTrendData = (): any[] => {
  if (!props.chartData.detailData) return [];
  const deptMap = new Map();
  const data = props.chartData.trendForecast;

  for (const item of props.chartData.detailData) {
    const deptName = item.department_name || '未知部门';
    if (!deptMap.has(deptName)) {
      deptMap.set(deptName, {
        name: deptName,
        currentValue: 0,
        predictedValue: 0,
        budgetValue: 0,
      });
    }
    const dept = deptMap.get(deptName);
    dept.currentValue += item.total_cost || 0;
    dept.budgetValue += item.available_budget || 0;
    // 预测值按比例计算
    const ratio = data.totalAvailableBudget > 0 ? (item.available_budget || 0) / data.totalAvailableBudget : 0;
    dept.predictedValue += (data.predictedTotalCost || 0) * ratio;
  }

  return Array.from(deptMap.values())
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 10);
};

const getPositionTrendData = (): any[] => {
  if (!props.chartData.detailData) return [];
  const posMap = new Map();
  const data = props.chartData.trendForecast;

  for (const item of props.chartData.detailData) {
    const posName = item.position || '未知岗位';
    if (!posMap.has(posName)) {
      posMap.set(posName, {
        name: posName,
        currentValue: 0,
        predictedValue: 0,
        budgetValue: 0,
      });
    }
    const pos = posMap.get(posName);
    pos.currentValue += item.total_cost || 0;
    pos.budgetValue += item.available_budget || 0;
    const ratio = data.totalAvailableBudget > 0 ? (item.available_budget || 0) / data.totalAvailableBudget : 0;
    pos.predictedValue += (data.predictedTotalCost || 0) * ratio;
  }

  return Array.from(posMap.values())
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 10);
};

const getItemDetail = (name: string): any[] => {
  if (!props.chartData.detailData) return [];

  if (drillDownLevel.value === 'department') {
    // 获取该部门的岗位明细
    const posMap = new Map();
    for (const item of props.chartData.detailData) {
      if (item.department_name === name) {
        const posName = item.position || '未知岗位';
        posMap.set(posName, (posMap.get(posName) || 0) + (item.total_cost || 0));
      }
    }
    return Array.from(posMap.entries())
      .map(([posName, value]) => ({ name: posName, value }))
      .sort((a, b) => b.value - a.value);
  } else {
    // 获取该岗位的部门明细
    return getPositionDetailByDepartment(name);
  }
};

const formatComparisonValue = (value: number) => {
  if (value > 0) return `+${value.toFixed(2)}`;
  if (value < 0) return value.toFixed(2);
  return '0.00';
};

const formatComparisonPercentage = (percentage: number) => {
  if (percentage > 0) return `+${(percentage * 100).toFixed(2)}%`;
  if (percentage < 0) return `${(percentage * 100).toFixed(2)}%`;
  return '0.00%';
};

const getComparisonClass = (value: number) => {
  if (value > 0) return 'text-danger';
  if (value < 0) return 'text-success';
  return '';
};

// 监听钻取级别变化
watch(drillDownLevel, () => {
  updateTrendForecastChart();
});

watch(() => props.chartData.monthlyTrend, (newData) => {
  updateMonthlyTrendChart(newData);
}, { deep: true });

watch(() => props.chartData.positionRanking, (newData) => {
  updatePositionRankingChart(newData);
}, { deep: true });

watch(() => props.chartData.trendForecast, (newData) => {
  updateBudgetProgressChart(newData);
  updateTrendForecastChart();
}, { deep: true });

watch(() => props.chartData.dailyTrendData, (newData) => {
  updateDailyTrendChart();
}, { deep: true });

watch(() => props.chartData.dailyBudgetProgress, (newData) => {
  updateDailyProgressChart();
}, { deep: true });

onMounted(() => {
  initCharts();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  budgetChartInstance?.dispose();
  trendChartInstance?.dispose();
  positionChartInstance?.dispose();
  forecastChartInstance?.dispose();
  dailyTrendInstance?.dispose();
  dailyProgressInstance?.dispose();
});

const handleResize = () => {
  budgetChartInstance?.resize();
  trendChartInstance?.resize();
  positionChartInstance?.resize();
  forecastChartInstance?.resize();
  dailyTrendInstance?.resize();
  dailyProgressInstance?.resize();
};
</script>

<style scoped>
.cost-summary-charts {
  padding: 10px;
}

.chart-card {
  border-radius: 8px;
}

.chart {
  min-height: 200px;
}

.comparison-display {
  padding: 10px;
}

.comparison-label {
  font-size: 14px;
}

.text-danger {
  color: #ff4d4f;
}

.text-success {
  color: #52c41a;
}

/* 钻取详情样式 */
.drill-down-list {
  max-height: 400px;
  overflow-y: auto;
}

.drill-down-item {
  display: grid;
  grid-template-columns: 150px 100px 1fr 60px;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.drill-down-item:last-child {
  border-bottom: none;
}

.drill-down-name {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drill-down-value {
  font-weight: bold;
  color: #5470c6;
  text-align: right;
}

.drill-down-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.drill-down-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #5470c6, #91cc75);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.drill-down-percent {
  text-align: right;
  color: #666;
  font-size: 13px;
}
</style>
