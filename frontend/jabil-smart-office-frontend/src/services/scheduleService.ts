import request from '../utils/request';
import { Employee, Plant, Department, TemporaryOvertimeItem, TemporaryLeaveItem, ScheduleItem } from '../types/schedule';

const API_BASE_URL = 'http://localhost:3001/api';

export async function loadPlants(): Promise<Plant[]> {
  try {
    const data = await request.get<{ plants: Plant[] }>(`/plants`);
    return data?.plants || [];
  } catch (error: any) {
    // 检查是否是取消的请求（路由切换时会发生）
    if (error?.code === 'CANCELLED' || error?.isCancelled) {
      return [];
    }
    console.error('加载厂区失败:', error);
    throw error;
  }
}

export async function loadDepartments(): Promise<Department[]> {
  try {
    const data = await request.get<{ departments: Department[] }>(`/departments`);
    return data?.departments || [];
  } catch (error: any) {
    // 检查是否是取消的请求（路由切换时会发生）
    if (error?.code === 'CANCELLED' || error?.isCancelled) {
      return [];
    }
    console.error('加载部门失败:', error);
    throw error;
  }
}

export async function loadEmployeesAndSchedules(startDate: string, endDate: string, plantId?: number | null, departmentId?: number | null): Promise<Employee[]> {
  try {
    const response = await request.get<{ employees: Employee[] }>('/schedule/employees', {
      params: {
        startDate,
        endDate,
        plantId: plantId || undefined,
        departmentId: departmentId || undefined,
      },
    });
    return response.employees || [];
  } catch (error) {
    console.error('加载员工和排班数据失败:', error);
    throw error;
  }
}

export async function fetchTemporaryOvertime(startDate: string, endDate: string): Promise<TemporaryOvertimeItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/temporary-overtime?startDate=${startDate}&endDate=${endDate}&pageSize=1000`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch temporary overtime: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn('获取临时加班数据失败:', error);
    return [];
  }
}

export async function fetchTemporaryLeave(startDate: string, endDate: string): Promise<TemporaryLeaveItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/temporary-leave?startDate=${startDate}&endDate=${endDate}&pageSize=1000`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch temporary leave: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn('获取临时请假数据失败:', error);
    return [];
  }
}

export async function saveSchedule(employeeId: number, scheduleDate: string, shift: string, specialStatus?: string, tempMatter?: ScheduleItem['tempMatter']): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/schedule/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        scheduleDate,
        shift,
        specialStatus,
        tempMatter,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save schedule: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('保存排班信息失败:', error);
    throw error;
  }
}

export async function deleteSchedule(employeeId: number, scheduleDate: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${employeeId}/${scheduleDate}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete schedule: ${response.statusText}`);
    }
  } catch (error) {
    console.error('删除排班失败:', error);
    throw error;
  }
}

export async function downloadScheduleTemplate(startDate: string, endDate: string): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/batch/schedule/download-template?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('下载模板失败:', error);
    throw error;
  }
}

export async function batchUploadSchedule(formData: FormData): Promise<{ insertedCount: number, updatedCount: number, errors?: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/batch/schedule/batch-upload`, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Batch upload failed with status: ${response.status}`);
    }
    return result;
  } catch (error) {
    console.error('批量导入排班失败:', error);
    throw error;
  }
}

export async function saveTemporaryOvertime(overtimeData: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/temporary-overtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(overtimeData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save temporary overtime: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('保存临时加班记录失败:', error);
    throw error;
  }
}

export async function saveTemporaryLeave(leaveData: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/temporary-leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leaveData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save temporary leave: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('保存临时请假/公差记录失败:', error);
    throw error;
  }
}

export async function fetchProofFile(url: string): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    throw error;
  }
}
