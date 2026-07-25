const { triggerRecalculationForAllMonths } = require('../services/costSummaryService.js');

triggerRecalculationForAllMonths()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('批量重算脚本执行失败:', error);
        process.exit(1);
    });