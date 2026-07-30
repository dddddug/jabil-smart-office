<template>
  <div class="dept-calc-rules-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">班次时长规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ 班次时长规则配置</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddRuleDialog">➕新增规则</button>
        </div>
      </div>

      <div class="card-body">
        <!-- 筛选区域 -->
        <div class="filter-area">
          <div class="form-group">
            <label>厂区:</label>
            <select v-model="filterPlantId" @change="fetchDepartments">
              <option :value="0">全部厂区</option>
              <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>部门:</label>
            <select v-model="filterDepartmentId">
              <option :value="0">全部部门</option>
              <option v-for="dept in filteredDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>班次名称:</label>
            <input type="text" v-model="filterShiftName" placeholder="输入班次名称">
          </div>
          <div class="form-group">
            <label>状态:</label>
            <select v-model="filterStatus">
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <button class="btn btn-primary" @click="fetchRules">查询</button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>厂区</th>
                <th>部门</th>
                <th>班次名称</th>
                <th>时长 (小时)</th>
                <th>上班时间说明</th>
                <th>状态</th>
                <th>启用日期</th>
                <th>停用日期</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, index) in rulesData" :key="rule.id" @click="selectRule(rule)" :class="{ 'selected': selectedRule && selectedRule.id === rule.id }">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ rule.plantName }}</td>
                <td>{{ rule.departmentName }}</td>
                <td>{{ rule.shiftName }}</td>
                <td>{{ rule.durationHours }}</td>
                <td>{{ rule.description }}</td>
                <td>
                  <span class="status-badge" :class="rule.status === 'active' ? 'success' : 'danger'">
                    {{ rule.status === 'active' ? '启用' : '停用' }}
                  </span>
                </td>
                <td>{{ rule.enabledAt || '-' }}</td>
                <td>{{ rule.disabledAt || '-' }}</td>
                <td>{{ rule.createdAt }}</td>
                <td>{{ rule.updatedAt }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click.stop="openEditRuleDialog(rule)">编辑</button>
                    <button class="action-btn secondary" @click.stop="toggleRuleStatus(rule)">
                      {{ rule.status === 'active' ? '停用' : '启用' }}
                    </button>
                    <button class="action-btn delete" @click.stop="deleteRule(rule)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
        </div>

      </div>
    </div>

    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑规则' : '新增规则' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveRule">
            <div class="form-group">
              <label>厂区 *</label>
              <select v-model="currentRule.plantId" :disabled="isEditMode" required>
                <option :value="null" disabled>请选择厂区</option>
                <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>部门 *</label>
              <select v-model="currentRule.departmentId" :disabled="isEditMode" required>
                <option :value="undefined" disabled>请选择部门</option>
                <option v-for="dept in dialogDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>班次名称 *</label>
              <input type="text" v-model="currentRule.shiftName" :disabled="isEditMode" required>
            </div>
            <div class="form-group">
              <label>时长 (小时) *</label>
              <input type="number" v-model.number="currentRule.durationHours" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>上班时间说明</label>
              <input type="text" v-model="currentRule.description">
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveRule">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ShiftDurationRuleForm } from '@/types/schedule';

interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface ShiftDurationRule {
  id: number;
  plantId: number;
  plantName: string;
  departmentId: number;
  departmentName: string;
  shiftName: string;
  durationHours: number;
  description: string;
  status: 'active' | 'inactive';
  enabledAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PlantsResponse {
  plants: Plant[];
}

interface DepartmentsResponse {
  departments: Department[];
}

interface RulesListResponse {
  list: ShiftDurationRule[];
  total: number;
}

const rulesData = ref<ShiftDurationRule[]>([]);
const selectedRule = ref<ShiftDurationRule | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentRule = ref<ShiftDurationRuleForm>({
  plantId: null,
  departmentId: undefined,
  shiftName: '',
  durationHours: 0.00,
  description: '',
});

const currentPage = ref(1);
const pageSize = ref(10);
const totalRules = ref(0);
const filterPlantId = ref(0);
const filterDepartmentId = ref(0);
const filterShiftName = ref('');
const filterStatus = ref('');

const totalPages = computed(() => Math.ceil(totalRules.value / pageSize.value));

const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const filteredDepartments = ref<Department[]>([]);

const dialogDepartments = computed(() => {
  if (!currentRule.value.plantId || currentRule.value.plantId === 0) {
    return departments.value;
  }
  return departments.value.filter(d => d.plantId === currentRule.value.plantId);
});

const fetchPlants = async () => {
  try {
    const res = await request.get<PlantsResponse>('/plants');
    plants.value = res?.plants || [];
  } catch (error) {
    ElMessage.error('获取厂区列表失败:' + error);
  }
};

const fetchDepartments = async () => {
  try {
    const data = await request.get<DepartmentsResponse>('/departments');
    departments.value = data?.departments || [];
    filteredDepartments.value = filterPlantId.value === 0
      ? departments.value
      : departments.value.filter(d => d.plantId === filterPlantId.value);
    filterDepartmentId.value = 0;
  } catch (error) {
    ElMessage.error('获取部门列表失败:' + error);
  }
};

watch(filterPlantId, (newPlantId) => {
  filteredDepartments.value = newPlantId === 0
    ? departments.value
    : departments.value.filter(d => d.plantId === newPlantId);
  filterDepartmentId.value = 0;
});

const fetchRules = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      plantId: filterPlantId.value === 0 ? undefined : filterPlantId.value,
      departmentId: filterDepartmentId.value === 0 ? undefined : filterDepartmentId.value,
      shiftName: filterShiftName.value || undefined,
      status: filterStatus.value || undefined,
    };
    const res = await request.get<RulesListResponse>('/config/shift-duration-rules', { params });
    rulesData.value = res?.list || [];
    totalRules.value = res?.total || 0;
  } catch (error) {
    ElMessage.error('获取部门计算规则失败:' + error);
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchRules();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchRules();
  }
};

onMounted(() => {
  fetchPlants();
  fetchRules();
});

const selectRule = (rule: ShiftDurationRule) => {
  selectedRule.value = rule;
};

const openAddRuleDialog = async () => {
  isEditMode.value = false;
  currentRule.value = {
    plantId: plants.value.length > 0 ? plants.value[0]!.id : null,
    departmentId: undefined,
    shiftName: '',
    durationHours: 0.00,
    description: '',
  };
  await fetchDepartments();
  isDialogOpen.value = true;
};

const openEditRuleDialog = (rule: ShiftDurationRule) => {
  isEditMode.value = true;
  currentRule.value = {
    id: rule.id,
    plantId: rule.plantId,
    departmentId: rule.departmentId,
    shiftName: rule.shiftName,
    durationHours: rule.durationHours,
    description: rule.description || '',
  };
  isDialogOpen.value = true;
};

watch(() => currentRule.value.plantId, (newPlantId, oldPlantId) => {
  if (newPlantId !== oldPlantId) {
    currentRule.value.departmentId = undefined;
  }
});

const saveRule = async () => {
  try {
    if (isEditMode.value) {
      await request.put(`/config/shift-duration-rules/${currentRule.value.id}`, {
        shiftName: currentRule.value.shiftName,
        durationHours: currentRule.value.durationHours,
        description: currentRule.value.description,
      });
      closeDialog();
      // 关闭弹窗后再刷新，确保UI更新
      setTimeout(() => {
        fetchRules();
        ElMessage.success('规则更新成功！');
      }, 100);
    } else {
      await request.post('/config/shift-duration-rules', {
        plantId: currentRule.value.plantId,
        departmentId: currentRule.value.departmentId,
        shiftName: currentRule.value.shiftName,
        durationHours: currentRule.value.durationHours,
        description: currentRule.value.description,
      });
      closeDialog();
      // 关闭弹窗后再刷新，确保UI更新
      setTimeout(() => {
        currentPage.value = 1;
        filterPlantId.value = 0;
        filterDepartmentId.value = 0;
        filterShiftName.value = '';
        filterStatus.value = '';
        fetchRules();
        ElMessage.success('规则创建成功！');
      }, 100);
    }
  } catch (error: any) {
    ElMessage.error('保存规则异常: ' + (error.message || '未知错误'));
  }
};

const toggleRuleStatus = async (rule: ShiftDurationRule) => {
  const confirmResult = await ElMessageBox.confirm(
    `确定要${rule.status === 'active' ? '停用' : '启用'}规则"${rule.plantName}-${rule.departmentName}-${rule.shiftName} (${rule.description || '无说明'})" 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).catch(() => false);

  if (confirmResult === false) {
    return;
  }

  try {
    const endpoint = rule.status === 'active' ? `/config/shift-duration-rules/${rule.id}/disable` : `/config/shift-duration-rules/${rule.id}/enable`;
    await request.post(endpoint);
    fetchRules();
    ElMessage.success('规则状态更新成功！');
  } catch (error: any) {
    ElMessage.error('更新规则状态异常: ' + (error.message || '未知错误'));
  }
};

const deleteRule = async (rule: ShiftDurationRule) => {
  const confirmResult = await ElMessageBox.confirm(
    `确定要删除规则"${rule.plantName}-${rule.departmentName}-${rule.shiftName} (${rule.description || '无说明'})" 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).catch(() => false);

  if (confirmResult === false) {
    return;
  }

  try {
    await request.delete(`/config/shift-duration-rules/${rule.id}`);
    fetchRules();
    if (selectedRule.value?.id === rule.id) {
      selectedRule.value = null;
    }
    ElMessage.success('规则删除成功！');
  } catch (error: any) {
    ElMessage.error('删除规则异常: ' + (error.message || '未知错误'));
  }
};

const closeDialog = () => {
  isDialogOpen.value = false;
};
</script>

<style scoped>
.dept-calc-rules-config-container {
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

.card-body {
  padding: 24px;
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

.status-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.table-actions {
  display: flex;
  gap: 8px;
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

.action-btn.secondary {
  background-color: #F3F4F6;
  color: #4B5563;
}

.action-btn.secondary:hover {
  background-color: #E5E7EB;
}

.action-btn.delete {
  background-color: #FEF2F2;
  color: #DC2626;
}

.action-btn.delete:hover {
  background-color: #FEE2E2;
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
  font-size: 24px;
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
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
.filter-area {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 16px !important;
  margin-bottom: 20px !important;
  align-items: flex-end !important;
}

.filter-area .form-group {
  flex: 1 !important;
  min-width: 180px !important;
  margin-bottom: 0 !important;
}

.filter-area .btn {
  margin-top: 28px !important; /* 根据 label 和 input 的高度调整 */
}
</style>