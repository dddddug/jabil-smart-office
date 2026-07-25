const fs = require('fs');
const path = require('path');

const VIEWS_DIR = path.join(__dirname, 'jabil-smart-office-frontend', 'src', 'views');

const EXCLUDED_FILES = [
  'LoginForm.vue', 
  'LoginView.vue', 
  'FirstTimeSetup.vue', 
  'ResetPasswordForm.vue', 
  'RegisterForm.vue',
  'NotFoundView.vue'
];

const UPDATE_CONTAINER_STYLE = (containerName) => `.${containerName} {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 80px;
}

.page-header {
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

const processFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有page-header
    if (!content.includes('page-header')) {
      console.log(`跳过 ${path.basename(filePath)} - 无 page-header`);
      return;
    }
    
    console.log(`处理 ${path.basename(filePath)}...`);
    
    // 查找容器类名
    let containerName = '';
    const containerMatch = content.match(/<div class="([a-zA-Z0-9_-]+)-container">/);
    if (containerMatch) {
      containerName = containerMatch[1] + '-container';
    }
    
    if (!containerName) {
      console.log(`跳过 ${path.basename(filePath)} - 未找到容器类名`);
      return;
    }
    
    // 处理样式部分
    const styleMatch = content.match(/<style scoped>([\s\S]*?)<\/style>/);
    if (!styleMatch) {
      console.log(`跳过 ${path.basename(filePath)} - 未找到样式`);
      return;
    }
    
    let styleContent = styleMatch[1];
    
    // 检查是否已经修改过了
    if (styleContent.includes('position: sticky')) {
      console.log(`跳过 ${path.basename(filePath)} - 已经修改过`);
      return;
    }
    
    // 更新容器样式
    const containerPattern = new RegExp(`\\.${containerName}\\s*\\{[\\s\\S]*?\\}`);
    const oldContainerMatch = styleContent.match(containerPattern);
    
    if (oldContainerMatch) {
      // 替换容器样式
      styleContent = styleContent.replace(containerPattern, UPDATE_CONTAINER_STYLE(containerName));
      
      // 移除旧的page-header样式（如果存在）
      const oldPageHeaderPattern = /\.page-header\s*\{[\s\S]*?\}/;
      styleContent = styleContent.replace(oldPageHeaderPattern, '');
      
      // 保存更新后的内容
      const newContent = content.replace(/<style scoped>[\s\S]*?<\/style>/, 
        `<style scoped>${styleContent}</style>`);
      
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 更新成功: ${path.basename(filePath)}`);
    }
    
  } catch (error) {
    console.error(`❌ 处理失败: ${path.basename(filePath)}`, error);
  }
};

const main = () => {
  console.log('开始批量更新页面...\n');
  
  const files = fs.readdirSync(VIEWS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.vue') && !EXCLUDED_FILES.includes(file)) {
      const filePath = path.join(VIEWS_DIR, file);
      processFile(filePath);
    }
  }
  
  console.log('\n✅ 处理完成!');
};

main();
