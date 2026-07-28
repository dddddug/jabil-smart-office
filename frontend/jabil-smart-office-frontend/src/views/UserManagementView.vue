<template>
  <div class="user-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">用户管理</span>
      </div>
    </div>

    <div v-if="notification.message" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">👤 用户列表</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="loadUsers" :disabled="isLoading">
            🔄 {{ isLoading ? '刷新中...' : '刷新' }}
          </button>
          <button class="btn btn-secondary" @click="openBatchImportDialog">📥 批量导入</button>
          <button class="btn btn-primary" @click="openAddUserDialog">➕ 新增用户</button>
        </div>
      </div>
      <div class="table-container" v-loading="isLoading">
        <table class="data-table">
          <thead>
            <tr>
              <th>工号</th>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>厂区</th>
              <th>部门</th>
              <th>登录次数</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.id" @click="selectUser(user)" :class="{ 'selected': selectedUser && selectedUser.id === user.id }">
              <td>{{ user.employeeId }}</td>
              <td>{{ user.username }}</td>
              <td>{{ user.realName }}</td>
              <td>{{ user.roleName }}</td>
              <td>{{ user.plantName }}</td>
              <td>{{ user.departmentName }}</td>
              <td>{{ user.loginCount || 0 }}</td>
              <td>
                <span :class="['status-badge', ((user.status || '').toLowerCase() === 'active') ? 'active' : 'inactive']">
                  {{ ((user.status || '').toLowerCase() === 'active') ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ user.createdAt ? dayjs(user.createdAt).format('YYYY-MM-DD HH:mm') : '-' }}</td>
              <td>
                <div class="table-actions">
                  <button class="action-btn edit" @click.stop="openEditUserDialog(user)">编辑</button>
                  <button class="action-btn reset" @click.stop="resetPassword(user.id)">重置密码</button>
                  <button class="action-btn delete" @click.stop="deleteUser(user)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="pagination-left">
          <span class="pagination-info">共 {{ users?.length || 0 }} 条记录</span>
          <div class="page-size-selector">
            <span>每页显示</span>
            <select v-model="pageSize" @change="changePageSize" class="page-size-select">
              <option :value="20">20</option>
              <option :value="30">30</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span>条</span>
          </div>
        </div>
        <div class="pagination-right">
          <span class="pagination-info">显示 {{ startIndex + 1 }}-{{ Math.min(endIndex, users?.length || 0) }} 条</span>
          <div class="pagination-buttons">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">‹</button>
            <span class="page-number">{{ currentPage }}</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit User Dialog -->
    <div v-if="isDialogOpen" class="dialog-overlay">
      <div class="dialog-content user-dialog">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑用户' : '新增用户' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveUser" class="compact-form">
            <div class="form-row">
              <div class="form-group">
                <label for="username">用户名 *</label>
                <input type="text" id="username" v-model="currentUser.username" :disabled="isEditMode" />
              </div>
              <div class="form-group">
                <label for="realName">姓名</label>
                <input type="text" id="realName" v-model="currentUser.realName" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="employeeId">工号</label>
                <input type="text" id="employeeId" v-model="currentUser.employeeId" />
              </div>
              <div class="form-group">
                <label for="oldEmployeeId">旧工号</label>
                <input type="text" id="oldEmployeeId" v-model="currentUser.oldEmployeeId" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="role">角色 *</label>
                <select id="role" v-model="currentUser.roleId" required>
                  <option value="">请选择</option>
                  <option v-for="role in availableRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="status">状态</label>
                <select id="status" v-model="currentUser.status">
                  <option value="active">启用</option>
                  <option value="inactive">禁用</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="plant">厂区</label>
                <select id="plant" v-model="currentUser.plantId" @change="onPlantChange">
                  <option value="">请选择</option>
                  <option v-for="plant in availablePlants" :key="plant.id" :value="plant.id">{{ plant.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label for="department">部门</label>
                <select id="department" v-model="currentUser.departmentId" :disabled="!currentUser.plantId">
                  <option value="">请选择</option>
                  <option v-for="dept in filteredDepartments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="gender">性别</label>
                <select id="gender" v-model="currentUser.gender">
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div class="form-group">
                <label for="phone">电话</label>
                <input type="text" id="phone" v-model="currentUser.phone" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="email">邮箱</label>
                <input type="text" id="email" v-model="currentUser.email" placeholder="user@example.com" />
              </div>
              <div class="form-group">
                <label for="position">岗位</label>
                <input type="text" id="position" v-model="currentUser.position" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="level">级别</label>
                <input type="text" id="level" v-model="currentUser.level" />
              </div>
              <div class="form-group">
                <label for="employeeType">员工类型</label>
                <select id="employeeType" v-model="currentUser.employeeType">
                  <option value="">请选择</option>
                  <option value="Jabil">Jabil</option>
                  <option value="3PL">3PL</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="hireDate">入职日期</label>
                <input type="date" id="hireDate" v-model="currentUser.hireDate" />
              </div>
              <div class="form-group">
                <label for="leaveDate">离职日期</label>
                <input type="date" id="leaveDate" v-model="currentUser.leaveDate" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="icCardNumber">IC卡号</label>
                <input type="text" id="icCardNumber" v-model="currentUser.icCardNumber" />
              </div>
              <div class="form-group" v-if="!isEditMode">
                <label>初始密码</label>
                <div class="static-value">123456</div>
              </div>
              <div class="form-group" v-else></div>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button type="button" class="btn btn-primary" @click="saveUser" :disabled="isSaving">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Import Dialog -->
    <div v-if="isBatchImportOpen" class="dialog-overlay">
      <div class="dialog-content batch-import-dialog">
        <div class="dialog-header">
          <h3>📥 批量导入用户</h3>
          <button class="dialog-close" @click="closeBatchImportDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="batch-import-section">
            <h4>📋 下载模板</h4>
            <p class="hint-text">请先下载导入模板，按照模板格式填写用户信息</p>
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

          <div v-if="(previewData?.length || 0) > 0" class="batch-import-section">
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
                    <th>厂区</th>
                    <th>部门</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in previewData" :key="index">
                    <td :class="{ 'error-cell': !user.username }">{{ user.username || '-' }}</td>
                    <td>{{ user.realName || '-' }}</td>
                    <td>{{ user.employeeId || '-' }}</td>
                    <td>{{ user.oldEmployeeId || '-' }}</td>
                    <td>{{ user.gender || '-' }}</td>
                    <td>{{ user.position || '-' }}</td>
                    <td>{{ user.level || '-' }}</td>
                    <td>{{ user.phone || '-' }}</td>
                    <td>{{ user.hireDate ? dayjs(user.hireDate).format('YYYY-MM-DD') : '-' }}</td>
                    <td>{{ user.leaveDate ? dayjs(user.leaveDate).format('YYYY-MM-DD') : '-' }}</td>
                    <td>{{ user.icCardNumber || '-' }}</td>
                    <td>{{ user.employeeType || '-' }}</td>
                    <td>{{ getPlantName(user.plantId) }}</td>
                    <td>{{ getDepartmentName(user.departmentId) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="preview-info">共 {{ previewData?.length || 0 }} 条数据</p>
          </div>

          <div v-if="importResults" class="batch-import-section">
            <h4>✅ 导入结果</h4>
            <div class="import-summary">
              <span class="success-count">成功: {{ importResults.success || 0 }}</span>
              <span class="updated-count">更新: {{ importResults.updated || 0 }}</span>
              <span class="failed-count">失败: {{ importResults.failed || 0 }}</span>
            </div>
            <div v-if="importResults?.errors?.length > 0" class="errors-list">
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
              <button v-if="shouldShowConfirmButton"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import * as XLSX from 'xlsx';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { clearRequestCache } from '@/utils/request'; // 导入 axios 实例



interface User {
  id: number;
  username: string;
  password?: string;
  realName?: string;
  employeeId?: string;
  oldEmployeeId?: string;
  roleId?: number;
  roleName?: string;
  plantId?: number;
  plantName?: string;
  departmentId?: number;
  departmentName?: string;
  status?: string;
  loginCount?: number;
  createdAt: string;
  // 新增字段
  gender?: string;
  position?: string;
  level?: string;
  phone?: string;
  email?: string;
  hireDate?: string;
  leaveDate?: string;
  icCardNumber?: string;
  employeeType?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
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

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ImportUser {
  username?: string;
  realName?: string;
  employeeId?: string;
  oldEmployeeId?: string;
  roleId?: number;
  plantId?: number;
  departmentId?: number;
  status?: string;
  password?: string;
  gender?: string;
  position?: string;
  level?: string;
  phone?: string;
  email?: string;
  hireDate?: string;
  leaveDate?: string;
  icCardNumber?: string;
  employeeType?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; username: string; error: string }>;
  updated?: number;
}

const users = ref<User[]>([]);
const availableRoles = ref<Role[]>([]);
const availablePlants = ref<Plant[]>([]);
const allDepartments = ref<Department[]>([]);
const selectedUser = ref<User | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const isBatchImportOpen = ref(false);
const isImporting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const importFile = ref<File | null>(null);
const previewData = ref<ImportUser[]>([]);
const importResults = ref<ImportResult | null>(null);

watch(() => previewData.value.length, (newVal) => {
  console.log('Watcher: previewData.value.length changed to', newVal);
});

const shouldShowConfirmButton = computed(() => {
  const isPreviewDataPopulated = (previewData.value?.length || 0) > 0;
  const hasNoImportResults = !importResults.value; // 明确检查 .value
  console.log('Computed shouldShowConfirmButton:', {
    isPreviewDataPopulated,
    hasNoImportResults,
    previewDataLength: previewData.value?.length,
    importResultsValue: importResults.value
  });
  return isPreviewDataPopulated && hasNoImportResults;
});
const currentUser = ref<User>({
  id: 0,
  username: '',
  realName: '',
  employeeId: '',
  oldEmployeeId: '',
  roleId: undefined,
  roleName: '',
  plantId: undefined,
  plantName: '',
  departmentId: undefined,
  departmentName: '',
  status: 'active',
  createdAt: '',
  gender: undefined,
  position: '',
  level: '',
  phone: '',
  hireDate: '',
  leaveDate: '',
  icCardNumber: '',
  employeeType: '',
});
const notification = ref<Notification>({ message: '', type: 'info' });
let notificationTimer: any = null;

// 分页相关变量
const currentPage = ref(1);
const pageSize = ref(20);

// 分页计算属性
const totalPages = computed(() => {
  return Math.ceil((users.value?.length || 0) / pageSize.value) || 1;
});

const startIndex = computed(() => {
  return (currentPage.value - 1) * pageSize.value;
});

const endIndex = computed(() => {
  return currentPage.value * pageSize.value;
});

const paginatedUsers = computed(() => {
  return users.value.slice(startIndex.value, endIndex.value);
});

// 分页方法
const changePageSize = () => {
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

const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }
  notification.value = { message, type };
  notificationTimer = setTimeout(() => {
    notification.value = { message: '', type: 'info' };
  }, 3000);
};

const loadUsers = async () => {
  isLoading.value = true;
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await request.get('/users');
    users.value = data?.items || data?.users || [];
  } catch (error) {
    console.error('获取用户失败:', error);
    showNotification('获取用户失败，请检查后端服务', 'error');
    loadDefaultUsers();
  } finally {
    isLoading.value = false;
  }
};

const loadDefaultUsers = () => {
  // 如果API失败，使用空数组
  users.value = [];
};

const loadRoles = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await request.get('/roles');
    availableRoles.value = data?.roles || [];
  } catch (error) {
    console.error('获取角色失败:', error);
    availableRoles.value = [
      { id: 1, name: '超级管理员' },
      { id: 2, name: '厂区管理员' },
      { id: 3, name: '部门管理员' },
      { id: 4, name: '普通员工' },
    ];
  }
};

const loadPlants = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await request.get('/plants');
    availablePlants.value = data?.plants || [];
  } catch (error) {
    console.error('获取厂区失败:', error);
    // 如果API失败，使用空数组
    availablePlants.value = [];
  }
};

const loadDepartments = async () => {
  try {
    // 拦截器已自动解包 data，res 直接是数据对象
    const data = await request.get('/departments');
    allDepartments.value = data?.departments || [];
  } catch (error) {
    console.error('获取部门失败:', error);
    // 如果API失败，使用空数组
    allDepartments.value = [];
  }
};

const filteredDepartments = computed(() => {
  return allDepartments.value.filter(dept => dept.plantId === currentUser.value.plantId);
});

const selectUser = (user: User) => {
  selectedUser.value = user;
};

const onPlantChange = () => {
  currentUser.value.departmentId = undefined;
  currentUser.value.departmentName = '';
};

const openAddUserDialog = () => {
  isEditMode.value = false;
  currentUser.value = {
    id: 0,
    username: '',
    realName: '',
    employeeId: '',
    oldEmployeeId: '',
    roleId: undefined,
    roleName: '',
    plantId: undefined,
    plantName: '',
    departmentId: undefined,
    departmentName: '',
    status: 'active',
    createdAt: '',
    email: ''
  };
  isDialogOpen.value = true;
};

const openEditUserDialog = (userToEdit: User) => {
  isEditMode.value = true;
  currentUser.value = {
    ...userToEdit
  };
  isDialogOpen.value = true;
};

const saveUser = async () => {
  if (!currentUser.value.username || !currentUser.value.roleId) {
    showNotification('请填写必填项', 'error');
    return;
  }

  isSaving.value = true;
  let savedUser = null;
  try {
    if (isEditMode.value) {
      const response = await request.put(`/users/${currentUser.value.id}`, {
        username: currentUser.value.username,
        realName: currentUser.value.realName,
        employeeId: currentUser.value.employeeId,
        oldEmployeeId: currentUser.value.oldEmployeeId,
        roleId: currentUser.value.roleId,
        plantId: currentUser.value.plantId,
        departmentId: currentUser.value.departmentId,
        status: currentUser.value.status,
        gender: currentUser.value.gender,
        position: currentUser.value.position,
        level: currentUser.value.level,
        phone: currentUser.value.phone,
        hireDate: currentUser.value.hireDate,
        leaveDate: currentUser.value.leaveDate,
        icCardNumber: currentUser.value.icCardNumber,
        employeeType: currentUser.value.employeeType,
        email: currentUser.value.email,
      });
      savedUser = response;
      showNotification('更新用户成功', 'success');
    } else {
      const response = await request.post('/users', {
        username: currentUser.value.username,
        realName: currentUser.value.realName,
        employeeId: currentUser.value.employeeId,
        oldEmployeeId: currentUser.value.oldEmployeeId,
        roleId: currentUser.value.roleId,
        plantId: currentUser.value.plantId,
        departmentId: currentUser.value.departmentId,
        status: currentUser.value.status,
        gender: currentUser.value.gender,
        position: currentUser.value.position,
        level: currentUser.value.level,
        phone: currentUser.value.phone,
        hireDate: currentUser.value.hireDate,
        leaveDate: currentUser.value.leaveDate,
        icCardNumber: currentUser.value.icCardNumber,
        employeeType: currentUser.value.employeeType,
        email: currentUser.value.email,
      });
      savedUser = response;
      showNotification('创建用户成功', 'success');
    }

    closeDialog();
    await nextTick();
    clearRequestCache();
    await loadUsers();

    // 如果更新的是当前登录用户，刷新 localStorage 中的用户信息
    if (savedUser) {
      const loggedInUserStr = localStorage.getItem('user');
      if (loggedInUserStr) {
        const loggedInUser = JSON.parse(loggedInUserStr);
        if (loggedInUser.id === currentUser.value.id || (savedUser && savedUser.id === loggedInUser.id)) {
          const userToSave = savedUser || currentUser.value;
          localStorage.setItem('user', JSON.stringify({
            ...loggedInUser,
            ...userToSave
          }));
        }
      }
    }
  } catch (error: any) {
    console.error('保存用户失败:', error);
    console.error('错误详情:', JSON.stringify(error, null, 2));
    // 显示详细错误信息
    const errorDetails = error?.details || [];
    if (errorDetails.length > 0) {
      console.error('验证错误详情:', errorDetails);
      const messages = errorDetails.map((d: any) => `${d.field || '未知字段'}: ${d.message}`).join('; ');
      showNotification(`保存用户失败: ${messages}`, 'error');
    } else {
      showNotification(error?.message || '保存用户失败，请检查后端服务', 'error');
    }
  } finally {
    isSaving.value = false;
  }
};

const resetPassword = async (userId: number) => {
  if (!confirm(`确定要重置该用户的密码吗？重置后密码为: 123456`)) {
    return;
  }

  try {
    const response = await request.post(`/users/${userId}/admin-reset-password`);
    if (!response.ok) throw new Error('重置密码失败');
    showNotification('密码已重置为123456', 'success');
  } catch (error) {
    console.error('重置密码失败:', error);
    showNotification('重置密码失败，请检查后端服务', 'error');
  }
};

const deleteUser = async (userToDelete: User) => {
  if (!confirm(`确定要删除用户 "${userToDelete.username}" 吗？`)) {
    return;
  }

  try {
    await request.delete(`/users/${userToDelete.id}`);
    showNotification('删除用户成功', 'success');
    clearRequestCache();
    await loadUsers();
    selectedUser.value = null;
  } catch (error) {
    console.error('删除用户失败:', error);
    showNotification('删除用户失败，请检查后端服务', 'error');
  }
};

const closeDialog = () => {
  isDialogOpen.value = false;
  isEditMode.value = false;
  currentUser.value = {
    id: 0,
    username: '',
    realName: '',
    employeeId: '',
    oldEmployeeId: '',
    roleId: undefined,
    roleName: '',
    plantId: undefined,
    plantName: '',
    departmentId: undefined,
    departmentName: '',
    status: 'active',
    createdAt: '',
    email: ''
  };
};

// 批量导入相关函数
const openBatchImportDialog = () => {
  isBatchImportOpen.value = true;
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
  console.log('openBatchImportDialog: importResults.value reset to', importResults.value);
};

const closeBatchImportDialog = () => {
  isBatchImportOpen.value = false;
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
  console.log('closeBatchImportDialog: importResults.value reset to', importResults.value);
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

const handleFileDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file) {
      processFile(file);
    }
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file) {
      processFile(file);
    }
  }
};

const removeImportFile = () => {
  importFile.value = null;
  previewData.value = [];
  importResults.value = null;
  console.log('removeImportFile: importResults.value reset to', importResults.value);
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const processFile = (file: File) => {
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
      console.log('Excel Workbook read successfully:', workbook); // Added log
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('No sheet found in Excel file.'); // Added log
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('Worksheet is empty or invalid.'); // Added log
        return;
      }
      
      // 转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      console.log('Excel jsonData:', jsonData); // Added log
      
      if (jsonData.length < 2) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('Excel file has less than 2 rows (header + data).'); // Added log
        return;
      }

      // 第一行为表头
      const headers = jsonData[0];
      if (!headers) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('Excel file has no headers.'); // Added log
        return;
      }
      
      // 从第二行开始处理数据
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
          console.log(`Skipping empty or invalid row at index ${i}:`, row); // Added log
          continue; // 跳过空行
        }
        
        const user: ImportUser = {};

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
        console.log(`Parsed user from row ${i}:`, user); // Added log
        previewData.value.push(user);
      }
      console.log('Final previewData after Excel parse:', previewData.value); // Added log
    } catch (error) {
      console.error('解析 Excel 失败:', error); // Enhanced log
      showNotification('文件解析失败，请检查文件格式', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
};

const convertExcelDate = (dateValue: string): string => {
  if (!dateValue || String(dateValue).trim() === '') {
    return '';
  }
  
  const dateStr = String(dateValue).trim();

  // If it's an Excel date serial number
  if (/^\d+(\.\d+)?$/.test(dateStr)) {
    try {
      const excelDate = parseFloat(dateStr);
      // Excel日期从 1900-01-01 开始，JS Date 从 1970-01-01 开始，相差 25569 天
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
    } catch {
      // 转换失败则继续尝试其他格式
    }
  }
  
  // 尝试用 dayjs 解析各种格式
  const d = dayjs(dateStr);
  if (d.isValid()) {
    return d.format('YYYY-MM-DD');
  }

  // 如果dayjs无法解析，尝试自定义的 / 或 - 分隔的日期格式
  try {
    const normalized = dateStr.replace(/\//g, '-'); // 统一 / 为 -
    const parts = normalized.split('-');
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  } catch {}

  // 如果所有尝试都失败，返回空字符串
  console.warn('Could not parse date:', dateValue);
  return '';
};

const parseCSV = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim());
      console.log('CSV lines read:', lines); // Added log
      
      if (lines.length < 2) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('CSV file has less than 2 rows (header + data).'); // Added log
        return;
      }

      // 解析表头 - 使用逗号分隔但处理带引号的字段
      const firstLine = lines[0];
      if (!firstLine) {
        showNotification('文件格式错误，请使用模板文件', 'error');
        console.error('CSV file has no headers.'); // Added log
        return;
      }
      const headers = parseCSVLine(firstLine);
      console.log('CSV headers:', headers); // Added log
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
          console.log(`Skipping empty CSV line at index ${i}.`); // Added log
          continue;
        }
        const values = parseCSVLine(line);
        const user: ImportUser = {};

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
        console.log(`Parsed user from CSV line ${i}:`, user); // Added log
        previewData.value.push(user);
      }
      console.log('Final previewData after CSV parse:', previewData.value); // Added log
    } catch (error) {
      console.error('解析 CSV 失败:', error); // Enhanced log
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
      inQuotes = !inQuotes;
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

// 转换日期格式 2014/7/11 -> 2014-07-11
const convertDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const year = parts[0];
    const month = (parts[1] || '').padStart(2, '0');
    const day = (parts[2] || '').padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const getRoleName = (roleId?: number) => {
  if (!roleId) return '-';
  const role = availableRoles.value.find(r => r.id === roleId);
  return role?.name || '-';
};

const getPlantName = (plantId?: number) => {
  if (!plantId) return '-';
  const plant = availablePlants.value.find(p => p.id === plantId);
  return plant?.name || '-';
};

const getDepartmentName = (departmentId?: number) => {
  if (!departmentId) return '-';
  const dept = allDepartments.value.find(d => d.id === departmentId);
  return dept?.name || '-';
};

const getRoleIdByName = (name: string | undefined) => {
  if (!name) return undefined;
  const role = availableRoles.value.find(r => r.name === name);
  return role?.id;
};

const getPlantIdByName = (name: string | undefined) => {
  if (!name) return undefined;
  const plant = availablePlants.value.find(p => p.name === name);
  return plant?.id;
};

const getDepartmentIdByName = (name: string | undefined) => {
  if (!name) return undefined;
  const dept = allDepartments.value.find(d => d.name === name);
  return dept?.id;
};

const confirmImport = async () => {
  console.log('confirmImport: current previewData.value.length =', previewData.value.length);
  console.log('confirmImport: current importResults.value =', importResults.value);
  if (previewData.value.length === 0) {
    showNotification('没有可导入的数据', 'error');
    return;
  }

  isImporting.value = true;
  try {
    const result = await request.post('/users/batch', { users: previewData.value });
    const resultData = result?.data || result;
    importResults.value = resultData;

    showNotification(`导入完成: 成功 ${resultData.success || 0} 条，更新 ${resultData.updated || 0} 条，失败 ${resultData.failed || 0} 条`,
      resultData.failed === 0 ? 'success' : 'info');

    if (resultData.success > 0 || resultData.updated > 0) {
      clearRequestCache();
      await loadUsers();
    }
  } catch (error) {
    console.error('批量导入失败:', error);
    showNotification('批量导入失败，请检查后端服务', 'error');
  } finally {
    isImporting.value = false;
  }
};

onMounted(() => {
  Promise.all([
    loadUsers(),
    loadRoles(),
    loadPlants(),
    loadDepartments()
  ]);
});
</script>

<style scoped>
.user-management-container {
  padding: 0 12px 12px 12px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 80px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 24px 0;
  margin-bottom: 0;
}

.breadcrumb {
  font-size: 12px;
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
  margin: 0 4px;
  color: #9CA3AF;
}

.notification {
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 12px;
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

.table-card {
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #E5E7EB;
}

.table-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
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

.btn-primary:disabled {
  opacity: 0.5;
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

.table-container {
  overflow-x: auto;
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

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #F9FAFB;
}

.data-table th {
  padding: 7px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #E5E7EB;
}

.data-table td {
  padding: 7px 10px;
  font-size: 12px;
  color: #374151;
  border-bottom: 1px solid #E5E7EB;
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
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.active {
  background-color: #D1FAE5;
  color: #065F46;
}

.status-badge.inactive {
  background-color: #FEE2E2;
  color: #DC2626;
}

.table-actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
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

.action-btn.reset {
  background-color: #FEF3C7;
  color: #D97706;
}

.action-btn.reset:hover {
  background-color: #FDE68A;
}

.hint-text {
  padding: 8px 12px;
  background-color: #F3F4F6;
  border-radius: 6px;
  font-size: 12px;
  color: #4B5563;
  text-align: center;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid #E5E7EB;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6B7280;
}

.page-size-select {
  padding: 3px 6px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 12px;
  background-color: white;
  cursor: pointer;
}

.page-size-select:focus {
  outline: none;
  border-color: #0066CC;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 3px;
}

.page-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #D1D5DB;
  background-color: white;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number {
  font-size: 12px;
  color: #374151;
  min-width: 26px;
  text-align: center;
}

.pagination-info {
  font-size: 12px;
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
  align-items: flex-start;
  padding-top: 40px;
  z-index: 1000;
}

.dialog-content {
  background-color: #FFFFFF;
  color: #111827;
  padding: 0;
  border-radius: 10px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #E5E7EB;
}

.dialog-header h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 600;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #6B7280;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: #F3F4F6;
  color: #111827;
}

.dialog-body {
  padding: 16px 18px;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="password"],
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
.form-group input[type="password"]:focus,
.form-group select:focus {
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #F9FAFB;
  cursor: not-allowed;
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

/* 用户编辑对话框样式 */
.user-dialog {
  width: 560px;
}

.compact-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.form-row .form-group {
  flex: 1;
  margin-bottom: 0;
}

.form-row .form-group label {
  margin-bottom: 4px;
  font-size: 12px;
}

.form-row .form-group input,
.form-row .form-group select {
  padding: 7px 10px;
  font-size: 13px;
  height: 34px;
  box-sizing: border-box;
}

.form-row .form-group input::placeholder {
  color: #9CA3AF;
  font-size: 12px;
}

.static-value {
  padding: 7px 10px;
  font-size: 13px;
  color: #6B7280;
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
}

.dialog-body {
  padding: 14px 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #E5E7EB;
}

.dialog-actions .btn {
  padding: 8px 20px;
  font-size: 13px;
}

/* 批量导入对话框样式 */
.batch-import-dialog {
  width: 750px;
}

.batch-import-section {
  margin-bottom: 16px;
}

.batch-import-section h4 {
  margin: 0 0 8px 0;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.hint-text {
  margin: 0 0 8px 0;
  color: #6B7280;
  font-size: 13px;
}

.file-upload-area {
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #F9FAFB;
}

.file-upload-area:hover {
  border-color: #0066CC;
  background-color: #EFF6FF;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 36px;
}

.upload-placeholder p {
  margin: 0;
  color: #6B7280;
  font-size: 13px;
}

.uploaded-file {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.file-icon {
  font-size: 20px;
}

.file-name {
  color: #374151;
  font-size: 13px;
  font-weight: 500;
}

.remove-file-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #6B7280;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.remove-file-btn:hover {
  background-color: #FEE2E2;
  color: #EF4444;
}

.preview-table-container {
  max-height: 220px;
  overflow: auto;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 1500px;
}

.preview-table th,
.preview-table td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  white-space: nowrap;
}

.preview-table th {
  background-color: #F9FAFB;
  color: #6B7280;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.preview-table td {
  color: #374151;
}

.error-cell {
  background-color: #FEE2E2;
  color: #DC2626;
}

.preview-info {
  margin: 8px 0 0 0;
  color: #6B7280;
  font-size: 12px;
}

.import-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
}

.success-count {
  color: #065F46;
  font-size: 14px;
  font-weight: 600;
}

.failed-count {
  color: #DC2626;
  font-size: 14px;
  font-weight: 600;
}

.errors-list {
  background-color: #FEE2E2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  padding: 12px;
}

.errors-list h5 {
  margin: 0 0 8px 0;
  color: #DC2626;
  font-size: 13px;
  font-weight: 600;
}

.errors-list ul {
  margin: 0;
  padding-left: 18px;
  max-height: 120px;
  overflow-y: auto;
}

.errors-list li {
  color: #991B1B;
  font-size: 12px;
  margin-bottom: 6px;
}
</style>
