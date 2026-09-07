/**
 * 手动触发 SAP 数据拉取任务 (GRN + ITEM)
 * 用法: node manualSAPPull.js
 */
import { pullSAPData } from './scheduledTasks.js';

console.log('='.repeat(50));
console.log('   手动触发 SAP 数据拉取任务');
console.log('='.repeat(50));
console.log('');

try {
  await pullSAPData();
  console.log('\n✅ SAP 数据拉取任务执行完成');
} catch (err) {
  console.error('\n❌ 执行失败:', err.message);
}

process.exit(0);
