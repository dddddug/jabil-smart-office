<template>
  <div class="six-s-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">现场管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">6S管理</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">已整改</div>
          <div class="stat-value">156</div>
          <div class="stat-change positive">+12%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-label">待处理</div>
          <div class="stat-value">23</div>
          <div class="stat-change negative">-5%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📷</div>
        <div class="stat-content">
          <div class="stat-label">今日检查</div>
          <div class="stat-value">45</div>
          <div class="stat-change positive">+8</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-label">优秀区域</div>
          <div class="stat-value">12</div>
          <div class="stat-change positive">+2</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🧹 6S检查记录</div>
        <div class="table-card-actions">
          <select v-model="filterStatus" class="select-input">
            <option value="">全部状态</option>
            <option value="pending">待整改</option>
            <option value="resolved">已整改</option>
            <option value="verified">已验证</option>
          </select>
          <select v-model="filterArea" class="select-input">
            <option value="">全部区域</option>
            <option value="workshop">车间</option>
            <option value="warehouse">仓库</option>
            <option value="office">办公室</option>
          </select>
          <button class="btn btn-primary" @click="openAddCheckDialog">➕ 新增检查</button>
          <button class="btn btn-secondary" @click="exportReport">📤 导出报告</button>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>检查编号</label>
            <input type="text" v-model="searchQuery.checkNo" placeholder="请输入检查编号" />
          </div>
          <div class="search-item">
            <label>检查人</label>
            <input type="text" v-model="searchQuery.checker" placeholder="请输入检查人" />
          </div>
          <div class="search-item">
            <label>日期范围</label>
            <input type="date" v-model="searchQuery.startDate" />
            <input type="date" v-model="searchQuery.endDate" />
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
                <th>检查编号</th>
                <th>区域</th>
                <th>位置</th>
                <th>问题描述</th>
                <th>严重程度</th>
                <th>状态</th>
                <th>检查人</th>
                <th>检查日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="check in paginatedChecks" :key="check.id" :class="{ 'selected': selectedCheck && selectedCheck.id === check.id }" @click="selectCheck(check)">
                <td><input type="checkbox" :value="check.id" v-model="selectedIds" @click.stop /></td>
                <td>{{ check.id }}</td>
                <td>{{ check.checkNo }}</td>
                <td>{{ check.area }}</td>
                <td>{{ check.location }}</td>
                <td class="description-cell">{{ check.description }}</td>
                <td>
                  <span class="severity-badge" :class="getSeverityClass(check.severity)">{{ getSeverityText(check.severity) }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(check.status)">{{ getStatusText(check.status) }}</span>
                </td>
                <td>{{ check.checker }}</td>
                <td>{{ check.checkDate }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn view" @click.stop="viewCheckDetail(check)">查看</button>
                    <button v-if="check.status === 'pending'" class="action-btn primary" @click.stop="resolveCheck(check)">整改</button>
                    <button v-if="check.status === 'resolved'" class="action-btn success" @click.stop="verifyCheck(check)">验证</button>
                    <button class="action-btn edit" @click.stop="openEditCheckDialog(check)">编辑</button>
                    <button class="action-btn delete" @click.stop="deleteCheck(check)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredChecks.length) }} 条，共 {{ filteredChecks.length }} 条</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isCheckDialogOpen" class="dialog-overlay" @click.self="closeCheckDialog">
      <div class="dialog-content large">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑检查记录' : '新增检查记录' }}</h3>
          <button class="dialog-close" @click="closeCheckDialog">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveCheck">
            <div class="form-row">
              <div class="form-group">
                <label>检查编号 *</label>
                <input type="text" v-model="currentCheck.checkNo" required />
              </div>
              <div class="form-group">
                <label>区域 *</label>
                <select v-model="currentCheck.area" required>
                  <option value="">请选择区域</option>
                  <option value="workshop">车间</option>
                  <option value="warehouse">仓库</option>
                  <option value="office">办公室</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>位置 *</label>
                <input type="text" v-model="currentCheck.location" required placeholder="例如：A车间-3号线" />
              </div>
              <div class="form-group">
                <label>严重程度 *</label>
                <select v-model="currentCheck.severity" required>
                  <option value="">请选择</option>
                  <option value="low">一般</option>
                  <option value="medium">中等</option>
                  <option value="high">严重</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>问题描述 *</label>
              <textarea v-model="currentCheck.description" rows="4" required placeholder="请详细描述发现的问题"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>检查人 *</label>
                <input type="text" v-model="currentCheck.checker" required />
              </div>
              <div class="form-group">
                <label>检查日期 *</label>
                <input type="date" v-model="currentCheck.checkDate" required />
              </div>
            </div>
            <div class="form-group" v-if="isEditMode && currentCheck.status !== 'pending'">
              <label>整改说明</label>
              <textarea v-model="currentCheck.resolveNote" rows="3" placeholder="请输入整改说明"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeCheckDialog">取消</button>
          <button class="btn btn-primary" @click="saveCheck">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatShanghaiDate } from '../utils/dateUtils';

interface CheckRecord {
  id: number;
  checkNo: string;
  area: string;
  location: string;
  description: string;
  severity: string;
  status: string;
  checker: string;
  checkDate: string;
  resolveNote?: string;
}

const checks = ref<CheckRecord[]>([]);
const selectedCheck = ref<CheckRecord | null>(null);
const selectedIds = ref<number[]>([]);
const selectAll = ref(false);
const isCheckDialogOpen = ref(false);
const isEditMode = ref(false);
const currentCheck = ref<CheckRecord>({
  id: 0,
  checkNo: '',
  area: '',
  location: '',
  description: '',
  severity: '',
  status: 'pending',
  checker: '',
  checkDate: ''
});

const searchQuery = ref({
  checkNo: '',
  checker: '',
  startDate: '',
  endDate: ''
});

const filterStatus = ref('');
const filterArea = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const filteredChecks = computed(() => {
  return checks.value.filter(check => {
    const matchCheckNo = !searchQuery.value.checkNo || (check.checkNo || '').toLowerCase().includes((searchQuery.value.checkNo || '').toLowerCase());
    const matchChecker = !searchQuery.value.checker || (check.checker || '').toLowerCase().includes((searchQuery.value.checker || '').toLowerCase());
    const matchStatus = !filterStatus.value || check.status === filterStatus.value;
    const matchArea = !filterArea.value || check.area === filterArea.value;
    return matchCheckNo && matchChecker && matchStatus && matchArea;
  });
});

const paginatedChecks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredChecks.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredChecks.value.length / pageSize.value)));

const getSeverityClass = (severity: string) => {
  const map: Record<string, string> = {
    'low': 'info',
    'medium': 'warning',
    'high': 'danger'
  };
  return map[severity] || '';
};

const getSeverityText = (severity: string) => {
  const map: Record<string, string> = {
    'low': '一般',
    'medium': '中等',
    'high': '严重'
  };
  return map[severity] || severity;
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'warning',
    'resolved': 'info',
    'verified': 'success'
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'pending': '待整改',
    'resolved': '已整改',
    'verified': '已验证'
  };
  return map[status] || status;
};

const getAreaText = (area: string) => {
  const map: Record<string, string> = {
    'workshop': '车间',
    'warehouse': '仓库',
    'office': '办公室'
  };
  return map[area] || area;
};

const loadChecks = () => {
  checks.value = [
    { id: 1, checkNo: '6S-20240625-001', area: 'workshop', location: 'A车间-3号线', description: '物料堆放不整齐，存在安全隐患', severity: 'high', status: 'pending', checker: '张工', checkDate: '2024-06-25' },
    { id: 2, checkNo: '6S-20240625-002', area: 'warehouse', location: '原料仓库-B区', description: '消防通道被物料占用', severity: 'medium', status: 'resolved', checker: '李工', checkDate: '2024-06-25', resolveNote: '已清理通道，确保畅通' },
    { id: 3, checkNo: '6S-20240624-001', area: 'office', location: '研发部办公区', description: '文件柜标识不清晰，物品摆放混乱', severity: 'low', status: 'verified', checker: '王工', checkDate: '2024-06-24', resolveNote: '已重新整理标识' },
    { id: 4, checkNo: '6S-20240624-002', area: 'workshop', location: 'B车间-5号线', description: '设备清洁不到位，有积尘', severity: 'medium', status: 'pending', checker: '赵工', checkDate: '2024-06-24' },
    { id: 5, checkNo: '6S-20240623-001', area: 'warehouse', location: '成品仓库-A区', description: '货物高度超出限制，存在倒塌风险', severity: 'high', status: 'resolved', checker: '刘工', checkDate: '2024-06-23', resolveNote: '已重新堆放，确保安全' },
  ];
};

const selectCheck = (check: CheckRecord) => {
  selectedCheck.value = check;
};

const openAddCheckDialog = () => {
  isEditMode.value = false;
  currentCheck.value = {
    id: Date.now(),
    checkNo: '',
    area: '',
    location: '',
    description: '',
    severity: '',
    status: 'pending',
    checker: '',
    checkDate: formatShanghaiDate()
  };
  isCheckDialogOpen.value = true;
};

const openEditCheckDialog = (check: CheckRecord) => {
  isEditMode.value = true;
  currentCheck.value = { ...check };
  isCheckDialogOpen.value = true;
};

const closeCheckDialog = () => {
  isCheckDialogOpen.value = false;
};

const saveCheck = () => {
  if (isEditMode.value) {
    const index = checks.value.findIndex(c => c.id === currentCheck.value.id);
    if (index !== -1) {
      checks.value[index] = currentCheck.value;
    }
  } else {
    checks.value.unshift(currentCheck.value);
  }
  closeCheckDialog();
};

const viewCheckDetail = (check: CheckRecord) => {
  ElMessageBox.alert(`<pre>${JSON.stringify(check, null, 2)}</pre>`, '检查详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定',
  });
};

const resolveCheck = (check: CheckRecord) => {
  ElMessageBox.confirm(
    '确定要标记为已整改吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      check.status = 'resolved';
      ElMessage.success('已标记为已整改！');
    })
    .catch(() => {
      ElMessage.info('已取消操作');
    });
};

const verifyCheck = (check: CheckRecord) => {
  ElMessageBox.confirm(
    '确定要验证通过吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      check.status = 'verified';
      ElMessage.success('已验证通过！');
    })
    .catch(() => {
      ElMessage.info('已取消操作');
    });
};

const deleteCheck = (check: CheckRecord) => {
  ElMessageBox.confirm(
    '确定删除这条检查记录吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      checks.value = checks.value.filter(c => c.id !== check.id);
      if (selectedCheck.value && selectedCheck.value.id === check.id) {
        selectedCheck.value = null;
      }
      ElMessage.success('检查记录已删除！');
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = paginatedChecks.value.map(c => c.id);
  } else {
    selectedIds.value = [];
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.value = { checkNo: '', checker: '', startDate: '', endDate: '' };
  filterStatus.value = '';
  filterArea.value = '';
  currentPage.value = 1;
};

const exportReport = () => {
  ElMessage.info('导出6S检查报告');
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

onMounted(() => {
  loadChecks();
});
</script>

<style scoped>
.six-s-container {
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

.description-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.severity-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.severity-badge.info {
  background-color: #DBEAFE;
  color: #1E40AF;
}

.severity-badge.warning {
  background-color: #FEF3C7;
  color: #D97706;
}

.severity-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
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

.status-badge.info {
  background-color: #DBEAFE;
  color: #1E40AF;
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

.action-btn.primary {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.primary:hover {
  background-color: #DBEAFE;
}

.action-btn.success {
  background-color: #D1FAE5;
  color: #059669;
}

.action-btn.success:hover {
  background-color: #A7F3D0;
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

.dialog-content.large {
  width: 600px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
  min-height: 100px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>
