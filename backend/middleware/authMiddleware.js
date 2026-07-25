import jwt from 'jsonwebtoken'; // 假设使用 jsonwebtoken
import pool from '../config/db.js';
import { JSO_JWT_BLACKLIST_TABLE } from '../config/db_constants.js';

// 简单的认证中间件
export const authenticateToken = (req, res, next) => {
    // 从请求头中获取 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (token == null) {
        console.error('未提供 Token');
        return res.status(401).json({ code: 401, message: '认证失败: 未提供 Token' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET 未配置。请在环境变量中设置 JWT_SECRET。');
        return res.status(500).json({ code: 500, message: '服务器配置错误: JWT_SECRET 未设置' });
    }

    // 验证 Token
    jwt.verify(token, jwtSecret, async (err, user) => {
        if (err) {
                console.error('Token 验证失败:', err.message);
        }

        // 检查 Token 是否在黑名单中
        try {
            const blacklisted = await pool.query(
                `SELECT 1 FROM ${JSO_JWT_BLACKLIST_TABLE} WHERE jti = $1`,
                [user.jti] // Assuming jti is part of your JWT payload
            );
            if (blacklisted.rows.length > 0) {
                console.error('Token 已列入黑名单');
                return res.status(401).json({ code: 401, message: '认证失败: Token 已失效' });
            }
        } catch (dbError) {
            console.error('❌ 检查黑名单失败:', dbError);
            return res.status(500).json({ code: 500, message: '服务器内部错误' });
        }

        req.user = user; // 将用户信息附加到请求对象上
        next();
    });
};
