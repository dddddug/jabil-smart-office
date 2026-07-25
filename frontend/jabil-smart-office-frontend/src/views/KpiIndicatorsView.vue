<template>
  <div class="kpi-indicators-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">数据中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">关键KPI</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-label">产能利用率</div>
          <div class="stat-value">87.5%</div>
          <div class="stat-change positive">+2.3% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">良品率</div>
          <div class="stat-value">98.2%</div>
          <div class="stat-change positive">+0.5% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <div class="stat-label">交货准时率</div>
          <div class="stat-value">95.8%</div>
          <div class="stat-change negative">-0.3% 较上月</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍💼</div>
        <div class="stat-content">
          <div class="stat-label">员工效率</div>
          <div class="stat-value">92.0%</div>
          <div class="stat-change positive">+1.2% 较上月</div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📊 KPI指标详情</div>
        <div class="table-card-actions">
          <button class="btn btn-primary">📤 导出报告</button>
        </div>
      </div>
      <div class="card-body">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>指标名称</th>
                <th>当前值</th>
                <th>目标值</th>
                <th>达成值</th>
                <th>上月值</th>
                <th>趋势</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="kpi in kpiData" :key="kpi.name">
                <td>{{ kpi.name }}</td>
                <td>{{ kpi.current }}</td>
                <td>{{ kpi.target }}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: kpi.achievement + '%' }"></div>
                    <span class="progress-text">{{ kpi.achievement }}%</span>
                  </div>
                </td>
                <td>{{ kpi.lastMonth }}</td>
                <td>
                  <span :class="kpi.trend === 'up' ? 'trend-up' : 'trend-down'">
                    {{ kpi.trend === 'up' ? '上升' : '下降' }} {{ kpi.trendValue }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(kpi.status)">
                    {{ kpi.status === 'good' ? '优秀' : kpi.status === 'normal' ? '正常' : '预警' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface KpiItem {
  name: string;
  current: string;
  target: string;
  achievement: number;
  lastMonth: string;
  trend: 'up' | 'down';
  trendValue: string;
  status: 'good' | 'normal' | 'warning';
}

const kpiData = ref<KpiItem[]>([
  { name: '产能利用率', current: '87.5%', target: '90%', achievement: 97, lastMonth: '85.2%', trend: 'up', trendValue: '2.3%', status: 'normal' },
  { name: '良品率', current: '98.2%', target: '98%', achievement: 100, lastMonth: '97.7%', trend: 'up', trendValue: '0.5%', status: 'good' },
  { name: '交货准时率', current: '95.8%', target: '96%', achievement: 99, lastMonth: '96.1%', trend: 'down', trendValue: '0.3%', status: 'normal' },
  { name: '员工效率', current: '92.0%', target: '90%', achievement: 102, lastMonth: '90.8%', trend: 'up', trendValue: '1.2%', status: 'good' },
  { name: '设备稼动率', current: '89.5%', target: '92%', achievement: 97, lastMonth: '90.0%', trend: 'down', trendValue: '0.5%', status: 'normal' },
  { name: '安全事故次数', current: '0', target: '0', achievement: 100, lastMonth: '0', trend: 'up', trendValue: '0', status: 'good' },
  { name: '客户投诉率', current: '0.8%', target: '0%', achievement: 100, lastMonth: '0.9%', trend: 'down', trendValue: '0.1%', status: 'good' },
]);

const getStatusClass = (status: string) => {
  return status === 'good' ? 'success' : status === 'normal' ? 'info' : 'warning';
};
</script>

<style scoped>
.kpi-indicators-container {
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 40px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.stat-change {
  font-size: 12px;
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

.progress-bar {
  position: relative;
  width: 120px;
  height: 20px;
  background: #F3F4F6;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0066CC, #0096FF);
  border-radius: 10px;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.trend-up {
  color: #059669;
  font-weight: 600;
}

.trend-down {
  color: #DC2626;
  font-weight: 600;
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

.status-badge.info {
  background-color: #DBEAFE;
  color: #1D4ED8;
}

.status-badge.warning {
  background-color: #FEF3C7;
  color: #D97706;
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
</style>
