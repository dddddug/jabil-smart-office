<template>
  <div class="missing-material-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item" @click="$router.push('/material-package')" style="cursor: pointer;">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item" @click="$router.push('/material-package')" style="cursor: pointer;">仓储管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">待填充料号</span>
      </div>
      <button type="button" class="btn btn-secondary" @click="$router.push('/material-package')">← 返回物料包装信息</button>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📋 待填充料号</div>
        <div class="table-card-actions">
          <div class="stats-info">
            <span class="stat-item">
              <span class="stat-label">待填充数量：</span>
              <span class="stat-value danger">{{ stats.missingCount }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">已有数量：</span>
              <span class="stat-value">{{ stats.packageCount }}</span>
            </span>
          </div>
          <button type="button" class="btn btn-warning" @click="handleSync" :loading="syncing">
            🔄 同步数据
          </button>
          <button type="button" class="btn btn-secondary" @click="handleExport" :loading="exportLoading">
            📥 导出
          </button>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-item">
          <label>物料号：</label>
          <input type="text" v-model="searchParams.material" placeholder="请输入物料号" @keyup.enter="handleSearch" />
        </div>
        <div class="search-item">
          <label>制造商：</label>
          <input type="text" v-model="searchParams.manufacturer" placeholder="请输入制造商" @keyup.enter="handleSearch" />
        </div>
        <div class="search-actions">
          <button type="button" class="btn btn-secondary" @click="handleReset">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="handleSearch">🔍 搜索</button>
        </div>
      </div>

      <div class="card-body" style="padding: 0;">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 60px;">序号</th>
                <th>物料号</th>
                <th>制造商</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in tableData" :key="item.id">
                <td class="text-center">{{ (pagination.page - 1) * pagination.pageSize + index + 1 }}</td>
                <td>{{ item.material }}</td>
                <td>{{ item.manufacturer || '-' }}</td>
                <td>{{ formatDate(item.createdAt) }}</td>
              </tr>
              <tr v-if="tableData.length === 0">
                <td colspan="4" class="text-center empty-tip">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
import {
  getMissingMaterials,
  getMissingMaterialsStats,
  syncMissingMaterials,
  exportMissingMaterials,
  MissingMaterial
} from '../api/missingMaterialPackage';

const tableData = ref<MissingMaterial[]>([]);
const syncing = ref(false);
const exportLoading = ref(false);

const searchParams = reactive({
  material: '',
  manufacturer: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const stats = reactive({
  missingCount: 0,
  manufacturerCount: 0,
  packageCount: 0
});

// 加载数据
const loadData = async () => {
  try {
    const params = {
      material: searchParams.material || undefined,
      manufacturer: searchParams.manufacturer || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    const res: any = await getMissingMaterials(params);
    const data = res.data || res;
    tableData.value = data.items || [];
    pagination.total = data.total || 0;
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error({ message: '加载数据失败', showClose: true });
  }
};

// 加载统计
const loadStats = async () => {
  try {
    const res: any = await getMissingMaterialsStats();
    const data = res.data || res;
    stats.missingCount = data.missingCount || 0;
    stats.manufacturerCount = data.manufacturerCount || 0;
    stats.packageCount = data.packageCount || 0;
  } catch (error) {
    console.error('加载统计失败:', error);
  }
};

// 同步数据
const handleSync = async () => {
  try {
    syncing.value = true;
    const res: any = await syncMissingMaterials();
    ElMessage.success({ message: res.message || '同步成功', showClose: true });
    // 重新加载数据和统计
    await Promise.all([loadData(), loadStats()]);
  } catch (error: any) {
    console.error('同步失败:', error);
    ElMessage.error({ message: error.message || '同步失败', showClose: true });
  } finally {
    syncing.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchParams.material = '';
  searchParams.manufacturer = '';
  pagination.page = 1;
  loadData();
};

// 分页
const handleSizeChange = () => {
  pagination.page = 1;
  loadData();
};

const handlePageChange = () => {
  loadData();
};

// 导出
const handleExport = async () => {
  try {
    exportLoading.value = true;
    const res: any = await exportMissingMaterials({
      material: searchParams.material || undefined,
      manufacturer: searchParams.manufacturer || undefined
    });

    const data = res.data || res || [];
    if (data.length === 0) {
      ElMessage.warning({ message: '没有可导出的数据', showClose: true });
      return;
    }

    // 构建Excel数据
    const exportData = data.map((item: MissingMaterial, index: number) => ({
      '序号': index + 1,
      '物料号': item.material,
      '制造商': item.manufacturer || '',
      '创建时间': formatDate(item.createdAt)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '待填充料号');

    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },   // 序号
      { wch: 25 }, // 物料号
      { wch: 25 }, // 制造商
      { wch: 20 }  // 创建时间
    ];

    const fileName = `待填充料号_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    ElMessage.success({ message: '导出成功', showClose: true });
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error({ message: '导出失败', showClose: true });
  } finally {
    exportLoading.value = false;
  }
};

// 格式化日期
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 生命周期
onMounted(() => {
  loadData();
  loadStats();
});
</script>

<style scoped>
.missing-material-container {
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

.breadcrumb-item:hover {
  color: #0066CC;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.table-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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
  align-items: center;
}

.stats-info {
  display: flex;
  gap: 20px;
  margin-right: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.stat-value.danger {
  color: #DC2626;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
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

.btn-warning {
  background-color: #F59E0B;
  color: #FFFFFF;
}

.btn-warning:hover {
  background-color: #D97706;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px;
  background-color: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.search-item input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  width: 160px;
}

.search-item input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  font-size: 14px;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.text-center {
  text-align: center;
}

.empty-tip {
  color: #9CA3AF;
  font-style: italic;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>
