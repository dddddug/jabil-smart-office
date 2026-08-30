/**
 * 权限管理 Composable
 * 提供权限相关的状态和操作方法
 * 注意：这些状态在模块级别定义，确保在所有组件间共享
 */

import { ref, computed } from 'vue';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

// 模块级别的状态 - 确保所有组件共享同一个状态
const modules = ref<Module[]>([]);
const permissions = ref<Permission[]>([]);
const effectivePermissions = ref<EffectivePermission[]>([]);
const userMenuPermissions = ref<string[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

export interface Permission {
  id: number;
  code: string;
  name: string;
  type: 'menu' | 'button' | 'module';
  module: string;
  action: string;
  description: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  data_scope: 'self' | 'dept' | 'plant' | 'all';
  can_edit: boolean;
  code: string;
  perm_name: string;
  module: string;
  action: string;
  module_name: string;
}

export interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  data_scope: 'self' | 'dept' | 'plant' | 'all';
  can_edit: boolean;
  is_temporary: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  granted_by: number;
  granted_by_name: string;
  created_at: string;
  updated_at: string;
  code: string;
  perm_name: string;
  module: string;
  action: string;
  module_name: string;
}

export interface EffectivePermission {
  code: string;
  module: string;
  action: string;
  dataScope: 'self' | 'dept' | 'plant' | 'all';
  canEdit: boolean;
  source: 'role' | 'user' | 'temporary';
}

export interface PermissionLog {
  id: number;
  operator_id: number;
  target_user_id: number | null;
  target_role_id: number | null;
  action: string;
  permission_id: number | null;
  old_value: any;
  new_value: any;
  reason: string | null;
  created_at: string;
  operator_name: string;
  target_user_name: string | null;
  target_role_name: string | null;
  permission_code: string | null;
  permission_name: string | null;
}

export function usePermission() {
  // 计算属性：按模块分组的权限
  const permissionsByModule = computed(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.value.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module]!.push(perm);
    });
    return grouped;
  });

  // 加载所有模块
  const loadModules = async () => {
    try {
      loading.value = true;
      const res: any = await request.get<Module[]>('/permissions/modules');
      // axios 拦截器返回 { code, message, data: [...] }
      modules.value = res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载模块失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
    } finally {
      loading.value = false;
    }
  };

  // 加载所有权限
  const loadPermissions = async () => {
    try {
      loading.value = true;
      const res: any = await request.get<Permission[]>('/permissions');
      // axios 拦截器返回 { code, message, data: [...] }
      permissions.value = res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
    } finally {
      loading.value = false;
    }
  };

  // 加载当前用户的有效权限（防止重复加载）
  const loadEffectivePermissions = async () => {
    // 如果已经有数据，直接返回
    if (userMenuPermissions.value.length > 0) {
      return;
    }
    // 如果正在加载中，等待加载完成
    if (loading.value) {
      // 等待一小段时间让其他调用完成
      await new Promise(resolve => setTimeout(resolve, 100));
      // 再次检查是否已有数据
      if (userMenuPermissions.value.length > 0) {
        return;
      }
    }
    try {
      loading.value = true;
      const response = await request.get<{
        code: number;
        message: string;
        data: {
          permissions: EffectivePermission[];
          modules: string[];
        };
      }>('/permissions/effective/me');
      effectivePermissions.value = response?.data?.permissions || [];
      userMenuPermissions.value = response?.data?.modules || [];
    } catch (err: any) {
      error.value = err?.message || '加载有效权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
    } finally {
      loading.value = false;
    }
  };

  // 获取角色的权限配置
  const loadRolePermissions = async (roleId: number): Promise<RolePermission[]> => {
    try {
      loading.value = true;
      const res: any = await request.get<RolePermission[]>(`/permissions/roles/${roleId}`);
      // axios 拦截器返回 { code, message, data: [...] }
      return res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载角色权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 更新角色的权限配置
  const updateRolePermissions = async (roleId: number, permissions: any[], logReason?: string) => {
    try {
      loading.value = true;
      await request.put(`/permissions/roles/${roleId}`, {
        permissions,
        log_reason: logReason
      });
      ElMessage.success({ message: '角色权限更新成功', showClose: true, duration: 3000 });
      return true;
    } catch (err: any) {
      error.value = err?.message || '更新角色权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 获取用户的权限配置
  const loadUserPermissions = async (userId: number): Promise<UserPermission[]> => {
    try {
      loading.value = true;
      const res: any = await request.get<UserPermission[]>(`/permissions/users/${userId}`);
      // axios 拦截器返回 { code, message, data: [...] }
      return res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载用户权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 授予用户权限
  const grantUserPermission = async (
    userId: number,
    permissionId: number,
    options: {
      data_scope?: 'self' | 'dept' | 'plant' | 'all';
      can_edit?: boolean;
      is_temporary?: boolean;
      start_time?: string;
      end_time?: string;
      reason?: string;
    }
  ) => {
    try {
      loading.value = true;
      await request.post(`/permissions/users/${userId}`, {
        permission_id: permissionId,
        ...options
      });
      ElMessage.success({ message: '权限授予成功', showClose: true, duration: 3000 });
      return true;
    } catch (err: any) {
      error.value = err?.message || '授予权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 撤销用户权限
  const revokeUserPermission = async (userId: number, permissionId: number) => {
    try {
      loading.value = true;
      await request.delete(`/permissions/users/${userId}/${permissionId}`);
      ElMessage.success({ message: '权限撤销成功', showClose: true, duration: 3000 });
      return true;
    } catch (err: any) {
      error.value = err?.message || '撤销权限失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 获取可管理的用户列表
  const loadManageableUsers = async (): Promise<any[]> => {
    try {
      loading.value = true;
      const res: any = await request.get<any[]>('/permissions/manageable-users');
      // axios 拦截器返回 { code, message, data: [...] }
      return res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载可管理用户失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 获取权限变更日志
  const loadPermissionLogs = async (filters: {
    target_user_id?: number;
    target_role_id?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<PermissionLog[]> => {
    try {
      loading.value = true;
      const res: any = await request.get<PermissionLog[]>('/permissions/logs', { params: filters });
      // axios 拦截器返回 { code, message, data: [...] }
      return res?.data || res || [];
    } catch (err: any) {
      error.value = err?.message || '加载权限日志失败';
      ElMessage.error({ message: error.value || '操作失败', showClose: true, duration: 3000 });
      return [];
    } finally {
      loading.value = false;
    }
  };

  // 检查用户是否有某权限
  const hasPermission = (permissionCode: string): boolean => {
    return effectivePermissions.value.some(p => p.code === permissionCode);
  };

  // 检查用户是否有某权限且可编辑
  const canEditPermission = (permissionCode: string): boolean => {
    const perm = effectivePermissions.value.find(p => p.code === permissionCode);
    return !!perm && perm.canEdit;
  };

  // 获取某模块的数据范围
  const getDataScope = (module: string): 'self' | 'dept' | 'plant' | 'all' => {
    const perm = effectivePermissions.value.find(p => p.module === module);
    return perm?.dataScope || 'self';
  };

  // 获取某权限的数据范围
  const getPermissionDataScope = (permissionCode: string): 'self' | 'dept' | 'plant' | 'all' => {
    const perm = effectivePermissions.value.find(p => p.code === permissionCode);
    return perm?.dataScope || 'self';
  };

  // 检查用户是否有某模块的访问权限
  const hasModulePermission = (moduleCode: string): boolean => {
    return userMenuPermissions.value.includes(moduleCode);
  };

  // 数据范围标签映射
  const dataScopeLabels: Record<string, string> = {
    self: '本人',
    dept: '部门',
    plant: '厂区',
    all: '全部'
  };

  // 获取数据范围标签
  const getDataScopeLabel = (scope: string): string => {
    return dataScopeLabels[scope] || scope;
  };

  return {
    // 状态
    modules,
    permissions,
    effectivePermissions,
    userMenuPermissions,
    loading,
    error,
    permissionsByModule,

    // 方法
    loadModules,
    loadPermissions,
    loadEffectivePermissions,
    loadRolePermissions,
    updateRolePermissions,
    loadUserPermissions,
    grantUserPermission,
    revokeUserPermission,
    loadManageableUsers,
    loadPermissionLogs,
    hasPermission,
    canEditPermission,
    getDataScope,
    getPermissionDataScope,
    hasModulePermission,
    getDataScopeLabel,
    dataScopeLabels
  };
}
