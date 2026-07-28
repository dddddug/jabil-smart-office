<template>
  <div class="workstation-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">工位配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🏭 工位配置</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddDialog">➕ 新增工位</button>
        </div>
      </div>

      <div class="card-body">
        <!-- 筛选区域 -->
        <div class="filter-area">
          <div class="form-group">
            <label>厂区:</label>
            <select v-model="filterPlantId" @change="onPlantChange">
              <option :value="0">全部厂区</option>
              <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>部门:</label>
            <select v-model="filterDepartmentId">
              <option :value="0">全部部门</option>
              <option v-for="dept in filteredDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>状态:</label>
            <select v-model="filterStatus">
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <button class="btn btn-primary" @click="fetchWorkstations">查询</button>
        </div>

        <div class="table-container">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>工位名称</th>
                <th>厂区</th>
                <th>部门</th>
                <th>状态</th>
                <th>描述</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ws, index) in workstations" :key="ws.id" @click="selectWorkstation(ws)" :class="{ 'selected': selectedWorkstation && selectedWorkstation.id === ws.id }">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ ws.name }}</td>
                <td>{{ ws.plantName || '-' }}</td>
                <td>{{ ws.departmentName || '-' }}</td>
                <td>
                  <span class="status-badge" :class="ws.status === 'active' ? 'success' : 'danger'">
                    {{ ws.status === 'active' ? '启用' : '停用' }}
                  </span>
                </td>
                <td>{{ ws.description || '-' }}</td>
                <td>{{ ws.createdAt }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click.stop="openEditDialog(ws)">编辑</button>
                    <button class="action-btn secondary" @click.stop="toggleStatus(ws)">
                      {{ ws.status === 'active' ? '停用' : '启用' }}
                    </button>
                    <button class="action-btn delete" @click.stop="deleteWorkstation(ws)">删除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="workstations.length === 0">
                <td colspan="8" class="empty-cell">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <span class="pagination-info">共 {{ total }} 条</span>
          <div class="pagination-controls">
            <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="currentPage >= totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑工位' : '新增工位' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveWorkstation">
            <div class="form-group">
              <label>工位名称 *</label>
              <input type="text" v-model="currentWorkstation.name" placeholder="如: A01工位" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>厂区</label>
                <select v-model="currentWorkstation.plantId">
                  <option :value="null">不指定</option>
                  <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>部门</label>
                <select v-model="currentWorkstation.departmentId">
                  <option :value="null">不指定</option>
                  <option v-for="dept in dialogDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentWorkstation.description" rows="3" placeholder="工位描述信息"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="saveWorkstation">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { clearRequestCache } from '@/utils/request';

interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface Workstation {
  id: number;
  name: string;
  plantId: number | null;
  plantName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  status: 'active' | 'inactive';
  description: string;
  createdAt: string;
  updatedAt: string | null;
}

interface WorkstationListResponse {
  list: Workstation[];
  total: number;
  page: number;
  pageSize: number;
}

// 筛选条件
const filterPlantId = ref(0);
const filterDepartmentId = ref(0);
const filterStatus = ref('');

// 数据
const workstations = ref<Workstation[]>([]);
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const filteredDepartments = ref<Department[]>([]);

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 选中
const selectedWorkstation = ref<Workstation | null>(null);

// 对话框
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentWorkstation = ref({
  id: 0,
  name: '',
  plantId: null as number | null,
  departmentId: null as number | null,
  description: '',
});

const dialogDepartments = computed(() => {
  if (!currentWorkstation.value.plantId) {
    return departments.value;
  }
  return departments.value.filter(d => d.plantId === currentWorkstation.value.plantId);
});

// 获取厂区列表
const fetchPlants = async () => {
  try {
    const res = await request.get('/plants');
    const data = (res as any)?.data || res;
    plants.value = data?.plants || [];
  } catch (error) {
    console.error('获取厂区列表失败:', error);
  }
};

// 获取部门列表
const fetchDepartments = async () => {
  try {
    const res = await request.get('/departments');
    const data = (res as any)?.data || res;
    departments.value = data?.departments || [];
    filteredDepartments.value = departments.value;
  } catch (error) {
    console.error('获取部门列表失败:', error);
  }
};

// 厂区变化时更新部门列表
const onPlantChange = () => {
  filteredDepartments.value = filterPlantId.value === 0
    ? departments.value
    : departments.value.filter(d => d.plantId === filterPlantId.value);
  filterDepartmentId.value = 0;
};

// 获取工位列表
const fetchWorkstations = async () => {
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    if (filterPlantId.value !== 0) params.plantId = filterPlantId.value;
    if (filterDepartmentId.value !== 0) params.departmentId = filterDepartmentId.value;
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await request.get<WorkstationListResponse>('/workstations', { params });
    const data = (res as any)?.data || res;
    workstations.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (error) {
    ElMessage.error('获取工位列表失败');
  }
};

// 分页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchWorkstations();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchWorkstations();
  }
};

// 选择行
const selectWorkstation = (ws: Workstation) => {
  selectedWorkstation.value = ws;
};

// 打开新增对话框
const openAddDialog = () => {
  isEditMode.value = false;
  currentWorkstation.value = {
    id: 0,
    name: '',
    plantId: null,
    departmentId: null,
    description: '',
  };
  isDialogOpen.value = true;
};

// 打开编辑对话框
const openEditDialog = (ws: Workstation) => {
  isEditMode.value = true;
  currentWorkstation.value = {
    id: ws.id,
    name: ws.name,
    plantId: ws.plantId,
    departmentId: ws.departmentId,
    description: ws.description || '',
  };
  isDialogOpen.value = true;
};

// 关闭对话框
const closeDialog = () => {
  isDialogOpen.value = false;
};

// 保存工位
const saveWorkstation = async () => {
  try {
    if (isEditMode.value) {
      await request.put(`/workstations/${currentWorkstation.value.id}`, {
        name: currentWorkstation.value.name,
        plantId: currentWorkstation.value.plantId,
        departmentId: currentWorkstation.value.departmentId,
        description: currentWorkstation.value.description,
      });
      ElMessage.success('工位更新成功');
    } else {
      await request.post('/workstations', {
        name: currentWorkstation.value.name,
        plantId: currentWorkstation.value.plantId,
        departmentId: currentWorkstation.value.departmentId,
        description: currentWorkstation.value.description,
      });
      ElMessage.success('工位创建成功');
    }
    closeDialog();
    clearRequestCache(); // 清除缓存，确保刷新数据
    fetchWorkstations();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  }
};

// 切换状态
const toggleStatus = async (ws: Workstation) => {
  const newStatus = ws.status === 'active' ? 'inactive' : 'active';
  const action = ws.status === 'active' ? '停用' : '启用';

  try {
    await ElMessageBox.confirm(`确定要${action}工位 "${ws.name}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await request.post(`/workstations/${ws.id}/toggle-status`, { status: newStatus });
    ElMessage.success(`${action}成功`);
    fetchWorkstations();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || `${action}失败`);
    }
  }
};

// 删除工位
const deleteWorkstation = async (ws: Workstation) => {
  try {
    await ElMessageBox.confirm(`确定要删除工位 "${ws.name}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await request.delete(`/workstations/${ws.id}`);
    ElMessage.success('删除成功');
    if (selectedWorkstation.value?.id === ws.id) {
      selectedWorkstation.value = null;
    }
    fetchWorkstations();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败');
    }
  }
};

// 厂区变化时清空部门
watch(() => currentWorkstation.value.plantId, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    currentWorkstation.value.departmentId = null;
  }
});

// 初始化
onMounted(() => {
  fetchPlants();
  fetchDepartments();
  fetchWorkstations();
});
</script>

<style scoped>
.workstation-config-container {
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
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #9CA3AF;
}

.table-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.card-body {
  padding: 24px;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  text-align: left;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 12px;
  border-bottom: 2px solid #E5E7EB;
}

.data-table td {
  color: #4B5563;
  font-size: 13px;
  border-bottom: 1px solid #F3F4F6;
}

/* 紧凑行高样式 */
.data-table.compact tbody tr td {
  padding: 6px 12px;
}

.data-table tbody tr {
  height: 40px;
}

.data-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.data-table tbody tr.selected {
  background-color: #EFF6FF;
}

.empty-cell {
  text-align: center;
  color: #9CA3AF;
  padding: 40px !important;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #D1FAE5;
  color: #059669;
}

.status-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.primary:hover {
  background-color: #DBEAFE;
}

.action-btn.secondary {
  background-color: #F3F4F6;
  color: #4B5563;
}

.action-btn.secondary:hover {
  background-color: #E5E7EB;
}

.action-btn.delete {
  background-color: #FEF2F2;
  color: #DC2626;
}

.action-btn.delete:hover {
  background-color: #FEE2E2;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.pagination-info {
  color: #6B7280;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-controls button {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #F3F4F6;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6B7280;
  font-size: 14px;
}

.filter-area {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  align-items: flex-end;
}

.filter-area .form-group {
  flex: 1;
  min-width: 160px;
  margin-bottom: 0;
}

.filter-area .form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #6B7280;
}

.filter-area .form-group input,
.filter-area .form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
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
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 520px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #6B7280;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background-color: #F3F4F6;
  color: #374151;
}

.dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group input:disabled {
  background-color: #F3F4F6;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>
