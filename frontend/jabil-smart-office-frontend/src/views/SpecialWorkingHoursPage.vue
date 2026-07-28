<template>
  <div class="special-working-hours-page">
    <div class="header-area">
      <!-- 指标卡区域 -->
      <el-card class="box-card statistic-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>总计用时</span>
          </div>
        </template>
        <div class="statistic-content">
          <el-statistic :value="totalDuration" suffix="小时"></el-statistic>
        </div>
      </el-card>

      <el-card class="box-card statistic-card event-duration-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>各事项分别用时</span>
          </div>
        </template>
        <div class="statistic-content event-list">
          <div v-for="(duration, eventName) in eventDurations" :key="eventName" class="event-item">
            <span>{{ eventName }}</span>
            <el-statistic :value="duration" suffix="小时" :precision="1"></el-statistic>
          </div>
          <div v-if="Object.keys(eventDurations).length === 0" class="no-data">暂无数据</div>
        </div>
      </el-card>

      <!-- 操作区域 -->
      <el-card class="box-card action-card" shadow="never">
        <div class="action-buttons">
          <el-button type="primary" icon="el-icon-plus" @click="handleAdd">新增</el-button>
          <el-button type="success" icon="el-icon-upload2" @click="handleBatchImport">批量导入</el-button>
          <el-button type="danger" icon="el-icon-delete" :disabled="selectedIds.length === 0" @click="handleBatchDelete">批量删除</el-button>
          <el-button type="warning" icon="el-icon-download" @click="handleExportExcel">导出 Excel</el-button>
        </div>
      </el-card>

    </div>

    <!-- 表格区域 -->
    <el-card class="box-card" shadow="never">
      <SpecialWorkingHoursTable
        :table-data="tableData"
        :total="total"
        :pagination="pagination"
        :start-date="startDate"
        :end-date="endDate"
        @selection-change="handleTableSelectionChange"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <SpecialWorkingHoursFormModal
      v-model:visible="formModalVisible"
      :title="formModalTitle"
      :form-data="currentFormData"
      @submit="handleSubmitForm"
    />

    <!-- 批量导入弹窗 -->
    <SpecialWorkingHoursImportModal
      v-model:visible="importModalVisible"
      @import-success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import type { Ref } from 'vue';
import SpecialWorkingHoursTable from '@/components/specialWorkingHours/SpecialWorkingHoursTable.vue';
import SpecialWorkingHoursFormModal from '@/components/specialWorkingHours/SpecialWorkingHoursFormModal.vue';
import SpecialWorkingHoursImportModal from '@/components/specialWorkingHours/SpecialWorkingHoursImportModal.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getSpecialWorkingHoursList,
  addSpecialWorkingHours,
  deleteSpecialWorkingHours,
  exportSpecialWorkingHours,
} from '@/api/specialWorkingHours';
import { downloadFile } from '@/utils/excelUtils';
import { clearRequestCache } from '@/utils/request';
import eventBus from '@/utils/eventBus';
import dayjs from '@/plugins/dayjs';

interface Props {
  startDate?: string;
  endDate?: string;
}

const props = defineProps<Props>();

interface SpecialWorkingHoursItem {
  id?: number;
  event: string;
  employeeName: string;
  employeeId: number;
  department: string;
  startTime: string;
  endTime: string;
  duration?: number;
  reason?: string;
}

interface SearchForm {
  event: string;
  employeeName: string;
}

interface Pagination {
  pageNum: number;
  pageSize: number;
}

const searchForm: SearchForm = reactive({
  event: '',
  employeeName: ''
});

const tableData: Ref<SpecialWorkingHoursItem[]> = ref([]);
const total = ref(0);
const pagination: Pagination = reactive({
  pageNum: 1,
  pageSize: 20
});
const selectedIds: Ref<number[]> = ref([]); // 表格选中项的ID
const formModalVisible = ref(false);
const formModalTitle = ref('新增特殊工时');
const currentFormData: Ref<SpecialWorkingHoursItem> = ref({} as SpecialWorkingHoursItem);
const importModalVisible = ref(false);
const calculateDuration = (startTimeStr: string, endTimeStr: string): number => {
  if (!startTimeStr || !endTimeStr) return 0;
  const start = dayjs(`2000-01-01 ${startTimeStr}`);
  const end = dayjs(`2000-01-01 ${endTimeStr}`);
  return end.diff(start, 'minute');
};

const totalDuration = computed(() => {
  let totalMinutes = 0;
  tableData.value.forEach(item => {
    totalMinutes += calculateDuration(item.startTime, item.endTime);
  });
  return parseFloat((totalMinutes / 60).toFixed(1));
});

const eventDurations = computed(() => {
  const durations: { [key: string]: number } = {};
  tableData.value.forEach(item => {
    const duration = calculateDuration(item.startTime, item.endTime);
    durations[item.event] = (durations[item.event] || 0) + duration;
  });
  // Convert minutes to hours and format to 1 decimal place
  for (const eventName in durations) {
    durations[eventName] = parseFloat(((durations[eventName] || 0) / 60).toFixed(1));
  }
  return durations;
});

// Define functions directly
const getList = async () => {
  const params = {
    event: searchForm.event,
    employeeName: searchForm.employeeName,
    startDate: props.startDate || '',
    endDate: props.endDate || '',
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize
  };
  try {
    const res = await getSpecialWorkingHoursList(params);
    // 请求拦截器已经返回了 data 部分，所以 res 已经是 { list, total } 结构
    tableData.value = res.list || [];
    total.value = res.total || 0;
  } catch (error: any) {
    // 如果是静默取消的请求，不显示错误
    if (error.isCancelled || error.silent) return;
    ElMessage.error('获取列表失败：' + error.message);
  }
};

const handleTableSelectionChange = (val: SpecialWorkingHoursItem[]) => {
  selectedIds.value = val.map(item => item.id!);
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  getList();
};

const handleCurrentChange = (val: number) => {
  pagination.pageNum = val;
  getList();
};

const handleAdd = () => {
  formModalTitle.value = '新增特殊工时';
  currentFormData.value = {} as SpecialWorkingHoursItem;
  formModalVisible.value = true;
};

const handleEdit = (row: SpecialWorkingHoursItem) => {
  formModalTitle.value = '编辑特殊工时';
  currentFormData.value = { ...row };
  formModalVisible.value = true;
};

const handleDelete = async (id: number) => {
  ElMessageBox.confirm('确定删除该条记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteSpecialWorkingHours([id]);
      if (res.success) {
        ElMessage.success('删除成功');
        clearRequestCache(); // 清除请求缓存以确保获取最新数据
        getList();
        // 通知工位安排页面刷新
        eventBus.emit('special-working-hours-changed');
      } else {
        ElMessage.error(res.error || '删除失败');
      }
    } catch (error: any) {
      ElMessage.error('删除失败：' + error.message);
    }
  }).catch(() => {});
};

const handleBatchImport = () => {
  importModalVisible.value = true;
};

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请至少选择一条记录进行删除');
    return;
  }
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条记录吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteSpecialWorkingHours(selectedIds.value);
      if (res.success) {
        ElMessage.success(`成功删除 ${res.deletedCount} 条记录`);
        clearRequestCache(); // 清除请求缓存以确保获取最新数据
        getList();
        selectedIds.value = [];
        // 通知工位安排页面刷新
        eventBus.emit('special-working-hours-changed');
      } else {
        ElMessage.error(res.error || '批量删除失败');
      }
    } catch (error: any) {
      ElMessage.error('批量删除失败：' + error.message);
    }
  }).catch(() => {});
};

const handleExportExcel = async () => {
  try {
    const params = {
      ...searchForm,
    };
    const res = await exportSpecialWorkingHours(params);
    // 请求拦截器已返回 data 部分，res 本身就是 blob
    downloadFile(res, '特殊工时记录.xlsx');
    ElMessage.success('Excel 导出成功');
  } catch (error: any) {
    ElMessage.error('Excel 导出失败：' + error.message);
  }
};

const handleSubmitForm = async (formData: SpecialWorkingHoursItem) => {
  try {
    const res = await addSpecialWorkingHours(formData);
    ElMessage.success('操作成功');
    formModalVisible.value = false;
    clearRequestCache(); // 清除请求缓存以确保获取最新数据
    getList();
    // 通知工位安排页面刷新
    eventBus.emit('special-working-hours-changed');
  } catch (error: any) {
    ElMessage.error('操作失败：' + (error.message || error.error || error));
  }
};

// 导入成功后的处理
const handleImportSuccess = () => {
  clearRequestCache(); // 清除请求缓存以确保获取最新数据
  getList();
  // 通知工位安排页面刷新
  eventBus.emit('special-working-hours-changed');
};

// 监听 startDate/endDate props 变化，视图切换时自动刷新
watch([() => props.startDate, () => props.endDate], () => {
  // 只有当 props 有值时才刷新
  if (props.startDate && props.endDate) {
    pagination.pageNum = 1;
    getList();
  }
}, { immediate: true });

// Lifecycle hook
onMounted(() => {
  getList(); // Initial load

  // 监听工位安排变化，刷新特殊工时列表
  eventBus.on('workstation-arrangement-changed', () => {
    getList();
  });
});
</script>

<style scoped>
.special-working-hours-page {
  padding: 0px;
}
.header-area {
    display: flex;
    gap: 10px; /* 稍微减少卡片间距 */
    margin-bottom: 10px; /* 稍微减少头部区域和表格区域之间的间距 */
    background-color: var(--el-bg-color-page);
    padding: 10px; /* 重新添加内边距，实现下移和整体紧凑 */
    align-items: stretch;
    flex-wrap: wrap;
  }
.header-area > .el-card:first-child {
  margin-top: 0 !important; /* 确保头部区域的第一个卡片没有顶部外边距 */
}

.el-card.box-card {
  border-radius: 8px;
  .el-card__header {
    padding: 12px 15px;
    font-size: 14px;
    font-weight: bold;
    border-bottom: 1px solid var(--el-card-border-color);
    background-color: var(--el-fill-color-light); /* 添加背景色 */
  }
  .el-card__body {
    padding: 15px;
    display: flex; /* 让内容在 body 内垂直居中 */
    flex-direction: column;
    justify-content: center;
  }
}
.statistic-card {
  flex-shrink: 0;
  width: 220px; /* 增加宽度 */
  .card-header {
    font-size: 14px;
    font-weight: bold;
    color: var(--el-color-primary); /* 标题文字颜色 */
  }
  .statistic-content {
    text-align: center;
    .el-statistic {
      --el-statistic-content-font-size: 22px;
      --el-statistic-content-color: var(--el-color-primary);
    }
  }
}
.event-duration-card {
  flex-grow: 1; /* 占据剩余空间 */
  min-width: 300px; /* 最小宽度 */
  .card-header {
    font-size: 14px;
    font-weight: bold;
    color: var(--el-color-success); /* 标题文字颜色 */
  }
  .statistic-content {
    text-align: left;
    font-size: 13px;
    max-height: 100px; /* 设置最大高度 */
    overflow-y: auto; /* 溢出时滚动 */
    .event-item {
      display: flex;
      justify-content: space-between;
      line-height: 1.6;
      margin-bottom: 5px;
      &:last-child {
        margin-bottom: 0;
      }
      .el-statistic {
        --el-statistic-content-font-size: 15px;
        --el-statistic-content-color: var(--el-color-success);
      }
    }
    .no-data {
      text-align: center;
      color: #909399;
    }
  }
}
.action-card {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 200px; /* 最小宽度 */
  .action-buttons {
    display: flex;
    flex-direction: column; /* 按钮垂直堆叠 */
    gap: 10px;
    justify-content: center; /* 垂直居中 */
    align-items: flex-end; /* 靠右对齐 */
  }
}
.special-working-hours-page .el-card {
  margin-top: 10px !important;
}
</style>
