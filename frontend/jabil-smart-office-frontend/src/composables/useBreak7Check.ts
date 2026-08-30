import { ref, computed } from 'vue';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import {
  Employee,
  ScheduleViewMode,
  IgnoredOverworkItem,
  EmployeeWithOverworkDetails,
  EmployeeWithWeeklyLimitDetails,
  DepartmentSummaryItem,
} from '../types/schedule';

interface UseBreak7CheckParams {
  currentPeriodStart: any; // dayjs.Dayjs | string
  customRangeEnd: any; // dayjs.Dayjs | string
  getWorkHours: (shift: string) => number;
  calculateEmployeeOvertimeHours: (employeeId: number, startDate: string, endDate: string) => number;
}

export function useBreak7Check(params: UseBreak7CheckParams) {
  const { currentPeriodStart, customRangeEnd, getWorkHours, calculateEmployeeOvertimeHours } = params;

  const overworkingEmployees = ref<EmployeeWithOverworkDetails[]>([]);
  const normalEmployees = ref<EmployeeWithOverworkDetails[]>([]);
  const weeklyLimitEmployees = ref<EmployeeWithWeeklyLimitDetails[]>([]);
  const weeklyNormalEmployees = ref<EmployeeWithWeeklyLimitDetails[]>([]);
  const weeklyLimitSetting = ref(40); // 默认周工时上限
  const ignoredOverworkItems = ref<IgnoredOverworkItem[]>([]);

  const loadIgnoredItems = () => {
    const savedIgnored = localStorage.getItem('ignoredOverworkItems');
    if (savedIgnored) {
      ignoredOverworkItems.value = JSON.parse(savedIgnored);
    }
  };

  const saveIgnoredItems = () => {
    localStorage.setItem('ignoredOverworkItems', JSON.stringify(ignoredOverworkItems.value));
  };

  const toggleIgnoreOverwork = (emp: EmployeeWithOverworkDetails) => {
    const index = ignoredOverworkItems.value.findIndex(
      (item: IgnoredOverworkItem) => item.employeeId === emp.id && item.periodStart === emp.overworkPeriodStart
    );
    if (index > -1) {
      ignoredOverworkItems.value.splice(index, 1);
    } else {
      ignoredOverworkItems.value.push({
        employeeId: emp.id,
        periodStart: emp.overworkPeriodStart,
      });
    }
    saveIgnoredItems();
    // Re-check to update the display
    checkOverworking(
      normalEmployees.value.concat(overworkingEmployees.value), // Pass all employees for re-checking
      'week', // This view mode might need to be dynamic or a parameter
      currentPeriodStart.value,
      customRangeEnd.value
    );
  };

  const checkOverworking = (
    employeesToCheck: Employee[],
    viewMode: string,
    periodStart: string,
    periodEnd: string
  ) => {
    overworkingEmployees.value = [];
    normalEmployees.value = [];

    employeesToCheck.forEach((employee) => {
      // 优先使用后端返回的 break7Rest1Violations 数据
      const violations = employee.break7Rest1Violations || [];

      if (violations.length > 0) {
        // 有违规记录
        violations.forEach((violation: any) => {
          const isIgnored = ignoredOverworkItems.value.some(
            (item: IgnoredOverworkItem) =>
              item.employeeId === employee.id &&
              item.periodStart === violation.start
          );
          overworkingEmployees.value.push({
            ...employee,
            consecutiveDays: violation.consecutiveDays,
            overworkPeriodStart: violation.start,
            overworkPeriodEnd: violation.end,
            isIgnored,
          });
        });
      } else {
        // 无违规，记录为正常员工
        normalEmployees.value.push({
          ...employee,
          consecutiveDays: 0,
          overworkPeriodStart: '',
          overworkPeriodEnd: '',
          isIgnored: false,
        });
      }
    });
  };

  const checkWeeklyHours = (
    employeesToCheck: Employee[],
    viewMode: string,
    periodStart: string,
    periodEnd: string
  ) => {
    weeklyLimitEmployees.value = [];
    weeklyNormalEmployees.value = [];

    const periodStartDate = dayjs(periodStart);
    const periodEndDate = dayjs(periodEnd);

    // 判断是否是休息类班次
    const isRestShift = (shift: string): boolean => {
      if (!shift) return false;
      const restShifts = ['调休', '请假', '年假', '旷工', '离职', '休', '休息'];
      return restShifts.includes(shift) || shift.includes('休') || shift.includes('请假') || shift.includes('年假');
    };

    // 计算某一天的工时
    const getDailyHours = (date: dayjs.Dayjs, shift: string | undefined): number => {
      if (!shift) return 0;
      if (isRestShift(shift)) return 0;

      // 周一到周三：按实际排班工时
      // 周四到周日：固定按12小时算（除非是休息类班次）
      const dayOfWeek = date.day(); // 0=周日, 1=周一, ..., 6=周六
      if (dayOfWeek >= 1 && dayOfWeek <= 3) {
        // 周一到周三（周一=1，周二=2，周三=3）：按实际排班工时
        return getWorkHours(shift);
      } else {
        // 周四到周日（周四=4，周五=5，周六=6，周日=0）：固定按12小时算
        return 12;
      }
    };

    employeesToCheck.forEach((employee) => {
      let totalWeeklyHours = 0;
      let currentWeekStart = dayjs(periodStartDate).startOf('isoWeek');
      let isOverLimit = false;

      while (currentWeekStart.isBefore(periodEndDate) || currentWeekStart.isSame(periodEndDate, 'week')) {
        totalWeeklyHours = 0;
        const currentWeekEnd = currentWeekStart.endOf('isoWeek');

        // Iterate through each day of the current week within the overall period
        let dayInWeek = currentWeekStart;
        while ((dayInWeek.isBefore(currentWeekEnd) || dayInWeek.isSame(currentWeekEnd)) &&
               (dayInWeek.isBefore(periodEndDate) || dayInWeek.isSame(periodEndDate))) {
          const dateStr = dayInWeek.format('YYYY-MM-DD');
          const scheduleItem = employee.schedule ? employee.schedule[dateStr] : null;

          // 使用新的工时计算逻辑
          const dailyHours = getDailyHours(dayInWeek, scheduleItem?.shift);
          totalWeeklyHours += dailyHours;

          // Add temporary overtime hours for this specific day
          totalWeeklyHours += calculateEmployeeOvertimeHours(employee.id, dateStr, dateStr);

          dayInWeek = dayInWeek.add(1, 'day');
        }

        if (totalWeeklyHours > weeklyLimitSetting.value) {
          weeklyLimitEmployees.value.push({
            ...employee,
            weeklyHours: totalWeeklyHours,
            weeklyLimit: weeklyLimitSetting.value,
            overLimitHours: totalWeeklyHours - weeklyLimitSetting.value,
            weeklyPeriodStart: currentWeekStart.format('YYYY-MM-DD'),
            weeklyPeriodEnd: currentWeekEnd.format('YYYY-MM-DD'),
          });
          isOverLimit = true;
        }
        currentWeekStart = currentWeekStart.add(1, 'week');
      }

      if (!isOverLimit) {
        weeklyNormalEmployees.value.push({
          ...employee,
          weeklyHours: 0, // Placeholder, not strictly needed for normal employees
          weeklyLimit: weeklyLimitSetting.value,
          overLimitHours: 0,
          weeklyPeriodStart: '',
          weeklyPeriodEnd: '',
        });
      }
    });
  };

  const totalOverworkCount = computed(() => {
    return overworkingEmployees.value.filter((emp: EmployeeWithOverworkDetails) => !emp.isIgnored).length;
  });

  const totalOverLimitCount = computed(() => {
    return weeklyLimitEmployees.value.length;
  });

  const summaryData = computed((): DepartmentSummaryItem[] => {
    const deptMap = new Map<string, DepartmentSummaryItem>();

    overworkingEmployees.value.forEach((emp: EmployeeWithOverworkDetails) => {
      const dept = emp.departmentName || emp.department || '未设置部门';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          applicant: '',
          overworkCount: 0,
          overLimitCount: 0,
          totalOverHours: 0,
          period: dayjs(currentPeriodStart.value).format('YYYY-MM-DD') + ' - ' + dayjs(customRangeEnd.value).format('YYYY-MM-DD'),
          reason: ''
        });
      }
      if (!emp.isIgnored) {
        deptMap.get(dept)!.overworkCount++;
      }
    });

    weeklyLimitEmployees.value.forEach((emp: EmployeeWithWeeklyLimitDetails) => {
      const dept = emp.departmentName || emp.department || '未设置部门';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          applicant: '',
          overworkCount: 0,
          overLimitCount: 0,
          totalOverHours: 0,
          period: dayjs(currentPeriodStart.value).format('YYYY-MM-DD') + ' - ' + dayjs(customRangeEnd.value).format('YYYY-MM-DD'),
          reason: ''
        });
      }
      deptMap.get(dept)!.overLimitCount++;
      deptMap.get(dept)!.totalOverHours += emp.overLimitHours;
    });

    return Array.from(deptMap.values());
  });

  return {
    overworkingEmployees,
    normalEmployees,
    weeklyLimitEmployees,
    weeklyNormalEmployees,
    weeklyLimitSetting,
    ignoredOverworkItems,
    loadIgnoredItems,
    saveIgnoredItems,
    toggleIgnoreOverwork,
    checkOverworking,
    checkWeeklyHours,
    totalOverworkCount,
    totalOverLimitCount,
    summaryData,
  };
}
