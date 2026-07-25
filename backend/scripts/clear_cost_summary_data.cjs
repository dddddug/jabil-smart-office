const pool = require('../config/db.js').default;
const { COST_SUMMARY_TABLE } = require('../config/db_constants.js');

const clearCostSummaryData = async () => {
    const client = await pool.connect();
    try {
        console.log(`清空 ${COST_SUMMARY_TABLE} 表中的所有数据...`);
        const result = await client.query(`DELETE FROM ${COST_SUMMARY_TABLE};`);
        console.log(`成功清空 ${COST_SUMMARY_TABLE} 表。删除了 ${result.rowCount} 行数据。`);
    } catch (error) {
        console.error(`清空 ${COST_SUMMARY_TABLE} 表数据失败:`, error);
        throw error;
    } finally {
        client.release();
    }
};

clearCostSummaryData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });