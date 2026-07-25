const pool = require('../config/db.js').default;
const { COST_SUMMARY_TABLE, DEPT_RULES_TABLE, USER_TABLE } = require('../config/db_constants.js');

const checkCostSummaryData = async () => {
    const client = await pool.connect();
    try {
        console.log(`查询 ${COST_SUMMARY_TABLE} 表中的所有数据...`);
        const result = await client.query(`SELECT fiscal_month, department_id, position, available_budget::text as available_budget, total_cost, total_work_hours, hourly_rate, welfare_cost FROM ${COST_SUMMARY_TABLE} ORDER BY fiscal_month, department_id, position;`);
        console.log(`共 ${result.rows.length} 行数据：`);
        console.table(result.rows);

        // Check for duplicates
        const duplicateCheckResult = await client.query(`
            SELECT fiscal_month, department_id, position, COUNT(*)
            FROM ${COST_SUMMARY_TABLE}
            GROUP BY fiscal_month, department_id, position
            HAVING COUNT(*) > 1;
        `);
        if (duplicateCheckResult.rows.length > 0) {
            console.warn('!!! 警告: 发现重复数据 !!!');
            console.table(duplicateCheckResult.rows);
        } else {
            console.log('未发现重复数据。');
        }

        console.log(`\n查询 ${DEPT_RULES_TABLE} 表中的所有数据...`);
        const deptRulesResult = await client.query(`SELECT * FROM ${DEPT_RULES_TABLE} ORDER BY business_month, department_id, plant_id;`);
        console.log(`共 ${deptRulesResult.rows.length} 行数据：`);
        console.table(deptRulesResult.rows);

        console.log(`\n查询 ${USER_TABLE} 表中的所有数据...`);
        const userResult = await client.query(`SELECT id, username, department_id, position, level, employee_type FROM ${USER_TABLE} ORDER BY id;`);
        console.log(`共 ${userResult.rows.length} 行数据：`);
        console.table(userResult.rows);

    } catch (error) {
        console.error(`查询 ${COST_SUMMARY_TABLE} 表数据失败:`, error);
        throw error;
    } finally {
        client.release();
    }
};

checkCostSummaryData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });