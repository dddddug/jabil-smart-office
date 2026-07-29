<template>
  <div class="dashboard-container">
    <header class="main-header">
      <div class="header-user-section">
        <div class="tabs-container">
          <div 
            v-for="(tab, index) in tabs" 
            :key="index"
            :class="['tab-item', { active: activeTab === index }]"
            @click="switchTab(index)"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-title">{{ tab.title }}</span>
            <span 
              v-if="index !== 0" 
              class="tab-close"
              @click.stop="closeTab(index)"
            >
              ✕
            </span>
          </div>
        </div>
        <div class="header-right-actions">
          <div class="header-actions">
            <span class="header-action" @click="router.push('/announcement-management')">🌐 系统公告</span>
            <div class="notification-wrapper">
              <span class="header-action notification-icon" @click="toggleNotificationPanel">
                🔔
                <span v-if="unreadNotificationsCount > 0" class="notification-badge">
                  {{ unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount }}
                </span>
              </span>
              <div v-if="showNotificationPanel" class="notification-panel">
                <div class="notification-panel-header">
                  <span class="notification-panel-title">通知中心</span>
                  <span class="mark-all-read" @click="markAllAsRead">全部标为已读</span>
                </div>
                <div class="notification-tabs">
                  <span 
                    :class="['notification-tab', { active: activeNotificationTab === 'unread' }]"
                    @click="activeNotificationTab = 'unread'"
                  >
                    未读 ({{ notifications.filter(n => !n.read).length }})
                  </span>
                  <span 
                    :class="['notification-tab', { active: activeNotificationTab === 'read' }]"
                    @click="activeNotificationTab = 'read'"
                  >
                    已读 ({{ notifications.filter(n => n.read).length }})
                  </span>
                </div>
                <div class="notification-list">
                  <div v-if="displayNotifications.length === 0" class="empty-notifications">
                    暂无通知
                  </div>
                  <div v-else v-for="notification in displayNotifications" :key="notification.id" class="notification-item" @click="handleNotificationClick(notification)">
                    <span class="notification-item-icon">{{ notification.icon }}</span>
                    <div class="notification-item-content">
                      <div class="notification-item-title">{{ notification.title }}</div>
                      <div class="notification-item-message">{{ notification.message }}</div>
                      <div class="notification-item-time">{{ notification.time }}</div>
                    </div>
                    <span v-if="!notification.read" class="unread-dot-small"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="user-section">
            <div class="user-avatar">{{ userAvatar }}</div>
            <div class="user-info">
              <div class="user-name">{{ userName }}</div>
              <div class="user-role">{{ userRole }}</div>
            </div>
            <span class="header-action logout-btn" @click="handleLogout">
              🚪
            </span>
          </div>
        </div>
      </div>
    </header>
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sidebar-logo-section">
          <div class="jabil-logo-css">
            <span class="jabil-logo-J">J</span>
            <span class="jabil-logo-A-container">
              A
              <span class="jabil-logo-A-line"></span>
            </span>
            <span class="jabil-logo-BIL">BIL</span>
          </div>
        </div>
        <nav class="main-nav">
          <ul>
            <li 
              v-for="item in sidebarMenuItems" 
              :key="item.name"
              :class="{ 
                'menu-header': item.isHeader, 
                'divider': item.isDivider, 
                'active': item.routeName && isMenuItemActive(item.routeName),
                'sub-menu': item.parent,
                'hidden': !isMenuItemVisible(item)
              }"
              @click="item.isHeader ? toggleMenuGroup(item) : handleMenuClick(item)"
            >
              <template v-if="item.isHeader">
                <div class="header-left">
                  <span class="header-icon">{{ item.icon }}</span>
                  <span class="header-label">{{ item.label }}</span>
                </div>
                <span class="expand-icon">{{ item.expanded ? '▼' : '▶' }}</span>
              </template>
              <template v-else-if="!item.isDivider">
                <div class="nav-link">
                  <span class="icon">{{ item.icon }}</span> {{ item.name }}
                </div>
              </template>
            </li>
          </ul>
        </nav>
      </aside>
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" v-if="Component" />
            <DashboardContent v-else />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import DashboardContent from './DashboardContent.vue';
import request from '../utils/request'; // 导入 request 实例
import { ElMessage } from 'element-plus'; // 导入 ElMessage 用于提示
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead as markAllReadApi } from '../api/notification';

interface Tab {
  title: string;
  icon: string;
  routeName: string;
}

interface MenuItem {
  name?: string;
  icon?: string;
  routeName?: string;
  isHeader?: boolean;
  label?: string;
  parent?: string;
  expanded?: boolean;
  isDivider?: boolean;
}

const router = useRouter();
const route = useRoute();

const userData = ref({ realName: '管理员', roleName: '超级管理员' });
const userName = computed(() => userData.value.realName || '管理员');
const userRole = computed(() => userData.value.roleName || '普通员工');
const userAvatar = computed(() => userName.value.charAt(0));

const handleLogout = async () => {
  try {
    // 向后端发送注销请求
    await request.post('/users/logout');
    ElMessage.success('退出登录成功！');
  } catch (error) {
    console.error('后端注销请求失败:', error);
    ElMessage.error('退出登录失败，请重试。');
  } finally {
    // 无论后端注销成功与否，都清除前端存储，确保前端状态一致
    localStorage.removeItem('jabil-token'); // Ensure token is removed
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPlantId');
    localStorage.removeItem('userDepartmentId');
    localStorage.removeItem('hasSkippedSetup');
    window.location.href = '/login'; // Force full page reload to clear all state
  }
};

const notifications = ref<any[]>([]);
const notificationsLoading = ref(false);
const unreadCount = ref(0);

const showNotificationPanel = ref(false);
const activeNotificationTab = ref<'unread' | 'read'>('unread');

// 加载未读数量（用于徽章显示）
const loadUnreadCount = async () => {
  try {
    const res = await getUnreadCount();
    unreadCount.value = res?.count || 0;
  } catch (error) {
    console.error('加载未读数量失败:', error);
    unreadCount.value = 0;
  }
};

const unreadNotificationsCount = computed(() => unreadCount.value);

const displayNotifications = computed(() => {
  if (activeNotificationTab.value === 'unread') {
    return notifications.value.filter(n => !n.read);
  }
  return notifications.value.filter(n => n.read);
});

const toggleNotificationPanel = () => {
  showNotificationPanel.value = !showNotificationPanel.value;
};

// 格式化时间显示
const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

// 加载通知列表
const loadNotifications = async () => {
  notificationsLoading.value = true;
  try {
    const res = await getNotifications();
    notifications.value = (res?.notifications || []).map((n: any) => ({
      ...n,
      time: formatTime(n.createdAt)
    }));
    // 同时更新未读数量
    await loadUnreadCount();
  } catch (error) {
    console.error('加载通知失败:', error);
    notifications.value = [];
  } finally {
    notificationsLoading.value = false;
  }
};

// 切换标签页时重新加载通知
watch(activeNotificationTab, () => {
  loadNotifications();
});

// 打开通知面板时加载
watch(showNotificationPanel, (newVal) => {
  if (newVal) {
    loadNotifications();
  }
});

// 标记单个通知为已读
const handleNotificationClick = async (notification: any) => {
  if (!notification.read) {
    try {
      await markAsRead(notification.id);
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }
  showNotificationPanel.value = false;
};

// 标记所有通知为已读
const markAllAsRead = async () => {
  try {
    await markAllReadApi();
    notifications.value.forEach(n => n.read = true);
    unreadCount.value = 0;
    ElMessage.success('已全部标记为已读');
  } catch (error) {
    console.error('标记全部已读失败:', error);
    ElMessage.error('操作失败，请重试');
  }
};

// 从 localStorage 恢复标签页
const savedTabs = localStorage.getItem('dashboard-tabs');
const savedActiveTab = localStorage.getItem('dashboard-active-tab');

const tabs = ref<Tab[]>(savedTabs ? JSON.parse(savedTabs) : [
  { title: '仪表盘', icon: '📊', routeName: 'dashboard' }
]);
const activeTab = ref<number>(savedActiveTab ? parseInt(savedActiveTab) : 0);

// 保存标签页到 localStorage
const saveTabs = () => {
  localStorage.setItem('dashboard-tabs', JSON.stringify(tabs.value));
  localStorage.setItem('dashboard-active-tab', activeTab.value.toString());
};

const sidebarMenuItems = ref<MenuItem[]>([
  { name: '仪表盘', icon: '📊', routeName: 'dashboard', expanded: false },
  { name: '业务中心', isHeader: true, label: '业务中心', expanded: false, icon: '📋' },
  { name: '员工排班', icon: '📅', routeName: 'employee-schedule', parent: '业务中心', expanded: false },
  { name: '工位安排', icon: '🏭', routeName: 'station-arrangement', parent: '业务中心', expanded: false },
  { name: 'K045 单据管理', icon: '📦', routeName: 'k045', parent: '业务中心', expanded: false },
  { name: '管控物料 单据管理', icon: '📋', routeName: 'da-material', parent: '业务中心', expanded: false },
  { name: '数据中心', isHeader: true, label: '数据中心', expanded: false, icon: '📊' },
  { name: '关键KPI', icon: '📉', routeName: 'kpi-indicators', parent: '数据中心', expanded: false },
  { name: 'Cost汇总', icon: '💰', routeName: 'cost-summary', parent: '数据中心', expanded: false },
  { name: '生产追踪', icon: '📊', routeName: 'production-tracking', parent: '数据中心', expanded: false },
  { name: '奖金评估', icon: '🎯', routeName: 'bonus-evaluation', parent: '数据中心', expanded: false },
  { name: '人事中心', isHeader: true, label: '人事中心', expanded: false, icon: '👥' },
  { name: '员工花名册', icon: '👥', routeName: 'employee-roster', parent: '人事中心', expanded: false },
  { name: '请假公差', icon: '📝', routeName: 'leave-management', parent: '人事中心', expanded: false },
  { name: '便捷打印', isHeader: true, label: '便捷打印', expanded: false, icon: '🖨️' },
  { name: 'PNC转仓打印', icon: '📋', routeName: 'convenient-print', parent: '便捷打印', expanded: false },
  { name: '组织管理', isHeader: true, label: '组织管理', expanded: false, icon: '🏢' },
  { name: '组织结构', icon: '🏢', routeName: 'organizational-structure', parent: '组织管理', expanded: false },
  { name: '厂区管理', icon: '🏭', routeName: 'plant-management', parent: '组织管理', expanded: false },
  { name: '部门管理', icon: '🏢', routeName: 'department-management', parent: '组织管理', expanded: false },
  { name: '仓储管理', isHeader: true, label: '仓储管理', expanded: false, icon: '📦' },
  { name: 'Bin容量', icon: '📦', routeName: 'bin-volume-management', parent: '仓储管理', expanded: false },
  { name: '过期料延期', icon: '⏰', routeName: 'expired-material-extension', parent: '仓储管理', expanded: false },
  { name: '6S管理', icon: '✨', routeName: '6s-management', parent: '仓储管理', expanded: false },
  { name: 'K**差异登记', icon: '📝', routeName: 'k2-diff-registration', parent: '仓储管理', expanded: false },
  { name: '系统管理', isHeader: true, label: '系统管理', expanded: false, icon: '⚙️' },
  { name: '系统公告', icon: '📢', routeName: 'announcement-management', parent: '系统管理', expanded: false },
  { name: '用户管理', icon: '👤', routeName: 'user-management', parent: '系统管理', expanded: false },
  { name: '角色管理', icon: '🎭', routeName: 'role-management', parent: '系统管理', expanded: false },
  { name: '权限管理', icon: '🔐', routeName: 'permission-management', parent: '系统管理', expanded: false },
  { name: '规则配置', isHeader: true, label: '规则配置', expanded: false, icon: '⚙️' },
  { name: '部门计算规则', icon: '📐', routeName: 'dept-calc-rules-config', parent: '规则配置', expanded: false },
  { name: '班次时长规则', icon: '⏰', routeName: 'shift-duration-rules-config', parent: '规则配置', expanded: false },
  { name: '智能排班规则', icon: '📋', routeName: 'smart-schedule-rules-config', parent: '规则配置', expanded: false },
  { name: 'K045 规则配置', icon: '📄', routeName: 'k045-config', parent: '规则配置', expanded: false },
  { name: '管控物料 规则配置', icon: '📋', routeName: 'da-material-config', parent: '规则配置', expanded: false },
  { name: 'PNC转仓打印配置', icon: '📄', routeName: 'pnc-transfer-config', parent: '规则配置', expanded: false },
  { name: 'K**差异登记 规则配置', icon: '📝', routeName: 'k2-diff-config', parent: '规则配置', expanded: false },
  { name: '工位配置', icon: '🏭', routeName: 'workstation-config', parent: '规则配置', expanded: false },
  { name: '员工时薪配置', icon: '💵', routeName: 'employee-hourly-rate-config', parent: '规则配置', expanded: false },
  { name: '福利基础配置', icon: '🎁', routeName: 'welfare-base-config', parent: '规则配置', expanded: false },
  { name: '其他', isHeader: true, label: '其他', expanded: false, icon: '📌' },
  { name: '版本信息', icon: '📋', routeName: 'version-info', parent: '其他', expanded: false },
  { name: '接口文档', icon: '📡', routeName: 'api-docs', parent: '其他', expanded: false },
]);

const toggleMenuGroup = (item: MenuItem) => {
  if (!item.isHeader) return;
  const currentIndex = sidebarMenuItems.value.findIndex(m => m.isHeader && m.label === item.label);
  if (currentIndex === -1) return;
  sidebarMenuItems.value.forEach((menuItem, index) => {
    if (menuItem.isHeader) {
      const targetItem = sidebarMenuItems.value[index];
      if (targetItem) {
        if (menuItem.label === item.label) {
          targetItem.expanded = !menuItem.expanded;
        } else {
          targetItem.expanded = false;
        }
      }
    }
  });
};

const isMenuItemVisible = (item: MenuItem) => {
  if (!item.parent) return true;
  const parentItem = sidebarMenuItems.value.find(m => m.isHeader && m.label === item.parent);
  return parentItem ? !!parentItem.expanded : true;
};

const switchTab = (index: number) => {
  const tab = tabs.value[index];
  if (tab && tab.routeName) {
    activeTab.value = index;
    saveTabs();
    router.push({ name: tab.routeName });
  }
};

const closeTab = (index: number) => {
  if (index === 0) return; // 不能关闭仪表盘标签
  
  const isActive = activeTab.value === index;
  tabs.value.splice(index, 1);
  
  if (isActive && tabs.value.length > 0) {
    // 如果关闭了当前活动标签，切换到前一个标签
    const newActiveIndex = Math.min(index, tabs.value.length - 1);
    activeTab.value = newActiveIndex;
    saveTabs();
    const targetTab = tabs.value[newActiveIndex];
    if (targetTab) {
      router.push({ name: targetTab.routeName });
    }
  } else if (activeTab.value > index) {
    // 如果关闭的标签在当前活动标签之前，调整活动标签索引
    activeTab.value--;
    saveTabs();
  } else {
    saveTabs();
  }
};

const handleMenuClick = (item: MenuItem) => {
  if (item.isDivider || item.isHeader || !item.routeName) return;
  // 如果有父菜单分组，展开它
  if (item.parent) {
    sidebarMenuItems.value.forEach(menu => {
      if (menu.isHeader && menu.label === item.parent) {
        menu.expanded = true;
      }
    });
  }
  const existingIndex = tabs.value.findIndex(tab => tab.routeName === item.routeName);
  if (existingIndex !== -1) {
    activeTab.value = existingIndex;
    saveTabs();
    router.push({ name: item.routeName });
    return;
  }
  if (tabs.value.length >= 6) {
    // 找到第一个非仪表盘标签并关闭
    const firstNonHomeIndex = tabs.value.findIndex((_tab, index) => index !== 0);
    if (firstNonHomeIndex !== -1) {
      // 如果关闭的是当前活动标签，需要调整 activeTab
      if (activeTab.value === firstNonHomeIndex) {
        activeTab.value = 0;
      } else if (activeTab.value > firstNonHomeIndex) {
        activeTab.value--;
      }
      tabs.value.splice(firstNonHomeIndex, 1);
    }
  }
  tabs.value.push({
    title: item.name || '',
    icon: item.icon || '📄',
    routeName: item.routeName
  });
  activeTab.value = tabs.value.length - 1;
  saveTabs();
  router.push({ name: item.routeName });
};

const isMenuItemActive = (routeName: string) => {
  if (routeName === 'dashboard') {
    return route.path === '/' || route.name === 'dashboard';
  }
  return route.name === routeName;
};

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr && userStr !== "undefined") {
    try {
      userData.value = JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user data from localStorage in DashboardView:', e);
      localStorage.removeItem('user');
    }
  }

  // 加载通知
  loadNotifications();

  // 清除旧的 lastRoute 避免干扰
  localStorage.removeItem('lastRoute');

  // 清理无效的标签页（移除不存在的路由）
  const validTabs = tabs.value.filter(tab =>
    tab.routeName && router.hasRoute(tab.routeName)
  );

  // 如果所有标签都被过滤掉了，只保留仪表盘
  if (validTabs.length === 0) {
    validTabs.push({ title: '仪表盘', icon: '📊', routeName: 'dashboard' });
  }

  // 更新标签页列表
  tabs.value = validTabs;

  // 确保 activeTab 不超出范围
  if (activeTab.value >= tabs.value.length) {
    activeTab.value = 0;
  }

  // 保存清理后的标签页
  saveTabs();

  // 恢复标签页后跳转到对应的路由
  const targetTab = tabs.value[activeTab.value];
  if (targetTab && targetTab.routeName && router.hasRoute(targetTab.routeName)) {
    router.replace({ name: targetTab.routeName });
  } else {
    router.replace({ name: 'dashboard' });
  }
});

// 定时刷新未读数量
let unreadCountTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // 启动定时刷新
  loadUnreadCount();
  unreadCountTimer = setInterval(() => {
    loadUnreadCount();
  }, 30000); // 每30秒刷新一次
});

onBeforeUnmount(() => {
  if (unreadCountTimer) {
    clearInterval(unreadCountTimer);
    unreadCountTimer = null;
  }
});
</script>

<style scoped>
.dashboard-container {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background-color: #F9FAFB;
  color: #111827;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-header {
  display: flex;
  height: 52px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
}

.header-user-section {
  background-color: #FFFFFF;
  flex-grow: 1;
  padding: 0 24px 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  z-index: 1;
  margin-left: 240px;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding-top: 4px;
  flex: 0 0 auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background-color: #F3F4F6;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #6B7280;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  background-color: #E5E7EB;
}

.tab-item.active {
  background-color: #FFFFFF;
  color: #0066CC;
  border-bottom: 2px solid #0066CC;
  font-weight: 500;
}

.tab-icon {
  font-size: 14px;
}

.tab-close {
  margin-left: 6px;
  font-size: 12px;
  color: #9CA3AF;
  cursor: pointer;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.tab-close:hover {
  color: #EF4444;
  background-color: #FEF2F2;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.header-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6B7280;
  font-size: 14px;
}

.header-action:hover {
  background-color: #F3F4F6;
  color: #0066CC;
}

.notification-wrapper {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #EF4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 20px;
  border-left: 1px solid #E5E7EB;
}

.logout-btn {
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s ease;
}

.logout-btn:hover {
  transform: scale(1.1);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.user-role {
  font-size: 12px;
  color: #6B7280;
}

.jabil-logo-css {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.125rem;
  font-size: 2.8em;
  font-weight: 900;
  letter-spacing: -0.05em;
  filter: drop-shadow(0 0 10px rgba(0, 168, 232, 0.6));
  width: fit-content;
}

.jabil-logo-css .jabil-logo-J {
  color: #0066CC;
}

.jabil-logo-css .jabil-logo-A-container {
  position: relative;
  color: #0066CC;
}

.jabil-logo-css .jabil-logo-A-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.8em;
  height: 0.15em;
  border-radius: 999px;
  background: #63be3b;
  transform: translate(-50%, -50%) rotate(130deg);
}

.jabil-logo-css .jabil-logo-BIL {
  color: #0066CC;
}

.dashboard-layout {
  display: flex;
  flex-grow: 1;
}

.sidebar {
  width: 240px;
  background-color: #0A1628;
  border-right: 1px solid #0066CC;
  flex-shrink: 0;
  overflow-y: auto;
  height: 100vh;
  position: sticky;
  top: 0;
  box-shadow: 2px 0 10px rgba(0, 102, 204, 0.3);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  padding-bottom: 10px;
  margin-top: -54px;
  margin-bottom: -54px;
}

.sidebar-logo-section {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(0, 102, 204, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar-logo-section .jabil-logo-css {
  font-size: 40px;
  text-align: left;
}

.main-nav ul {
  list-style: none;
  padding: 8px 0 16px 0;
  margin: 0;
}

.main-nav li {
  display: flex;
  align-items: center;
  padding: 12px 12px;
  color: #E0E0E0;
  transition: all 0.3s ease;
  font-size: 14px;
  margin: 6px 6px;
  border-radius: 6px;
}

.main-nav li.sub-menu {
  padding-left: 28px;
  margin-left: 16px;
  margin-right: 6px;
  padding-right: 6px;
}

.main-nav li.hidden {
  display: none;
}

.main-nav li.menu-header {
  padding: 12px 12px;
  margin: 6px 6px 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.main-nav li.menu-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.main-nav li.menu-header .header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-nav li.menu-header .header-icon {
  font-size: 18px;
}

.main-nav li.menu-header .header-label {
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.main-nav li.menu-header .expand-icon {
  color: #9CA3AF;
  font-size: 12px;
  transition: transform 0.2s ease;
}

.main-nav li:hover {
  background-color: rgba(0, 102, 204, 0.25);
  color: #00A8E8;
}

.nav-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  width: 100%;
  cursor: pointer;
}

.main-nav li .icon {
  margin-right: 10px;
  font-size: 16px;
  color: #0066CC;
  transition: color 0.3s ease;
}

.main-nav li:hover .icon {
  color: #00A8E8;
}

.main-nav li.active {
  background: linear-gradient(90deg, rgba(0, 102, 204, 0.35) 0%, rgba(0, 102, 204, 0.08) 75%, rgba(0, 102, 204, 0) 100%);
  color: #FFFFFF;
  border-left: 4px solid #00A8E8;
  padding-left: 16px;
  box-shadow: inset 0 0 10px rgba(0, 168, 232, 0.3);
}

.main-nav li.active .icon {
  color: #FFFFFF;
}

.main-content {
  flex-grow: 1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 360px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin-top: 8px;
  z-index: 1000;
  overflow: hidden;
}

.notification-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
}

.notification-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.mark-all-read {
  font-size: 13px;
  color: #0066CC;
  cursor: pointer;
  transition: color 0.2s ease;
}

.mark-all-read:hover {
  color: #0052A3;
}

.notification-tabs {
  display: flex;
  border-bottom: 1px solid #E5E7EB;
}

.notification-tab {
  flex: 1;
  text-align: center;
  padding: 12px;
  font-size: 14px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s ease;
}

.notification-tab:hover {
  color: #0066CC;
  background: #F3F4F6;
}

.notification-tab.active {
  color: #0066CC;
  font-weight: 500;
  border-bottom: 2px solid #0066CC;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background: #F9FAFB;
}

.notification-item-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-item-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.notification-item-message {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item-time {
  font-size: 12px;
  color: #9CA3AF;
}

.unread-dot-small {
  width: 6px;
  height: 6px;
  background: #EF4444;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 8px;
}

.empty-notifications {
  padding: 40px 20px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
}
</style>
