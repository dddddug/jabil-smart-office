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
      const overtimeRes = await request.get<{ items: TemporaryOvertimeItem[]; temporaryOvertimes?: TemporaryOvertimeItem[] }>('/temporary-overtime', {
        params: { startDate, endDate }
      });
      // 字段映射：后端返回 overtimeDate/startTime/endTime/hours，模板需要 overtimeDate/startTime/endTime/totalHours
      const rawOvertimes = overtimeRes?.temporaryOvertimes || overtimeRes?.items || [];
      temporaryOvertimes.value = rawOvertimes.map((item: any) => ({
        ...item,
        totalHours: item.hours
      }));

      const leaveRes = await request.get<{ items: TemporaryLeaveItem[]; temporaryLeaves?: TemporaryLeaveItem[] }>('/temporary-leave', {
        params: { startDate, endDate }
      });
      // 字段映射：后端返回 startDate/startTime/endTime/hours，模板需要 leaveDate/startTime/endTime/totalHours
      const rawLeaves = leaveRes?.temporaryLeaves || leaveRes?.items || [];
      temporaryLeaves.value = rawLeaves.map((item: any) => ({
        ...item,
        leaveDate: item.startDate,
        totalHours: item.hours
      }));

      // errand-fixes API 不存在，errandFixList 使用 temporaryLeaves 中 leaveType === 'ERRAND' 的数据
      errandFixList.value = [];

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