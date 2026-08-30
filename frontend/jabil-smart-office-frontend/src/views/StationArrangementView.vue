<template>
  <div class="station-arrangement-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">工位安排</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🏭 工位安排</div>
        <div class="table-card-actions">
          <el-button type="default" size="small" @click="resetSelection">🔄 重置</el-button>
          <el-button type="primary" size="small" @click="openBatchAssignDialog">
            📋 批量分配
          </el-button>
        </div>
      </div>

      <div class="card-body">
        <!-- 日期和班次选择 -->
        <div class="selection-bar">
          <div class="form-group">
            <label>日期:</label>
            <el-date-picker
              v-model="selectedDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :clearable="false"
              @change="onDateChange"
            />
          </div>
          <div class="form-group">
            <label>班次:</label>
            <el-select v-model="filterShift" placeholder="全部班次" multiple collapse-tags collapse-tags-tooltip @change="onFilterChange">
              <el-option v-for="shift in shiftOptions" :key="shift.value" :label="shift.label" :value="shift.value" />
            </el-select>
          </div>
          <div class="form-group">
            <label>厂区:</label>
            <el-select v-model="filterPlantId" placeholder="全部厂区" @change="onFilterChange">
              <el-option :value="0" label="全部厂区" />
              <el-option v-for="plant in plants" :key="plant.id" :label="plant.name" :value="plant.id" />
            </el-select>
          </div>
          <div class="form-group">
            <label>部门:</label>
            <el-select v-model="filterDepartmentId" placeholder="全部部门" @change="onFilterChange">
              <el-option :value="0" label="全部部门" />
              <el-option v-for="dept in filteredDepartments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
          </div>
        </div>

        <!-- 排班员工列表 -->
        <div v-if="filteredEmployees.length > 0" class="employee-list-section">
          <div class="section-title">
            📋 排班员工列表 ({{ filteredEmployees.length }}人)
            <span class="page-info" v-if="totalPages > 1">（第 {{ currentPage }}/{{ totalPages }} 页）</span>
          </div>
          <div class="employee-table">
            <el-table ref="employeeTableRef" :data="paginatedEmployees" border style="width: 100%" size="small" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="50" />
              <el-table-column prop="realName" label="姓名" width="100" />
              <el-table-column prop="sapEmployeeId" label="SAP工号" width="100" />
              <el-table-column prop="plantName" label="厂区" width="120" />
              <el-table-column prop="departmentName" label="部门" width="150" />
              <el-table-column prop="shift" label="班次" width="80" />
              <el-table-column prop="durationHours" label="工作时长" width="90">
                <template #default="{ row }">
                  {{ row.durationHours ? Number(row.durationHours).toFixed(1) + 'H' : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="分配的工位" min-width="250">
                <template #default="{ row }">
                  <div class="assigned-workstations">
                    <el-tag
                      v-for="ws in getAssignedWorkstations(row.employeeId)"
                      :key="ws.workstationId"
                      closable
                      @close="unassignEmployee(row.employeeId, ws.workstationId)"
                      type="success"
                      class="ws-tag"
                    >
                      {{ ws.workstationName }}
                    </el-tag>
                    <span v-if="getAssignedWorkstations(row.employeeId).length === 0" class="no-assign">未分配</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="无产出时长" width="100">
                <template #default="{ row }">
                  {{ calculateNoProductionHours(row.employeeId) > 0 ? calculateNoProductionHours(row.employeeId).toFixed(1) + 'H' : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="openAssignDialog(row)">
                    {{ getAssignedWorkstations(row.employeeId).length > 0 ? '改派' : '分配' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页 -->
            <div class="table-pagination" v-if="filteredEmployees.length > 0">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="filteredEmployees.length"
                layout="total, prev, pager, next"
                small
                background
              />
            </div>
          </div>
        </div>

        <div v-else-if="selectedDate" class="empty-state">
          <p>该日期暂无排班员工</p>
        </div>

        <div v-else class="empty-state">
          <p>请选择日期</p>
        </div>
      </div>
    </div>

    <!-- 分配工位弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配工位" width="700px">
      <div class="assign-dialog-content">
        <div class="assign-employee-info">
          <span class="label">员工:</span>
          <span class="value">{{ currentEmployee?.realName }} ({{ currentEmployee?.sapEmployeeId || currentEmployee?.employeeId }})</span>
        </div>
        <div class="assign-employee-info">
          <span class="label">班次:</span>
          <span class="value">{{ currentEmployee?.shift }}班</span>
        </div>

        <div class="workstation-select-section">
          <div class="section-label">选择工位:</div>
          <el-checkbox-group v-model="selectedWorkstationIds">
            <!-- 普通工位 -->
            <div class="workstation-grid">
              <el-checkbox
                v-for="ws in regularWorkstations"
                :key="ws.workstationId"
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox-compact"
              >
                {{ ws.workstationName }}
                <span class="ws-status" :class="ws.workstationStatus">
                  ({{ ws.workstationStatus === 'active' ? '可用' : '停用' }})
                </span>
              </el-checkbox>
            </div>
            <!-- 前台/特殊工时工位 -->
            <div v-for="ws in timeRequiredWorkstations" :key="ws.workstationId" class="time-required-ws">
              <el-checkbox
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox"
              >
                {{ ws.workstationName }}
              </el-checkbox>
              <div class="time-picker-row">
                <span class="time-label">开始:</span>
                <el-time-picker
                  v-model="singleStartTime"
                  format="HH:mm"
                  value-format="HH:mm:ss"
                  placeholder="选择"
                  style="width: 100px"
                  size="small"
                />
                <span class="time-label">结束:</span>
                <el-time-picker
                  v-model="singleEndTime"
                  format="HH:mm"
                  value-format="HH:mm:ss"
                  placeholder="选择"
                  style="width: 100px"
                  size="small"
                />
                <template v-if="ws.workstationName && ws.workstationName.trim().includes('特殊工时')">
                  <span class="time-label">原因:</span>
                  <el-input
                    v-model="singleReason"
                    placeholder="请填写原因"
                    style="width: 120px"
                    size="small"
                  />
                </template>
              </div>
            </div>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配弹窗 -->
    <el-dialog v-model="batchAssignDialogVisible" title="批量分配工位" width="800px">
      <div class="assign-dialog-content">
        <div class="employee-select-section">
          <div class="section-label">选择员工 ({{ selectedEmployeesForBatch.length }}人):</div>
          <el-checkbox-group v-model="selectedEmployeeIdsForBatch">
            <div class="employee-options">
              <el-checkbox
                v-for="emp in filteredEmployees"
                :key="emp.employeeId"
                :value="emp.employeeId"
                class="employee-checkbox"
              >
                {{ emp.realName }}
                <span class="emp-sap">({{ emp.sapEmployeeId || '-' }})</span>
                <span class="emp-shift">{{ emp.shift }}班</span>
                <span v-if="getAssignedWorkstations(emp.employeeId).length > 0" class="emp-assigned">
                  已分配
                </span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>

        <div class="workstation-select-section">
          <div class="section-label">分配到工位:</div>

          <!-- 普通工位 - 网格布局 -->
          <el-checkbox-group v-model="batchSelectedWorkstationIds">
            <div class="workstation-grid">
              <el-checkbox
                v-for="ws in regularWorkstations"
                :key="ws.workstationId"
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox-compact"
              >
                {{ ws.workstationName }}
                <span class="ws-count" v-if="ws.employees.length > 0">
                  ({{ ws.employees.length }})
                </span>
              </el-checkbox>
            </div>
          </el-checkbox-group>

          <!-- 前台/特殊工时工位 - 带时间选择 -->
          <div v-for="ws in timeRequiredWorkstations" :key="ws.workstationId" class="time-required-ws">
            <el-checkbox
              v-model="batchSelectedWorkstationIds"
              :value="ws.workstationId"
              :disabled="ws.workstationStatus !== 'active'"
            >
              {{ ws.workstationName }}
              <span class="ws-count" v-if="ws.employees.length > 0">
                ({{ ws.employees.length }})
              </span>
            </el-checkbox>
            <div class="time-picker-row">
              <span class="time-label">开始:</span>
              <el-time-picker
                v-model="batchStartTime"
                format="HH:mm"
                value-format="HH:mm:ss"
                placeholder="选择"
                style="width: 100px"
                size="small"
              />
              <span class="time-label">结束:</span>
              <el-time-picker
                v-model="batchEndTime"
                format="HH:mm"
                value-format="HH:mm:ss"
                placeholder="选择"
                style="width: 100px"
                size="small"
              />
              <!-- 特殊工时需要填写原因 -->
              <template v-if="ws.workstationName && ws.workstationName.trim().includes('特殊工时')">
                <span class="time-label">原因:</span>
                <el-input
                  v-model="batchReason"
                  type="textarea"
                  :rows="1"
                  placeholder="请填写原因"
                  style="width: 150px"
                  size="small"
                  resize="none"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchAssign">确定分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { addSpecialWorkingHours, deleteSpecialWorkingHoursByCondition } from '@/api/specialWorkingHours';
import eventBus from '@/utils/eventBus';

interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId?: number;
}

interface ScheduledEmployee {
  employeeId: number;
  realName: string;
  sapEmployeeId?: string;
  shift: string;
  plantId?: number;
  plantName?: string;
  departmentId?: number;
  departmentName?: string;
  employeeType?: string;
  durationHours?: number;
  position?: string;
}

interface AssignedEmployee {
  arrangementId: number;
  employeeId: number;
  employeeName: string;
  sapEmployeeId?: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

interface WorkstationWithEmployees {
  workstationId: number;
  workstationName: string;
  workstationStatus: string;
  employees: AssignedEmployee[];
}

// 选择条件
const selectedDate = ref<string>(dayjs().format('YYYY-MM-DD'));
const filterShift = ref<string[]>([]);
const filterPlantId = ref(0);
const filterDepartmentId = ref(0);

// 数据
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const filteredDepartments = ref<Department[]>([]);
const scheduledEmployees = ref<ScheduledEmployee[]>([]);
const workstations = ref<WorkstationWithEmployees[]>([]);

// 分配弹窗
const assignDialogVisible = ref(false);
const currentEmployee = ref<ScheduledEmployee | null>(null);
const selectedWorkstationIds = ref<number[]>([]);

// 表格中选中的员工
const tableSelectedEmployees = ref<ScheduledEmployee[]>([]);
const employeeTableRef = ref();

// 批量分配弹窗
const batchAssignDialogVisible = ref(false);
const selectedEmployeeIdsForBatch = ref<number[]>([]);
const batchSelectedWorkstationIds = ref<number[]>([]);
const batchStartTime = ref<string>('');
const batchEndTime = ref<string>('');

// 单个分配弹窗
const singleStartTime = ref<string>('');
const singleEndTime = ref<string>('');

// 特殊工时原因
const singleReason = ref<string>('');
const batchReason = ref<string>('');

// 判断是否为需要时间的工位（前台或特殊工时）
const isTimeRequiredWorkstation = (workstationName: string): boolean => {
  const name = workstationName?.trim() || '';
  return name.includes('前台') || name.includes('特殊工时');
};

// 根据员工职位获取默认工位ID
const getDefaultWorkstationIdByPosition = (position?: string): number | null => {
  if (!position) return null;
  const pos = position.trim();

  // 职位与工位名称匹配映射
  const positionWorkstationMap: Record<string, string[]> = {
    'Cycle Count': ['Cycle Count'],
    'Spare part': ['Spare part'],
    'MRB': ['MRB'],
    'MRO': ['MRO'],
  };

  const targetNames = positionWorkstationMap[pos];
  if (!targetNames) return null;

  // 查找匹配的工位
  const matchedWorkstation = workstations.value.find(ws =>
    targetNames.some(name => ws.workstationName.trim() === name)
  );

  return matchedWorkstation?.workstationId || null;
};

// 根据职位自动分配工位
const autoAssignByPosition = async () => {
  if (workstations.value.length === 0 || scheduledEmployees.value.length === 0) return;

  const specialPositions = ['Cycle Count', 'Spare part', 'MRB', 'MRO'];

  for (const employee of scheduledEmployees.value) {
    // 检查员工是否有特殊职位
    if (!employee.position || !specialPositions.includes(employee.position)) continue;

    // 检查是否已分配
    const alreadyAssigned = workstations.value.some(ws =>
      ws.employees.some(e => e.employeeId === employee.employeeId)
    );
    if (alreadyAssigned) continue;

    // 获取对应的工位ID
    const defaultWsId = getDefaultWorkstationIdByPosition(employee.position);
    if (!defaultWsId) continue;

    // 查找工位
    const ws = workstations.value.find(w => w.workstationId === defaultWsId);
    if (!ws) continue;

    try {
      // 调用API分配
      await request.post('/workstations/arrangements', {
        workstationId: defaultWsId,
        arrangementDate: selectedDate.value,
        shiftName: '',
        employeeIds: [employee.employeeId],
      });

      // 更新本地数据
      ws.employees.push({
        arrangementId: 0,
        employeeId: employee.employeeId,
        employeeName: employee.realName,
        sapEmployeeId: employee.sapEmployeeId,
        startTime: null,
        endTime: null,
        reason: null,
      });

    } catch (err) {
      console.error('自动分配失败:', employee.realName, err);
    }
  }
};

// 根据选中的员工ID获取员工对象
const selectedEmployeesForBatch = computed(() => {
  return filteredEmployees.value.filter(e => selectedEmployeeIdsForBatch.value.includes(e.employeeId));
});

// 普通工位（不需要时间）
const regularWorkstations = computed(() => {
  return workstations.value.filter(w => !isTimeRequiredWorkstation(w.workstationName));
});

// 需要时间的工位（前台、特殊工时）
const timeRequiredWorkstations = computed(() => {
  return workstations.value.filter(w => isTimeRequiredWorkstation(w.workstationName));
});

// 状态
const loading = ref(false);

// 班次选项
const shiftOptions = [
  { value: 'A', label: 'A班' },
  { value: 'B', label: 'B班' },
  { value: 'C', label: 'C班' },
  { value: 'N', label: 'N班' },
  { value: 'A+', label: 'A+班' },
  { value: 'B+', label: 'B+班' },
  { value: 'C+', label: 'C+班' },
  { value: 'N+', label: 'N+班' },
  { value: 'A2', label: 'A2班' },
];

// 计算无产出时长（前台/特殊工时工位的开始时间到结束时间）
const calculateNoProductionHours = (employeeId: number): number => {
  let totalHours = 0;

  // 获取该员工分配到的所有前台或特殊工时工位
  const timeRequiredWsList = workstations.value.filter(w => isTimeRequiredWorkstation(w.workstationName));

  for (const timeRequiredWs of timeRequiredWsList) {
    const wsAssignment = timeRequiredWs.employees.find(e => e.employeeId === employeeId);
    if (wsAssignment && wsAssignment.startTime && wsAssignment.endTime) {
      // 计算开始和结束时间差（小时）
      const startParts = wsAssignment.startTime.split(':');
      const endParts = wsAssignment.endTime.split(':');
      const startHour = startParts[0] ? parseFloat(startParts[0]) : 0;
      const startMin = startParts[1] ? parseFloat(startParts[1]) : 0;
      const endHour = endParts[0] ? parseFloat(endParts[0]) : 0;
      const endMin = endParts[1] ? parseFloat(endParts[1]) : 0;
      const startHours = startHour + startMin / 60;
      const endHours = endHour + endMin / 60;

      // 无产出时长 = 结束时间 - 开始时间
      const hours = Math.max(0, endHours - startHours);
      totalHours += hours;
    }
  }

  return totalHours;
};

// 根据班次筛选员工
const filteredEmployees = computed(() => {
  if (!filterShift.value || filterShift.value.length === 0) return scheduledEmployees.value;
  return scheduledEmployees.value.filter(e => filterShift.value.includes(e.shift));
});

// 分页相关
const currentPage = ref(1);
const pageSize = ref(20);

// 分页后的员工列表
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredEmployees.value.slice(start, end);
});

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredEmployees.value.length / pageSize.value);
});

// 获取厂区列表
const fetchPlants = async () => {
  try {
    const data = await request.get('/plants');
    plants.value = data?.plants || [];
  } catch (error) {
    console.error('获取厂区列表失败:', error);
  }
};

// 获取部门列表
const fetchDepartments = async () => {
  try {
    const data = await request.get('/departments');
    departments.value = data?.departments || [];
    filteredDepartments.value = departments.value;
  } catch (error) {
    console.error('获取部门列表失败:', error);
  }
};

// 获取排班表中的员工
const fetchScheduledEmployees = async () => {
  try {
    if (!selectedDate.value) {
      scheduledEmployees.value = [];
      return;
    }

    const res = await request.get('/schedule/by-date', {
      params: { scheduleDate: selectedDate.value }
    });

    let scheduleData = res;
    if (res && typeof res === 'object' && 'data' in res) {
      scheduleData = (res as any).data;
    }
    const scheduleList = Array.isArray(scheduleData?.list) ? scheduleData.list :
                         Array.isArray(scheduleData) ? scheduleData : [];

    // 过滤掉请假/调休/离职/年假状态的员工，排除Jabil员工类型
    scheduledEmployees.value = scheduleList
      .filter((s: any) => !['请假', '调休', '离职', '年假'].includes(s.shift))
      .filter((s: any) => s.employee_type !== 'Jabil')
      .map((s: any) => ({
        employeeId: s.employee_id,
        realName: s.real_name || `员工${s.employee_id}`,
        sapEmployeeId: s.sap_employee_id || '-',
        shift: s.shift,
        plantId: s.plant_id,
        plantName: s.plant_name || '',
        departmentId: s.department_id,
        departmentName: s.department_name || '',
        employeeType: s.employee_type,
        durationHours: s.duration_hours || 0,
        position: s.position || '',
      }));

  } catch (error) {
    console.error('获取排班数据失败:', error);
    scheduledEmployees.value = [];
  }
};

// 获取工位及其当日安排
const fetchWorkstationsWithArrangements = async () => {
  if (!selectedDate.value) {
    return;
  }

  loading.value = true;
  try {
    const params: Record<string, any> = {
      arrangementDate: selectedDate.value,
    };
    if (filterPlantId.value !== 0) params.plantId = filterPlantId.value;
    if (filterDepartmentId.value !== 0) params.departmentId = filterDepartmentId.value;

    const res = await request.get('/workstations/arrangements/by-date-shift', { params });
    let wsData = res;
    if (res && typeof res === 'object' && 'data' in res) {
      wsData = (res as any).data;
    }
    workstations.value = Array.isArray(wsData) ? wsData : [];
  } catch (error) {
    ElMessage.error({ message: '获取工位安排失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

// 获取员工已分配的工位
const getAssignedWorkstations = (employeeId: number) => {
  const assigned: WorkstationWithEmployees[] = [];
  workstations.value.forEach(ws => {
    if (ws.employees.some(e => e.employeeId === employeeId)) {
      assigned.push(ws);
    }
  });
  return assigned;
};

// 获取厂区名称
const getPlantName = (plantId?: number) => {
  if (!plantId) return '-';
  const plant = plants.value.find(p => p.id === plantId);
  return plant?.name || '-';
};

// 获取部门名称
const getDepartmentName = (departmentId?: number) => {
  if (!departmentId) return '-';
  const dept = departments.value.find(d => d.id === departmentId);
  return dept?.name || '-';
};

// 打开分配弹窗
const openAssignDialog = (employee: ScheduledEmployee) => {
  currentEmployee.value = employee;
  // 回显已分配的工位
  const assignedWsIds = getAssignedWorkstations(employee.employeeId).map(ws => ws.workstationId);


  // 如果没有已分配的工位，根据职位自动选中默认工位
  if (assignedWsIds.length === 0) {
    const defaultWsId = getDefaultWorkstationIdByPosition(employee.position);
    if (defaultWsId) {
      assignedWsIds.push(defaultWsId);
    }
  }

  selectedWorkstationIds.value = assignedWsIds;
  // 清空时间选择器
  singleStartTime.value = '';
  singleEndTime.value = '';
  singleReason.value = '';
  assignDialogVisible.value = true;
};

// 确认分配
const confirmAssign = async () => {
  if (!currentEmployee.value) return;

  const employeeId = currentEmployee.value.employeeId;
  const newWsIds = new Set(selectedWorkstationIds.value);

  // 获取当前分配状态
  const currentWsIds = new Set(
    workstations.value
      .filter(ws => ws.employees.some(e => e.employeeId === employeeId))
      .map(ws => ws.workstationId)
  );

  // 计算需要添加和移除的工位
  const toAdd = [...newWsIds].filter(id => !currentWsIds.has(id));
  const toRemove = [...currentWsIds].filter(id => !newWsIds.has(id));

  try {
    // 移除分配
    for (const wsId of toRemove) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws) {
        const removedEmp = ws.employees.find(e => e.employeeId === employeeId);
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');

        ws.employees = ws.employees.filter(e => e.employeeId !== employeeId);
        await request.delete('/workstations/arrangements', {
          data: {
            workstationId: wsId,
            arrangementDate: selectedDate.value,
            employeeId: employeeId,
          }
        });

        // 如果是特殊工时工位，同步删除特殊工时记录
        if (isSpecialHours && removedEmp && removedEmp.reason) {
          try {
            await deleteSpecialWorkingHoursByCondition(
              removedEmp.employeeName,
              selectedDate.value,
              removedEmp.reason
            );
          } catch (deleteError) {
            console.error('删除特殊工时记录失败:', deleteError);
          }
        }
      }
    }

    // 添加分配
    for (const wsId of toAdd) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws && !ws.employees.some(e => e.employeeId === employeeId)) {
        // 如果是需要时间的工位（前台或特殊工时），需要传递开始和结束时间
        const isTimeRequired = isTimeRequiredWorkstation(ws.workstationName);
        if (isTimeRequired && (!singleStartTime.value || !singleEndTime.value)) {
          ElMessage.warning({ message: '选择该工位时必须填写开始和结束时间', showClose: true, duration: 3000 });
          return;
        }
        // 特殊工时必须填写原因
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');
        if (isSpecialHours && !singleReason.value.trim()) {
          ElMessage.warning({ message: '选择特殊工时工位时必须填写原因', showClose: true, duration: 3000 });
          return;
        }
        const startTime = isTimeRequired ? singleStartTime.value : undefined;
        const endTime = isTimeRequired ? singleEndTime.value : undefined;
        const reason = isSpecialHours ? singleReason.value : undefined;

        ws.employees.push({
          arrangementId: 0,
          employeeId: employeeId,
          employeeName: currentEmployee.value!.realName,
          sapEmployeeId: currentEmployee.value!.sapEmployeeId,
          startTime: startTime || null,
          endTime: endTime || null,
          reason: reason || null,
        });
        await request.post('/workstations/arrangements', {
          workstationId: wsId,
          arrangementDate: selectedDate.value,
          shiftName: '',
          employeeIds: [employeeId],
          startTime: startTime,
          endTime: endTime,
          reason: reason,
        });

        // 如果是特殊工时工位，同时添加到特殊工时表
        if (isSpecialHours && startTime && endTime) {
          await addSpecialWorkingHours({
            date: selectedDate.value,
            event: reason,
            employeeNames: [currentEmployee.value!.realName],
            startTime: startTime.substring(0, 5), // 格式化为 HH:mm
            endTime: endTime.substring(0, 5),
          });
        }
      }
    }

    assignDialogVisible.value = false;
    singleStartTime.value = '';
    singleEndTime.value = '';
    singleReason.value = '';
    ElMessage.success({ message: '分配成功', showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    ElMessage.error({ message: '分配失败', showClose: true, duration: 3000 });
    // 重新加载数据
    fetchWorkstationsWithArrangements();
  }
};

// 打开批量分配弹窗（使用表格选中的员工）
const openBatchAssignDialog = () => {
  if (tableSelectedEmployees.value.length === 0) {
    ElMessage.warning({ message: '请先在表格中选择员工', showClose: true, duration: 3000 });
    return;
  }
  selectedEmployeeIdsForBatch.value = tableSelectedEmployees.value.map(e => e.employeeId);
  batchSelectedWorkstationIds.value = [];
  batchStartTime.value = ''; // 清空起始时间
  batchEndTime.value = ''; // 清空结束时间
  batchReason.value = ''; // 清空原因
  batchAssignDialogVisible.value = true;
};

// 确认批量分配
const confirmBatchAssign = async () => {
  if (selectedEmployeeIdsForBatch.value.length === 0 || batchSelectedWorkstationIds.value.length === 0) {
    ElMessage.warning({ message: '请选择员工和工位', showClose: true, duration: 3000 });
    return;
  }

  // 检查是否选择了需要时间的工位（前台或特殊工时），如果是则必须填写开始和结束时间
  const timeRequiredWs = workstations.value.find(w => isTimeRequiredWorkstation(w.workstationName) && batchSelectedWorkstationIds.value.includes(w.workstationId));
  if (timeRequiredWs && (!batchStartTime.value || !batchEndTime.value)) {
    ElMessage.warning({ message: '选择该工位时必须填写开始和结束时间', showClose: true, duration: 3000 });
    return;
  }

  // 检查是否选择了特殊工时工位，如果是则必须填写原因
  const specialHoursWs = workstations.value.find(w => w.workstationName && w.workstationName.trim().includes('特殊工时') && batchSelectedWorkstationIds.value.includes(w.workstationId));
  if (specialHoursWs && !batchReason.value.trim()) {
    ElMessage.warning({ message: '选择特殊工时工位时必须填写原因', showClose: true, duration: 3000 });
    return;
  }

  const selectedWsIds = new Set(batchSelectedWorkstationIds.value);
  let successCount = 0;

  try {
    for (const wsId of selectedWsIds) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws) {
        const employeeIds = selectedEmployeesForBatch.value.map(e => e.employeeId);
        // 如果是需要时间的工位（前台或特殊工时），需要传递开始和结束时间
        const isTimeRequired = isTimeRequiredWorkstation(ws.workstationName);
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');
        const startTime = isTimeRequired ? batchStartTime.value : undefined;
        const endTime = isTimeRequired ? batchEndTime.value : undefined;
        const reason = isSpecialHours ? batchReason.value : undefined;

        await request.post('/workstations/arrangements', {
          workstationId: wsId,
          arrangementDate: selectedDate.value,
          shiftName: '',
          employeeIds: employeeIds,
          startTime: startTime,
          endTime: endTime,
          reason: reason,
        });

        // 更新前端数据
        selectedEmployeesForBatch.value.forEach(employee => {
          if (!ws.employees.some(e => e.employeeId === employee.employeeId)) {
            ws.employees.push({
              arrangementId: 0,
              employeeId: employee.employeeId,
              employeeName: employee.realName,
              sapEmployeeId: employee.sapEmployeeId,
              startTime: startTime || null,
              endTime: endTime || null,
              reason: reason || null,
            });
          }
        });
        successCount++;

        // 如果是特殊工时工位，同时添加到特殊工时表
        if (isSpecialHours && startTime && endTime) {
          const employeeNames = selectedEmployeesForBatch.value.map(e => e.realName);
          await addSpecialWorkingHours({
            date: selectedDate.value,
            event: reason,
            employeeNames: employeeNames,
            startTime: startTime.substring(0, 5),
            endTime: endTime.substring(0, 5),
          });
        }
      }
    }

    batchAssignDialogVisible.value = false;
    batchStartTime.value = '';
    batchEndTime.value = '';
    batchReason.value = '';
    ElMessage.success({ message: `已分配 ${selectedEmployeesForBatch.value.length} 名员工到 ${successCount} 个工位`, showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    ElMessage.error({ message: '分配失败', showClose: true, duration: 3000 });
    fetchWorkstationsWithArrangements();
  }
};

// 移除员工的工位分配
const unassignEmployee = async (employeeId: number, workstationId: number) => {
  const ws = workstations.value.find(w => w.workstationId === workstationId);
  if (!ws) return;

  // 保存当前员工数据用于回滚
  const removedEmployee = ws.employees.find(e => e.employeeId === employeeId);
  const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');

  try {
    // 先从本地移除（乐观更新）
    ws.employees = ws.employees.filter(e => e.employeeId !== employeeId);

    await request.delete('/workstations/arrangements', {
      data: {
        workstationId: workstationId,
        arrangementDate: selectedDate.value,
        employeeId: employeeId,
      }
    });

    // 如果是特殊工时工位，同步删除特殊工时记录
    if (isSpecialHours && removedEmployee && removedEmployee.reason) {
      try {
        await deleteSpecialWorkingHoursByCondition(
          removedEmployee.employeeName,
          selectedDate.value,
          removedEmployee.reason
        );
      } catch (deleteError) {
        console.error('删除特殊工时记录失败:', deleteError);
        // 不影响主流程，只记录错误
      }
    }

    ElMessage.success({ message: '已取消分配', showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    // 失败时回滚本地数据
    if (removedEmployee) {
      ws.employees.push(removedEmployee);
    }
    ElMessage.error({ message: '取消分配失败', showClose: true, duration: 3000 });
  }
};

// 重置
const resetSelection = () => {
  tableSelectedEmployees.value = [];
  employeeTableRef.value?.clearSelection();
  fetchWorkstationsWithArrangements();
};

// 表格选择变化
const handleSelectionChange = (rows: ScheduledEmployee[]) => {
  tableSelectedEmployees.value = rows;
};

// 筛选变化
const onFilterChange = () => {
  currentPage.value = 1; // 重置页码
  fetchWorkstationsWithArrangements();
};

// 日期变化
const onDateChange = () => {
  currentPage.value = 1; // 重置页码
  fetchScheduledEmployees();
  fetchWorkstationsWithArrangements();
};

onMounted(async () => {
  await Promise.all([
    fetchPlants(),
    fetchDepartments(),
    fetchScheduledEmployees(),
    fetchWorkstationsWithArrangements(),
  ]);
  // 自动为特殊职位员工分配工位
  await autoAssignByPosition();

  // 监听特殊工时变化，刷新数据
  eventBus.on('special-working-hours-changed', () => {
    fetchWorkstationsWithArrangements();
  });
});
</script>

<style scoped>
.station-arrangement-container {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 8px 0 16px 0;
  margin-bottom: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.table-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #F3F4F6;
}

.table-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #3B82F6;
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: #2563EB;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.card-body {
  padding: 24px;
}

.selection-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background-color: #F9FAFB;
  border-radius: 12px;
}

.selection-bar .form-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.selection-bar .form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.selection-bar .form-group :deep(.el-select) {
  width: 180px;
}

.employee-list-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-info {
  font-size: 12px;
  font-weight: 400;
  color: #6B7280;
}

.employee-table {
  border-radius: 8px;
  overflow: hidden;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding: 8px 0;
}

.table-pagination :deep(.el-pagination) {
  font-weight: 400;
}

.assigned-workstations {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.ws-tag {
  margin: 2px;
}

.no-assign {
  color: #9CA3AF;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
  font-size: 15px;
}

/* 分配弹窗样式 */
.assign-dialog-content {
  padding: 10px 0;
  max-height: 500px;
  overflow-y: auto;
}

.assign-employee-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
}

.assign-employee-info .label {
  color: #6B7280;
}

.assign-employee-info .value {
  color: #111827;
  font-weight: 500;
}

.employee-select-section {
  margin-bottom: 20px;
}

.employee-select-section .section-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.employee-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background-color: #F9FAFB;
  border-radius: 8px;
}

.employee-checkbox {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
  font-size: 13px;
}

.employee-checkbox:hover {
  background-color: #F3F4F6;
}

.emp-sap {
  margin-left: 6px;
  color: #6B7280;
  font-size: 12px;
}

.emp-shift {
  margin-left: 6px;
  color: #3B82F6;
  font-size: 12px;
}

.emp-assigned {
  margin-left: 6px;
  color: #10B981;
  font-size: 12px;
}

.workstation-select-section {
  margin-top: 20px;
}

.workstation-select-section .section-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.start-time-section {
  margin-top: 16px;
  padding: 12px;
  background-color: #FEF3C7;
  border-radius: 6px;
  border: 1px solid #FCD34D;
}

/* 工位网格布局 */
.workstation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.workstation-checkbox-compact {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
  margin-bottom: 0;
  transition: all 0.2s;
}

.workstation-checkbox-compact:hover {
  background-color: #F3F4F6;
  border-color: #3B82F6;
}

/* 前台/特殊工时工位样式 */
.time-required-ws {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #FEF3C7;
  border-radius: 8px;
  border: 1px solid #FCD34D;
}

.time-required-ws .el-checkbox {
  margin-bottom: 8px;
}

.time-picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-left: 24px;
}

.time-picker-row .time-label {
  font-size: 12px;
  color: #92400E;
  white-space: nowrap;
}

.ws-count {
  font-size: 11px;
  color: #9CA3AF;
}

/* 旧样式保留兼容性 */
.workstation-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.workstation-item {
  display: flex;
  flex-direction: column;
}

.front-desk-time-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 24px;
  margin-top: 2px;
  margin-bottom: 2px;
  padding: 4px 8px;
  background-color: #FEF3C7;
  border-radius: 4px;
  border: 1px solid #FCD34D;
  flex-wrap: wrap;
}

.front-desk-time-picker .time-label {
  font-size: 12px;
  color: #92400E;
  white-space: nowrap;
  margin-right: 2px;
}

.front-desk-time-picker .reason-input {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.front-desk-time-picker .reason-input .time-label {
  margin-top: 0;
}

.workstation-checkbox {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
}

.workstation-checkbox:hover {
  background-color: #F9FAFB;
}

.ws-count {
  margin-left: 4px;
  color: #9CA3AF;
  font-size: 11px;
}

.section-title {
  display: flex;
  align-items: center;
}
</style>
