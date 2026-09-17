<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog">
      <div class="dialog-header">
        <h3>📥 批量导入差异登记</h3>
        <button class="dialog-close" @click="handleClose">×</button>
      </div>

      <div class="dialog-body">
        <!-- 下载模板 -->
        <div class="download-section">
          <button class="btn btn-outline" @click="handleDownloadTemplate">
            <span class="btn-icon">📥</span> 下载导入模板
          </button>
        </div>

        <!-- 文件上传 -->
        <div class="upload-section">
          <div class="upload-area" :class="{ 'dragover': isDragover }" @dragover.prevent="isDragover = true" @dragleave="isDragover = false" @drop.prevent="handleDrop">
            <input type="file" ref="fileInput" accept=".xlsx,.xls" @change="handleFileChange" style="display:none">
            <div class="upload-icon">📁</div>
            <div class="upload-text">将Excel文件拖拽到此处，或 <span class="link" @click="fileInput?.click()">点击选择文件</span></div>
            <div class="upload-hint">支持 .xlsx 和 .xls 格式</div>
          </div>
        </div>

        <!-- 已选文件 -->
        <div v-if="selectedFile" class="selected-file">
          <span class="file-icon">📄</span>
          <span class="file-name">{{ selectedFile.name }}</span>
          <button class="btn-remove" @click="removeFile">×</button>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" class="import-result" :class="importResult.failed > 0 ? 'has-errors' : 'success'">
          <div class="result-summary">
            <span class="result-icon">{{ importResult.failed > 0 ? '⚠️' : '✅' }}</span>
            <span>共处理 {{ importResult.total }} 条，成功 {{ importResult.success }} 条{{ importResult.failed > 0 ? `，失败 ${importResult.failed} 条` : '' }}</span>
          </div>

          <!-- 错误列表 -->
          <div v-if="importResult.errors && importResult.errors.length > 0" class="error-list">
            <div class="error-header">错误详情：</div>
            <div v-for="(error, index) in importResult.errors.slice(0, 10)" :key="index" class="error-item">
              第 {{ error.row }} 行：{{ error.message }}
            </div>
            <div v-if="importResult.errors.length > 10" class="error-more">
              还有 {{ importResult.errors.length - 10 }} 条错误未显示...
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button class="btn btn-primary" :disabled="!selectedFile || isImporting" @click="handleImport">
          {{ isImporting ? '导入中...' : '开始导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import * as api from '../../api/warehouseDiff';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isDragover = ref(false);
const isImporting = ref(false);
const importResult = ref<{
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
} | null>(null);

// 监听 visible 变化，重置状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时重置
    setTimeout(() => {
      selectedFile.value = null;
      importResult.value = null;
      isImporting.value = false;
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    }, 300);
  }
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
    importResult.value = null;
  }
};

const handleDrop = (event: DragEvent) => {
  isDragover.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      selectedFile.value = file;
      importResult.value = null;
    } else {
      ElMessage.error('请选择 Excel 文件（.xlsx 或 .xls）');
    }
  }
};

const removeFile = () => {
  selectedFile.value = null;
  importResult.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const handleDownloadTemplate = async () => {
  try {
    const res = await api.downloadTemplate();
    // 创建下载链接
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '仓储差异登记导入模板.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('模板下载成功');
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('下载模板失败');
  }
};

const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件');
    return;
  }

  isImporting.value = true;
  try {
    const res: any = await api.importRegistrations(selectedFile.value);
    importResult.value = res.data || res;
    if (!importResult.value) {
      ElMessage.error('导入返回数据无效');
    } else if (importResult.value.failed === 0) {
      ElMessage.success('导入成功');
      emit('success');
    } else if (importResult.value.success > 0) {
      ElMessage.warning(`导入部分成功：成功 ${importResult.value.success} 条，失败 ${importResult.value.failed} 条`);
    } else {
      ElMessage.error('导入失败');
    }
  } catch (error: any) {
    console.error('导入失败:', error);
    ElMessage.error(error?.message || '导入失败');
    importResult.value = null;
  } finally {
    isImporting.value = false;
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #fff;
  border-radius: 12px;
  width: 560px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dialog-close:hover {
  background: #fee2e2;
  color: #ef4444;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.download-section {
  margin-bottom: 20px;
}

.upload-section {
  margin-bottom: 20px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
}

.upload-text .link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.upload-text .link:hover {
  color: #2563eb;
}

.upload-hint {
  font-size: 12px;
  color: #9ca3af;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.file-icon {
  font-size: 20px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #fee2e2;
  color: #ef4444;
}

.import-result {
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.import-result.success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.import-result.has-errors {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.result-icon {
  font-size: 18px;
}

.error-list {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #fed7aa;
}

.error-header {
  font-size: 13px;
  font-weight: 500;
  color: #c2410c;
  margin-bottom: 8px;
}

.error-item {
  font-size: 12px;
  color: #9a3412;
  padding: 4px 0;
}

.error-more {
  font-size: 12px;
  color: #9a3412;
  font-style: italic;
  margin-top: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-outline {
  background: #fff;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btn-outline:hover {
  background: #eff6ff;
}

.btn-icon {
  font-size: 16px;
}
</style>
