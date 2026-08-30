<template>
  <div class="k045-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">K045 规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ K045 规则配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="loadConfig">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="saveConfig">💾 保存配置</button>
        </div>
      </div>
      <div class="card-body">
        <form class="form">
          <!-- 邮件通知配置 -->
          <div class="form-section">
            <div class="form-section-title">📧 邮件通知配置</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="config.returnNotificationEnabled" />
                启用退回邮件通知
              </label>
              <span class="form-tip">（开启后，退回单据时将发送邮件通知）</span>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="config.autoNotifyOnReturn" />
                退回时自动发送邮件
              </label>
              <span class="form-tip">（开启后，退回单据时无需二次确认直接发送）</span>
            </div>
          </div>

          <!-- 配送地点配置 -->
          <div class="form-section">
            <div class="form-section-title">📍 配送地点与签收分料权限配置</div>
            <div class="form-tip" style="margin-bottom: 16px;">（每个配送地点可单独设置允许签收分料的部门及部门邮箱）</div>
            <div class="location-table-wrapper">
              <table class="location-table">
                <thead>
                  <tr>
                    <th style="width: 60px;">序号</th>
                    <th>配送地点</th>
                    <th>允许签收分料的部门</th>
                    <th>部门邮箱（收件人）</th>
                    <th style="width: 80px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in deliveryLocationConfigs" :key="item.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>
                      <input
                        type="text"
                        v-model="item.location"
                        placeholder="配送地点名称"
                        class="location-input"
                      />
                    </td>
                    <td>
                      <select
                        v-model="item.departments"
                        class="location-select"
                      >
                        <option value="">允许所有部门</option>
                        <option
                          v-for="dept in departments"
                          :key="dept"
                          :value="dept"
                        >
                          {{ dept }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        v-model="item.email"
                        placeholder="部门邮箱，多个用逗号分隔"
                        class="location-input"
                      />
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn-icon btn-delete" @click="removeDeliveryLocation(index)" title="删除">
                        🗑️
                      </button>
                    </td>
                  </tr>
                  <tr v-if="deliveryLocationConfigs.length === 0">
                    <td colspan="5" class="text-center empty-tip">暂无配置，请点击下方按钮添加配送地点</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-secondary btn-add" @click="addDeliveryLocation">
                ➕ 添加配送地点
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
import { ElMessage } from 'element-plus';
import { getK045Configs, updateK045Configs, K045_CONFIG_KEYS } from '../api/k045Config';
import { getDepartments } from '../api/org';

interface K045ConfigForm {
  returnNotificationEnabled: boolean;
  autoNotifyOnReturn: boolean;
}

interface DeliveryLocationConfig {
  id: number;
  location: string;
  departments: string;
  email: string;
}

const config = reactive<K045ConfigForm>({
  returnNotificationEnabled: true,
  autoNotifyOnReturn: true
});

// 配送地点与权限配置列表
const deliveryLocationConfigs = ref<DeliveryLocationConfig[]>([]);

// 部门列表（从部门管理获取）
const departments = ref<string[]>([]);

// 用于生成唯一 ID
let locationIdCounter = Date.now();

// 添加配送地点
const addDeliveryLocation = () => {
  // 使用展开运算符重新赋值数组，强制触发 Vue 响应式更新
  deliveryLocationConfigs.value = [
    ...deliveryLocationConfigs.value,
    { id: locationIdCounter++, location: '', departments: '', email: '' }
  ];
};

// 删除配送地点
const removeDeliveryLocation = (index: number) => {
  deliveryLocationConfigs.value.splice(index, 1);
};

// 原始配置备份
const originalConfig = reactive<{ config: K045ConfigForm; deliveryLocationConfigs: DeliveryLocationConfig[] }>({
  config: { ...config },
  deliveryLocationConfigs: []
});

const loadConfig = async () => {
  try {
    const configs: any[] = await getK045Configs();

    configs.forEach((item: any) => {
      switch (item.configKey) {
        case K045_CONFIG_KEYS.RETURN_NOTIFICATION_ENABLED:
          config.returnNotificationEnabled = item.configValue === 'true';
          break;
        case K045_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN:
          config.autoNotifyOnReturn = item.configValue === 'true';
          break;
        case K045_CONFIG_KEYS.DELIVERY_LOCATIONS:
          // 解析配送地点配置 JSON
          if (item.configValue) {
            try {
              const parsed = JSON.parse(item.configValue);
              deliveryLocationConfigs.value = parsed.map((item: any, idx: number) => ({
                id: item.id || Date.now() + idx,
                location: item.location || '',
                departments: item.departments || ''
              }));
            } catch {
              // 兼容旧格式（逗号分隔的字符串）
              deliveryLocationConfigs.value = item.configValue
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s)
                .map((location: string, idx: number) => ({ id: Date.now() + idx, location, departments: '' }));
            }
          } else {
            deliveryLocationConfigs.value = [];
          }
          break;
      }
    });

    // 备份原始配置
    originalConfig.config = { ...config };
    originalConfig.deliveryLocationConfigs = JSON.parse(JSON.stringify(deliveryLocationConfigs.value));
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error({ message: '加载配置失败', showClose: true, duration: 3000 });
  }
};

const saveConfig = async () => {
  try {
    const configs = [
      { configKey: K045_CONFIG_KEYS.RETURN_NOTIFICATION_ENABLED, configValue: config.returnNotificationEnabled.toString() },
      { configKey: K045_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN, configValue: config.autoNotifyOnReturn.toString() },
      { configKey: K045_CONFIG_KEYS.DELIVERY_LOCATIONS, configValue: JSON.stringify(deliveryLocationConfigs.value) }
    ];
    await updateK045Configs(configs);
    originalConfig.config = { ...config };
    originalConfig.deliveryLocationConfigs = JSON.parse(JSON.stringify(deliveryLocationConfigs.value));
    ElMessage.success({ message: '配置保存成功！', showClose: true, duration: 3000 });
  } catch (error) {
    console.error('保存配置失败:', error);
    ElMessage.error({ message: '保存配置失败', showClose: true, duration: 3000 });
  }
};

// 加载部门列表
const loadDepartments = async () => {
  try {
    const deptList = await getDepartments();
    departments.value = deptList.map((d: any) => d.name);
  } catch (error) {
    console.error('加载部门列表失败:', error);
  }
};

// 页面加载时获取配置
onMounted(() => {
  loadDepartments();
  loadConfig();
});
</script>

<style scoped>
.k045-config-container {
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

/* 配送地点表格样式 */
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

.location-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: #FFFFFF;
  cursor: pointer;
}

.location-select:focus {
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
