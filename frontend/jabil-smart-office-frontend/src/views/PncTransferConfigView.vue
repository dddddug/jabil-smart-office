<template>
  <div class="pnc-transfer-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">PNC转仓打印配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ PNC转仓打印配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-primary" @click="openAddDialog">➕ 添加配置</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 配置列表 -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 60px;">序号</th>
              <th>配置名称</th>
              <th>邮件收件人</th>
              <th>邮件抄送人</th>
              <th>联系电话</th>
              <th>接收人</th>
              <th>接收地址</th>
              <th>系统位置</th>
              <th>状态</th>
              <th style="width: 120px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in configs" :key="item.id">
              <td class="text-center">{{ index + 1 }}</td>
              <td>{{ item.configName }}</td>
              <td>{{ item.recipientEmail || '-' }}</td>
              <td>{{ item.ccEmail || '-' }}</td>
              <td>{{ item.contactPhone || '-' }}</td>
              <td>{{ item.recipientName || '-' }}</td>
              <td class="address-cell" :title="item.receivingAddress">{{ item.receivingAddress || '-' }}</td>
              <td>{{ item.systemLocation || '-' }}</td>
              <td class="text-center">
                <span class="status-badge" :class="item.isActive ? 'status-active' : 'status-inactive'">
                  {{ item.isActive ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="text-center">
                <button type="button" class="btn-icon" @click="openEditDialog(item)" title="编辑">✏️</button>
                <button type="button" class="btn-icon btn-delete" @click="handleDelete(item)" title="删除">🗑️</button>
              </td>
            </tr>
            <tr v-if="configs.length === 0">
              <td colspan="10" class="text-center empty-tip">暂无配置，请点击上方按钮添加</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加/编辑配置弹窗 -->
    <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title">{{ isEdit ? '编辑配置' : '添加配置' }}</div>
          <button type="button" class="dialog-close" @click="dialogVisible = false">✕</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-row">
              <div class="form-group">
                <label>配置名称 <span class="required">*</span></label>
                <input
                  type="text"
                  v-model="form.configName"
                  placeholder="请输入配置名称"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>邮件收件人</label>
                <input
                  type="email"
                  v-model="form.recipientEmail"
                  placeholder="请输入邮件收件人"
                />
              </div>
              <div class="form-group">
                <label>邮件抄送人</label>
                <input
                  type="email"
                  v-model="form.ccEmail"
                  placeholder="多个邮箱用逗号分隔"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>联系电话</label>
                <input
                  type="text"
                  v-model="form.contactPhone"
                  placeholder="请输入联系电话"
                />
              </div>
              <div class="form-group">
                <label>接收人</label>
                <input
                  type="text"
                  v-model="form.recipientName"
                  placeholder="请输入接收人姓名"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>接收地址</label>
                <input
                  type="text"
                  v-model="form.receivingAddress"
                  placeholder="请输入接收地址"
                />
              </div>
              <div class="form-group">
                <label>系统位置</label>
                <input
                  type="text"
                  v-model="form.systemLocation"
                  placeholder="请输入系统位置"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group form-group-full">
                <label>
                  <input type="checkbox" v-model="form.isActive" />
                  启用此配置
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" @click="dialogVisible = false">取消</button>
          <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getConfigs, createConfig, updateConfig, deleteConfig, PncTransferConfig } from '../api/pncTransferConfig';

const configs = ref<PncTransferConfig[]>([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  configName: '',
  recipientEmail: '',
  ccEmail: '',
  contactPhone: '',
  recipientName: '',
  receivingAddress: '',
  systemLocation: '',
  isActive: true
});

// 加载配置列表
const loadConfigs = async () => {
  try {
    const response = await getConfigs();
    configs.value = response || [];
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error('加载配置失败');
  }
};

// 打开添加弹窗
const openAddDialog = () => {
  isEdit.value = false;
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
};

// 打开编辑弹窗
const openEditDialog = (item: PncTransferConfig) => {
  isEdit.value = true;
  editingId.value = item.id || null;
  form.configName = item.configName;
  form.recipientEmail = item.recipientEmail || '';
  form.ccEmail = item.ccEmail || '';
  form.contactPhone = item.contactPhone || '';
  form.recipientName = item.recipientName || '';
  form.receivingAddress = item.receivingAddress || '';
  form.systemLocation = item.systemLocation || '';
  form.isActive = item.isActive !== false;
  dialogVisible.value = true;
};

// 重置表单
const resetForm = () => {
  form.configName = '';
  form.recipientEmail = '';
  form.ccEmail = '';
  form.contactPhone = '';
  form.recipientName = '';
  form.receivingAddress = '';
  form.systemLocation = '';
  form.isActive = true;
};

// 提交表单
const handleSubmit = async () => {
  if (!form.configName.trim()) {
    ElMessage.warning('请输入配置名称');
    return;
  }

  submitting.value = true;
  try {
    const data = {
      configName: form.configName,
      recipientEmail: form.recipientEmail || undefined,
      ccEmail: form.ccEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      recipientName: form.recipientName || undefined,
      receivingAddress: form.receivingAddress || undefined,
      systemLocation: form.systemLocation || undefined,
      isActive: form.isActive
    };

    if (isEdit.value && editingId.value) {
      await updateConfig(editingId.value, data);
      ElMessage.success('配置更新成功');
    } else {
      await createConfig(data);
      ElMessage.success('配置添加成功');
    }

    dialogVisible.value = false;
    loadConfigs();
  } catch (error: any) {
    console.error('保存配置失败:', error);
    ElMessage.error((error as any).message || '保存配置失败');
  } finally {
    submitting.value = false;
  }
};

// 删除配置
const handleDelete = async (item: PncTransferConfig) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除配置"${item.configName}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    if (item.id) {
      await deleteConfig(item.id);
      ElMessage.success('配置删除成功');
      loadConfigs();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除配置失败:', error);
      ElMessage.error((error as any).message || '删除配置失败');
    }
  }
};

// 页面加载时获取配置
onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.pnc-transfer-config-container {
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
  padding-bottom: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.table-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #0066CC;
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: #0052A3;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
}

.card-body {
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.text-center {
  text-align: center;
}

.empty-tip {
  color: #9CA3AF;
  font-style: italic;
}

.address-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background-color: #FEE2E2;
  color: #991B1B;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #E5E7EB;
}

.btn-delete:hover {
  background-color: #FEE2E2;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6B7280;
  padding: 4px;
}

.dialog-close:hover {
  color: #111827;
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
  border-top: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
}

.form-group-full {
  flex: unset;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input[type="text"],
.form-group input[type="email"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-right: 8px;
}

.required {
  color: #EF4444;
}
</style>
