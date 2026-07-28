<template>
  <div class="da-material-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">管控物料 规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ 管控物料 规则配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="loadConfig">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="saveConfig">💾 保存配置</button>
        </div>
      </div>
      <div class="card-body">
        <form class="form">
          <!-- 退回通知配置 -->
          <div class="form-section">
            <div class="form-section-title">📧 退回通知配置</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="config.autoNotifyOnReturn" />
                退回时自动通知提交人
              </label>
              <span class="form-tip">（开启后，退回单据时将发送邮件通知提交人）</span>
            </div>
          </div>

          <!-- 管控类型配置 -->
          <div class="form-section">
            <div class="form-section-title">📋 管控类型配置</div>
            <div class="form-tip" style="margin-bottom: 16px;">（管控类型用于在提交单据时选择）</div>
            <div class="location-table-wrapper">
              <table class="location-table">
                <thead>
                  <tr>
                    <th style="width: 60px;">序号</th>
                    <th>管控类型名称</th>
                    <th style="width: 80px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in controlTypes" :key="item.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>
                      <input
                        type="text"
                        v-model="item.name"
                        placeholder="管控类型名称"
                        class="location-input"
                      />
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn-icon btn-delete" @click="removeControlType(index)" title="删除">
                        🗑️
                      </button>
                    </td>
                  </tr>
                  <tr v-if="controlTypes.length === 0">
                    <td colspan="3" class="text-center empty-tip">暂无配置，请点击下方按钮添加管控类型</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-secondary btn-add" @click="addControlType">
                ➕ 添加管控类型
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getDAMaterialConfigs, updateDAMaterialConfigs, DAMATERIAL_CONFIG_KEYS } from '../api/daMaterialConfig';

interface ControlTypeItem {
  id: number;
  name: string;
}

interface ConfigForm {
  autoNotifyOnReturn: boolean;
}

const config = reactive<ConfigForm>({
  autoNotifyOnReturn: true
});

// 管控类型列表
const controlTypes = ref<ControlTypeItem[]>([]);

// 用于生成唯一 Id
let controlTypeIdCounter = Date.now();

// 添加管控类型
const addControlType = () => {
  controlTypes.value = [
    ...controlTypes.value,
    { id: controlTypeIdCounter++, name: '' }
  ];
};

// 删除管控类型
const removeControlType = (index: number) => {
  controlTypes.value.splice(index, 1);
};

// 原始配置备份
const originalConfig = reactive<{ config: ConfigForm; controlTypes: ControlTypeItem[] }>({
  config: { ...config },
  controlTypes: []
});

const loadConfig = async () => {
  try {
    const configs = await getDAMaterialConfigs();

    configs.forEach((item) => {
      switch (item.configKey) {
        case DAMATERIAL_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN:
          config.autoNotifyOnReturn = item.configValue === 'true';
          break;
        case DAMATERIAL_CONFIG_KEYS.CONTROL_TYPES:
          // 解析管控类型配置
          if (item.configValue) {
            const names = item.configValue
              .split(',')
              .map(s => s.trim())
              .filter(s => s);
            controlTypes.value = names.map((name, idx) => ({
              id: Date.now() + idx,
              name
            }));
          } else {
            controlTypes.value = [];
          }
          break;
      }
    });

    // 备份原始配置
    originalConfig.config = { ...config };
    originalConfig.controlTypes = JSON.parse(JSON.stringify(controlTypes.value));
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error('加载配置失败');
  }
};

const saveConfig = async () => {
  try {
    // 检查是否有重复的管控类型名称
    const names = controlTypes.value.map(c => c.name.trim()).filter(c => c);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      ElMessage.warning('管控类型名称不能重复');
      return;
    }

    // 检查是否有空名称
    if (controlTypes.value.some(c => !c.name.trim())) {
      ElMessage.warning('管控类型名称不能为空');
      return;
    }

    await ElMessageBox.confirm(
      '确认保存管控物料规则配置吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const configs = [
      { configKey: DAMATERIAL_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN, configValue: config.autoNotifyOnReturn.toString() },
      { configKey: DAMATERIAL_CONFIG_KEYS.CONTROL_TYPES, configValue: controlTypes.value.map(c => c.name.trim()).join(',') }
    ];

    await updateDAMaterialConfigs(configs);
    originalConfig.config = { ...config };
    originalConfig.controlTypes = JSON.parse(JSON.stringify(controlTypes.value));
    ElMessage.success('配置保存成功！');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('保存配置失败:', error);
      ElMessage.error('保存配置失败');
    }
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.da-material-config-container {
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
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #E5E7EB;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #6B7280;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
}

/* 表格样式 */
.location-table-wrapper {
  margin-top: 12px;
}

.location-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.location-table th,
.location-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.location-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.location-table tbody tr:hover {
  background-color: #F9FAFB;
}

.location-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.location-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.text-center {
  text-align: center;
}

.empty-tip {
  color: #9CA3AF;
  font-style: italic;
}

.btn-icon {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: #F3F4F6;
}

.btn-delete:hover {
  background-color: #FEE2E2;
}

.btn-add {
  margin-bottom: 8px;
}
</style>
