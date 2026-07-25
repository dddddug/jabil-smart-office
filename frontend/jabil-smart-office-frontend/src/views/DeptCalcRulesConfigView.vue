<template>
  <div class="dept-calc-rules-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">部门计算规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ 部门计算规则配置</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddDialog">➕ 新增规则</button>
        </div>
      </div>

      <div class="card-body">
        <!-- 筛选区域 -->
        <div class="filter-area">
          <div class="form-group">
            <label>厂区:</label>
            <select v-model="filterPlantId">
              <option :value="0">全部厂区</option>
              <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>部门:</label>
            <select v-model="filterDepartmentId">
              <option :value="0">全部部门</option>
              <option v-for="dept in filteredDepartmentsForFilter" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </div>
        </div>

        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th>厂区</th>
                <th>部门</th>
                <th>核算周期</th>
                <th>预估费用</th>
                <th>汇率</th>
                <th>Rate</th>
                <th>状态</th>
                <th>启用时间</th>
                <th>停用时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in filteredRules" :key="rule.id">
                <td>{{ rule.plantName }}</td>
                <td>{{ rule.departmentName }}</td>
                <td>{{ rule.business_month }}</td>
                <td>{{ rule.estimated_cost }}</td>
                <td>{{ rule.exchange_rate }}</td>
                <td>{{ rule.rate_coefficient }}</td>
                <td>
                  <span class="status-badge" :class="getStatus(rule).className">{{ getStatus(rule).text }}</span>
                </td>
                <td>{{ formatDate(rule.startTime) }}</td>
                <td>{{ formatDate(rule.endTime) || '-' }}</td>
                <td>
                  <button class="action-btn danger" @click="deactivateRule(rule.id)" :disabled="isLoading || getStatus(rule).text !== '生效中'">停用</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>新增部门规则</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveRule">
            <div class="form-group">
              <label>厂区 *</label>
              <select v-model="currentRule.plantId" required @change="onPlantChangeInDialog">
                <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>部门 *</label>
              <select v-model="currentRule.departmentId" required>
                <option :value="undefined">请选择部门</option>
                <option v-for="dept in departmentsForDialog" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>核算周期 *</label>
              <input type="month" v-model="currentRule.businessMonth" required>
            </div>
            <div class="form-group">
              <label>预估费用 *</label>
              <input type="number" v-model.number="currentRule.estimatedCost" required>
            </div>
            <div class="form-group">
              <label>汇率 *</label>
              <input type="number" v-model.number="currentRule.exchangeRate" required>
            </div>
            <div class="form-group">
              <label>Rate *</label>
              <input type="number" v-model.number="currentRule.rateCoefficient" required>
            </div>
            <div class="form-group">
              <label>启用时间 *</label>
              <input type="datetime-local" v-model="currentRule.startTime" required>
            </div>
            <div class="form-group">
              <label>停用时间 (可选)</label>
              <input type="datetime-local" v-model="currentRule.endTime">
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveRule">确认新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

// Interfaces
interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface DeptRule {
  id: number;
  plant_id: number;
  plantName: string;
  department_id: number;
  departmentName: string;
  business_month: string;
  estimated_cost: number;
  exchange_rate: number;
  rate_coefficient: number;
  startTime: string;
  endTime: string | null;
}

interface DeptRuleForm {
  plantId?: number;
  departmentId?: number;
  businessMonth: string;
  estimatedCost: number;
  exchangeRate: number;
  rateCoefficient: number;
  startTime: string;
  endTime?: string | null;
}

// State
const isLoading = ref(false);
const rules = ref<DeptRule[]>([]);
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const isDialogOpen = ref(false);
const currentRule = ref<Partial<DeptRuleForm>>({});

// Filters
const filterPlantId = ref(0);
const filterDepartmentId = ref(0);

// Computed
const filteredDepartmentsForFilter = computed(() => {
  if (filterPlantId.value === 0) return departments.value;
  return departments.value.filter(d => d.plant_id === filterPlantId.value);
});

const departmentsForDialog = computed(() => {
  if (!currentRule.value.plantId) return [];
  const filtered = departments.value.filter(d => {
    return d.plantId === currentRule.value.plantId;
  });
  return filtered;
});

const filteredRules = computed(() => {
  return rules.value.filter(rule => {
    const plantMatch = filterPlantId.value === 0 || rule.plant_id === filterPlantId.value;
    const deptMatch = filterDepartmentId.value === 0 || rule.department_id === filterDepartmentId.value;
    return plantMatch && deptMatch;
  });
});

// Methods
const loadInitialData = async () => {
  isLoading.value = true;
  try {
    const [rulesData, plantsData, deptsData] = await Promise.all([
      request.get('/config/dept-calc-rules'),
      request.get('/plants'),
      request.get('/departments')
    ]);
    rules.value = rulesData;
    plants.value = plantsData.plants;
    departments.value = deptsData.departments;
  } catch (error) {
    ElMessage.error('加载初始数据失败！');
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : null;

const getStatus = (rule: DeptRule) => {
  const now = dayjs();
  const start = dayjs(rule.startTime);
  const end = rule.endTime ? dayjs(rule.endTime) : null;
  if (now.isBefore(start)) return { text: '待生效', className: 'warning' };
  if (end && now.isAfter(end)) return { text: '已失效', className: 'danger' };
  return { text: '生效中', className: 'success' };
};

const openAddDialog = () => {
  currentRule.value = { 
    businessMonth: dayjs().format('YYYY-MM'),
    startTime: dayjs().format('YYYY-MM-DDTHH:mm')
  };
  isDialogOpen.value = true;
};

const closeDialog = () => isDialogOpen.value = false;

const onPlantChangeInDialog = () => {
  currentRule.value.departmentId = undefined; // Reset department when plant changes
  // If there are filtered departments, select the first one
  if (departmentsForDialog.value.length > 0) {
    currentRule.value.departmentId = departmentsForDialog.value[0].id;
  }
};

const saveRule = async () => {
  isLoading.value = true;
  try {
    const ruleToSave = {
      plantId: currentRule.value.plantId,
      departmentId: currentRule.value.departmentId,
      businessMonth: currentRule.value.businessMonth,
      estimatedCost: currentRule.value.estimatedCost,
      exchangeRate: currentRule.value.exchangeRate,
      rateCoefficient: currentRule.value.rateCoefficient,
      startTime: dayjs(currentRule.value.startTime).toISOString(),
      endTime: currentRule.value.endTime ? dayjs(currentRule.value.endTime).toISOString() : null
    };
    await request.post('/config/dept-calc-rules', ruleToSave);
    await loadInitialData();
    closeDialog();
    ElMessage.success('规则保存成功！');
  } catch (error) {
    ElMessage.error('保存规则失败！');
  } finally {
    isLoading.value = false;
  }
};

const deactivateRule = async (id: number) => {
  isLoading.value = true;
  try {
    await request.put(`/config/dept-calc-rules/${id}/deactivate`);
    await loadInitialData();
    ElMessage.success('规则已停用！');
  } catch (error) {
    ElMessage.error('停用规则失败！');
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadInitialData);

</script>

<style scoped>
/* General component styling */
.dept-calc-rules-config-container { padding: 24px; background-color: #F9FAFB; }
.page-header { padding: 8px 0 16px 0; }
.breadcrumb { font-size: 14px; color: #6B7280; }
.breadcrumb-item.active { color: #111827; font-weight: 500; }
.breadcrumb-separator { margin: 0 8px; color: #9CA3AF; }

/* Card styling */
.table-card { background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.table-card-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.table-card-title { font-size: 18px; font-weight: 600; }
.card-body { padding: 24px; }

/* Filter area */
.filter-area { display: flex; gap: 16px; margin-bottom: 20px; }

/* Table styling */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #F3F4F6; }
.data-table th { background-color: #F9FAFB; font-weight: 600; color: #374151; }

/* Badges */
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-badge.success { background-color: #D1FAE5; color: #065F46; }
.status-badge.danger { background-color: #FEE2E2; color: #B91C1C; }
.status-badge.warning { background-color: #FEF3C7; color: #92400E; }

/* Buttons */
.btn { padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; border: none; }
.btn-primary { background-color: #0066CC; color: white; }
.btn-primary:hover { background-color: #0052A3; }
.btn-secondary { background-color: white; color: #4B5563; border: 1px solid #D1D5DB; }
.btn-secondary:hover { background-color: #F9FAFB; }

.action-btn { padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: none; }
.action-btn.danger { background-color: #FEE2E2; color: #B91C1C; }
.action-btn.danger:hover { background-color: #FECACA; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Dialog styling */
.dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index: 1000; }
.dialog-content { background: #fff; border-radius: 16px; width: 500px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.dialog-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.dialog-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6B7280; }
.dialog-body { padding: 24px; }

/* Form group */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #374151; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 8px; box-sizing: border-box; transition: all 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #0066CC; box-shadow: 0 0 0 3px rgba(0,102,204,0.1); }

.dialog-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #E5E7EB; }
</style>