/**
 * 用户控制器
 * 处理用户相关的业务逻辑
 */
import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { USER_TABLE, ROLE_TABLE, PLANT_TABLE, DEPT_TABLE, JSO_JWT_BLACKLIST_TABLE } from '../config/db_constants.js';
import { success, created, error as httpError, paginated, batchResult } from '../utils/responseHelper.js';
import { AppError, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../middlewares/errorHandler.js';
import { logInfo, logWarn, logError, logUserAction } from '../utils/logger.js';
import { notifyUser, notifyDepartment, createNotification, getUserIdsByDepartment } from '../utils/notificationHelper.js';

/**
 * 获取当前登录用户信息
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user) {
      throw UnauthorizedError('用户未认证');
    }
    success(res, { user: req.user }, '获取当前用户信息成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 用户登录
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw BadRequestError('用户名和密码不能为空');
    }

    // 1. 查找用户
    const userResult = await pool.query(`
      SELECT
        u.*,
        r.name as role_name,
        p.name as plant_name,
        d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${ROLE_TABLE} r ON u.role_id = r.id
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      WHERE u.username = $1
    `, [username]);
    const user = userResult.rows[0];

    if (!user) {
      logWarn('用户登录失败 - 用户不存在', { username, ip: req.ip });
      throw UnauthorizedError('用户名或密码不正确');
    }

    // 2. 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logWarn('用户登录失败 - 密码错误', { username, ip: req.ip });
      throw UnauthorizedError('用户名或密码不正确');
    }

    // 3. 检查用户状态
    if (user.status !== 'active') {
      logWarn('用户登录失败 - 账户已禁用', { username, ip: req.ip });
      throw ForbiddenError('账户已被禁用，请联系管理员');
    }

    // 4. 生成 JWT
    const payload = {
      id: user.id,
      username: user.username,
      roleId: user.role_id,
      plantId: user.plant_id,
      departmentId: user.department_id,
      jti: uuidv4(),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '4h'
    });

    // 5. 更新登录次数和最后登录时间
    await pool.query(
      `UPDATE ${USER_TABLE} SET login_count = COALESCE(login_count, 0) + 1, last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // 6. 获取关联名称（使用已有的查询结果）
    const roleName = user.role_name || '';
    const plantName = user.plant_name || '';
    const departmentName = user.department_name || '';

    logInfo('用户登录成功', { userId: user.id, username: user.username, ip: req.ip });

    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        employeeId: user.employee_id,
        roleId: user.role_id,
        roleName,
        plantId: user.plant_id,
        plantName,
        departmentId: user.department_id,
        departmentName,
        status: user.status,
        gender: user.gender,
        position: user.position,
        level: user.level,
        phone: user.phone,
        email: user.email,
        hireDate: user.hire_date,
        leaveDate: user.leave_date,
        icCardNumber: user.ic_card_number,
        employeeType: user.employee_type,
        loginCount: user.login_count || 0,
        createdAt: dayjs(user.created_at).format('YYYY-MM-DD'),
        mustChangePassword: user.must_change_password || false,
        hasSecurityQuestion: !!user.security_question,
      },
    }, '登录成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 用户登出
 */
export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw BadRequestError('未提供 Token');
    }

    const decodedToken = jwt.decode(token);

    if (!decodedToken || !decodedToken.jti || !decodedToken.exp) {
      throw BadRequestError('无效的 Token 或缺少 JTI/EXP 信息');
    }

    const { jti, exp } = decodedToken;
    const expDate = new Date(exp * 1000);

    // 将 JWT 的 jti 和过期时间添加到黑名单
    await pool.query(
      `INSERT INTO ${JSO_JWT_BLACKLIST_TABLE} (jti, exp) VALUES ($1, $2) ON CONFLICT (jti) DO UPDATE SET exp = EXCLUDED.exp`,
      [jti, expDate]
    );

    logInfo('用户登出成功', { userId: req.user?.id, username: req.user?.username });
    success(res, null, '登出成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取所有用户列表
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 100, status, plantId, departmentId, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    // 获取当前用户的数据范围权限
    const currentUser = req.user;
    let userDataScope = 'all'; // 默认为全部权限
    try {
      const permissionService = (await import('../services/permissionService.js')).default;
      const effectivePerms = await permissionService.getEffectivePermissions(currentUser.id);
      // 查找用户花名册相关的权限，使用第一个找到的数据范围
      const rosterPerm = effectivePerms.find(p => p.module === 'employee-roster');
      if (rosterPerm) {
        userDataScope = rosterPerm.dataScope || 'self';
      }
    } catch (permErr) {
      console.error('获取用户数据范围失败:', permErr);
    }

    // 根据数据范围应用过滤条件
    if (userDataScope === 'self') {
      // 只看自己
      whereClause += ` AND u.id = $${paramIndex++}`;
      params.push(currentUser.id);
    } else if (userDataScope === 'dept') {
      // 看自己部门的人
      whereClause += ` AND u.department_id = $${paramIndex++}`;
      params.push(currentUser.departmentId);
    } else if (userDataScope === 'plant') {
      // 看自己厂区的人
      whereClause += ` AND u.plant_id = $${paramIndex++}`;
      params.push(currentUser.plantId);
    }
    // 'all' 不添加过滤条件

    if (status) {
      whereClause += ` AND u.status = $${paramIndex++}`;
      params.push(status);
    }
    if (plantId) {
      whereClause += ` AND u.plant_id = $${paramIndex++}`;
      params.push(parseInt(plantId));
    }
    if (departmentId) {
      whereClause += ` AND u.department_id = $${paramIndex++}`;
      params.push(parseInt(departmentId));
    }
    if (search) {
      whereClause += ` AND (u.real_name LIKE $${paramIndex} OR u.username LIKE $${paramIndex} OR u.employee_id LIKE $${paramIndex} OR u.old_employee_id LIKE $${paramIndex} OR u.sap_employee_id LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ${USER_TABLE} u WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 获取数据
    const result = await pool.query(`
      SELECT u.*, r.name as role_name, p.name as plant_name, d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${ROLE_TABLE} r ON u.role_id = r.id
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      WHERE ${whereClause}
      ORDER BY u.id
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, parseInt(pageSize), offset]);

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      realName: row.real_name,
      employeeId: row.employee_id,
      sapEmployeeId: row.employee_id,
      oldEmployeeId: row.old_employee_id,
      roleId: row.role_id,
      roleName: row.role_name,
      plantId: row.plant_id,
      plantName: row.plant_name,
      departmentId: row.department_id,
      departmentName: row.department_name,
      status: row.status,
      gender: row.gender,
      position: row.position,
      level: row.level,
      phone: row.phone,
      email: row.email,
      hireDate: row.hire_date,
      leaveDate: row.leave_date,
      icCardNumber: row.ic_card_number,
      employeeType: row.employee_type,
      loginCount: row.login_count || 0,
      createdAt: dayjs(row.created_at).format('YYYY-MM-DD')
    }));

    paginated(res, { items: users, total, page: parseInt(page), pageSize: parseInt(pageSize) }, '获取成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 获取审批人列表
 */
export const getApprovers = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.real_name, u.role_id, r.name as role_name, u.plant_id, u.department_id
      FROM ${USER_TABLE} u
      LEFT JOIN ${ROLE_TABLE} r ON u.role_id = r.id
      WHERE u.role_id IN (2, 3) AND u.status = 'active'
      ORDER BY u.real_name
    `);
    const approvers = result.rows.map(row => ({
      id: row.id,
      name: row.real_name,
      roleId: row.role_id,
      roleName: row.role_name,
      plantId: row.plant_id,
      departmentId: row.department_id
    }));
    success(res, { approvers }, '获取审批人列表成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 创建用户
 */
export const createUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    let { username, realName, employeeId, oldEmployeeId, roleId, plantId, departmentId, status, gender, position, level, phone, email, hireDate, leaveDate, icCardNumber, employeeType } = req.body;

    // Normalize integer fields to null if they are empty strings or undefined
    roleId = (roleId === '' || roleId === undefined) ? null : roleId;
    plantId = (plantId === '' || plantId === undefined) ? null : plantId;
    departmentId = (departmentId === '' || departmentId === undefined) ? null : departmentId;

    // Process dates: convert empty strings to null for database
    const processedHireDate = hireDate || null;
    const processedLeaveDate = leaveDate || null;

    // 处理状态：如果有离职日期，强制状态为inactive
    const hasLeaveDate = processedLeaveDate !== null;
    const finalStatus = hasLeaveDate ? 'inactive' : (status || 'active');

    // 检查用户名是否已存在
    const usernameCheck = await client.query(
      `SELECT id FROM ${USER_TABLE} WHERE username = $1`,
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      throw BadRequestError('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO ${USER_TABLE} (username, password, real_name, employee_id, old_employee_id, role_id, plant_id, department_id, status, gender, position, level, phone, email, hire_date, leave_date, ic_card_number, employee_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [username, hashedPassword, realName, employeeId, oldEmployeeId, roleId, plantId, departmentId, finalStatus, gender, position, level, phone, email, processedHireDate, processedLeaveDate, icCardNumber, employeeType]
    );
    const newUser = result.rows[0];

    await client.query('COMMIT');

    // 获取关联名称
    const [roleResult, plantResult, deptResult] = await Promise.all([
      roleId ? pool.query(`SELECT name FROM ${ROLE_TABLE} WHERE id = $1`, [roleId]) : { rows: [] },
      plantId ? pool.query(`SELECT name FROM ${PLANT_TABLE} WHERE id = $1`, [plantId]) : { rows: [] },
      departmentId ? pool.query(`SELECT name FROM ${DEPT_TABLE} WHERE id = $1`, [departmentId]) : { rows: [] }
    ]);

    logInfo('创建用户成功', { userId: newUser.id, username, createdBy: req.user?.username });
    logUserAction(req.user?.id, req.user?.username, 'create_user', { targetUserId: newUser.id, targetUsername: username });

    // 通知新创建的用户
    await notifyUser(pool, newUser.real_name, '👤',
      '【账号通知】您的账号已创建',
      `您的账号已创建，用户名：${username}，默认密码：123456，请及时登录修改密码。`,
      'user',
      { userId: newUser.id, username }
    );

    // 通知部门成员
    if (departmentId) {
      await notifyDepartment(pool, departmentId, '👥',
        '【部门通知】新成员加入',
        `部门新成员 ${realName} (${username}) 已加入。`,
        'user',
        { userId: newUser.id, username, realName }
      );
    }

    created(res, {
      id: newUser.id,
      username: newUser.username,
      realName: newUser.real_name,
      employeeId: newUser.employee_id,
      oldEmployeeId: newUser.old_employee_id,
      roleId: newUser.role_id,
      roleName: roleResult.rows[0]?.name || '',
      plantId: newUser.plant_id,
      plantName: plantResult.rows[0]?.name || '',
      departmentId: newUser.department_id,
      departmentName: deptResult.rows[0]?.name || '',
      status: newUser.status,
      gender: newUser.gender,
      position: newUser.position,
      level: newUser.level,
      phone: newUser.phone,
      email: newUser.email,
      hireDate: newUser.hire_date,
      leaveDate: newUser.leave_date,
      icCardNumber: newUser.ic_card_number,
      employeeType: newUser.employee_type,
      createdAt: dayjs(newUser.created_at).format('YYYY-MM-DD')
    }, '创建用户成功');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * 批量导入用户
 */
export const batchImportUsers = async (req, res, next) => {
  const client = await pool.connect();
  let successCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const errors = [];
  const successItems = [];
  const failed = [];

  try {
    await client.query('BEGIN');

    const usersToImport = req.body.users;

    if (!Array.isArray(usersToImport) || usersToImport.length === 0) {
      throw BadRequestError('请求体中缺少用户数组或用户数组为空');
    }

    // 查找"普通员工"角色的ID
    let defaultRoleId = null;
    const roleResult = await client.query(`SELECT id FROM ${ROLE_TABLE} WHERE name = $1`, ['普通员工']);
    if (roleResult.rows.length > 0) {
      defaultRoleId = roleResult.rows[0].id;
    }

    // Helper function to check if a value has changed
    const hasValueChanged = (newVal, oldVal) => {
      if (newVal === undefined) {
        return false;
      }
      const normalizedNew = (newVal === null || String(newVal).trim() === '') ? null : String(newVal).trim();
      const normalizedOld = (oldVal === undefined || oldVal === null || String(oldVal).trim() === '') ? null : String(oldVal).trim();
      return normalizedNew !== normalizedOld;
    };

    for (let i = 0; i < usersToImport.length; i++) {
      const user = usersToImport[i];
      try {
        await client.query(`SAVEPOINT savepoint_${i}`);

        // Validate required fields for identification
        if (!user.realName || !user.oldEmployeeId) {
          failedCount++;
          errors.push({ index: i + 1, username: user.username || '未知', error: '姓名和旧工号为必填项' });
          failed.push({ index: i + 1, username: user.username || '未知', error: '姓名和旧工号为必填项' });
          await client.query(`ROLLBACK TO SAVEPOINT savepoint_${i}`);
          continue;
        }

        // Process dates: convert empty strings to null for database
        const processedHireDate = user.hireDate || null;
        const processedLeaveDate = user.leaveDate || null;

        // 处理状态：如果有离职日期，强制状态为inactive
        const hasLeaveDate = processedLeaveDate !== null;
        const finalStatus = hasLeaveDate ? 'inactive' : (user.status || 'active');

        // 1. Try to find an existing user based on real_name AND old_employee_id
        const existingUserResult = await client.query(
          `SELECT * FROM ${USER_TABLE} WHERE real_name = $1 AND old_employee_id = $2`,
          [user.realName, user.oldEmployeeId]
        );

        if (existingUserResult.rows.length > 0) {
          // User found -> UPDATE existing record
          const existing = existingUserResult.rows[0];
          const existingId = existing.id;

          const updateFields = [];
          const updateParams = [];
          let paramIndex = 1;

          // Only update fields that have changed
          if (hasValueChanged(user.username, existing.username) && user.username !== undefined) {
            // Before updating username, check if new username already exists for another user
            const usernameConflictCheck = await client.query(
              `SELECT id FROM ${USER_TABLE} WHERE username = $1 AND id != $2`,
              [user.username, existingId]
            );
            if (usernameConflictCheck.rows.length > 0) {
              throw new Error(`用户名"${user.username}" 已被其他用户使用`);
            }
            updateFields.push(`username = $${paramIndex++}`);
            updateParams.push(user.username);
          }
          if (hasValueChanged(user.employeeId, existing.employee_id) && user.employeeId !== undefined) {
            updateFields.push(`employee_id = $${paramIndex++}`);
            updateParams.push(user.employeeId);
          }

          const roleIdToUse = user.roleId || defaultRoleId;
          if (roleIdToUse !== undefined && roleIdToUse !== null && roleIdToUse !== existing.role_id) {
            updateFields.push(`role_id = $${paramIndex++}`);
            updateParams.push(roleIdToUse);
          }
          if (hasValueChanged(user.plantId, existing.plant_id) && user.plantId !== undefined) {
            updateFields.push(`plant_id = $${paramIndex++}`);
            updateParams.push(user.plantId);
          }
          if (hasValueChanged(user.departmentId, existing.department_id) && user.departmentId !== undefined) {
            updateFields.push(`department_id = $${paramIndex++}`);
            updateParams.push(user.departmentId);
          }
          if (hasValueChanged(finalStatus, existing.status) && finalStatus !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            updateParams.push(finalStatus);
          }
          if (hasValueChanged(user.gender, existing.gender) && user.gender !== undefined) {
            updateFields.push(`gender = $${paramIndex++}`);
            updateParams.push(user.gender);
          }
          if (hasValueChanged(user.position, existing.position) && user.position !== undefined) {
            updateFields.push(`position = $${paramIndex++}`);
            updateParams.push(user.position);
          }
          if (hasValueChanged(user.level, existing.level) && user.level !== undefined) {
            updateFields.push(`level = $${paramIndex++}`);
            updateParams.push(user.level);
          }
          if (hasValueChanged(user.phone, existing.phone) && user.phone !== undefined) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateParams.push(user.phone);
          }
          if (hasValueChanged(processedHireDate, existing.hire_date) && processedHireDate !== undefined) {
            updateFields.push(`hire_date = $${paramIndex++}`);
            updateParams.push(processedHireDate);
          }
          if (hasValueChanged(processedLeaveDate, existing.leave_date) && processedLeaveDate !== undefined) {
            updateFields.push(`leave_date = $${paramIndex++}`);
            updateParams.push(processedLeaveDate);
          }
          if (hasValueChanged(user.icCardNumber, existing.ic_card_number) && user.icCardNumber !== undefined) {
            updateFields.push(`ic_card_number = $${paramIndex++}`);
            updateParams.push(user.icCardNumber);
          }
          if (hasValueChanged(user.employeeType, existing.employee_type) && user.employeeType !== undefined) {
            updateFields.push(`employee_type = $${paramIndex++}`);
            updateParams.push(user.employeeType);
          }
          if (hasValueChanged(user.email, existing.email) && user.email !== undefined) {
            updateFields.push(`email = $${paramIndex++}`);
            updateParams.push(user.email);
          }

          if (updateFields.length > 0) {
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateParams.push(existingId);
            const updateQuery = `UPDATE ${USER_TABLE} SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            await client.query(updateQuery, updateParams);
            updatedCount++;
            successItems.push({ index: i + 1, realName: user.realName, oldEmployeeId: user.oldEmployeeId, action: 'updated' });
          } else {
            successCount++;
            successItems.push({ index: i + 1, realName: user.realName, oldEmployeeId: user.oldEmployeeId, action: 'unchanged' });
          }
        } else {
          // User not found -> INSERT new record
          const usernameConflictCheck = await client.query(
            `SELECT id FROM ${USER_TABLE} WHERE username = $1`,
            [user.username]
          );
          if (usernameConflictCheck.rows.length > 0) {
            throw new Error(`用户名"${user.username}" 已存在，但姓名和旧工号不匹配`);
          }

          const hashedPassword = await bcrypt.hash('123456', 10);

          await client.query(
            `INSERT INTO ${USER_TABLE} (username, password, real_name, employee_id, old_employee_id, role_id, plant_id, department_id, status, gender, position, level, phone, email, hire_date, leave_date, ic_card_number, employee_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              user.username,
              hashedPassword,
              user.realName,
              user.employeeId,
              user.oldEmployeeId,
              user.roleId || defaultRoleId,
              user.plantId,
              user.departmentId,
              finalStatus,
              user.gender,
              user.position,
              user.level,
              user.phone,
              user.email,
              processedHireDate,
              processedLeaveDate,
              user.icCardNumber,
              user.employeeType
            ]
          );
          successCount++;
          successItems.push({ index: i + 1, realName: user.realName, oldEmployeeId: user.oldEmployeeId, action: 'created' });
        }
        await client.query(`RELEASE SAVEPOINT savepoint_${i}`);
      } catch (userError) {
        failedCount++;
        errors.push({ index: i + 1, username: user.username || '未知', error: userError.message });
        failed.push({ index: i + 1, username: user.username || '未知', error: userError.message });
        await client.query(`ROLLBACK TO SAVEPOINT savepoint_${i}`);
      }
    }

    await client.query('COMMIT');

    logInfo('批量导入用户完成', {
      successCount,
      updatedCount,
      failedCount,
      total: usersToImport.length,
      operator: req.user?.username
    });
    logUserAction(req.user?.id, req.user?.username, 'batch_import_users', { successCount, updatedCount, failedCount });

    batchResult(res, { successItems, failed }, '批量导入完成');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * 更新用户
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { username, realName, employeeId, oldEmployeeId, roleId, plantId, departmentId, status, gender, position, level, phone, hireDate, leaveDate, icCardNumber, employeeType, email } = req.body;

    // Normalize integer fields to null if they are empty strings or undefined
    roleId = (roleId === '' || roleId === undefined) ? null : roleId;
    plantId = (plantId === '' || plantId === undefined) ? null : plantId;
    departmentId = (departmentId === '' || departmentId === undefined) ? null : departmentId;

    // 先获取现有用户数据
    const existingCheck = await pool.query(`SELECT * FROM ${USER_TABLE} WHERE id = $1`, [id]);
    if (existingCheck.rows.length === 0) {
      throw NotFoundError('用户不存在');
    }
    const existing = existingCheck.rows[0];

    // 辅助函数：检查值是否有变化
    const hasValueChanged = (newVal, oldVal) => {
      const normalizedNew = (newVal === undefined || newVal === null || String(newVal).trim() === '') ? null : String(newVal).trim();
      const normalizedOld = (oldVal === undefined || oldVal === null || String(oldVal).trim() === '') ? null : String(oldVal).trim();
      return normalizedNew !== normalizedOld;
    };

    // 构建动态的SET语句和参数
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    // 逐个检查字段是否需要更新
    if (hasValueChanged(username, existing.username) && username !== undefined) {
      // 检查新用户名是否已被其他用户使用
      const usernameCheck = await pool.query(
        `SELECT id FROM ${USER_TABLE} WHERE username = $1 AND id != $2`,
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        throw BadRequestError('用户名已被其他用户使用');
      }
      updateFields.push(`username = $${paramIndex++}`);
      updateParams.push(username);
    }
    if (hasValueChanged(realName, existing.real_name) && realName !== undefined) {
      updateFields.push(`real_name = $${paramIndex++}`);
      updateParams.push(realName);
    }
    if (hasValueChanged(employeeId, existing.employee_id) && employeeId !== undefined) {
      updateFields.push(`employee_id = $${paramIndex++}`);
      updateParams.push(employeeId);
    }
    if (hasValueChanged(oldEmployeeId, existing.old_employee_id) && oldEmployeeId !== undefined) {
      updateFields.push(`old_employee_id = $${paramIndex++}`);
      updateParams.push(oldEmployeeId);
    }
    if (roleId !== undefined && roleId !== null && roleId !== existing.role_id) {
      updateFields.push(`role_id = $${paramIndex++}`);
      updateParams.push(roleId);
    }
    if (hasValueChanged(plantId, existing.plant_id) && plantId !== undefined) {
      updateFields.push(`plant_id = $${paramIndex++}`);
      updateParams.push(plantId);
    }
    if (hasValueChanged(departmentId, existing.department_id) && departmentId !== undefined) {
      updateFields.push(`department_id = $${paramIndex++}`);
      updateParams.push(departmentId);
    }

    // 处理状态和离职日期
    const hasLeaveDate = leaveDate && leaveDate !== '';
    let finalStatus = status;

    // 如果有离职日期，强制状态为inactive
    if (hasLeaveDate) {
      finalStatus = 'inactive';
    }

    if (hasValueChanged(finalStatus, existing.status) && finalStatus !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateParams.push(finalStatus);
    }
    if (hasValueChanged(gender, existing.gender) && gender !== undefined) {
      updateFields.push(`gender = $${paramIndex++}`);
      updateParams.push(gender);
    }
    if (hasValueChanged(position, existing.position) && position !== undefined) {
      updateFields.push(`position = $${paramIndex++}`);
      updateParams.push(position);
    }
    if (hasValueChanged(level, existing.level) && level !== undefined) {
      updateFields.push(`level = $${paramIndex++}`);
      updateParams.push(level);
    }
    if (hasValueChanged(phone, existing.phone) && phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateParams.push(phone);
    }
    if (hasValueChanged(hireDate, existing.hire_date) && hireDate !== undefined) {
      updateFields.push(`hire_date = $${paramIndex++}`);
      updateParams.push(hireDate || null);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'leaveDate') && hasValueChanged(leaveDate, existing.leave_date) && leaveDate !== undefined) {
      updateFields.push(`leave_date = $${paramIndex++}`);
      updateParams.push(leaveDate || null);
    }
    if (hasValueChanged(icCardNumber, existing.ic_card_number) && icCardNumber !== undefined) {
      updateFields.push(`ic_card_number = $${paramIndex++}`);
      updateParams.push(icCardNumber);
    }
    if (hasValueChanged(employeeType, existing.employee_type) && employeeType !== undefined) {
      updateFields.push(`employee_type = $${paramIndex++}`);
      updateParams.push(employeeType);
    }
    if (hasValueChanged(email, existing.email) && email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateParams.push(email);
    }

    let updatedUser;

    // 只有当有字段需要更新时才执行UPDATE
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateParams.push(id);
      const updateQuery = `UPDATE ${USER_TABLE} SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(updateQuery, updateParams);
      updatedUser = result.rows[0];

      logInfo('更新用户成功', { userId: id, updatedBy: req.user?.username });
      logUserAction(req.user?.id, req.user?.username, 'update_user', { targetUserId: id });

      // 通知用户信息变更
      await notifyUser(pool, updatedUser.real_name, '✏️',
        '【信息变更通知】您的账号信息已更新',
        `您的账号信息已由管理员更新，请留意变更内容。`,
        'user',
        { userId: id, updatedBy: req.user?.username }
      );

      // 如果状态变为 inactive（离职），通知用户
      if (hasLeaveDate && existing.status !== 'inactive') {
        await notifyUser(pool, updatedUser.real_name, '🚪',
          '【离职通知】您的账号已停用',
          `您的账号已因离职被停用，如有疑问请联系管理员。`,
          'user',
          { userId: id }
        );
      }
    } else {
      updatedUser = existing;
    }

    // 获取关联名称
    const [roleResult, plantResult, deptResult] = await Promise.all([
      updatedUser.role_id ? pool.query(`SELECT name FROM ${ROLE_TABLE} WHERE id = $1`, [updatedUser.role_id]) : { rows: [] },
      updatedUser.plant_id ? pool.query(`SELECT name FROM ${PLANT_TABLE} WHERE id = $1`, [updatedUser.plant_id]) : { rows: [] },
      updatedUser.department_id ? pool.query(`SELECT name FROM ${DEPT_TABLE} WHERE id = $1`, [updatedUser.department_id]) : { rows: [] }
    ]);

    success(res, {
      id: updatedUser.id,
      username: updatedUser.username,
      realName: updatedUser.real_name,
      employeeId: updatedUser.employee_id,
      oldEmployeeId: updatedUser.old_employee_id,
      roleId: updatedUser.role_id,
      roleName: roleResult.rows[0]?.name || '',
      plantId: updatedUser.plant_id,
      plantName: plantResult.rows[0]?.name || '',
      departmentId: updatedUser.department_id,
      departmentName: deptResult.rows[0]?.name || '',
      status: updatedUser.status,
      gender: updatedUser.gender,
      position: updatedUser.position,
      level: updatedUser.level,
      phone: updatedUser.phone,
      hireDate: updatedUser.hire_date,
      leaveDate: updatedUser.leave_date,
      icCardNumber: updatedUser.ic_card_number,
      employeeType: updatedUser.employee_type,
      createdAt: dayjs(updatedUser.created_at).format('YYYY-MM-DD')
    }, '更新用户成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 验证安全问题用于密码重置
 */
export const verifySecurityQuestion = async (req, res, next) => {
  try {
    const { username, securityQuestion, answer } = req.body;

    if (!username || !securityQuestion || !answer) {
      throw BadRequestError('用户名、安全问题和答案不能为空');
    }

    // 查找用户
    const userResult = await pool.query(
      `SELECT id, username, real_name, security_question, security_answer FROM ${USER_TABLE} WHERE username = $1`,
      [username]
    );
    const user = userResult.rows[0];

    if (!user) {
      throw NotFoundError('用户不存在');
    }

    // 验证安全问题
    if (!user.security_question || !user.security_answer) {
      throw BadRequestError('该用户尚未设置安全问题，请联系管理员重置密码');
    }

    if (user.security_question !== securityQuestion) {
      throw UnauthorizedError('安全问题答案不正确');
    }

    // 比较答案（不区分大小写）
    if (user.security_answer.toLowerCase() !== answer.toLowerCase().trim()) {
      throw UnauthorizedError('安全问题答案不正确');
    }

    logInfo('用户通过安全问题验证', { userId: user.id, username: user.username });

    // 返回验证成功信号，让前端跳转到设置新密码页面
    success(res, { verified: true, userId: user.id }, '身份验证成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 重置用户密码
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword, confirmPassword } = req.body;

    if (!userId || !newPassword || !confirmPassword) {
      throw BadRequestError('用户ID和新密码不能为空');
    }

    if (newPassword !== confirmPassword) {
      throw BadRequestError('两次输入的密码不一致');
    }

    if (newPassword.length < 6) {
      throw BadRequestError('密码长度不能少于6位');
    }

    // 查找用户
    const userResult = await pool.query(
      `SELECT id, username, real_name FROM ${USER_TABLE} WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      throw NotFoundError('用户不存在');
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE ${USER_TABLE} SET password = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hashedPassword, userId]
    );

    logInfo('用户密码重置成功', { userId: user.id, username: user.username, resetByIp: req.ip });

    success(res, null, '密码重置成功，请使用新密码登录');
  } catch (err) {
    next(err);
  }
};

/**
 * 管理员重置密码为123456
 */
export const adminResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Hash the default password before storing
    const hashedPassword = await bcrypt.hash('123456', 10);

    const result = await pool.query(
      `UPDATE ${USER_TABLE} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username`,
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      throw NotFoundError('用户不存在');
    }

    logInfo('管理员重置用户密码', { targetUserId: id, targetUsername: result.rows[0].username, adminUserId: req.user?.id });
    logUserAction(req.user?.id, req.user?.username, 'admin_reset_password', { targetUserId: id });

    success(res, null, '密码已重置为123456');
  } catch (err) {
    next(err);
  }
};

/**
 * 修改当前用户密码
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword || !confirmPassword) {
      throw BadRequestError('所有密码字段都不能为空');
    }

    if (newPassword !== confirmPassword) {
      throw BadRequestError('两次输入的新密码不一致');
    }

    if (newPassword.length < 6) {
      throw BadRequestError('新密码长度不能少于6位');
    }

    // 验证旧密码
    const userResult = await pool.query(
      `SELECT password FROM ${USER_TABLE} WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw NotFoundError('用户不存在');
    }

    const isMatch = await bcrypt.compare(oldPassword, userResult.rows[0].password);
    if (!isMatch) {
      throw UnauthorizedError('当前密码不正确');
    }

    // 哈希新密码并更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE ${USER_TABLE} SET password = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hashedPassword, userId]
    );

    logInfo('用户修改密码成功', { userId, ip: req.ip });

    success(res, null, '密码修改成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 设置安全问题
 */
export const setSecurityQuestion = async (req, res, next) => {
  try {
    const { securityQuestion, securityAnswer } = req.body;
    const userId = req.user.id;

    if (!securityQuestion || !securityAnswer) {
      throw BadRequestError('安全问题和答案不能为空');
    }

    // 更新用户的安全问题和答案
    const result = await pool.query(
      `UPDATE ${USER_TABLE} SET security_question = $1, security_answer = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id`,
      [securityQuestion, securityAnswer.trim(), userId]
    );

    if (result.rows.length === 0) {
      throw NotFoundError('用户不存在');
    }

    logInfo('用户设置安全问题成功', { userId, securityQuestion });

    success(res, null, '安全问题设置成功');
  } catch (err) {
    next(err);
  }
};

/**
 * 删除用户
 */
export const deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // 先检查用户是否存在
    const userCheck = await client.query(`SELECT * FROM ${USER_TABLE} WHERE id = $1`, [id]);
    if (userCheck.rows.length === 0) {
      throw NotFoundError('用户不存在');
    }

    // 防止删除自己
    if (req.user && req.user.id === parseInt(id)) {
      throw BadRequestError('不能删除当前登录用户');
    }

    await client.query('BEGIN');

    // 辅助函数：安全删除表中的记录（表不存在时不报错）
    const safeDelete = async (tableName, columnName, value) => {
      try {
        await client.query(`DELETE FROM ${tableName} WHERE ${columnName} = $1`, [value]);
      } catch (err) {
        if (err.code !== '42P01') {
          console.error(`删除 ${tableName} 记录失败:`, err);
        }
      }
    };

    // 先删除相关表中的记录，避免外键约束
    await safeDelete('jso_hr_temporary_overtime', 'employee_id', id);
    await safeDelete('jso_hr_temporary_leave', 'employee_id', id);
    await safeDelete('jso_hr_formal_leave', 'employee_id', id);
    await safeDelete('jso_hr_resignation_transfer', 'employee_id', id);

    // 删除用户表中的数据
    await client.query(`DELETE FROM ${USER_TABLE} WHERE id = $1`, [id]);

    await client.query('COMMIT');

    logInfo('删除用户成功', { deletedUserId: id, deletedBy: req.user?.username });
    logUserAction(req.user?.id, req.user?.username, 'delete_user', { targetUserId: id });

    success(res, null, '删除用户成功');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  getCurrentUser,
  login,
  logout,
  getAllUsers,
  getApprovers,
  createUser,
  batchImportUsers,
  updateUser,
  changePassword,
  setSecurityQuestion,
  verifySecurityQuestion,
  resetUserPassword,
  adminResetPassword,
  deleteUser,
};
