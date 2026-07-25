<template>
  <div class="permission-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">权限管理</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🔐 权限管理</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddPermissionDialog">➕新增权限</button>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>权限名称</label>
            <input type="text" v-model="searchQuery.name" placeholder="请输入权限名称">
          </div>
          <div class="search-item">
            <label>权限类型</label>
            <select v-model="searchQuery.type">
              <option value="">全部</option>
              <option value="menu">菜单权限</option>
              <option value="button">按钮权限</option>
            </select>
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>权限名称</th>
                <th>权限代码</th>
                <th>权限类型</th>
                <th>描述</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="permission in paginatedPermissions" :key="permission.id" @click="selectPermission(permission)" :class="{ 'selected': selectedPermission && selectedPermission.id === permission.id }">
                <td>{{ permission.id }}</td>
                <td>{{ permission.name }}</td>
                <td><code>{{ permission.code }}</code></td>
                <td>
                  <span class="status-badge" :class="getTypeClass(permission.type)">{{ permission.type === 'menu' ? '菜单' : '按钮' }}</span>
                </td>
                <td>{{ permission.description }}</td>
                <td>{{ permission.createdAt }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click.stop="openEditPermissionDialog">编辑</button>
                    <button class="action-btn delete" @click.stop="deletePermission">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">共 {{ filteredPermissions.length }} 条记录</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Permission Dialog -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑权限' : '新增权限' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="savePermission">
            <div class="form-group">
              <label>权限名称 *</label>
              <input type="text" v-model="currentPermission.name" required>
            </div>
            <div class="form-group">
              <label>权限代码 *</label>
              <input type="text" v-model="currentPermission.code" required>
            </div>
            <div class="form-group">
              <label>权限类型 *</label>
              <select v-model="currentPermission.type" required>
                <option value="menu">菜单权限</option>
                <option value="button">按钮权限</option>
              </select>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentPermission.description" rows="4"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog">取消</button>
          <button class="btn btn-primary" @click="savePermission">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import dayjs from 'dayjs';

interface Permission {
  id: number;
  name: string;
  code: string;
  type: 'menu' | 'button';
  description: string;
  createdAt: string;
}

const permissions = ref<Permission[]>([
  { id: 1, name: '查看员工名单', code: 'user:view', type: 'button', description: '查看员工名单的权限', createdAt: '2023-01-01' },
  { id: 2, name: '编辑员工信息', code: 'user:edit', type: 'button', description: '编辑员工信息的权限', createdAt: '2023-03-15' },
  { id: 3, name: '厂区管理菜单', code: 'plant:menu', type: 'menu', description: '厂区管理菜单访问权限', createdAt: '2023-06-20' },
  { id: 4, name: '部门管理菜单', code: 'dept:menu', type: 'menu', description: '部门管理菜单访问权限', createdAt: '2023-09-10' },
  { id: 5, name: '数据报表菜单', code: 'report:menu', type: 'menu', description: '数据报表菜单访问权限', createdAt: '2023-12-01' },
]);

const selectedPermission = ref<Permission | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentPermission = ref<Permission>({
  id: 0, name: '', code: '', type: 'button', description: '', createdAt: ''
});

const searchQuery = reactive({
  name: '',
  type: ''
});

const filteredPermissions = computed(() => {
  return permissions.value.filter(permission => {
    const nameMatch = searchQuery.name ? permission.name.includes(searchQuery.name) : true;
    const typeMatch = searchQuery.type ? permission.type === searchQuery.type : true;
    return nameMatch && typeMatch;
  });
});

const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPermissions.value.length / pageSize.value)));
const paginatedPermissions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredPermissions.value.slice(start, end);
});

const selectPermission = (permission: Permission) => {
  selectedPermission.value = permission;
};

const openAddPermissionDialog = () => {
  isEditMode.value = false;
  currentPermission.value = { id: 0, name: '', code: '', type: 'button', description: '', createdAt: '' };
  isDialogOpen.value = true;
};

const openEditPermissionDialog = () => {
  if (selectedPermission.value) {
    isEditMode.value = true;
    currentPermission.value = { ...selectedPermission.value };
    isDialogOpen.value = true;
  }
};

const savePermission = () => {
  if (isEditMode.value) {
    const index = permissions.value.findIndex(p => p.id === currentPermission.value.id);
    if (index !== -1) {
      permissions.value[index] = { ...currentPermission.value };
    }
  } else {
    currentPermission.value.id = permissions.value.length ? Math.max(...permissions.value.map(p => p.id)) + 1 : 1;
    currentPermission.value.createdAt = dayjs().format('YYYY-MM-DD');
    permissions.value.push({ ...currentPermission.value });
  }
  closeDialog();
};

const deletePermission = () => {
  if (selectedPermission.value && confirm(`确定要删除权限"${selectedPermission.value.name}" 吗？`)) {
    permissions.value = permissions.value.filter(p => p.id !== selectedPermission.value!.id);
    selectedPermission.value = null;
  }
};

const closeDialog = () => {
  isDialogOpen.value = false;
  currentPermission.value = { id: 0, name: '', code: '', type: 'button', description: '', createdAt: '' };
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.name = '';
  searchQuery.type = '';
  currentPage.value = 1;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const getTypeClass = (type: string) => {
  return type === 'menu' ? 'info' : 'warning';
};
</script>

<style scoped>
.permission-management-container {
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

.search-item input,
.search-item select {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus,
.search-item select:focus {
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

.data-table code {
  background-color: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #0066CC;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.info {
  background-color: #DBEAFE;
  color: #1D4ED8;
}

.status-badge.warning {
  background-color: #FEF3C7;
  color: #D97706;
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
