const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, 'jabil-smart-office-frontend', 'src', 'views');

const PAGES_TO_UPDATE = [
  'DeptCalcRulesConfigView.vue',
  'BinVolumeManagementView.vue',
  'ExpiredMaterialExtensionView.vue',
  'BonusEvaluationView.vue',
  'KpiIndicatorsView.vue',
  'CostSummaryView.vue',
  'PermissionManagementView.vue',
  'SixSManagementView.vue',
  'ProductionTrackingView.vue',
  'ConvenientPrintView.vue',
  'ReceiptManagementView.vue',
  'StationArrangementView.vue',
  'EmployeeScheduleView.vue',
  'WelfareBaseConfigView.vue',
  'SmartScheduleRulesConfigView.vue'
];

const updateFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否需要修改
    if (!content.includes('page-header')) {
      return false;
    }
    
    if (content.includes('position: sticky')) {
      return false; // 已经修改过了
    }
    
    // 查找容器类名
    const containerMatch = content.match(/<div class="([a-zA-Z0-9_-]+)-container">/);
    if (!containerMatch) {
      return false;
    }
    const containerName = containerMatch[1] + '-container';
    
    // 修改样式
    let newContent = content;
    
    // 1. 更新容器样式
    const oldContainerRegex = new RegExp(`\\.${containerName}\\s*\\{[\\s\\S]*?\\}`);
    const newContainerStyle = `.${containerName} {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 80px;
}`;
    newContent = newContent.replace(oldContainerRegex, newContainerStyle);
    
    // 2. 替换page-header样式
    const oldPageHeaderRegex = /\.page-header\s*\{[\s\S]*?\}/;
    const newPageHeaderStyle = `.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 24px 0;
  margin-bottom: 0;
}`;
    newContent = newContent.replace(oldPageHeaderRegex, newPageHeaderStyle);
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 更新成功: ${path.basename(filePath)}`);
      return true;
    }
    return false;
    
  } catch (error) {
    console.error(`❌ 处理失败: ${path.basename(filePath)}`, error);
    return false;
  }
};

const main = () => {
  let updatedCount = 0;
  console.log('开始批量更新页面...\n');
  
  for (const file of PAGES_TO_UPDATE) {
    const filePath = path.join(VIEWS_DIR, file);
    if (fs.existsSync(filePath)) {
      if (updateFile(filePath)) {
        updatedCount++;
      }
    }
  }
  
  console.log(`\n✅ 完成! 共更新 ${updatedCount} 个页面。`);
};

main();
