<template>
  <div class="employee-roster-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">人事中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">员工花名册</span>
      </div>
    </div>

    <div v-if="notification.message" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">👥 员工花名册</div>
        <div class="table-card-actions">
          <button class="btn btn-secondary" @click="loadEmployees" :disabled="isLoading">
            🔄 {{ isLoading ? '刷新中...' : '刷新' }}
          </button>
          <button class="btn btn-primary" @click="openBatchImportDialog">📥 批量导入</button>
        </div>
      </div>
      
      <div class="search-bar">
        <div class="search-item">
          <label>搜索</label>
          <input type="text" v-model="searchQuery.name" placeholder="姓名或工号">
        </div>
        <div class="search-item" v-if="filteredPlants.length > 1">
          <label>厂区</label>
          <select v-model="searchQuery.plantId">
            <option value="">全部厂区</option>
            <option v-for="plant in filteredPlants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
          </select>
        </div>
        <div class="search-item" v-else-if="filteredPlants.length === 1">
          <label>厂区</label>
          <span class="single-option-text">{{ filteredPlants[0]?.name }}</span>
        </div>
        <div class="search-item" v-if="filteredDepartments.length > 1">
          <label>部门</label>
          <select v-model="searchQuery.departmentId">
            <option value="">全部部门</option>
            <option v-for="dept in filteredDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
          </select>
        </div>
        <div class="search-item" v-else-if="filteredDepartments.length === 1">
          <label>部门</label>
          <span class="single-option-text">{{ filteredDepartments[0]?.name }}</span>
        </div>
        <div class="search-actions">
          <button class="btn btn-primary" @click="handleSearch" :disabled="isLoading">查询</button>
          <button class="btn btn-secondary" @click="handleReset" :disabled="isLoading">重置</button>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-left">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);">
              👥
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeCount }}</div>
              <div class="stat-label">当前在职人数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #00A3FF 0%, #007ACC 100%);">
              🤝
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pl3Count }}</div>
              <div class="stat-label">3PL人数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #34D399 0%, #059669 100%);">
              🏭
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.jabilCount }}</div>
              <div class="stat-label">Jabil人数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);">
              📅
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgTenure }}</div>
              <div class="stat-label">平均工龄（年）</div>
            </div>
          </div>
        </div>
        <div class="stats-right">
          <div class="level-card">
            <div class="level-card-header">
              <h3>各级别人数</h3>
            </div>
            <div class="level-card-body">
              <div class="level-item" v-for="(count, level) in stats.levelCounts" :key="level">
                <span class="level-name">{{ level }}</span>
                <div class="level-bar">
                  <div class="level-bar-fill" :style="{ width: getLevelBarWidth(count) + '%' }"></div>
                </div>
                <span class="level-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-container" v-loading="isLoading">
        <table class="data-table">
          <thead>
            <tr>
              <th>SAP工号</th>
              <th>旧工号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>岗位</th>
              <th>级别</th>
              <th>电话</th>
              <th>入职日期</th>
              <th>工龄</th>
              <th>离职日期</th>
              <th>IC卡号</th>
              <th>员工类型</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in paginatedEmployees" :key="employee.id">
              <td>{{ employee.employeeId }}</td>
              <td>{{ employee.oldEmployeeId || '-' }}</td>
              <td>{{ employee.name }}</td>
              <td>{{ employee.gender === 'MALE' ? '男' : employee.gender === 'FEMALE' ? '女' : employee.gender || '-' }}</td>
              <td>{{ employee.position || '-' }}</td>
              <td>{{ employee.level || '-' }}</td>
              <td>{{ employee.phone || '-' }}</td>
              <td>{{ employee.hireDate ? employee.hireDate.split('T')[0] : '-' }}</td>
              <td>{{ calculateSeniority(employee.hireDate) }}</td>
              <td>{{ employee.leaveDate ? employee.leaveDate.split('T')[0] : '-' }}</td>
              <td>{{ employee.icCardNumber || '-' }}</td>
              <td>{{ employee.company || '-' }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(employee.status)]">
                  {{ getStatusText(employee.status) }}
                </span>
              </td>
              <td>
                <div class="table-actions">
                  <button class="action-btn edit" @click="openEditEmployeeDialog(employee)" :disabled="isLoading">编辑</button>
                  <button class="action-btn delete" @click="deleteEmployee(employee)" :disabled="isLoading">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div class="pagination-left">
          <span class="pagination-info">共 {{ filteredEmployees.length }} 条记录</span>
          <div class="page-size-selector">
            <span>每页显示</span>
            <select v-model="pageSize" @change="changePageSize" class="page-size-select">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
            <span>条</span>
          </div>
        </div>
        <div class="pagination-right">
          <span class="pagination-info">显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredEmployees.length) }} 条</span>
          <div class="pagination-buttons">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">‹</button>
            <span class="page-number">{{ currentPage }}</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">›</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isEmployeeDialogOpen" class="dialog-overlay" @click.self="closeEmployeeDialog">
      <div class="dialog-content" :class="{ 'large': dialogMode === 'edit' }">
        <div class="dialog-header">
          <h3>{{ dialogMode === 'edit' ? '编辑员工' : '新增员工' }}</h3>
          <button class="dialog-close" @click="closeEmployeeDialog" :disabled="isLoading">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveEmployee" class="employee-form">
            <div class="form-group">
              <label>工号 *</label>
              <input type="text" v-model="currentEmployee.employeeId" required :disabled="dialogMode === 'edit' || isLoading">
            </div>
            <div class="form-group">
              <label>旧工号</label>
              <input type="text" v-model="currentEmployee.oldEmployeeId" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>姓名 *</label>
              <input type="text" v-model="currentEmployee.name" required :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>性别</label>
              <select v-model="currentEmployee.gender" :disabled="isLoading">
                <option value="">请选择</option>
                <option value="MALE">男</option>
                <option value="FEMALE">女</option>
              </select>
            </div>
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
              <label>岗位</label>
              <input type="text" v-model="currentEmployee.position" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>级别</label>
              <input type="text" v-model="currentEmployee.level" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>员工类型</label>
              <select v-model="currentEmployee.company" :disabled="isLoading">
                <option value="">请选择</option>
                <option value="Jabil">Jabil</option>
                <option value="3PL">3PL</option>
              </select>
            </div>
            <div class="form-group">
              <label>电话</label>
              <input type="text" v-model="currentEmployee.phone" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>入职日期</label>
              <input type="date" v-model="currentEmployee.hireDate" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>离职日期</label>
              <input type="date" v-model="currentEmployee.leaveDate" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>IC卡号</label>
              <input type="text" v-model="currentEmployee.icCardNumber" :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="currentEmployee.status" :disabled="isLoading">
                <option value="">请选择</option>
                <option value="ACTIVE">在职</option>
                <option value="RESIGNED">离职</option>
              </select>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeEmployeeDialog" :disabled="isLoading">取消</button>
          <button type="button" class="btn btn-primary" @click="saveEmployee" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isBatchImportOpen" class="dialog-overlay">
      <div class="dialog-content batch-import-dialog">
        <div class="dialog-header">
          <h3>📥 批量导入员工</h3>
          <button class="dialog-close" @click="closeBatchImportDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="batch-import-section">
            <h4>📋 下载模板</h4>
            <p class="hint-text">请先下载导入模板，按照模板格式填写员工信息（与用户管理共用同一模板）</p>
            <button class="btn btn-secondary" @click="downloadTemplate">⬇️ 下载模板文件</button>
          </div>

          <div class="batch-import-section">
            <h4>📤 上传文件</h4>
            <p class="hint-text">支持 Excel 文件 (.xlsx, .xls, .xlsm) 和 CSV 文件</p>
            <div class="file-upload-area" @click="triggerFileUpload" @dragover.prevent @drop.prevent="handleFileDrop">
              <input 
                ref="fileInput" 
                type="file" 
                accept=".xlsx,.xls,.xlsm,.csv" 
                @change="handleFileSelect" 
                style="display: none" 
              />
              <div v-if="!importFile" class="upload-placeholder">
                <div class="upload-icon">📁</div>
                <p>点击或拖拽文件到此处</p>
              </div>
              <div v-else class="uploaded-file">
                <span class="file-icon">📄</span>
                <span class="file-name">{{ importFile.name }}</span>
                <button class="remove-file-btn" @click.stop="removeImportFile">×</button>
              </div>
            </div>
          </div>

          <div v-if="previewData.length > 0" class="batch-import-section">
            <h4>👀 数据预览</h4>
            <div class="preview-table-container">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>姓名</th>
                    <th>工号</th>
                    <th>旧工号</th>
                    <th>性别</th>
                    <th>岗位</th>
                    <th>级别</th>
                    <th>电话</th>
                    <th>入职日期</th>
                    <th>离职日期</th>
                    <th>IC卡号</th>
                    <th>员工类型</th>
                    <th>所属厂区</th>
                    <th>所属部门</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(employee, index) in previewData" :key="index">
                    <td :class="{ 'error-cell': !employee.username }">{{ employee.username || '-' }}</td>
                    <td>{{ employee.realName || '-' }}</td>
                    <td>{{ employee.employeeId || '-' }}</td>
                    <td>{{ employee.oldEmployeeId || '-' }}</td>
                    <td>{{ employee.gender || '-' }}</td>
                    <td>{{ employee.position || '-' }}</td>
                    <td>{{ employee.level || '-' }}</td>
                    <td>{{ employee.phone || '-' }}</td>
                    <td>{{ employee.hireDate ? employee.hireDate.split('T')[0] : '-' }}</td>
                    <td>{{ employee.leaveDate ? employee.leaveDate.split('T')[0] : '-' }}</td>
                    <td>{{ employee.icCardNumber || '-' }}</td>
                    <td>{{ employee.employeeType || '-' }}</td>
                    <td>{{ getPlantName(employee.plantId) }}</td>
                    <td>{{ getDepartmentName(employee.departmentId) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="preview-info">共 {{ previewData.length }} 条数据</p>
          </div>

          <div v-if="importResults" class="batch-import-section">
            <h4>✅ 导入结果</h4>
            <div class="import-summary">
              <span class="success-count">成功: {{ importResults.success }}</span>
              <span class="failed-count">失败: {{ importResults.failed }}</span>
            </div>
            <div v-if="importResults.errors.length > 0" class="errors-list">
              <h5>❌ 失败详情：</h5>
              <ul>
                <li v-for="(error, index) in importResults.errors" :key="index">
                  第 {{ error.index + 1 }} 行 ({{ error.username }}): {{ error.error }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeBatchImportDialog">取消</button>
          <button 
            v-if="previewData.length > 0 && !importResults" 
            class="btn btn-primary" 
            @click="confirmImport" 
            :disabled="isImporting"
          >
            {{ isImporting ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import * as XLSX from 'xlsx';
import { ElMessageBox } from 'element-plus'; // Import ElMessageBox

import request from '@/utils/request'; // 导入 axios 实例
import { clearRequestCache } from '@/utils/request';
import eventBus from '@/utils/eventBus';

const API_BASE = '/api';

interface Employee {
  id: number;
  employeeId: string;
  oldEmployeeId?: string;
  name: string;
  gender?: string;
  plantId: number;
  plantName?: string;
  departmentId: number;
  departmentName?: string;
  position?: string;
  level?: string;
  company?: string;
  phone?: string;
  hireDate?: string;
  leaveDate?: string;
  icCardNumber?: string;
  status: string;
  employeeType?: string;
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



const isLoading = ref(false);
const employees = ref<Employee[]>([]);
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);

const notification = ref({
  message: '',
  type: ''
});

const searchQuery = ref({
  name: '',
  plantId: '',
  departmentId: ''
});

const currentPage = ref(1);
const pageSize = ref(10);
const isEmployeeDialogOpen = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const currentEmployee = ref<Partial<Employee>>({
  id: 0,
  employeeId: '',
  oldEmployeeId: '',
  name: '',
  gender: '',
  plantId: 0,
  plantName: '',
  departmentId: 0,
  departmentName: '',
  position: '',
  level: '',
  company: '',
  phone: '',
  hireDate: '',
  leaveDate: '',
  icCardNumber: '',
  status: 'ACTIVE'
});

const isBatchImportOpen = ref(false);
const importFile = ref<File | null>(null);
const previewData = ref<any[]>([]);
const importResults = ref<any>(null);
const isImporting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

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

const filteredEmployees = computed(() => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;

  const filtered = employees.value.filter((emp: Employee) => {
    // 根据角色过滤
    let roleMatch = true;
    if (roleId === 2) { // 厂区管理员：只显示自己厂区的
      roleMatch = Number(emp.plantId) === Number(currentUser?.plantId);
    } else if (roleId === 3 || roleId === 4) { // 部门管理员或普通员工：只显示自己部门的
      roleMatch = Number(emp.departmentId) === Number(currentUser?.departmentId);
    }

    const nameMatch = !searchQuery.value.name ||
      ((emp.name || '').toLowerCase().includes((searchQuery.value.name || '').toLowerCase()) ||
      (emp.employeeId || '').toLowerCase().includes((searchQuery.value.name || '').toLowerCase()));
    const plantMatch = !searchQuery.value.plantId || Number(emp.plantId) === Number(searchQuery.value.plantId);
    const deptMatch = !searchQuery.value.departmentId || Number(emp.departmentId) === Number(searchQuery.value.departmentId);

    return roleMatch && nameMatch && plantMatch && deptMatch;
  });

  // 按状态排序：离职员工排到最后，其余按姓名拼音排序
  return filtered.sort((a, b) => {
    const aInactive = a.status === 'inactive' || a.status === 'RESIGNED';
    const bInactive = b.status === 'inactive' || b.status === 'RESIGNED';
    if (aInactive && !bInactive) return 1;  // 离职排后面
    if (!aInactive && bInactive) return -1; // 在职排前面
    return (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredEmployees.value.length / pageSize.value)));
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredEmployees.value.slice(start, start + pageSize.value);
});

const filteredDepartments = computed(() => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  let depts = departments.value;
  
  // 根据角色过滤
  if (roleId === 2) { // 厂区管理员：只显示自己厂区的部门
    depts = depts.filter((d: Department) => Number(d.plantId) === Number(currentUser?.plantId));
  } else if (roleId === 3 || roleId === 4) { // 部门管理员或普通员工：只显示自己的部门
    depts = depts.filter((d: Department) => Number(d.id) === Number(currentUser?.departmentId));
  }
  
  // 再根据搜索过滤
  if (searchQuery.value.plantId) {
    depts = depts.filter((d: Department) => Number(d.plantId) === Number(searchQuery.value.plantId));
  }
  
  return depts;
});

// 过滤厂区选项
const filteredPlants = computed(() => {
  const currentUser = getCurrentUser();
  const roleId = currentUser?.roleId || 0;
  
  if (roleId === 2 || roleId === 3 || roleId === 4) { // 厂区管理员、部门管理员或普通员工：只显示自己的厂区
    return plants.value.filter((p: Plant) => Number(p.id) === Number(currentUser?.plantId));
  }
  return plants.value;
});

const filteredDepartmentsForDialog = computed(() => {
  if (!currentEmployee.value.plantId) return departments.value;
  return departments.value.filter((d: Department) => d.plantId === currentEmployee.value.plantId);
});

const stats = computed(() => {
  const active = filteredEmployees.value.filter((e: Employee) => 
    e.status !== 'RESIGNED' && e.status !== 'inactive'
  ).length;
  
  const pl3 = filteredEmployees.value.filter((e: Employee) => {
    const is3PL = (e.company === '3PL' || e.company === '3pl' || e.employeeType === '3PL' || e.employeeType === '3pl');
    const isActive = e.status !== 'RESIGNED' && e.status !== 'inactive';
    return is3PL && isActive;
  }).length;
  
  const jabil = filteredEmployees.value.filter((e: Employee) => {
    const isJabil = (e.company === 'Jabil' || e.company === 'jabil' || e.employeeType === 'Jabil' || e.employeeType === 'jabil');
    const isActive = e.status !== 'RESIGNED' && e.status !== 'inactive';
    return isJabil && isActive;
  }).length;
  
  const activeEmployees = filteredEmployees.value.filter((e: Employee) => 
    e.status !== 'RESIGNED' && e.status !== 'inactive' && e.hireDate
  );
  let avgTenure = 0;
  if (activeEmployees.length > 0) {
    const totalYears = activeEmployees.reduce((sum: number, e: Employee) => {
      const hireDate = e.hireDate ? new Date(e.hireDate) : new Date(); // Provide a default or handle undefined
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - hireDate.getTime());
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      return sum + diffYears;
    }, 0);
    avgTenure = Number((totalYears / activeEmployees.length).toFixed(1));
  }

  const levelCounts: Record<string, number> = {};
  filteredEmployees.value.forEach((e: Employee) => {
    if (e.level && e.status !== 'RESIGNED' && e.status !== 'inactive') { // 只统计非离职员工
      const currentCount = levelCounts[e.level] ?? 0;
      levelCounts[e.level] = currentCount + 1;
    }
  });

  return {
    activeCount: active,
    pl3Count: pl3,
    jabilCount: jabil,
    avgTenure: avgTenure,
    levelCounts: levelCounts
  };
});

const maxLevelCount = computed(() => {
  const counts = Object.values(stats.value.levelCounts);
  return counts.length > 0 ? Math.max(...counts) : 1;
});

const getLevelBarWidth = (count: number) => {
  if (maxLevelCount.value === 0) return 0;
  return (count / maxLevelCount.value) * 100;
};

const getStatusText = (status: string) => {
  if (status === 'ACTIVE' || status === 'active') {
    return '在职';
  } else if (status === 'RESIGNED' || status === 'inactive') {
    return '离职';
  }
  return status || '-';
};

const calculateSeniority = (hireDateStr?: string): string => {
  if (!hireDateStr) return '-';
  const hireDate = new Date(hireDateStr);
  if (isNaN(hireDate.getTime())) return '-';

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - hireDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return diffYears.toFixed(1);
};

const getStatusClass = (status: string) => {
  if (status === 'ACTIVE' || status === 'active') {
    return 'status-active';
  } else if (status === 'RESIGNED' || status === 'inactive') {
    return 'status-resigned';
  }
  return '';
};

const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = { message: '', type: '' };
  }, 3000);
};

const loadEmployees = async () => {
  isLoading.value = true;
  try {
    // 清除缓存以确保获取最新数据
    clearRequestCache();

    const res = await request.get(`/users`) as { items: any[] };
    // res is already unwrapped by interceptor - it's { items: any[] }
    const userList = res?.items || [];
    employees.value = userList
      .filter((user: any) => user.username !== 'admin') // 过滤掉admin用户
      .map((user: any) => ({ // Create a variable to log it
          id: user.id,
          employeeId: user.sapEmployeeId || '',
          oldEmployeeId: user.oldEmployeeId || '',
          name: user.realName || '',
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
          leaveDate: user.leaveDate || '',
          icCardNumber: user.icCardNumber || '',
          status: user.status || 'ACTIVE'
        }));
  } catch (error) {
    console.error('Error loading employees:', error);
    showNotification('加载员工列表失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

const loadPlants = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data: any = await request.get(`/plants`);
    plants.value = Array.isArray(data?.plants) ? data.plants : [];
  } catch (error) {
    console.error('Error loading plants:', error);
  }
};

const loadDepartments = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await request.get('/departments') as { departments: any[] };
    departments.value = Array.isArray(data?.departments) ? data.departments : [];
  } catch (error) {
    console.error('Error loading departments:', error);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleReset = () => {
  searchQuery.value = { name: '', plantId: '', departmentId: '' };
  currentPage.value = 1;
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const changePageSize = () => {
  currentPage.value = 1;
};

const openEditEmployeeDialog = (employee: Employee) => {
  dialogMode.value = 'edit';
  
  // 处理日期格式，只保留YYYY-MM-DD部分
  const formattedEmployee: Employee = {
    id: employee.id,
    employeeId: employee.employeeId,
    oldEmployeeId: employee.oldEmployeeId || '',
    name: employee.name,
    gender: employee.gender || '',
    plantId: employee.plantId,
    plantName: employee.plantName || '',
    departmentId: employee.departmentId,
    departmentName: employee.departmentName || '',
    position: employee.position || '',
    level: employee.level || '',
    company: employee.company || '',
    phone: employee.phone || '',
    hireDate: employee.hireDate ? String(employee.hireDate) : '',
    leaveDate: employee.leaveDate ? String(employee.leaveDate) : '',
    icCardNumber: employee.icCardNumber || '',
    status: employee.status || 'ACTIVE',
    employeeType: employee.employeeType || ''
  };
  if (typeof formattedEmployee.hireDate === 'string' && formattedEmployee.hireDate.includes('T')) {
    formattedEmployee.hireDate = formattedEmployee.hireDate.split('T')[0];
  }
  if (typeof formattedEmployee.leaveDate === 'string' && formattedEmployee.leaveDate.includes('T')) {
    formattedEmployee.leaveDate = formattedEmployee.leaveDate.split('T')[0];
  }
  
  // 处理性别，处理多种可能的格式
  // 确保 gender 是字符串类型
  const genderValue = formattedEmployee.gender;
  const genderStr = (typeof genderValue === 'string' ? genderValue : JSON.stringify(genderValue) || '').trim();
  if (genderStr) {
    const gender = genderStr.toUpperCase();
    if (gender === 'MALE' || gender === '男' || gender === 'M') {
      formattedEmployee.gender = 'MALE';
    } else if (gender === 'FEMALE' || gender === '女' || gender === 'F') {
      formattedEmployee.gender = 'FEMALE';
    }
  }

  // 处理状态，确保是大写格式
  // 确保 status 是字符串类型
  const statusValue = formattedEmployee.status;
  const statusStr = (typeof statusValue === 'string' ? statusValue : JSON.stringify(statusValue) || '').trim();
  if (statusStr) {
    const status = statusStr.toUpperCase();
    if (status === 'ACTIVE' || status === 'RESIGNED') {
      formattedEmployee.status = status;
    } else if (status === 'INACTIVE') {
      formattedEmployee.status = 'RESIGNED';
    }
  }
  
  currentEmployee.value = formattedEmployee;
  isEmployeeDialogOpen.value = true;
};

const closeEmployeeDialog = () => {
  isEmployeeDialogOpen.value = false;
};

const onPlantChange = () => {
  currentEmployee.value.departmentId = 0;
};

const saveEmployee = async () => {
  if (!currentEmployee.value.employeeId || !currentEmployee.value.name || !currentEmployee.value.plantId || !currentEmployee.value.departmentId) {
    showNotification('请填写必填字段', 'error');
    return;
  }

  isLoading.value = true;
  try {
    const plant = plants.value.find(p => p.id == currentEmployee.value.plantId);
    const dept = departments.value.find(d => d.id == currentEmployee.value.departmentId);
    
    const employeeData = {
      ...currentEmployee.value,
      plantName: plant?.name || '',
      departmentName: dept?.name || ''
    };

    // 转换员工数据为用户数据格式
    const userData = {
      ...employeeData,
      realName: employeeData.name,
      employeeType: employeeData.company
    };
    

    if (dialogMode.value === 'add') {
      await request.post(`/users`, userData);
    } else {
      await request.put(`/users/${currentEmployee.value.id}`, userData);
    }

    await loadEmployees();
    closeEmployeeDialog();
    showNotification(dialogMode.value === 'add' ? '员工添加成功' : '员工更新成功', 'success');
  } catch (error) {
    console.error('Error saving employee:', error);
    showNotification('操作失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

const deleteEmployee = async (employee: Employee) => {
  ElMessageBox.confirm(
    `确定要删除员工 ${employee.name} 吗？`,
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
        await request.delete(`/users/${employee.id}`);

        await loadEmployees();
        showNotification('员工删除成功', 'success');
      } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification('删除失败', 'error');
      } finally {
        isLoading.value = false;
      }
    })
    .catch(() => {
      showNotification('已取消删除', 'info');
    });
};

const openBatchImportDialog = () => {
  isBatchImportOpen.value = true;
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
};

const closeBatchImportDialog = () => {
  isBatchImportOpen.value = false;
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
};

const downloadTemplate = () => {
  // 创建Excel模板数据
  const templateData = [
    {
      '用户名': 'ZHOUT10',
      'SAP工号（工号）': 'ZHOUT10',
      '旧工号': '',
      '姓名': '周天映',
      '性别': '男',
      '岗位': 'Leader',
      '级别': 'Group Leader',
      '电话': '13265993181',
      '邮箱': 'ZHOUT10@jabil.com',
      '入职日期': '2014/7/11',
      '离职日期': '',
      'IC卡号': '0004623524',
      '员工类型（3PL/Jabil）': 'Jabil',
      '所属厂区': 'MPL',
      '所属部门': 'MPL_Stockroom'
    },
    {
      '用户名': 'LINX5',
      'SAP工号（工号）': 'LINX5',
      '旧工号': '',
      '姓名': '林小宝',
      '性别': '男',
      '岗位': 'Supervisor',
      '级别': 'Warehouse Supervisor',
      '电话': '15915763653',
      '邮箱': 'LINX5@jabil.com',
      '入职日期': '2014/7/11',
      '离职日期': '',
      'IC卡号': '0004033976',
      '员工类型（3PL/Jabil）': 'Jabil',
      '所属厂区': 'MPL',
      '所属部门': 'MPL_Stockroom'
    }
  ];

  // 创建工作簿和工作表
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '员工模板');

  // 下载Excel文件
  XLSX.writeFile(workbook, 'employee_import_template.xlsx');
};

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file) {
      handleFile(file);
    }
  }
};

const handleFileDrop = (event: DragEvent) => {
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }
};

const handleFile = (file: File) => {
  importFile.value = file;
  previewData.value = [];
  importResults.value = null;

  const fileExtension = (file.name || '').toLowerCase().split('.').pop();
  
  if (['xlsx', 'xls', 'xlsm'].includes(fileExtension || '')) {
    parseExcel(file);
  } else if (fileExtension === 'csv') {
    parseCSV(file);
  } else {
    showNotification('请选择 Excel 文件 (.xlsx, .xls, .xlsm) 或 CSV 文件', 'error');
  }
};

const parseExcel = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }
      
      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }

      // 第一行为表头
      const headers = jsonData[0];
      if (!headers) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }
      
      // 从第二行开始处理数据
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === '')) {
          continue; // 跳过空行
        }
        
        const user: any = {};

        // 根据表头映射字段
        headers.forEach((header: string, index: number) => {
          const value = row[index];
          const cellValue = value !== undefined && value !== null ? String(value).trim() : '';
          
          if (header === '用户名') user.username = cellValue;
          else if (header === 'SAP工号（工号）') user.employeeId = cellValue;
          else if (header === '旧工号') user.oldEmployeeId = cellValue;
          else if (header === '姓名') user.realName = cellValue;
          else if (header === '性别') user.gender = cellValue;
          else if (header === '岗位') user.position = cellValue;
          else if (header === '级别') user.level = cellValue;
          else if (header === '电话') user.phone = cellValue;
          else if (header === '邮箱') user.email = cellValue;
          else if (header === '入职日期') user.hireDate = convertExcelDate(cellValue);
          else if (header === '离职日期') user.leaveDate = convertExcelDate(cellValue);
          else if (header === 'IC卡号') user.icCardNumber = cellValue;
          else if (header === '员工类型（3PL/Jabil）') user.employeeType = cellValue;
          else if (header === '所属厂区') user.plantId = getPlantIdByName(cellValue);
          else if (header === '所属部门') user.departmentId = getDepartmentIdByName(cellValue);
        });

        previewData.value.push(user);
      }
    } catch (error) {
      console.error('解析 Excel 失败:', error);
      showNotification('文件解析失败，请检查文件格式', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
};

const convertExcelDate = (dateValue: string | undefined): string => {
  if (!dateValue) return '';
  
  // 如果是Excel日期序列号
  if (/^\d+$/.test(dateValue)) {
    try {
      const excelDate = parseInt(dateValue);
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    } catch {
      // 转换失败则继续尝试其他格式
    }
  }
  
  // 尝试转换 2014/7/11 格式
  return convertDate(dateValue);
};

const parseCSV = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }

      // 解析表头 - 使用逗号分隔但处理带引号的字段
      const firstLine = lines[0];
      if (!firstLine) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        return;
      }
      const headers = parseCSVLine(firstLine);
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const values = parseCSVLine(line);
        const user: any = {};

        // 根据表头映射字段
        values.forEach((value, index) => {
          const header = headers[index];
          if (header === '用户名') user.username = value;
          else if (header === 'SAP工号（工号）') user.employeeId = value;
          else if (header === '旧工号') user.oldEmployeeId = value;
          else if (header === '姓名') user.realName = value;
          else if (header === '性别') user.gender = value;
          else if (header === '岗位') user.position = value;
          else if (header === '级别') user.level = value;
          else if (header === '电话') user.phone = value;
          else if (header === '邮箱') user.email = value;
          else if (header === '入职日期') user.hireDate = convertDate(value);
          else if (header === '离职日期') user.leaveDate = convertDate(value);
          else if (header === 'IC卡号') user.icCardNumber = value;
          else if (header === '员工类型（3PL/Jabil）') user.employeeType = value;
          else if (header === '所属厂区') user.plantId = getPlantIdByName(value);
          else if (header === '所属部门') user.departmentId = getDepartmentIdByName(value);
        });

        previewData.value.push(user);
      }
    } catch (error) {
      console.error('解析 CSV 失败:', error);
      showNotification('文件解析失败，请检查文件格式', 'error');
    }
  };
  reader.readAsText(file);
};

// 解析CSV行，处理可能带引号的字段
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

const convertDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  
  // 处理常见的日期格式
  try {
    // 尝试 yyyy/MM/dd 或 yyyy-MM-dd 格式
    const normalized = dateStr.replace(/\//g, '-');
    const parts = normalized.split('-');
    
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    }
    
    // 尝试其他格式
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
  } catch {
    // 转换失败
  }
  
  return dateStr;
};

const getPlantIdByName = (name: string): number | null => {
  if (!name) return null;
  const plant = plants.value.find(p => p.name === name);
  return plant?.id || null;
};

const getDepartmentIdByName = (name: string): number | null => {
  if (!name) return null;
  const dept = departments.value.find(d => d.name === name);
  return dept?.id || null;
};

const removeImportFile = () => {
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const getPlantName = (plantId: string | number) => {
  const plant = plants.value.find(p => p.id == plantId);
  return plant?.name || '-';
};

const getDepartmentName = (departmentId: string | number) => {
  const dept = departments.value.find(d => d.id == departmentId);
  return dept?.name || '-';
};

const confirmImport = async () => {
  if (previewData.value.length === 0) {
    showNotification('请先选择文件并预览数据', 'error');
    return;
  }
  
  isImporting.value = true;
  
  try {
    const response = await fetch(`${API_BASE}/users/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ users: previewData.value })
    });
    
    if (response.ok) {
      const data = await response.json();
      importResults.value = data;
      await loadEmployees();
      showNotification(`导入完成：成功 ${data.success} 条，更新 ${data.updated} 条，失败 ${data.failed} 条`, data.failed > 0 ? 'error' : 'success');
    } else {
      const errorData = await response.json();
      showNotification(errorData.error || '导入失败', 'error');
    }
  } catch (error) {
    console.error('Error importing users:', error);
    showNotification('导入失败', 'error');
  } finally {
    isImporting.value = false;
  }
};

// 当厂区或部门选项加载完成后，如果只有一个选项，自动设置搜索条件
watch([filteredPlants, filteredDepartments], ([newPlants, newDepts]) => {
  if (newPlants && newPlants.length === 1 && newPlants[0]) {
    searchQuery.value.plantId = String(newPlants[0].id);
  }
  if (newDepts && newDepts.length === 1 && newDepts[0]) {
    searchQuery.value.departmentId = String(newDepts[0].id);
  }
}, { immediate: true });

onMounted(() => {
  loadEmployees();
  loadPlants();
  loadDepartments();

  // 监听排班页面的员工状态变更事件
  eventBus.on('employee-roster-changed', () => {
    clearRequestCache();
    loadEmployees();
  });
});
</script>

<style scoped>
.employee-roster-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.breadcrumb {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #d1d5db;
}

.table-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin: 16px 20px;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
}

.search-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.search-item input,
.search-item select {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  flex: 1;
}

.search-item input:focus,
.search-item select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.single-option-text {
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background-color: #f9fafb;
  flex: 1;
}

.search-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #0066cc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0052a3;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.stats-section {
  display: flex;
  gap: 20px;
  padding: 0 20px 10px 20px;
  align-items: flex-end;
}

.stats-left {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  flex: 1;
  height: 215px;
}

.stats-right {
  flex: 1;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #F5F7FA 0%, #E4E8F0 100%);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.level-card {
  background: linear-gradient(135deg, #F5F7FA 0%, #E4E8F0 100%);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.level-card-header {
  margin-bottom: 12px;
}

.level-card-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.level-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-name {
  width: 150px;
  font-size: 13px;
  color: #6b7280;
}

.level-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.level-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0066cc 0%, #00a3ff 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.level-count {
  width: 30px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.table-container {
  overflow-x: auto;
  margin: 0 20px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f9fafb;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.data-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  border-bottom: 1px solid #f3f4f6;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.edit {
  background: #e0f2fe;
  color: #0369a1;
}

.action-btn.edit:hover:not(:disabled) {
  background: #bae6fd;
}

.action-btn.delete {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn.delete:hover:not(:disabled) {
  background: #fecaca;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #d1fae5;
  color: #059669;
}

.status-resigned {
  background: #fee2e2;
  color: #dc2626;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.pagination-left,
.pagination-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pagination-info {
  font-size: 13px;
  color: #6b7280;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.page-size-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #374151;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  min-width: 30px;
  text-align: center;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dialog-content.large {
  max-width: 1000px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 20px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dialog-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.dialog-body {
  padding: 16px;
}

.employee-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 20px;
}

.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.view-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.view-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
}

.view-label {
  font-size: 12px;
  color: #6b7280;
}

.view-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.notification {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}

.notification.success {
  background: #dcfce7;
  color: #166534;
}

.notification.error {
  background: #fee2e2;
  color: #991b1b;
}

.notification.info {
  background: #dbeafe;
  color: #1e40af;
}

.batch-import-dialog {
  max-width: 1000px;
}

.batch-import-section {
  margin-bottom: 24px;
}

.batch-import-section:last-child {
  margin-bottom: 0;
}

.batch-import-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.hint-text {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-upload-area:hover {
  border-color: #0066cc;
  background: #f0f7ff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 48px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.uploaded-file {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
}

.file-name {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.remove-file-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #fee2e2;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-file-btn:hover {
  background: #fecaca;
}

.preview-table-container {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.preview-table thead {
  background: #f3f4f6;
}

.preview-table th {
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #d1d5db;
}

.preview-table td {
  padding: 6px 10px;
  color: #111827;
  border-bottom: 1px solid #f3f4f6;
}

.preview-table tbody tr:hover {
  background: #f9fafb;
}

.error-cell {
  background: #fef2f2;
  color: #991b1b;
}

.preview-info {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.import-summary {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 12px;
}

.success-count {
  font-size: 16px;
  font-weight: 600;
  color: #166534;
}

.failed-count {
  font-size: 16px;
  font-weight: 600;
  color: #991b1b;
}

.errors-list h5 {
  font-size: 14px;
  font-weight: 600;
  color: #991b1b;
  margin: 0 0 8px 0;
}

.errors-list ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #374151;
}

.errors-list li {
  margin-bottom: 4px;
}

[v-loading] {
  position: relative;
}
</style>
