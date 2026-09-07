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
        <div class="table-card-title">PNC转仓打印配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-primary" @click="openAddDialog">➕ 添加配置</button>
        </div>
      </div>
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 60px;">序号</th>
              <th>配置名称</th>
              <th>部门</th>
              <th>邮件收件人</th>
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
              <td>{{ item.departmentName || '-' }}</td>
              <td>{{ item.recipientEmail || '-' }}</td>
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
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配置' : '添加配置'"
      width="600px"
      :close-on-click-modal="false"
      class="pnc-config-dialog"
    >
      <el-form :model="form" label-width="100px" class="config-form">
        <el-form-item label="配置名称" required>
          <el-input v-model="form.configName" placeholder="请输入配置名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="form.departmentId" placeholder="请选择部门" clearable @change="onDepartmentChange" style="width: 100%">
            <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮件收件人">
          <el-input v-model="form.recipientEmail" placeholder="请输入邮件收件人" type="email" />
        </el-form-item>
        <el-form-item label="邮件抄送人">
          <el-input v-model="form.ccEmail" placeholder="多个邮箱用逗号分隔" type="email" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="接收人">
          <el-input v-model="form.recipientName" placeholder="请输入接收人姓名" />
        </el-form-item>
        <el-form-item label="接收地址">
          <el-input v-model="form.receivingAddress" placeholder="请输入接收地址" />
        </el-form-item>
        <el-form-item label="系统位置">
          <el-input v-model="form.systemLocation" placeholder="请输入系统位置" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.isActive">启用此配置</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ submitting ? '保存中...' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getConfigs, createConfig, updateConfig, deleteConfig, PncTransferConfig } from '../api/pncTransferConfig';

const configs = ref<PncTransferConfig[]>([]);
const departments = ref<{ id: number; name: string }[]>([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  configName: '',
  departmentId: '',
  departmentName: '',
  recipientEmail: '',
  ccEmail: '',
  contactPhone: '',
  recipientName: '',
  receivingAddress: '',
  systemLocation: '',
  isActive: true
});

// 加载部门列表
const loadDepartments = async () => {
  try {
    const res = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jabil-token')}` }
    });
    const data = await res.json();
    departments.value = data?.data?.departments || data?.data || data?.departments || [];
  } catch (error) {
    console.error('加载部门失败:', error);
  }
};

// 部门选择变化
const onDepartmentChange = () => {
  const dept = departments.value.find(d => d.id === parseInt(form.departmentId));
  form.departmentName = dept?.name || '';
};

// 加载配置列表
const loadConfigs = async () => {
  try {
    const res: any = await getConfigs();
    configs.value = res?.data || res || [];
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error({ message: '加载配置失败', showClose: true, duration: 3000 });
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
  form.departmentId = item.departmentId?.toString() || '';
  form.departmentName = item.departmentName || '';
  form.recipientEmail = item.recipientEmail || '';
  form.ccEmail = item.ccEmail || '';
  form.contactPhone = item.contactPhone || '';
  form.recipientName = item.recipientName || '';
  form.receivingAddress = item.receivingAddress || '';
  form.systemLocation = item.systemLocation || '';
  form.isActive = item.isActive !== false;
  dialogVisible.value = true;
};

// 关闭弹窗并刷新
const closeDialog = () => {
  dialogVisible.value = false;
  loadConfigs();
};

// 重置表单
const resetForm = () => {
  form.configName = '';
  form.departmentId = '';
  form.departmentName = '';
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
    ElMessage.warning({ message: '请输入配置名称', showClose: true, duration: 3000 });
    return;
  }

  submitting.value = true;
  try {
    const data = {
      configName: form.configName,
      departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
      departmentName: form.departmentName || undefined,
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
      ElMessage.success({ message: '配置更新成功', showClose: true, duration: 3000 });
    } else {
      await createConfig(data);
      ElMessage.success({ message: '配置添加成功', showClose: true, duration: 3000 });
    }

    dialogVisible.value = false;
    loadConfigs();
  } catch (error: any) {
    console.error('保存配置失败:', error);
    ElMessage.error({ message: (error as any).message || '保存配置失败', showClose: true, duration: 3000 });
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
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );

    if (item.id) {
      await deleteConfig(item.id);
      ElMessage.success({ message: '配置删除成功', showClose: true, duration: 3000 });
      loadConfigs();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除配置失败:', error);
      ElMessage.error({ message: (error as any).message || '删除配置失败', showClose: true, duration: 3000 });
    }
  }
};

// 页面加载时获取配置
onMounted(async () => {
  await loadDepartments();
  await loadConfigs();
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

.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.breadcrumb-item { color: #6B7280; }
.breadcrumb-item.active { color: #111827; font-weight: 500; }
.breadcrumb-separator { color: #D1D5DB; }

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

.table-card-title { font-size: 18px; font-weight: 600; color: #111827; }
.table-card-actions { display: flex; gap: 12px; }
.card-body { padding: 0; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #E5E7EB; }
.data-table th { background-color: #F9FAFB; font-weight: 600; color: #374151; font-size: 14px; }
.data-table tbody tr:hover { background-color: #F9FAFB; }
.text-center { text-align: center; }
.empty-tip { color: #9CA3AF; font-style: italic; }
.address-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-active { background-color: #D1FAE5; color: #065F46; }
.status-inactive { background-color: #FEE2E2; color: #991B1B; }

.btn-icon { padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; background: transparent; transition: all 0.2s; }
.btn-icon:hover { background-color: #E5E7EB; }
.btn-delete:hover { background-color: #FEE2E2; }

.btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background-color: #3b82f6; color: #FFFFFF; }
.btn-primary:hover { background-color: #2563eb; }
.btn-secondary { background-color: #FFFFFF; color: #374151; border: 1px solid #D1D5DB; }
.btn-secondary:hover { background-color: #F3F4F6; }

.config-form {
  padding-right: 8px;
}

:deep(.el-dialog__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}
</style>
