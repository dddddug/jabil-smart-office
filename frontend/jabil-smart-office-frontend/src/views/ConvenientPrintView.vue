<template>
  <div class="convenient-print-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">便捷打印</span>
      </div>
    </div>

    <div class="print-layout">
      <div class="print-config-panel">
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">🖨️ 打印配置</div>
          </div>
          <div class="panel-body">
            <div class="config-section">
              <div class="config-title">选择模板</div>
              <div class="template-list">
                <div 
                  v-for="template in printTemplates" 
                  :key="template.id"
                  class="template-item"
                  :class="{ active: selectedTemplate?.id === template.id }"
                  @click="selectTemplate(template)"
                >
                  <div class="template-icon">{{ template.icon }}</div>
                  <div class="template-info">
                    <div class="template-name">{{ template.name }}</div>
                    <div class="template-desc">{{ template.description }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedTemplate" class="config-section">
              <div class="config-title">打印设置</div>
              <div class="form-group">
                <label>纸张大小</label>
                <select v-model="printConfig.paperSize">
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div class="form-group">
                <label>方向</label>
                <div class="radio-group">
                  <label class="radio-item">
                    <input type="radio" v-model="printConfig.orientation" value="portrait">
                    <span>纵向</span>
                  </label>
                  <label class="radio-item">
                    <input type="radio" v-model="printConfig.orientation" value="landscape">
                    <span>横向</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>份数</label>
                <input type="number" v-model.number="printConfig.copies" min="1" max="100">
              </div>
              <div class="form-group">
                <label>打印范围</label>
                <div class="radio-group">
                  <label class="radio-item">
                    <input type="radio" v-model="printConfig.range" value="all">
                    <span>全部</span>
                  </label>
                  <label class="radio-item">
                    <input type="radio" v-model="printConfig.range" value="current">
                    <span>当前页</span>
                  </label>
                </div>
              </div>
            </div>

            <div v-if="selectedTemplate" class="config-section">
              <div class="config-title">数据预览</div>
              <div class="preview-data">
                <div class="data-item" v-for="(value, key) in previewData" :key="key">
                  <span class="data-key">{{ key }}</span>
                  <span class="data-value">{{ value }}</span>
                </div>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-secondary" @click="previewPrint">👁️ 预览</button>
              <button class="btn btn-primary" @click="executePrint">🖨️ 打印</button>
            </div>
          </div>
        </div>
      </div>

      <div class="print-preview-panel">
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">📄 预览区域</div>
          </div>
          <div class="panel-body">
            <div v-if="!selectedTemplate" class="empty-preview">
              <div class="empty-icon">📄</div>
              <div class="empty-text">请选择一个打印模板</div>
            </div>
            <div v-else class="print-preview" :class="{ landscape: printConfig.orientation === 'landscape' }">
              <div class="preview-content">
                <div class="preview-header">
                  <h2>{{ selectedTemplate.name }}</h2>
                  <div class="preview-meta">
                    <span>打印时间: {{ currentTime }}</span>
                    <span>打印人: 当前用户</span>
                  </div>
                </div>
                <div class="preview-body">
                  <div class="preview-section">
                    <div class="section-title">基本信息</div>
                    <div class="info-grid">
                      <div class="info-item" v-for="(value, key) in previewData" :key="key">
                        <span class="info-label">{{ key }}</span>
                        <span class="info-value">{{ value }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="preview-section">
                    <div class="section-title">备注</div>
                    <div class="preview-remark">这是打印文档的备注信息区域。</div>
                  </div>
                </div>
                <div class="preview-footer">
                  <div class="footer-text">© 捷普科技 2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

interface PrintTemplate {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
}

const printTemplates = ref<PrintTemplate[]>([
  { id: 1, name: '员工工作证', description: '打印员工工作证卡片', icon: '🪪', type: 'badge' },
  { id: 2, name: '考勤报表', description: '打印员工考勤月度报表', icon: '📊', type: 'report' },
  { id: 3, name: '工资条', description: '打印员工工资明细单', icon: '💰', type: 'salary' },
  { id: 4, name: '请假单', description: '打印请假审批单', icon: '📋', type: 'leave' },
  { id: 5, name: '出入证', description: '打印临时出入证明', icon: '🎫', type: 'pass' },
  { id: 6, name: '物料标签', description: '打印物料标签贴纸', icon: '🏷️', type: 'label' },
]);

const selectedTemplate = ref<PrintTemplate | null>(null);
const printConfig = ref({
  paperSize: 'A4',
  orientation: 'portrait',
  copies: 1,
  range: 'all'
});

const previewData = computed(() => {
  if (!selectedTemplate.value) return {};
  
  const baseData = {
    '姓名': '张三',
    '工号': 'EMP001',
    '部门': '生产部',
    '职位': '技术员',
    '日期': new Date().toLocaleDateString('zh-CN')
  };
  
  switch (selectedTemplate.value.type) {
    case 'badge':
      return {
        '姓名': '张三',
        '工号': 'EMP001',
        '部门': '生产部',
        '职位': '技术员',
        '有效期': '2024-01-01 至 2024-12-31'
      };
    case 'report':
      return {
        '姓名': '张三',
        '工号': 'EMP001',
        '部门': '生产部',
        '月份': '2024年6月',
        '出勤天数': '22',
        '迟到次数': '0',
        '请假天数': '1'
      };
    case 'salary':
      return {
        '姓名': '张三',
        '工号': 'EMP001',
        '部门': '生产部',
        '月份': '2024年6月',
        '基本工资': '8000',
        '绩效奖金': '2000',
        '实发工资': '9500'
      };
    case 'leave':
      return {
        '姓名': '张三',
        '工号': 'EMP001',
        '部门': '生产部',
        '请假类型': '年假',
        '开始日期': '2024-07-01',
        '结束日期': '2024-07-05',
        '天数': '5'
      };
    default:
      return baseData;
  }
});

const currentTime = computed(() => new Date().toLocaleString('zh-CN'));

const selectTemplate = (template: PrintTemplate) => {
  selectedTemplate.value = template;
};

const previewPrint = () => {
  ElMessage.info('打开预览窗口');
};

const executePrint = () => {
  ElMessage.success(`正在打印 ${printConfig.value.copies} 份 ${selectedTemplate.value?.name}`);
};

onMounted(() => {
  // 默认选择第一个模板
  if (printTemplates.value.length > 0) {
    selectedTemplate.value = printTemplates.value[0] || null;
  }
});
</script>

<style scoped>
.convenient-print-container {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 8px 0 16px 0;
  margin-bottom: 0;
}

.breadcrumb {
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #9CA3AF;
}

.print-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  height: calc(100vh - 160px);
}

.print-config-panel,
.print-preview-panel {
  display: flex;
  flex-direction: column;
}

.panel-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.panel-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 24px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: #9CA3AF;
  background-color: #F9FAFB;
}

.template-item.active {
  border-color: #0066CC;
  background-color: #EFF6FF;
}

.template-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.template-desc {
  font-size: 13px;
  color: #6B7280;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #4B5563;
}

.radio-item input {
  width: auto;
  cursor: pointer;
}

.preview-data {
  background-color: #F9FAFB;
  border-radius: 8px;
  padding: 16px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E5E7EB;
}

.data-item:last-child {
  border-bottom: none;
}

.data-key {
  font-size: 14px;
  color: #6B7280;
}

.data-value {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #9CA3AF;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.print-preview {
  background-color: #E5E7EB;
  padding: 40px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
}

.print-preview.landscape {
  padding: 20px;
}

.preview-content {
  background-color: white;
  width: 210mm;
  min-height: 297mm;
  padding: 30mm;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.print-preview.landscape .preview-content {
  width: 297mm;
  min-height: 210mm;
}

.preview-header {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 2px solid #E5E7EB;
}

.preview-header h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  color: #111827;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #6B7280;
}

.preview-body {
  padding: 32px 0;
}

.preview-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #E5E7EB;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #6B7280;
}

.info-value {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.preview-remark {
  padding: 16px;
  background-color: #F9FAFB;
  border-radius: 8px;
  font-size: 14px;
  color: #4B5563;
  min-height: 80px;
}

.preview-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 2px solid #E5E7EB;
}

.footer-text {
  font-size: 12px;
  color: #9CA3AF;
}
</style>
