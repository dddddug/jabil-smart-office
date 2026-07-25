import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import request from '@/utils/request';
import {
  Employee,
  ScheduleViewMode,
  IgnoredOverworkItem,
  EmployeeWithOverworkDetails,
  EmployeeWithWeeklyLimitDetails,
  DepartmentSummaryItem,
} from '../../types/schedule';

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
      (item) => item.employeeId === emp.id && item.periodStart === emp.overworkPeriodStart
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
    viewMode: ScheduleViewMode,
    periodStart: string,
    periodEnd: string
  ) => {
    overworkingEmployees.value = [];
    normalEmployees.value = [];

    const periodStartDate = dayjs(periodStart);
    const periodEndDate = dayjs(periodEnd);

    employeesToCheck.forEach((employee) => {
      let consecutiveDays = 0;
      let lastWorkDate: dayjs.Dayjs | null = null;
      let overworkStart = '';
      let isOverworking = false;

      // Iterate through the schedule for the defined period
      let currentDate = periodStartDate;
      while (currentDate.isBefore(periodEndDate) || currentDate.isSame(periodEndDate)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const scheduleItem = employee.schedule ? employee.schedule[dateStr] : null;
        const isWorkingDay = scheduleItem && scheduleItem.shift && scheduleItem.shift !== '休';

        if (isWorkingDay) {
          consecutiveDays++;
          if (!overworkStart) {
            overworkStart = dateStr;
          }
          lastWorkDate = currentDate;
        } else {
          // Not a working day or '休'
          if (consecutiveDays >= 7) {
            const overworkPeriodEnd = lastWorkDate ? lastWorkDate.format('YYYY-MM-DD') : dateStr;
            const isIgnored = ignoredOverworkItems.value.some(
              (item) => item.employeeId === employee.id && item.periodStart === overworkStart
            );
            overworkingEmployees.value.push({
              ...employee,
              consecutiveDays,
              overworkPeriodStart: overworkStart,
              overworkPeriodEnd: overworkPeriodEnd,
              isIgnored,
            });
            isOverworking = true;
          }
          consecutiveDays = 0;
          overworkStart = '';
          lastWorkDate = null;
        }
        currentDate = currentDate.add(1, 'day');
      }

      // Handle case where overwork extends to the end of the period
      if (consecutiveDays >= 7) {
        const overworkPeriodEnd = lastWorkDate ? lastWorkDate.format('YYYY-MM-DD') : periodEndDate.format('YYYY-MM-DD');
        const isIgnored = ignoredOverworkItems.value.some(
          (item) => item.employeeId === employee.id && item.periodStart === overworkStart
        );
        overworkingEmployees.value.push({
          ...employee,
          consecutiveDays,
          overworkPeriodStart: overworkStart,
          overworkPeriodEnd: overworkPeriodEnd,
          isIgnored,
        });
        isOverworking = true;
      }

      if (!isOverworking) {
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
    viewMode: ScheduleViewMode,
    periodStart: string,
    periodEnd: string
  ) => {
    weeklyLimitEmployees.value = [];
    weeklyNormalEmployees.value = [];

    const periodStartDate = dayjs(periodStart);
    const periodEndDate = dayjs(periodEnd);

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
          if (scheduleItem && scheduleItem.shift) {
            totalWeeklyHours += getWorkHours(scheduleItem.shift);
          }
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
