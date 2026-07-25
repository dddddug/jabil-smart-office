<template>
  <div class="plant-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">组织管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">厂区管理</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🏭 厂区管理</div>
        <div class="table-card-actions">
          <button class="btn btn-secondary" @click="loadPlants" :disabled="isLoading">
            🔄 {{ isLoading ? '刷新中...' : '刷新' }}
          </button>
          <button class="btn btn-primary" @click="openAddPlantDialog" :disabled="isLoading || !canAddPlant()">➕新增厂区</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 操作通知 -->
        <div v-if="notification.message" :class="['notification', notification.type]">
          {{ notification.message }}
        </div>

        <div class="search-bar">
          <div class="search-item">
            <label>厂区名称</label>
            <input type="text" v-model="searchQuery.name" placeholder="请输入厂区名称" />
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>厂区名称</th>
                <th>负责人</th>
                <th>描述</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(plant, index) in paginatedPlants" :key="plant.id" @click="selectPlant(plant)" :class="{ 'selected': selectedPlant && selectedPlant.id === plant.id }">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ plant.name }}</td>
                <td>
                  <span class="manager-badge" v-if="plant.managerName">
                    👤 {{ plant.managerName }}
                  </span>
                  <span class="manager-badge empty" v-else>
                    未分配
                  </span>
                </td>
                <td>{{ plant.description }}</td>
                <td>{{ plant.createdAt }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click.stop="openEditPlantDialog(plant)" :disabled="isLoading || !canEditPlant(plant)">编辑</button>
                    <button class="action-btn delete" @click.stop="deletePlant(plant)" :disabled="isLoading || !canEditPlant(plant)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">共 {{ filteredPlants.length }} 条记录</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1 || isLoading">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages || isLoading">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Plant Dialog -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑厂区' : '新增厂区' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="savePlant">
            <div class="form-group">
              <label>厂区名称 *</label>
              <input type="text" v-model="currentPlant.name" required :disabled="isLoading" />
            </div>
            <div class="form-group">
              <label>负责人</label>
              <select v-model="selectedManagerIdString" :disabled="isLoading">
                <option value="">请选择负责人</option>
                <option v-for="user in availableManagers" :key="user.id" :value="user.id">
                  {{ user.realName || user.username }} ({{ user.roleName }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentPlant.description" rows="4" :disabled="isLoading"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog" :disabled="isLoading">取消</button>
          <button class="btn btn-primary" @click="savePlant" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import request from '@/utils/request'; // 导入 axios 实例

interface Plant {
  id: number;
  name: string;
  description: string;
  managerId?: number | null; // 可以是数字、null 或 undefined
  managerName?: string | null; // 可以是字符串、null 或 undefined
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  realName?: string;
  roleName?: string;
}

interface PlantsResponse {
  plants: Plant[];
}

interface UsersResponse {
  items: User[];
  pagination?: any;
}
interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}



const plants = ref<Plant[]>([]);
const availableUsers = ref<User[]>([]);
const isLoading = ref(false);
const notification = ref<Notification>({ message: '', type: 'info' });
let notificationTimer: any = null;

// 显示通知
const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }
  notification.value = { message, type };
  notificationTimer = setTimeout(() => {
    notification.value = { message: '', type: 'info' };
  }, 3000);
};

// 从数据库加载厂区
const loadPlants = async () => {
  isLoading.value = true;
  try {
    const data = await request.get<PlantsResponse>('/plants');
    plants.value = data?.plants || [];
    showNotification('数据刷新成功', 'success');
  } catch (error) {
    showNotification('加载数据失败，请检查后端服务', 'error');
    // 如果API失败，使用本地默认数据（必须与数据库 jso_org_plant_management 表一致）
    // 当前数据库数据: id 1=MPL PhaseV, 2=ENE A, 3=ENE B, 4=ENE C, 5=DYF, 6=IC, 7=MPL
    plants.value = [
      { id: 1, name: 'MPL PhaseV', description: 'Jabil主厂五期', managerId: null, managerName: null, createdAt: '2023-01-01' },
      { id: 2, name: 'EN E A', description: 'Jabil分厂A栋', managerId: null, managerName: null, createdAt: '2023-03-15' },
      { id: 3, name: 'ENE B', description: 'Jabil分厂B栋', managerId: null, managerName: null, createdAt: '2026-06-29' },
      { id: 4, name: 'ENE C', description: 'Jabil分厂C栋', managerId: null, managerName: null, createdAt: '2026-06-29' },
      { id: 5, name: 'DYF', description: 'Jabil东源分厂', managerId: null, managerName: null, createdAt: '2026-06-29' },
      { id: 6, name: 'IC', description: 'IA&Buyer', managerId: null, managerName: null, createdAt: '2026-06-29' },
      { id: 7, name: 'MPL', description: 'Jabil主厂', managerId: null, managerName: null, createdAt: '2026-06-29' },
    ];
  } finally {
    isLoading.value = false;
  }
};

// 加载用户列表（用于负责人选择）
const loadUsers = async () => {
  try {
    const data = await request.get<UsersResponse>('/users');
    availableUsers.value = data?.items || [];
  } catch (error) {
    showNotification('加载用户失败', 'error');
  }
};

// 组件挂载时加载数据
onMounted(() => {
  Promise.all([loadPlants(), loadUsers()]);
});

const selectedPlant = ref<Plant | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentPlant = ref<Plant & { managerId?: number | null | string }>({ id: 0, name: '', description: '', createdAt: '' });
const selectedManagerIdString = ref<string | number | null>(null);

const searchQuery = reactive({
  name: ''
});

// 获取当前登录用户
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
  return null
}

// 判断是否可以编辑/删除厂区
const canEditPlant = (plant: Plant) => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  // 超级管理员可以编辑所有
  if (roleId === 1) return true;
  
  // 厂区管理员只能编辑自己负责的厂区
  if (roleId === 2) {
    return Number(plant.managerId) === Number(currentUser?.id);
  }
  
  return false;
}

// 判断是否可以新增厂区
const canAddPlant = () => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  // 只有超级管理员可以新增
  return roleId === 1;
}

const filteredPlants = computed(() => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  
  let plantsList = plants.value;
  
  // 根据角色过滤：只有厂区管理员只能看自己的厂区
  if (roleId === 2) { // 厂区管理员：只显示自己负责的厂区或所属的厂区
    plantsList = plantsList.filter(plant => {
      const isManager = Number(plant.managerId) === Number(currentUser?.id);
      const isPlantUser = Number(plant.id) === Number(currentUser?.plantId);
      return isManager || isPlantUser;
    });
  }
  
  // 根据搜索过滤
  return plantsList.filter(plant => {
    return searchQuery.name ? plant.name.includes(searchQuery.name) : true;
  });
});

// 筛选出只有厂区管理员角色的用户
const availableManagers = computed(() => {
  return availableUsers.value.filter(user => user.roleName === '厂区管理员');
});

const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPlants.value.length / pageSize.value)));
const paginatedPlants = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredPlants.value.slice(start, end);
});

const selectPlant = (plant: Plant) => {
  selectedPlant.value = plant;
};

const openAddPlantDialog = () => {
  isEditMode.value = false;
  currentPlant.value = { id: 0, name: '', description: '', createdAt: '' };
  selectedManagerIdString.value = null;
  isDialogOpen.value = true;
};

const openEditPlantDialog = (plant?: Plant) => {
  const targetPlant = plant || selectedPlant.value;
  if (targetPlant) {
    isEditMode.value = true;
    currentPlant.value = { ...targetPlant };
    selectedManagerIdString.value = targetPlant.managerId || null;
    isDialogOpen.value = true;
  }
};

const savePlant = async () => {
  if (!currentPlant.value.name.trim()) {
    showNotification('请输入厂区名称', 'error');
    return;
  }

  isLoading.value = true;

  const managerIdToSend = selectedManagerIdString.value === '' ? null : Number(selectedManagerIdString.value);
  if (isEditMode.value) {
    // 更新厂区
    try {
      // 拦截器已自动解包 data，res 直接是响应体
      const data = await request.put(`/plants/${currentPlant.value.id}`, {
        name: currentPlant.value.name,
        description: currentPlant.value.description,
        managerId: managerIdToSend,
      });
      const index = plants.value.findIndex(p => p.id === currentPlant.value.id);
      if (index !== -1) {
        plants.value[index] = data?.plant;
      }
      showNotification('厂区更新成功', 'success');
      closeDialog();
    } catch (error) {
      showNotification('更新失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  } else {
      // 创建厂区
      try {
        // 拦截器已自动解包 data，res 直接是响应体
        const data = await request.post(`/plants`, {
          name: currentPlant.value.name,
          description: currentPlant.value.description,
          managerId: managerIdToSend,
        });
        plants.value.push(data?.plant);
        showNotification('厂区创建成功', 'success');
        closeDialog();
    } catch (error) {
      showNotification('创建失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  }
};

const deletePlant = async (plant?: Plant) => {
  const targetPlant = plant || selectedPlant.value;
  if (targetPlant) {
    ElMessageBox.confirm(
      `确定要删除厂区 "${targetPlant.name}" 吗？此操作不可恢复！`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        isLoading.value = true;
        try {
          await request.delete(`/plants/${targetPlant.id}`);
          plants.value = plants.value.filter(p => p.id !== targetPlant.id);
          if (selectedPlant.value?.id === targetPlant.id) {
            selectedPlant.value = null;
          }
          showNotification('厂区删除成功', 'success');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || '删除失败，请稍后重试';
          showNotification(errorMessage, 'error');
        } finally {
          isLoading.value = false;
        }
      })
      .catch(() => {
        showNotification('已取消删除', 'info');
      });
  }
};

const closeDialog = () => {
  isDialogOpen.value = false;
  currentPlant.value = { id: 0, name: '', description: '', createdAt: '' };
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.name = '';
  currentPage.value = 1;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
</script>

<style scoped>
.plant-management-container {
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

/* 通知样式 */
.notification {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  animation: slideIn 0.3s ease;
}

.notification.success {
  background-color: #D1FAE5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

.notification.error {
  background-color: #FEE2E2;
  color: #DC2626;
  border: 1px solid #FECACA;
}

.notification.info {
  background-color: #DBEAFE;
  color: #1E40AF;
  border: 1px solid #BFDBFE;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading遮罩样式 */
.table-container {
  position: relative;
}

.table-container[v-loading]::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-container[v-loading]::after {
  content: '加载中...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 11;
  color: #0066CC;
  font-size: 14px;
  font-weight: 500;
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

.search-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.search-item input {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-actions {
  display: flex;
  gap: 12px;
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
  padding: 12px 16px;
  text-align: left;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  border-bottom: 2px solid #E5E7EB;
}

.data-table td {
  color: #4B5563;
  font-size: 14px;
  border-bottom: 1px solid #F3F4F6;
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

.manager-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  background-color: #EFF6FF;
  color: #0066CC;
}

.manager-badge.empty {
  background-color: #F9FAFB;
  color: #9CA3AF;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
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
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  background-color: white;
  color: #4B5563;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #4B5563;
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
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 500px;
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
  transition: all 0.2s;
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

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>