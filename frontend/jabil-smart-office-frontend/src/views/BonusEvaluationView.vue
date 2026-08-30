<template>
  <div class="bonus-evaluation-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">人事中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">奖金评估</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-label">本月总奖金</div>
          <div class="stat-value">¥258,000</div>
          <div class="stat-change positive">+12.5% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-label">获奖人数</div>
          <div class="stat-value">128</div>
          <div class="stat-change positive">+8 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-label">平均奖金</div>
          <div class="stat-value">¥2,015</div>
          <div class="stat-change positive">+5.2% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">待审批</div>
          <div class="stat-value">15</div>
          <div class="stat-change negative">-3 较上周</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">💰 奖金评估列表</div>
        <div class="table-card-actions">
          <select v-model="filterStatus" class="select-input">
            <option value="">全部状态</option>
            <option value="pending">待审批</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
          </select>
          <select v-model="filterMonth" class="select-input">
            <option value="">全部月份</option>
            <option value="2024-06">2024年6月</option>
            <option value="2024-05">2024年5月</option>
            <option value="2024-04">2024年4月</option>
          </select>
          <button class="btn btn-primary" @click="openAddBonusDialog">➕ 新增评估</button>
          <button class="btn btn-secondary" @click="exportReport">📤 导出报表</button>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>员工姓名</label>
            <input type="text" v-model="searchQuery.name" placeholder="请输入员工姓名" />
          </div>
          <div class="search-item">
            <label>工号</label>
            <input type="text" v-model="searchQuery.employeeId" placeholder="请输入工号" />
          </div>
          <div class="search-item">
            <label>部门</label>
            <select v-model="searchQuery.department">
              <option value="">全部部门</option>
              <option value="生产部">生产部</option>
              <option value="质量部">质量部</option>
              <option value="技术部">技术部</option>
              <option value="人事部">人事部</option>
            </select>
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
                <th>员工姓名</th>
                <th>工号</th>
                <th>部门</th>
                <th>职位</th>
                <th>奖金类型</th>
                <th>金额</th>
                <th>月份</th>
                <th>状态</th>
                <th>评估人</th>
                <th>评估日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bonus in paginatedBonuses" :key="bonus.id" :class="{ 'selected': selectedBonus && selectedBonus.id === bonus.id }" @click="selectBonus(bonus)">
                <td><input type="checkbox" :value="bonus.id" v-model="selectedIds" @click.stop /></td>
                <td>{{ bonus.id }}</td>
                <td>{{ bonus.employeeName }}</td>
                <td>{{ bonus.employeeId }}</td>
                <td>{{ bonus.department }}</td>
                <td>{{ bonus.position }}</td>
                <td>{{ bonus.bonusType }}</td>
                <td class="amount-cell">¥{{ formatAmount(bonus.amount) }}</td>
                <td>{{ bonus.month }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(bonus.status)">{{ getStatusText(bonus.status) }}</span>
                </td>
                <td>{{ bonus.evaluator }}</td>
                <td>{{ bonus.evaluationDate }}</td>
                <td>
                  <div class="table-actions">
                    <button v-if="bonus.status === 'pending'" class="action-btn primary" @click.stop="approveBonus(bonus)">批准</button>
                    <button v-if="bonus.status === 'pending'" class="action-btn warning" @click.stop="rejectBonus(bonus)">拒绝</button>
                    <button class="action-btn edit" @click.stop="openEditBonusDialog(bonus)">编辑</button>
                    <button class="action-btn view" @click.stop="viewBonusDetail(bonus)">查看</button>
                    <button class="action-btn delete" @click.stop="deleteBonus(bonus)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredBonuses.length) }} 条，共 {{ filteredBonuses.length }} 条</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isBonusDialogOpen" class="dialog-overlay" @click.self="closeBonusDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑奖金评估' : '新增奖金评估' }}</h3>
          <button class="dialog-close" @click="closeBonusDialog">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveBonus">
            <div class="form-group">
              <label>员工姓名 *</label>
              <input type="text" v-model="currentBonus.employeeName" required />
            </div>
            <div class="form-group">
              <label>工号 *</label>
              <input type="text" v-model="currentBonus.employeeId" required />
            </div>
            <div class="form-group">
              <label>部门 *</label>
              <select v-model="currentBonus.department" required>
                <option value="">请选择部门</option>
                <option value="生产部">生产部</option>
                <option value="质量部">质量部</option>
                <option value="技术部">技术部</option>
                <option value="人事部">人事部</option>
              </select>
            </div>
            <div class="form-group">
              <label>职位</label>
              <input type="text" v-model="currentBonus.position" />
            </div>
            <div class="form-group">
              <label>奖金类型 *</label>
              <select v-model="currentBonus.bonusType" required>
                <option value="">请选择奖金类型</option>
                <option value="绩效奖金">绩效奖金</option>
                <option value="全勤奖金">全勤奖金</option>
                <option value="优秀员工奖">优秀员工奖</option>
                <option value="特别贡献奖">特别贡献奖</option>
                <option value="年终奖">年终奖</option>
              </select>
            </div>
            <div class="form-group">
              <label>金额 *</label>
              <input type="number" v-model.number="currentBonus.amount" required min="0" />
            </div>
            <div class="form-group">
              <label>月份 *</label>
              <input type="month" v-model="currentBonus.month" required />
            </div>
            <div class="form-group">
              <label>评估说明</label>
              <textarea v-model="currentBonus.description" rows="4" placeholder="请输入评估说明..."></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeBonusDialog">取消</button>
          <button class="btn btn-primary" @click="saveBonus">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { formatShanghaiDate } from '../utils/dateUtils';

interface Bonus {
  id: number;
  employeeName: string;
  employeeId: string;
  department: string;
  position: string;
  bonusType: string;
  amount: number;
  month: string;
  status: string;
  evaluator: string;
  evaluationDate: string;
  description: string;
}

const bonuses = ref<Bonus[]>([]);
const selectedBonus = ref<Bonus | null>(null);
const selectedIds = ref<number[]>([]);
const selectAll = ref(false);
const isBonusDialogOpen = ref(false);
const isEditMode = ref(false);
const currentBonus = ref<Bonus>({
  id: 0,
  employeeName: '',
  employeeId: '',
  department: '',
  position: '',
  bonusType: '',
  amount: 0,
  month: '',
  status: 'pending',
  evaluator: '管理员',
  evaluationDate: formatShanghaiDate(),
  description: ''
});

const searchQuery = ref({
  name: '',
  employeeId: '',
  department: ''
});

const filterStatus = ref('');
const filterMonth = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const filteredBonuses = computed(() => {
  return bonuses.value.filter(bonus => {
    const matchName = !searchQuery.value.name || (bonus.employeeName || '').toString().toLowerCase().includes((searchQuery.value.name || '').toString().toLowerCase());
    const matchEmployeeId = !searchQuery.value.employeeId || (bonus.employeeId || '').toString().includes(searchQuery.value.employeeId);
    const matchDepartment = !searchQuery.value.department || bonus.department === searchQuery.value.department;
    const matchStatus = !filterStatus.value || bonus.status === filterStatus.value;
    const matchMonth = !filterMonth.value || bonus.month === filterMonth.value;
    return matchName && matchEmployeeId && matchDepartment && matchStatus && matchMonth;
  });
});

const paginatedBonuses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredBonuses.value.slice(start, start + pageSize.value);
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBonuses.value.length / pageSize.value)));

const formatAmount = (amount: number) => {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'pending': '待审批',
    'approved': '已批准',
    'rejected': '已拒绝'
  };
  return map[status] || status;
};

const loadBonuses = () => {
  bonuses.value = [
    { id: 1, employeeName: '张三', employeeId: 'EMP001', department: '生产部', position: '技术员', bonusType: '绩效奖金', amount: 3000, month: '2024-06', status: 'approved', evaluator: '管理员', evaluationDate: '2024-06-25', description: '本月表现优秀，完成任务超额' },
    { id: 2, employeeName: '李四', employeeId: 'EMP002', department: '质量部', position: '质检员', bonusType: '全勤奖金', amount: 500, month: '2024-06', status: 'pending', evaluator: '管理员', evaluationDate: '2024-06-25', description: '全勤无迟到早退' },
    { id: 3, employeeName: '王五', employeeId: 'EMP003', department: '技术部', position: '工程师', bonusType: '特别贡献奖', amount: 5000, month: '2024-05', status: 'approved', evaluator: '管理员', evaluationDate: '2024-05-30', description: '项目优化贡献突出' },
    { id: 4, employeeName: '赵六', employeeId: 'EMP004', department: '生产部', position: '操作员', bonusType: '绩效奖金', amount: 2000, month: '2024-06', status: 'pending', evaluator: '管理员', evaluationDate: '2024-06-25', description: '本月工作认真负责' },
    { id: 5, employeeName: '孙七', employeeId: 'EMP005', department: '人事部', position: '人事专员', bonusType: '优秀员工奖', amount: 1500, month: '2024-05', status: 'rejected', evaluator: '管理员', evaluationDate: '2024-05-28', description: '不符合评奖条件' },
  ];
};

const selectBonus = (bonus: Bonus) => {
  selectedBonus.value = bonus;
};

const openAddBonusDialog = () => {
  isEditMode.value = false;
  currentBonus.value = {
    id: Date.now(),
    employeeName: '',
    employeeId: '',
    department: '',
    position: '',
    bonusType: '',
    amount: 0,
    month: '',
    status: 'pending',
    evaluator: '管理员',
    evaluationDate: formatShanghaiDate(),
    description: ''
  };
  isBonusDialogOpen.value = true;
};

const openEditBonusDialog = (bonus: Bonus) => {
  isEditMode.value = true;
  currentBonus.value = { ...bonus };
  isBonusDialogOpen.value = true;
};

const closeBonusDialog = () => {
  isBonusDialogOpen.value = false;
};

const saveBonus = () => {
  if (isEditMode.value) {
    const index = bonuses.value.findIndex(b => b.id === currentBonus.value.id);
    if (index !== -1) {
      bonuses.value[index] = currentBonus.value;
    }
  } else {
    bonuses.value.unshift(currentBonus.value);
  }
  closeBonusDialog();
};

const approveBonus = (bonus: Bonus) => {
  ElMessageBox.confirm(
    '确定批准这笔奖金吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      bonus.status = 'approved';
      ElMessage.success({ message: '奖金已批准！', showClose: true, duration: 3000 });
    })
    .catch(() => {
      ElMessage.info({ message: '已取消批准', showClose: true, duration: 3000 });
    });
};

const rejectBonus = (bonus: Bonus) => {
  ElMessageBox.confirm(
    '确定拒绝这笔奖金吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      bonus.status = 'rejected';
      ElMessage.success({ message: '奖金已拒绝！', showClose: true, duration: 3000 });
    })
    .catch(() => {
      ElMessage.info({ message: '已取消拒绝', showClose: true, duration: 3000 });
    });
};

const viewBonusDetail = (bonus: Bonus) => {
  ElMessageBox.alert(`<pre>${JSON.stringify(bonus, null, 2)}</pre>`, '奖金详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定',
  });
};

const deleteBonus = (bonus: Bonus) => {
  ElMessageBox.confirm(
    '确定删除这笔奖金评估吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      bonuses.value = bonuses.value.filter(b => b.id !== bonus.id);
      if (selectedBonus.value && selectedBonus.value.id === bonus.id) {
        selectedBonus.value = null;
      }
      ElMessage.success({ message: '奖金评估已删除！', showClose: true, duration: 3000 });
    })
    .catch(() => {
      ElMessage.info({ message: '已取消删除', showClose: true, duration: 3000 });
    });
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = paginatedBonuses.value.map(b => b.id);
  } else {
    selectedIds.value = [];
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.value = { name: '', employeeId: '', department: '' };
  filterStatus.value = '';
  filterMonth.value = '';
  currentPage.value = 1;
};

const exportReport = () => {
  ElMessage.info({ message: '导出奖金报表', showClose: true, duration: 3000 });
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

onMounted(() => {
  loadBonuses();
});
</script>

<style scoped>
.bonus-evaluation-container {
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

.amount-cell {
  font-weight: 600;
  color: #059669;
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

.action-btn.primary {
  background-color: #D1FAE5;
  color: #059669;
}

.action-btn.primary:hover {
  background-color: #A7F3D0;
}

.action-btn.warning {
  background-color: #FEF3C7;
  color: #D97706;
}

.action-btn.warning:hover {
  background-color: #FDE68A;
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
  width: 550px;
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
