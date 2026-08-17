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
          <button class="btn btn-secondary" @click="refreshAll" :disabled="loading">
            🔄 {{ loading ? '刷新中...' : '刷新' }}
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <div class="card-body" v-loading="loading">
        <!-- Tab 1: 模块管理 - 与侧边栏菜单一一对应 -->
        <div v-if="activeTab === 'modules'" class="tab-content">
          <div class="content-header">
            <h3>📋 系统菜单</h3>
          </div>

          <div class="module-tree-container">
            <!-- 主菜单分组 -->
            <div v-for="group in moduleGroups" :key="group.code" class="menu-group">
              <div class="menu-group-header" @click="toggleGroupExpand(group.code)">
                <span class="expand-icon">{{ expandedGroups.includes(group.code) ? '▼' : '▶' }}</span>
                <span class="group-icon">{{ group.icon }}</span>
                <span class="group-name">{{ group.name }}</span>
                <span class="group-count">{{ getSubMenuCount(group.code) }} 个子菜单</span>
              </div>

              <!-- 子菜单列表 -->
              <div v-if="expandedGroups.includes(group.code)" class="menu-group-children">
                <div v-for="subMenu in getSubMenus(group.code)" :key="subMenu.id" class="sub-menu-item">
                  <div class="sub-menu-row">
                    <span class="sub-menu-icon">{{ subMenu.icon }}</span>
                    <span class="sub-menu-name">{{ subMenu.name }}</span>
                  </div>
                </div>

                <div v-if="getSubMenus(group.code).length === 0" class="no-sub-menus">
                  暂无子菜单
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: 权限定义 -->
        <div v-if="activeTab === 'permissions'" class="tab-content tab-permissions">
          <div class="content-header compact">
            <div class="header-left">
              <h3>权限定义</h3>
              <span class="record-count">共 {{ filteredPermissions.length }} 条</span>
            </div>
            <button class="btn btn-primary btn-sm" @click="openPermissionDialog(null)">➕ 新增</button>
          </div>

          <div class="search-bar compact">
            <div class="search-item">
              <select v-model="permFilter.module">
                <option value="">全部模块</option>
                <option v-for="m in modules" :key="m.code" :value="m.code">{{ m.name }}</option>
              </select>
            </div>
            <div class="search-item">
              <input type="text" v-model="permFilter.name" placeholder="权限名称/代码" class="search-input">
            </div>
            <button class="btn btn-primary btn-sm" @click="filterPermissions">查询</button>
            <button class="btn btn-secondary btn-sm" @click="resetPermFilter">重置</button>
          </div>

          <el-table :data="paginatedPermissions" stripe size="small" style="width: 100%" v-loading="loading">
            <el-table-column label="ID" width="60" align="center">
              <template #default="{ $index }">{{ (currentPage - 1) * pageSize + $index + 1 }}</template>
            </el-table-column>
            <el-table-column label="权限代码" min-width="200">
              <template #default="{ row }">
                <code class="perm-code">{{ row.code }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="权限名称" min-width="120" show-overflow-tooltip />
            <el-table-column label="模块" min-width="120">
              <template #default="{ row }">
                <el-tag type="info" size="small" effect="plain">
                  {{ row.module_name || row.module }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="类型/操作" min-width="280" align="center">
              <template #default="{ row }">
                <div class="type-action-group">
                  <!-- 权限类型切换 -->
                  <div class="type-toggle">
                    <button
                      v-for="opt in typeOptions"
                      :key="opt.value"
                      :class="['toggle-btn', { active: row.type === opt.value }]"
                      @click="updatePermissionField(row as Permission, 'type', opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <span class="sep">-</span>
                  <!-- 操作类型切换 -->
                  <div class="action-toggle">
                    <button
                      v-for="opt in actionOptions"
                      :key="opt.value"
                      :class="['toggle-btn', opt.value, { active: row.action === opt.value }]"
                      @click="updatePermissionField(row as Permission, 'action', opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="deletePermission(row as Permission)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="filteredPermissions.length"
              layout="prev, pager, next, total"
              :background="true"
              small
            />
          </div>
        </div>

        <!-- Tab 3: 角色配置 (核心功能) -->
        <div v-if="activeTab === 'roles'" class="tab-content">
          <div class="content-header">
            <h3>角色权限配置</h3>
            <div class="header-actions">
              <select v-model="selectedRoleId" @change="loadRolePermissionsConfig" class="role-select">
                <option value="">请选择角色</option>
                <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
              <button class="btn btn-primary" @click="saveRolePermissions" :disabled="!selectedRoleId || !hasChanges">
                💾 保存配置
              </button>
            </div>
          </div>

          <div v-if="selectedRoleId" class="role-permission-config">
            <div class="config-tip">
              <span class="tip-icon">💡</span>
              <span>勾选权限后，可设置该角色对该权限的数据可见范围和编辑权限</span>
            </div>

            <div class="permission-tree">
              <div v-for="(perms, moduleCode) in permissionsByModule" :key="moduleCode" class="module-group">
                <div class="module-header">
                  <span class="module-icon">{{ getModuleIcon(moduleCode) }}</span>
                  <span class="module-name">{{ getModuleName(moduleCode) }}</span>
                  <label class="module-check">
                    <input type="checkbox"
                      :checked="isModuleAllSelected(moduleCode)"
                      :indeterminate="isModulePartialSelected(moduleCode)"
                      @change="toggleModule(moduleCode)"
                    >
                    全选
                  </label>
                </div>

                <div class="permission-list">
                  <div v-for="perm in perms" :key="perm.id" class="permission-item">
                    <label class="perm-check">
                      <input type="checkbox"
                        :checked="isPermissionSelected(perm)"
                        @change="togglePermissionSelection(perm)"
                      >
                      <span class="perm-name">{{ perm.name }}</span>
                      <code class="perm-code">{{ perm.code }}</code>
                    </label>

                    <div v-if="isPermissionSelected(perm) && permissionConfigs[perm.code]" class="perm-config">
                      <div class="config-item">
                        <label>数据范围:</label>
                        <select v-model="(permissionConfigs[perm.code] as any).data_scope">
                          <option value="self">本人</option>
                          <option value="dept">部门</option>
                          <option value="plant">厂区</option>
                          <option value="all">全部</option>
                        </select>
                      </div>
                      <div class="config-item">
                        <label>
                          <input type="checkbox" v-model="(permissionConfigs[perm.code] as any).can_edit">
                          可编辑
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>请先选择一个角色进行权限配置</p>
          </div>
        </div>

        <!-- Tab 4: 用户权限 -->
        <div v-if="activeTab === 'users'" class="tab-content">
          <div class="content-header">
            <h3>用户权限管理</h3>
          </div>

          <div class="user-search-bar">
            <div class="search-item">
              <label>选择用户</label>
              <select v-model="selectedUserId" @change="loadUserPermissionsConfig">
                <option value="">请选择用户</option>
                <option v-for="user in manageableUsers" :key="user.id" :value="user.id">
                  {{ user.real_name }} ({{ user.department_name || '未分配部门' }})
                </option>
              </select>
            </div>
          </div>

          <div v-if="selectedUserId" class="user-permission-detail">
            <!-- 角色权限信息 -->
            <div class="permission-section">
              <h4>🔒 角色权限</h4>
              <p class="section-tip">以下权限继承自用户的角色配置</p>
              <div class="role-perm-list" v-if="selectedUserRolePermissions.length">
                <div v-for="perm in selectedUserRolePermissions" :key="perm.permission_id" class="perm-tag">
                  <span class="perm-module">{{ perm.module_name }}</span>
                  <span class="perm-sep">/</span>
                  <span class="perm-name">{{ perm.perm_name }}</span>
                  <span class="perm-scope" :class="perm.data_scope">{{ getScopeLabel(perm.data_scope) }}</span>
                </div>
              </div>
              <p v-else class="no-data">暂无角色权限</p>
            </div>

            <!-- 直接授予的权限 -->
            <div class="permission-section">
              <div class="section-header">
                <h4>➕ 直接授予的权限</h4>
                <button class="btn btn-sm btn-primary" @click="openGrantDialog">授予权限</button>
              </div>
              <div class="granted-perm-list" v-if="selectedUserDirectPermissions.length">
                <div v-for="perm in selectedUserDirectPermissions" :key="perm.id" class="perm-tag" :class="{ 'temporary': perm.is_temporary }">
                  <span class="perm-module">{{ perm.module_name }}</span>
                  <span class="perm-sep">/</span>
                  <span class="perm-name">{{ perm.perm_name }}</span>
                  <span class="perm-scope" :class="perm.data_scope">{{ getScopeLabel(perm.data_scope) }}</span>
                  <span v-if="perm.is_temporary" class="perm-badge temporary">临时</span>
                  <button class="perm-revoke" @click="revokeUserPermission(perm)">撤销</button>
                </div>
              </div>
              <p v-else class="no-data">暂无直接授予的权限</p>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>请先选择一个用户进行权限管理</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Permission Dialog -->
    <div v-if="isPermissionDialogOpen" class="dialog-overlay" @click.self="closePermissionDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditPermission ? '编辑权限' : '新增权限' }}</h3>
          <button class="dialog-close" @click="closePermissionDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="savePermission">
            <div class="form-group">
              <label>权限代码 *</label>
              <input type="text" v-model="currentPermission.code" required placeholder="如: schedule:view">
            </div>
            <div class="form-group">
              <label>权限名称 *</label>
              <input type="text" v-model="currentPermission.name" required>
            </div>
            <div class="form-group">
              <label>权限类型 *</label>
              <select v-model="currentPermission.type" required>
                <option value="menu">菜单权限</option>
                <option value="button">按钮权限</option>
              </select>
            </div>
            <div class="form-group">
              <label>所属模块 *</label>
              <select v-model="currentPermission.module" required>
                <option v-for="m in modules" :key="m.code" :value="m.code">{{ m.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>操作类型</label>
              <select v-model="currentPermission.action">
                <option value="">无</option>
                <option value="view">查看 (view)</option>
                <option value="edit">编辑 (edit)</option>
                <option value="delete">删除 (delete)</option>
                <option value="export">导出 (export)</option>
                <option value="approve">审批 (approve)</option>
              </select>
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="currentPermission.description" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closePermissionDialog">取消</button>
          <button class="btn btn-primary" @click="savePermission">保存</button>
        </div>
      </div>
    </div>

    <!-- Grant Permission Dialog -->
    <div v-if="isGrantDialogOpen" class="dialog-overlay" @click.self="closeGrantDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>授予用户权限</h3>
          <button class="dialog-close" @click="closeGrantDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="grantPermission">
            <div class="form-group">
              <label>选择权限 *</label>
              <select v-model="grantForm.permission_id" required>
                <option value="">请选择权限</option>
                <option v-for="p in allPermissionOptions" :key="p.id" :value="p.id">
                  {{ p.module_name }} / {{ p.name }} ({{ p.code }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="grantForm.is_temporary">
                设置为临时权限
              </label>
            </div>
            <template v-if="grantForm.is_temporary">
              <div class="form-row">
                <div class="form-group">
                  <label>开始时间</label>
                  <input type="datetime-local" v-model="grantForm.start_time">
                </div>
                <div class="form-group">
                  <label>结束时间</label>
                  <input type="datetime-local" v-model="grantForm.end_time">
                </div>
              </div>
            </template>
            <div class="form-group">
              <label>数据范围</label>
              <select v-model="grantForm.data_scope">
                <option value="self">本人</option>
                <option value="dept">部门</option>
                <option value="plant">厂区</option>
                <option value="all">全部</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="grantForm.can_edit">
                允许编辑
              </label>
            </div>
            <div class="form-group">
              <label>授权原因</label>
              <textarea v-model="grantForm.reason" rows="2" placeholder="请输入授权原因"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeGrantDialog">取消</button>
          <button class="btn btn-primary" @click="grantPermission">确认授予</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElTable, ElTableColumn, ElButton, ElTag, ElInput, ElSelect, ElOption, ElSpace } from 'element-plus';
import request from '@/utils/request';
import { clearRequestCache, cancelDebouncedRequests } from '@/utils/request';

const route = useRoute();
const router = useRouter();

// 使用 sessionStorage 持久化当前 tab
const getStoredTab = () => {
  return sessionStorage.getItem('permActiveTab') || 'modules';
};

const activeTab = ref(getStoredTab());

// 监听 tab 切换，保存到 sessionStorage
watch(activeTab, (newTab) => {
  sessionStorage.setItem('permActiveTab', newTab);
  // 同步更新 URL 参数（可选，用于分享链接）
  router.replace({ query: { ...route.query, tab: newTab } });
});

import dayjs from '@/plugins/dayjs';

interface Module {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  parent_code?: string | null;
  is_group?: boolean;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  type: string;
  module: string;
  action: string | null;
  description: string | null;
  module_name?: string;
}

interface Role {
  id: number;
  name: string;
}

interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  data_scope: string;
  can_edit: boolean;
  perm_name: string;
  code: string;
  module: string;
  module_name: string;
}

interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  data_scope: string;
  can_edit: boolean;
  is_temporary: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  perm_name: string;
  module: string;
  module_name: string;
}

interface User {
  id: number;
  real_name: string;
  department_name?: string;
}

// Tabs - activeTab 在上面通过 sessionStorage 初始化
const tabs = [
  { key: 'modules', label: '模块管理', icon: '📦' },
  { key: 'permissions', label: '权限定义', icon: '🔑' },
  { key: 'roles', label: '角色配置', icon: '👥' },
  { key: 'users', label: '用户权限', icon: '👤' }
];

// Loading state
const loading = ref(false);

// Modules
const modules = ref<Module[]>([]);
const expandedGroups = ref<string[]>([]);

// Computed: 主菜单分组 (parent_code 为 null 且 sort_order >= 100 的是分组)
const moduleGroups = computed(() => {
  return modules.value
    .filter(m => m.parent_code === null && m.is_group === true)
    .sort((a, b) => a.sort_order - b.sort_order);
});

// 获取分组下的子菜单
const getSubMenus = (groupCode: string) => {
  return modules.value.filter(m => m.parent_code === groupCode).sort((a, b) => a.sort_order - b.sort_order);
};

// 获取子菜单数量
const getSubMenuCount = (groupCode: string) => {
  return getSubMenus(groupCode).length;
};

// 切换分组展开/收起
const toggleGroupExpand = (groupCode: string) => {
  const index = expandedGroups.value.indexOf(groupCode);
  if (index === -1) {
    expandedGroups.value.push(groupCode);
  } else {
    expandedGroups.value.splice(index, 1);
  }
};

// Permissions
const permissions = ref<Permission[]>([]);
const permFilter = reactive({ module: '', name: '' });
const isPermissionDialogOpen = ref(false);
const isEditPermission = ref(false);
const currentPermission = reactive({
  id: 0, code: '', name: '', type: 'button', module: '', action: '', description: ''
});

// Toggle button options
const typeOptions = [
  { label: '按钮', value: 'button' },
  { label: '菜单', value: 'menu' },
  { label: '模块', value: 'module' }
];

const actionOptions = [
  { label: '查看', value: 'view' },
  { label: '编辑', value: 'edit' },
  { label: '删除', value: 'delete' },
  { label: '导出', value: 'export' },
  { label: '审批', value: 'approve' }
];

const filteredPermissions = computed(() => {
  if (!Array.isArray(permissions.value)) return [];
  return permissions.value.filter(p => {
    const moduleMatch = !permFilter.module || p.module === permFilter.module;
    const nameMatch = !permFilter.name || p.name.includes(permFilter.name);
    return moduleMatch && nameMatch;
  });
});

// 分页
const pageSize = 20;
const currentPage = ref(1);

const paginatedPermissions = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredPermissions.value.slice(start, end);
});

const permissionsByModule = computed(() => {
  if (!Array.isArray(permissions.value)) return {};
  const grouped: Record<string, Permission[]> = {};
  permissions.value.forEach(p => {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module]!.push(p);
  });
  return grouped;
});

// Roles
const roles = ref<Role[]>([]);
const selectedRoleId = ref<number | ''>('');
const selectedPermissions = ref<{ permission_id: number; code: string }[]>([]);
const permissionConfigs = reactive<Record<string, { data_scope: string; can_edit: boolean }>>({});
const originalPermissions = ref<string[]>([]);
const existingRolePermissions = ref<RolePermission[]>([]);

// 监听角色切换，加载该角色的权限配置（带防抖）
let roleWatchTimer: ReturnType<typeof setTimeout> | null = null;
watch(selectedRoleId, (newRoleId) => {
  if (roleWatchTimer) clearTimeout(roleWatchTimer);
  roleWatchTimer = setTimeout(() => {
    if (newRoleId && activeTab.value === 'roles') {
      loadRolePermissionsConfig();
    }
  }, 100);
});

const hasChanges = computed(() => {
  const currentCodes = selectedPermissions.value.map(p => p.code).sort();
  const originalCodes = originalPermissions.value.sort();

  // 检查权限代码是否有变化
  if (JSON.stringify(currentCodes) !== JSON.stringify(originalCodes)) {
    return true;
  }

  // 检查权限配置（data_scope, can_edit）是否有变化
  for (const code of currentCodes) {
    const currentConfig = permissionConfigs[code];
    const originalPerm = existingRolePermissions.value.find(p => p.code === code);
    if (originalPerm) {
      const originalConfig = {
        data_scope: originalPerm.data_scope || 'self',
        can_edit: originalPerm.can_edit || false
      };
      if (!currentConfig ||
          currentConfig.data_scope !== originalConfig.data_scope ||
          currentConfig.can_edit !== originalConfig.can_edit) {
        return true;
      }
    }
  }

  return false;
});

// Users
const manageableUsers = ref<User[]>([]);
const selectedUserId = ref<number | ''>('');
const selectedUserRolePermissions = ref<RolePermission[]>([]);
const selectedUserDirectPermissions = ref<UserPermission[]>([]);
const isGrantDialogOpen = ref(false);
const grantForm = reactive({
  permission_id: '' as number | '',
  data_scope: 'self',
  can_edit: false,
  is_temporary: false,
  start_time: '',
  end_time: '',
  reason: ''
});

const allPermissionOptions = computed(() => permissions.value);

// Initialize data
const loadAllData = async () => {
  loading.value = true;
  try {
    // 取消所有防抖请求，确保这次请求能执行
    cancelDebouncedRequests();
    const [modulesRes, permsRes, rolesRes, usersRes] = await Promise.all([
      request.get<Module[]>('/permissions/modules', { params: { _t: Date.now() } }),
      request.get<Permission[]>('/permissions', { params: { _t: Date.now() } }),
      request.get<Role[]>('/roles', { params: { _t: Date.now() } }),
      request.get<User[]>('/permissions/manageable-users', { params: { _t: Date.now() } })
    ]);
    console.log('modulesRes:', modulesRes);
    console.log('permsRes:', permsRes);
    console.log('rolesRes:', rolesRes);
    console.log('usersRes:', usersRes);
    modules.value = Array.isArray(modulesRes) ? modulesRes : [];
    permissions.value = Array.isArray(permsRes) ? permsRes : [];
    roles.value = Array.isArray(rolesRes) ? rolesRes : [];
    manageableUsers.value = Array.isArray(usersRes) ? usersRes : [];
  } catch (err: any) {
    ElMessage.error({ message: err.message || '加载数据失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const refreshAll = () => {
  loadAllData();
};

onMounted(() => {
  loadAllData();
});

// Permission operations - for adding permissions to a specific module
const openPermissionDialogForModule = (moduleCode: string) => {
  isEditPermission.value = false;
  Object.assign(currentPermission, { id: 0, code: '', name: '', type: 'button', module: moduleCode, action: '', description: '' });
  isPermissionDialogOpen.value = true;
};

// Permission operations
const openPermissionDialog = (perm: Permission | null) => {
  if (perm) {
    isEditPermission.value = true;
    Object.assign(currentPermission, perm);
  } else {
    isEditPermission.value = false;
    Object.assign(currentPermission, { id: 0, code: '', name: '', type: 'button', module: '', action: '', description: '' });
  }
  isPermissionDialogOpen.value = true;
};

const closePermissionDialog = () => {
  isPermissionDialogOpen.value = false;
};

const savePermission = async () => {
  try {
    loading.value = true;
    if (isEditPermission.value) {
      await request.put(`/permissions/${currentPermission.id}`, currentPermission);
      ElMessage.success({ message: '权限更新成功', showClose: true, duration: 3000 });
    } else {
      await request.post('/permissions', currentPermission);
      ElMessage.success({ message: '权限创建成功', showClose: true, duration: 3000 });
    }
    await loadAllData();
    closePermissionDialog();
  } catch (err: any) {
    ElMessage.error({ message: err.message || '保存失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const updatePermissionField = async (perm: Permission, field: string, value: string) => {
  try {
    await request.put(`/permissions/${perm.id}`, { [field]: value || null });
    // Update local data
    const idx = permissions.value.findIndex(p => p.id === perm.id);
    if (idx !== -1) {
      (permissions.value[idx] as any)[field] = value || null;
    }
    ElMessage.success({ message: '更新成功', showClose: true, duration: 3000 });
  } catch (err: any) {
    ElMessage.error({ message: err.message || '更新失败', showClose: true, duration: 3000 });
  }
};

const deletePermission = async (perm: Permission) => {
  try {
    await ElMessageBox.confirm(`确定要删除权限"${perm.name}"吗？`, '确认删除', {
      type: 'warning'
    });
    await request.delete(`/permissions/${perm.id}`);
    ElMessage.success({ message: '权限删除成功', showClose: true, duration: 3000 });
    await loadAllData();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error({ message: err.message || '删除失败', showClose: true, duration: 3000 });
    }
  }
};

const filterPermissions = () => {};
const resetPermFilter = () => {
  permFilter.module = '';
  permFilter.name = '';
};

// Role permission operations
const loadRolePermissionsConfig = async () => {
  if (!selectedRoleId.value) {
    selectedPermissions.value = [];
    originalPermissions.value = [];
    existingRolePermissions.value = [];
    return;
  }

  try {
    loading.value = true;
    // 取消所有防抖请求，确保这次请求能执行
    cancelDebouncedRequests();
    const perms = await request.get<RolePermission[]>(`/permissions/roles/${selectedRoleId.value}`, {
      params: { _t: Date.now() }
    });
    console.log('loadRolePermissionsConfig - perms:', perms);
    existingRolePermissions.value = perms || [];

    // Initialize selected permissions from existing config
    selectedPermissions.value = perms?.map(p => ({ permission_id: p.permission_id, code: p.code })) || [];
    console.log('loadRolePermissionsConfig - selectedPermissions:', selectedPermissions.value);
    console.log('loadRolePermissionsConfig - first perm object:', JSON.stringify(perms?.[0]));
    originalPermissions.value = selectedPermissions.value.map(p => p.code);
    console.log('loadRolePermissionsConfig - originalPermissions:', originalPermissions.value);

    // Initialize configs for each permission
    Object.keys(permissionConfigs).forEach(k => delete permissionConfigs[k]);
    perms?.forEach(p => {
      permissionConfigs[p.code] = {
        data_scope: p.data_scope,
        can_edit: p.can_edit
      };
    });
    console.log('loadRolePermissionsConfig - permissionConfigs:', permissionConfigs);
  } catch (err: any) {
    ElMessage.error({ message: err.message || '加载角色权限失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const updatePermissionConfig = (perm: Permission) => {
  if (!permissionConfigs[perm.code]) {
    permissionConfigs[perm.code] = { data_scope: 'self', can_edit: false };
  }
};

// 切换权限选中状态
const togglePermissionSelection = (perm: Permission) => {
  console.log('togglePermissionSelection called for:', perm.code);
  const idx = selectedPermissions.value.findIndex(p => p.code === perm.code);
  if (idx !== -1) {
    // 取消选中
    selectedPermissions.value.splice(idx, 1);
    delete permissionConfigs[perm.code];
  } else {
    // 选中
    selectedPermissions.value.push({ permission_id: perm.id, code: perm.code });
    permissionConfigs[perm.code] = { data_scope: 'self', can_edit: false };
  }
};

const isPermissionSelected = (perm: any) => {
  const selected = selectedPermissions.value.some(p => p.code === perm.code);
  console.log(`isPermissionSelected(${perm.code}):`, selected, 'array length:', selectedPermissions.value.length);
  return selected;
};

const isModuleAllSelected = (moduleCode: string) => {
  const modulePerms = permissions.value.filter(p => p.module === moduleCode);
  return modulePerms.length > 0 && modulePerms.every(p =>
    selectedPermissions.value.some(sp => sp.code === p.code)
  );
};

const isModulePartialSelected = (moduleCode: string) => {
  const modulePerms = permissions.value.filter(p => p.module === moduleCode);
  const selectedCount = modulePerms.filter(p =>
    selectedPermissions.value.some(sp => sp.code === p.code)
  ).length;
  return selectedCount > 0 && selectedCount < modulePerms.length;
};

const toggleModule = (moduleCode: string) => {
  const modulePerms = permissions.value.filter(p => p.module === moduleCode);
  const allSelected = isModuleAllSelected(moduleCode);

  if (allSelected) {
    // Remove all permissions from this module
    selectedPermissions.value = selectedPermissions.value.filter(
      sp => !modulePerms.some(p => p.code === sp.code)
    );
  } else {
    // Add all permissions from this module
    modulePerms.forEach(p => {
      if (!selectedPermissions.value.some(sp => sp.code === p.code)) {
        selectedPermissions.value.push({ permission_id: p.id, code: p.code });
        if (!permissionConfigs[p.code]) {
          permissionConfigs[p.code] = { data_scope: 'self', can_edit: false };
        }
      }
    });
  }
};

const saveRolePermissions = async () => {
  if (!selectedRoleId.value) return;

  try {
    loading.value = true;
    const permissionsToSave = selectedPermissions.value.map(sp => ({
      permission_id: sp.permission_id,
      data_scope: permissionConfigs[sp.code]?.data_scope || 'self',
      can_edit: permissionConfigs[sp.code]?.can_edit || false
    }));

    await request.put(`/permissions/roles/${selectedRoleId.value}`, {
      permissions: permissionsToSave
    });
    ElMessage.success({ message: '角色权限保存成功', showClose: true, duration: 3000 });
    // 清除缓存后重新加载，确保获取最新数据
    clearRequestCache();
    await loadRolePermissionsConfig();
  } catch (err: any) {
    ElMessage.error({ message: err.message || '保存失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const getModuleIcon = (code: string) => {
  const module = modules.value.find(m => m.code === code);
  return module?.icon || '📋';
};

const getModuleName = (code: string) => {
  const module = modules.value.find(m => m.code === code);
  return module?.name || code;
};

// User permission operations
const loadUserPermissionsConfig = async () => {
  if (!selectedUserId.value) {
    selectedUserRolePermissions.value = [];
    selectedUserDirectPermissions.value = [];
    return;
  }

  try {
    loading.value = true;
    const directPerms = await request.get<UserPermission[]>(`/permissions/users/${selectedUserId.value}`);
    selectedUserDirectPermissions.value = directPerms || [];

    // For role permissions, we'd need to get them from the user's role
    // This is simplified - in a real app, you'd have an API to get role permissions for a user
    selectedUserRolePermissions.value = existingRolePermissions.value;
  } catch (err: any) {
    ElMessage.error({ message: err.message || '加载用户权限失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const openGrantDialog = () => {
  grantForm.permission_id = '';
  grantForm.data_scope = 'self';
  grantForm.can_edit = false;
  grantForm.is_temporary = false;
  grantForm.start_time = '';
  grantForm.end_time = '';
  grantForm.reason = '';
  isGrantDialogOpen.value = true;
};

const closeGrantDialog = () => {
  isGrantDialogOpen.value = false;
};

const grantPermission = async () => {
  if (!selectedUserId.value || !grantForm.permission_id) {
    ElMessage.warning({ message: '请选择权限', showClose: true, duration: 3000 });
    return;
  }

  try {
    loading.value = true;
    await request.post(`/permissions/users/${selectedUserId.value}`, {
      permission_id: grantForm.permission_id,
      data_scope: grantForm.data_scope,
      can_edit: grantForm.can_edit,
      is_temporary: grantForm.is_temporary,
      start_time: grantForm.start_time || null,
      end_time: grantForm.end_time || null,
      reason: grantForm.reason || null
    });
    ElMessage.success({ message: '权限授予成功', showClose: true, duration: 3000 });
    await loadUserPermissionsConfig();
    closeGrantDialog();
  } catch (err: any) {
    ElMessage.error({ message: err.message || '授予失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

const revokeUserPermission = async (perm: UserPermission) => {
  try {
    await ElMessageBox.confirm(`确定要撤销权限"${perm.perm_name}"吗？`, '确认撤销', {
      type: 'warning'
    });
    await request.delete(`/permissions/users/${selectedUserId.value}/${perm.permission_id}`);
    ElMessage.success({ message: '权限撤销成功', showClose: true, duration: 3000 });
    await loadUserPermissionsConfig();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error({ message: err.message || '撤销失败', showClose: true, duration: 3000 });
    }
  }
};

const getScopeLabel = (scope: string) => {
  const labels: Record<string, string> = {
    self: '本人',
    dept: '部门',
    plant: '厂区',
    all: '全部'
  };
  return labels[scope] || scope;
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

.table-card-actions {
  display: flex;
  gap: 12px;
}

.tab-navigation {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  background-color: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
}

.tab-btn.active {
  color: #0066CC;
  border-bottom-color: #0066CC;
}

.card-body {
  padding: 24px;
}

.tab-content {
  animation: fadeIn 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.content-header.compact {
  margin-bottom: 12px;
}

.content-header .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-header .record-count {
  font-size: 13px;
  color: #6B7280;
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 10px;
}

.content-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.content-header.compact h3 {
  font-size: 14px;
}

.content-header .tip-text {
  font-size: 13px;
  font-weight: 400;
  color: #9CA3AF;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.role-select {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  min-width: 200px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.search-bar.compact {
  gap: 8px;
  margin-bottom: 12px;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.search-bar.compact .search-item {
  min-width: 100px;
}

.search-item label {
  font-size: 13px;
  font-weight: 500;
  color: #6B7280;
}

.search-item input,
.search-item select {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s;
}

.search-bar.compact .search-item input,
.search-bar.compact .search-item select {
  padding: 6px 10px;
  font-size: 12px;
}

.search-input {
  min-width: 120px;
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

/* Module Tree Container */
.module-tree-container {
  border: 1px solid #E8EBED;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Menu Group Styles - 与侧边栏菜单一一对应 */
.menu-group {
  border-bottom: 1px solid #E8EBED;
}

.menu-group:last-child {
  border-bottom: none;
}

.menu-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  color: #1F2937;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #E8EBED;
}

.menu-group-header:hover {
  background: linear-gradient(135deg, #ECF0F5 0%, #E5E7EB 100%);
}

.menu-group-header .expand-icon {
  font-size: 12px;
  color: #6B7280;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #D1D5DB;
  transition: all 0.2s;
}

.menu-group-header:hover .expand-icon {
  border-color: #0066CC;
  color: #0066CC;
}

.menu-group-header .group-icon {
  font-size: 18px;
}

.menu-group-header .group-name {
  font-weight: 700;
  font-size: 15px;
  color: #111827;
}

.menu-group-header .group-count {
  font-size: 12px;
  color: #6B7280;
  margin-left: auto;
  font-weight: 400;
  background: #E5E7EB;
  padding: 2px 8px;
  border-radius: 10px;
}

.menu-group-children {
  background-color: #FFFFFF;
  padding: 0;
}

.sub-menu-item {
  border-bottom: 1px solid #F3F4F6;
  transition: background-color 0.15s ease;
}

.sub-menu-item:last-child {
  border-bottom: none;
}

.sub-menu-item:hover {
  background-color: #F9FAFB;
}

.sub-menu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px 12px 36px;
  background-color: #FFFFFF;
}

.sub-menu-row:hover {
  background-color: #F3F4F6;
}

.sub-menu-row .sub-menu-icon {
  font-size: 15px;
  width: 24px;
}

.sub-menu-row .sub-menu-name {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
  flex: 1;
}

.sub-menu-row .sub-menu-actions {
  display: flex;
  gap: 6px;
}

.no-sub-menus {
  padding: 16px 32px;
  text-align: center;
  color: #9CA3AF;
  font-size: 13px;
  background: #FAFAFA;
}

/* 旧版模块树样式 - 保留以防需要回退 */
/*
.module-tree-item {
  border-bottom: 1px solid #E5E7EB;
}

.module-tree-item:last-child {
  border-bottom: none;
}

.module-tree-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-color: #F9FAFB;
  cursor: pointer;
  transition: background-color 0.2s;
}

.module-tree-header:hover {
  background-color: #F3F4F6;
}

.expand-icon {
  font-size: 12px;
  color: #9CA3AF;
  width: 16px;
}

.module-tree-header .module-icon {
  font-size: 18px;
}

.module-tree-header .module-name {
  font-weight: 600;
  color: #111827;
  font-size: 15px;
}

.module-tree-header .module-code {
  background-color: #E5E7EB;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #6B7280;
}

.module-tree-header .module-perm-count {
  color: #9CA3AF;
  font-size: 13px;
  margin-left: auto;
}

.module-tree-header .module-actions {
  display: flex;
  gap: 8px;
}

.module-tree-children {
  background-color: #FFFFFF;
  padding: 12px 16px 12px 40px;
}

.no-permissions {
  color: #9CA3AF;
  font-size: 14px;
  padding: 12px 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.permission-tree-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: #F9FAFB;
  border-radius: 6px;
  margin-bottom: 8px;
}

.permission-tree-row:last-of-type {
  margin-bottom: 0;
}

.perm-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #0066CC;
}

.permission-tree-row .perm-name {
  font-weight: 500;
  color: #374151;
  min-width: 100px;
}

.permission-tree-row .perm-code {
  font-size: 12px;
  color: #9CA3AF;
  background-color: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
}

.perm-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.perm-type.menu {
  background-color: #DBEAFE;
  color: #1D4ED8;
}

.perm-type.button {
  background-color: #FEF3C7;
  color: #D97706;
}

.permission-tree-row .perm-action {
  color: #6B7280;
  font-size: 13px;
  min-width: 60px;
}

.permission-tree-row .perm-desc {
  color: #9CA3AF;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.permission-tree-row .perm-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.add-permission-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #E5E7EB;
}

.user-search-bar {
  margin-bottom: 24px;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.content-header .btn-sm {
  padding: 5px 12px;
  font-size: 13px;
}

.module-name {
  font-size: 12px;
  color: #6B7280;
}

/* Permission code style */
.perm-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #DC2626;
  background-color: #FEF2F2;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #FECACA;
}

/* Action badge styles */
.action-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.action-badge.view {
  background-color: #DBEAFE;
  color: #1D4ED8;
}

.action-badge.edit {
  background-color: #FEF3C7;
  color: #D97706;
}

.action-badge.export {
  background-color: #D1FAE5;
  color: #059669;
}

.action-badge.approve {
  background-color: #E0E7FF;
  color: #4F46E5;
}

.action-badge.delete {
  background-color: #FEE2E2;
  color: #DC2626;
}

.text-muted {
  color: #9CA3AF;
}

/* Toggle button group for inline editing */
.type-toggle-group {
  display: inline-flex;
  gap: 2px;
  background: #f5f7fa;
  padding: 3px;
  border-radius: 6px;
}

/* Combined type + action display */
.type-action-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  flex-wrap: nowrap;
}

.type-action-group .type-toggle,
.type-action-group .action-toggle {
  display: inline-flex;
  gap: 2px;
  background: #f5f7fa;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;
}

.type-action-group .sep {
  color: #909399;
  font-weight: bold;
  flex-shrink: 0;
}

.type-action-group .toggle-btn {
  padding: 4px 10px;
  font-size: 12px;
  min-width: 40px;
  text-align: center;
}

.toggle-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: #606266;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

.toggle-btn:hover:not(.active) {
  background: #e4e7ed;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 102, 204, 0.3);
}

/* Action-specific colors for active state */
.toggle-btn.view.active { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); }
.toggle-btn.edit.active { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); }
.toggle-btn.delete.active { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); }
.toggle-btn.export.active { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
.toggle-btn.approve.active { background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); }

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
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

/* Role Permission Config */
.config-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #FEF9C3;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #854D0E;
}

.tip-icon {
  font-size: 16px;
}

.permission-tree {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
}

.module-group {
  border-bottom: 1px solid #E5E7EB;
}

.module-group:last-child {
  border-bottom: none;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.module-icon {
  font-size: 18px;
}

.module-name {
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.module-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6B7280;
  cursor: pointer;
}

.permission-list {
  padding: 12px 16px;
}

.permission-item {
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: #F9FAFB;
  border-radius: 6px;
}

.permission-item:last-child {
  margin-bottom: 0;
}

.perm-check {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.perm-name {
  font-weight: 500;
  color: #374151;
}

.perm-code {
  font-size: 11px;
  color: #9CA3AF;
}

.perm-config {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #E5E7EB;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-item label {
  font-size: 13px;
  color: #6B7280;
}

.config-item select {
  padding: 4px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 13px;
}

.config-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

/* User Permission */
.permission-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #F9FAFB;
  border-radius: 8px;
}

.permission-section h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-tip {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 12px;
}

.role-perm-list,
.granted-perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.perm-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: white;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  font-size: 13px;
}

.perm-tag.temporary {
  border-color: #FCD34D;
  background-color: #FFFBEB;
}

.perm-module {
  color: #6B7280;
}

.perm-sep {
  color: #D1D5DB;
}

.perm-name {
  color: #374151;
  font-weight: 500;
}

.perm-scope {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.perm-scope.self {
  background-color: #DBEAFE;
  color: #1D4ED8;
}

.perm-scope.dept {
  background-color: #D1FAE5;
  color: #059669;
}

.perm-scope.plant {
  background-color: #FEF3C7;
  color: #D97706;
}

.perm-scope.all {
  background-color: #E0E7FF;
  color: #4F46E5;
}

.perm-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.perm-badge.temporary {
  background-color: #FCD34D;
  color: #854D0E;
}

.perm-revoke {
  margin-left: 8px;
  padding: 2px 8px;
  border: none;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.perm-revoke:hover {
  background-color: #FECACA;
}

.no-data {
  color: #9CA3AF;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
}

.empty-state p {
  font-size: 15px;
}

/* Dialog styles */
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

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="datetime-local"],
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
  min-height: 80px;
}

.form-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}

/* Tab 2: 权限定义 - 让表格区域占满空间 */
.tab-permissions {
  height: calc(100vh - 280px);
  min-height: 400px;
}

.tab-permissions .search-bar {
  margin-bottom: 16px;
}

.tab-permissions .el-table {
  flex: 1;
  overflow-y: auto;
}

/* Pagination - 固定在底部 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  margin-top: 0;
  border-top: 1px solid #EBEEF5;
  background: #fff;
  flex-shrink: 0;
}
</style>
