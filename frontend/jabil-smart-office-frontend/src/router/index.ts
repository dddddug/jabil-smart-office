import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../utils/request'; // 导入 getToken 函数

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/first-time-setup',
      name: 'first-time-setup',
      component: () => import('../views/FirstTimeSetup.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardContent.vue'),
        },
        {
          path: 'employee-schedule',
          name: 'employee-schedule',
          component: () => import('../views/EmployeeScheduleView.vue'),
        },
        {
          path: 'station-arrangement',
          name: 'station-arrangement',
          component: () => import('../views/StationArrangementView.vue'),
        },
        {
          path: 'receipt-management',
          name: 'receipt-management',
          component: () => import('../views/ReceiptManagementView.vue'),
        },
        {
          path: 'convenient-print',
          name: 'convenient-print',
          component: () => import('../views/ConvenientPrintView.vue'),
        },
        {
          path: 'cost-summary',
          name: 'cost-summary',
          component: () => import('../views/CostSummaryView.vue'),
          meta: { requiresAuth: true, title: 'Cost 汇总' },
        },
        {
          path: 'production-tracking',
          name: 'production-tracking',
          component: () => import('../views/ProductionTrackingView.vue'),
        },
        {
          path: 'bonus-evaluation',
          name: 'bonus-evaluation',
          component: () => import('../views/BonusEvaluationView.vue'),
        },
        {
          path: 'leave-management',
          name: 'leave-management',
          component: () => import('../views/LeaveManagementView.vue'),
        },
        {
          path: 'kpi-indicators',
          name: 'kpi-indicators',
          component: () => import('../views/KpiIndicatorsView.vue'),
        },
        {
          path: 'bin-volume-management',
          name: 'bin-volume-management',
          component: () => import('../views/BinVolumeManagementView.vue'),
        },
        {
          path: 'expired-material-extension',
          name: 'expired-material-extension',
          component: () => import('../views/ExpiredMaterialExtensionView.vue'),
        },
        {
          path: '6s-management',
          name: '6s-management',
          component: () => import('../views/SixSManagementView.vue'),
        },
        {
          path: 'employee-roster',
          name: 'employee-roster',
          component: () => import('../views/EmployeeRosterView.vue'),
        },
        {
          path: 'organizational-structure',
          name: 'organizational-structure',
          component: () => import('../views/OrganizationalStructureView.vue'),
        },
        {
          path: 'plant-management',
          name: 'plant-management',
          component: () => import('../views/PlantManagementView.vue'),
        },
        {
          path: 'department-management',
          name: 'department-management',
          component: () => import('../views/DepartmentManagementView.vue'),
        },
        {
          path: 'user-management',
          name: 'user-management',
          component: () => import('../views/UserManagementView.vue'),
        },
        {
          path: 'permission-management',
          name: 'permission-management',
          component: () => import('../views/PermissionManagementView.vue'),
        },
        {
          path: 'role-management',
          name: 'role-management',
          component: () => import('../views/RoleManagementView.vue'),
        },
        {
          path: 'dept-calc-rules-config',
          name: 'dept-calc-rules-config',
          component: () => import('../views/DeptCalcRulesConfigView.vue'),
          meta: { requiresAuth: true, title: '部门计算规则配置' },
        },
        {
          path: 'shift-duration-rules-config',
          name: 'shift-duration-rules-config',
          component: () => import('../views/ShiftDurationConfigView.vue'),
          meta: { requiresAuth: true, title: '班次时长规则配置' },
        },
        {
          path: 'smart-schedule-rules-config',
          name: 'smart-schedule-rules-config',
          component: () => import('../views/SmartScheduleRulesConfigView.vue'),
        },
        {
          path: 'employee-hourly-rate-config',
          name: 'employee-hourly-rate-config',
          component: () => import('../views/EmployeeHourlyRateConfigView.vue'),
        },
        {
          path: 'welfare-base-config',
          name: 'welfare-base-config',
          component: () => import('../views/WelfareBaseConfigView.vue'),
        },
        {
          path: 'announcement-management',
          name: 'announcement-management',
          component: () => import('../views/AnnouncementManagementView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

// 路由守卫
router.beforeEach((to, from) => {
  const token = getToken(); // 直接获取 token
  const isLoggedIn = !!token; // 根据 token 存在与否判断登录状态
  const userStr = localStorage.getItem('user');
  const hasSkippedSetup = localStorage.getItem('hasSkippedSetup') === 'true';
  
  let user = null;
  if (userStr && userStr !== "undefined") {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('user');
    }
  }
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  if (requiresAuth && !isLoggedIn) {
    if (to.path !== '/login') {
      return '/login';
    } else {
      return undefined;
    }
  } else if (isLoggedIn && user) {
    // needsSetup is not defined, assuming it should be user && !hasSkippedSetup
    const needsSetup = user && !hasSkippedSetup; 
    if (needsSetup && to.path !== '/first-time-setup') {
      return '/first-time-setup';
    } else if (!needsSetup && to.path === '/first-time-setup') {
      return '/';
    }
  }
  return undefined;
});



export default router
