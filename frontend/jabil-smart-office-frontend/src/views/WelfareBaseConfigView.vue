<template>
  <div class="welfare-base-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">福利基础配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🎁 福利基础配置</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddDialog">➕ 新增福利</button>
        </div>
      </div>

      <div class="card-body">
        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th>员工类型</th>
                <th>福利金额 (元/月)</th>
                <th>启用时间</th>
                <th>停用时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="welfare in welfareConfigs" :key="welfare.id">
                <td>{{ welfare.employee_type }}</td>
                <td>{{ welfare.amount.toFixed(2) }}</td>
                <td>{{ formatDate(welfare.startTime) }}</td>
                <td>{{ formatDate(welfare.endTime) || '-' }}</td>
                <td>
                  <span class="status-badge" :class="getStatus(welfare).className">{{ getStatus(welfare).text }}</span>
                </td>
                <td>
                  <button class="action-btn danger" @click="deactivateWelfare(welfare.id)" :disabled="isLoading || getStatus(welfare).text !== '生效中'">停用</button>
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
          <h3>新增福利配置</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveWelfare">
            <div class="form-group">
              <label>员工类型 *</label>
              <input type="text" v-model="currentWelfare.employee_type" required />
            </div>
            <div class="form-group">
              <label>福利金额 (元/月) *</label>
              <input type="number" v-model.number="currentWelfare.amount" step="0.01" required />
            </div>
            <div class="form-group">
              <label>启用时间 *</label>
              <input type="datetime-local" v-model="currentWelfare.startTime" required />
            </div>
            <div class="form-group">
              <label>停用时间 (可选)</label>
              <input type="datetime-local" v-model="currentWelfare.endTime" />
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveWelfare">确认新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { formatShanghaiDateTime } from '../utils/dateUtils';

// Interfaces
interface WelfareConfig {
  id: number;
  employee_type: string;
  amount: number;
  startTime: string;
  endTime: string | null;
}

interface WelfareConfigForm {
  employee_type: string;
  amount: number;
  startTime: string;
  endTime?: string | null;
}

// State
const isLoading = ref(false);
const welfareConfigs = ref<WelfareConfig[]>([]);
const isDialogOpen = ref(false);
const currentWelfare = ref<Partial<WelfareConfigForm>>({});

// Computed
const getStatus = (welfare: WelfareConfig) => {
  const now = dayjs();
  const start = dayjs(welfare.startTime);
  const end = welfare.endTime ? dayjs(welfare.endTime) : null;
  if (now.isBefore(start)) return { text: '待生效', className: 'warning' };
  if (end && now.isAfter(end)) return { text: '已失效', className: 'danger' };
  return { text: '生效中', className: 'success' };
};

// Methods
const loadWelfareConfigs = async () => {
      isLoading.value = true;
      try {
        const res = await request.get('/config/welfare');
        const data = (res as any)?.data || res;
        welfareConfigs.value = Array.isArray(data) ? data : [];
      } catch (error) {
        ElMessage.error({ message: '加载福利配置失败: ' + error, showClose: true, duration: 3000 });
      } finally {
        isLoading.value = false;
      }
    };

const formatDate = (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : null;

const openAddDialog = () => {
  currentWelfare.value = {
    employee_type: '',
    amount: 0,
    startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
    endTime: null,
  };
  isDialogOpen.value = true;
};

const closeDialog = () => isDialogOpen.value = false;

const saveWelfare = async () => {
  if (!currentWelfare.value.employee_type || currentWelfare.value.amount === undefined || !currentWelfare.value.startTime) {
    ElMessage.error({ message: '请填写所有必填项！', showClose: true, duration: 3000 });
    return;
  }

  isLoading.value = true;
  try {
    const welfareToSave = {
      employee_type: currentWelfare.value.employee_type,
      amount: currentWelfare.value.amount,
      startTime: dayjs(currentWelfare.value.startTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
      endTime: currentWelfare.value.endTime ? dayjs(currentWelfare.value.endTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : null
    };
    await request.post('/config/welfare', welfareToSave);
    await loadWelfareConfigs();
    ElMessage.success({ message: '福利配置保存成功！', showClose: true, duration: 3000 });
    closeDialog();
  } catch (error) {
    ElMessage.error({ message: '保存福利配置失败: ' + error, showClose: true, duration: 3000 });
  } finally {
    isLoading.value = false;
  }
};

const deactivateWelfare = async (id: number) => {
  isLoading.value = true;
  try {
    await request.put(`/config/welfare/${id}/deactivate`);
    await loadWelfareConfigs();
    ElMessage.success({ message: '福利配置已停用！', showClose: true, duration: 3000 });
  } catch (error) {
    ElMessage.error({ message: '停用福利配置失败: ' + error, showClose: true, duration: 3000 });
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadWelfareConfigs);
</script>

<style scoped>
/* General component styling */
.welfare-base-config-container { padding: 24px; background-color: #F9FAFB; }
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