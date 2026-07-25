<template>
  <div class="bin-volume-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">仓储管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">料箱容量管理</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-label">总料箱数</div>
          <div class="stat-value">1,250</div>
          <div class="stat-change positive">+12.5%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">已使用</div>
          <div class="stat-value">892</div>
          <div class="stat-change positive">71.4%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-label">容量告警</div>
          <div class="stat-value">24</div>
          <div class="stat-change negative">-8</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-label">平均容量</div>
          <div class="stat-value">68.5%</div>
          <div class="stat-change positive">+5.2%</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📦 料箱容量列表</div>
        <div class="table-card-actions">
          <select v-model="filterZone" class="select-input">
            <option value="">全部区域</option>
            <option value="zone-a">A区</option>
            <option value="zone-b">B区</option>
            <option value="zone-c">C区</option>
          </select>
          <select v-model="filterStatus" class="select-input">
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="warning">容量告警</option>
            <option value="full">已满</option>
          </select>
          <button class="btn btn-primary" @click="openAddBinDialog">➕ 新增料箱</button>
          <button class="btn btn-secondary" @click="exportData">📤 导出</button>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>料箱编号</label>
            <input type="text" v-model="searchQuery.binCode" placeholder="请输入料箱编号" />
          </div>
          <div class="search-item">
            <label>物料编码</label>
            <input type="text" v-model="searchQuery.materialCode" placeholder="请输入物料编码" />
          </div>
          <div class="search-item">
            <label>位置</label>
            <input type="text" v-model="searchQuery.location" placeholder="请输入位置" />
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" /></th>
                <th>ID</th>
                <th>料箱编号</th>
                <th>区域</th>
                <th>位置</th>
                <th>物料编码</th>
                <th>物料名称</th>
                <th>容量</th>
                <th>已用</th>
                <th>使用率</th>
                <th>状态</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bin in paginatedBins" :key="bin.id" :class="{ 'selected': selectedBin && selectedBin.id === bin.id }" @click="selectBin(bin)">
                <td><input type="checkbox" :value="bin.id" v-model="selectedIds" @click.stop /></td>
                <td>{{ bin.id }}</td>
                <td>{{ bin.binCode }}</td>
                <td>{{ bin.zone }}</td>
                <td>{{ bin.location }}</td>
                <td>{{ bin.materialCode }}</td>
                <td>{{ bin.materialName }}</td>
                <td>{{ bin.maxCapacity }}</td>
                <td>{{ bin.usedCapacity }}</td>
                <td>
                  <div class="progress-wrapper">
                    <div class="progress-bar-small">
                      <div class="progress-fill-small" :class="getProgressClass(bin.usageRate)" :style="{ width: Math.min(bin.usageRate, 100) + '%' }"></div>
                    </div>
                    <span class="progress-text-small">{{ bin.usageRate }}%</span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(bin.status)">{{ getStatusText(bin.status) }}</span>
                </td>
                <td>{{ bin.lastUpdated }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn view" @click.stop="viewBinDetail(bin)">查看</button>
                    <button class="action-btn edit" @click.stop="openEditBinDialog(bin)">编辑</button>
                    <button class="action-btn delete" @click.stop="deleteBin(bin)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredBins.length) }} 条，共 {{ filteredBins.length }} 条</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isBinDialogOpen" class="dialog-overlay" @click.self="closeBinDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑料箱' : '新增料箱' }}</h3>
          <button class="dialog-close" @click="closeBinDialog">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveBin">
            <div class="form-group">
              <label>料箱编号 *</label>
              <input type="text" v-model="currentBin.binCode" required />
            </div>
            <div class="form-group">
              <label>区域 *</label>
              <select v-model="currentBin.zone" required>
                <option value="">请选择区域</option>
                <option value="zone-a">A区</option>
                <option value="zone-b">B区</option>
                <option value="zone-c">C区</option>
              </select>
            </div>
            <div class="form-group">
              <label>位置</label>
              <input type="text" v-model="currentBin.location" placeholder="例如：A-01-01" />
            </div>
            <div class="form-group">
              <label>物料编码</label>
              <input type="text" v-model="currentBin.materialCode" />
            </div>
            <div class="form-group">
              <label>物料名称</label>
              <input type="text" v-model="currentBin.materialName" />
            </div>
            <div class="form-group">
              <label>最大容量 *</label>
              <input type="number" v-model.number="currentBin.maxCapacity" required min="0" />
            </div>
            <div class="form-group">
              <label>已用容量 *</label>
              <input type="number" v-model.number="currentBin.usedCapacity" required min="0" />
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea v-model="currentBin.remark" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeBinDialog">取消</button>
          <button class="btn btn-primary" @click="saveBin">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatShanghaiDate } from '../utils/dateUtils';

interface Bin {
  id: number;
  binCode: string;
  zone: string;
  location: string;
  materialCode: string;
  materialName: string;
  maxCapacity: number;
  usedCapacity: number;
  usageRate: number;
  status: string;
  lastUpdated: string;
  remark: string;
}

const bins = ref<Bin[]>([]);
const selectedBin = ref<Bin | null>(null);
const selectedIds = ref<number[]>([]);
const selectAll = ref(false);
const isBinDialogOpen = ref(false);
const isEditMode = ref(false);
const currentBin = ref<Bin>({
  id: 0,
  binCode: '',
  zone: '',
  location: '',
  materialCode: '',
  materialName: '',
  maxCapacity: 100,
  usedCapacity: 0,
  usageRate: 0,
  status: 'normal',
  lastUpdated: formatShanghaiDate(),
  remark: ''
});

const searchQuery = ref({
  binCode: '',
  materialCode: '',
  location: ''
});

const filterZone = ref('');
const filterStatus = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const filteredBins = computed(() => {
  return bins.value.filter(bin => {
    const matchBinCode = !searchQuery.value.binCode || (bin.binCode || '').toString().toLowerCase().includes((searchQuery.value.binCode || '').toString().toLowerCase());
    const matchMaterialCode = !searchQuery.value.materialCode || (bin.materialCode || '').toString().toLowerCase().includes((searchQuery.value.materialCode || '').toString().toLowerCase());
    const matchLocation = !searchQuery.value.location || (bin.location || '').toString().toLowerCase().includes((searchQuery.value.location || '').toString().toLowerCase());
    const matchZone = !filterZone.value || bin.zone === filterZone.value;
    const matchStatus = !filterStatus.value || bin.status === filterStatus.value;
    return matchBinCode && matchMaterialCode && matchLocation && matchZone && matchStatus;
  });
});

const paginatedBins = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredBins.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBins.value.length / pageSize.value)));

const calculateUsageRate = (used: number, max: number) => {
  if (max === 0) return 0;
  return Math.round((used / max) * 100);
};

const getProgressClass = (value: number) => {
  if (value >= 95) return 'danger';
  if (value >= 80) return 'warning';
  return 'success';
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'normal': 'success',
    'warning': 'warning',
    'full': 'danger'
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'normal': '正常',
    'warning': '容量告警',
    'full': '已满'
  };
  return map[status] || status;
};

const getZoneText = (zone: string) => {
  const map: Record<string, string> = {
    'zone-a': 'A区',
    'zone-b': 'B区',
    'zone-c': 'C区'
  };
  return map[zone] || zone;
};

const loadBins = () => {
  bins.value = [
    { id: 1, binCode: 'BIN-001', zone: 'zone-a', location: 'A-01-01', materialCode: 'MAT-001', materialName: '电子元件A', maxCapacity: 100, usedCapacity: 75, usageRate: 75, status: 'normal', lastUpdated: '2024-06-25', remark: '' },
    { id: 2, binCode: 'BIN-002', zone: 'zone-a', location: 'A-01-02', materialCode: 'MAT-002', materialName: '电子元件B', maxCapacity: 100, usedCapacity: 92, usageRate: 92, status: 'warning', lastUpdated: '2024-06-25', remark: '接近满容量' },
    { id: 3, binCode: 'BIN-003', zone: 'zone-b', location: 'B-01-01', materialCode: 'MAT-003', materialName: '塑料件C', maxCapacity: 200, usedCapacity: 198, usageRate: 99, status: 'full', lastUpdated: '2024-06-24', remark: '已满，请及时处理' },
    { id: 4, binCode: 'BIN-004', zone: 'zone-b', location: 'B-01-02', materialCode: 'MAT-004', materialName: '金属件D', maxCapacity: 150, usedCapacity: 45, usageRate: 30, status: 'normal', lastUpdated: '2024-06-24', remark: '' },
    { id: 5, binCode: 'BIN-005', zone: 'zone-c', location: 'C-01-01', materialCode: 'MAT-005', materialName: '包装材料', maxCapacity: 300, usedCapacity: 150, usageRate: 50, status: 'normal', lastUpdated: '2024-06-23', remark: '' },
  ];
};

const selectBin = (bin: Bin) => {
  selectedBin.value = bin;
};

const openAddBinDialog = () => {
  isEditMode.value = false;
  currentBin.value = {
    id: Date.now(),
    binCode: '',
    zone: '',
    location: '',
    materialCode: '',
    materialName: '',
    maxCapacity: 100,
    usedCapacity: 0,
    usageRate: 0,
    status: 'normal',
    lastUpdated: formatShanghaiDate(),
    remark: ''
  };
  isBinDialogOpen.value = true;
};

const openEditBinDialog = (bin: Bin) => {
  isEditMode.value = true;
  currentBin.value = { ...bin };
  isBinDialogOpen.value = true;
};

const closeBinDialog = () => {
  isBinDialogOpen.value = false;
};

const saveBin = () => {
  currentBin.value.usageRate = calculateUsageRate(currentBin.value.usedCapacity, currentBin.value.maxCapacity);
  if (currentBin.value.usageRate >= 95) {
    currentBin.value.status = 'full';
  } else if (currentBin.value.usageRate >= 80) {
    currentBin.value.status = 'warning';
  } else {
    currentBin.value.status = 'normal';
  }
  
  if (isEditMode.value) {
    const index = bins.value.findIndex(b => b.id === currentBin.value.id);
    if (index !== -1) {
      bins.value[index] = currentBin.value;
    }
  } else {
    bins.value.unshift(currentBin.value);
  }
  closeBinDialog();
};

const viewBinDetail = (bin: Bin) => {
  ElMessageBox.alert(`<pre>${JSON.stringify(bin, null, 2)}</pre>`, '料箱详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定',
  });
};

const deleteBin = (bin: Bin) => {
  ElMessageBox.confirm(
    `确定删除料箱 ${bin.binCode} 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      bins.value = bins.value.filter(b => b.id !== bin.id);
      if (selectedBin.value && selectedBin.value.id === bin.id) {
        selectedBin.value = null;
      }
      ElMessage.success('料箱删除成功！');
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = paginatedBins.value.map(b => b.id);
  } else {
    selectedIds.value = [];
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.value = { binCode: '', materialCode: '', location: '' };
  filterZone.value = '';
  filterStatus.value = '';
  currentPage.value = 1;
};

const exportData = () => {
  ElMessage.info('导出料箱容量数据');
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

onMounted(() => {
  loadBins();
});
</script>

<style scoped>
.bin-volume-container {
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
  padding: 8px 0 16px 0;
  margin-bottom: 0;
}

.breadcrumb {
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #9CA3AF;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 13px;
  font-weight: 500;
}

.stat-change.positive {
  color: #059669;
}

.stat-change.negative {
  color: #DC2626;
}

.table-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
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

.select-input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
}

.card-body {
  padding: 24px;
}

.search-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.search-item input,
.search-item select {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus,
.search-item select:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-actions {
  display: flex;
  gap: 12px;
}

.table-container {
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
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  border-bottom: 2px solid #E5E7EB;
}

.data-table td {
  color: #4B5563;
  font-size: 14px;
  border-bottom: 1px solid #F3F4F6;
}

.data-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.data-table tbody tr.selected {
  background-color: #EFF6FF;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-small {
  width: 80px;
  height: 8px;
  background-color: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill-small {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill-small.success {
  background-color: #059669;
}

.progress-fill-small.warning {
  background-color: #D97706;
}

.progress-fill-small.danger {
  background-color: #DC2626;
}

.progress-text-small {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  min-width: 40px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #D1FAE5;
  color: #059669;
}

.status-badge.warning {
  background-color: #FEF3C7;
  color: #D97706;
}

.status-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.table-actions {
  display: flex;
  gap: 6px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.edit {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.edit:hover {
  background-color: #DBEAFE;
}

.action-btn.view {
  background-color: #F3F4F6;
  color: #4B5563;
}

.action-btn.view:hover {
  background-color: #E5E7EB;
}

.action-btn.delete {
  background-color: #FEF2F2;
  color: #DC2626;
}

.action-btn.delete:hover {
  background-color: #FEE2E2;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  background-color: white;
  color: #4B5563;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #4B5563;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #6B7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background-color: #F3F4F6;
  color: #374151;
}

.dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>
