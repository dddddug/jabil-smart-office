/**
 * 权限管理路由
 * 提供权限相关的 API 接口
 */

import express from 'express';
const router = express.Router();
import permissionService from '../services/permissionService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';

// ============================================
// 模块管理 API
// ============================================

/**
 * 获取所有模块
 * GET /api/permissions/modules
 */
router.get('/modules', authenticateToken, async (req, res) => {
  try {
    const modules = await permissionService.getAllModules();
    res.json({ code: 200, message: 'success', data: modules });
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.status(500).json({ code: 500, message: '获取模块列表失败' });
  }
});

/**
 * 创建模块
 * POST /api/permissions/modules
 */
router.post('/modules', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const module = await permissionService.createModule(req.body);
    res.json({ code: 200, message: 'success', data: module });
  } catch (error) {
    console.error('创建模块失败:', error);
    res.status(500).json({ code: 500, message: '创建模块失败' });
  }
});

/**
 * 更新模块
 * PUT /api/permissions/modules/:id
 */
router.put('/modules/:id', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const module = await permissionService.updateModule(req.params.id, req.body);
    res.json({ code: 200, message: 'success', data: module });
  } catch (error) {
    console.error('更新模块失败:', error);
    res.status(500).json({ code: 500, message: '更新模块失败' });
  }
});

/**
 * 删除模块
 * DELETE /api/permissions/modules/:id
 */
router.delete('/modules/:id', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const module = await permissionService.deleteModule(req.params.id);
    res.json({ code: 200, message: 'success', data: module });
  } catch (error) {
    console.error('删除模块失败:', error);
    res.status(500).json({ code: 500, message: '删除模块失败' });
  }
});

// ============================================
// 权限定义 API
// ============================================

/**
 * 获取所有权限
 * GET /api/permissions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const permissions = await permissionService.getAllPermissions();
    res.json({ code: 200, message: 'success', data: permissions });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({ code: 500, message: '获取权限列表失败' });
  }
});

/**
 * 创建权限
 * POST /api/permissions
 */
router.post('/', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const permission = await permissionService.createPermission(req.body);
    res.json({ code: 200, message: 'success', data: permission });
  } catch (error) {
    console.error('创建权限失败:', error);
    res.status(500).json({ code: 500, message: '创建权限失败' });
  }
});

/**
 * 更新权限
 * PUT /api/permissions/:id
 */
router.put('/:id', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const permission = await permissionService.updatePermission(req.params.id, req.body);
    res.json({ code: 200, message: 'success', data: permission });
  } catch (error) {
    console.error('更新权限失败:', error);
    res.status(500).json({ code: 500, message: '更新权限失败' });
  }
});

/**
 * 删除权限
 * DELETE /api/permissions/:id
 */
router.delete('/:id', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const permission = await permissionService.deletePermission(req.params.id);
    res.json({ code: 200, message: 'success', data: permission });
  } catch (error) {
    console.error('删除权限失败:', error);
    res.status(500).json({ code: 500, message: '删除权限失败' });
  }
});

// ============================================
// 角色权限配置 API
// ============================================

/**
 * 获取角色的权限配置
 * GET /api/permissions/roles/:roleId
 */
router.get('/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const permissions = await permissionService.getRolePermissions(req.params.roleId);
    res.json({ code: 200, message: 'success', data: permissions });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({ code: 500, message: '获取角色权限失败' });
  }
});

/**
 * 更新角色的权限配置
 * PUT /api/permissions/roles/:roleId
 */
router.put('/roles/:roleId', authenticateToken, authorize(['super_admin']), async (req, res) => {
  try {
    const { permissions, log_reason } = req.body;
    const roleId = parseInt(req.params.roleId);

    // 记录日志
    await permissionService.logPermissionChange({
      operator_id: req.user.id,
      target_role_id: roleId,
      action: 'update',
      new_value: { permissions },
      reason: log_reason
    });

    // 更新权限
    const updatedPermissions = await permissionService.updateRolePermissions(roleId, permissions);
    res.json({ code: 200, message: 'success', data: updatedPermissions });
  } catch (error) {
    console.error('更新角色权限失败:', error);
    res.status(500).json({ code: 500, message: '更新角色权限失败' });
  }
});

// ============================================
// 用户权限管理 API
// ============================================

/**
 * 获取用户的权限配置（包括临时权限）
 * GET /api/permissions/users/:userId
 */
router.get('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const permissions = await permissionService.getUserPermissions(req.params.userId);
    res.json({ code: 200, message: 'success', data: permissions });
  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({ code: 500, message: '获取用户权限失败' });
  }
});

/**
 * 授予用户权限
 * POST /api/permissions/users/:userId
 */
router.post('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const { permission_id, data_scope, can_edit, is_temporary, start_time, end_time, reason } = req.body;

    // 验证权限授予者是否有权限授予
    const manageableUsers = await permissionService.getManageableUsers(req.user.id);
    const canGrant = req.user.role_id === 1 || // 超级管理员
                     manageableUsers.some(u => u.id === targetUserId);

    if (!canGrant) {
      return res.status(403).json({ code: 403, message: '您没有权限授予该用户' });
    }

    // 授予权限
    const granted = await permissionService.grantUserPermission(
      targetUserId,
      permission_id,
      req.user.id,
      { data_scope, can_edit, is_temporary, start_time, end_time, reason }
    );

    // 记录日志
    await permissionService.logPermissionChange({
      operator_id: req.user.id,
      target_user_id: targetUserId,
      permission_id,
      action: is_temporary ? 'temporary_grant' : 'grant',
      new_value: { data_scope, can_edit, is_temporary, start_time, end_time, reason }
    });

    res.json({ code: 200, message: 'success', data: granted });
  } catch (error) {
    console.error('授予用户权限失败:', error);
    res.status(500).json({ code: 500, message: '授予用户权限失败' });
  }
});

/**
 * 撤销用户权限
 * DELETE /api/permissions/users/:userId/:permissionId
 */
router.delete('/users/:userId/:permissionId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const permissionId = parseInt(req.params.permissionId);

    // 验证权限授予者是否有权限撤销
    const manageableUsers = await permissionService.getManageableUsers(req.user.id);
    const canRevoke = req.user.role_id === 1 || // 超级管理员
                      manageableUsers.some(u => u.id === targetUserId);

    if (!canRevoke) {
      return res.status(403).json({ code: 403, message: '您没有权限撤销该用户' });
    }

    // 获取被撤销的权限信息（用于日志）
    const userPerms = await permissionService.getUserPermissions(targetUserId);
    const permInfo = userPerms.find(p => p.permission_id === permissionId);

    // 撤销权限
    const revoked = await permissionService.revokeUserPermission(targetUserId, permissionId);

    // 记录日志
    if (permInfo) {
      await permissionService.logPermissionChange({
        operator_id: req.user.id,
        target_user_id: targetUserId,
        permission_id: permissionId,
        action: permInfo.is_temporary ? 'temporary_revoke' : 'revoke',
        old_value: permInfo
      });
    }

    res.json({ code: 200, message: 'success', data: revoked });
  } catch (error) {
    console.error('撤销用户权限失败:', error);
    res.status(500).json({ code: 500, message: '撤销用户权限失败' });
  }
});

// ============================================
// 有效权限 API（供前端使用）
// ============================================

/**
 * 获取当前用户的有效权限
 * GET /api/permissions/effective/me
 */
router.get('/effective/me', authenticateToken, async (req, res) => {
  try {
    const effectivePermissions = await permissionService.getEffectivePermissions(req.user.id);
    const menuPermissions = await permissionService.getUserMenuPermissions(req.user.id);
    res.json({
      code: 200,
      message: 'success',
      data: {
        permissions: effectivePermissions,
        modules: menuPermissions
      }
    });
  } catch (error) {
    console.error('获取有效权限失败:', error);
    res.status(500).json({ code: 500, message: '获取有效权限失败' });
  }
});

/**
 * 检查权限
 * POST /api/permissions/check
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { permission_code } = req.body;
    const result = await permissionService.checkPermission(req.user.id, permission_code);
    res.json({
      code: 200,
      message: 'success',
      data: {
        hasPermission: !!result,
        ...result
      }
    });
  } catch (error) {
    console.error('检查权限失败:', error);
    res.status(500).json({ code: 500, message: '检查权限失败' });
  }
});

// ============================================
// 权限日志 API
// ============================================

/**
 * 获取权限变更日志
 * GET /api/permissions/logs
 */
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { target_user_id, target_role_id, limit, offset } = req.query;
    const logs = await permissionService.getPermissionLogs({
      target_user_id: target_user_id ? parseInt(target_user_id) : undefined,
      target_role_id: target_role_id ? parseInt(target_role_id) : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    });
    res.json({ code: 200, message: 'success', data: logs });
  } catch (error) {
    console.error('获取权限日志失败:', error);
    res.status(500).json({ code: 500, message: '获取权限日志失败' });
  }
});

// ============================================
// 可管理用户 API
// ============================================

/**
 * 获取当前用户可管理的用户列表
 * GET /api/permissions/manageable-users
 */
router.get('/manageable-users', authenticateToken, async (req, res) => {
  try {
    const users = await permissionService.getManageableUsers(req.user.id);
    res.json({ code: 200, message: 'success', data: users });
  } catch (error) {
    console.error('获取可管理用户失败:', error);
    res.status(500).json({ code: 500, message: '获取可管理用户失败' });
  }
});

export default router;
