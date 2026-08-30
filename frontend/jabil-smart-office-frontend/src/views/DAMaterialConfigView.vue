<template>
  <div class="da-material-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">物料模块 规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ 物料模块 规则配置</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="loadAllConfig">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="saveAllConfig">💾 保存配置</button>
        </div>
      </div>
      <div class="card-body">
        <form class="form">
          <!-- 退回通知配置 -->
          <div class="form-section">
            <div class="form-section-title">📧 退回通知配置（通用）</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="config.autoNotifyOnReturn" />
                退回时自动通知提交人
              </label>
              <span class="form-tip">（开启后，退回单据时将发送邮件通知提交人）</span>
            </div>
          </div>

          <!-- K045 模块配置 -->
          <div class="form-section">
            <div class="form-section-title">📦 K045 模块配置</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="k045Config.returnNotificationEnabled" />
                启用退回邮件通知
              </label>
              <span class="form-tip">（开启后，退回单据时将发送邮件通知）</span>
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

          <!-- 管控物料模块配置 -->
          <div class="form-section">
            <div class="form-section-title">🔐 管控物料 模块配置</div>
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

          <!-- W/C 用户分配配置 -->
          <div class="form-section">
            <div class="form-section-title">🏭 W/C 用户分配配置</div>
            <div class="form-tip" style="margin-bottom: 16px;">（配置各 W/C 对应的负责用户，支持多选，用于自动分配）</div>
            <div class="location-table-wrapper">
              <table class="location-table">
                <thead>
                  <tr>
                    <th style="width: 60px;">序号</th>
                    <th>W/C 名称</th>
                    <th>负责用户</th>
                    <th style="width: 80px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in wcUserAssignments" :key="item.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>
                      <input
                        type="text"
                        v-model="item.wcName"
                        placeholder="W/C 名称"
                        class="location-input"
                      />
                    </td>
                    <td>
                      <el-select
                        v-model="item.userIds"
                        multiple
                        placeholder="请选择用户"
                        style="width: 100%;"
                        size="small"
                      >
                        <el-option
                          v-for="user in users"
                          :key="user.id"
                          :label="user.realName + (user.departmentName ? ' (' + user.departmentName + ')' : '')"
                          :value="user.id"
                        />
                      </el-select>
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn-icon btn-delete" @click="removeWCUserAssignment(index)" title="删除">
                        🗑️
                      </button>
                    </td>
                  </tr>
                  <tr v-if="wcUserAssignments.length === 0">
                    <td colspan="4" class="text-center empty-tip">暂无配置，请点击下方按钮添加 W/C 用户分配</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-secondary btn-add" @click="addWCUserAssignment">
                ➕ 添加 W/C 用户分配
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
import { getK045Configs, updateK045Configs, K045_CONFIG_KEYS } from '../api/k045Config';
import { getDepartments } from '../api/org';
import request from '../utils/request';

// ============ 通用配置 ============
interface ConfigForm {
  autoNotifyOnReturn: boolean;
}

const config = reactive<ConfigForm>({
  autoNotifyOnReturn: true
});

// ============ K045 配置 ============
interface K045ConfigForm {
  returnNotificationEnabled: boolean;
}

const k045Config = reactive<K045ConfigForm>({
  returnNotificationEnabled: true
});

// ============ 配送地点配置 ============
interface DeliveryLocationConfig {
  id: number;
  location: string;
  departments: string;
  email: string;
}

const deliveryLocationConfigs = ref<DeliveryLocationConfig[]>([]);
const departments = ref<string[]>([]);
let locationIdCounter = Date.now();

// ============ 管控类型配置 ============
interface ControlTypeItem {
  id: number;
  name: string;
}

const controlTypes = ref<ControlTypeItem[]>([]);

// ============ W/C 用户分配配置 ============
interface WCUserAssignmentItem {
  id: number;
  wcName: string;
  userIds: number[];
}

const wcUserAssignments = ref<WCUserAssignmentItem[]>([]);
const users = ref<any[]>([]);

let controlTypeIdCounter = Date.now();
let wcAssignmentIdCounter = Date.now() + 100000;

// ============ 配送地点操作 ============
const addDeliveryLocation = () => {
  deliveryLocationConfigs.value = [
    ...deliveryLocationConfigs.value,
    { id: locationIdCounter++, location: '', departments: '', email: '' }
  ];
};

const removeDeliveryLocation = (index: number) => {
  deliveryLocationConfigs.value.splice(index, 1);
};

// ============ 管控类型操作 ============
const addControlType = () => {
  controlTypes.value = [
    ...controlTypes.value,
    { id: controlTypeIdCounter++, name: '' }
  ];
};

const removeControlType = (index: number) => {
  controlTypes.value.splice(index, 1);
};

// ============ W/C 用户分配操作 ============
const addWCUserAssignment = () => {
  wcUserAssignments.value = [
    ...wcUserAssignments.value,
    { id: wcAssignmentIdCounter++, wcName: '', userIds: [] }
  ];
};

const removeWCUserAssignment = (index: number) => {
  wcUserAssignments.value.splice(index, 1);
};

// ============ 数据加载 ============
// 加载用户列表
const loadUsers = async () => {
  try {
    const res: any = await request.get('/users');
    const data = res?.data || res || {};
    users.value = data?.items || data?.users || [];
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
};

// 加载部门列表
const loadDepartments = async () => {
  try {
    const res: any = await getDepartments();
    const data = res?.data || res || {};
    const deptList = Array.isArray(data) ? data : (data?.departments || []);
    departments.value = deptList.map((d: any) => d.name);
  } catch (error) {
    console.error('加载部门列表失败:', error);
  }
};

// 加载 DA Material 配置
const loadDAMaterialConfig = async () => {
  try {
    const res: any = await getDAMaterialConfigs();
    const configs: any[] = res?.data || res || [];

    configs.forEach((item: any) => {
      switch (item.configKey) {
        case DAMATERIAL_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN:
          config.autoNotifyOnReturn = item.configValue === 'true';
          break;
        case DAMATERIAL_CONFIG_KEYS.CONTROL_TYPES:
          if (item.configValue) {
            const names: string[] = item.configValue
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s);
            controlTypes.value = names.map((name: string, idx: number) => ({
              id: Date.now() + idx,
              name
            }));
          } else {
            controlTypes.value = [];
          }
          break;
        case DAMATERIAL_CONFIG_KEYS.WC_DEPARTMENT_ASSIGNMENT:
          if (item.configValue) {
            try {
              const assignments = JSON.parse(item.configValue);
              wcUserAssignments.value = assignments.map((item: any, idx: number) => ({
                id: Date.now() + idx + 200000,
                wcName: item.wcName || '',
                userIds: Array.isArray(item.userIds) ? item.userIds : (item.userId ? [item.userId] : [])
              }));
            } catch (e) {
              console.error('解析 W/C 用户分配配置失败:', e);
              wcUserAssignments.value = [];
            }
          } else {
            wcUserAssignments.value = [];
          }
          break;
      }
    });
  } catch (error) {
    console.error('加载管控物料配置失败:', error);
  }
};

// 加载 K045 配置
const loadK045Config = async () => {
  try {
    const res: any = await getK045Configs();
    const configs: any[] = res?.data || res || [];

    configs.forEach((item: any) => {
      switch (item.configKey) {
        case K045_CONFIG_KEYS.RETURN_NOTIFICATION_ENABLED:
          k045Config.returnNotificationEnabled = item.configValue === 'true';
          break;
        case K045_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN:
          config.autoNotifyOnReturn = item.configValue === 'true';
          break;
        case K045_CONFIG_KEYS.DELIVERY_LOCATIONS:
          if (item.configValue) {
            try {
              const parsed = JSON.parse(item.configValue);
              deliveryLocationConfigs.value = parsed.map((item: any, idx: number) => ({
                id: item.id || Date.now() + idx,
                location: item.location || '',
                departments: item.departments || '',
                email: item.email || ''
              }));
            } catch {
              deliveryLocationConfigs.value = item.configValue
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s)
                .map((location: string, idx: number) => ({ id: Date.now() + idx, location, departments: '', email: '' }));
            }
          } else {
            deliveryLocationConfigs.value = [];
          }
          break;
      }
    });
  } catch (error) {
    console.error('加载K045配置失败:', error);
  }
};

// 加载所有配置
const loadAllConfig = async () => {
  await Promise.all([loadDAMaterialConfig(), loadK045Config()]);
};

// ============ 数据保存 ============
const saveAllConfig = async () => {
  try {
    // 验证管控类型
    const names = controlTypes.value.map(c => c.name.trim()).filter(c => c);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      ElMessage.warning({ message: '管控类型名称不能重复', showClose: true, duration: 3000 });
      return;
    }
    if (controlTypes.value.some(c => !c.name.trim())) {
      ElMessage.warning({ message: '管控类型名称不能为空', showClose: true, duration: 3000 });
      return;
    }

    // 验证 W/C 名称
    const wcNames = wcUserAssignments.value
      .filter(w => w.wcName.trim())
      .map(w => w.wcName.trim());
    const uniqueWCNames = new Set(wcNames);
    if (wcNames.length !== uniqueWCNames.size) {
      ElMessage.warning({ message: 'W/C 名称不能重复', showClose: true, duration: 3000 });
      return;
    }

    await ElMessageBox.confirm(
      '确认保存所有配置吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 并行保存所有配置
    await Promise.all([
      saveDAMaterialConfig(),
      saveK045Config()
    ]);

    ElMessage.success({ message: '配置保存成功！', showClose: true, duration: 3000 });
  } catch (error) {
    if (error !== 'cancel') {
      console.error('保存配置失败:', error);
      ElMessage.error({ message: '保存配置失败', showClose: true, duration: 3000 });
    }
  }
};

// 保存 DA Material 配置
const saveDAMaterialConfig = async () => {
  const wcAssignments = wcUserAssignments.value
    .filter(w => w.wcName.trim() && w.userIds.length > 0)
    .map(w => ({
      wcName: w.wcName.trim(),
      userIds: w.userIds
    }));

  const configs = [
    { configKey: DAMATERIAL_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN, configValue: config.autoNotifyOnReturn.toString() },
    { configKey: DAMATERIAL_CONFIG_KEYS.CONTROL_TYPES, configValue: controlTypes.value.map(c => c.name.trim()).join(',') },
    { configKey: DAMATERIAL_CONFIG_KEYS.WC_DEPARTMENT_ASSIGNMENT, configValue: JSON.stringify(wcAssignments) }
  ];

  await updateDAMaterialConfigs(configs);
};

// 保存 K045 配置
const saveK045Config = async () => {
  const configs = [
    { configKey: K045_CONFIG_KEYS.RETURN_NOTIFICATION_ENABLED, configValue: k045Config.returnNotificationEnabled.toString() },
    { configKey: K045_CONFIG_KEYS.AUTO_NOTIFY_ON_RETURN, configValue: config.autoNotifyOnReturn.toString() },
    { configKey: K045_CONFIG_KEYS.DELIVERY_LOCATIONS, configValue: JSON.stringify(deliveryLocationConfigs.value) }
  ];

  await updateK045Configs(configs);
};

// ============ 生命周期 ============
onMounted(async () => {
  await Promise.all([loadUsers(), loadDepartments(), loadAllConfig()]);
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
