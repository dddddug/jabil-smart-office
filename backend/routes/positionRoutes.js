import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js'; // 导入认证中间件
const router = express.Router();

// 假设岗位信息是相对固定的，或者从某个配置中读取
// 如果岗位信息需要从数据库动态获取，则需要修改此处的逻辑
router.get('/', authenticateToken, (req, res) => {
  try {
    const positions = ['工程师', '经理', '主管', '技术员', '操作员', '高级工程师', '总监', '部门经理'];
    res.json({ code: 200, message: '获取岗位成功', data: positions });
  } catch (error) {
    console.error('获取岗位失败:', error);
    res.status(500).json({ code: 500, message: '获取岗位失败' });
  }
});

export default router;