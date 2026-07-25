<template>
  <div class="role-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">角色管理</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">👥 角色管理</div>
        <div class="table-card-actions">
          <button class="btn btn-secondary" @click="loadRoles" :disabled="isLoading">
            🔄 {{ isLoading ? '刷新中...' : '刷新' }}
          </button>
          <button class="btn btn-primary" @click="openAddRoleDialog" :disabled="isLoading">➕ 新增角色</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 操作提示 -->
        <div v-if="notification.message" :class="['notification', notification.type]">
          {{ notification.message }}
        </div>

        <div class="search-bar">
          <div class="search-item">
            <label>角色名称</label>
            <input type="text" v-model="searchQuery.name" placeholder="请输入角色名称">
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
                <th>角色名称</th>
                <th>描述</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in paginatedRoles" :key="role.id" @click="selectRole(role)" :class="{ 'selected': selectedRole && selectedRole.id === role.id }">
                <td>{{ role.id }}</td>
                <td>{{ role.name }}</td>
                <td>{{ role.description }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(role.status)">{{ role.status === 'active' ? '启用' : '禁用' }}</span>
                </td>
                <td>{{ role.createdAt }}</td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click.stop="openEditRoleDialog(role)" :disabled="isLoading">编辑</button>
                    <button class="action-btn secondary" @click.stop="toggleRoleStatus(role)" :disabled="isLoading">
                      {{ role.status === 'active' ? '禁用' : '启用' }}
                    </button>
                    <button class="action-btn delete" @click.stop="deleteRole(role)" :disabled="isLoading">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">共 {{ filteredRoles.length }} 条记录</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1 || isLoading">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages || isLoading">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Role Dialog -->
    <div v-if="isDialogOpen" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑角色' : '新增角色' }}</h3>
          <button class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveRole">
            <div class="form-group">
              <label>角色名称 *</label>
              <input type="text" v-model="currentRole.name" required :disabled="isLoading">
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentRole.description" rows="4" :disabled="isLoading"></textarea>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="currentRole.status" :disabled="isLoading">
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDialog" :disabled="isLoading">取消</button>
          <button class="btn btn-primary" @click="saveRole" :disabled="isLoading">
            {{ isLoading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';

interface Role {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

const roles = ref<Role[]>([]);
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

// 从数据库加载角色
const loadRoles = async () => {
  isLoading.value = true;
  try {
    const response = await fetch(`/api/roles`);
    if (!response.ok) {
      throw new Error('网络响应异常');
    }
    const data = await response.json();
    roles.value = data.roles;
    showNotification('数据刷新成功', 'success');
  } catch (error) {
    showNotification('加载数据失败，请检查后端服务', 'error');
    // 如果 API 失败，使用本地默认数据
    roles.value = [
      { id: 1, name: '超级管理员', description: '拥有系统所有权限', status: 'active', createdAt: '2023-01-01' },
      { id: 2, name: '厂区管理员', description: '负责单个厂区的管理', status: 'active', createdAt: '2023-03-15' },
      { id: 3, name: '部门管理员', description: '负责单个部门的管理', status: 'active', createdAt: '2023-06-20' },
      { id: 4, name: '普通员工', description: '日常操作权限', status: 'active', createdAt: '2023-09-10' },
      { id: 5, name: '访客', description: '仅查看权限', status: 'inactive', createdAt: '2023-12-01' },
    ];
  } finally {
    isLoading.value = false;
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadRoles();
});

const selectedRole = ref<Role | null>(null);
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const currentRole = ref<Role>({
  id: 0, name: '', description: '', status: 'active', createdAt: ''
});

const searchQuery = reactive({
  name: ''
});

const filteredRoles = computed(() => {
  return roles.value.filter(role => {
    return searchQuery.name ? role.name.includes(searchQuery.name) : true;
  });
});

const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRoles.value.length / pageSize.value)));
const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredRoles.value.slice(start, end);
});

const selectRole = (role: Role) => {
  selectedRole.value = role;
};

const openAddRoleDialog = () => {
  isEditMode.value = false;
  currentRole.value = { id: 0, name: '', description: '', status: 'active', createdAt: '' };
  isDialogOpen.value = true;
};

const openEditRoleDialog = (role?: Role) => {
  const targetRole = role || selectedRole.value;
  if (targetRole) {
    isEditMode.value = true;
    currentRole.value = { ...targetRole };
    isDialogOpen.value = true;
  }
};

const saveRole = async () => {
  if (!currentRole.value.name.trim()) {
    showNotification('请输入角色名称', 'error');
    return;
  }

  isLoading.value = true;
  if (isEditMode.value) {
    // 更新角色
    try {
      const response = await fetch(`/api/roles/${currentRole.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentRole.value.name,
          description: currentRole.value.description,
          status: currentRole.value.status
        })
      });
      if (!response.ok) {
        throw new Error('更新失败');
      }
      const data = await response.json();
      const index = roles.value.findIndex(r => r.id === currentRole.value.id);
      if (index !== -1) {
        roles.value[index] = data.role;
      }
      showNotification('角色更新成功', 'success');
      closeDialog();
    } catch (error) {
      showNotification('更新失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  } else {
    // 创建角色
    try {
      const response = await fetch(`/api/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentRole.value.name,
          description: currentRole.value.description,
          status: currentRole.value.status
        })
      });
      if (!response.ok) {
        throw new Error('创建失败');
      }
      const data = await response.json();
      roles.value.push(data.role);
      showNotification('角色创建成功', 'success');
      closeDialog();
    } catch (error) {
      showNotification('创建失败，请稍后重试', 'error');
    } finally {
      isLoading.value = false;
    }
  }
};

const toggleRoleStatus = async (role?: Role) => {
  const targetRole = role || selectedRole.value;
  if (targetRole) {
    ElMessageBox.confirm(
      `确定要${targetRole.status === 'active' ? '禁用' : '启用'}角色 "${targetRole.name}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        const newStatus = targetRole.status === 'active' ? 'inactive' : 'active';
        isLoading.value = true;
        try {
          const response = await fetch(`/api/roles/${targetRole.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: targetRole.name,
              description: targetRole.description,
              status: newStatus
            })
          });
          if (!response.ok) {
            throw new Error('状态更新失败');
          }
          const data = await response.json();
          const index = roles.value.findIndex(r => r.id === targetRole.id);
          if (index !== -1) {
            roles.value[index] = data.role;
            if (selectedRole.value?.id === targetRole.id) {
              selectedRole.value = data.role;
            }
          }
          showNotification(`角色${newStatus === 'active' ? '启用' : '禁用'}成功`, 'success');
        } catch (error) {
          showNotification('状态更新失败，请稍后重试', 'error');
        } finally {
          isLoading.value = false;
        }
      })
      .catch(() => {
        showNotification('已取消操作', 'info');
      });
  }
};

const deleteRole = async (role?: Role) => {
  const targetRole = role || selectedRole.value;
  if (targetRole) {
    ElMessageBox.confirm(
      `确定要删除角色 "${targetRole.name}" 吗？此操作不可恢复！`,
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
          const response = await fetch(`/api/roles/${targetRole.id}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            throw new Error('删除失败');
          }
          roles.value = roles.value.filter(r => r.id !== targetRole.id);
          if (selectedRole.value?.id === targetRole.id) {
            selectedRole.value = null;
          }
          showNotification('角色删除成功', 'success');
        } catch (error) {
          showNotification('删除失败，请稍后重试', 'error');
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
  currentRole.value = { id: 0, name: '', description: '', status: 'active', createdAt: '' };
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

const getStatusClass = (status: string) => {
  return status === 'active' ? 'success' : 'danger';
};
</script>

<style scoped>
.role-management-container {
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

/* 通知消息样式 */
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

/* Loading 遮罩样式 */
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

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #D1FAE5;
  color: #065F46;
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
