<template>
  <div class="employee-hourly-rate-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">员工工时费率配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">💰 员工工时费率配置</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddDialog">➕ 新增费率</button>
        </div>
      </div>

      <div class="card-body">
        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th>级别</th>
                <th>标准费率</th>
                <th>启用时间</th>
                <th>停用时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rate in hourlyRates" :key="rate.id">
                <td>{{ rate.level }}</td>
                <td>{{ rate.standardRate.toFixed(2) }}</td>
                <td>{{ rate.startTime }}</td>
                <td>{{ rate.endTime || '-' }}</td>
                <td>
                  <span class="status-badge" :class="getStatus(rate).className">{{ getStatus(rate).text }}</span>
                </td>
                <td>
                  <button class="action-btn danger" @click="deactivateRate(rate.id)" :disabled="isLoading || getStatus(rate).text !== '生效中'">停用</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>新增员工工时费率</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveRate">
            <div class="form-group">
              <label>级别 *</label>
              <input type="text" v-model="currentRate.level" required />
            </div>
            <div class="form-group">
              <label>标准费率 *</label>
              <input type="number" v-model.number="currentRate.standardRate" step="0.01" required />
            </div>
            <div class="form-group">
              <label>启用时间 *</label>
              <input type="datetime-local" v-model="currentRate.startTime" required />
            </div>
            <div class="form-group">
              <label>停用时间 (可选)</label>
              <input type="datetime-local" v-model="currentRate.endTime" />
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveRate">确认新增</button>
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
interface HourlyRate {
  id: number;
  level: string;
  standardRate: number;
  startTime: string;
  endTime: string | null;
}

interface HourlyRateForm {
  level: string;
  standardRate: number;
  startTime: string;
  endTime?: string | null;
}

// State
const isLoading = ref(false);
const hourlyRates = ref<HourlyRate[]>([]);
const isDialogOpen = ref(false);
const currentRate = ref<Partial<HourlyRateForm>>({});

// Computed
const getStatus = (rate: HourlyRate) => {
  const now = dayjs();
  const start = dayjs(rate.startTime);
  const end = rate.endTime ? dayjs(rate.endTime) : null;
  if (now.isBefore(start)) return { text: '待生效', className: 'warning' };
  if (end && now.isAfter(end)) return { text: '已失效', className: 'danger' };
  return { text: '生效中', className: 'success' };
};

// Methods
const loadHourlyRates = async () => {
  isLoading.value = true;
  try {
    const response = await request.get<HourlyRate[]>('/config/employee-hourly-rates');
    hourlyRates.value = response;
  } catch (error) {
    ElMessage.error('加载费率失败！');
  } finally {
    isLoading.value = false;
  }
};

const openAddDialog = () => {
  currentRate.value = {
    level: '',
    standardRate: 0,
    startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
    endTime: null,
  };
  isDialogOpen.value = true;
};

const closeDialog = () => isDialogOpen.value = false;

const saveRate = async () => {
  if (!currentRate.value.level || currentRate.value.standardRate === undefined || !currentRate.value.startTime) {
    ElMessage.warning('请填写所有必填项！');
    return;
  }

  isLoading.value = true;
  try {
    const rateToSave = {
      level: currentRate.value.level,
      standardRate: currentRate.value.standardRate,
      startTime: dayjs(currentRate.value.startTime).toISOString(),
      endTime: currentRate.value.endTime ? dayjs(currentRate.value.endTime).toISOString() : null
    };
    await request.post('/config/employee-hourly-rates', rateToSave);
    await loadHourlyRates();
    closeDialog();
    ElMessage.success('费率保存成功！');
  } catch (error) {
    ElMessage.error('保存费率失败！');
  } finally {
    isLoading.value = false;
  }
};

const deactivateRate = async (id: number) => {
  isLoading.value = true;
  try {
    await request.put(`/config/employee-hourly-rates/${id}/deactivate`);
    await loadHourlyRates();
    ElMessage.success('费率已停用！');
  } catch (error) {
    ElMessage.error('停用费率失败！');
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadHourlyRates);
</script>

<style scoped>
/* General component styling */
.employee-hourly-rate-config-container { padding: 24px; background-color: #F9FAFB; }
.page-header { padding: 8px 0 16px 0; }
.breadcrumb { font-size: 14px; color: #6B7280; }
.breadcrumb-item.active { color: #111827; font-weight: 500; }
.breadcrumb-separator { margin: 0 8px; color: #9CA3AF; }

/* Card styling */
.table-card { background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.table-card-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.table-card-title { font-size: 18px; font-weight: 600; color: #111827; }
.table-card-actions { display: flex; gap: 12px; }
.card-body { padding: 24px; }

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