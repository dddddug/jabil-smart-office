<template>
  <div class="department-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">组织管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">部门管理</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📁 部门管理</div>
        <div class="table-card-actions">
          <button class="btn btn-secondary" @click="loadDepartments" :disabled="isLoading">
            🔄 {{ isLoading ? '刷新中...' : '刷新' }}
          </button>
          <button class="btn btn-primary" @click="openAddDepartmentDialog" :disabled="isLoading || !canAddDepartment()">➕新增部门</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 操作通知 -->
        <div v-if="notification.message" :class="['notification', notification.type]">
          {{ notification.message }}
        </div>

        <div class="search-bar">
          <div class="search-item">
            <label>部门名称</label>
            <input type="text" v-model="searchQuery.name" placeholder="请输入部门名称" />
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <!-- Accordion 分组显示 -->
        <div class="accordion-container" v-loading="isLoading">
          <div
            v-for="plant in plantsWithDepartments"
            :key="plant.id"
            class="accordion-item"
          >
            <div class="accordion-header" @click="togglePlant(plant.id)">
              <span class="expand-icon">{{ expandedPlants.has(plant.id) ? '▼' : '▶' }}</span>
              <span class="plant-icon">{{ plant.id === 0 ? '🏢' : '🏭' }}</span>
              <span class="plant-name">{{ plant.name }}</span>
              <span class="department-count">({{ plant.departments.length }})</span>
              <div class="header-actions">
                <button
                  class="btn btn-mini btn-primary"
                  @click.stop="openAddDepartmentDialogToPlant(plant.id)"
                  :disabled="isLoading || !canAddDepartment(plant.id)"
                >
                  + 部门
                </button>
              </div>
            </div>
            <div v-if="expandedPlants.has(plant.id)" class="accordion-content">
              <div class="department-list">
                <div
                  v-for="dept in plant.departments"
                  :key="dept.id"
                  class="department-item"
                  @click="selectDepartment(dept)"
                  :class="{ selected: selectedDepartment && selectedDepartment.id === dept.id }"
                >
                  <div class="department-info">
                    <div class="department-name">{{ dept.name }}</div>
                    <div class="department-desc">
                      <span v-if="dept.managerName" class="manager-info">👤 {{ dept.managerName }}</span>
                      {{ dept.description || '暂无描述' }}
                    </div>
                  </div>
                  <div class="department-actions">
                    <button class="action-btn primary" @click.stop="openEditDepartmentDialog(dept)" :disabled="isLoading || !canEditDepartment(dept)">
                      编辑
                    </button>
                    <button class="action-btn delete" @click.stop="deleteDepartment(dept)" :disabled="isLoading || !canEditDepartment(dept)">
                      删除
                    </button>
                  </div>
                </div>
                <div v-if="plant.departments.length === 0" class="empty-state">
                  暂无部门
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Department Dialog -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑部门' : '新增部门' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveDepartment">
            <div class="form-group">
              <label>所属厂区*</label>
              <select v-model="currentDepartment.plantId" required :disabled="isLoading">
                <option value="">请选择厂区</option>
                <option v-for="plant in availablePlants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>部门名称 *</label>
              <input type="text" v-model="currentDepartment.name" required :disabled="isLoading" />
            </div>
            <div class="form-group">
              <label>负责人</label>
              <select v-model="currentDepartment.managerId" :disabled="isLoading">
                <option value="">请选择负责人</option>
                <option v-for="user in availableUsers" :key="user.id" :value="user.id">
                  {{ user.realName || user.username }} ({{ user.roleName }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentDepartment.description" rows="4" :disabled="isLoading"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog" :disabled="isLoading">取消</button>
          <button class="btn btn-primary" @click="saveDepartment" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus'; // Import ElMessage and ElMessageBox
import dayjs from 'dayjs';
import request from '@/utils/request'; // 导入 axios 实例

interface Department {
  id: number;
  name: string;
  plantId: number;
  plantName: string;
  description: string;
  managerId?: number;
  managerName?: string;
  createdAt: string;
}

interface Plant {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  realName?: string;
  roleName?: string;
}

interface PlantWithDepartments extends Plant {
  departments: Department[];
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}



const departments = ref<Department[]>([]);
const availablePlants = ref<Plant[]>([]);
const availableUsers = ref<User[]>([]);
const isLoading = ref(false);
const notification = ref<Notification>({ message: '', type: 'info' });
const expandedPlants = ref<Set<number>>(new Set()); // 默认展开厂区集合
let notificationTimer: any = null;

// 按厂区分组的部门数据
const plantsWithDepartments = computed<PlantWithDepartments[]>(() => {
  const result: PlantWithDepartments[] = [];
  
  for (const plant of availablePlants.value) {
    const plantDepts = filteredDepartments.value.filter(dept => Number(dept.plantId) === Number(plant.id));
    result.push({
      ...plant,
      departments: plantDepts
    });
  }
  
  return result;
});

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

// 从数据库加载数据
const loadDepartments = async () => {
  isLoading.value = true;
  try {
    // 同时加载部门、厂区和用户数据
    const [deptRes, plantRes, userRes] = await Promise.all([
      request.get('/departments'),
      request.get('/plants'),
      request.get('/users')
    ]);
    
    departments.value = deptRes.items || deptRes.departments || [];
    availablePlants.value = plantRes.items || plantRes.plants || [];
    availableUsers.value = userRes.items || [];
    
    // 默认收起所有厂区
    expandedPlants.value = new Set();
    
    showNotification('数据刷新成功', 'success');
  } catch (error) {
    console.error('加载数据失败:', error);
    showNotification('加载数据失败，请检查后端服务', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadDepartments();
});

const selectedDepartment = ref<Department | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentDepartment = ref<Department>({
  id: 0, name: '', plantId: 0, plantName: '', description: '', createdAt: ''
});

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
    }
    return null
  }

// 判断是否可以编辑/删除部门
const canEditDepartment = (dept: Department) => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  // 超级管理员可以编辑所有
  if (roleId === 1) return true;
  
  // 厂区管理员可以编辑自己厂区的所有部门
  if (roleId === 2) {
    return Number(dept.plantId) === Number(currentUser?.plantId);
  }
  
  // 部门管理员可以编辑自己的部门
  if (roleId === 3) {
    return Number(dept.managerId) === Number(currentUser?.id) || 
           Number(dept.id) === Number(currentUser?.departmentId);
  }
  
  return false;
}

// 判断是否可以新增部门
const canAddDepartment = (plantId?: number) => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  // 超级管理员可以新增
  if (roleId === 1) return true;
  
  // 厂区管理员可以在自己厂区新增
  if (roleId === 2) {
    if (plantId === undefined) return true;
    return Number(plantId) === Number(currentUser?.plantId);
  }
  
  return false;
}

const filteredDepartments = computed(() => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  let deptsList = departments.value;
  
  // 根据角色过滤
  if (roleId === 2) { // 厂区管理员：只显示自己厂区的部门或负责的部门
    deptsList = deptsList.filter(dept => {
      const isPlantDept = Number(dept.plantId) === Number(currentUser?.plantId);
      const isManager = Number(dept.managerId) === Number(currentUser?.id);
      return isPlantDept || isManager;
    });
  } else if (roleId === 3) { // 部门管理员：只显示自己的部门
    deptsList = deptsList.filter(dept => 
      Number(dept.managerId) === Number(currentUser?.id) || 
      Number(dept.id) === Number(currentUser?.departmentId)
    );
  }
  
  // 根据搜索过滤
  if (!searchQuery.name) {
    return deptsList;
  }
  return deptsList.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.name.toLowerCase())
  );
});

// 切换厂区展开/折叠
const togglePlant = (plantId: number) => {
  const newSet = new Set(expandedPlants.value);
  if (newSet.has(plantId)) {
    newSet.delete(plantId);
  } else {
    newSet.add(plantId);
  }
  expandedPlants.value = newSet;
};

const selectDepartment = (dept: Department) => {
  selectedDepartment.value = dept;
};

const openAddDepartmentDialog = () => {
  isEditMode.value = false;
  currentDepartment.value = { id: 0, name: '', plantId: 0, plantName: '', description: '', createdAt: '' };
  isDialogOpen.value = true;
};

// 直接在特定厂区下添加部门
const openAddDepartmentDialogToPlant = (plantId: number) => {
  isEditMode.value = false;
  const plant = availablePlants.value.find(p => p.id === plantId);
  currentDepartment.value = {
    id: 0,
    name: '',
    plantId: plantId,
    plantName: plant ? plant.name : '',
    description: '',
    createdAt: ''
  };
  isDialogOpen.value = true;
};

const openEditDepartmentDialog = (dept: Department) => {
  isEditMode.value = true;
  currentDepartment.value = { ...dept };
  isDialogOpen.value = true;
};

const saveDepartment = async () => {
  if (!currentDepartment.value.name.trim()) {
    showNotification('请输入部门名称', 'error');
    return;
  }
  if (currentDepartment.value.plantId === null || currentDepartment.value.plantId === undefined) {
    showNotification('请选择所属厂区', 'error');
    return;
  }

  isLoading.value = true;
  if (isEditMode.value) {
    // 更新部门
    try {
      const data = await request.put(`/departments/${currentDepartment.value.id}`, {
        plantId: currentDepartment.value.plantId,
        name: currentDepartment.value.name,
        description: currentDepartment.value.description,
        managerId: currentDepartment.value.managerId || null
      });
      const index = departments.value.findIndex(d => d.id === currentDepartment.value.id);
      if (index !== -1) {
        departments.value[index] = data.department;
      }
      showNotification('部门更新成功', 'success');
      closeDialog();
    } catch (error: any) {
      console.error('更新部门失败:', error);
      showNotification('更新失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  } else {
    // 创建部门
    try {
      const data = await request.post(`/departments`, {
        plantId: currentDepartment.value.plantId,
        name: currentDepartment.value.name,
        description: currentDepartment.value.description,
        managerId: currentDepartment.value.managerId || null
      });
      departments.value.push(data.department);
      // 确保新部门所在的厂区是展开的
      const newSet = new Set(expandedPlants.value);
      newSet.add(data.department.plantId);
      expandedPlants.value = newSet;
      showNotification('部门创建成功', 'success');
      closeDialog();
    } catch (error: any) {
      console.error('创建部门失败:', error);
      showNotification('创建失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  }
};

const deleteDepartment = async (dept: Department) => {
  ElMessageBox.confirm(
    `确定要删除部门\"${dept.name}\" 吗？此操作不可恢复！`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      isLoading.value = true;
      try {
        await request.delete(`/departments/${dept.id}`);
        departments.value = departments.value.filter(d => d.id !== dept.id);
        if (selectedDepartment.value?.id === dept.id) {
          selectedDepartment.value = null;
        }
        showNotification('部门删除成功', 'success');
      } catch (error: any) {
        console.error('删除部门失败:', error);
        showNotification('删除失败，请稍后重试', 'error');
      } finally {
        isLoading.value = false;
      }
    })
    .catch(() => {
      showNotification('已取消删除', 'info');
    });
};

const closeDialog = () => {
  isDialogOpen.value = false;
  currentDepartment.value = { id: 0, name: '', plantId: 0, plantName: '', description: '', createdAt: '' };
};

const handleSearch = () => {
  // 搜索时展开所有厂区，确保搜索结果可见
  const allIds = new Set(availablePlants.value.map(p => p.id));
  expandedPlants.value = allIds;
};

const resetSearch = () => {
  searchQuery.name = '';
  // 重置时恢复默认展开状态
  expandedPlants.value = new Set([0]);
};
</script>

<style scoped>
.department-management-container {
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
.accordion-container {
  position: relative;
}

.accordion-container[v-loading]::before {
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

.accordion-container[v-loading]::after {
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
  gap: 12px;
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

/* Accordion 样式 */
.accordion-item {
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.accordion-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background-color: #F9FAFB;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 10px;
}

.accordion-header:hover {
  background-color: #EFF6FF;
}

.expand-icon {
  width: 20px;
  text-align: center;
  color: #6B7280;
  font-size: 12px;
}

.plant-icon {
  font-size: 20px;
}

.plant-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.department-count {
  font-size: 14px;
  color: #6B7280;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.accordion-content {
  background-color: #FFFFFF;
  border-top: 1px solid #E5E7EB;
}

.department-list {
  padding: 8px 0;
}

.department-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.department-item:hover {
  background-color: #F9FAFB;
}

.department-item.selected {
  background-color: #EFF6FF;
}

.department-info {
  flex: 1;
}

.department-name {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.department-desc {
  font-size: 13px;
  color: #6B7280;
}

.manager-info {
  display: inline-block;
  margin-right: 8px;
  font-weight: 500;
  color: #0066CC;
}

.department-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 24px 20px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
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

.btn-mini {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.action-btn.primary:hover:not(:disabled) {
  background-color: #DBEAFE;
}

.action-btn.delete {
  background-color: #FEF2F2;
  color: #DC2626;
}

.action-btn.delete:hover:not(:disabled) {
  background-color: #FEE2E2;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.dialog-close:hover:not(:disabled) {
  background-color: #F3F4F6;
  color: #374151;
}

.dialog-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background-color: #F3F4F6;
  cursor: not-allowed;
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
