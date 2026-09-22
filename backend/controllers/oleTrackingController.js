/**
 * 部门OLE追踪 Controller
 * 实现员工工位工时、作业量、作业效率分析
 */
import pool from '../config/db.js';

// ========== 初始化函数 ==========

// 创建效率上限函数（循环递减到100%以内）
const initEfficiencyFunction = async () => {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION cap_efficiency(val numeric)
      RETURNS numeric AS $$
      DECLARE
        result numeric := val;
      BEGIN
        WHILE result >= 100 LOOP
          result := result * 0.95;
        END LOOP;
        RETURN ROUND(result, 2);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
    console.log('cap_efficiency 函数创建成功');
  } catch (err) {
    console.error('创建 cap_efficiency 函数失败:', err.message);
  }
};

// 启动时初始化
initEfficiencyFunction();

// ========== 辅助函数 ==========

/**
 * 计算当班日期
 * 作业发生时间 00:00‑06:59，则当班日期 = Creation D 减 1 天
 * 其余时间当班日期等于 Creation D
 */
const calculateShiftDate = (creationDate) => {
  const date = new Date(creationDate);
  const hours = date.getHours();
  if (hours >= 0 && hours < 7) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString().split('T')[0];
};

/**
 * 计算财月信息
 * 当月日期＜24号，归属上一个月份
 * 当月日期≥24号，归属当前月份
 */
const calculateFiscalPeriod = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  const weekNumber = Math.ceil((day - dayOfWeek + 1) / 7);

  let adjustedMonth, adjustedYear;
  if (day < 24) {
    adjustedMonth = month - 1;
    adjustedYear = year;
    if (adjustedMonth < 1) {
      adjustedMonth = 12;
      adjustedYear = year - 1;
    }
  } else {
    adjustedMonth = month;
    adjustedYear = year;
  }

  const quarter = Math.ceil(adjustedMonth / 3);
  const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return {
    year: adjustedYear,
    quarter: `Q${quarter}`,
    adjustedMonth,
    monthName: monthNames[adjustedMonth],
    weekNumber: `WK${String(weekNumber).padStart(2, '0')}`,
    dayOfWeek: dayNames[dayOfWeek],
    dayOfMonth: day
  };
};

/**
 * 获取作业流水统计数据
 * 按员工和当班日期聚合
 */
const getTransactionStats = async (employeeId, shiftDate) => {
  const result = await pool.query(`
    SELECT
      u.id as employee_id,
      u.real_name,
      u.level as employee_level,
      u.department_id,
      d.name as department_name,
      t.reference,
      t.trans,
      t.created_at as creation_d
    FROM jso_sap_grn_history_partitioned t
    INNER JOIN jso_system_user_management u ON t.created_by = u.sap_employee_id::text
    INNER JOIN jso_org_department_management d ON u.department_id = d.id
    WHERE u.id = $1
      AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = $2
  `, [employeeId, shiftDate]);

  return result.rows;
};

/**
 * 阶梯修正逻辑
 * 根据Result原始值计算最终效率百分比
 */
const calculateSteppedPercentage = (result) => {
  if (result === null || result === undefined || isNaN(result)) {
    return null;
  }

  // 阶梯修正逻辑（业务算法，保留在代码）
  if (result < 0.3) {
    return Math.round(result * 10000) / 100; // 保留2位小数
  } else if (result < 0.5) {
    return Math.round(result * 10000) / 100;
  } else if (result < 0.7) {
    return Math.round(result * 10000) / 100;
  } else if (result < 0.85) {
    return Math.round(result * 10000) / 100;
  } else if (result < 1.0) {
    return Math.round(result * 10000) / 100;
  } else {
    return Math.round(result * 10000) / 100;
  }
};

// ========== API接口 ==========

/**
 * 获取OLE追踪统计数据
 * GET /api/ole-tracking/stats
 */
const getStats = async (req, res) => {
  try {
    const { startDate, endDate, shift, area, departmentId } = req.query;

    // 使用指定的日期或默认今天
    const queryDate = startDate || new Date().toISOString().split('T')[0];

    // 查询员工排班数据（使用 jso_hr_employee_schedule 表）
    // 注意：此表不包含area信息，使用默认效率系数 1.0
    const query = `
      WITH excluded_areas AS (
        -- 获取被排除的Area列表
        SELECT area_name FROM jso_ole_excluded_areas WHERE enabled = true
      ),
      shift_data AS (
        SELECT
          s.id as schedule_id,
          s.schedule_date,
          s.shift,
          u.id as employee_id,
          u.real_name,
          u.level as employee_level,
          u.sap_employee_id,
          u.department_id,
          d.name as department_name,
          COALESCE(sh.duration_hours, 8) as hours
        FROM jso_hr_employee_schedule s
        INNER JOIN jso_system_user_management u ON s.employee_id = u.id
        LEFT JOIN jso_org_department_management d ON u.department_id = d.id
        LEFT JOIN jso_config_shift_duration_rules sh
          ON sh.department_id = u.department_id
          AND sh.shift_name = s.shift
          AND sh.status = 'active'
        WHERE (s.schedule_date at time zone 'Asia/Shanghai') >= $1::date
          AND (s.schedule_date at time zone 'Asia/Shanghai') < ($1::date + interval '1 day')
          AND s.shift NOT IN ('请假', '调休', '离职', '年假')
          AND u.employee_type != 'Jabil'
          -- 只有当员工只被分配到被排除的Area时才排除
          AND (
            -- 没有工位安排的员工保留
            (SELECT COUNT(*) FROM jso_hr_workstation_arrangement wa
             WHERE wa.employee_id = u.id AND wa.arrangement_date = s.schedule_date) = 0
            OR
            -- 有工位安排时，如果至少有一个Area不在排除列表中则保留
            EXISTS (
              SELECT 1
              FROM jso_hr_workstation_arrangement wa
              JOIN jso_config_workstation w ON wa.workstation_id = w.id
              WHERE wa.employee_id = u.id
                AND wa.arrangement_date = s.schedule_date
                AND w.name NOT IN (SELECT area_name FROM excluded_areas)
            )
          )
      ),
      trans_stats AS (
        SELECT
          sd.employee_id,
          sd.schedule_date,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'IWS' THEN t.reference END) as grs_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'PLR' THEN t.reference END) as pull_list_count
        FROM shift_data sd
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = sd.sap_employee_id::text
          AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = sd.schedule_date::date
        GROUP BY sd.employee_id, sd.schedule_date
      ),
      level_efficiency AS (
        SELECT level_name, target_efficiency
        FROM jso_ole_level_efficiency_config
        WHERE status = 'active'
      )
      SELECT
        sd.schedule_date as date,
        sd.shift as shift,
        sd.employee_id,
        sd.sap_employee_id as user_id,
        sd.real_name,
        sd.employee_level,
        sd.department_name,
        sd.department_name as workstation_name,
        sd.hours,
        COALESCE(ts.iws_count, 0) as iws,
        COALESCE(ts.flr_count, 0) as flr,
        COALESCE(ts.plr_count, 0) as plr,
        COALESCE(ts.grs_count, 0) as grs,
        COALESCE(ts.pull_list_count, 0) as pull_list,
        le.target_efficiency,
        CASE
          WHEN sd.hours > 0
          THEN (
            (COALESCE(ts.iws_count, 0) +
             COALESCE(ts.plr_count, 0) +
             COALESCE(ts.flr_count, 0))
            / (sd.hours * 3600) / 0.85
          )
          ELSE NULL
        END as result_raw,
        CASE
          WHEN sd.hours > 0
          THEN cap_efficiency(
            ((COALESCE(ts.iws_count, 0) +
              COALESCE(ts.plr_count, 0) +
              COALESCE(ts.flr_count, 0))
             / (sd.hours * 3600) / 0.85) * 100
          )
          ELSE NULL
        END as percentage,
        CASE
          WHEN sd.hours > 0 AND le.target_efficiency IS NOT NULL
          THEN CASE
            WHEN cap_efficiency(
              ((COALESCE(ts.iws_count, 0) +
                COALESCE(ts.plr_count, 0) +
                COALESCE(ts.flr_count, 0))
               / (sd.hours * 3600) / 0.85) * 100
            ) >= ROUND(le.target_efficiency * 100, 2)
            THEN '达标'
            ELSE '未达标'
          END
          ELSE '未计算'
        END as status
      FROM shift_data sd
      LEFT JOIN trans_stats ts ON sd.employee_id = ts.employee_id
      LEFT JOIN level_efficiency le ON sd.employee_level = le.level_name
      WHERE sd.hours > 0
      ORDER BY sd.schedule_date DESC, sd.shift, sd.real_name
    `;

    const result = await pool.query(query, [queryDate]);

    // 按班次分组统计
    const shiftStats = {};
    result.rows.forEach(row => {
      const shiftKey = row.shift;
      if (!shiftStats[shiftKey]) {
        shiftStats[shiftKey] = {
          totalEmployees: 0,
          totalHours: 0,
          totalIws: 0,
          totalFlr: 0,
          totalPlr: 0,
          totalGrs: 0,
          totalPullList: 0,
          achievedCount: 0,
          unachievedCount: 0,
          avgPercentage: 0,
          percentageSum: 0,
          validPercentageCount: 0
        };
      }

      shiftStats[shiftKey].totalEmployees++;
      shiftStats[shiftKey].totalHours += parseFloat(row.hours || 0);
      shiftStats[shiftKey].totalIws += parseInt(row.iws || 0);
      shiftStats[shiftKey].totalFlr += parseInt(row.flr || 0);
      shiftStats[shiftKey].totalPlr += parseInt(row.plr || 0);
      shiftStats[shiftKey].totalGrs += parseInt(row.grs || 0);
      shiftStats[shiftKey].totalPullList += parseInt(row.pull_list || 0);

      if (row.percentage !== null) {
        shiftStats[shiftKey].percentageSum += parseFloat(row.percentage);
        shiftStats[shiftKey].validPercentageCount++;
        if (row.status === '达标') {
          shiftStats[shiftKey].achievedCount++;
        } else if (row.status === '未达标') {
          shiftStats[shiftKey].unachievedCount++;
        }
        // 未计算状态不计入任何统计
      }
    });

    // 计算平均值（使用有有效百分比数据的员工数）
    Object.keys(shiftStats).forEach(shift => {
      const stats = shiftStats[shift];
      if (stats.validPercentageCount > 0) {
        stats.avgPercentage = Math.round((stats.percentageSum / stats.validPercentageCount) * 100) / 100;
      }
    });

    // 获取当前班次Leader信息（根据时间判断：A+ 7:00-18:59, C+ 19:00-次日6:59）
    const now = new Date();
    const hours = now.getHours();
    const isADayShift = hours >= 7 && hours < 19;
    const currentShiftType = isADayShift ? 'A+' : 'C+';
    const leaderWorkstationId = isADayShift ? 10 : 19; // A班Leader=10, C班Leader=19

    // 查询当前班次Leader
    let leaderInfo = { name: null, code: null };
    try {
      const leaderQuery = `
        SELECT u.real_name, u.old_employee_id
        FROM jso_hr_workstation_arrangement w
        JOIN jso_system_user_management u ON w.employee_id = u.id
        WHERE w.workstation_id = $1
          AND DATE(w.arrangement_date AT TIME ZONE 'Asia/Shanghai') = $2::date
        LIMIT 1
      `;
      const leaderResult = await pool.query(leaderQuery, [leaderWorkstationId, queryDate]);
      if (leaderResult.rows.length > 0) {
        leaderInfo = {
          name: leaderResult.rows[0].real_name,
          code: leaderResult.rows[0].old_employee_id
        };
      }
    } catch (leaderErr) {
      console.error('获取Leader信息失败:', leaderErr.message);
    }

    res.json({
      success: true,
      data: {
        records: result.rows,
        shiftStats,
        summary: {
          totalRecords: result.rows.length,
          totalEmployees: Object.values(shiftStats).reduce((sum, s) => sum + s.totalEmployees, 0),
          totalHours: Object.values(shiftStats).reduce((sum, s) => sum + s.totalHours, 0).toFixed(2),
          totalIws: Object.values(shiftStats).reduce((sum, s) => sum + s.totalIws, 0),
          totalFlr: Object.values(shiftStats).reduce((sum, s) => sum + s.totalFlr, 0),
          totalPlr: Object.values(shiftStats).reduce((sum, s) => sum + s.totalPlr, 0),
          overallAvgPercentage: result.rows.length > 0
            ? Math.round((result.rows.filter(r => r.percentage !== null).reduce((sum, r) => sum + parseFloat(r.percentage), 0) / result.rows.filter(r => r.percentage !== null).length) * 100) / 100
            : 0,
          // 当前班次信息
          currentShiftType,
          shiftDisplay: isADayShift ? 'A班' : 'C班',
          leaderName: leaderInfo.name,
          leaderCode: leaderInfo.code
        }
      }
    });
  } catch (error) {
    console.error('获取OLE追踪统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 获取效率达标排名
 * GET /api/ole-tracking/ranking
 */
const getRanking = async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;

    const query = `
      WITH shift_data AS (
        SELECT
          arr.id,
          arr.arrangement_date,
          arr.shift_name,
          u.id as employee_id,
          u.real_name,
          u.level as employee_level,
          u.department_id,
          d.name as department_name,
          ws.area,
          arr.hours,
          CASE
            WHEN arr.shift_name LIKE '%N%' THEN
              CASE
                WHEN EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') >= 0
                     AND EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') < 7
                THEN arr.arrangement_date - INTERVAL '1 day'
                ELSE arr.arrangement_date
              END
            ELSE arr.arrangement_date
          END as shift_date
        FROM jso_hr_workstation_arrangement arr
        INNER JOIN jso_system_user_management u ON arr.employee_id = u.id
        INNER JOIN jso_config_workstation ws ON arr.workstation_id = ws.id
        LEFT JOIN jso_org_department_management d ON u.department_id = d.id
        WHERE DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= $1::date
          AND DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= $2::date
          AND arr.hours > 0
      ),
      trans_stats AS (
        SELECT
          sd.employee_id,
          sd.shift_date,
          sd.area,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'IWS' THEN t.reference END) as grs_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'PLR' THEN t.reference END) as pull_list_count
        FROM shift_data sd
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = (
            SELECT sap_employee_id FROM jso_system_user_management WHERE id = sd.employee_id
          )::text
          AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = sd.shift_date
        GROUP BY sd.employee_id, sd.shift_date, sd.area
      ),
      area_coefficients AS (
        SELECT area_name, iws_coefficient, plr_coefficient, flr_coefficient
        FROM jso_ole_area_coefficient_config
        WHERE status = 'active'
      ),
      level_efficiency AS (
        SELECT level_name, target_efficiency
        FROM jso_ole_level_efficiency_config
        WHERE status = 'active'
      ),
      employee_stats AS (
        SELECT
          sd.employee_id,
          sd.real_name,
          sd.employee_level,
          sd.department_name,
          sd.area,
          COUNT(*) as work_days,
          SUM(sd.hours) as total_hours,
          SUM(COALESCE(ts.iws_count, 0)) as total_iws,
          SUM(COALESCE(ts.flr_count, 0)) as total_flr,
          SUM(COALESCE(ts.plr_count, 0)) as total_plr,
          SUM(COALESCE(ts.grs_count, 0)) as total_grs,
          SUM(COALESCE(ts.pull_list_count, 0)) as total_pull_list,
          AVG(
            CASE
              WHEN sd.hours > 0 AND ac.iws_coefficient IS NOT NULL
              THEN cap_efficiency((COALESCE(ts.iws_count, 0) * ac.iws_coefficient +
                    COALESCE(ts.plr_count, 0) * ac.plr_coefficient +
                    COALESCE(ts.flr_count, 0) * ac.flr_coefficient)
                   / (sd.hours * 3600) / 0.85 * 100)
              ELSE NULL
            END
          ) as avg_percentage,
          le.target_efficiency
        FROM shift_data sd
        LEFT JOIN trans_stats ts ON sd.employee_id = ts.employee_id AND sd.shift_date = ts.shift_date
        LEFT JOIN area_coefficients ac ON sd.area = ac.area_name
        LEFT JOIN level_efficiency le ON sd.employee_level = le.level_name
        GROUP BY sd.employee_id, sd.real_name, sd.employee_level, sd.department_name, sd.area, le.target_efficiency
      )
      SELECT
        employee_id,
        real_name as name,
        employee_level as level,
        department_name as department,
        area,
        work_days,
        total_hours,
        total_iws,
        total_flr,
        total_plr,
        total_grs,
        total_pull_list,
        ROUND(avg_percentage, 2) as avg_percentage,
        target_efficiency,
        CASE
          WHEN avg_percentage >= ROUND(target_efficiency * 100, 2) THEN '达标'
          ELSE '未达标'
        END as status
      FROM employee_stats
      WHERE avg_percentage IS NOT NULL
      ORDER BY avg_percentage DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [startDate || '2024-01-01', endDate || '2099-12-31', parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取效率排名失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 获取Area效率统计
 * GET /api/ole-tracking/area-stats
 * 公式: (IWS计数 * IWS秒数 + PLR计数 * PLR秒数 + FLR计数 * FLR秒数) / ((工作时长 - 特殊工时) * 3600) / 0.85
 */
const getAreaStats = async (req, res) => {
  try {
    const { startDate, endDate, shift } = req.query;

    let whereConditions = ['arr.hours > 0'];
    let params = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= $${paramIndex++}::date`);
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= $${paramIndex++}::date`);
      params.push(endDate);
    }
    if (shift) {
      whereConditions.push(`arr.shift_name = $${paramIndex++}`);
      params.push(shift);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      WITH excluded_areas AS (
        -- 获取被排除的Area列表
        SELECT area_name FROM jso_ole_excluded_areas WHERE enabled = true
      ),
      shift_data AS (
        SELECT
          arr.arrangement_date,
          arr.shift_name,
          u.id as employee_id,
          u.sap_employee_id,
          ws.name as area,
          arr.hours,
          arr.workstation_id,
          arr.remark,
          CASE
            WHEN arr.shift_name LIKE '%N%' THEN
              CASE
                WHEN EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') >= 0
                     AND EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') < 7
                THEN arr.arrangement_date - INTERVAL '1 day'
                ELSE arr.arrangement_date
              END
            ELSE arr.arrangement_date
          END as shift_date
        FROM jso_hr_workstation_arrangement arr
        INNER JOIN jso_system_user_management u ON arr.employee_id = u.id
        INNER JOIN jso_config_workstation ws ON arr.workstation_id = ws.id
        WHERE ${whereClause}
          -- 排除不参与效率计算的Area
          AND ws.name NOT IN (SELECT area_name FROM excluded_areas)
      ),
      -- 特殊工时：计算员工在特殊工位(11,12)上的时长
      special_hours_calc AS (
        SELECT
          employee_id,
          SUM(
            EXTRACT(EPOCH FROM (
              (sd.end_time::time + CASE WHEN sd.end_time::time < sd.start_time::time THEN INTERVAL '24 hours' ELSE INTERVAL '0 seconds' END)
              - sd.start_time::time
            )) / 3600
          ) as special_hours
        FROM (
          SELECT
            arr.employee_id,
            arr.start_time,
            arr.end_time
          FROM jso_hr_workstation_arrangement arr
          INNER JOIN jso_config_workstation ws ON arr.workstation_id = ws.id
          WHERE arr.workstation_id IN (11, 12)
            AND ws.name NOT IN (SELECT area_name FROM excluded_areas)
            AND ${whereClause.replace(/arr\./g, 'arr.')}
        ) sd
        GROUP BY employee_id
      ),
      -- Area效率计算规则
      area_calc_rules AS (
        SELECT
          id,
          area_list,
          iws_seconds,
          flr_seconds,
          plr_seconds,
          enabled
        FROM jso_ole_area_calc_rules
        WHERE enabled = true
      ),
      -- 员工Area统计：处理"特殊工时"后缀，匹配规则
      -- 把逗号替换为&用于匹配
      employee_area_stats AS (
        SELECT
          sd.employee_id,
          sd.area,
          -- 把逗号替换为&，去掉特殊工时
          CASE
            WHEN sd.area LIKE '%,特殊工时' THEN (
              SELECT string_agg(value, '&' ORDER BY value)
              FROM unnest(string_to_array(REPLACE(sd.area, ',特殊工时', ''), ',')) as value
              WHERE trim(value) != ''
            )
            ELSE (
              SELECT string_agg(value, '&' ORDER BY value)
              FROM unnest(string_to_array(REPLACE(sd.area, ',', '&'), '&')) as value
              WHERE trim(value) != ''
            )
          END as match_area,
          sd.hours,
          sd.sap_employee_id,
          sd.shift_date
        FROM shift_data sd
      ),
      -- 匹配规则获取秒数（完全匹配）
      matched_rules AS (
        SELECT
          eas.employee_id,
          eas.area,
          eas.hours,
          COALESCE(acr.iws_seconds, 0) as iws_seconds,
          COALESCE(acr.flr_seconds, 0) as flr_seconds,
          COALESCE(acr.plr_seconds, 0) as plr_seconds,
          eas.sap_employee_id,
          eas.shift_date
        FROM employee_area_stats eas
        LEFT JOIN area_calc_rules acr
          ON acr.area_list = eas.match_area
      ),
      trans_stats AS (
        SELECT
          mr.employee_id,
          mr.area,
          mr.hours,
          mr.iws_seconds,
          mr.flr_seconds,
          mr.plr_seconds,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'IWS' THEN t.reference END) as grs_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'PLR' THEN t.reference END) as pull_list_count
        FROM matched_rules mr
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = mr.sap_employee_id::text
          AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = mr.shift_date
        GROUP BY mr.employee_id, mr.area, mr.hours, mr.iws_seconds, mr.flr_seconds, mr.plr_seconds
      ),
      -- 按Area汇总
      area_summary AS (
        SELECT
          sd.area,
          COUNT(DISTINCT sd.employee_id) as employee_count,
          SUM(sd.hours) as total_hours,
          SUM(COALESCE(shc.special_hours, 0)) as total_special_hours,
          SUM(ts.iws_count) as total_iws,
          SUM(ts.flr_count) as total_flr,
          SUM(ts.plr_count) as total_plr,
          SUM(ts.grs_count) as total_grs,
          SUM(ts.pull_list_count) as total_pull_list,
          AVG(ts.iws_seconds) as avg_iws_seconds,
          AVG(ts.flr_seconds) as avg_flr_seconds,
          AVG(ts.plr_seconds) as avg_plr_seconds
        FROM shift_data sd
        LEFT JOIN trans_stats ts ON sd.employee_id = ts.employee_id
        LEFT JOIN special_hours_calc shc ON sd.employee_id = shc.employee_id
        GROUP BY sd.area
      )
      SELECT
        as2.area,
        as2.employee_count,
        as2.total_hours,
        as2.total_special_hours,
        as2.total_iws,
        as2.total_flr,
        as2.total_plr,
        as2.total_grs,
        as2.total_pull_list,
        as2.avg_iws_seconds,
        as2.avg_flr_seconds,
        as2.avg_plr_seconds,
        CASE
          -- 如果Area没有匹配到规则，效率为NULL
          WHEN as2.avg_iws_seconds IS NULL THEN NULL
          WHEN (as2.total_hours - as2.total_special_hours) > 0 AND as2.avg_iws_seconds > 0
          THEN ROUND(
            (as2.total_iws * as2.avg_iws_seconds +
             as2.total_plr * as2.avg_plr_seconds +
             as2.total_flr * as2.avg_flr_seconds)
            / ((as2.total_hours - as2.total_special_hours) * 3600) / 0.85 * 100, 2
          )
          ELSE NULL
        END as avg_percentage
      FROM area_summary as2
      WHERE as2.area IS NOT NULL AND as2.area != ''
        AND as2.avg_iws_seconds IS NOT NULL
      ORDER BY avg_percentage DESC NULLS LAST
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取Area统计失败:', error);
    console.error('Error stack:', error.stack);
    console.error('Error query params:', req.query);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 获取每日效率统计
 * GET /api/ole-tracking/daily-efficiency
 * 返回日期范围内每个员工每日的效率
 */
const getDailyEfficiency = async (req, res) => {
  try {
    const { startDate, endDate, shift } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '需要提供 startDate 和 endDate' });
    }

    // 查询每个员工每日的效率
    const query = `
      WITH excluded_areas AS (
        SELECT area_name FROM jso_ole_excluded_areas WHERE enabled = true
      ),
      shift_data AS (
        SELECT
          arr.arrangement_date,
          arr.shift_name,
          u.id as employee_id,
          u.real_name,
          u.sap_employee_id,
          arr.hours,
          CASE
            WHEN arr.shift_name LIKE '%N%' THEN
              CASE
                WHEN EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') >= 0
                     AND EXTRACT(HOUR FROM arr.start_time AT TIME ZONE 'Asia/Shanghai') < 7
                THEN arr.arrangement_date - INTERVAL '1 day'
                ELSE arr.arrangement_date
              END
            ELSE arr.arrangement_date
          END as shift_date
        FROM jso_hr_workstation_arrangement arr
        INNER JOIN jso_system_user_management u ON arr.employee_id = u.id
        INNER JOIN jso_config_workstation ws ON arr.workstation_id = ws.id
        WHERE DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') >= $1::date
          AND DATE(arr.arrangement_date AT TIME ZONE 'Asia/Shanghai') <= $2::date
          AND ws.name NOT IN (SELECT area_name FROM excluded_areas)
          ${shift ? "AND arr.shift_name = $3" : ""}
      ),
      trans_stats AS (
        SELECT
          sd.employee_id,
          sd.shift_date,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count
        FROM shift_data sd
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = sd.sap_employee_id::text
          AND DATE(t.created_at AT TIME ZONE 'Asia/Shanghai') = sd.shift_date::date
        GROUP BY sd.employee_id, sd.shift_date
      ),
      employee_daily AS (
        SELECT
          sd.employee_id,
          sd.real_name,
          sd.shift_date::text as date,
          CASE
            WHEN sd.hours > 0 THEN (
              (COALESCE(ts.iws_count, 0) + COALESCE(ts.plr_count, 0) + COALESCE(ts.flr_count, 0))
              / (sd.hours * 3600) / 0.85
            )
            ELSE NULL
          END as raw_efficiency
        FROM shift_data sd
        LEFT JOIN trans_stats ts ON ts.employee_id = sd.employee_id AND ts.shift_date = sd.shift_date
      )
      SELECT
        employee_id,
        real_name as name,
        date,
        ROUND(
          CASE
            WHEN raw_efficiency >= 1.0 THEN raw_efficiency * 0.95 * 100
            ELSE raw_efficiency * 100
          END::numeric, 2
        ) as efficiency
      FROM employee_daily
      ORDER BY employee_id, date
    `;

    const params = shift ? [startDate, endDate, shift] : [startDate, endDate];
    const result = await pool.query(query, params);

    // 计算整体平均效率
    const avgEfficiency = result.rows.length > 0
      ? result.rows.reduce((sum, row) => sum + parseFloat(row.efficiency || 0), 0) / result.rows.length
      : 0;

    res.json({
      success: true,
      data: {
        dailyData: result.rows,
        averageEfficiency: Math.round(avgEfficiency * 100) / 100,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('获取每日效率统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 获取差异统计数据（从仓储差异登记表）
 * GET /api/ole-tracking/diff-stats
 */
const getDiffStats = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    // 使用 AT TIME ZONE 将 UTC 时间戳转换为本地时间进行日期比较
    const query = `
      SELECT
        part_no,
        qty,
        diff_type,
        diff_pic,
        handling_result,
        registration_date
      FROM jso_warehouse_diff_registration
      WHERE (registration_date AT TIME ZONE 'Asia/Shanghai')::date >= $1
        AND (registration_date AT TIME ZONE 'Asia/Shanghai')::date <= $2
      ORDER BY registration_date DESC, id DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [startDate || '2024-01-01', endDate || '2099-12-31', parseInt(limit)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取差异统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 获取班次明细数据
 * GET /api/ole-tracking/shift-detail
 * 时间规则: 7:00-次日6:59 (例如2026-09-12表示2026-09-12 7:00到2026-09-13 6:59)
 */
const getShiftDetail = async (req, res) => {
  try {
    const { date, shift } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: '日期参数必填' });
    }

    // 判断是否显示所有班次
    const showAllShifts = !shift || shift === '';
    const isADay = shift === 'A+' || shift === 'A';

    // C班是19:00-次日07:00，arrangement_date=09-20的C班工作时间: 09-20 19:00 到 09-21 07:00
    // 计算时间范围
    let shiftStartTime, shiftEndTime, shiftEndDate;
    if (!showAllShifts) {
      // 单个班次
      shiftStartTime = isADay ? `${date} 07:00:00` : `${date} 19:00:00`;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = nextDay.toISOString().split('T')[0];
      shiftEndTime = isADay ? `${date} 19:00:00` : `${nextDateStr} 07:00:00`;
      shiftEndDate = isADay ? date : nextDateStr;
    } else {
      // 所有班次：7:00到次日7:00
      shiftStartTime = `${date} 07:00:00`;
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = nextDay.toISOString().split('T')[0];
      shiftEndTime = `${nextDateStr} 07:00:00`;
      shiftEndDate = nextDateStr;
    }

    // 使用 jso_hr_workstation_arrangement 表
    let shiftFilter = '';
    if (!showAllShifts) {
      // 单个班次：支持 A+/A 和 C+/C
      shiftFilter = `AND (wa.shift_name = '${shift}' OR wa.shift_name = '${isADay ? 'A' : 'C'}' OR wa.shift_name = '${isADay ? 'A+' : 'C+'}' OR wa.shift_name = '${isADay ? 'A2' : 'C2'}')`;
    }

    const query = `
      WITH excluded_areas AS (
        -- 获取被排除的Area列表（这些Area的人员不参与统计）
        SELECT area_name FROM jso_ole_excluded_areas WHERE enabled = true
      ),
      -- 获取班次时长规则（作为默认值）
      shift_duration_rules AS (
        SELECT DISTINCT ON (department_id, shift_name)
          department_id,
          shift_name,
          duration_hours
        FROM jso_config_shift_duration_rules
        WHERE status = 'active'
        ORDER BY department_id, shift_name, updated_at DESC
      ),
      -- 获取排班表中的班次（优先使用）
      schedule_shifts AS (
        SELECT DISTINCT ON (employee_id)
          employee_id,
          shift
        FROM jso_hr_employee_schedule
        WHERE DATE(schedule_date AT TIME ZONE 'Asia/Shanghai') = $1::date
        ORDER BY employee_id
      ),
      shift_data AS (
        SELECT
          wa.id as arrangement_id,
          wa.employee_id,
          wa.sap_employee_id,
          wa.workstation_id,
          wa.arrangement_date AT TIME ZONE 'Asia/Shanghai' as arrangement_date_local,
          wa.shift_name as workstation_shift,
          wa.start_time,
          wa.end_time,
          wa.hours,
          wa.remark,
          u.real_name,
          u.level as employee_level,
          u.department_id,
          ws.name as area_name,
          -- 始终优先使用排班表中的班次，如果没有则使用工位安排表的班次
          COALESCE(ss.shift, wa.shift_name) as effective_shift
        FROM jso_hr_workstation_arrangement wa
        INNER JOIN jso_system_user_management u ON wa.employee_id = u.id
        LEFT JOIN jso_config_workstation ws ON wa.workstation_id = ws.id
        LEFT JOIN schedule_shifts ss ON wa.employee_id = ss.employee_id
        WHERE (wa.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date = $1::date
          ${shiftFilter}
          AND u.employee_type != 'Jabil'
          -- 移除了排除规则，让OLE明细显示所有人员
          -- 排除规则将在最终结果中通过 is_excluded 字段处理
      ),
      -- 标记员工是否只被分配到排除区域（用于图表过滤，不影响表格显示）
      employee_exclusion_flag AS (
        SELECT DISTINCT sd.employee_id,
          CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM jso_hr_workstation_arrangement wa2
              JOIN jso_config_workstation ws2 ON wa2.workstation_id = ws2.id
              WHERE wa2.employee_id = sd.employee_id
                AND (wa2.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date = $1::date
                AND ws2.name NOT IN (SELECT area_name FROM excluded_areas)
            ) THEN true
            ELSE false
          END as is_excluded_from_efficiency
        FROM shift_data sd
      ),
      -- 获取每个员工的工作时长（优先使用安排的时长，否则使用班次时长规则）
      employee_hours AS (
        SELECT DISTINCT ON (employee_id)
          employee_id,
          COALESCE(
            sd.hours,
            (SELECT sdr.duration_hours FROM shift_duration_rules sdr
             WHERE sdr.department_id = sd.department_id
               AND sdr.shift_name = sd.effective_shift)
          ) as hours,
          sd.effective_shift as schedule_shift
        FROM shift_data sd
        ORDER BY employee_id, arrangement_id
      ),
      -- 获取每个员工汇总的 Area 和 Shift 信息，以及处理多SAP工号
      employee_info AS (
        SELECT
          sd.employee_id,
          sd.real_name,
          sd.employee_level,
          -- 保持原始格式（逗号分隔）用于显示
          string_agg(DISTINCT COALESCE(sd.area_name, sd.workstation_id::text), ',') as areas,
          -- 使用排班表的班次（优先）或者工位安排表的班次
          string_agg(DISTINCT sd.effective_shift, ',') as shift_names,
          -- 备注：合并所有工位的备注
          string_agg(DISTINCT sd.remark, ',') as remark,
          -- 合并所有工位的SAP工号（去重）
          (
            SELECT COALESCE(
              (
                SELECT string_agg(DISTINCT sap_id, '&' ORDER BY sap_id)
                FROM (
                  SELECT unnest(string_to_array(COALESCE(sd_all.sap_employee_id, ''), '&')) as sap_id
                  FROM shift_data sd_all
                  WHERE sd_all.employee_id = sd.employee_id
                ) sub
              ),
              sd.employee_id::text
            )
          ) as sap_employee_ids
        FROM shift_data sd
        GROUP BY sd.employee_id, sd.real_name, sd.employee_level
      ),
      -- 合并员工信息和排除标记
      employee_info_full AS (
        SELECT ei.*, COALESCE(eef.is_excluded_from_efficiency, false) as is_excluded_from_efficiency
        FROM employee_info ei
        LEFT JOIN employee_exclusion_flag eef ON ei.employee_id = eef.employee_id
      ),
      leave_hours AS (
        SELECT
          wa.employee_id,
          wa.arrangement_date_local::date as leave_date,
          COALESCE(SUM(tl.hours), 0) as leave_hours
        FROM shift_data wa
        LEFT JOIN jso_hr_temporary_leave tl
          ON tl.employee_id = wa.employee_id
          AND tl.start_date::date = wa.arrangement_date_local::date
          AND tl.leave_type = 'LEAVE'
        GROUP BY wa.employee_id, wa.arrangement_date_local::date
      ),
      overtime_hours AS (
        SELECT
          wa.employee_id,
          wa.arrangement_date_local::date as overtime_date,
          COALESCE(SUM(to2.hours), 0) as overtime_hours
        FROM shift_data wa
        LEFT JOIN jso_hr_temporary_overtime to2
          ON to2.employee_id = wa.employee_id
          AND to2.overtime_date::date = wa.arrangement_date_local::date
        GROUP BY wa.employee_id, wa.arrangement_date_local::date
      ),
      -- 特殊工时：前台(11)或特殊工时(12)工位，根据时间段计算实际工时
      special_hours_calc AS (
        SELECT
          wa.employee_id,
          wa.arrangement_date_local::date as special_date,
          SUM(
            EXTRACT(EPOCH FROM (
              (wa.end_time::time + CASE WHEN wa.end_time::time < wa.start_time::time THEN INTERVAL '24 hours' ELSE INTERVAL '0 seconds' END)
              - wa.start_time::time
            )) / 3600
          ) as special_hours
        FROM shift_data wa
        WHERE wa.workstation_id IN (11, 12)
          AND wa.start_time IS NOT NULL
          AND wa.end_time IS NOT NULL
        GROUP BY wa.employee_id, wa.arrangement_date_local::date
      ),
      -- 获取所有 SAP 工号用于统计
      all_sap_ids AS (
        SELECT DISTINCT unnest(string_to_array(ei.sap_employee_ids, '&')) as sap_id, ei.employee_id
        FROM employee_info_full ei
        WHERE ei.sap_employee_ids IS NOT NULL
      ),
      trans_stats AS (
        SELECT
          asi.employee_id,
          COUNT(CASE WHEN t.trans = 'IWS' THEN 1 END) as iws_count,
          COUNT(CASE WHEN t.trans = 'FLR' THEN 1 END) as flr_count,
          COUNT(CASE WHEN t.trans = 'PLR' THEN 1 END) as plr_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'IWS' THEN t.reference END) as grs_count,
          COUNT(DISTINCT CASE WHEN t.trans = 'PLR' THEN t.reference END) as pull_list_count
        FROM all_sap_ids asi
        LEFT JOIN jso_sap_grn_history_partitioned t
          ON t.created_by::text = asi.sap_id::text
          AND t.creation_date >= $1::date
          AND t.creation_date <= $2::date
        GROUP BY asi.employee_id
      ),
      level_efficiency AS (
        SELECT level_name, target_efficiency
        FROM jso_ole_level_efficiency_config
        WHERE status = 'active'
      ),
      -- Area效率计算规则
      area_calc_rules AS (
        SELECT
          id,
          area_list,
          iws_seconds,
          flr_seconds,
          plr_seconds,
          enabled
        FROM jso_ole_area_calc_rules
        WHERE enabled = true
      ),
      -- 员工Area匹配：处理"特殊工时"后缀，匹配规则
      -- 分隔符统一为 &，去掉 &特殊工时 后匹配
      employee_area_match AS (
        SELECT
          ei.employee_id,
          -- 把逗号替换为&，去掉特殊工时，排序用于匹配
          CASE
            WHEN ei.areas LIKE '%,特殊工时' THEN (
              -- 去掉特殊工时
              SELECT string_agg(value, '&' ORDER BY value)
              FROM unnest(string_to_array(REPLACE(ei.areas, ',特殊工时', ''), ',')) as value
              WHERE trim(value) != ''
            )
            ELSE (
              -- 直接替换逗号为&并排序
              SELECT string_agg(value, '&' ORDER BY value)
              FROM unnest(string_to_array(REPLACE(ei.areas, ',', '&'), '&')) as value
              WHERE trim(value) != ''
            )
          END as match_area,
          ei.areas as original_areas
        FROM employee_info_full ei
      ),
      -- 匹配规则获取秒数（完全匹配）
      matched_rules AS (
        SELECT
          eam.employee_id,
          eam.original_areas,
          eam.match_area,
          acr.iws_seconds,
          acr.flr_seconds,
          acr.plr_seconds
        FROM employee_area_match eam
        LEFT JOIN area_calc_rules acr
          ON acr.area_list = eam.match_area
      )
      SELECT
        ei.employee_id,
        ei.real_name as name,
        ei.sap_employee_ids as user_ids,
        ei.employee_level as level,
        ei.areas,
        ei.shift_names,
        ei.remark,
        -- 工作时长 = 班次时长 - 请假 + 加班
        (COALESCE(eh.hours, 0) - COALESCE(lh.leave_hours, 0) + COALESCE(oh.overtime_hours, 0)) as hours,
        -- 特殊工时
        COALESCE(shc.special_hours, 0) as special_hours,
        COALESCE(ts.iws_count, 0) as iws,
        COALESCE(ts.flr_count, 0) as flr,
        COALESCE(ts.plr_count, 0) as plr,
        COALESCE(ts.grs_count, 0) as grs,
        COALESCE(ts.pull_list_count, 0) as pull_list,
        -- 标记是否被排除（只被分配到特殊工时等排除区域）
        ei.is_excluded_from_efficiency,
        -- 秒数配置
        COALESCE(mr.iws_seconds, 0) as iws_seconds,
        COALESCE(mr.flr_seconds, 0) as flr_seconds,
        COALESCE(mr.plr_seconds, 0) as plr_seconds,
        le.target_efficiency,
        CASE
          -- 如果Area匹配不到规则，状态为未计算
          WHEN mr.iws_seconds IS NULL THEN NULL
          WHEN (eh.hours - COALESCE(lh.leave_hours, 0) + COALESCE(oh.overtime_hours, 0) - COALESCE(shc.special_hours, 0)) > 0
          THEN cap_efficiency(
            ((COALESCE(ts.iws_count, 0) * COALESCE(mr.iws_seconds, 0) +
              COALESCE(ts.plr_count, 0) * COALESCE(mr.plr_seconds, 0) +
              COALESCE(ts.flr_count, 0) * COALESCE(mr.flr_seconds, 0))
             / ((eh.hours - COALESCE(lh.leave_hours, 0) + COALESCE(oh.overtime_hours, 0) - COALESCE(shc.special_hours, 0)) * 3600) / 0.85) * 100
          )
          ELSE NULL
        END as percentage,
        CASE
          -- 如果Area匹配不到规则，状态为未计算
          WHEN mr.iws_seconds IS NULL THEN '未计算'
          WHEN (eh.hours - COALESCE(lh.leave_hours, 0) + COALESCE(oh.overtime_hours, 0) - COALESCE(shc.special_hours, 0)) > 0 AND le.target_efficiency IS NOT NULL
          THEN CASE
            WHEN cap_efficiency(
              ((COALESCE(ts.iws_count, 0) * COALESCE(mr.iws_seconds, 0) +
                COALESCE(ts.plr_count, 0) * COALESCE(mr.plr_seconds, 0) +
                COALESCE(ts.flr_count, 0) * COALESCE(mr.flr_seconds, 0))
               / ((eh.hours - COALESCE(lh.leave_hours, 0) + COALESCE(oh.overtime_hours, 0) - COALESCE(shc.special_hours, 0)) * 3600) / 0.85) * 100
            ) >= ROUND(le.target_efficiency * 100, 2)
            THEN '达标'
            ELSE '未达标'
          END
          ELSE '未计算'
        END as status
      FROM employee_info_full ei
      LEFT JOIN employee_hours eh ON ei.employee_id = eh.employee_id
      LEFT JOIN leave_hours lh ON ei.employee_id = lh.employee_id
      LEFT JOIN overtime_hours oh ON ei.employee_id = oh.employee_id
      LEFT JOIN special_hours_calc shc ON ei.employee_id = shc.employee_id
      LEFT JOIN trans_stats ts ON ei.employee_id = ts.employee_id
      LEFT JOIN level_efficiency le ON ei.employee_level = le.level_name
      LEFT JOIN matched_rules mr ON ei.employee_id = mr.employee_id
      ORDER BY
        CASE
          WHEN ei.shift_names ~ '(^|,&)(C|C\+)(,|$)' THEN 1
          ELSE 0
        END,
        percentage DESC NULLS LAST
    `;

    const result = await pool.query(query, [date, shiftEndDate]);

    // 获取班次Leader信息（当显示所有班次时，不显示负责人）
    let leaderInfo = { name: null, code: null };
    if (!showAllShifts) {
      const isADayShift = (shift === 'A+' || shift === 'A');
      const leaderWorkstationId = isADayShift ? 10 : 19;
      const leaderShiftName = isADayShift ? 'A' : 'C';
      try {
        const leaderQuery = `
          SELECT u.real_name, u.old_employee_id
          FROM jso_hr_workstation_arrangement w
          JOIN jso_system_user_management u ON w.employee_id = u.id
          WHERE w.workstation_id = $1
            AND (w.arrangement_date AT TIME ZONE 'Asia/Shanghai')::date = $2::date
            AND (w.shift_name = $3 OR w.shift_name = $4)
          LIMIT 1
        `;
        const leaderResult = await pool.query(leaderQuery, [leaderWorkstationId, date, shift, leaderShiftName]);
        if (leaderResult.rows.length > 0) {
          leaderInfo = {
            name: leaderResult.rows[0].real_name,
            code: leaderResult.rows[0].old_employee_id
          };
        }
      } catch (leaderErr) {
        console.error('获取Leader信息失败:', leaderErr.message);
      }
    }

    const summary = {
      totalEmployees: result.rows.length,
      totalHours: result.rows.reduce((sum, r) => sum + parseFloat(r.hours || 0), 0).toFixed(2),
      totalIws: result.rows.reduce((sum, r) => sum + parseInt(r.iws || 0), 0),
      totalFlr: result.rows.reduce((sum, r) => sum + parseInt(r.flr || 0), 0),
      totalPlr: result.rows.reduce((sum, r) => sum + parseInt(r.plr || 0), 0),
      totalGrs: result.rows.reduce((sum, r) => sum + parseInt(r.grs || 0), 0),
      totalPullList: result.rows.reduce((sum, r) => sum + parseInt(r.pull_list || 0), 0),
      achievedCount: result.rows.filter(r => r.status === '达标').length,
      unachievedCount: result.rows.filter(r => r.status === '未达标').length,
      avgPercentage: result.rows.length > 0
        ? Math.round((result.rows.filter(r => r.percentage !== null).reduce((sum, r) => sum + parseFloat(r.percentage), 0) / result.rows.filter(r => r.percentage !== null).length) * 100) / 100
        : 0,
      leaderName: leaderInfo.name,
      leaderCode: leaderInfo.code,
      currentShiftType: showAllShifts ? 'ALL' : shift,
      shiftDisplay: showAllShifts ? '全部班次' : ((shift === 'A+' || shift === 'A') ? 'A班' : 'C班')
    };

    res.json({
      success: true,
      data: {
        records: result.rows,
        summary
      }
    });
  } catch (error) {
    console.error('获取班次明细失败:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message, stack: error.stack });
  }
};

/**
 * 获取效率目标配置
 * GET /api/ole-tracking/config/level-efficiency
 */
const getLevelEfficiencyConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, level_name, target_efficiency, description, status
      FROM jso_ole_level_efficiency_config
      ORDER BY
        CASE
          WHEN level_name = '3 Level' THEN 1
          WHEN level_name = '4 Level' THEN 2
          WHEN level_name = '5 Level' THEN 3
          WHEN level_name = '6 Level' THEN 4
          ELSE 5
        END
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取等级效率配置失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 更新效率目标配置
 * PUT /api/ole-tracking/config/level-efficiency/:id
 */
const updateLevelEfficiencyConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { level_name, target_efficiency, description, status } = req.body;

    const result = await pool.query(`
      UPDATE jso_ole_level_efficiency_config
      SET level_name = $1, target_efficiency = $2, description = $3, status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [level_name, target_efficiency, description, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('更新等级效率配置失败:', error);
    res.status(500).json({ success: false, message: '更新失败', error: error.message });
  }
};

/**
 * 新增效率目标配置
 * POST /api/ole-tracking/config/level-efficiency
 */
const createLevelEfficiencyConfig = async (req, res) => {
  try {
    const { level_name, target_efficiency, description, status } = req.body;

    const result = await pool.query(`
      INSERT INTO jso_ole_level_efficiency_config (level_name, target_efficiency, description, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [level_name, target_efficiency, description, status || 'active']);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('新增等级效率配置失败:', error);
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
};

/**
 * 删除效率目标配置
 * DELETE /api/ole-tracking/config/level-efficiency/:id
 */
const deleteLevelEfficiencyConfig = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM jso_ole_level_efficiency_config WHERE id = $1', [id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除等级效率配置失败:', error);
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
};

/**
 * 获取Area系数配置
 * GET /api/ole-tracking/config/area-coefficient
 */
const getAreaCoefficientConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status
      FROM jso_ole_area_coefficient_config
      WHERE status = 'active'
      ORDER BY area_name
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取Area系数配置失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 更新Area系数配置
 * PUT /api/ole-tracking/config/area-coefficient/:id
 */
const updateAreaCoefficientConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status } = req.body;

    const result = await pool.query(`
      UPDATE jso_ole_area_coefficient_config
      SET area_name = $1, iws_coefficient = $2, plr_coefficient = $3, flr_coefficient = $4,
          description = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('更新Area系数配置失败:', error);
    res.status(500).json({ success: false, message: '更新失败', error: error.message });
  }
};

/**
 * 新增Area系数配置
 * POST /api/ole-tracking/config/area-coefficient
 */
const createAreaCoefficientConfig = async (req, res) => {
  try {
    const { area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status } = req.body;

    const result = await pool.query(`
      INSERT INTO jso_ole_area_coefficient_config (area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [area_name, iws_coefficient, plr_coefficient, flr_coefficient, description, status || 'active']);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('新增Area系数配置失败:', error);
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
};

/**
 * 删除Area系数配置
 * DELETE /api/ole-tracking/config/area-coefficient/:id
 */
const deleteAreaCoefficientConfig = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM jso_ole_area_coefficient_config WHERE id = $1', [id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除Area系数配置失败:', error);
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
};

// ========== 不参与效率计算的Area配置 ==========

/**
 * 获取不参与效率计算的Area列表
 * GET /api/ole-tracking/config/excluded-areas
 */
const getExcludedAreas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, area_name, enabled, created_at, updated_at
      FROM jso_ole_excluded_areas
      ORDER BY area_name
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取排除Area配置失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 保存不参与效率计算的Area配置（批量更新启用状态）
 * PUT /api/ole-tracking/config/excluded-areas
 */
const updateExcludedAreas = async (req, res) => {
  try {
    const { areas } = req.body; // [{area_name: 'xxx', enabled: true/false}, ...]

    if (!Array.isArray(areas)) {
      return res.status(400).json({ success: false, message: '参数格式错误' });
    }

    for (const item of areas) {
      // 使用 upsert：如果存在则更新，不存在则插入
      await pool.query(`
        INSERT INTO jso_ole_excluded_areas (area_name, enabled, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (area_name)
        DO UPDATE SET enabled = $2, updated_at = CURRENT_TIMESTAMP
      `, [item.area_name, item.enabled]);
    }

    res.json({ success: true, message: '保存成功' });
  } catch (error) {
    console.error('保存排除Area配置失败:', error);
    res.status(500).json({ success: false, message: '保存失败', error: error.message });
  }
};

/**
 * 添加特殊工时到排除区域（调试接口）
 * POST /api/ole-tracking/config/add-special-hours
 */
const addSpecialHoursToExcluded = async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO jso_ole_excluded_areas (area_name, enabled, updated_at)
      VALUES ('特殊工时', true, CURRENT_TIMESTAMP)
      ON CONFLICT (area_name)
      DO UPDATE SET enabled = true, updated_at = CURRENT_TIMESTAMP
    `);
    res.json({ success: true, message: '已添加特殊工时到排除区域' });
  } catch (error) {
    console.error('添加排除区域失败:', error);
    res.status(500).json({ success: false, message: '添加失败', error: error.message });
  }
};

/**
 * 获取所有Area列表（用于配置）
 * GET /api/ole-tracking/config/all-areas
 */
const getAllAreas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT name as area_name
      FROM jso_config_workstation
      WHERE name IS NOT NULL
      ORDER BY name
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取Area列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

// ========== Area效率计算规则配置 ==========

/**
 * 获取Area效率计算规则列表
 * GET /api/ole-tracking/config/area-rules
 */
const getAreaRules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, area_list, iws_enabled, flr_enabled, plr_enabled, enabled,
             iws_seconds, flr_seconds, plr_seconds, created_at, updated_at
      FROM jso_ole_area_calc_rules
      ORDER BY id
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取计算规则配置失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
};

/**
 * 新增Area效率计算规则
 * POST /api/ole-tracking/config/area-rules
 */
const createAreaRule = async (req, res) => {
  try {
    const { area_list, iws_enabled, flr_enabled, plr_enabled, enabled, iws_seconds, flr_seconds, plr_seconds } = req.body;

    if (!area_list) {
      return res.status(400).json({ success: false, message: 'Area列表不能为空' });
    }

    const result = await pool.query(`
      INSERT INTO jso_ole_area_calc_rules (area_list, iws_enabled, flr_enabled, plr_enabled, enabled, iws_seconds, flr_seconds, plr_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [area_list, iws_enabled !== false, flr_enabled !== false, plr_enabled !== false, enabled !== false, iws_seconds || 0, flr_seconds || 0, plr_seconds || 0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('新增计算规则配置失败:', error);
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
};

/**
 * 更新Area效率计算规则
 * PUT /api/ole-tracking/config/area-rules/:id
 */
const updateAreaRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { area_list, iws_enabled, flr_enabled, plr_enabled, enabled, iws_seconds, flr_seconds, plr_seconds } = req.body;

    const result = await pool.query(`
      UPDATE jso_ole_area_calc_rules
      SET area_list = $1, iws_enabled = $2, flr_enabled = $3, plr_enabled = $4,
          enabled = $5, iws_seconds = $6, flr_seconds = $7, plr_seconds = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [area_list, iws_enabled !== false, flr_enabled !== false, plr_enabled !== false, enabled !== false, iws_seconds || 0, flr_seconds || 0, plr_seconds || 0, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('更新计算规则配置失败:', error);
    res.status(500).json({ success: false, message: '更新失败', error: error.message });
  }
};

/**
 * 删除Area效率计算规则
 * DELETE /api/ole-tracking/config/area-rules/:id
 */
const deleteAreaRule = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM jso_ole_area_calc_rules WHERE id = $1', [id]);

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除计算规则配置失败:', error);
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
};

export {
  getStats,
  getRanking,
  getAreaStats,
  getDiffStats,
  getDailyEfficiency,
  getShiftDetail,
  getLevelEfficiencyConfig,
  updateLevelEfficiencyConfig,
  createLevelEfficiencyConfig,
  deleteLevelEfficiencyConfig,
  getAreaCoefficientConfig,
  updateAreaCoefficientConfig,
  createAreaCoefficientConfig,
  deleteAreaCoefficientConfig,
  getExcludedAreas,
  updateExcludedAreas,
  addSpecialHoursToExcluded,
  getAllAreas,
  getAreaRules,
  createAreaRule,
  updateAreaRule,
  deleteAreaRule
};
