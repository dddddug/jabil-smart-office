<template>
  <div class="cost-summary-charts">
    <el-row :gutter="20" class="mb-5">
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card shadow="hover" class="chart-card h-[350px]">
          <template #header>
            <div class="card-header flex justify-between items-center">
              <span class="text-lg font-semibold">部门费用消耗进度</span>
            </div>
          </template>
          <div ref="departmentConsumptionChart" class="chart w-full h-[300px]"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card shadow="hover" class="chart-card h-[350px]">
          <template #header>
            <div class="card-header flex justify-between items-center">
              <span class="text-lg font-semibold">月度费用趋势</span>
            </div>
          </template>
          <div ref="monthlyTrendChart" class="chart w-full h-[300px]"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="comparison-charts-row">
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card shadow="hover" class="chart-card h-[180px]">
          <template #header>
            <div class="card-header flex justify-between items-center">
              <span class="text-lg font-semibold">同比分析 (YoY)</span>
              <el-tooltip placement="top">
                <template #content>
                  当前财月费用与去年同财月费用的对比。
                </template>
                <el-icon><InfoFilled class="text-gray-400" /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <div class="comparison-display flex flex-col justify-center items-center h-full space-y-2">
            <div class="flex items-center">
              <span class="comparison-label text-gray-600 mr-2">费用变化:</span>
              <span :class="getComparisonClass(chartData.yoyComparison.value)" class="text-xl font-bold">
                {{ formatComparisonValue(chartData.yoyComparison.value) }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="comparison-label text-gray-600 mr-2">变化百分比:</span>
              <span :class="getComparisonClass(chartData.yoyComparison.percentage)" class="text-xl font-bold">
                {{ formatComparisonPercentage(chartData.yoyComparison.percentage) }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card shadow="hover" class="chart-card h-[180px]">
          <template #header>
            <div class="card-header flex justify-between items-center">
              <span class="text-lg font-semibold">环比分析 (MoM)</span>
              <el-tooltip placement="top">
                <template #content>
                  当前财月费用与上个财月费用的对比。
                </template>
                <el-icon><InfoFilled class="text-gray-400" /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <div class="comparison-display flex flex-col justify-center items-center h-full space-y-2">
            <div class="flex items-center">
              <span class="comparison-label text-gray-600 mr-2">费用变化:</span>
              <span :class="getComparisonClass(chartData.momComparison.value)" class="text-xl font-bold">
                {{ formatComparisonValue(chartData.momComparison.value) }}
              </span>
            </div>
            <div class="flex items-center">
              <span class="comparison-label text-gray-600 mr-2">变化百分比:</span>
              <span :class="getComparisonClass(chartData.momComparison.percentage)" class="text-xl font-bold">
                {{ formatComparisonPercentage(chartData.momComparison.percentage) }}
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { InfoFilled } from '@element-plus/icons-vue';

const props = defineProps({
  chartData: {
    type: Object,
    required: true,
    default: () => ({
      departmentConsumption: [],
      monthlyTrend: [],
      yoyComparison: { value: 0, percentage: 0 },
      momComparison: { value: 0, percentage: 0 },
    }),
  },
});

const departmentConsumptionChart = ref<HTMLElement | null>(null);
const monthlyTrendChart = ref<HTMLElement | null>(null);
let deptChartInstance: echarts.ECharts | null = null;
let trendChartInstance: echarts.ECharts | null = null;

const initCharts = () => {
  if (departmentConsumptionChart.value) {
    deptChartInstance = echarts.init(departmentConsumptionChart.value);
    updateDepartmentConsumptionChart(props.chartData.departmentConsumption);
  }
  if (monthlyTrendChart.value) {
    trendChartInstance = echarts.init(monthlyTrendChart.value);
    updateMonthlyTrendChart(props.chartData.monthlyTrend);
  }
};

const updateDepartmentConsumptionChart = (data: any[]) => {
  if (!deptChartInstance) return;
  const options = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: data.map((item: any) => item.name),
    },
    series: [
      {
        name: '部门费用消耗',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '20',
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };
  deptChartInstance.setOption(options);
};

const updateMonthlyTrendChart = (data: any[]) => {
  if (!trendChartInstance) return;
  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((item: any) => item.month),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: '月度费用',
        type: 'bar',
        data: data.map((item: any) => item.cost),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' },
            ]),
          },
        },
      },
    ],
  };
  trendChartInstance.setOption(options);
};

const formatComparisonValue = (value: number) => {
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  } else if (value < 0) {
    return value.toFixed(2);
  } else {
    return '0.00';
  }
};

const formatComparisonPercentage = (percentage: number) => {
  if (percentage > 0) {
    return `+${(percentage * 100).toFixed(2)}%`;
  } else if (percentage < 0) {
    return `${(percentage * 100).toFixed(2)}%`;
  } else {
    return '0.00%';
  }
};

const getComparisonClass = (value: number) => {
  if (value > 0) return 'text-danger'; // Assuming red for increase
  if (value < 0) return 'text-success'; // Assuming green for decrease
  return '';
};

watch(() => props.chartData.departmentConsumption, (newData) => {
  updateDepartmentConsumptionChart(newData);
}, { deep: true });

watch(() => props.chartData.monthlyTrend, (newData) => {
  updateMonthlyTrendChart(newData);
}, { deep: true });

onMounted(() => {
  initCharts();
  window.addEventListener('resize', () => {
    deptChartInstance?.resize();
    trendChartInstance?.resize();
  });
});

onBeforeUnmount(() => {
  deptChartInstance?.dispose();
  trendChartInstance?.dispose();
});
</script>
