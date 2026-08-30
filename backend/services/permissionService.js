/**
 * 权限服务层
 * 处理权限相关的业务逻辑
 */

import pool from '../config/db.js';

// 模块代码到路由名的映射
const MODULE_TO_ROUTE_MAP = {
  'schedule': 'employee-schedule',
  'workstation': 'station-arrangement',
  'k045': 'k045',
  'da-material': 'da-material',
  'kpi-indicators': 'kpi-indicators',
  'cost-summary': 'cost-summary',
  'production-tracking': 'production-tracking',
  'bonus-evaluation': 'bonus-evaluation',
  'employee-roster': 'employee-roster',
  'leave-management': 'leave-management',
  'convenient-print': 'convenient-print',
  'organizational-structure': 'organizational-structure',
  'plant-management': 'plant-management',
  'department-management': 'department-management',
  'bin-volume-management': 'bin-volume-management',
  'expired-material-extension': 'expired-material-extension',
  '6s-management': '6s-management',
  'k2-diff-registration': 'k2-diff-registration',
  'announcement-management': 'announcement-management',
  'user-management': 'user-management',
  'role-management': 'role-management',
  'permission-management': 'permission-management',
  'dept-calc-rules-config': 'dept-calc-rules-config',
  'shift-duration-rules-config': 'shift-duration-rules-config',
  'smart-schedule-rules-config': 'smart-schedule-rules-config',
  'material-config': 'material-config',
  'pnc-transfer-config': 'pnc-transfer-config',
  'k2-diff-config': 'k2-diff-config',
  'workstation-config': 'workstation-config',
  'employee-hourly-rate-config': 'employee-hourly-rate-config',
  'welfare-base-config': 'welfare-base-config',
  'version-info': 'version-info',
  'api-docs': 'api-docs',
  'dashboard': 'dashboard',
  'stockroom-urgent-pull': 'stockroom-urgent-pull',
  'stockroom-urgent-pull-config': 'stockroom-urgent-pull-config',
};

class PermissionService {
  /**
   * 获取所有模块
   */
  async getAllModules() {
    const result = await pool.query(
      'SELECT * FROM jso_system_modules ORDER BY sort_order, id'
    );
    return result.rows;
  }

  /**
   * 获取模块详情
   */
  async getModuleByCode(code) {
    const result = await pool.query(
      'SELECT * FROM jso_system_modules WHERE code = $1',
      [code]
    );
    return result.rows[0];
  }

  /**
   * 创建模块
   */
  async createModule(moduleData) {
    const { code, name, icon, description, sort_order = 0 } = moduleData;
    const result = await pool.query(
      `INSERT INTO jso_system_modules (code, name, icon, description, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, name, icon, description, sort_order]
    );
    return result.rows[0];
  }

  /**
   * 更新模块
   */
  async updateModule(id, moduleData) {
    const { name, icon, description, sort_order } = moduleData;
    const result = await pool.query(
      `UPDATE jso_system_modules
       SET name = COALESCE($2, name),
           icon = COALESCE($3, icon),
           description = COALESCE($4, description),
           sort_order = COALESCE($5, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, name, icon, description, sort_order]
    );
    return result.rows[0];
  }

  /**
   * 删除模块（同时删除相关权限）
   */
  async deleteModule(id) {
    const result = await pool.query(
      'DELETE FROM jso_system_modules WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * 获取所有权限
   */
  async getAllPermissions() {
    const result = await pool.query(
      `SELECT p.*, m.name as module_name
       FROM jso_system_permissions p
       LEFT JOIN jso_system_modules m ON p.module = m.code
       ORDER BY m.sort_order, p.module, p.sort_order, p.id`
    );
    return result.rows;
  }

  /**
   * 获取权限详情
   */
  async getPermissionByCode(code) {
    const result = await pool.query(
      'SELECT * FROM jso_system_permissions WHERE code = $1',
      [code]
    );
    return result.rows[0];
  }

  /**
   * 获取某模块的所有权限
   */
  async getPermissionsByModule(module) {
    const result = await pool.query(
      'SELECT * FROM jso_system_permissions WHERE module = $1 ORDER BY sort_order, id',
      [module]
    );
    return result.rows;
  }

  /**
   * 创建权限
   */
  async createPermission(permData) {
    const { code, name, type = 'button', module, action, description, parent_id, sort_order = 0 } = permData;
    const result = await pool.query(
      `INSERT INTO jso_system_permissions (code, name, type, module, action, description, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [code, name, type, module, action, description, parent_id, sort_order]
    );
    return result.rows[0];
  }

  /**
   * 更新权限
   */
  async updatePermission(id, permData) {
    const { name, type, action, description, parent_id, sort_order } = permData;
    const result = await pool.query(
      `UPDATE jso_system_permissions
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           action = COALESCE($4, action),
           description = COALESCE($5, description),
           parent_id = COALESCE($6, parent_id),
           sort_order = COALESCE($7, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, name, type, action, description, parent_id, sort_order]
    );
    return result.rows[0];
  }

  /**
   * 删除权限
   */
  async deletePermission(id) {
    const result = await pool.query(
      'DELETE FROM jso_system_permissions WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * 获取角色的所有权限配置
   */
  async getRolePermissions(roleId) {
    const result = await pool.query(
      `SELECT rp.*, p.code, p.name as perm_name, p.module, p.action,
              m.name as module_name
       FROM jso_system_role_permissions rp
       JOIN jso_system_permissions p ON rp.permission_id = p.id
       LEFT JOIN jso_system_modules m ON p.module = m.code
       WHERE rp.role_id = $1
       ORDER BY m.sort_order, p.sort_order, p.id`,
      [roleId]
    );
    return result.rows;
  }

  /**
   * 更新角色的权限配置
   */
  async updateRolePermissions(roleId, permissions) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 删除现有权限
      await client.query(
        'DELETE FROM jso_system_role_permissions WHERE role_id = $1',
        [roleId]
      );

      // 批量插入新权限
      for (const perm of permissions) {
        await client.query(
          `INSERT INTO jso_system_role_permissions (role_id, permission_id, data_scope, can_edit)
           VALUES ($1, $2, $3, $4)`,
          [roleId, perm.permission_id, perm.data_scope || 'self', perm.can_edit || false]
        );
      }

      await client.query('COMMIT');

      // 返回更新后的权限
      return await this.getRolePermissions(roleId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户的所有权限（包括直接授予的和临时权限）
   */
  async getUserPermissions(userId) {
    const result = await pool.query(
      `SELECT up.*, p.code, p.name as perm_name, p.module, p.action,
              m.name as module_name,
              u.real_name as granted_by_name
       FROM jso_system_user_permissions up
       JOIN jso_system_permissions p ON up.permission_id = p.id
       LEFT JOIN jso_system_modules m ON p.module = m.code
       LEFT JOIN jso_system_user_management u ON up.granted_by = u.id
       WHERE up.user_id = $1
       ORDER BY m.sort_order, p.sort_order, p.id`,
      [userId]
    );
    return result.rows;
  }

  /**
   * 获取用户当前有效的临时权限
   */
  async getActiveTemporaryPermissions(userId) {
    const result = await pool.query(
      `SELECT up.*, p.code, p.name as perm_name, p.module, p.action,
              m.name as module_name
       FROM jso_system_user_permissions up
       JOIN jso_system_permissions p ON up.permission_id = p.id
       LEFT JOIN jso_system_modules m ON p.module = m.code
       WHERE up.user_id = $1
         AND up.is_temporary = true
         AND (up.start_time IS NULL OR up.start_time <= NOW())
         AND (up.end_time IS NULL OR up.end_time >= NOW())
       ORDER BY m.sort_order, p.sort_order, p.id`,
      [userId]
    );
    return result.rows;
  }

  /**
   * 授予用户权限
   */
  async grantUserPermission(userId, permId, grantedBy, permData = {}) {
    const { data_scope, can_edit, is_temporary = false, start_time, end_time, reason } = permData;

    const result = await pool.query(
      `INSERT INTO jso_system_user_permissions
       (user_id, permission_id, data_scope, can_edit, is_temporary, start_time, end_time, reason, granted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, permission_id)
       DO UPDATE SET
         data_scope = COALESCE($3, jso_system_user_permissions.data_scope),
         can_edit = COALESCE($4, jso_system_user_permissions.can_edit),
         is_temporary = COALESCE($5, jso_system_user_permissions.is_temporary),
         start_time = COALESCE($6, jso_system_user_permissions.start_time),
         end_time = COALESCE($7, jso_system_user_permissions.end_time),
         reason = COALESCE($8, jso_system_user_permissions.reason),
         granted_by = $9,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, permId, data_scope, can_edit, is_temporary, start_time, end_time, reason, grantedBy]
    );
    return result.rows[0];
  }

  /**
   * 撤销用户权限
   */
  async revokeUserPermission(userId, permId) {
    const result = await pool.query(
      'DELETE FROM jso_system_user_permissions WHERE user_id = $1 AND permission_id = $2 RETURNING *',
      [userId, permId]
    );
    return result.rows[0];
  }

  /**
   * 获取用户最终有效权限（权限检查时使用）
   * 优先级：临时权限 > 用户直接权限 > 角色权限
   */
  async getEffectivePermissions(userId) {
    // 获取用户信息
    const userResult = await pool.query(
      'SELECT * FROM jso_system_user_management WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return [];

    // 获取用户角色的权限
    const rolePerms = await pool.query(
      `SELECT rp.data_scope, rp.can_edit, p.code, p.module, p.action
       FROM jso_system_role_permissions rp
       JOIN jso_system_permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    // 构建权限映射（角色权限作为基础）
    const permMap = new Map();
    for (const rp of rolePerms.rows) {
      permMap.set(rp.code, {
        code: rp.code,
        module: rp.module,
        action: rp.action,
        dataScope: rp.data_scope,
        canEdit: rp.can_edit,
        source: 'role'
      });
    }

    // 获取用户直接权限（覆盖角色权限）
    const userPerms = await pool.query(
      `SELECT up.data_scope, up.can_edit, up.is_temporary, up.start_time, up.end_time, p.code, p.module, p.action
       FROM jso_system_user_permissions up
       JOIN jso_system_permissions p ON up.permission_id = p.id
       WHERE up.user_id = $1`,
      [userId]
    );

    for (const up of userPerms.rows) {
      const isActive = !up.is_temporary ||
        (up.start_time && up.end_time &&
         new Date(up.start_time) <= new Date() &&
         new Date(up.end_time) >= new Date());

      if (isActive) {
        permMap.set(up.code, {
          code: up.code,
          module: up.module,
          action: up.action,
          dataScope: up.data_scope || permMap.get(up.code)?.dataScope || 'self',
          canEdit: up.can_edit !== null ? up.can_edit : permMap.get(up.code)?.canEdit ?? false,
          source: up.is_temporary ? 'temporary' : 'user'
        });
      }
    }

    return Array.from(permMap.values());
  }

  /**
   * 检查用户是否有某权限
   */
  async checkPermission(userId, permissionCode) {
    const effectivePerms = await this.getEffectivePermissions(userId);
    return effectivePerms.find(p => p.code === permissionCode);
  }

  /**
   * 获取用户的菜单权限（用于前端菜单渲染，返回路由名）
   */
  async getUserMenuPermissions(userId) {
    const effectivePerms = await this.getEffectivePermissions(userId);
    // 返回用户有权限的所有模块，转换为路由名
    const routes = new Set();
    effectivePerms.forEach(p => {
      const routeName = MODULE_TO_ROUTE_MAP[p.module] || p.module;
      routes.add(routeName);
    });
    return Array.from(routes);
  }

  /**
   * 记录权限变更日志
   */
  async logPermissionChange(logData) {
    const {
      operator_id,
      target_user_id,
      target_role_id,
      action,
      permission_id,
      old_value,
      new_value,
      reason
    } = logData;

    const result = await pool.query(
      `INSERT INTO jso_system_permission_logs
       (operator_id, target_user_id, target_role_id, action, permission_id, old_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        operator_id,
        target_user_id,
        target_role_id,
        action,
        permission_id,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        reason
      ]
    );
    return result.rows[0];
  }

  /**
   * 获取权限变更日志
   */
  async getPermissionLogs(filters = {}) {
    const { target_user_id, target_role_id, operator_id, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT l.*,
             u1.real_name as operator_name,
             u2.real_name as target_user_name,
             r.name as target_role_name,
             p.code as permission_code,
             p.name as permission_name
      FROM jso_system_permission_logs l
      LEFT JOIN jso_system_user_management u1 ON l.operator_id = u1.id
      LEFT JOIN jso_system_user_management u2 ON l.target_user_id = u2.id
      LEFT JOIN jso_system_role_management r ON l.target_role_id = r.id
      LEFT JOIN jso_system_permissions p ON l.permission_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (target_user_id) {
      query += ` AND l.target_user_id = $${paramIndex++}`;
      params.push(target_user_id);
    }
    if (target_role_id) {
      query += ` AND l.target_role_id = $${paramIndex++}`;
      params.push(target_role_id);
    }
    if (operator_id) {
      query += ` AND l.operator_id = $${paramIndex++}`;
      params.push(operator_id);
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 应用数据范围过滤（供各模块调用）
   * @param {string} scope - 数据范围：self, dept, plant, all
   * @param {object} user - 用户对象，包含 id, department_id, plant_id
   * @param {string} tableAlias - 表别名
   * @returns {object} - 过滤条件
   */
  buildDataScopeCondition(scope, user, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    const conditions = [];
    const params = [];

    switch (scope) {
      case 'self':
        conditions.push(`${prefix}employee_id = $1`);
        params.push(user.id);
        break;
      case 'dept':
        conditions.push(`${prefix}department_id = $1`);
        params.push(user.department_id);
        break;
      case 'plant':
        conditions.push(`${prefix}plant_id = $1`);
        params.push(user.plant_id);
        break;
      case 'all':
        // 不添加任何过滤条件
        break;
    }

    return { condition: conditions.join(' AND '), params };
  }

  /**
   * 获取用户管辖范围内的用户列表（用于权限授予限制）
   */
  async getManageableUsers(managerId) {
    const managerResult = await pool.query(
      'SELECT * FROM jso_system_user_management WHERE id = $1',
      [managerId]
    );
    const manager = managerResult.rows[0];
    if (!manager) return [];

    // 获取管理员的角色
    const roleResult = await pool.query(
      'SELECT * FROM jso_system_role_management WHERE id = $1',
      [manager.role_id]
    );
    const role = roleResult.rows[0];
    if (!role) return [];

    let query = 'SELECT * FROM jso_system_user_management WHERE 1=1 AND id != $1';
    const params = [managerId];

    // 根据角色确定可管理范围
    switch (role.name) {
      case '超级管理员':
        // 超级管理员可以管理所有用户
        break;
      case '厂区管理员':
        // 厂区管理员可以管理其厂区内的所有用户
        query += ' AND plant_id = $2';
        params.push(manager.plant_id);
        break;
      case '部门管理员':
        // 部门管理员只能管理其部门的用户
        query += ' AND department_id = $2';
        params.push(manager.department_id);
        break;
      default:
        // 其他角色可以管理其部门的用户
        if (manager.department_id) {
          query += ' AND department_id = $2';
          params.push(manager.department_id);
        } else {
          return [];
        }
        break;
    }

    query += ' ORDER BY real_name';
    const result = await pool.query(query, params);
    return result.rows;
  }
}

export default new PermissionService();
