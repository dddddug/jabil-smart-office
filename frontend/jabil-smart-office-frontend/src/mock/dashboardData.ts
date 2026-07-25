import { reactive } from 'vue';

export const dashboardData = reactive({
  // 核心指标卡片数据
  cards: [
    {
      title: '👥 在职员工',
      value: '34 / 35人',
      link: '点击查看详情 →',
      color: '#00A8E8',
    },
    {
      title: '💰 本月费用',
      value: '¥2,160.00',
      link: '点击查看详情 →',
      color: '#FFD700',
    },
    {
      title: '📦 本月产量',
      value: '670件',
      link: '点击查看详情 →',
      color: '#FF6347',
    },
    {
      title: '🏆 奖金总额',
      value: '¥3,300.00',
      link: '点击查看详情 →',
      color: '#ADFF2F',
    },
    {
      title: '⏳ 待审批',
      value: '0项',
      link: '点击查看详情 →',
      color: '#FFA07A',
    },
    {
      title: '📅 本月排班',
      value: '832人次',
      link: '点击查看详情 →',
      color: '#87CEEB',
    },
  ],

  // 最近7天产量趋势数据 (用于折线图)
  productionTrend: {
    labels: ['6/22', '6/23', '6/24', '6/25', '6/26', '6/27', '6/28'],
    data: [120, 150, 130, 180, 160, 200, 190],
    total: '1130件',
  },

  // 本月班次分布数据 (用于横向条形图)
  shiftDistribution: [
    { label: '早班', value: 300, color: '#00A8E8' },
    { label: '中班', value: 250, color: '#FFD700' },
    { label: '晚班', value: 200, color: '#FF6347' },
    { label: '休息', value: 82, color: '#A0A0A0' },
  ],

  // 今日排班数据
  todaySchedule: {
    date: '2026-06-28',
    content: '今日暂无排班，请前往排班模块生成',
    link: '点击跳转排班模块 →',
  },

  // 费用分类数据
  costCategories: [
    { name: '办公用品', value: 320.00, percentage: 20, color: '#00A8E8' },
    { name: '差旅费', value: 1200.00, percentage: 60, color: '#FFD700' },
    { name: '设备维修', value: 560.00, percentage: 20, color: '#FF6347' },
  ],

  // 待审批申请数据
  pendingApprovals: {
    content: '暂无待审批事项 🎉',
  },
});
