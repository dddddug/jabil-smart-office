export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // 假设用户信息在 req.user 中，并且包含 roleId
        const userRole = req.user && req.user.roleId;

        if (!userRole) {
            return res.status(403).json({ code: 403, message: '权限不足: 无法识别用户角色' });
        }

        // TODO: 从数据库或其他地方获取 roleId 对应的 roleName
        // 暂时硬编码映射，实际项目中应从数据库查询
        const roleMap = {
            1: 'super_admin',
            2: 'plant_admin',
            3: 'department_admin',
            4: 'normal_employee', // 普通员工
            5: 'ic_manager', // IC 经理
            // ... 其他角色
        };
        const userRoleName = roleMap[userRole];

        if (allowedRoles.includes(userRoleName)) {
            next();
        } else {
            res.status(403).json({ code: 403, message: '权限不足: 您没有访问此资源的权限' });
        }
    };
};
