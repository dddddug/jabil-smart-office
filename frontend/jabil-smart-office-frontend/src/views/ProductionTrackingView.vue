<template>
  <div class="production-tracking-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">生产管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">产量追踪</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">今日产量</div>
          <div class="stat-value">1,250</div>
          <div class="stat-change positive">+8.5% 较昨日</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏭</div>
        <div class="stat-content">
          <div class="stat-label">本周累计</div>
          <div class="stat-value">7,890</div>
          <div class="stat-change positive">+5.2% 较上周</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-label">月目标达成率</div>
          <div class="stat-value">78.5%</div>
          <div class="stat-change positive">+12.3%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-label">设备稼动率</div>
          <div class="stat-value">92.3%</div>
          <div class="stat-change negative">-1.2%</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📈 生产线产量追踪</div>
        <div class="table-card-actions">
          <select v-model="selectedLine" class="select-input">
            <option value="">全部生产线</option>
            <option value="line1">生产线 1</option>
            <option value="line2">生产线 2</option>
            <option value="line3">生产线 3</option>
          </select>
          <input type="date" v-model="startDate" class="date-input">
          <input type="date" v-model="endDate" class="date-input">
          <button class="btn btn-primary" @click="refreshData">刷新</button>
          <button class="btn btn-secondary" @click="exportData">📤 导出</button>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-area">
          <div class="chart-placeholder">
            <div class="chart-icon">📊</div>
            <div class="chart-text">产量趋势图</div>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>生产线</th>
                <th>产品型号</th>
                <th>计划产量</th>
                <th>实际产量</th>
                <th>达成率</th>
                <th>不良数</th>
                <th>良率</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in trackingData" :key="record.id">
                <td>{{ record.date }}</td>
                <td>{{ record.line }}</td>
                <td>{{ record.model }}</td>
                <td>{{ record.target }}</td>
                <td>{{ record.actual }}</td>
                <td>
                  <span class="progress-bar">
                    <span class="progress-fill" :class="getProgressClass(record.completion)" :style="{ width: Math.min(record.completion, 100) + '%' }"></span>
                    <span class="progress-text">{{ record.completion }}%</span>
                  </span>
                </td>
                <td>{{ record.defect }}</td>
                <td>
                  <span class="status-badge" :class="getYieldClass(record.yield)">{{ record.yield }}%</span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(record.status)">{{ getStatusText(record.status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">显示 1-10 条，共 {{ trackingData.length }} 条</span>
          <div class="pagination-controls">
            <button class="page-btn" disabled>上一页</button>
            <span class="page-info">第 1 页</span>
            <button class="page-btn" disabled>下一页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface TrackingRecord {
  id: number;
  date: string;
  line: string;
  model: string;
  target: number;
  actual: number;
  completion: number;
  defect: number;
  yield: number;
  status: string;
}

const selectedLine = ref('');
const startDate = ref('2024-06-01');
const endDate = ref('2024-06-30');

const trackingData = ref<TrackingRecord[]>([
  { id: 1, date: '2024-06-25', line: '生产线 1', model: 'Model-A', target: 500, actual: 485, completion: 97, defect: 5, yield: 99.0, status: 'normal' },
  { id: 2, date: '2024-06-25', line: '生产线 2', model: 'Model-B', target: 400, actual: 420, completion: 105, defect: 3, yield: 99.3, status: 'normal' },
  { id: 3, date: '2024-06-25', line: '生产线 3', model: 'Model-C', target: 300, actual: 280, completion: 93.3, defect: 8, yield: 97.1, status: 'warning' },
  { id: 4, date: '2024-06-24', line: '生产线 1', model: 'Model-A', target: 500, actual: 510, completion: 102, defect: 4, yield: 99.2, status: 'normal' },
  { id: 5, date: '2024-06-24', line: '生产线 2', model: 'Model-B', target: 400, actual: 395, completion: 98.7, defect: 6, yield: 98.5, status: 'normal' },
  { id: 6, date: '2024-06-24', line: '生产线 3', model: 'Model-C', target: 300, actual: 310, completion: 103.3, defect: 2, yield: 99.4, status: 'normal' },
  { id: 7, date: '2024-06-23', line: '生产线 1', model: 'Model-A', target: 500, actual: 490, completion: 98, defect: 7, yield: 98.6, status: 'normal' },
  { id: 8, date: '2024-06-23', line: '生产线 2', model: 'Model-B', target: 400, actual: 380, completion: 95, defect: 10, yield: 97.4, status: 'warning' },
]);

const getProgressClass = (value: number) => {
  if (value >= 100) return 'success';
  if (value >= 90) return 'warning';
  return 'danger';
};

const getYieldClass = (value: number) => {
  if (value >= 99) return 'success';
  if (value >= 97) return 'warning';
  return 'danger';
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'normal': 'success',
    'warning': 'warning',
    'error': 'danger'
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'normal': '正常',
    'warning': '警告',
    'error': '异常'
  };
  return map[status] || status;
};

const refreshData = () => {
};

const exportData = () => {
  alert('导出报表');
};

onMounted(() => {
  // 初始化日期
  const today = new Date();
  endDate.value = today.toISOString().split('T')[0] || '';
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  startDate.value = monthAgo.toISOString().split('T')[0] || '';
});
</script>

<style scoped>
.production-tracking-container {
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

.select-input,
.date-input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
}

.card-body {
  padding: 24px;
}

.chart-area {
  margin-bottom: 24px;
}

.chart-placeholder {
  height: 300px;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #E5E7EB;
}

.chart-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.chart-text {
  font-size: 18px;
  color: #6B7280;
  font-weight: 500;
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

.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  width: 120px;
}

.progress-fill {
  height: 8px;
  border-radius: 4px;
  background-color: #E5E7EB;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.progress-fill.success {
  background-color: #059669;
}

.progress-fill.warning {
  background-color: #D97706;
}

.progress-fill.danger {
  background-color: #DC2626;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
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
</style>
