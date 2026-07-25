import { ref, computed } from 'vue';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { Employee, TemporaryOvertimeItem, TemporaryLeaveItem, ErrandFixItem } from '../types/schedule';

interface UseTemporaryDataParams {
  employees: any; // Ref<Employee[]>
}

export function useTemporaryData(params: UseTemporaryDataParams) {
  const temporaryOvertimes = ref<TemporaryOvertimeItem[]>([]);
  const temporaryLeaves = ref<TemporaryLeaveItem[]>([]);
  const errandFixList = ref<ErrandFixItem[]>([]);

  const fetchTemporaryData = async (startDate: string, endDate: string) => {
    try {
      const overtimeRes = await request.get<{ temporaryOvertimes: TemporaryOvertimeItem[] }>('/temporary-overtimes', {
        params: { startDate, endDate }
      });
      temporaryOvertimes.value = overtimeRes?.temporaryOvertimes || [];

      const leaveRes = await request.get<{ temporaryLeaves: TemporaryLeaveItem[] }>('/temporary-leaves', {
        params: { startDate, endDate }
      });
      temporaryLeaves.value = leaveRes?.temporaryLeaves || [];

      const errandFixRes = await request.get<{ errandFixList: ErrandFixItem[] }>('/errand-fixes', {
        params: { startDate, endDate }
      });
      errandFixList.value = errandFixRes?.errandFixList || [];

    } catch (error) {
      console.error('获取临时数据失败:', error);
      // throw error; // Re-throw to indicate failure
    }
  };

  const calculateEmployeeOvertimeHours = (employeeId: number, startDate: string, endDate: string): number => {
    let totalHours = 0;
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    temporaryOvertimes.value.forEach((ot: TemporaryOvertimeItem) => {
      const otDate = dayjs(ot.overtimeDate);
      if (ot.employeeId === employeeId && otDate.isBetween(start, end, 'day', '[]')) {
        totalHours += ot.totalHours;
      }
    });
    return totalHours;
  };

  const calculateEmployeeLeaveHours = (employeeId: number, startDate: string, endDate: string): number => {
    let totalHours = 0;
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    temporaryLeaves.value.forEach((leave: TemporaryLeaveItem) => {
      const leaveDate = dayjs(leave.leaveDate || leave.startDate || '');
      if (leave.employeeId === employeeId && leaveDate.isBetween(start, end, 'day', '[]')) {
        totalHours += leave.totalHours || 0;
      }
    });
    return totalHours;
  };

  return {
    temporaryOvertimes,
    temporaryLeaves,
    errandFixList,
    fetchTemporaryData,
    calculateEmployeeOvertimeHours,
    calculateEmployeeLeaveHours,
  };
}