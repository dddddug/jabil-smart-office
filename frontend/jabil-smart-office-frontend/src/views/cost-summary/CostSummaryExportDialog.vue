<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出 Cost 汇总数据"
    width="30%"
    @close="handleClose"
  >
    <span>您确定要导出当前筛选条件下的 Cost 汇总数据吗？</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmExport">确定导出</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { exportCostSummaryExcel } from '@/api/costSummary'; // Assuming API for export

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  filterParams: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['close']);

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('close'),
});

const handleClose = () => {
  emit('close');
};

const confirmExport = async () => {
  try {
    ElMessage.info('正在准备导出，请稍候...');
    const res = await exportCostSummaryExcel(props.filterParams);

    // Assuming the API returns a blob for file download
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CostSummary_${props.filterParams.fiscalMonth || 'All'}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    ElMessage.success('导出成功');
    handleClose();
  } catch (error) {
    console.error('Export failed:', error);
    ElMessage.error('导出失败');
  }
};
</script>

<style scoped>
/* Add any specific styles if needed */
</style>
