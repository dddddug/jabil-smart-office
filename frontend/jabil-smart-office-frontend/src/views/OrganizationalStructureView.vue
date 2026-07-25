<template>
  <div class="organizational-structure-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">组织管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">组织结构</span>
      </div>
    </div>

    <div class="content-card">
      <!-- 树状结构视图 -->
      <div class="tree-view">
        <div class="tree-container">
          <div class="tree-item" v-for="plant in plantsWithDepartments" :key="plant.id">
            <div class="plant-header" @click="togglePlantExpand(plant.id)">
              <span class="expand-icon">
                <span v-if="expandedPlants.has(plant.id)">▼</span>
                <span v-else>▶</span>
              </span>
              <span class="plant-icon">🏭</span>
              <span class="plant-name">{{ plant.name }}</span>
              <span class="count-badge">{{ plant.totalEmployees || 0 }} 人</span>
            </div>
            <div v-if="expandedPlants.has(plant.id)" class="department-list" :ref="el => setDepartmentListRef(plant.id, el)">
              <div 
                class="department-item" 
                v-for="(dept, index) in plant.departments" 
                :key="dept.id"
                :ref="el => setDepartmentItemRef(plant.id, index, el)"
                :class="{ 'line-break': isLineBreak(plant.id, index) }"
              >
                <div class="department-header">
                  <span class="dept-icon">📁</span>
                  <div class="dept-info">
                    <span class="dept-name">{{ dept.name }}</span>
                    <div class="dept-meta">
                      <span class="count-badge-mini">{{ dept.employees.length }} 人</span>
                      <span v-if="dept.managerName" class="manager-name">👤 {{ dept.managerName }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看员工对话框 -->
    <div v-if="viewEmployeeDialogOpen" class="dialog-overlay" @click.self="closeViewEmployeeDialog">
      <div class="dialog-content large">
        <div class="dialog-header">
          <h3>查看员工</h3>
          <button class="dialog-close" @click="closeViewEmployeeDialog" :disabled="isLoading">×</button>
        </div>
        <div class="dialog-body">
          <div class="view-content">
            <div class="view-row">
              <span class="view-label">工号:</span>
              <span class="view-value">{{ currentEmployee.employeeId || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">姓名:</span>
              <span class="view-value">{{ currentEmployee.name || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">性别:</span>
              <span class="view-value">{{ currentEmployee.gender === 'MALE' ? '男' : currentEmployee.gender === 'FEMALE' ? '女' : currentEmployee.gender || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">厂区:</span>
              <span class="view-value">{{ currentEmployee.plantName || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">部门:</span>
              <span class="view-value">{{ currentEmployee.departmentName || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">职位:</span>
              <span class="view-value">{{ currentEmployee.position || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">状态:</span>
              <span class="view-value">
                <span class="status-badge" :class="getStatusClass(currentEmployee.status)">
                  {{ getStatusText(currentEmployee.status) }}
                </span>
              </span>
            </div>
            <div class="view-row">
              <span class="view-label">联系电话:</span>
              <span class="view-value">{{ currentEmployee.phone || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">邮箱:</span>
              <span class="view-value">{{ currentEmployee.email || '-' }}</span>
            </div>
            <div class="view-row">
              <span class="view-label">入职日期:</span>
              <span class="view-value">{{ currentEmployee.hireDate ? currentEmployee.hireDate.split('T')[0] : '-' }}</span>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeViewEmployeeDialog" :disabled="isLoading">关闭</button>
        </div>
      </div>
    </div>

    <!-- 编辑员工对话框 -->
    <div v-if="editEmployeeDialogOpen" class="dialog-overlay" @click.self="closeEditEmployeeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>编辑员工</h3>
          <button class="dialog-close" @click="closeEditEmployeeDialog" :disabled="isLoading">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveEmployee">
            <div class="form-group">
              <label>所属厂区 *</label>
              <select v-model="currentEmployee.plantId" required :disabled="isLoading" @change="onPlantChange">
                <option value="">请选择厂区</option>
                <option v-for="plant in plants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>所属部门 *</label>
              <select v-model="currentEmployee.departmentId" required :disabled="isLoading">
                <option value="">请选择部门</option>
                <option v-for="dept in filteredDepartmentsForDialog" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>职位</label>
              <input type="text" v-model="currentEmployee.position" :disabled="isLoading" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="currentEmployee.status" :disabled="isLoading">
                <option value="ACTIVE">在职</option>
                <option value="INACTIVE">待入职</option>
                <option value="LEAVE">请假</option>
                <option value="RESIGNED">离职</option>
              </select>
            </div>
            <div class="form-group">
              <label>联系电话</label>
              <input type="text" v-model="currentEmployee.phone" :disabled="isLoading" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input type="email" v-model="currentEmployee.email" :disabled="isLoading" />
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeEditEmployeeDialog" :disabled="isLoading">取消</button>
          <button type="button" class="btn btn-primary" @click="saveEmployee" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';

interface Employee {
  id: number;
  employeeId: string;
  name: string;
  gender: string;
  plantId: number;
  plantName: string;
  departmentId: number;
  departmentName: string;
  position: string;
  level: string;
  status: string;
  phone: string;
  email: string;
  hireDate: string;
  company?: string;
}

interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface DepartmentWithEmployees extends Department {
  employees: Employee[];
  managerName: string; // 添加 managerName 属性
}

interface PlantWithDepartments extends Plant {
  departments: DepartmentWithEmployees[];
  totalEmployees?: number;
}

const employees = ref<Employee[]>([]);
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const isLoading = ref(false);

// 默认展开所有厂区和部门
const expandedPlants = ref<Set<number>>(new Set());
const expandedDepartments = ref<Set<number>>(new Set());

// 用于换行检测的ref和状态
const departmentListRefs = ref<Map<number, HTMLElement | null>>(new Map());
const departmentItemRefs = ref<Map<string, HTMLElement | null>>(new Map());
const lineBreakItems = ref<Set<string>>(new Set());

const selectedEmployee = ref<Employee | null>(null);
const viewEmployeeDialogOpen = ref(false);
const editEmployeeDialogOpen = ref(false);
const currentEmployee = ref<Employee>({
  id: 0,
  employeeId: '',
  name: '',
  gender: '',
  plantId: 0,
  plantName: '',
  departmentId: 0,
  departmentName: '',
  position: '',
  level: '',
  status: 'ACTIVE',
  phone: '',
  email: '',
  hireDate: ''
});

const filteredDepartmentsForDialog = computed(() => {
  if (!currentEmployee.value.plantId) return departments.value;
  return departments.value.filter(d => d.plantId === currentEmployee.value.plantId);
});

const plantsWithDepartments = computed<PlantWithDepartments[]>(() => {
  const result: PlantWithDepartments[] = [];

  for (const plant of plants.value) {
    const plantDepts: DepartmentWithEmployees[] = [];
    const depts = departments.value.filter(d => d.plantId === plant.id);

    let totalPlantEmployees = 0;
    
    for (const dept of depts) {
      const deptEmps = employees.value.filter(e => e.departmentId === dept.id);
      totalPlantEmployees += deptEmps.length;
      plantDepts.push({
        ...dept,
        employees: deptEmps,
        managerName: '待定' // Added placeholder managerName
      });
    }

    result.push({
      ...plant,
      departments: plantDepts,
      // 添加总人数信息
      totalEmployees: totalPlantEmployees
    });
  }

  return result;
});

const getStatusClass = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'INACTIVE': return 'info';
    case 'LEAVE': return 'warning';
    case 'RESIGNED': return 'danger';
    default: return 'info';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'ACTIVE': return '在职';
    case 'INACTIVE': return '待入职';
    case 'LEAVE': return '请假';
    case 'RESIGNED': return '离职';
    default: return status || '-';
  }
};

const loadPlants = async () => {
  try {
    const response = await fetch(`/api/plants`);
    if (response.ok) {
      const data = await response.json();
      plants.value = data.data.items || data.data.plants || [];
    }
  } catch (error: any) {
    // 检查是否是取消的请求（路由切换时会发生）
    if (error?.code === 'CANCELLED' || error?.name === 'AbortError') {
      return;
    }
    ElMessage.error('加载厂区失败:' + error);
    plants.value = [
      { id: 1, name: '广州厂区' },
      { id: 2, name: '上海厂区' },
      { id: 3, name: '深圳厂区' },
    ];
  }
};

const loadDepartments = async () => {
  try {
    const response = await fetch(`/api/departments`);
    if (response.ok) {
      const data = await response.json();
      departments.value = data.data.items || data.data.departments || [];
    }
  } catch (error: any) {
    // 检查是否是取消的请求（路由切换时会发生）
    if (error?.code === 'CANCELLED' || error?.name === 'AbortError') {
      return;
    }
    ElMessage.error('加载部门失败:' + error);
    departments.value = [
      { id: 1, name: '生产部', plantId: 1 },
      { id: 2, name: '研发部', plantId: 1 },
      { id: 3, name: '质量部', plantId: 1 },
      { id: 4, name: '行政部', plantId: 2 },
      { id: 5, name: '销售部', plantId: 2 },
    ];
  }
};

const loadEmployees = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`/api/users`);
    if (response.ok) {
      const data = await response.json();
      const userList = data.data.items || [];
      employees.value = userList
        .filter((user: any) => user.username !== 'admin')
        .map((user: any) => ({
          id: user.id,
          employeeId: user.employeeId || '',
          name: user.realName || user.username || '',
          gender: user.gender || '',
          plantId: user.plantId || 0,
          plantName: user.plantName || '',
          departmentId: user.departmentId || 0,
          departmentName: user.departmentName || '',
          position: user.position || '',
          level: user.level || '',
          company: user.employeeType || user.company || '',
          phone: user.phone || '',
          hireDate: user.hireDate || '',
          status: user.status || 'ACTIVE'
        }));
    }
  } catch (error) {
    ElMessage.error('加载员工失败:' + error);
    employees.value = [
      { id: 1, employeeId: 'E001', name: '张三', gender: 'MALE', plantId: 1, plantName: '广州厂区', departmentId: 1, departmentName: '生产部', position: '组长', level: 'L1', status: 'ACTIVE', phone: '13800138001', email: 'zhangsan@jabil.com', hireDate: '2023-01-15' },
      { id: 2, employeeId: 'E002', name: '李四', gender: 'FEMALE', plantId: 1, plantName: '广州厂区', departmentId: 2, departmentName: '研发部', position: '工程师', level: 'L2', status: 'ACTIVE', phone: '13800138002', email: 'lisi@jabil.com', hireDate: '2023-03-20' },
      { id: 3, employeeId: 'E003', name: '王五', gender: 'MALE', plantId: 2, plantName: '上海厂区', departmentId: 4, departmentName: '行政部', position: '专员', level: 'L1', status: 'ACTIVE', phone: '13800138003', email: 'wangwu@jabil.com', hireDate: '2023-06-10' },
    ];
  } finally {
    isLoading.value = false;
  }
};

const togglePlantExpand = (plantId: number) => {
  const newSet = new Set(expandedPlants.value);
  if (newSet.has(plantId)) {
    newSet.delete(plantId);
  } else {
    newSet.add(plantId);
  }
  expandedPlants.value = newSet;
};

const toggleDepartmentExpand = (deptId: number) => {
  const newSet = new Set(expandedDepartments.value);
  if (newSet.has(deptId)) {
    newSet.delete(deptId);
  } else {
    newSet.add(deptId);
  }
  expandedDepartments.value = newSet;
};

const selectEmployee = (emp: Employee) => {
  selectedEmployee.value = emp;
};

const openViewEmployeeDialog = (emp: Employee) => {
  currentEmployee.value = { ...emp };
  viewEmployeeDialogOpen.value = true;
};

const closeViewEmployeeDialog = () => {
  viewEmployeeDialogOpen.value = false;
};

const openEditEmployeeDialog = (emp: Employee) => {
  currentEmployee.value = { ...emp };
  editEmployeeDialogOpen.value = true;
};

const closeEditEmployeeDialog = () => {
  editEmployeeDialogOpen.value = false;
};

const openAddEmployeeToDept = (dept: Department) => {
  currentEmployee.value = {
    id: 0,
    employeeId: '',
    name: '',
    gender: '',
    plantId: dept.plantId,
    plantName: plants.value.find(p => p.id === dept.plantId)?.name || '',
    departmentId: dept.id,
    departmentName: dept.name,
    position: '',
    level: '',
    status: 'ACTIVE',
    phone: '',
    email: '',
    hireDate: ''
  };
  editEmployeeDialogOpen.value = true;
};

const openEditDeptDialog = (dept: Department) => {
};

const onPlantChange = () => {
  currentEmployee.value.departmentId = 0;
  currentEmployee.value.departmentName = '';
};

// 设置部门列表ref
const setDepartmentListRef = (plantId: number, el: any) => {
  if (el) {
    departmentListRefs.value.set(plantId, el);
  }
};

// 设置部门项ref
const setDepartmentItemRef = (plantId: number, index: number, el: any) => {
  const key = `${plantId}-${index}`;
  if (el) {
    departmentItemRefs.value.set(key, el);
  } else {
    departmentItemRefs.value.delete(key);
  }
};

// 检测是否为换行项
const isLineBreak = (plantId: number, index: number) => {
  const key = `${plantId}-${index}`;
  return lineBreakItems.value.has(key);
};

// 检测换行并更新状态
const detectLineBreaks = async () => {
  await nextTick();
  
  const newLineBreakItems = new Set<string>();
  
  for (const plant of plantsWithDepartments.value) {
    const listRef = departmentListRefs.value.get(plant.id);
    if (!listRef) continue;
    
    let previousTop: number | null = null;
    
    for (let index = 0; index < plant.departments.length; index++) {
      const key = `${plant.id}-${index}`;
      const itemRef = departmentItemRefs.value.get(key);
      
      if (!itemRef) continue;
      
      const rect = itemRef.getBoundingClientRect();
      
      if (index > 0 && previousTop !== null && rect.top > previousTop + 5) {
        // 检测到换行
        newLineBreakItems.add(key);
      }
      
      previousTop = rect.top;
    }
  }
  
  lineBreakItems.value = newLineBreakItems;
};

const saveEmployee = async () => {
  const plant = plants.value.find(p => p.id === currentEmployee.value.plantId);
  const dept = departments.value.find(d => d.id === currentEmployee.value.departmentId);
  currentEmployee.value.plantName = plant ? plant.name : '';
  currentEmployee.value.departmentName = dept ? dept.name : '';

  // 转换员工数据为用户数据格式
  const userData = {
    ...currentEmployee.value,
    realName: currentEmployee.value.name,
    employeeType: currentEmployee.value.company
  };

  isLoading.value = true;
  try {
    if (currentEmployee.value.id) {
      const response = await fetch(`/api/users/${currentEmployee.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (response.ok) {
        await loadEmployees();
        ElMessage.success('员工信息保存成功！');
      } else {
        ElMessage.error('保存员工失败！');
      }
    }
  } catch (error) {
    ElMessage.error('保存员工失败:' + error);
  } finally {
    isLoading.value = false;
    editEmployeeDialogOpen.value = false;
  }
};



onMounted(async () => {
  await Promise.all([loadPlants(), loadDepartments(), loadEmployees()]);
  // 自动展开所有厂区
  expandedPlants.value = new Set(plants.value.map(p => p.id));
  // 自动展开所有部门
  expandedDepartments.value = new Set(departments.value.map(d => d.id));
  // 检测换行
  await detectLineBreaks();
  
  // 监听窗口大小变化，重新检测换行
  window.addEventListener('resize', detectLineBreaks);
});
</script>

<style scoped>
.organizational-structure-container {
  padding: 0 16px 16px 16px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 12px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 6px 0 10px 0;
  margin-bottom: 8px;
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

.content-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  padding: 6px 12px;
  font-size: 13px;
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
  transform: none;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #D1FAE5;
  color: #065F46;
}

.status-badge.info {
  background-color: #DBEAFE;
  color: #1E40AF;
}

.status-badge.warning {
  background-color: #FEF3C7;
  color: #92400E;
}

.status-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.tree-view {
  padding: 0;
}

.tree-container {
  padding: 0;
}

.tree-item {
  margin-bottom: 10px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  position: relative;
}

.plant-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%);
  border-bottom: 2px solid #D1D5DB;
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.plant-header:hover {
  background: linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 100%);
}

.expand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: #6B7280;
  transition: transform 0.2s;
}

.department-list {
  margin-left: 0;
  margin-top: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 10px 60px;
  background-color: #FFFFFF;
  position: relative;
}

.department-list::before {
  content: '';
  position: absolute;
  top: 0;
  left: 60px;
  width: 2px;
  height: 40px;
  background: repeating-linear-gradient(
    to bottom,
    #3B82F6 0px,
    #3B82F6 4px,
    transparent 4px,
    transparent 8px
  );
  z-index: 1;
}

.department-item {
  margin-bottom: 0;
  margin-left: 20px;
  flex: 0 0 calc(20% - 24px);
  min-width: 180px;
  position: relative;
}

.department-item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -20px;
  width: 20px;
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    #3B82F6 0px,
    #3B82F6 4px,
    transparent 4px,
    transparent 8px
  );
  z-index: 1;
}

.department-item.line-break::after {
  content: '';
  position: absolute;
  top: -10px;
  left: 0;
  width: 2px;
  height: 50%;
  background: repeating-linear-gradient(
    to bottom,
    #3B82F6 0px,
    #3B82F6 4px,
    transparent 4px,
    transparent 8px
  );
  z-index: 1;
}

.department-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background-color: #F9FAFB;
  border: 1px solid #D1D5DB;
  border-left: 3px dashed #3B82F6;
  border-radius: 6px;
  transition: all 0.2s;
}

.department-header:hover {
  background-color: #EFF6FF;
  border-color: #3B82F6;
  border-left-style: solid;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
}

.dept-icon {
  font-size: 16px;
}

.dept-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.dept-name {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.dept-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.count-badge-mini {
  padding: 2px 6px;
  background-color: #DBEAFE;
  color: #1D4ED8;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.manager-name {
  font-size: 10px;
  color: #4B5563;
  display: flex;
  align-items: center;
  gap: 2px;
}



.employee-list {
  margin-left: 0;
  margin-top: 8px;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: #FFFFFF;
  border-left: 3px solid #0066CC;
  border-radius: 6px;
  margin-bottom: 6px;
}

.emp-icon {
  font-size: 16px;
}

.emp-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
}

.emp-position {
  font-size: 12px;
  color: #6B7280;
}

.emp-phone {
  font-size: 12px;
  color: #9CA3AF;
}

.empty-state {
  padding: 12px;
  text-align: center;
  color: #9CA3AF;
  font-size: 12px;
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

.dialog-content.large {
  width: 600px;
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

.view-content {
  padding: 0;
}

.view-row {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.view-row:last-child {
  border-bottom: none;
}

.view-label {
  width: 100px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  flex-shrink: 0;
}

.view-value {
  flex: 1;
  font-size: 14px;
  color: #111827;
}
</style>