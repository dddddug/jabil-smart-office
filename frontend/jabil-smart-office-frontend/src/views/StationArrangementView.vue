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
        <div class="table-card-title">🏭 工位管理</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddStationDialog">➕ 新增工位</button>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>工位名称</th>
              <th>所属区域</th>
              <th>状态</th>
              <th>分配员工</th>
              <th>分配时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="station in stations" :key="station.id" @click="selectStation(station)" :class="{ 'selected': selectedStation && selectedStation.id === station.id }">
              <td>{{ station.id }}</td>
              <td>{{ station.name }}</td>
              <td>{{ station.area }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(station.status)">{{ station.status }}</span>
              </td>
              <td>{{ station.assignedEmployee || '-' }}</td>
              <td>{{ station.assignmentTime || '-' }}</td>
              <td>
                <div class="table-actions">
                  <button class="action-btn edit" @click.stop="openEditStationDialog">编辑</button>
                  <button v-if="station.status === '可用'" class="action-btn edit" @click.stop="openAssignEmployeeDialog">分配</button>
                  <button v-if="station.assignedEmployee" class="action-btn delete" @click.stop="unassignEmployee">解除</button>
                  <button class="action-btn delete" @click.stop="deleteStation">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="pagination-info">显示 1-{{ stations.length }} 条，共 {{ stations.length }} 条</div>
      </div>
    </div>

    <!-- Add/Edit Station Dialog -->
    <div v-if="isStationDialogOpen" class="dialog-overlay">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑工位' : '新增工位' }}</h3>
          <button class="dialog-close" @click="closeStationDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveStation">
            <div class="form-group">
              <label for="stationName">工位名称:</label>
              <input type="text" id="stationName" v-model="currentStation.name" required />
            </div>
            <div class="form-group">
              <label for="area">所属区域:</label>
              <input type="text" id="area" v-model="currentStation.area" required />
            </div>
            <div class="form-group">
              <label for="status">状态:</label>
              <select id="status" v-model="currentStation.status">
                <option value="可用">可用</option>
                <option value="占用">占用</option>
                <option value="维护">维护</option>
              </select>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeStationDialog">取消</button>
          <button type="button" class="btn btn-primary" @click="saveStation">保存</button>
        </div>
      </div>
    </div>

    <!-- Assign Employee Dialog -->
    <div v-if="isAssignEmployeeDialogOpen" class="dialog-overlay">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>分配员工到工位: {{ selectedStation?.name }}</h3>
          <button class="dialog-close" @click="closeAssignEmployeeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="assignEmployee">
            <div class="form-group">
              <label for="assignEmployee">选择员工:</label>
              <select id="assignEmployee" v-model="selectedEmployeeForAssignmentId" required>
                <option value="">请选择员工</option>
                <option v-for="emp in availableEmployees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
              </select>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeAssignEmployeeDialog">取消</button>
          <button type="button" class="btn btn-primary" @click="assignEmployee">分配</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import { ElMessage, ElMessageBox } from 'element-plus';

interface Station {
  id: number;
  name: string;
  area: string;
  status: '可用' | '占用' | '维护';
  assignedEmployee?: string;
  assignedEmployeeId?: number;
  assignmentTime?: string;
}

interface Employee {
  id: number;
  name: string;
}

const availableEmployees: Employee[] = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 3, name: '王五' },
];

const stations = ref<Station[]>([
  { id: 1, name: 'A01', area: '生产线1', status: '占用', assignedEmployee: '张三', assignedEmployeeId: 1, assignmentTime: '2024-06-28' },
  { id: 2, name: 'A02', area: '生产线1', status: '可用' },
  { id: 3, name: 'B01', area: '测试区', status: '维护' },
]);

const selectedStation = ref<Station | null>(null);
const isStationDialogOpen = ref(false);
const isEditMode = ref(false);
const currentStation = ref<Station>({ id: 0, name: '', area: '', status: '可用' });

const isAssignEmployeeDialogOpen = ref(false);
const selectedEmployeeForAssignmentId = ref<number | null>(null);

const selectStation = (station: Station) => {
  selectedStation.value = station;
};

const openAddStationDialog = () => {
  isEditMode.value = false;
  currentStation.value = { id: 0, name: '', area: '', status: '可用' };
  isStationDialogOpen.value = true;
};

const openEditStationDialog = () => {
  if (selectedStation.value) {
    isEditMode.value = true;
    currentStation.value = { ...selectedStation.value };
    isStationDialogOpen.value = true;
  }
};

const saveStation = () => {
  if (isEditMode.value) {
    const index = stations.value.findIndex(s => s.id === currentStation.value.id);
    if (index !== -1) {
      stations.value[index] = { ...currentStation.value };
    }
  } else {
    currentStation.value.id = stations.value.length ? Math.max(...stations.value.map(s => s.id)) + 1 : 1;
    stations.value.push({ ...currentStation.value });
  }
  closeStationDialog();
};

const deleteStation = () => {
  if (selectedStation.value) {
    ElMessageBox.confirm(
      `确定要删除工位 "${selectedStation.value.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        stations.value = stations.value.filter(s => s.id !== selectedStation.value!.id);
        selectedStation.value = null;
        ElMessage.success('工位删除成功！');
      })
      .catch(() => {
        ElMessage.info('已取消删除');
      });
  }
};

const closeStationDialog = () => {
  isStationDialogOpen.value = false;
  currentStation.value = { id: 0, name: '', area: '', status: '可用' };
};

const openAssignEmployeeDialog = () => {
  if (selectedStation.value) {
    selectedEmployeeForAssignmentId.value = selectedStation.value.assignedEmployeeId || null;
    isAssignEmployeeDialogOpen.value = true;
  }
};

const assignEmployee = () => {
  if (selectedStation.value && selectedEmployeeForAssignmentId.value) {
    const employee = availableEmployees.find(emp => emp.id === selectedEmployeeForAssignmentId.value);
    if (employee) {
      selectedStation.value.assignedEmployee = employee.name;
      selectedStation.value.assignedEmployeeId = employee.id;
      selectedStation.value.assignmentTime = dayjs().format('YYYY-MM-DD HH:mm');
      selectedStation.value.status = '占用';
    }
  }
  closeAssignEmployeeDialog();
};

const unassignEmployee = () => {
  if (selectedStation.value) {
    ElMessageBox.confirm(
      `确定要解除 "${selectedStation.value.assignedEmployee}" 在工位 "${selectedStation.value.name}" 的分配吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        selectedStation.value!.assignedEmployee = undefined;
        selectedStation.value!.assignedEmployeeId = undefined;
        selectedStation.value!.assignmentTime = undefined;
        selectedStation.value!.status = '可用';
        selectedStation.value = null;
        ElMessage.success('员工分配已解除！');
      })
      .catch(() => {
        ElMessage.info('已取消解除分配');
      });
  }
};

const closeAssignEmployeeDialog = () => {
  isAssignEmployeeDialogOpen.value = false;
  selectedEmployeeForAssignmentId.value = null;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case '可用':
      return 'status-green';
    case '占用':
      return 'status-blue';
    case '维护':
      return 'status-gray';
    default:
      return '';
  }
};
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
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  box-shadow: 0 6px 16px rgba(0, 102, 204, 0.4);
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

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #F9FAFB;
}

.data-table th {
  padding: 16px 24px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #F3F4F6;
}

.data-table td {
  padding: 16px 24px;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #F3F4F6;
}

.data-table tbody tr {
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.data-table tbody tr.selected {
  background-color: #EFF6FF;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-green {
  background: #E8F5E9;
  color: #10B981;
}

.status-blue {
  background: #E3F2FD;
  color: #0066CC;
}

.status-gray {
  background: #F3F4F6;
  color: #6B7280;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background-color: #E3F2FD;
  color: #0066CC;
}

.action-btn.edit:hover {
  background-color: #BBDEFB;
}

.action-btn.delete {
  background-color: #FEE2E2;
  color: #EF4444;
}

.action-btn.delete:hover {
  background-color: #FECACA;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #F3F4F6;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: #FFFFFF;
  color: #111827;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 500px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.dialog-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6B7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: #F3F4F6;
  color: #111827;
}

.dialog-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group select:focus {
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
}

.dialog-actions .btn {
  padding: 10px 24px;
}
</style>