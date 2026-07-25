<template>
  <div class="k2-diff-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">K**差异登记 规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ K**差异登记 规则配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="loadConfig">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="saveConfig">💾 保存配置</button>
        </div>
      </div>
      <div class="card-body">
        <form class="form">
          <!-- 差异类型与退料地点配置 -->
          <div class="form-section">
            <div class="form-section-title">📋 差异类型与退料地点配置</div>
            <div class="form-tip" style="margin-bottom: 16px;">（添加差异类型与退料地点的对应关系，登记时可快速选择）</div>
            <div class="config-table-wrapper">
              <table class="config-table">
                <thead>
                  <tr>
                    <th style="width: 60px;">序号</th>
                    <th>差异类型名称</th>
                    <th>对应退料地点</th>
                    <th style="width: 80px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in configList" :key="item.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>
                      <input
                        type="text"
                        v-model="configList[index].differenceType"
                        placeholder="请输入差异类型名称"
                        class="config-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        v-model="configList[index].returnLocation"
                        placeholder="请输入对应退料地点"
                        class="config-input"
                      />
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn-icon btn-delete" @click="removeConfig(index)" title="删除">
                        🗑️
                      </button>
                    </td>
                  </tr>
                  <tr v-if="configList.length === 0">
                    <td colspan="4" class="text-center empty-tip">暂无配置，请点击下方按钮添加配置</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-secondary btn-add" @click="addConfig">
                ➕ 添加配置
              </button>
            </div>
          </div>

          <!-- 邮件通知配置 -->
          <div class="form-section">
            <div class="form-section-title">📧 邮件通知配置</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="emailConfig.enabled" />
                启用邮件通知
              </label>
              <span class="form-tip">（开启后，登记时可发送邮件通知）</span>
            </div>
            <div class="form-group">
              <label>收件人邮箱</label>
              <input
                type="text"
                v-model="emailConfig.recipients"
                placeholder="多个邮箱用逗号分隔"
                class="config-input-full"
              />
              <span class="form-tip">多个收件人请用英文逗号分隔</span>
            </div>
            <div class="form-group">
              <label>抄送邮箱</label>
              <input
                type="text"
                v-model="emailConfig.cc"
                placeholder="多个邮箱用逗号分隔（可选）"
                class="config-input-full"
              />
              <span class="form-tip">多个抄送人请用英文逗号分隔</span>
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
import {
  getK2DiffConfigs,
  updateK2DiffConfigs,
  K2_DIFF_CONFIG_KEYS,
  type EmailConfig
} from '../api/k2Diff';

// 配置项：差异类型与退料地点一对一关联
interface ConfigItem {
  id: number;
  differenceType: string;
  returnLocation: string;
}

const configList = ref<ConfigItem[]>([]);

const emailConfig = reactive<EmailConfig>({
  enabled: false,
  recipients: '',
  cc: ''
});

// 用于生成唯一 ID
let configIdCounter = Date.now();

// 添加配置
const addConfig = () => {
  configList.value = [
    ...configList.value,
    { id: configIdCounter++, differenceType: '', returnLocation: '' }
  ];
};

// 删除配置
const removeConfig = (index: number) => {
  configList.value.splice(index, 1);
};

// 原始配置备份
const originalConfig = reactive<{
  configList: ConfigItem[];
  emailConfig: EmailConfig;
}>({
  configList: [],
  emailConfig: { enabled: false, recipients: '', cc: '' }
});

const loadConfig = async () => {
  try {
    const response: any = await getK2DiffConfigs();
    // API 返回格式: { code, message, data: [...] }
    const configs = response.data || response || [];

    configs.forEach((item: any) => {
      switch (item.configKey) {
        case K2_DIFF_CONFIG_KEYS.DIFFERENCE_TYPES:
          if (item.configValue) {
            try {
              const parsed = JSON.parse(item.configValue);
              configList.value = parsed.map((item: any, idx: number) => ({
                id: item.id || configIdCounter + idx,
                differenceType: item.differenceType || item.name || '',
                returnLocation: item.returnLocation || ''
              }));
            } catch {
              configList.value = [];
            }
          } else {
            configList.value = [];
          }
          break;
        case K2_DIFF_CONFIG_KEYS.EMAIL_NOTIFICATION_ENABLED:
          emailConfig.enabled = item.configValue === 'true';
          break;
        case K2_DIFF_CONFIG_KEYS.EMAIL_RECIPIENTS:
          emailConfig.recipients = item.configValue || '';
          break;
        case K2_DIFF_CONFIG_KEYS.EMAIL_CC:
          emailConfig.cc = item.configValue || '';
          break;
      }
    });

    // 备份原始配置
    originalConfig.configList = JSON.parse(JSON.stringify(configList.value));
    originalConfig.emailConfig = { ...emailConfig };
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error('加载配置失败');
  }
};

const saveConfig = async () => {
  try {
    // 过滤空项
    const validConfigList = configList.value.filter(item =>
      item.differenceType.trim() || item.returnLocation.trim()
    );

    const configs = [
      {
        configKey: K2_DIFF_CONFIG_KEYS.DIFFERENCE_TYPES,
        configValue: JSON.stringify(validConfigList.map((item, idx) => ({
          id: idx + 1,
          differenceType: item.differenceType.trim(),
          returnLocation: item.returnLocation.trim()
        })))
      },
      {
        configKey: K2_DIFF_CONFIG_KEYS.EMAIL_NOTIFICATION_ENABLED,
        configValue: emailConfig.enabled.toString()
      },
      {
        configKey: K2_DIFF_CONFIG_KEYS.EMAIL_RECIPIENTS,
        configValue: emailConfig.recipients.trim()
      },
      {
        configKey: K2_DIFF_CONFIG_KEYS.EMAIL_CC,
        configValue: emailConfig.cc.trim()
      }
    ];

    await updateK2DiffConfigs(configs);

    // 更新备份
    originalConfig.configList = JSON.parse(JSON.stringify(configList.value));
    originalConfig.emailConfig = { ...emailConfig };

    ElMessage.success('配置保存成功！');
  } catch (error) {
    console.error('保存配置失败:', error);
    ElMessage.error('保存配置失败');
  }
};

// 页面加载时获取配置
onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.k2-diff-config-container {
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

.config-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.config-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.config-input-full {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.config-input-full:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

/* 配置表格样式 */
.config-table-wrapper {
  margin-top: 12px;
}

.config-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.config-table th,
.config-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.config-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.config-table tbody tr:hover {
  background-color: #F9FAFB;
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

/* 子配置区块 */
.config-sub-section {
  margin-bottom: 0;
}

.config-sub-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #0066CC;
}

.config-divider {
  height: 1px;
  background: linear-gradient(to right, #E5E7EB, transparent);
  margin: 24px 0;
}
</style>
