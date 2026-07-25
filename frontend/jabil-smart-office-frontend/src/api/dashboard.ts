import request from '../utils/request';

/**
 * 获取仪表盘统计数据
 */
export const getDashboardStats = (params?: { plantId?: number; departmentId?: number }) => {
  return request.get('/dashboard/stats', { params });
};

/**
 * 获取今日排班概览
 */
export const getTodaySchedule = () => {
  return request.get('/dashboard/today-schedule');
};

/**
 * 获取待审批列表
 */
export const getPendingApprovals = (params?: { limit?: number; page?: number }) => {
  return request.get('/dashboard/pending-approvals', { params });
};

/**
 * 获取工时趋势数据
 */
export const getWorkingHoursTrend = (params?: { plantId?: number; departmentId?: number; months?: number }) => {
  return request.get('/dashboard/working-hours-trend', { params });
};

/**
 * 获取部门工时分布
 */
export const getDepartmentDistribution = (params?: { plantId?: number; month?: string }) => {
  return request.get('/dashboard/department-distribution', { params });
};
