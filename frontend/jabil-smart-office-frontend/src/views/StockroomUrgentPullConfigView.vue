<template>
  <div class="stockroom-config-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Stockroom Urgent Pull 配置</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-refresh" @click="loadConfigs" :disabled="isLoading">
          <span :class="{ 'spin': isLoading }">🔄</span>
          {{ isLoading ? '加载中...' : '刷新' }}
        </button>
        <button type="button" class="btn btn-primary" @click="handleSaveAll" :disabled="isSaving">
          💾 {{ isSaving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs-card">
      <div class="tabs-header">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      
      <!-- 库位映射 -->
      <div v-show="activeTab === 'location_mapping'" class="tab-content">
        <div class="table-card">
          <div class="table-card-header">
            <div class="table-card-title">📦 库位映射配置</div>
            <div class="table-card-actions">
              <button type="button" class="btn btn-secondary" @click="addLocationItem">➕ 添加库位</button>
            </div>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">序号</th>
                  <th style="width: 180px;">库位名称</th>
                  <th>Pull List No 关键词</th>
                  <th style="width: 80px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in locationMappings" :key="item.id || 'new-loc-' + index">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>
                    <input
                      type="text"
                      class="table-input"
                      v-model="item.configKey"
                      placeholder="如: T07&T08"
                      :disabled="!item._editing"
                    >
                  </td>
                  <td>
                    <div class="tags-area">
                      <span v-for="(kw, ki) in getKeywords(item)" :key="ki" class="tag">
                        {{ kw }}
                        <em v-if="item._editing" @click="delKeyword(item, ki)">×</em>
                      </span>
                      <input
                        v-if="item._editing"
                        type="text"
                        class="tag-input"
                        v-model="item._input"
                        @keydown.enter.prevent="addKeyword(item)"
                        placeholder="输入关键词后回车"
                      >
                    </div>
                  </td>
                  <td class="text-center">
                    <template v-if="item._editing">
                      <button type="button" class="btn-icon btn-save" @click="saveLocationRow(index)" title="保存">✓</button>
                      <button type="button" class="btn-icon btn-delete" @click="cancelLocationEdit(index)" title="取消">↶</button>
                    </template>
                    <template v-else>
                      <button type="button" class="btn-icon" @click="editLocationRow(index)" title="编辑">✏️</button>
                      <button type="button" class="btn-icon btn-delete" @click="removeLocationItem(index)" title="删除">🗑️</button>
                    </template>
                  </td>
                </tr>
                <tr v-if="locationMappings.length === 0">
                  <td colspan="4" class="text-center empty-tip">暂无库位映射配置</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- WC名称映射 -->
      <div v-show="activeTab === 'wc_mapping'" class="tab-content">
        <div class="table-card">
          <div class="table-card-header">
            <div class="table-card-title">
              🏭 WC名称映射配置
              <span class="title-meta">共 {{ wcMappings.length }} 条</span>
            </div>
            <div class="table-card-actions">
              <button
                type="button"
                class="btn btn-danger"
                v-if="wcSelectedIds.length > 0"
                @click="batchDeleteWc"
              >
                🗑️ 删除选中 ({{ wcSelectedIds.length }})
              </button>
              <button type="button" class="btn btn-secondary" @click="addWcItem">➕ 添加</button>
            </div>
          </div>
          <div class="card-body">
            <!-- 工具栏 -->
            <div class="toolbar">
              <div class="search-wrap">
                <span class="search-icon">🔍</span>
                <input
                  type="text"
                  class="search-input"
                  v-model="wcSearchKeyword"
                  placeholder="搜索客户名或WC名称..."
                >
                <button v-if="wcSearchKeyword" type="button" class="search-clear" @click="wcSearchKeyword = ''">×</button>
              </div>
              <div class="toolbar-info">
                {{ wcSearchKeyword ? `匹配 ${filteredWcMappings.length} / ${wcMappings.length}` : '' }}
              </div>
              <div class="toolbar-actions">
                <button type="button" class="btn btn-secondary" @click="showWcImportDialog = true">📥 批量导入</button>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th class="col-checkbox">
                    <input
                      type="checkbox"
                      :checked="isAllWcSelected"
                      :indeterminate.prop="isWcIndeterminate"
                      @change="toggleAllWc"
                    >
                  </th>
                  <th class="col-index">序号</th>
                  <th class="col-name">客户名</th>
                  <th class="col-name">WC名称</th>
                  <th class="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in filteredWcMappings" :key="item.id || 'new-wc-' + index">
                  <td class="col-checkbox text-center">
                    <input
                      type="checkbox"
                      :checked="wcSelectedIds.includes(item.id)"
                      :disabled="!item.id"
                      @change="toggleWcSelect(item)"
                    >
                  </td>
                  <td class="col-index text-center">{{ index + 1 }}</td>
                  <td class="col-name">
                    <input
                      type="text"
                      class="table-input"
                      v-model="item.configKey"
                      placeholder="请输入客户名"
                      :disabled="!item._editing"
                    >
                  </td>
                  <td class="col-name">
                    <input
                      type="text"
                      class="table-input"
                      v-model="item.configValue"
                      placeholder="请输入WC名称"
                      :disabled="!item._editing"
                    >
                  </td>
                  <td class="col-actions text-center">
                    <template v-if="item._editing">
                      <button type="button" class="btn-icon btn-save" @click="saveWcRow(index)" title="保存">✓</button>
                      <button type="button" class="btn-icon btn-cancel" @click="cancelWcEdit(index)" title="取消">↶</button>
                    </template>
                    <template v-else>
                      <button type="button" class="btn-icon" @click="editWcRow(index)" title="编辑">✏️</button>
                      <button type="button" class="btn-icon btn-delete" @click="removeWcItem(index)" title="删除">🗑️</button>
                    </template>
                  </td>
                </tr>
                <tr v-if="filteredWcMappings.length === 0">
                  <td colspan="5" class="text-center empty-tip">
                    {{ wcSearchKeyword ? '未找到匹配的配置' : '暂无WC名称映射配置' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Pull List类型映射 -->
      <div v-show="activeTab === 'pulllist_type'" class="tab-content">
        <div class="table-card">
          <div class="table-card-header">
            <div class="table-card-title">📋 Pull List类型映射</div>
            <div class="table-card-actions">
              <button type="button" class="btn btn-secondary" @click="addPulllistItem">➕ 添加仓位配置</button>
            </div>
          </div>
          <div class="card-body">
            <div class="pulllist-tip">
              <strong>说明：</strong>每个仓位需要单独配置。T01需要BuildPlan包含SMT-REP；T11/T16/T13/T14/T07&T08只需要匹配借料关键词即可。
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">序号</th>
                  <th style="width: 120px;">仓位名称</th>
                  <th>Pull List No 关键词</th>
                  <th style="width: 120px;">单据类型</th>
                  <th style="width: 70px;">启用</th>
                  <th style="width: 80px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in pulllistTypes" :key="item.id || 'new-pl-' + index">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>
                    <input
                      type="text"
                      class="table-input"
                      v-model="item.configKey"
                      placeholder="如: T11"
                      :disabled="!item._editing"
                    >
                  </td>
                  <td>
                    <input
                      type="text"
                      class="table-input"
                      v-model="item.configValue"
                      placeholder="关键词，多个用逗号分隔，如: T110,1100T110"
                      :disabled="!item._editing"
                    >
                  </td>
                  <td>
                    <select v-if="item._editing" class="table-input" v-model="item.docType">
                      <option value="借料">借料</option>
                      <option value="TOBAY">TOBAY</option>
                    </select>
                    <span v-else>{{ item.docType || '借料' }}</span>
                  </td>
                  <td class="text-center">
                    <input
                      type="checkbox"
                      :checked="item.isActive !== false"
                      :disabled="!item._editing"
                      @change="item.isActive = !item.isActive"
                    >
                  </td>
                  <td class="text-center">
                    <template v-if="item._editing">
                      <button type="button" class="btn-icon btn-save" @click="saveTypeRow(index)" title="保存">✓</button>
                      <button type="button" class="btn-icon btn-delete" @click="cancelTypeEdit(index)" title="取消">↶</button>
                    </template>
                    <template v-else>
                      <button type="button" class="btn-icon" @click="editTypeRow(index)" title="编辑">✏️</button>
                      <button type="button" class="btn-icon btn-delete" @click="removePulllistItem(index)" title="删除">🗑️</button>
                    </template>
                  </td>
                </tr>
                <tr v-if="pulllistTypes.length === 0">
                  <td colspan="6" class="text-center empty-tip">暂无Pull List类型映射配置</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- WC批量导入对话框 -->
    <div v-if="showWcImportDialog" class="dialog-overlay" @click.self="closeImportDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <div class="dialog-title">📥 批量导入WC名称映射</div>
          <button type="button" class="dialog-close" @click="closeImportDialog">✕</button>
        </div>
        <div class="dialog-body">
          <div class="import-tip">
            <p><strong>📝 导入说明：</strong></p>
            <p>1. 点击下载模板按钮获取Excel模板</p>
            <p>2. 按模板格式填写客户名和WC名称</p>
            <p>3. 上传Excel文件后预览数据，确认无误后点击导入</p>
          </div>

          <!-- 文件上传区 -->
          <div v-if="!importedRows.length" class="upload-area" @click="triggerFileUpload" @dragover.prevent @drop.prevent="handleFileDrop">
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls,.xlsm"
              @change="handleFileSelect"
              style="display: none"
            />
            <div class="upload-placeholder">
              <div class="upload-icon">📁</div>
              <p class="upload-text">点击或拖拽Excel文件到此处</p>
              <p class="upload-hint">支持 .xlsx, .xls, .xlsm 格式</p>
            </div>
            <div class="upload-actions" @click.stop>
              <button type="button" class="btn btn-secondary" @click.stop="downloadTemplate">📥 下载模板</button>
            </div>
          </div>

          <!-- 已上传，显示文件信息和预览 -->
          <div v-else>
            <div class="uploaded-file-info">
              <span class="file-icon">📄</span>
              <span class="file-name">{{ uploadedFileName }}</span>
              <button type="button" class="btn btn-secondary btn-small" @click="resetImport">🔄 重新上传</button>
            </div>

            <div v-if="importError" class="error-tip">⚠️ {{ importError }}</div>

            <div class="preview-section">
              <div class="preview-title">
                <span>📋 数据预览</span>
                <span class="preview-count">共 {{ importedRows.length }} 条有效数据</span>
              </div>
              <div class="preview-table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th style="width: 50px;">序号</th>
                      <th>客户名</th>
                      <th>WC名称</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in importedRows" :key="i">
                      <td class="text-center">{{ i + 1 }}</td>
                      <td>{{ row.customer }}</td>
                      <td>{{ row.wc }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeImportDialog">取消</button>
          <button type="button" class="btn btn-primary" @click="handleWcImport" :disabled="importedRows.length === 0">
            ✓ 确认导入 ({{ importedRows.length }}条)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';
import { clearRequestCache } from '../utils/request';
import {
  getStockroomUrgentPullConfigs,
  saveStockroomUrgentPullConfigs,
  deleteStockroomUrgentPullConfig,
  type ConfigItem
} from '../api/stockroomUrgentPullConfig';

// 扩展 ConfigItem 类型以支持运行时属性
type ExtendedConfigItem = ConfigItem & {
  _input?: string;
  _keywords?: string[];
  _editing?: boolean;
  _originalKey?: string;
  _originalValue?: string;
  _originalDocType?: string;
  _originalActive?: boolean;
  docType?: string;
};

const isLoading = ref(false);
const isSaving = ref(false);
const showWcImportDialog = ref(false);

// 导入相关状态
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadedFileName = ref('');
const importedRows = ref<Array<{customer: string, wc: string}>>([]);
const importError = ref('');

// WC映射搜索和多选
const wcSearchKeyword = ref('');
const wcSelectedIds = ref<any[]>([]);

// 当前激活的页签（从 localStorage 恢复）
const STORAGE_KEY = 'stockroom-config-active-tab';
const activeTab = ref(localStorage.getItem(STORAGE_KEY) || 'location_mapping');

// 切换页签并保存状态
const switchTab = (key: string) => {
  activeTab.value = key;
  localStorage.setItem(STORAGE_KEY, key);
};

const tabs = [
  { key: 'location_mapping', label: '库位映射', icon: '📦' },
  { key: 'wc_mapping', label: 'WC名称映射', icon: '🏭' },
  { key: 'pulllist_type', label: 'Pull List类型', icon: '📋' }
];

const locationMappings = ref<any[]>([]);
const wcMappings = ref<ExtendedConfigItem[]>([]);
const pulllistTypes = ref<ExtendedConfigItem[]>([]);

// 加载配置
const loadConfigs = async () => {
  isLoading.value = true;
  // 清除缓存确保获取最新数据
  clearRequestCache();
  try {
    const res = await getStockroomUrgentPullConfigs();
    locationMappings.value = (res.location_mapping || []).map((x: any) => ({
      ...x,
      _input: '',
      _keywords: (x.configValue || '').split(',').filter((k: string) => k.trim())
    }));
    wcMappings.value = res.wc_mapping || [];
    pulllistTypes.value = (res.pulllist_type || []).map((x: any) => ({
      id: x.id,
      configKey: x.configKey,
      configValue: x.configValue,
      docType: x.docType || '借料',
      isActive: x.isActive !== false
    }));
  } catch (error: any) {
    ElMessage.error(error.message || '加载配置失败');
  } finally {
    isLoading.value = false;
  }
};

// 获取关键词列表
const getKeywords = (item: any): string[] => {
  if (item._keywords) return item._keywords;
  const kws = (item.configValue || '').split(',').map((k: string) => k.trim()).filter(Boolean);
  item._keywords = kws;
  return kws;
};

// 添加关键词
const addKeyword = (item: any) => {
  const kw = (item._input || '').trim();
  if (!kw) return;
  const kws = getKeywords(item);
  if (kws.includes(kw)) {
    ElMessage.warning('该关键词已存在');
    return;
  }
  kws.push(kw);
  item._keywords = kws;
  item.configValue = kws.join(',');
  item._input = '';
};

// 删除关键词
const delKeyword = (item: any, index: number) => {
  const kws = getKeywords(item);
  kws.splice(index, 1);
  item._keywords = kws;
  item.configValue = kws.join(',');
};

// 库位映射
const addLocationItem = () => {
  locationMappings.value.push({
    configKey: '',
    configValue: '',
    _input: '',
    _keywords: [],
    _editing: true
  });
};

const removeLocationItem = async (index: number) => {
  const item = locationMappings.value[index];
  if (item.id) {
    try {
      await deleteStockroomUrgentPullConfig(item.id);
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败');
      return;
    }
  }
  locationMappings.value.splice(index, 1);
};

const editLocationRow = (index: number) => {
  const item = locationMappings.value[index];
  item._originalKey = item.configKey;
  item._originalValue = item.configValue;
  item._originalKeywords = [...(item._keywords || [])];
  item._editing = true;
};

const cancelLocationEdit = (index: number) => {
  const item = locationMappings.value[index];
  if (item._originalKey !== undefined) {
    item.configKey = item._originalKey;
    item.configValue = item._originalValue;
    item._keywords = [...item._originalKeywords];
  }
  item._editing = false;
  delete item._originalKey;
  delete item._originalValue;
  delete item._originalKeywords;
  item._input = '';
};

const saveLocationRow = async (index: number) => {
  const item = locationMappings.value[index];
  if (!item.configKey || !item.configValue) {
    ElMessage.warning('请填写库位名称和关键词');
    return;
  }
  try {
    await saveStockroomUrgentPullConfigs([{
      config_type: 'location_mapping',
      config_key: item.configKey,
      config_value: item.configValue,
      sort_order: index + 1,
      is_active: true
    }]);
    ElMessage.success('保存成功');
    item._editing = false;
    delete item._originalKey;
    delete item._originalValue;
    delete item._originalKeywords;
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
};

// WC映射
const addWcItem = () => {
  wcMappings.value.push({ configKey: '', configValue: '', _editing: true });
};

// 过滤后的WC映射列表
const filteredWcMappings = computed(() => {
  if (!wcSearchKeyword.value.trim()) return wcMappings.value;
  const kw = wcSearchKeyword.value.toLowerCase().trim();
  return wcMappings.value.filter(item =>
    (item.configKey || '').toLowerCase().includes(kw) ||
    (item.configValue || '').toLowerCase().includes(kw)
  );
});

// 多选相关
const getWcRowId = (item: any) => item.id || `new-wc-${wcMappings.value.indexOf(item)}`;

const isAllWcSelected = computed(() => {
  const selectable = filteredWcMappings.value.filter(it => it.id);
  if (selectable.length === 0) return false;
  return selectable.every(it => wcSelectedIds.value.includes(it.id));
});

const isWcIndeterminate = computed(() => {
  const selectable = filteredWcMappings.value.filter(it => it.id);
  const selected = selectable.filter(it => wcSelectedIds.value.includes(it.id));
  return selected.length > 0 && selected.length < selectable.length;
});

const toggleWcSelect = (item: any) => {
  if (!item.id) return;
  const id = item.id;
  const idx = wcSelectedIds.value.indexOf(id);
  if (idx > -1) {
    wcSelectedIds.value.splice(idx, 1);
  } else {
    wcSelectedIds.value.push(id);
  }
};

const toggleAllWc = () => {
  const selectable = filteredWcMappings.value.filter(it => it.id);
  if (isAllWcSelected.value) {
    // 取消全选
    selectable.forEach(it => {
      const idx = wcSelectedIds.value.indexOf(it.id);
      if (idx > -1) wcSelectedIds.value.splice(idx, 1);
    });
  } else {
    // 全选
    selectable.forEach(it => {
      if (!wcSelectedIds.value.includes(it.id)) {
        wcSelectedIds.value.push(it.id);
      }
    });
  }
};

const batchDeleteWc = async () => {
  if (wcSelectedIds.value.length === 0) return;
  if (!confirm(`确定要删除选中的 ${wcSelectedIds.value.length} 条记录吗？`)) return;

  try {
    for (const id of wcSelectedIds.value) {
      await deleteStockroomUrgentPullConfig(id);
    }
    ElMessage.success(`成功删除 ${wcSelectedIds.value.length} 条记录`);
    wcSelectedIds.value = [];
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '批量删除失败');
  }
};

const removeWcItem = async (index: number) => {
  const item = wcMappings.value[index];
  if (!item) return;
  if (item.id) {
    try {
      await deleteStockroomUrgentPullConfig(item.id);
    } catch (error: any) {
      ElMessage.error(error.message || '删除失败');
      return;
    }
  }
  wcMappings.value.splice(index, 1);
};

const editWcRow = (index: number) => {
  const item = wcMappings.value[index];
  if (!item) return;
  item._originalKey = item.configKey;
  item._originalValue = item.configValue;
  item._editing = true;
};

const cancelWcEdit = (index: number) => {
  const item = wcMappings.value[index];
  if (!item) return;
  if (item._originalKey !== undefined) {
    item.configKey = item._originalKey;
    item.configValue = item._originalValue ?? item.configValue;
  }
  item._editing = false;
  delete item._originalKey;
  delete item._originalValue;
};

const saveWcRow = async (index: number) => {
  const item = wcMappings.value[index];
  if (!item) return;
  if (!item.configKey || !item.configValue) {
    ElMessage.warning('请填写客户名和WC名称');
    return;
  }
  try {
    await saveStockroomUrgentPullConfigs([{
      config_type: 'wc_mapping',
      config_key: item.configKey,
      config_value: item.configValue,
      sort_order: index + 1,
      is_active: true
    }] as any);
    ElMessage.success('保存成功');
    item._editing = false;
    delete item._originalKey;
    delete item._originalValue;
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
};

// Pull List类型
const addPulllistItem = () => {
  pulllistTypes.value.push({ configKey: '', configValue: '', docType: '借料', isActive: true, _editing: true });
};

const removePulllistItem = async (index: number) => {
  const item = pulllistTypes.value[index];
  if (!item) return;
  try {
    if (item.id !== undefined) {
      await deleteStockroomUrgentPullConfig(item.id);
    }
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败');
    return;
  }
  pulllistTypes.value.splice(index, 1);
};

const editTypeRow = (index: number) => {
  const item = pulllistTypes.value[index];
  if (!item) return;
  item._originalKey = item.configKey;
  item._originalValue = item.configValue;
  item._originalDocType = item.docType;
  item._originalActive = item.isActive;
  item._editing = true;
};

const cancelTypeEdit = (index: number) => {
  const item = pulllistTypes.value[index];
  if (!item) return;
  if (item._originalKey !== undefined) {
    item.configKey = item._originalKey;
    item.configValue = item._originalValue ?? item.configValue;
    item.docType = item._originalDocType ?? item.docType;
    item.isActive = item._originalActive ?? item.isActive;
  }
  item._editing = false;
  delete item._originalKey;
  delete item._originalValue;
  delete item._originalDocType;
  delete item._originalActive;
};

const saveTypeRow = async (index: number) => {
  const item = pulllistTypes.value[index];
  if (!item) return;
  if (!item.configKey || !item.configValue) {
    ElMessage.warning('请填写仓位名称和关键词');
    return;
  }
  try {
    await saveStockroomUrgentPullConfigs([{
      config_type: 'pulllist_type',
      config_key: item.configKey,
      config_value: item.configValue,
      doc_type: item.docType || '借料',
      sort_order: index + 1,
      is_active: item.isActive !== false
    }] as any);
    ElMessage.success('保存成功');
    item._editing = false;
    delete item._originalKey;
    delete item._originalValue;
    delete item._originalDocType;
    delete item._originalActive;
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
};

// WC批量导入 - Excel方式
const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0] as File);
  }
};

const handleFileDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0] as File);
  }
};

const processFile = (file: File) => {
  importError.value = '';
  const ext = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls', 'xlsm'].includes(ext || '')) {
    importError.value = '请上传 Excel 文件 (.xlsx, .xls, .xlsm)';
    return;
  }

  uploadedFileName.value = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        importError.value = '文件格式错误，请使用模板文件';
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        importError.value = '文件格式错误，请使用模板文件';
        return;
      }
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        importError.value = '文件至少需要表头和一行数据';
        return;
      }

      // 跳过表头，从第二行开始解析
      const rows: Array<{customer: string, wc: string}> = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 2) continue;
        const customer = String(row[0] || '').trim();
        const wc = String(row[1] || '').trim();
        if (customer && wc) {
          rows.push({ customer, wc });
        }
      }

      if (rows.length === 0) {
        importError.value = '未解析到有效数据，请检查文件内容';
        return;
      }

      importedRows.value = rows;
    } catch (err) {
      console.error('解析Excel失败:', err);
      importError.value = '文件解析失败，请检查文件格式';
    }
  };
  reader.readAsArrayBuffer(file);
};

const downloadTemplate = () => {
  const data = [
    ['客户名', 'WC名称'],
    ['Whirlpool', 'WH-WC-01'],
    ['Samsung', 'SA-WC-01'],
    ['LG', 'LG-WC-01']
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'WC映射');
  XLSX.writeFile(wb, 'WC名称映射模板.xlsx');
};

const resetImport = () => {
  uploadedFileName.value = '';
  importedRows.value = [];
  importError.value = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const closeImportDialog = () => {
  showWcImportDialog.value = false;
  resetImport();
};

const handleWcImport = async () => {
  if (importedRows.value.length === 0) {
    ElMessage.warning('请先上传并解析Excel文件');
    return;
  }

  // 推送到列表
  importedRows.value.forEach(row => {
    wcMappings.value.push({
      configKey: row.customer,
      configValue: row.wc
    });
  });

  // 直接调用保存接口
  try {
    const configs = importedRows.value.map(row => ({
      config_type: 'wc_mapping',
      config_key: row.customer,
      config_value: row.wc,
      sort_order: 0,
      is_active: true
    }));

    await saveStockroomUrgentPullConfigs(configs);
    ElMessage.success(`成功导入并保存 ${importedRows.value.length} 条配置`);
    closeImportDialog();
    // 重新加载数据
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  }
};

// 保存全部配置
const handleSaveAll = async () => {
  isSaving.value = true;
  try {
    const allConfigs: any[] = [];

    locationMappings.value.forEach((item, i) => {
      if (item.configKey && item.configValue) {
        allConfigs.push({
          config_type: 'location_mapping',
          config_key: item.configKey,
          config_value: item.configValue,
          sort_order: i + 1,
          is_active: true
        });
      }
    });

    wcMappings.value.forEach((item, i) => {
      if (item.configKey && item.configValue) {
        allConfigs.push({
          config_type: 'wc_mapping',
          config_key: item.configKey,
          config_value: item.configValue,
          sort_order: i + 1,
          is_active: true
        });
      }
    });

    pulllistTypes.value.forEach((item, i) => {
      if (item.configKey && item.configValue) {
        allConfigs.push({
          config_type: 'pulllist_type',
          config_key: item.configKey,
          config_value: item.configValue,
          doc_type: item.docType || '借料',
          sort_order: i + 1,
          is_active: item.isActive !== false
        });
      }
    });

    if (allConfigs.length === 0) {
      ElMessage.warning('没有需要保存的配置');
      return;
    }

    await saveStockroomUrgentPullConfigs(allConfigs);
    ElMessage.success('保存成功');
    // 保存后自动刷新
    await nextTick();
    await loadConfigs();
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadConfigs();
});
</script>

<style scoped>
.stockroom-config-container {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 52px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.breadcrumb-item {
  color: #606266;
}

.breadcrumb-item.active {
  color: #0066CC;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #c0c4cc;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #0066CC;
  color: white;
}

.btn-primary:hover {
  background-color: #0052A3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #ffffff;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-secondary:hover {
  border-color: #0066CC;
  color: #0066CC;
}

.btn-refresh {
  background-color: #ffffff;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-refresh:hover {
  border-color: #0066CC;
  color: #0066CC;
}

.btn-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 标签页 */
.tabs-card {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 6px 6px 0 0;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
}

.tab-btn:hover {
  color: #0066CC;
}

.tab-btn.active {
  color: #0066CC;
  border-bottom-color: #0066CC;
  background: white;
}

.tab-content {
  padding: 12px;
}

.table-card {
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.table-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}

.table-card-actions {
  display: flex;
  gap: 8px;
}

.card-body {
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead {
  background-color: #fafafa;
}

.data-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  white-space: nowrap;
}

.data-table td {
  padding: 6px 12px;
  border-bottom: 1px solid #ebeef5;
  color: #606266;
}

.data-table tbody tr:hover {
  background-color: #f5f7fa;
}

.text-center {
  text-align: center;
}

.empty-tip {
  text-align: center;
  padding: 40px 20px !important;
  color: #8c8c8c;
}

.pulllist-tip {
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
}

.pulllist-tip strong {
  color: #0066CC;
}

.table-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.table-input:focus {
  border-color: #0066CC;
}

/* 关键词标签 */
.tags-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px;
  min-height: 36px;
}

.tag {
  display: inline-flex;
  align-items: center;
  background: #e6f7ff;
  color: #0066CC;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.tag em {
  margin-left: 6px;
  cursor: pointer;
  font-style: normal;
  font-size: 14px;
  line-height: 1;
}

.tag em:hover {
  color: #ff4d4f;
}

.tag-input {
  flex: 1;
  min-width: 120px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.tag-input:focus {
  border-color: #0066CC;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  margin: 0 2px;
}

.btn-icon:hover {
  opacity: 0.7;
}

.btn-icon.btn-delete:hover {
  color: #ff4d4f;
}

.btn-icon.btn-save {
  color: #52c41a;
  font-size: 18px;
  font-weight: bold;
}

.btn-icon.btn-save:hover {
  color: #73d13d;
}

/* 对话框 */
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
  z-index: 9999;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 560px;
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #8c8c8c;
  padding: 4px 8px;
}

.dialog-close:hover {
  color: #1f1f1f;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

/* 导入对话框内容 */
.import-tip {
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #1f1f1f;
}

.import-tip p {
  margin: 0 0 6px 0;
}

.import-tip pre {
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 6px 0 0 0;
  font-size: 12px;
  font-family: monospace;
}

.import-tip code {
  background: #e8e8e8;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.import-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.import-textarea:focus {
  border-color: #0066CC;
}

.preview-section {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.preview-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #1f1f1f;
}

.preview-count {
  font-size: 12px;
  color: #0066CC;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.preview-table {
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.error-tip {
  background: #fff1f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

/* 表格导入对话框 */
.dialog-large {
  width: 720px;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.upload-area:hover {
  border-color: #0066CC;
  background: #f0f9ff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 48px;
  opacity: 0.6;
}

.upload-text {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.upload-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.uploaded-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  margin-bottom: 16px;
}

.file-icon {
  font-size: 24px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #0066CC;
  font-weight: 500;
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-danger {
  background-color: #ff4d4f;
  color: white;
}

.btn-danger:hover {
  background-color: #ff7875;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.search-wrap {
  position: relative;
  flex: 0 0 260px;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #909399;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 5px 24px 5px 26px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #0066CC;
}

.search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #909399;
  font-size: 14px;
  padding: 0 6px;
  border-radius: 3px;
}

.search-clear:hover {
  background: #f0f0f0;
  color: #606266;
}

.toolbar-info {
  font-size: 12px;
  color: #606266;
  flex: 1;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.search-wrap {
  position: relative;
  flex: 0 0 260px;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #909399;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 5px 24px 5px 26px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #0066CC;
}

.search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #909399;
  font-size: 14px;
  padding: 0 6px;
  border-radius: 3px;
}

.search-clear:hover {
  background: #f0f0f0;
  color: #606266;
}

.toolbar-info {
  font-size: 12px;
  color: #606266;
  flex: 1;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.title-meta {
  margin-left: 8px;
  font-size: 12px;
  font-weight: normal;
  color: #909399;
}

/* 表格列宽 */
.col-checkbox {
  width: 36px;
}

.col-index {
  width: 50px;
}

.col-name {
  min-width: 150px;
}

.col-actions {
  width: 110px;
}

.data-table input[type="checkbox"] {
  cursor: pointer;
  width: 14px;
  height: 14px;
  margin: 0;
}

.data-table input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  margin: 0 1px;
}

.preview-table-wrapper {
  background: white;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  max-height: 300px;
  overflow-y: auto;
}
</style>