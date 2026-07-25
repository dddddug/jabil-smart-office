import { ref, computed } from 'vue';
import request from '@/utils/request';
import { Employee, TemporaryOvertimeItem, TemporaryLeaveItem, ErrandFixItem } from '../../types/schedule';

interface UseTemporaryDataParams {
  employees: any; // Ref<Employee[]>
}

export function useTemporaryData(params: UseTemporaryDataParams) {
  const temporaryOvertimes = ref<TemporaryOvertimeItem[]>([]);
  const temporaryLeaves = ref<TemporaryLeaveItem[]>([]);
  const errandFixList = ref<ErrandFixItem[]>([]);

  const fetchTemporaryData = async (startDate: string, endDate: string) => {
    try {
      const overtimeResponse = await request.get<{ temporaryOvertimes: TemporaryOvertimeItem[] }>('/temporary-overtimes', {
        params: { startDate, endDate }
      });
      temporaryOvertimes.value = overtimeResponse.temporaryOvertimes;

      const leaveResponse = await request.get<{ temporaryLeaves: TemporaryLeaveItem[] }>('/temporary-leaves', {
        params: { startDate, endDate }
      });
      temporaryLeaves.value = leaveResponse.temporaryLeaves;

      const errandFixResponse = await request.get<{ errandFixList: ErrandFixItem[] }>('/errand-fixes', {
        params: { startDate, endDate }
      });
      errandFixList.value = errandFixResponse.errandFixList;

    } catch (error) {
      console.error('获取临时数据失败:', error);
      // throw error; // Re-throw to indicate failure
    }
  };

  const calculateEmployeeOvertimeHours = (employeeId: number, startDate: string, endDate: string): number => {
    let totalHours = 0;
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    temporaryOvertimes.value.forEach(ot => {
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

    temporaryLeaves.value.forEach(leave => {
      const leaveDate = dayjs(leave.leaveDate);
      if (leave.employeeId === employeeId && leaveDate.isBetween(start, end, 'day', '[]')) {
        totalHours += leave.totalHours;
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