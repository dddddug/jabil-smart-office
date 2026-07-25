<template>
  <div class="dashboard-content">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">控制面板</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="refreshAll" :disabled="isLoading">
          <span :class="{ 'spin': isLoading }">🔄</span>
          {{ isLoading ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <!-- 统计数据卡片 -->
    <div class="stats-cards">
      <div class="stat-card stat-card-blue">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ formatNumber(stats.activeEmployees) }}</div>
          <div class="stat-label">在职员工</div>
          <div class="stat-change stat-change-up">
            <span>↑</span>
            <span>{{ stats.monthlyHired || 0 }}</span>
            <span>本月入职</span>
          </div>
        </div>
      </div>

      <div class="stat-card stat-card-orange">
        <div class="stat-icon">⏰</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.monthlyOvertimeHours.toFixed(1) }}</div>
          <div class="stat-label">本月加班工时</div>
          <div class="stat-change stat-change-neutral">
            <span>{{ stats.pendingApprovals }}</span>
            <span>待审批</span>
          </div>
        </div>
      </div>

      <div class="stat-card stat-card-purple">
        <div class="stat-icon">📋</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.monthlyLeaveCount }}</div>
          <div class="stat-label">本月请假人次</div>
          <div class="stat-change stat-change-neutral">
            <span>{{ stats.monthlyResigned || 0 }}</span>
            <span>本月离职</span>
          </div>
        </div>
      </div>

      <div class="stat-card stat-card-green">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ formatTime(stats.updateTime) }}</div>
          <div class="stat-label">更新时间</div>
          <div class="stat-change stat-change-neutral">
            <span>{{ formatDate(stats.updateTime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部数据区域 -->
    <div class="bottom-section">
      <!-- 今日排班 -->
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title">📅 今日排班</div>
          <span class="data-card-date">{{ todaySchedule.date }}</span>
        </div>
        <div class="data-card-body">
          <div v-if="todaySchedule.schedules && todaySchedule.schedules.length > 0">
            <div v-for="schedule in todaySchedule.schedules" :key="schedule.shift" class="schedule-item">
              <div class="schedule-shift">{{ schedule.shift }}</div>
              <div class="schedule-info">
                <div class="schedule-count">{{ schedule.employeeCount }}人</div>
              </div>
              <div :class="['schedule-status', getStatusClass(schedule.status)]">
                {{ schedule.statusText }}
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span>📅</span>
            <p>暂无今日排班数据</p>
          </div>
        </div>
      </div>

      <!-- 待审批申请 -->
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title">📝 待审批申请</div>
          <button class="btn btn-link" @click="$router.push('/approvals')">查看全部</button>
        </div>
        <div class="data-card-body">
          <div v-if="pendingApprovals.length > 0">
            <div v-for="approval in pendingApprovals" :key="`${approval.type}-${approval.id}`" class="approval-item">
              <div class="approval-icon" :style="{ backgroundColor: getTypeColor(approval.type) }">
                {{ getTypeIcon(approval.type) }}
              </div>
              <div class="approval-info">
                <div class="approval-title">{{ approval.employeeName }} - {{ approval.leaveType }}</div>
                <div class="approval-meta">
                  <span>{{ approval.hours }}小时</span>
                  <span>·</span>
                  <span>{{ formatTimeAgo(approval.createdAt) }}</span>
                </div>
              </div>
              <div class="approval-actions">
                <button class="btn btn-success btn-sm" @click="handleApprove(approval)">同意</button>
                <button class="btn btn-danger btn-sm" @click="handleReject(approval)">拒绝</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <span>✅</span>
            <p>暂无待审批申请</p>
          </div>
        </div>
      </div>

      <!-- 员工统计 -->
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title">👥 员工状态</div>
        </div>
        <div class="data-card-body">
          <div class="employee-stat-item">
            <div class="employee-stat-label">在职员工</div>
            <div class="employee-stat-value text-success">{{ todaySchedule.employeeStats?.active || 0 }}</div>
          </div>
          <div class="employee-stat-item">
            <div class="employee-stat-label">请假中</div>
            <div class="employee-stat-value text-warning">{{ todaySchedule.employeeStats?.onLeave || 0 }}</div>
          </div>
          <div class="employee-stat-item">
            <div class="employee-stat-label">总员工数</div>
            <div class="employee-stat-value">{{ todaySchedule.employeeStats?.total || 0 }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getDashboardStats,
  getTodaySchedule,
  getPendingApprovals
} from '../api/dashboard';

// 统计数据
const stats = ref({
  activeEmployees: 0,
  monthlyOvertimeHours: 0,
  monthlyLeaveCount: 0,
  pendingApprovals: 0,
  monthlyHired: 0,
  monthlyResigned: 0,
  updateTime: ''
});

// 今日排班
const todaySchedule = ref<{
  date: string;
  schedules: Array<{
    shift: string;
    employeeCount: number;
    status: string;
    statusText: string;
  }>;
  employeeStats: {
    total: number;
    active: number;
    onLeave: number;
  };
}>({
  date: '',
  schedules: [],
  employeeStats: { total: 0, active: 0, onLeave: 0 }
});

// 待审批列表
const pendingApprovals = ref<Array<{
  type: string;
  id: number;
  employeeName: string;
  leaveType: string;
  hours: number;
  startDate: string;
  createdAt: string;
}>>([]);

// 加载状态
const isLoading = ref(false);

// 自动刷新定时器
let refreshInterval: number | null = null;

// 加载所有数据
const loadAllData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      loadStats(),
      loadTodaySchedule(),
      loadPendingApprovals()
    ]);
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const data = await getDashboardStats();
    stats.value = {
      activeEmployees: data.activeEmployees || 0,
      monthlyOvertimeHours: data.monthlyOvertimeHours || 0,
      monthlyLeaveCount: data.monthlyLeaveCount || 0,
      pendingApprovals: data.pendingApprovals || 0,
      monthlyHired: data.monthlyHired || 0,
      monthlyResigned: data.monthlyResigned || 0,
      updateTime: data.updateTime || ''
    };
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
};

// 加载今日排班
const loadTodaySchedule = async () => {
  try {
    const data = await getTodaySchedule();
    todaySchedule.value = {
      date: data.date || '',
      schedules: data.schedules || [],
      employeeStats: data.employeeStats || { total: 0, active: 0, onLeave: 0 }
    };
  } catch (error) {
    console.error('加载今日排班失败:', error);
  }
};

// 加载待审批列表
const loadPendingApprovals = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await getPendingApprovals({ limit: 5 });
    pendingApprovals.value = data?.items || [];
  } catch (error) {
    console.error('加载待审批列表失败:', error);
  }
};

// 刷新所有数据
const refreshAll = () => {
  loadAllData();
  ElMessage.success('数据已刷新');
};

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

// 格式化时间
const formatTime = (time: string): string => {
  if (!time) return '--:--';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 格式化日期
const formatDate = (date: string): string => {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 格式化相对时间
const formatTimeAgo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
};

// 获取状态样式类
const getStatusClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    ongoing: 'status-green',
    completed: 'status-blue',
    pending: 'status-gray',
    off: 'status-gray'
  };
  return statusMap[status] || 'status-gray';
};

// 获取类型颜色
const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    leave: '#E3F2FD',
    overtime: '#FFF3E0'
  };
  return colorMap[type] || '#F3F4F6';
};

// 获取类型图标
const getTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    leave: '📋',
    overtime: '⏰'
  };
  return iconMap[type] || '📄';
};

// 处理审批
const handleApprove = (approval: any) => {
  ElMessage.success(`已同意 ${approval.employeeName} 的申请`);
  loadPendingApprovals();
};

const handleReject = (approval: any) => {
  ElMessage.info(`已拒绝 ${approval.employeeName} 的申请`);
  loadPendingApprovals();
};

// 组件挂载时加载数据
onMounted(() => {
  loadAllData();
  // 每5分钟自动刷新
  refreshInterval = window.setInterval(loadAllData, 5 * 60 * 1000);
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.dashboard-content {
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-refresh:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card-blue {
  border-top: 4px solid #0066CC;
}

.stat-card-orange {
  border-top: 4px solid #FF6B35;
}

.stat-card-purple {
  border-top: 4px solid #7C3AED;
}

.stat-card-green {
  border-top: 4px solid #63BE3B;
}

.stat-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border-radius: 12px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 8px;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.stat-change-up {
  color: #10B981;
}

.stat-change-down {
  color: #EF4444;
}

.stat-change-neutral {
  color: #6B7280;
}

/* Bottom Section */
.bottom-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.data-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.data-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.data-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.data-card-date {
  font-size: 13px;
  color: #6B7280;
}

.data-card-body {
  padding: 20px 24px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #9CA3AF;
}

.empty-state span {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Schedule Items */
.schedule-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
  margin-bottom: 12px;
}

.schedule-item:last-child {
  margin-bottom: 0;
}

.schedule-shift {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  min-width: 80px;
}

.schedule-info {
  flex: 1;
}

.schedule-count {
  font-size: 14px;
  color: #6B7280;
}

.schedule-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-green {
  background: #D1FAE5;
  color: #065F46;
}

.status-blue {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-gray {
  background: #F3F4F6;
  color: #6B7280;
}

/* Approval Items */
.approval-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.approval-item:last-child {
  border-bottom: none;
}

.approval-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.approval-info {
  flex: 1;
}

.approval-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.approval-meta {
  font-size: 13px;
  color: #6B7280;
}

.approval-actions {
  display: flex;
  gap: 8px;
}

/* Employee Stat Items */
.employee-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
  margin-bottom: 12px;
}

.employee-stat-item:last-child {
  margin-bottom: 0;
}

.employee-stat-label {
  font-size: 14px;
  color: #6B7280;
}

.employee-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.text-success {
  color: #10B981;
}

.text-warning {
  color: #F59E0B;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-link {
  background: transparent;
  color: #0066CC;
  padding: 6px 12px;
}

.btn-link:hover {
  color: #0052A3;
}

.btn-success {
  background-color: #10B981;
  color: #FFFFFF;
}

.btn-success:hover {
  background-color: #059669;
}

.btn-danger {
  background-color: #EF4444;
  color: #FFFFFF;
}

.btn-danger:hover {
  background-color: #DC2626;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
