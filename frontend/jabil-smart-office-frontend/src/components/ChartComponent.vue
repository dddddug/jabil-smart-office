<template>
  <div ref="chartContainer" class="echart-container"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EChartsOption } from 'echarts';

const props = defineProps({
  options: {
    type: Object as () => EChartsOption,
    required: true,
  },
});

const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const initChart = () => {
  if (chartContainer.value) {
    chartInstance = echarts.init(chartContainer.value);
    chartInstance.setOption(props.options);
  }
};

const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose();
  }
  window.removeEventListener('resize', resizeChart);
});

watch(() => props.options, (newOptions) => {
  if (chartInstance) {
    chartInstance.setOption(newOptions);
  }
}, { deep: true });
</script>

<style scoped>
.echart-container {
  width: 100%;
  height: 100%;
  min-height: 200px; /* 确保图表有最小高度 */
}
</style>
