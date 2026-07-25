import * as costSummaryService from '../services/costSummaryService.js';
import { logOperation } from '../services/logService.js';

// 获取 Cost 汇总界面下拉框选项
export const getCostSummaryDropdownOptions = async (req, res) => {
  try {
    const options = await costSummaryService.getCostSummaryDropdownOptions();
    res.json({ code: 200, message: '获取 Cost 汇总下拉框选项成功', data: options });
  } catch (error) {
    console.error('获取 Cost 汇总下拉框选项失败:', error);
    res.status(500).json({ code: 500, message: '获取 Cost 汇总下拉框选项失败', details: error.message });
  }
};

// 获取 Cost 汇总数据
export const getCostSummaryData = async (req, res) => {
  try {
    const { fiscalMonth, fiscalYear, fiscalWeek, fiscalDate, departmentIds, positions, plantId, page = 1, pageSize = 10 } = req.query;
    const userId = req.user.id;

    // 验证 fiscalWeek 格式
    if (fiscalWeek && !/^\d{4}-W\d{1,2}$/.test(fiscalWeek)) {
      return res.status(400).json({ code: 400, message: '财周格式错误，应为 YYYY-WXX 格式，如 2026-W29' });
    }

    // 验证财周范围
    if (fiscalWeek) {
      const weekNum = parseInt(fiscalWeek.split('-W')[1]);
      if (weekNum < 1 || weekNum > 53) {
        return res.status(400).json({ code: 400, message: '财周必须在 1-53 之间' });
      }
    }

    // 验证 fiscalDate 格式
    if (fiscalDate && !/^\d{4}-\d{2}-\d{2}$/.test(fiscalDate)) {
      return res.status(400).json({ code: 400, message: '日期格式错误，应为 YYYY-MM-DD 格式，如 2026-07-15' });
    }

    const data = await costSummaryService.getCostSummaryData({
      fiscalMonth,
      fiscalYear,
      fiscalWeek,
      fiscalDate,
      departmentIds: departmentIds ? (Array.isArray(departmentIds) ? departmentIds : [departmentIds]) : undefined,
      positions: positions ? (Array.isArray(positions) ? positions : [positions]) : undefined,
      plantId: plantId ? parseInt(plantId) : undefined,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      userId
    });
    res.json({ code: 200, message: '获取 Cost 汇总数据成功', data });
  } catch (error) {
    console.error('获取 Cost 汇总数据失败:', error);
    res.status(500).json({ code: 500, message: '获取 Cost 汇总数据失败', details: [] });
  }
};

// 导出 Cost 汇总 Excel
export const exportCostSummary = async (req, res) => {
  try {
    const { fiscalMonth, departmentIds, positions, plantId } = req.query;
    const userId = req.user.id;
    const userRealName = req.user.realName;

    const excelBuffer = await costSummaryService.generateCostSummaryExcel({
      fiscalMonth,
      departmentIds: departmentIds ? (Array.isArray(departmentIds) ? departmentIds : [departmentIds]) : undefined,
      positions: positions ? (Array.isArray(positions) ? positions : [positions]) : undefined,
      userId
    });

    // 记录操作日志
    await logOperation({
      module: 'CostSummary',
      action: 'ExportExcel',
      accountId: userId,
      accountName: userRealName,
      details: { fiscalMonth, departmentIds, positions, plantId }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="CostSummary_${fiscalMonth}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('导出 Cost 汇总 Excel 失败:', error);
    res.status(500).json({ code: 500, message: '导出 Cost 汇总 Excel 失败', details: [] });
  }
};

// 手动触发 Cost 数据重算
export const recalculateCostData = async (req, res) => {
  try {
    const { fiscalMonth } = req.body;
    const userId = req.user.id;
    const userRealName = req.user.realName;

    if (!fiscalMonth) {
      return res.status(400).json({ code: 400, message: '财月为必填项' });
    }

    await costSummaryService.recalculateFiscalMonthCost(fiscalMonth, userId);

    // 记录操作日志
    await logOperation({
      module: 'CostSummary',
      action: 'RecalculateData',
      accountId: userId,
      accountName: userRealName,
      targetId: fiscalMonth, // Target ID could be the fiscal month being recalculated
      details: { fiscalMonth }
    });

    res.json({ code: 200, message: `财月 ${fiscalMonth} Cost 数据已触发重新核算` });
  } catch (error) {
    console.error('触发 Cost 数据重算失败:', error);
    res.status(500).json({ code: 500, message: '触发 Cost 数据重算失败', error: error.message });
  }
};

// 手动触发所有月份的 Cost 数据重算
export const recalculateAllCostData = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRealName = req.user.realName;

    await costSummaryService.triggerRecalculationForAllMonths();

    // 记录操作日志
    await logOperation({
      module: 'CostSummary',
      action: 'RecalculateAllData',
      accountId: userId,
      accountName: userRealName,
      details: { message: '所有月份 Cost 数据已触发重新核算' }
    });

    res.json({ code: 200, message: '所有月份 Cost 数据已触发重新核算' });
  } catch (error) {
    console.error('触发所有月份 Cost 数据重算失败:', error);
    res.status(500).json({ code: 500, message: '触发所有月份 Cost 数据重算失败', error: error.message });
  }
};
