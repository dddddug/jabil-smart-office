export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user && req.user.roleId;

        if (!userRole) {
            return res.status(403).json({ code: 403, message: '权限不足: 无法识别用户角色' });
        }

        // 角色映射 - 匹配 allowedRoles 中使用的名称
        const roleMap = {
            1: 'super_admin',
            2: 'plant_admin',
            3: 'dept_admin',
            4: 'employee',
            5: 'ic_manager',
        };
        const userRoleName = roleMap[userRole];

        if (allowedRoles.includes(userRoleName)) {
            next();
        } else {
            res.status(403).json({ code: 403, message: '权限不足: 您没有访问此资源的权限' });
        }
    };
};
