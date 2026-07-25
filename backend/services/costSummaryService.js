import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';
dayjs.extend(isoWeek);

import ExcelJS from 'exceljs';

import pool from '../config/db.js';
import { COST_SUMMARY_TABLE, USER_TABLE, HOURLY_RATE_TABLE, WELFARE_CONFIG_TABLE, WELFARE_AMOUNT_TABLE, DEPT_RULES_TABLE, PLANT_TABLE, DEPT_TABLE, SHIFT_DURATION_RULES_TABLE, SCHEDULE_TABLE, TEMPORARY_OVERTIME_TABLE, TEMPORARY_LEAVE_TABLE } from '../config/db_constants.js';

/**
 * 计算简单移动平均
 * @param {number[]} data - 数据数组
 * @param {number} period - 周期
 * @returns {number[]} 移动平均值数组（与输入长度相同，前面填充0）
 */
function calculateSimpleMovingAverage(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0); // 数据不足周期时填充0
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    }
  }
  return result;
}

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
export const getCostSummaryData = async ({ fiscalMonth: inputFiscalMonth, fiscalYear, fiscalWeek, fiscalDate, startDate, endDate, departmentIds, positions, plantId, page, pageSize, userId }) => {
    const client = await pool.connect();
    try {
        const permissions = await getUserPermissions(userId);
        const { offset } = { offset: (page - 1) * pageSize };

        // 计算财月日期范围
        let fiscalStart, fiscalEnd, dateParam;
        const today = dayjs().format('YYYY-MM-DD');
        let fiscalYearNum = null;
        let fiscalMonthNum = null;
        let fiscalMonth = null; // 用于返回的财月标识

        if (fiscalDate) {
            // 按天查询：该日期所在的财月
            const selectedDate = dayjs(fiscalDate);
            const selectedYear = selectedDate.year();
            const selectedMonth = selectedDate.month() + 1; // 1-12

            // 判断该日期属于哪个财月（24日-23日）
            // 财月定义: 每月24日至次月23日
            // 例如: 2026-07 财月 = 2026-06-24 至 2026-07-23
            // 2026-08 财月 = 2026-07-24 至 2026-08-23
            if (selectedDate.date() >= 24) {
                // 24日及之后属于下一个财月
                if (selectedMonth === 12) {
                    fiscalMonthNum = 1;
                    fiscalYearNum = selectedYear + 1;
                } else {
                    fiscalMonthNum = selectedMonth + 1;
                    fiscalYearNum = selectedYear;
                }
            } else {
                // 1-23日属于当前财月
                fiscalMonthNum = selectedMonth;
                fiscalYearNum = selectedYear;
            }

            // 财月开始（24日）和结束（23日）
            if (selectedDate.date() >= 24) {
                fiscalStart = dayjs(`${selectedYear}-${selectedMonth}-24`);
            } else {
                const prevMonth = selectedDate.subtract(1, 'month');
                fiscalStart = dayjs(`${prevMonth.year()}-${prevMonth.month() + 1}-24`);
            }
            fiscalEnd = selectedDate.endOf('day');
            dateParam = fiscalDate;
            // 设置返回的 fiscalMonth (格式 YYYY-MM)
            fiscalMonth = `${fiscalYearNum}-${String(fiscalMonthNum).padStart(2, '0')}`;
        } else if (inputFiscalMonth) {
            fiscalYearNum = parseInt(inputFiscalMonth.substring(0, 4));
            fiscalMonthNum = parseInt(inputFiscalMonth.substring(5, 7));
            fiscalStart = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-24`).subtract(1, 'month');
            fiscalEnd = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-23`);
            dateParam = inputFiscalMonth;
            fiscalMonth = inputFiscalMonth; // 已经是 YYYY-MM 格式
        } else if (fiscalYear) {
            fiscalYearNum = parseInt(fiscalYear);
            fiscalStart = dayjs(`${fiscalYearNum}-01-01`);
            fiscalEnd = dayjs(`${fiscalYearNum}-12-31`);
            dateParam = String(fiscalYear);
        } else if (fiscalWeek) {
            // fiscalWeek 格式: "YYYY-WW" (如 "2026-W29")
            const year = parseInt(fiscalWeek.substring(0, 4));
            const week = parseInt(fiscalWeek.split('-W')[1]); // 从 "-W29" 提取 29

            // ISO 8601: 第1周是包含1月4日的那一周
            // 计算该年 ISO 第1周的周一
            const jan4 = dayjs(`${year}-01-04`);
            const jan4Day = jan4.isoWeekday(); // 1 = Monday, 7 = Sunday

            // ISO 第1周的周一是 1月4日 - (星期几 - 1) 天
            const week1Monday = jan4.subtract(jan4Day - 1, 'day');

            // 目标 ISO 周的周一 = 第1周周一 + (目标周 - 1) * 7天
            fiscalStart = week1Monday.add(week - 1, 'week').startOf('day');
            fiscalEnd = fiscalStart.add(6, 'day').endOf('day');
            dateParam = fiscalWeek;
        } else if (startDate && endDate) {
            fiscalStart = dayjs(startDate);
            fiscalEnd = dayjs(endDate);
            dateParam = 'custom';
        } else {
            // 默认当天
            const now = dayjs();
            fiscalYearNum = now.year();
            fiscalMonthNum = now.month() + 1;

            // 判断属于哪个财月
            if (now.date() >= 24) {
                fiscalStart = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-24`);
            } else {
                fiscalStart = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-24`).subtract(1, 'month');
            }
            fiscalEnd = now.endOf('day');
            dateParam = now.format('YYYY-MM-DD');
        }

        // 只有当前财月/财周/财日才截断到今天，历史用完整日期范围
        const currentFiscalMonth = dayjs().format('YYYY-MM');
        const currentFiscalWeek = dayjs().format('YYYY-WW');
        const currentDate = dayjs().format('YYYY-MM-DD');
        if ((dateParam === currentFiscalMonth || dateParam === currentFiscalWeek || dateParam === currentDate) && fiscalEnd.isAfter(dayjs())) {
            fiscalEnd = dayjs();
        }

        // 完整财月天数（用于福利费计算）
        let daysInFullFiscalMonth = 30; // 默认30天
        if (fiscalYearNum && fiscalMonthNum) {
            const fullFiscalMonthEnd = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-23`);
            const fullFiscalMonthStart = dayjs(`${fiscalYearNum}-${fiscalMonthNum}-24`).subtract(1, 'month');
            daysInFullFiscalMonth = fullFiscalMonthEnd.diff(fullFiscalMonthStart, 'day') + 1;
        }

        // 实际计算期间天数（用于工时计算）
        const daysInFiscalMonth = fiscalEnd.diff(fiscalStart, 'day') + 1;

        // 计算周度或日度覆盖的财月天数（需要在并行查询前计算，供后续使用）
        let fiscalMonthsCovered = new Map();
        if (fiscalWeek || fiscalDate) {
            let weekStart, weekEnd;
            if (fiscalWeek) {
                const weekYear = parseInt(fiscalWeek.substring(0, 4));
                const weekNum = parseInt(fiscalWeek.split('-W')[1]);

                // ISO 8601: 第1周是包含1月4日的那一周
                const jan4 = dayjs(`${weekYear}-01-04`);
                const jan4Day = jan4.isoWeekday();
                const week1Monday = jan4.subtract(jan4Day - 1, 'day');
                weekStart = week1Monday.add(weekNum - 1, 'week').startOf('day');
                weekEnd = weekStart.add(6, 'day').endOf('day');
            } else {
                // fiscalDate: 计算该日期所在的完整财周（周一到周日）
                const selectedDate = dayjs(fiscalDate);
                weekStart = selectedDate.startOf('week').add(1, 'day').startOf('day'); // ISO 周一
                weekEnd = weekStart.add(6, 'day').endOf('day');
            }

            let current = weekStart;
            while (current.isBefore(weekEnd) || current.isSame(weekEnd, 'day')) {
                const date = current.date();
                const month = current.month(); // 0-indexed (January=0, December=11)
                const year = current.year();
                let fiscalMonth;
                // 财月定义: 每月24日至次月23日
                // 2026-07 = 6月24日至7月23日
                // 2026-01 = 12月24日(上一年)至1月23日
                if (date >= 24) {
                    // 24日及之后属于当月
                    fiscalMonth = month === 11
                        ? `${year + 1}-01`
                        : `${year}-${String(month + 2).padStart(2, '0')}`;
                } else {
                    // 1-23日属于当月
                    fiscalMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
                }
                fiscalMonthsCovered.set(fiscalMonth, (fiscalMonthsCovered.get(fiscalMonth) || 0) + 1);
                current = current.add(1, 'day');
            }
        }

        // 时薪查询日期: +1天因为fiscalEnd是周日的00:00, 时薪从周一的08:00开始
        const hourlyRateDate = fiscalEnd.clone().add(1, 'day').format('YYYY-MM-DD');
        // 时薪查询日期

        // 并行查询所有基础数据
        // 注意: 数据库中的日期存储格式与查询时的时区处理:
        // 1. 排班表等使用 DATE(column AT TIME ZONE 'Asia/Shanghai') 获取本地日期进行过滤
        // 2. 时薪表使用 start_time < ($1::date + interval '1 day') 来包含当天数据
        const scheduleWorkHoursResult = await client.query(`
            SELECT s.employee_id, SUM(COALESCE(sr.duration_hours, 8)) as total_hours
            FROM (
                SELECT DISTINCT ON (s2.employee_id, DATE(s2.schedule_date AT TIME ZONE 'Asia/Shanghai'))
                    s2.employee_id, s2.schedule_date, s2.shift
                FROM ${SCHEDULE_TABLE} s2
                WHERE DATE(s2.schedule_date AT TIME ZONE 'Asia/Shanghai') >= $1::date
                  AND DATE(s2.schedule_date AT TIME ZONE 'Asia/Shanghai') < $2::date
                ORDER BY s2.employee_id, DATE(s2.schedule_date AT TIME ZONE 'Asia/Shanghai')
            ) s
            LEFT JOIN ${USER_TABLE} u ON s.employee_id = u.id
            LEFT JOIN ${SHIFT_DURATION_RULES_TABLE} sr
                ON sr.plant_id = u.plant_id
                AND sr.department_id = u.department_id
                AND sr.shift_name = s.shift
                AND sr.status = 'active'
            WHERE DATE(s.schedule_date AT TIME ZONE 'Asia/Shanghai') <= $3::date
            GROUP BY s.employee_id
        `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]);

        // 并行查询其他数据
        const [
            temporaryOvertimeResult,
            temporaryLeaveResult,
            hourlyRatesResult,
            welfareConfigResult,
            personnelResult,
            departmentMappingResult,
            departmentsResult,
            budgetConfigResult,
        ] = await Promise.all([
            // 临时加班工时（已批准的，只算到今天）
            client.query(`
                SELECT employee_id, SUM(hours) as total_overtime_hours
                FROM ${TEMPORARY_OVERTIME_TABLE}
                WHERE status = 'approved'
                  AND overtime_date BETWEEN $1::date AND $2::date
                  AND overtime_date <= $3::date
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), today]),
            // 临时请假工时（已批准的，只算到今天）
            client.query(`
                SELECT employee_id, SUM(hours) as total_leave_hours
                FROM ${TEMPORARY_LEAVE_TABLE}
                WHERE status = 'approved'
                  AND start_date BETWEEN $1::date AND $2::date
                  AND start_date <= $3::date
                GROUP BY employee_id
            `, [fiscalStart.format('YYYY-MM-DD'), fiscalEnd.format('YYYY-MM-DD'), today]),
            // 时薪配置 (如果有特定日期的配置则使用，否则使用最新的配置)
            client.query(`
              WITH latest_rates AS (
                SELECT DISTINCT ON (level) level, standard_rate, start_time
                FROM ${HOURLY_RATE_TABLE}
                ORDER BY level, start_time DESC
              )
              SELECT level, standard_rate FROM latest_rates
            `),
            // 福利配置 (jso_config_welfare - 100元/人)
            client.query(`SELECT employee_type, amount FROM ${WELFARE_AMOUNT_TABLE}`),
            // 在职人员
            client.query(`SELECT id, department_id, plant_id, position, level, employee_type FROM ${USER_TABLE} WHERE status = 'active'`),
            // 部门-厂区映射
            client.query(`SELECT id, plant_id FROM jso_org_department_management`),
            // 部门名称映射 (用于获取部门名称)
            client.query(`SELECT id, name FROM jso_org_department_management`),
            // 预算配置
            // 年度: 汇总该年度所有月份的预算
            // 周度: 按该周覆盖的财月天数比例计算预算
            // 月度: 使用该月预算
            (() => {
                if (fiscalYear && !fiscalMonth && !fiscalWeek && !fiscalDate) {
                    // 年度: 查询该年度所有月份
                    return client.query(`SELECT department_id, plant_id, SUM(estimated_cost) as estimated_cost, AVG(exchange_rate) as exchange_rate FROM ${DEPT_RULES_TABLE} WHERE business_month LIKE $1 GROUP BY department_id, plant_id`, [`${fiscalYear}-%`]);
                } else if (fiscalWeek || fiscalDate) {
                    // 周度或日度: 查询覆盖的财月预算
                    const monthList = Array.from(fiscalMonthsCovered.keys()).sort();
                    if (monthList.length === 0) {
                        // Fallback: 使用当前财月
                        const currentFiscalMonth = dayjs().date() >= 24
                            ? dayjs().format('YYYY-MM')
                            : dayjs().subtract(1, 'month').format('YYYY-MM');
                        return client.query(`SELECT department_id, plant_id, estimated_cost, exchange_rate FROM ${DEPT_RULES_TABLE} WHERE business_month = $1`, [currentFiscalMonth]);
                    }
                    // 查询这些月份的预算
                    return client.query(`SELECT department_id, plant_id, estimated_cost, exchange_rate, business_month FROM ${DEPT_RULES_TABLE} WHERE business_month = ANY($1)`, [monthList]);
                } else {
                    // 月度或默认: 使用指定月份预算
                    return client.query(`SELECT department_id, plant_id, estimated_cost, exchange_rate FROM ${DEPT_RULES_TABLE} WHERE business_month = $1`, [dateParam]);
                }
            })(),
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

        // 构建预算Map，支持周度/日度按比例计算
        if (fiscalWeek || fiscalDate) {
            // 计算该周覆盖的财月天数比例（复用上面计算的结果）
            const fiscalMonthsDays = new Map();
            budgetConfigResult.rows.forEach(config => {
                const fiscalMonth = config.business_month;
                // 从fiscalMonthsCovered获取该财月的天数，如果不存在则按7天估算
                const daysInThisMonth = fiscalMonthsCovered.get(fiscalMonth) || 0;
                fiscalMonthsDays.set(fiscalMonth, daysInThisMonth);
            });

            const totalDays = Array.from(fiscalMonthsDays.values()).reduce((a, b) => a + b, 0);
            for (const config of budgetConfigResult.rows) {
                const key = `${config.department_id}-${config.plant_id}`;
                const fiscalMonth = config.business_month;
                const daysInThisMonth = fiscalMonthsDays.get(fiscalMonth) || 0;
                const ratio = totalDays > 0 ? daysInThisMonth / totalDays : 0;
                const proportionalBudget = (parseFloat(config.estimated_cost) || 0) * ratio;
                budgetMap.set(key, (budgetMap.get(key) || 0) + proportionalBudget);
                // 使用加权平均汇率
                const currentRate = exchangeRateMap.get(key) || 0;
                const newRate = parseFloat(config.exchange_rate) || 7.2;
                if (currentRate === 0) {
                    exchangeRateMap.set(key, newRate);
                } else {
                    // 加权平均
                    const totalBudget = budgetMap.get(key);
                    exchangeRateMap.set(key, (currentRate * (totalBudget - proportionalBudget) + newRate * proportionalBudget) / totalBudget);
                }
            }
        } else {
            // 月度或年度: 直接使用预算
            for (const config of budgetConfigResult.rows) {
                const key = `${config.department_id}-${config.plant_id}`;
                budgetMap.set(key, parseFloat(config.estimated_cost) || 0);
                exchangeRateMap.set(key, parseFloat(config.exchange_rate) || 7.2);
            }
        }

        // 福利费用: 100元/人 × 3PL人数 ÷ 完整财月天数
        const welfareConfigs = welfareConfigResult.rows;
        const total3plEmployees = personnelResult.rows.filter(p => p.employee_type === '3PL').length;
        const welfarePerEmployee = 100; // jso_config_welfare.amount = 100元/人
        const dailyWelfareCostRMB = daysInFullFiscalMonth > 0 ? (welfarePerEmployee * total3plEmployees) / daysInFullFiscalMonth : 0;

        // 按部门+岗位分组（岗位去重，级别用于计算时薪）
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

            // 按 部门|岗位 分组（岗位去重）
            const key = `${person.department_id}|${person.position}`;

            if (!aggregationMap.has(key)) {
                aggregationMap.set(key, {
                    department_id: person.department_id,
                    department_name: deptNameMap.get(person.department_id) || '',
                    position: person.position,
                    levels: [], // 存储该岗位下所有级别
                    total_work_hours: 0,
                    employee_count: 0,
                    three_pl_count: 0,
                    // 按级别分组工时，用于精确计算费用
                    levelHours: new Map(), // level -> total_hours
                    levelCount: new Map(), // level -> employee_count
                });
            }

            const group = aggregationMap.get(key);
            group.employee_count++;
            group.three_pl_count++;

            // 记录级别信息
            if (person.level && !group.levels.includes(person.level)) {
                group.levels.push(person.level);
            }

            // 按级别记录工时（用于计算费用）
            const personLevel = person.level || 'Unknown';
            const currentLevelHours = group.levelHours.get(personLevel) || 0;
            const currentLevelCount = group.levelCount.get(personLevel) || 0;

            // 工时 = 排班工时 + 临时加班 - 临时请假
            const scheduleHours = employeeWorkHoursMap.get(person.id) || 0;
            const overtimeHours = overtimeMap.get(person.id) || 0;
            const leaveHours = leaveMap.get(person.id) || 0;
            const totalPersonHours = scheduleHours + overtimeHours - leaveHours;

            group.levelHours.set(personLevel, currentLevelHours + totalPersonHours);
            group.levelCount.set(personLevel, currentLevelCount + 1);
            group.total_work_hours += totalPersonHours;
        }

        // 计算费用
        const items = [];
        let totalAvailableBudget = 0;
        let totalConsumedCost = 0;

        // 第一遍：计算每个部门的总人数（用于分摊预算）
        const deptTotalEmployeeCount = new Map();
        for (const group of aggregationMap.values()) {
            const plantIdForDept = deptPlantMap.get(group.department_id);
            const budgetKey = `${group.department_id}-${plantIdForDept}`;
            const currentCount = deptTotalEmployeeCount.get(budgetKey) || 0;
            deptTotalEmployeeCount.set(budgetKey, currentCount + group.employee_count);
        }

        // 第二遍：计算每个岗位的费用和分摊预算
        for (const group of aggregationMap.values()) {
            const plantIdForDept = deptPlantMap.get(group.department_id);
            const budgetKey = `${group.department_id}-${plantIdForDept}`;

            // 获取汇率
            const exchangeRate = exchangeRateMap.get(budgetKey) || 7.2;

            // 获取部门总预算 (RMB)
            const estimatedBudgetRMB = budgetMap.get(budgetKey) || 0;
            const deptTotalBudgetUSD = exchangeRate > 0 ? estimatedBudgetRMB / exchangeRate : 0;

            // 计算该岗位的人数占比
            const deptTotalEmployees = deptTotalEmployeeCount.get(budgetKey) || 1;
            const positionRatio = group.employee_count / deptTotalEmployees;

            // 该岗位分摊的预算 = 部门总预算 × (该岗位人数 / 部门总人数)
            const availableBudgetUSD = deptTotalBudgetUSD * positionRatio;

            // 计算工时费用 (RMB) - 按级别分别计算
            let workCostRMB = 0;
            let primaryLevel = null;
            let primaryLevelRateUSD = 0;

            for (const [level, hours] of group.levelHours.entries()) {
                // 获取该级别的时薪
                const levelLower = (level || '').toLowerCase().replace(/\s+/g, ' ').trim();
                const levelRateRMB = parseFloat(
                    hourlyRatesResult.rows.find(r => (r.level || '').toLowerCase().replace(/\s+/g, ' ').trim() === levelLower)?.standard_rate
                ) || 0;

                workCostRMB += hours * levelRateRMB;

                // 记录主要级别（人数最多的级别）用于显示
                const count = group.levelCount.get(level) || 0;
                if (!primaryLevel || count > (group.levelCount.get(primaryLevel) || 0)) {
                    primaryLevel = level;
                    primaryLevelRateUSD = exchangeRate > 0 ? levelRateRMB / exchangeRate : 0;
                }
            }

            // 计算福利费用: [(该岗位人数/总人数) × (100 × 总人数 ÷ 财月天数)] ÷ 汇率
            const totalEmployees = deptTotalEmployeeCount.get(budgetKey) || 1;
            const posRatio = group.employee_count / totalEmployees;
            const welfarePerTotalRMB = (welfarePerEmployee * totalEmployees) / daysInFullFiscalMonth;
            const groupWelfareCostRMB = posRatio * welfarePerTotalRMB;
            const welfareCostUSD = exchangeRate > 0 ? groupWelfareCostRMB / exchangeRate : 0;

            // 总费用 (RMB) 转换为 USD
            const totalCostRMB = workCostRMB + groupWelfareCostRMB;
            const totalCostUSD = exchangeRate > 0 ? totalCostRMB / exchangeRate : 0;

            // 该岗位分摊的预算已计算完成，累加到总预算
            totalAvailableBudget += availableBudgetUSD;

            // 构建各级别人数和工时对象
            const levelCounts = {};
            const levelHours = {};
            const levelCosts = {};

            for (const [level, count] of group.levelCount.entries()) {
                if (count > 0) {
                    const levelKey = `level_${level.replace(/\s+/g, '_').toLowerCase()}`;
                    levelCounts[levelKey] = count;
                    // 获取该级别的工时
                    const hours = group.levelHours.get(level) || 0;
                    levelHours[levelKey] = hours;
                    // 获取该级别的时薪(RMB)并计算费用，再除以汇率转为USD
                    const levelLower = (level || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    const levelRateRMB = parseFloat(
                        hourlyRatesResult.rows.find(r => (r.level || '').toLowerCase().replace(/\s+/g, ' ').trim() === levelLower)?.standard_rate
                    ) || 0;
                    const levelCostRMB = hours * levelRateRMB;
                    // 级别单价单位是RMB，需要除以汇率转为USD
                    const levelCostUSD = exchangeRate > 0 ? levelCostRMB / exchangeRate : 0;
                    levelCosts[levelKey] = levelCostUSD;
                }
            }

            items.push({
                fiscal_date: fiscalDate || null,
                fiscal_month: fiscalMonth || null,
                fiscal_year: fiscalYear || null,
                fiscal_week: fiscalWeek || null,
                department_id: group.department_id,
                department_name: group.department_name,
                position: group.position,
                level: primaryLevel, // 显示主要级别
                employee_count: group.employee_count, // 该岗位总人数
                level_counts: levelCounts, // 各级别人数 {level_6_count: 3, level_5_count: 2}
                level_hours: levelHours, // 各级别工时 {level_6_count: 160, level_5_count: 80}
                level_costs: levelCosts, // 各级别费用 {level_6_count: 640, level_5_count: 280}
                total_work_hours: group.total_work_hours,
                hourly_rate: primaryLevelRateUSD,
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

        // 按岗位汇总（费用排名）
        const positionConsumptionMap = new Map();
        for (const item of items) {
            const name = item.position || '未分类';
            positionConsumptionMap.set(name, (positionConsumptionMap.get(name) || 0) + item.total_cost);
        }
        const positionRanking = Array.from(positionConsumptionMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // 计算趋势预测（按当前消耗速度预测月底费用）
        const daysElapsed = fiscalEnd.diff(fiscalStart, 'day') + 1;
        const daysInFullPeriod = daysInFullFiscalMonth; // 完整期间天数
        // 每周平均费用 = 可用预算额度 / 对应财月天数 * 7
        const dailyAverageCost = daysInFullPeriod > 0 ? (totalAvailableBudget / daysInFullPeriod) * 7 : 0;
        const predictedTotalCost = dailyAverageCost / 7 * daysInFullPeriod;
        const trendForecast = {
            currentCost: totalConsumedCost,
            dailyAverageCost,
            daysElapsed,
            daysRemaining: Math.max(0, daysInFullPeriod - daysElapsed),
            predictedTotalCost,
            budgetUsedRatio: daysElapsed > 0 ? (daysElapsed / daysInFullPeriod) : 0, // 时间进度
            costUsedRatio: totalAvailableBudget > 0 ? totalConsumedCost / totalAvailableBudget : 0, // 费用消耗比
            isOverBudget: predictedTotalCost > totalAvailableBudget,
            totalAvailableBudget // 用于图表显示
        };

        // 预警提示（消耗超过80%的部门/岗位）
        const warningAlerts = [];
        for (const item of items) {
            if (item.consumptionRatio > 0.8) {
                warningAlerts.push({
                    type: item.consumptionRatio > 1 ? 'danger' : 'warning',
                    department: item.department_name,
                    position: item.position,
                    consumptionRatio: item.consumptionRatio * 100,
                    consumedCost: item.total_cost,
                    availableBudget: item.available_budget,
                    message: item.consumptionRatio > 1
                        ? `${item.department_name}-${item.position} 已超支 ${((item.consumptionRatio - 1) * 100).toFixed(1)}%`
                        : `${item.department_name}-${item.position} 消耗已达 ${(item.consumptionRatio * 100).toFixed(1)}%，需关注`
                });
            }
        }
        // 按风险等级排序（红色优先）
        warningAlerts.sort((a, b) => b.consumptionRatio - a.consumptionRatio);

        // 同比/环比数据（需要查询历史数据，这里做简化处理）
        let yoyComparison = { value: 0, percentage: 0 };
        let momComparison = { value: 0, percentage: 0 };
        if (fiscalMonth && fiscalMonth.length === 7) {
            const year = parseInt(fiscalMonth.substring(0, 4));
            const month = parseInt(fiscalMonth.substring(5, 7));

            // 查询去年同期（上一年同月）
            const lastYearMonth = `${year - 1}-${String(month).padStart(2, '0')}`;
            const lastYearResult = await client.query(`
                SELECT SUM(total_cost) as total FROM ${COST_SUMMARY_TABLE}
                WHERE fiscal_month = $1 AND ($2::int[] IS NULL OR department_id = ANY($2))
            `, [lastYearMonth, filterDeptIds]);
            const lastYearCost = parseFloat(lastYearResult.rows[0]?.total) || 0;
            if (lastYearCost > 0) {
                yoyComparison = {
                    value: totalConsumedCost - lastYearCost,
                    percentage: ((totalConsumedCost - lastYearCost) / lastYearCost) * 100
                };
            }

            // 查询上个月
            const lastMonth = month === 1 ? 12 : month - 1;
            const lastMonthYear = month === 1 ? year - 1 : year;
            const lastMonthStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`;
            const lastMonthResult = await client.query(`
                SELECT SUM(total_cost) as total FROM ${COST_SUMMARY_TABLE}
                WHERE fiscal_month = $1 AND ($2::int[] IS NULL OR department_id = ANY($2))
            `, [lastMonthStr, filterDeptIds]);
            const lastMonthCost = parseFloat(lastMonthResult.rows[0]?.total) || 0;
            if (lastMonthCost > 0) {
                momComparison = {
                    value: totalConsumedCost - lastMonthCost,
                    percentage: ((totalConsumedCost - lastMonthCost) / lastMonthCost) * 100
                };
            }
        }

        // 获取一个有效的汇率用于显示
        const rates = Array.from(exchangeRateMap.values()).filter(r => r && r > 0);
        const displayExchangeRate = rates.length > 0 ? rates[0] : 7.2;

        // ============ 日度维度增强功能 ============

        // 1. 计算日度累计与预算进度对比
        const dailyBudgetProgress = calculateDailyBudgetProgress(
          fiscalStart,
          fiscalEnd,
          fiscalMonth,
          totalAvailableBudget,
          totalConsumedCost,
          daysInFullFiscalMonth
        );

        // 2. 计算7日/30日滚动平均
        const rollingAverages = await calculateRollingAverages(
          client,
          fiscalStart,
          fiscalEnd,
          fiscalMonth,
          filterDeptIds,
          filterPlantIds,
          positions
        );

        // 3. 计算费用异常标记
        const anomalyFlags = await calculateAnomalyFlags(
          client,
          fiscalStart,
          fiscalEnd,
          fiscalMonth,
          filterDeptIds,
          filterPlantIds,
          positions
        );

        // 4. 构建日度趋势图表数据（从滚动平均数据的dailyCosts构建）
        const dailyTrendData = rollingAverages.dailyCosts.length > 0 ? {
          dates: rollingAverages.dailyCosts.map(d => d.date),
          dailyCosts: rollingAverages.dailyCosts.map(d => d.cost),
          avg7Day: calculateSimpleMovingAverage(rollingAverages.dailyCosts.map(d => d.cost), 7),
          avg30Day: calculateSimpleMovingAverage(rollingAverages.dailyCosts.map(d => d.cost), 30),
          anomalyFlags: rollingAverages.dailyCosts.map(d => d.anomaly || false),
        } : {
          dates: [],
          dailyCosts: [],
          avg7Day: [],
          avg30Day: [],
          anomalyFlags: [],
        };

        // ============ 返回数据 ============

        return {
            fiscalMonth: fiscalMonth || dateParam,
            timeDimension: fiscalDate ? 'daily' : (fiscalMonth ? 'monthly' : (fiscalWeek ? 'weekly' : 'custom')),
            availableBudget: totalAvailableBudget,
            consumedCost: totalConsumedCost,
            remainingCost: totalAvailableBudget - totalConsumedCost,
            consumptionRatio: totalAvailableBudget > 0 ? totalConsumedCost / totalAvailableBudget : 0,
            averageDailyCostUSD: dailyAverageCost,
            exchangeRate: displayExchangeRate,
            // 日度累计与预算进度对比
            dailyBudgetProgress,
            // 滚动平均
            rollingAverages,
            // 日度趋势图表数据
            dailyTrendData,
            // 异常标记
            anomalyFlags,
            chartData: {
                positionRanking,
                monthlyTrend: [],
                yoyComparison,
                momComparison,
                trendForecast,
                detailData: paginatedItems,
            },
            warningAlerts,
            trendForecast,
            detailTable: {
                total,
                items: paginatedItems,
            },
            // 调试信息
            _debug: {
                departmentsCount: departmentsResult.rows.length,
                departmentsSample: JSON.stringify(departmentsResult.rows.slice(0, 3)),
                deptNameMapEntries: JSON.stringify(Array.from(deptNameMap.entries()).slice(0, 5)),
                personnelCount: personnelResult.rows.length,
                personnelSample: JSON.stringify(personnelResult.rows.slice(0, 3).map(p => ({ id: p.id, department_id: p.department_id, name: p.name }))),
                aggregationCount: aggregationMap.size,
                aggregationSample: JSON.stringify(Array.from(aggregationMap.values()).slice(0, 3).map(g => ({ department_id: g.department_id, department_name: g.department_name }))),
            }
        };
    } finally {
        client.release();
    }
};

/**
 * 计算日度累计与预算进度对比
 * @param {dayjs.Dayjs} fiscalStart - 期间开始日期
 * @param {dayjs.Dayjs} fiscalEnd - 期间结束日期
 * @param {string} fiscalMonth - 财月标识
 * @param {number} totalAvailableBudget - 总可用预算
 * @param {number} totalConsumedCost - 总消耗费用
 * @param {number} daysInFullFiscalMonth - 完整财月天数
 * @returns {object} 日度累计与预算进度对比数据
 */
function calculateDailyBudgetProgress(fiscalStart, fiscalEnd, fiscalMonth, totalAvailableBudget, totalConsumedCost, daysInFullFiscalMonth) {
  const now = dayjs();
  const daysElapsed = fiscalEnd.diff(fiscalStart, 'day') + 1;
  const daysInPeriod = daysInFullFiscalMonth;

  // 时间进度 = 已过天数 / 期间总天数
  const timeProgressRatio = daysInPeriod > 0 ? daysElapsed / daysInPeriod : 0;

  // 费用消耗比 = 已消耗 / 总预算
  const costProgressRatio = totalAvailableBudget > 0 ? totalConsumedCost / totalAvailableBudget : 0;

  // 每日预算配额 = 总预算 / 期间天数
  const dailyBudgetQuota = totalAvailableBudget > 0 ? totalAvailableBudget / daysInPeriod : 0;

  // 理想累计费用 = 每日预算配额 × 已过天数
  const idealCumulativeCost = dailyBudgetQuota * daysElapsed;

  // 预算余额 = 总预算 - 已消耗
  const budgetRemaining = totalAvailableBudget - totalConsumedCost;

  // 预计剩余天数
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

  // 预测月底总费用（按当前消耗速度）
  const dailyAverageCost = daysElapsed > 0 ? totalConsumedCost / daysElapsed : 0;
  const predictedTotalCost = dailyAverageCost * daysInPeriod;

  // 预测余额
  const predictedRemaining = totalAvailableBudget - predictedTotalCost;

  // 进度对比分析
  const progressDiff = costProgressRatio - timeProgressRatio; // 正数表示超支，负数表示节余
  let progressStatus = 'normal'; // normal | warning | danger
  if (progressDiff > 0.1 || costProgressRatio > 1) {
    progressStatus = 'danger';
  } else if (progressDiff > 0.05 || costProgressRatio > 0.8) {
    progressStatus = 'warning';
  }

  return {
    // 当前状态
    currentCost: totalConsumedCost,
    totalBudget: totalAvailableBudget,
    budgetRemaining,
    // 时间维度
    daysElapsed,
    daysRemaining,
    totalDays: daysInPeriod,
    // 进度比例
    timeProgressRatio: Math.min(timeProgressRatio, 1), // 最多100%
    costProgressRatio: Math.min(costProgressRatio, 2), // 允许超过100%显示
    // 每日配额
    dailyBudgetQuota,
    // 对比分析
    idealCumulativeCost,
    actualVsIdealDiff: totalConsumedCost - idealCumulativeCost,
    // 预测
    dailyAverageCost,
    predictedTotalCost,
    predictedRemaining,
    // 状态
    progressStatus,
    progressDiff: progressDiff * 100, // 转为百分比
    // 进度详情
    progressDetail: {
      isOverTimeProgress: costProgressRatio > timeProgressRatio,
      overBudgetRisk: predictedTotalCost > totalAvailableBudget,
      remainingDaysWarning: daysRemaining <= 3 && budgetRemaining > 0,
    }
  };
}

/**
 * 计算7日/30日滚动平均
 * @param {object} client - 数据库客户端
 * @param {dayjs.Dayjs} fiscalStart - 期间开始日期
 * @param {dayjs.Dayjs} fiscalEnd - 期间结束日期
 * @param {string} fiscalMonth - 财月标识
 * @param {number[]} filterDeptIds - 部门过滤条件
 * @param {number[]} filterPlantIds - 厂区过滤条件
 * @param {string[]} positions - 岗位过滤条件
 * @returns {object} 滚动平均数据
 */
async function calculateRollingAverages(client, fiscalStart, fiscalEnd, fiscalMonth, filterDeptIds, filterPlantIds, positions) {
  const now = dayjs();
  const today = now.format('YYYY-MM-DD');
  const yesterday = now.subtract(1, 'day').format('YYYY-MM-DD');

  // 查询过去30天的每日费用数据
  const startDate30 = fiscalStart.subtract(29, 'day').format('YYYY-MM-DD');
  const endDate30 = fiscalEnd.format('YYYY-MM-DD');

  try {
    // 查询每日费用汇总
    const dailyCostQuery = `
      SELECT
        schedule_date,
        SUM(total_cost) as daily_cost,
        COUNT(DISTINCT department_id) as dept_count,
        COUNT(DISTINCT position) as position_count
      FROM ${COST_SUMMARY_TABLE}
      WHERE schedule_date >= $1
        AND schedule_date <= $2
        AND ($3::int[] IS NULL OR department_id = ANY($3))
      GROUP BY schedule_date
      ORDER BY schedule_date
    `;

    const dailyCostResult = await client.query(dailyCostQuery, [
      startDate30,
      endDate30,
      filterDeptIds
    ]);

    // 构建每日费用数组
    const dailyCosts = [];
    for (let i = 29; i >= 0; i--) {
      const date = now.subtract(i, 'day').format('YYYY-MM-DD');
      const record = dailyCostResult.rows.find(r => r.schedule_date === date);
      dailyCosts.push({
        date,
        cost: record ? parseFloat(record.daily_cost) : 0,
        deptCount: record ? parseInt(record.dept_count) : 0,
        positionCount: record ? parseInt(record.position_count) : 0
      });
    }

    // 计算7日滚动平均
    const last7Days = dailyCosts.slice(-7);
    const avg7Day = last7Days.length > 0
      ? last7Days.reduce((sum, d) => sum + d.cost, 0) / last7Days.filter(d => d.cost > 0).length || 0
      : 0;

    // 计算30日滚动平均
    const valid30Days = dailyCosts.filter(d => d.cost > 0);
    const avg30Day = valid30Days.length > 0
      ? valid30Days.reduce((sum, d) => sum + d.cost, 0) / valid30Days.length
      : 0;

    // 今日费用
    const todayRecord = dailyCostResult.rows.find(r => r.schedule_date === today);
    const todayCost = todayRecord ? parseFloat(todayRecord.daily_cost) : 0;

    // 昨日费用
    const yesterdayRecord = dailyCostResult.rows.find(r => r.schedule_date === yesterday);
    const yesterdayCost = yesterdayRecord ? parseFloat(yesterdayRecord.daily_cost) : 0;

    // 环比变化
    const momChange = yesterdayCost > 0 ? ((todayCost - yesterdayCost) / yesterdayCost) * 100 : 0;

    // 趋势判断：与7日平均对比
    let trend = 'stable'; // rising | falling | stable
    if (todayCost > avg7Day * 1.2) {
      trend = 'rising';
    } else if (todayCost < avg7Day * 0.8) {
      trend = 'falling';
    }

    return {
      // 当前数据
      today: {
        date: today,
        cost: todayCost,
        trend
      },
      yesterday: {
        date: yesterday,
        cost: yesterdayCost
      },
      // 滚动平均
      avg7Day,
      avg30Day,
      // 7日 vs 30日 对比（判断趋势方向）
      trendIndicator: avg7Day > avg30Day ? 'up' : 'down',
      trendMagnitude: avg30Day > 0 ? Math.abs((avg7Day - avg30Day) / avg30Day * 100) : 0,
      // 日费用详情
      dailyCosts,
      // 环比
      momChange,
      momChangeLabel: momChange > 0 ? `+${momChange.toFixed(1)}%` : `${momChange.toFixed(1)}%`,
      // 统计
      validDaysCount: valid30Days.length,
      maxDailyCost: Math.max(...dailyCosts.map(d => d.cost)),
      minDailyCost: Math.min(...dailyCosts.filter(d => d.cost > 0).map(d => d.cost)),
    };
  } catch (error) {
    console.error('[RollingAverages] 计算滚动平均失败:', error);
    return {
      today: { date: today, cost: 0, trend: 'stable' },
      yesterday: { date: yesterday, cost: 0 },
      avg7Day: 0,
      avg30Day: 0,
      trendIndicator: 'stable',
      trendMagnitude: 0,
      dailyCosts: [],
      momChange: 0,
      momChangeLabel: '0%',
      validDaysCount: 0,
      maxDailyCost: 0,
      minDailyCost: 0,
    };
  }
}

/**
 * 计算费用异常自动标记
 * @param {object} client - 数据库客户端
 * @param {dayjs.Dayjs} fiscalStart - 期间开始日期
 * @param {dayjs.Dayjs} fiscalEnd - 期间结束日期
 * @param {string} fiscalMonth - 财月标识
 * @param {number[]} filterDeptIds - 部门过滤条件
 * @param {number[]} filterPlantIds - 厂区过滤条件
 * @param {string[]} positions - 岗位过滤条件
 * @returns {object} 异常标记数据
 */
async function calculateAnomalyFlags(client, fiscalStart, fiscalEnd, fiscalMonth, filterDeptIds, filterPlantIds, positions) {
  const now = dayjs();
  const today = now.format('YYYY-MM-DD');

  try {
    // 获取过去30天的数据用于计算基线
    const startDate30 = fiscalStart.subtract(29, 'day').format('YYYY-MM-DD');
    const endDate30 = fiscalEnd.format('YYYY-MM-DD');

    // 查询每日费用和阈值配置
    const [dailyDataResult, thresholdConfig] = await Promise.all([
      client.query(`
        SELECT
          schedule_date,
          SUM(total_cost) as daily_cost,
          COUNT(DISTINCT department_id) as dept_count
        FROM ${COST_SUMMARY_TABLE}
        WHERE schedule_date >= $1
          AND schedule_date <= $2
          AND ($3::int[] IS NULL OR department_id = ANY($3))
        GROUP BY schedule_date
        ORDER BY schedule_date
      `, [startDate30, endDate30, filterDeptIds]),

      // 获取异常检测阈值配置（如果没有则使用默认值）
      client.query(`
        SELECT config_key, config_value
        FROM jso_system_config
        WHERE config_key LIKE 'cost_anomaly_%'
      `)
    ]);

    // 解析阈值配置
    let config = {
      highThreshold: 2.0,    // 高于平均2倍为高风险
      lowThreshold: 0.3,      // 低于平均30%为异常低
      consecutiveDays: 3,     // 连续异常天数
      weekendMultiplier: 0.5, // 周末预期费用系数
    };

    thresholdConfig.rows.forEach(row => {
      if (row.config_key === 'cost_anomaly_high_threshold') {
        config.highThreshold = parseFloat(row.config_value) || 2.0;
      } else if (row.config_key === 'cost_anomaly_low_threshold') {
        config.lowThreshold = parseFloat(row.config_value) || 0.3;
      } else if (row.config_key === 'cost_anomaly_consecutive_days') {
        config.consecutiveDays = parseInt(row.config_value) || 3;
      } else if (row.config_key === 'cost_anomaly_weekend_multiplier') {
        config.weekendMultiplier = parseFloat(row.config_value) || 0.5;
      }
    });

    // 计算统计数据
    const dailyCosts = dailyDataResult.rows.map(r => ({
      date: r.schedule_date,
      cost: parseFloat(r.daily_cost) || 0,
      dayOfWeek: dayjs(r.schedule_date).day(), // 0=周日, 6=周六
      isWeekend: [0, 6].includes(dayjs(r.schedule_date).day())
    }));

    // 计算工作日和周末的平均值
    const workDayCosts = dailyCosts.filter(d => !d.isWeekend && d.cost > 0);
    const weekendCosts = dailyCosts.filter(d => d.isWeekend && d.cost > 0);

    const workDayAvg = workDayCosts.length > 0
      ? workDayCosts.reduce((sum, d) => sum + d.cost, 0) / workDayCosts.length
      : 0;

    const weekendAvg = weekendCosts.length > 0
      ? weekendCosts.reduce((sum, d) => sum + d.cost, 0) / weekendCosts.length
      : 0;

    // 综合平均
    const overallAvg = dailyCosts.filter(d => d.cost > 0).length > 0
      ? dailyCosts.filter(d => d.cost > 0).reduce((sum, d) => sum + d.cost, 0) / dailyCosts.filter(d => d.cost > 0).length
      : 0;

    // 分析今日的异常状态
    const todayData = dailyCosts.find(d => d.date === today);
    const yesterdayData = dailyCosts.find(d => d.date === now.subtract(1, 'day').format('YYYY-MM-DD'));

    const anomalies = [];

    // 1. 检查今日费用异常
    if (todayData) {
      const expectedCost = todayData.isWeekend ? weekendAvg * config.weekendMultiplier : workDayAvg;
      const costRatio = expectedCost > 0 ? todayData.cost / expectedCost : 0;

      if (todayData.cost > workDayAvg * config.highThreshold) {
        anomalies.push({
          type: 'high',
          level: 'danger',
          date: today,
          cost: todayData.cost,
          expected: expectedCost,
          ratio: costRatio,
          message: `今日费用异常偏高：¥${todayData.cost.toFixed(2)}（预期 ¥${expectedCost.toFixed(2)}）`
        });
      } else if (todayData.cost > workDayAvg * 1.5) {
        anomalies.push({
          type: 'high',
          level: 'warning',
          date: today,
          cost: todayData.cost,
          expected: expectedCost,
          ratio: costRatio,
          message: `今日费用偏高：¥${todayData.cost.toFixed(2)}（预期 ¥${expectedCost.toFixed(2)}）`
        });
      } else if (todayData.cost > 0 && todayData.cost < workDayAvg * config.lowThreshold && !todayData.isWeekend) {
        anomalies.push({
          type: 'low',
          level: 'info',
          date: today,
          cost: todayData.cost,
          expected: expectedCost,
          ratio: costRatio,
          message: `今日费用异常偏低：¥${todayData.cost.toFixed(2)}（预期 ¥${expectedCost.toFixed(2)}）`
        });
      }

      // 2. 检查周末异常（工作日有费用是正常的，周末有高费用需要关注）
      if (todayData.isWeekend && todayData.cost > workDayAvg * 0.5) {
        anomalies.push({
          type: 'weekend',
          level: 'warning',
          date: today,
          cost: todayData.cost,
          expected: expectedCost,
          ratio: todayData.cost / (workDayAvg * 0.5),
          message: `周末产生费用：¥${todayData.cost.toFixed(2)}（工作日均值 ¥${workDayAvg.toFixed(2)}）`
        });
      }
    }

    // 3. 检查连续上升趋势
    const recent7Days = dailyCosts.slice(-7);
    let consecutiveRisingDays = 0;
    for (let i = recent7Days.length - 1; i > 0; i--) {
      if (recent7Days[i].cost > recent7Days[i - 1].cost * 1.1) {
        consecutiveRisingDays++;
      } else {
        break;
      }
    }

    if (consecutiveRisingDays >= config.consecutiveDays) {
      anomalies.push({
        type: 'trend',
        level: 'warning',
        date: today,
        consecutiveDays: consecutiveRisingDays,
        message: `费用连续${consecutiveRisingDays}天上升，需关注超支风险`
      });
    }

    // 4. 检查同比异常（与上周同期对比）
    if (yesterdayData && todayData) {
      const lastWeekSameDay = dailyCosts.find(d =>
        d.date === now.subtract(7, 'day').format('YYYY-MM-DD')
      );

      if (lastWeekSameDay && lastWeekSameDay.cost > 0) {
        const wowChange = (yesterdayData.cost - lastWeekSameDay.cost) / lastWeekSameDay.cost;
        if (wowChange > 0.5) {
          anomalies.push({
            type: 'wow_spike',
            level: 'warning',
            date: yesterdayData.date,
            cost: yesterdayData.cost,
            lastWeekCost: lastWeekSameDay.cost,
            change: wowChange * 100,
            message: `昨日费用环比上周同期上涨${(wowChange * 100).toFixed(1)}%`
          });
        }
      }
    }

    // 按严重程度排序
    const levelPriority = { danger: 0, warning: 1, info: 2 };
    anomalies.sort((a, b) => levelPriority[a.level] - levelPriority[b.level]);

    // 总体异常状态
    let overallStatus = 'normal';
    if (anomalies.some(a => a.level === 'danger')) {
      overallStatus = 'danger';
    } else if (anomalies.some(a => a.level === 'warning')) {
      overallStatus = 'warning';
    } else if (anomalies.some(a => a.level === 'info')) {
      overallStatus = 'info';
    }

    return {
      // 异常列表
      anomalies,
      anomalyCount: anomalies.length,
      criticalCount: anomalies.filter(a => a.level === 'danger').length,
      warningCount: anomalies.filter(a => a.level === 'warning').length,
      // 统计基线
      baselines: {
        workDayAvg,
        weekendAvg,
        overallAvg,
        sampleDays: dailyCosts.filter(d => d.cost > 0).length
      },
      // 总体状态
      overallStatus,
      hasAnomaly: anomalies.length > 0,
      // 趋势信息
      consecutiveRisingDays,
      trendWarning: consecutiveRisingDays >= config.consecutiveDays
    };
  } catch (error) {
    console.error('[AnomalyFlags] 计算异常标记失败:', error);
    return {
      anomalies: [],
      anomalyCount: 0,
      criticalCount: 0,
      warningCount: 0,
      baselines: { workDayAvg: 0, weekendAvg: 0, overallAvg: 0, sampleDays: 0 },
      overallStatus: 'normal',
      hasAnomaly: false,
      consecutiveRisingDays: 0,
      trendWarning: false
    };
  }
}

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
            // ISO 8601: 第1周是包含1月4日的那一周
            const jan4 = dayjs(`${year}-01-04`);
            const jan4Day = jan4.isoWeekday();
            const week1Monday = jan4.subtract(jan4Day - 1, 'day');
            fiscalStart = week1Monday.add(week - 1, 'week').startOf('day');
            fiscalEnd = fiscalStart.add(6, 'day').endOf('day');
            logIdentifier = `周 ${dateParam}`;
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
            // 获取时薪配置 (使用 < date + 2 day 来包含下一天的数据, 因为数据时区是UTC但会话是Asia/Shanghai)
            client.query(`SELECT level, standard_rate FROM ${HOURLY_RATE_TABLE} WHERE start_time < ($1::date + interval '2 day') ORDER BY start_time DESC`, [fiscalEnd.clone().add(1, 'day').format('YYYY-MM-DD')]),
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
