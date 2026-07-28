import { ref, computed, watch } from 'vue';
import dayjs from '@/plugins/dayjs';
import 'dayjs/locale/zh-cn';
import { useLocalStorageState } from './useLocalStorageState';
import type { Day } from '../types/schedule';

dayjs.locale('zh-cn');

export function useSchedulePeriod(
  initialPeriodStart: string,
  initialCustomRangeEnd: string,
  scope?: string
) {
  const scheduleViewMode = useLocalStorageState<'week' | 'month' | 'range'>('employeeScheduleViewMode', 'week', scope);
  const currentPeriodStart = useLocalStorageState<string>('employeeSchedulePeriodStart', initialPeriodStart, scope);
  const customRangeEnd = useLocalStorageState<string>('employeeScheduleCustomRangeEnd', initialCustomRangeEnd, scope);

  const todayJs = dayjs();
  const currentMonthStart = computed(() => dayjs(currentPeriodStart.value).startOf('month'));

  // Helper to create Day objects with full properties
  const createDayObject = (date: dayjs.Dayjs, periodStart: dayjs.Dayjs): Day => ({
    date: date.format('YYYY-MM-DD'),
    monthDay: date.format('DD'),
    weekday: date.format('ddd'),
    isToday: date.isSame(todayJs, 'day'),
    isCurrentMonth: date.isSame(periodStart, 'month'),
  });

  // 计算当前视图日期范围
  const currentCalculatedDateRange = computed(() => {
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs;

    if (scheduleViewMode.value === 'week') {
      startDate = dayjs(currentPeriodStart.value).startOf('isoWeek');
      endDate = dayjs(currentPeriodStart.value).endOf('isoWeek');
    } else if (scheduleViewMode.value === 'month') {
      // 月视图始终从24号到次月23号
      let startOfMonth: dayjs.Dayjs;
      if (dayjs(currentPeriodStart.value).date() >= 24) {
        startOfMonth = dayjs(currentPeriodStart.value).date(24);
      } else {
        startOfMonth = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
      }
      startDate = startOfMonth;
      endDate = startOfMonth.add(1, 'month').date(23);
    } else { // range
      startDate = dayjs(currentPeriodStart.value);
      endDate = dayjs(customRangeEnd.value);
    }
    return { startDate: startDate.format('YYYY-MM-DD'), endDate: endDate.format('YYYY-MM-DD') };
  });

  // 周视图的日期
  const weekDays = computed(() => {
    const start = dayjs(currentCalculatedDateRange.value.startDate);
    const end = dayjs(currentCalculatedDateRange.value.endDate);
    const days: Day[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(createDayObject(current, start));
      current = current.add(1, 'day');
    }
    return days;
  });

  // 月视图的日期
  const monthDays = computed(() => {
    const start = dayjs(currentCalculatedDateRange.value.startDate);
    const end = dayjs(currentCalculatedDateRange.value.endDate);
    const days: Day[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(createDayObject(current, currentMonthStart.value));
      current = current.add(1, 'day');
    }
    return days;
  });

  // 自定义范围的日期
  const customRangeDays = computed(() => {
    const start = dayjs(currentCalculatedDateRange.value.startDate);
    const end = dayjs(currentCalculatedDateRange.value.endDate);
    const days: Day[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(createDayObject(current, start));
      current = current.add(1, 'day');
    }
    return days;
  });

  const formattedWeekRange = computed(() => {
    const { startDate, endDate } = currentCalculatedDateRange.value;
    return `${dayjs(startDate).format('YYYY年MM月DD日')} - ${dayjs(endDate).format('MM月DD日')}`;
  });

  const formattedMonthRange = computed(() => {
    const { startDate, endDate } = currentCalculatedDateRange.value;
    return `${dayjs(startDate).format('YYYY年MM月DD日')} - ${dayjs(endDate).format('MM月DD日')}`;
  });

  const formattedCustomRange = computed(() => {
    const { startDate, endDate } = currentCalculatedDateRange.value;
    return `${dayjs(startDate).format('YYYY年MM月DD日')} - ${dayjs(endDate).format('MM月DD日')}`;
  });

  // 当前筛选维度的天数
  const currentFilterDays = computed(() => {
    const { startDate, endDate } = currentCalculatedDateRange.value;
    return dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  });

  const prevPeriod = () => {
    if (scheduleViewMode.value === 'week') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'month') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24).format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'range') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(7, 'day').format('YYYY-MM-DD');
      customRangeEnd.value = dayjs(customRangeEnd.value).subtract(7, 'day').format('YYYY-MM-DD');
    }
  };

  const nextPeriod = () => {
    if (scheduleViewMode.value === 'week') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).add(1, 'week').startOf('isoWeek').format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'month') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).add(1, 'month').date(24).format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'range') {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).add(7, 'day').format('YYYY-MM-DD');
      customRangeEnd.value = dayjs(customRangeEnd.value).add(7, 'day').format('YYYY-MM-DD');
    }
  };

  const today = () => {
    if (scheduleViewMode.value === 'week') {
      currentPeriodStart.value = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'month') {
      if (dayjs().date() >= 24) {
        currentPeriodStart.value = dayjs().date(24).format('YYYY-MM-DD');
      } else {
        currentPeriodStart.value = dayjs().subtract(1, 'month').date(24).format('YYYY-MM-DD');
      }
    } else if (scheduleViewMode.value === 'range') {
      const today = dayjs();
      let saturday = today.day(6); // Get Saturday of current week
      if (saturday.isAfter(today) && saturday.day() !== today.day()) { // If Saturday is in the future and not today
        saturday = saturday.subtract(7, 'day'); // Get previous Saturday
      }
      currentPeriodStart.value = saturday.format('YYYY-MM-DD');
      customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
    }
  };

  const goToDate = (dateOrEvent: string | Event) => {
    // Handle both string and Event from @change handler
    const date = typeof dateOrEvent === 'string' ? dateOrEvent : (dateOrEvent.target as HTMLInputElement).value;
    if (scheduleViewMode.value === 'week') {
      currentPeriodStart.value = dayjs(date).startOf('isoWeek').format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'month') {
      if (dayjs(date).date() >= 24) {
        currentPeriodStart.value = dayjs(date).date(24).format('YYYY-MM-DD');
      }
    } else if (scheduleViewMode.value === 'range') {
      const selectedDay = dayjs(date);
      let saturday = selectedDay.day(6); // Get Saturday of the week of selectedDay
      if (saturday.isAfter(selectedDay) && saturday.day() !== selectedDay.day()) {
        saturday = saturday.subtract(7, 'day');
      }
      currentPeriodStart.value = saturday.format('YYYY-MM-DD');
      customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
    }
  };

  const switchViewMode = (mode: 'week' | 'month' | 'range') => {
    scheduleViewMode.value = mode;
    // Reset dates based on new mode
    if (mode === 'week') {
      currentPeriodStart.value = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    } else if (mode === 'month') {
      if (dayjs().date() >= 24) {
        currentPeriodStart.value = dayjs().date(24).format('YYYY-MM-DD');
      } else {
        currentPeriodStart.value = dayjs().subtract(1, 'month').date(24).format('YYYY-MM-DD');
      }
    } else if (mode === 'range') {
      const today = dayjs();
      let saturday = today.day(6); // Get Saturday of current week
      if (saturday.isAfter(today) && saturday.day() !== today.day()) {
        saturday = saturday.subtract(7, 'day');
      }
      currentPeriodStart.value = saturday.format('YYYY-MM-DD');
      customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
    }
  };

  return {
    scheduleViewMode,
    currentPeriodStart,
    customRangeEnd,
    currentCalculatedDateRange,
    weekDays,
    monthDays,
    customRangeDays,
    formattedWeekRange,
    formattedMonthRange,
    formattedCustomRange,
    currentFilterDays,
    prevPeriod,
    nextPeriod,
    today,
    goToDate,
    switchViewMode,
  };
}
