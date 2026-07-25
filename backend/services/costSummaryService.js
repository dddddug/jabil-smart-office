import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import pool from '../config/db.js';
import { COST_SUMMARY_TABLE, USER_TABLE, HOURLY_RATE_TABLE, WELFARE_CONFIG_TABLE, WELFARE_AMOUNT_TABLE, DEPT_RULES_TABLE, PLANT_TABLE, DEPT_TABLE, SHIFT_DURATION_RULES_TABLE, SCHEDULE_TABLE, TEMPORARY_OVERTIME_TABLE, TEMPORARY_LEAVE_TABLE } from '../config/db_constants.js';

// Placeholder for exchange rate. In a real application, this would fetch from a database or external API.
const getExchangeRateForMonth = async (fiscalMonth, departmentId, plantId) => {
    // For demonstration, let's assume 1 CNY = 0.14 USD
    // In a real scenario, this would be dynamic and based on the fiscalMonth.
    // console.log(`Fetching exchange rate for ${fiscalMonth}. Using a placeholder of 0.14 USD/CNY.`);
    // return 0.14; // Example: 1 CNY = 0.14 USD

    if (!fiscalMonth) {
        console.warn('fiscalMonth is required to fetch exchange rate.');
        return 1.0; // Default to 1 if no fiscalMonth is provided
    }

    try {
        let query = `SELECT exchange_rate FROM ${DEPT_RULES_TABLE} WHERE business_month = $1 AND status = 'active'`;
        const queryParams = [fiscalMonth];
        let paramIndex = 2;

        if (departmentId) {
            query += ` AND department_id = $${paramIndex++}`;
            queryParams.push(departmentId);
        }
        if (plantId) {
            query += ` AND plant_id = $${paramIndex++}`;
            queryParams.push(plantId);
        }
        query += ` LIMIT 1`;

        const result = await pool.query(query, queryParams);

        if (result.rows.length > 0) {
            const fetchedRate = parseFloat(result.rows[0].exchange_rate);
            return fetchedRate;
        } else {
            console.warn(`[getExchangeRateForMonth] - No active exchange rate found for ${fiscalMonth} (Dept: ${departmentId}, Plant: ${plantId}) in ${DEPT_RULES_TABLE}. Returning default 1.0.`);
            return 1.0; // Default to 1.0 in case no specific rate is found
        }
    } catch (error) {
        console.error(`[getExchangeRateForMonth] - Error fetching exchange rate for ${fiscalMonth} (Dept: ${departmentId}, Plant: ${plantId}):`, error);
        console.warn(`[getExchangeRateForMonth] - Returning default 1.0 due to error.`);
        return 1.0; // Return default in case of error
    }
};

/**
 * 根据用户ID获取其数据访问权限范�? * @param {number} userId - The user's ID.
 * @returns {Promise<object>} - An object containing permission scopes (e.g., { allowedPlantIds: [1, 2], allowedDeptIds: [3, 4] }).
 */
const getUserPermissions = async (userId) => {
    // This is a placeholder. In a real application, you would query the database
    // to get the user's role and associated permissions (plant, department, etc.).
    const userResult = await pool.query(`SELECT role_id, plant_id, department_id FROM ${USER_TABLE} WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }
    const user = userResult.rows[0];

    const permissions = {
        allowedPlantIds: null, // null means all plants
        allowedDeptIds: null,  // null means all departments
    };

    switch (user.role_id) {
        case 1: // super_admin
        case 5: // ic_manager
            // Full access
            break;
        case 2: // plant_admin
            permissions.allowedPlantIds = [user.plant_id];
            break;
        case 3: // department_admin
        case 4: // normal_employee
            permissions.allowedDeptIds = [user.department_id];
            break;
        default:
            // No access if role is not recognized
            permissions.allowedDeptIds = [];
            break;
    }
    return permissions;
};


/**
 * 获取 Cost 汇总界面下拉框选项数据
 * @returns {Promise<object>} - 包含厂区、部门和岗位选项的对象
 */
export const getCostSummaryDropdownOptions = async () => {
    const client = await pool.connect();
    try {
        const [
            plantsResult,
            departmentsResult,
            positionsResult
        ] = await Promise.all([
            client.query(`SELECT id, name FROM ${PLANT_TABLE} ORDER BY name`),
            client.query(`SELECT id, name, plant_id FROM ${DEPT_TABLE} ORDER BY name`),
            client.query(`SELECT DISTINCT position FROM ${USER_TABLE} WHERE position IS NOT NULL AND position != '' ORDER BY position`)
        ]);

        const plants = plantsResult.rows.map(row => ({ id: row.id, name: row.name }));
        const departments = departmentsResult.rows.map(row => ({ id: row.id, name: row.name, plantId: row.plant_id }));
        const positions = positionsResult.rows.map(row => row.position);

        return { plants, departments, positions };
    } catch (error) {
        console.error('获取 Cost 汇总下拉框选项失败:', error);
        throw error;
    } finally {
        client.release();
    }
};

// 获取 Cost 汇总数据 - 实时计算
export const getCostSummaryData = async ({ fiscalMonth, fiscalYear, fiscalWeek, startDate, endDate, departmentIds, positions, plantId, page, pageSize, userId }) => {
    const client = await pool.connect();
    try {
        const permissions = await getUserPermissions(userId);
        const { offset } = { offset: (page - 1) * pageSize };

        // 计算财月日期范围
        let fiscalStart, fiscalEnd, dateParam;
        const today = dayjs().format('YYYY-MM-DD');
        let fiscalYear = null;
        let fiscalMonthNum = null;

        if (fiscalMonth) {
            fiscalYear = parseInt(fiscalMonth.substring(0, 4));
            fiscalMonthNum = parseInt(fiscalMonth.substring(5, 7));
            fiscalStart = dayjs(`${fiscalYear}-${fiscalMonthNum}-24`).subtract(1, 'month');
            fiscalEnd = dayjs(`${fiscalYear}-${fiscalMonthNum}-23`);
            dateParam = fiscalMonth;
        } else if (fiscalYear) {
            fiscalYear = parseInt(fiscalYear);
            fiscalStart = dayjs(`${fiscalYear}-01-01`);
            fiscalEnd = dayjs(`${fiscalYear}-12-31`);
            dateParam = fiscalYear;
        } else if (fiscalWeek) {
            const year = parseInt(fiscalWeek.substring(0, 4));
            const week = parseInt(fiscalWeek.substring(5, 7));
            fiscalStart = dayjs().year(year).isoWeek(week).startOf('isoWeek');
            fiscalEnd = dayjs().year(year).isoWeek(week).endOf('isoWeek');
            dateParam = fiscalWeek;
        } else if (startDate && endDate) {
            fiscalStart = dayjs(startDate);
            fiscalEnd = dayjs(endDate);
            dateParam = 'custom';
        } else {
            // 默认当月
            const now = dayjs();
            fiscalYear = now.year();
            fiscalMonthNum = now.month() + 1;
            fiscalStart = dayjs(`${fiscalYear}-${fiscalMonthNum}-24`).subtract(1, 'month');
            fiscalEnd = dayjs(`${fiscalYear}-${fiscalMonthNum}-23`);
            dateParam = now.format('YYYY-MM');
        }

        // 只有当前财月才截断到今天，历史财月用完整日期范围
        const currentFiscalMonth = dayjs().format('YYYY-MM');
        if (dateParam === currentFiscalMonth && fiscalEnd.isAfter(dayjs())) {
            fiscalEnd = dayjs();
        }

        // 完整财月天数（用于福利费计算）
        let daysInFullFiscalMonth = 30; // 默认30天
        if (fiscalYear && fiscalMonthNum) {
            const fullFiscalMonthEnd = dayjs(`${fiscalYear}-${fiscalMonthNum}-23`);
            const fullFiscalMonthStart = dayjs(`${fiscalYear}-${fiscalMonthNum}-24`).subtract(1, 'month');
            daysInFullFiscalMonth = fullFiscalMonthEnd.diff(fullFiscalMonthStart, 'day') + 1;
        }

        // 实际计算期间天数（用于工时计算）
        const daysInFiscalMonth = fiscalEnd.diff(fiscalStart, 'day') + 1;

        // 并行查询所有基础数据
        const [
            scheduleWorkHoursResult,
            temporaryOvertimeResult,
            temporaryLeaveResult,
            hourlyRatesResult,
            welfareConfigResult,
            personnelResult,
            departmentMappingResult,
            budgetConfigResult,
            departmentsResult,
        ] = await Promise.all([
            // 从排班表获取工时（去重：每人每天只算一次），只算到今天
            client.query(`
                SELECT s.employee_id, SUM(COALESCE(sr.duration_hours, 8)) as total_hours
                FROM (
                    SELECT DISTINCT ON (employee_id, DATE(schedule_date)) *
                    FROM ${SCHEDULE_TABLE}
                    WHERE schedule_date BETWEEN $1 AND $2
                ) s
                LEFT JOIN (
                    SELECT DISTINCT ON (shift_name) shift_name, duration_hours
                    FROM ${SHIFT_DURATION_RULES_TABLE}
                    WHERE status = 'active'
                ) sr ON s.shift = sr.shift_name
                WHERE s.schedule_date <= $3
                GROUP BY s.employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), today]),
            // 临时加班工时（已批准的，只算到今天）
            client.query(`
                SELECT employee_id, SUM(hours) as total_overtime_hours
                FROM ${TEMPORARY_OVERTIME_TABLE}
                WHERE status = 'approved'
                  AND overtime_date BETWEEN $1 AND $2
                  AND overtime_date <= $3
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), today]),
            // 临时请假工时（已批准的，只算到今天）
            client.query(`
                SELECT employee_id, SUM(hours) as total_leave_hours
                FROM ${TEMPORARY_LEAVE_TABLE}
                WHERE status = 'approved'
                  AND start_date BETWEEN $1 AND $2
                  AND start_date <= $3
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), today]),
            // 时薪配置
            client.query(`SELECT level, standard_rate FROM ${HOURLY_RATE_TABLE} WHERE start_time <= $1 ORDER BY start_time DESC`, [fiscalEnd.format('YYYY-MM-DD')]),
            // 福利配置 (jso_config_welfare - 100元/人)
            client.query(`SELECT employee_type, amount FROM ${WELFARE_AMOUNT_TABLE}`),
            // 在职人员
            client.query(`SELECT id, department_id, plant_id, position, level, employee_type FROM ${USER_TABLE} WHERE status = 'active'`),
            // 部门-厂区映射
            client.query(`SELECT id, plant_id FROM jso_org_department_management`),
            // 预算配置
            client.query(`SELECT department_id, plant_id, estimated_cost, exchange_rate FROM ${DEPT_RULES_TABLE} WHERE business_month = $1`, [dateParam]),
            // 部门信息
            client.query(`SELECT id, name, plant_id FROM jso_org_department_management`),
        ]);

        // 构建查询条件
        let filterDeptIds = departmentIds;
        if (!filterDeptIds && permissions.allowedDeptIds) {
            filterDeptIds = permissions.allowedDeptIds;
        }

        let filterPlantIds = plantId ? [plantId] : null;
        if (!filterPlantIds && permissions.allowedPlantIds) {
            filterPlantIds = permissions.allowedPlantIds;
        }

        // 构建 Map
        const employeeWorkHoursMap = new Map();
        scheduleWorkHoursResult.rows.forEach(row => {
            const hours = parseFloat(row.total_hours);
            employeeWorkHoursMap.set(row.employee_id, (employeeWorkHoursMap.get(row.employee_id) || 0) + hours);
        });

        const overtimeMap = new Map();
        temporaryOvertimeResult.rows.forEach(row => {
            overtimeMap.set(row.employee_id, parseFloat(row.total_overtime_hours) || 0);
        });

        const leaveMap = new Map();
        temporaryLeaveResult.rows.forEach(row => {
            leaveMap.set(row.employee_id, parseFloat(row.total_leave_hours) || 0);
        });

        const deptPlantMap = new Map(departmentMappingResult.rows.map(d => [d.id, d.plant_id]));
        const deptNameMap = new Map(departmentsResult.rows.map(d => [d.id, d.name]));

        const budgetMap = new Map();
        const exchangeRateMap = new Map();
        budgetConfigResult.rows.forEach(config => {
            const key = `${config.department_id}-${config.plant_id}`;
            budgetMap.set(key, parseFloat(config.estimated_cost) || 0);
            exchangeRateMap.set(key, parseFloat(config.exchange_rate) || 7.2);
        });

        // 福利费用: 100元/人 × 3PL人数 ÷ 完整财月天数
        const welfareConfigs = welfareConfigResult.rows;
        const total3plEmployees = personnelResult.rows.filter(p => p.employee_type === '3PL').length;
        const welfarePerEmployee = 100; // jso_config_welfare.amount = 100元/人
        const dailyWelfareCostRMB = daysInFullFiscalMonth > 0 ? (welfarePerEmployee * total3plEmployees) / daysInFullFiscalMonth : 0;

        // 按部门+岗位+级别分组（级别影响时薪）
        // 只计算3PL员工，Jabil员工不参与费用计算
        const aggregationMap = new Map();

        for (const person of personnelResult.rows) {
            // 只计算3PL员工，Jabil员工不参与费用计算
            if (!person.employee_type || person.employee_type !== '3PL') continue;
            if (!person.department_id) continue;

            // 应用权限过滤
            if (filterDeptIds && !filterDeptIds.includes(person.department_id)) continue;
            const personPlantId = deptPlantMap.get(person.department_id);
            if (filterPlantIds && !filterPlantIds.includes(personPlantId)) continue;
            if (positions && positions.length > 0 && !positions.includes(person.position)) continue;

            // 按 部门|岗位|级别 分组，确保同级别用相同时薪
            const key = `${person.department_id}|${person.position}|${person.level}`;

            if (!aggregationMap.has(key)) {
                aggregationMap.set(key, {
                    department_id: person.department_id,
                    department_name: deptNameMap.get(person.department_id) || '',
                    position: person.position,
                    level: person.level,
                    total_work_hours: 0,
                    employee_count: 0,
                    three_pl_count: 0,
                });
            }

            const group = aggregationMap.get(key);
            group.employee_count++;
            group.three_pl_count++;

            // 工时 = 排班工时 + 临时加班 - 临时请假
            const scheduleHours = employeeWorkHoursMap.get(person.id) || 0;
            const overtimeHours = overtimeMap.get(person.id) || 0;
            const leaveHours = leaveMap.get(person.id) || 0;
            group.total_work_hours += scheduleHours + overtimeHours - leaveHours;
        }

        // 计算费用
        const items = [];
        let totalAvailableBudget = 0;
        let totalConsumedCost = 0;
        const processedDeptBudgets = new Set(); // 用于去重：只计算一次部门预算

        for (const group of aggregationMap.values()) {
            const plantIdForDept = deptPlantMap.get(group.department_id);
            const budgetKey = `${group.department_id}-${plantIdForDept}`;

            // 获取时薪 (RMB) - 使用不区分大小写的匹配
            const groupLevelLower = (group.level || '').toLowerCase().replace(/\s+/g, ' ').trim();
            const hourlyRateRMB = parseFloat(
                hourlyRatesResult.rows.find(r => (r.level || '').toLowerCase().replace(/\s+/g, ' ').trim() === groupLevelLower)?.standard_rate
            ) || 0;

            // 获取汇率
            const exchangeRate = exchangeRateMap.get(budgetKey) || 7.2;

            // 获取预算 (RMB)
            const estimatedBudgetRMB = budgetMap.get(budgetKey) || 0;
            const availableBudgetUSD = exchangeRate > 0 ? estimatedBudgetRMB / exchangeRate : 0;

            // 计算工时费用 (RMB)
            const workCostRMB = group.total_work_hours * hourlyRateRMB;

            // 计算福利费用 (RMB): 日均福利费 × 该组3PL人数
            const groupWelfareCostRMB = dailyWelfareCostRMB * (group.three_pl_count || 0);

            // 总费用 (RMB) 转换为 USD
            const totalCostRMB = workCostRMB + groupWelfareCostRMB;
            const totalCostUSD = exchangeRate > 0 ? totalCostRMB / exchangeRate : 0;
            const welfareCostUSD = exchangeRate > 0 ? groupWelfareCostRMB / exchangeRate : 0;

            const hourlyRateUSD = exchangeRate > 0 ? hourlyRateRMB / exchangeRate : 0;

            // 部门预算去重：每个部门只加一次到总预算
            if (!processedDeptBudgets.has(budgetKey)) {
                processedDeptBudgets.add(budgetKey);
                totalAvailableBudget += availableBudgetUSD;
            }

            items.push({
                fiscal_month: dateParam,
                department_id: group.department_id,
                department_name: group.department_name,
                position: group.position,
                level: group.level,
                total_work_hours: group.total_work_hours,
                hourly_rate: hourlyRateUSD,
                welfare_cost: welfareCostUSD,
                total_cost: totalCostUSD,
                available_budget: availableBudgetUSD,
                consumptionRatio: availableBudgetUSD > 0 ? totalCostUSD / availableBudgetUSD : 0,
                remainingCost: availableBudgetUSD - totalCostUSD,
                riskLevel: availableBudgetUSD > 0 ? (totalCostUSD / availableBudgetUSD > 1 ? 'red' : (totalCostUSD / availableBudgetUSD > 0.8 ? 'yellow' : 'green')) : 'green',
            });

            totalConsumedCost += totalCostUSD;
        }

        // 分页
        const total = items.length;
        const paginatedItems = items.slice(offset, offset + pageSize);

        // 图表数据 - 按部门汇总
        const deptConsumptionMap = new Map();
        for (const item of items) {
            const name = item.department_name;
            deptConsumptionMap.set(name, (deptConsumptionMap.get(name) || 0) + item.total_cost);
        }
        const departmentConsumption = Array.from(deptConsumptionMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return {
            fiscalMonth: dateParam,
            availableBudget: totalAvailableBudget,
            consumedCost: totalConsumedCost,
            remainingCost: totalAvailableBudget - totalConsumedCost,
            consumptionRatio: totalAvailableBudget > 0 ? totalConsumedCost / totalAvailableBudget : 0,
            averageDailyCostUSD: 0,
            chartData: {
                departmentConsumption,
                monthlyTrend: [],
                yoyComparison: { value: 0, percentage: 0 },
                momComparison: { value: 0, percentage: 0 },
            },
            detailTable: {
                total,
                items: paginatedItems,
            },
        };
    } finally {
        client.release();
    }
};

// 生成 Cost 汇总 Excel 文件
export const generateCostSummaryExcel = async ({ fiscalMonth, departmentIds, positions, userId }) => {
    // Fetch all data without pagination
    const data = await getCostSummaryData({ fiscalMonth, departmentIds, positions, page: 1, pageSize: 999999, userId });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cost Summary');

    // Add headers
    worksheet.columns = [
        { header: '部门', key: 'departmentName', width: 20 },
        { header: '岗位', key: 'position', width: 20 },
        { header: '可用预算额度', key: 'availableBudget', width: 18 },
        { header: '已消耗实际费用', key: 'consumedCost', width: 18 },
        { header: '剩余可用费用', key: 'remainingCost', width: 18 },
        { header: '费用消耗占比', key: 'consumptionRatio', width: 18, style: { numFmt: '0.00%' } },
        { header: '工时基数', key: 'totalWorkHours', width: 15 },
        { header: '时薪单价', key: 'hourlyRate', width: 15 },
        { header: '福利分摊明细', key: 'welfareCost', width: 18 },
    ];

    // Add data rows
    worksheet.addRows(data.detailTable.items.map(item => ({
        departmentName: item.department_name,
        position: item.position,
        availableBudget: item.available_budget,
        consumedCost: item.total_cost,
        remainingCost: item.remainingCost,
        consumptionRatio: item.consumptionRatio,
        totalWorkHours: item.total_work_hours,
        hourlyRate: item.hourly_rate,
        welfareCost: item.welfare_cost,
    })));

    return await workbook.xlsx.writeBuffer();
};

// 手动重算指定财月�?Cost 数据
export const recalculateFiscalMonthCost = async (dateParam, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let fiscalStart, fiscalEnd, logIdentifier;


        if (Array.isArray(dateParam)) { // Custom date range (e.g., last 7/14 days)
            fiscalStart = dayjs(dateParam[0]);
            fiscalEnd = dayjs(dateParam[1]);
            logIdentifier = `${dateParam[0]} �?${dateParam[1]}`;
        } else if (dateParam.length === 7 && dateParam.includes('-')) { // YYYY-MM (monthly)
            const year = parseInt(dateParam.substring(0, 4));
            const month = parseInt(dateParam.substring(5, 7));
            // NOTE: dayjs month is 0-indexed, so month - 1 is correct for month().
            // For fiscal month, we define it from 24th of previous month to 23rd of current month.
            // Example: 2026-06 fiscal month is 2026-05-24 to 2026-06-23.
            fiscalStart = dayjs(`${year}-${month}-24`).subtract(1, 'month');
            fiscalEnd = dayjs(`${year}-${month}-23`);
            logIdentifier = `财月 ${dateParam}`;
        } else if (dateParam.length === 4) { // YYYY (yearly)
            fiscalStart = dayjs(`${dateParam}-01-01`);
            fiscalEnd = dayjs(`${dateParam}-12-31`);
            logIdentifier = `年度 ${dateParam}`;
        } else if (dateParam.length === 7 && dateParam.includes('W')) { // YYYY-WW (weekly)
            const year = parseInt(dateParam.substring(0, 4));
            const week = parseInt(dateParam.substring(5, 7));
            // For week, we assume ISO week date. dayjs().isoWeek() might be useful.
            // For simplicity, we'll approximate as start of week for the given year and week.
            fiscalStart = dayjs().year(year).isoWeek(week).startOf('isoWeek');
            fiscalEnd = dayjs().year(year).isoWeek(week).endOf('isoWeek');
            logIdentifier = `�?${dateParam}`;
        } else {
            throw new Error('Invalid date parameter format for recalculation');
        }


        const daysInFiscalMonth = fiscalEnd.diff(fiscalStart, 'day') + 1;


        // 1. Fetch base data needed for calculation
        // 获取排班工时（从排班表关联班次时长表）
        const [
            scheduleWorkHoursResult,
            temporaryOvertimeResult,
            temporaryLeaveResult,
            hourlyRatesResult,
            welfareConfigResult,
            personnelResult,
            departmentMappingResult,
            budgetConfigResult,
            shiftDurationResult,
        ] = await Promise.all([
            // 从排班表获取工时，按员工和班次分组
            client.query(`
                SELECT
                    s.employee_id,
                    s.shift,
                    COUNT(*) as shift_count,
                    SUM(COALESCE(sr.duration_hours, 8)) as total_hours
                FROM ${SCHEDULE_TABLE} s
                LEFT JOIN (
                    SELECT DISTINCT ON (shift_name) shift_name, duration_hours
                    FROM ${SHIFT_DURATION_RULES_TABLE}
                    WHERE status = 'active'
                ) sr ON s.shift = sr.shift_name
                WHERE s.schedule_date BETWEEN $1 AND $2
                GROUP BY s.employee_id, s.shift
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD')]),
            // 获取临时加班工时（已批准的）
            client.query(`
                SELECT employee_id, SUM(hours) as total_overtime_hours
                FROM ${TEMPORARY_OVERTIME_TABLE}
                WHERE status = 'approved'
                  AND overtime_date BETWEEN $1 AND $2
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD')]),
            // 获取临时请假工时（已批准的）
            client.query(`
                SELECT employee_id, SUM(hours) as total_leave_hours
                FROM ${TEMPORARY_LEAVE_TABLE}
                WHERE status = 'approved'
                  AND start_date BETWEEN $1 AND $2
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD')]),
            // 获取时薪配置
            client.query(`SELECT level, standard_rate FROM ${HOURLY_RATE_TABLE} WHERE start_time <= $1 ORDER BY start_time DESC`, [fiscalEnd.format('YYYY-MM-DD')]),
            // 获取福利配置
            client.query(`SELECT base_amount FROM ${WELFARE_CONFIG_TABLE} WHERE effective_date <= $1 ORDER BY effective_date DESC LIMIT 1`, [fiscalEnd.format('YYYY-MM-DD')]),
            // 获取在职人员
            client.query(`SELECT id, department_id, position, level, employee_type FROM ${USER_TABLE} WHERE status = 'active';`),
            // 获取部门-厂区映射
            client.query(`SELECT id, plant_id FROM jso_org_department_management;`),
            // 获取预算配置
            client.query(`SELECT department_id, plant_id, estimated_cost FROM ${DEPT_RULES_TABLE} WHERE business_month = $1`, [dateParam]),
            // 获取所有班次时长（用于汇总计算）
            client.query(`SELECT shift_name, duration_hours FROM ${SHIFT_DURATION_RULES_TABLE} WHERE status = 'active'`),
        ]);

        // 构建临时加班/请假 Map
        const overtimeMap = new Map();
        temporaryOvertimeResult.rows.forEach(row => {
            overtimeMap.set(row.employee_id, parseFloat(row.total_overtime_hours) || 0);
        });

        const leaveMap = new Map();
        temporaryLeaveResult.rows.forEach(row => {
            leaveMap.set(row.employee_id, parseFloat(row.total_leave_hours) || 0);
        });

        const welfareConfig = welfareConfigResult.rows[0];
        const hourlyRates = hourlyRatesResult.rows;
        const departmentMappings = departmentMappingResult.rows;
        const budgetConfigs = budgetConfigResult.rows;
        const shiftDurationMap = new Map(shiftDurationResult.rows.map(r => [r.shift_name, parseFloat(r.duration_hours)]));

        // Create a map for quick department-to-plant lookup
        const deptPlantMap = new Map(departmentMappings.map(d => [d.id, d.plant_id]));

        // Create a map for quick budget lookup (dept_id -> plant_id -> estimated_cost)
        const budgetMap = new Map();
        for (const config of budgetConfigs) {
            if (!budgetMap.has(config.department_id)) {
                budgetMap.set(config.department_id, new Map());
            }
            const parsedEstimatedCost = parseFloat(config.estimated_cost);
            budgetMap.get(config.department_id).set(config.plant_id, parsedEstimatedCost);
        }

        // 2. Calculate welfare cost: 福利基础 × 3PL人数 ÷ 月天数 (RMB)
        const total3plEmployees = personnelResult.rows.filter(p => p.employee_type === '3PL').length;
        const welfareBaseAmountRMB = welfareConfig ? parseFloat(welfareConfig.base_amount) : 0;
        const monthlyWelfareCostRMB = (welfareBaseAmountRMB * total3plEmployees) / daysInFiscalMonth;
        console.log(`[recalculateFiscalMonthCost] 福利费用计算: ${welfareBaseAmountRMB} × ${total3plEmployees} ÷ ${daysInFiscalMonth} = ${monthlyWelfareCostRMB} RMB/月`);

        // 3. 按部门+岗位分组汇总工时
        const aggregationMap = new Map();
        const employeeWorkHoursMap = new Map(); // 存储每个员工的工时

        // 先汇总每个员工的工时
        for (const row of scheduleWorkHoursResult.rows) {
            const employeeId = row.employee_id;
            const totalHours = parseFloat(row.total_hours);

            if (!employeeWorkHoursMap.has(employeeId)) {
                employeeWorkHoursMap.set(employeeId, 0);
            }
            employeeWorkHoursMap.set(employeeId, employeeWorkHoursMap.get(employeeId) + totalHours);
        }

        for (const person of personnelResult.rows) {
            // Skip if department_id is null
            if (person.department_id === null) {
                console.warn(`[recalculateFiscalMonthCost] - Skipping person ID ${person.id} due to null department_id.`);
                continue;
            }
            const key = `${person.department_id}|${person.position}`;

            const plantIdForDept = deptPlantMap.get(person.department_id);
            const exchangeRate = await getExchangeRateForMonth(dateParam, person.department_id, plantIdForDept);

            // 获取预算 (RMB)
            const estimatedBudgetRMB = budgetMap.has(person.department_id) && budgetMap.get(person.department_id).has(plantIdForDept)
                                    ? budgetMap.get(person.department_id).get(plantIdForDept)
                                    : 0;
            const estimatedBudgetUSD = exchangeRate > 0 ? estimatedBudgetRMB / exchangeRate : 0;

            // 获取时薪 (RMB)
            const hourlyRateRMB = parseFloat(hourlyRates.find(r => r.level === person.level)?.standard_rate) || 0;

            if (!aggregationMap.has(key)) {
                aggregationMap.set(key, {
                    fiscal_month: dateParam,
                    department_id: person.department_id,
                    position: person.position,
                    total_work_hours: 0,
                    hourly_rate: 0,
                    welfare_cost: 0,
                    total_cost: 0,
                    available_budget: estimatedBudgetUSD,
                    employee_count: 0,
                });
            }

            const group = aggregationMap.get(key);
            group.employee_count++;

            // 累加工时 = 排班工时 + 临时加班 - 临时请假
            const scheduleHours = employeeWorkHoursMap.get(person.id) || 0;
            const overtimeHours = overtimeMap.get(person.id) || 0;
            const leaveHours = leaveMap.get(person.id) || 0;
            const workHours = scheduleHours + overtimeHours - leaveHours;
            group.total_work_hours += workHours;
        }

        // 4. 计算每个组的费用
        // 公式: 总费用 = (工时 × 时薪 + 福利费用) ÷ 汇率
        for (const [key, group] of aggregationMap.entries()) {
            if (group.employee_count > 0) {
                // 平均时薪 (取该组第一个人的时薪，因为同组同岗同级别)
                const person = personnelResult.rows.find(p => `${p.department_id}|${p.position}` === key);
                const hourlyRateRMB = person ? parseFloat(hourlyRates.find(r => r.level === person.level)?.standard_rate) || 0 : 0;

                // 计算工时费用 (RMB)
                const workCostRMB = group.total_work_hours * hourlyRateRMB;

                // 计算福利费用 (RMB) - 所有3PL的福利总费用按人数分摊
                const groupWelfareCostRMB = monthlyWelfareCostRMB * group.employee_count;

                // 总费用 (RMB)
                const totalCostRMB = workCostRMB + groupWelfareCostRMB;

                // 获取汇率并转换为USD
                const plantIdForDept = deptPlantMap.get(group.department_id);
                const exchangeRate = await getExchangeRateForMonth(dateParam, group.department_id, plantIdForDept);
                const totalCostUSD = exchangeRate > 0 ? totalCostRMB / exchangeRate : 0;
                const welfareCostUSD = exchangeRate > 0 ? groupWelfareCostRMB / exchangeRate : 0;

                group.hourly_rate = exchangeRate > 0 ? hourlyRateRMB / exchangeRate : 0;
                group.welfare_cost = welfareCostUSD;
                group.total_cost = totalCostUSD;

                console.log(`[recalculateFiscalMonthCost] 组 ${key}: 工时=${group.total_work_hours}, 时薪=${hourlyRateRMB} RMB, 汇率=${exchangeRate}`);
                console.log(`  排班工时费用=${workCostRMB} RMB, 福利费用=${groupWelfareCostRMB} RMB, 总费用=${totalCostRMB} RMB`);
                console.log(`  转换为USD: 工时费用=${workCostRMB/exchangeRate}, 福利费用=${welfareCostUSD}, 总费用=${totalCostUSD}`);
            }
        }

        // 5. Delete old data and insert new pre-calculated data
        const deleteResult = await client.query(`DELETE FROM ${COST_SUMMARY_TABLE} WHERE fiscal_month = $1`, [dateParam]);
        
        let insertedRowCount = 0;
        for (const group of aggregationMap.values()) {
            // Only insert if total_cost or available_budget is greater than 0, or if there's actual work hours
            if (group.total_cost > 0 || group.available_budget > 0 || group.total_work_hours > 0) {
                const insertQuery = `
                        INSERT INTO ${COST_SUMMARY_TABLE} 
                        (fiscal_month, department_id, position, available_budget, total_cost, total_work_hours, hourly_rate, welfare_cost)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT ON CONSTRAINT jso_cost_summary_data_unique_fiscal_dept_position DO UPDATE SET
                            available_budget = EXCLUDED.available_budget,
                            total_cost = EXCLUDED.total_cost,
                            total_work_hours = EXCLUDED.total_work_hours,
                            hourly_rate = EXCLUDED.hourly_rate,
                            welfare_cost = EXCLUDED.welfare_cost;
                    `;
                const insertParams = [
                    dateParam, 
                    group.department_id,
                    group.position,
                    group.available_budget,
                    group.total_cost,
                    group.total_work_hours,
                    group.hourly_rate,
                    group.welfare_cost,
                ];
                const insertResult = await client.query(insertQuery, insertParams);
                insertedRowCount++;
            } else {
            }
        }
        
        await client.query('COMMIT');
    } catch (error) {
        console.error(`[recalculateFiscalMonthCost] - Caught error. Rolling back transaction.`);
        await client.query('ROLLBACK');
        console.error(`重算财月 ${dateParam} 数据失败:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// 手动触发所有月份的 Cost 数据重算
export const triggerRecalculationForAllMonths = async () => {
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];
    for (const month of months) {
        try {
            // Assuming a dummy userId for system-triggered recalculation
            await recalculateFiscalMonthCost(month, 1); // Use an admin user ID, e.g., 1
        } catch (error) {
            console.error(`[triggerRecalculationForAllMonths] - Failed to recalculate for ${month}:`, error);
        }
    }
};

// 定时任务触发的预计算函数
export const precalculateCostSummary = async () => {
    // Get the current fiscal month
    const currentFiscalMonth = dayjs().date() >= 24 
        ? dayjs().format('YYYY-MM') 
        : dayjs().subtract(1, 'month').format('YYYY-MM');

    try {
        // Recalculate for the current fiscal month
        await recalculateFiscalMonthCost(currentFiscalMonth, null); // `null` for userId as it's a system task
    } catch (error) {
        console.error(`定时预计算财�?${currentFiscalMonth} 失败:`, error);
    }
};
