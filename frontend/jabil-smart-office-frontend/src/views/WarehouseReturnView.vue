<template>
  <div class="warehouse-return-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">回仓申请</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="loadStats">刷新</button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card stat-card-orange" @click="filterByStatus('pending_receiving')">
        <div class="stat-icon-bg"><span class="stat-icon">待</span></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pendingReceiving }}</div>
          <div class="stat-label">待接收</div>
        </div>
      </div>
      <div class="stat-card stat-card-blue" @click="filterByStatus('received')">
        <div class="stat-icon-bg"><span class="stat-icon">对</span></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.received }}</div>
          <div class="stat-label">待对账</div>
        </div>
      </div>
      <div class="stat-card stat-card-yellow" @click="filterByStatus('processing')">
        <div class="stat-icon-bg"><span class="stat-icon">待</span></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.processing }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>
      <div class="stat-card stat-card-green" @click="filterByStatus('closed')">
        <div class="stat-icon-bg"><span class="stat-icon">完</span></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.closed }}</div>
          <div class="stat-label">已完结</div>
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-show="activeTab === 'submit'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
          <div class="table-card-actions">
            <button class="btn btn-primary" @click="openCreateDialog">新建回仓申请</button>
          </div>
        </div>
        <div class="card-body">
          <div class="search-bar">
            <div class="search-item">
              <label>单号</label>
              <input type="text" v-model="searchQuery.returnNo" placeholder="请输入单号">
            </div>
            <div class="search-actions">
              <button class="btn btn-primary" @click="handleSearch">查询</button>
              <button class="btn btn-secondary" @click="resetSearch">重置</button>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>回仓单号</th>
                  <th>Bay号</th>
                  <th>接收Building</th>
                  <th>提交人</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.id">
                  <td>{{ doc.returnNo }}</td>
                  <td>{{ doc.bayNo }}</td>
                  <td>{{ doc.receiveBuilding }}</td>
                  <td>{{ doc.submitterName }}</td>
                  <td>{{ formatDate(doc.createdAt) }}</td>
                  <td><span class="status-badge" :style="getStatusStyle(doc.status)">{{ getStatusText(doc.status, doc.pendingCount) }}</span></td>
                  <td>
                    <button class="action-btn view" @click="viewDocument(doc)">查看</button>
                  </td>
                </tr>
                <tr v-if="documents.length === 0">
                  <td colspan="7" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'warehouse'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>回仓单号</th>
                  <th>Bay号</th>
                  <th>接收Building</th>
                  <th>提交人</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.id">
                  <td>{{ doc.returnNo }}</td>
                  <td>{{ doc.bayNo }}</td>
                  <td>{{ doc.receiveBuilding }}</td>
                  <td>{{ doc.submitterName }}</td>
                  <td><span class="status-badge" :style="getStatusStyle(doc.status)">{{ getStatusText(doc.status, doc.pendingCount) }}</span></td>
                  <td>
                    <button class="action-btn view" @click="viewDocument(doc)">查看</button>
                    <button v-if="doc.status === 'pending_receiving'" class="action-btn receive" @click="handleReceive(doc)">接收</button>
                    <button v-if="doc.status === 'received'" class="action-btn reconcile" @click="openReconcileDialog(doc)">对账</button>
                  </td>
                </tr>
                <tr v-if="documents.length === 0">
                  <td colspan="6" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'config'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
        </div>
        <div class="card-body">
          <div class="config-section">
            <h3 class="config-title">邮件抄送配置</h3>
            <p class="config-desc">配置退回邮件的默认抄送人员，多个邮箱用逗号分隔</p>
            <div class="config-form">
              <div class="form-item">
                <label>抄送邮箱：</label>
                <input type="text" v-model="emailCcInput" placeholder="如：user1@example.com, user2@example.com" style="width: 400px">
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" @click="saveEmailCc">保存邮件配置</button>
              </div>
            </div>
          </div>
          <div class="config-section">
            <h3 class="config-title">接收Building配置</h3>
            <p class="config-desc">配置回仓申请的接收Building下拉选项</p>
            <div class="config-form">
              <div class="building-list">
                <div v-for="(building, index) in buildingConfigs" :key="index" class="building-item">
                  <input type="checkbox" v-model="building.isActive">
                  <input type="text" v-model="building.code" placeholder="编码" class="building-code-input">
                  <input type="text" v-model="building.name" placeholder="名称" class="building-name-input">
                  <button class="btn btn-danger btn-sm" @click="removeBuilding(index)">删除</button>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" @click="addBuilding">添加Building</button>
                <button class="btn btn-primary" @click="saveBuildings">保存Building配置</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="closeCreateDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>新建回仓申请</h3>
          <button class="dialog-close" @click="closeCreateDialog">X</button>
        </div>
        <div class="dialog-body">
          <div class="form-row">
            <div class="form-item">
              <label class="required">Bay号：</label>
              <input type="text" v-model="formData.bayNo" placeholder="请输入Bay号">
            </div>
            <div class="form-item">
              <label class="required">接收Building：</label>
              <select v-model="formData.receiveBuilding">
                <option value="">请选择</option>
                <option v-for="b in buildings" :key="b.code" :value="b.code">{{ b.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-item">
            <label>物料清单：</label>
            <div class="upload-area">
              <button class="btn btn-secondary" @click="downloadTemplate">下载模板</button>
              <button class="btn btn-primary" @click="$refs.fileInput.click()">导入Excel</button>
            </div>
            <input type="file" ref="fileInput" accept=".xlsx,.xls" @change="handleFileUpload" style="display:none">
            <p class="upload-tip">提示：Material、Qty、Bay号三列为必填</p>
          </div>
          <div v-if="formData.items.length > 0" class="items-preview">
            <div class="preview-header">
              <span>已导入 {{ formData.items.length }} 条物料</span>
              <button class="btn btn-secondary btn-sm" @click="clearItems">清空</button>
            </div>
            <table class="data-table">
              <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="(item, index) in formData.items" :key="index">
                  <td>{{ item.material }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ item.bayNo }}</td>
                  <td><button class="action-btn delete" @click="removeItem(index)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeCreateDialog">取消</button>
          <button class="btn btn-primary" @click="submitForm" :disabled="isSubmitting">{{ isSubmitting ? '提交中...' : '提交' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailDialog" class="dialog-overlay" @click.self="closeDetailDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>回仓申请详情</h3>
          <button class="dialog-close" @click="closeDetailDialog">X</button>
        </div>
        <div class="dialog-body">
          <div class="detail-info">
            <div class="detail-row">
              <div class="detail-item"><label>回仓单号：</label><span>{{ currentDocument?.returnNo }}</span></div>
              <div class="detail-item"><label>Bay号：</label><span>{{ currentDocument?.bayNo }}</span></div>
              <div class="detail-item"><label>接收Building：</label><span>{{ currentDocument?.receiveBuilding }}</span></div>
            </div>
            <div class="detail-row">
              <div class="detail-item"><label>提交人：</label><span>{{ currentDocument?.submitterName }}</span></div>
              <div class="detail-item"><label>提交时间：</label><span>{{ formatDate(currentDocument?.createdAt) }}</span></div>
              <div class="detail-item"><label>状态：</label><span class="status-badge" :style="getStatusStyle(currentDocument?.status)">{{ getStatusText(currentDocument?.status, currentDocument?.pendingCount) }}</span></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>物料明细</h4>
            <table class="data-table">
              <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="item in currentDocument?.items" :key="item.id">
                  <td>{{ item.material }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ item.bayNo }}</td>
                  <td>{{ item.matchStatus }}</td>
                </tr>
                <tr v-if="!currentDocument?.items?.length"><td colspan="4" class="empty-cell">暂无物料明细</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeDetailDialog">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showReconcileDialog" class="dialog-overlay" @click.self="closeReconcileDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>对账 - {{ currentDocument?.returnNo }}</h3>
          <button class="dialog-close" @click="closeReconcileDialog">X</button>
        </div>
        <div class="dialog-body">
          <div v-if="reconcileResult" class="reconcile-summary">
            <div class="summary-item success"><span class="summary-count">{{ reconcileResult.summary?.matched || 0 }}</span><span class="summary-label">匹配成功</span></div>
            <div class="summary-item warning"><span class="summary-count">{{ reconcileResult.summary?.listOnly || 0 }}</span><span class="summary-label">清单有SAP无</span></div>
            <div class="summary-item info"><span class="summary-count">{{ reconcileResult.summary?.sapOnly || 0 }}</span><span class="summary-label">SAP有清单无</span></div>
          </div>
          <div v-if="reconcileResult" class="reconcile-tabs">
            <div class="reconcile-tab-header">
              <button :class="['reconcile-tab', { active: reconcileTab === 'matched' }]" @click="reconcileTab = 'matched'">匹配成功</button>
              <button :class="['reconcile-tab', { active: reconcileTab === 'listOnly' }]" @click="reconcileTab = 'listOnly'">清单有SAP无</button>
              <button :class="['reconcile-tab', { active: reconcileTab === 'sapOnly' }]" @click="reconcileTab = 'sapOnly'">SAP有清单无</button>
            </div>
            <div v-show="reconcileTab === 'matched'" class="reconcile-tab-content">
              <table class="data-table">
                <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th><input type="checkbox" v-model="selectAllMatched" @change="toggleSelectMatched"></th></tr></thead>
                <tbody>
                  <tr v-for="item in reconcileResult.matchedItems" :key="item.id">
                    <td>{{ item.material }}</td><td>{{ item.qty }}</td><td>{{ item.bay_no || item.bayNo }}</td>
                    <td><input type="checkbox" :value="item.id" v-model="selectedMatchedItems"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-show="reconcileTab === 'listOnly'" class="reconcile-tab-content">
              <table class="data-table">
                <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th><input type="checkbox" v-model="selectAllListOnly" @change="toggleSelectListOnly"></th></tr></thead>
                <tbody>
                  <tr v-for="item in reconcileResult.listOnlyItems" :key="item.id">
                    <td>{{ item.material }}</td><td>{{ item.qty }}</td><td>{{ item.bay_no || item.bayNo }}</td>
                    <td><input type="checkbox" :value="item.id" v-model="selectedListOnlyItems"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeReconcileDialog">取消</button>
          <button v-if="selectedListOnlyItems.length > 0" class="btn btn-warning" @click="openReturnDialog">退回选中</button>
          <button v-if="selectedMatchedItems.length > 0" class="btn btn-success" @click="handleCloseMatched">关闭选中</button>
        </div>
      </div>
    </div>

    <div v-if="showReturnDialog" class="dialog-overlay" @click.self="closeReturnDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>填写退回原因</h3>
          <button class="dialog-close" @click="closeReturnDialog">X</button>
        </div>
        <div class="dialog-body">
          <div class="form-item">
            <label class="required">退回原因：</label>
            <textarea v-model="returnReason" rows="4" placeholder="请填写退回原因"></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeReturnDialog">取消</button>
          <button class="btn btn-warning" @click="handleReturn" :disabled="!returnReason.trim()">确认退回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import * as api from '../api/warehouseReturn';

const isLoading = ref(false);
const isSubmitting = ref(false);
const activeTab = ref('submit');
const tabs = [
  { key: 'submit', label: '提交管理' },
  { key: 'warehouse', label: '仓库操作' },
  { key: 'config', label: '配置管理' }
];

const stats = reactive({ pendingReceiving: 0, received: 0, processing: 0, closed: 0 });
const searchQuery = reactive({ returnNo: '', bayNo: '' });
const documents = ref([]);
const buildings = ref([]);
const currentDocument = ref(null);
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const showReconcileDialog = ref(false);
const showReturnDialog = ref(false);
const formData = reactive({ bayNo: '', receiveBuilding: '', items: [] });
const reconcileResult = ref(null);
const reconcileTab = ref('matched');
const selectedMatchedItems = ref([]);
const selectedListOnlyItems = ref([]);
const selectAllMatched = ref(false);
const selectAllListOnly = ref(false);
const returnReason = ref('');
const emailCcInput = ref('');
const buildingConfigs = ref([]);

const currentTabTitle = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '');

const statusTextMap = {
  pending_receiving: '待仓库接收',
  received: '仓库已接收',
  reconciled_full_match: '对账完成-匹配成功',
  reconciled_partial_return: '对账完成-部分退回',
  closed: '已完结'
};

const loadStats = async () => {
  try {
    const res = await api.getStats();
    if (res?.data?.code === 200) Object.assign(stats, res.data.data);
  } catch (e) { console.error(e); }
};

const loadDocuments = async () => {
  isLoading.value = true;
  try {
    const res = await api.getDocuments({ page: 1, pageSize: 100, ...searchQuery });
    if (res?.data?.code === 200) documents.value = res.data.data.items || [];
  } catch (e) { console.error(e); }
  finally { isLoading.value = false; }
};

const loadBuildings = async () => {
  try {
    const res = await api.getBuildings();
    if (res?.data?.code === 200) buildings.value = res.data.data || [];
  } catch (e) { console.error(e); }
};

const loadBuildingConfigs = async () => {
  try {
    const res = await api.getAllBuildingConfigs();
    if (res?.data?.code === 200) buildingConfigs.value = res.data.data || [];
  } catch (e) { console.error(e); }
};

const loadEmailCcConfig = async () => {
  try {
    const res = await api.getEmailCcConfig();
    if (res?.data?.code === 200) {
      const configs = res.data.data || [];
      emailCcInput.value = configs.map(c => c.email).filter(e => e).join(', ');
    }
  } catch (e) { console.error(e); }
};

const handleSearch = () => { loadDocuments(); };
const resetSearch = () => { Object.keys(searchQuery).forEach(k => searchQuery[k] = ''); handleSearch(); };
const filterByStatus = (status) => { searchQuery.status = status; handleSearch(); };

const openCreateDialog = () => { formData.bayNo = ''; formData.receiveBuilding = ''; formData.items = []; showCreateDialog.value = true; };
const closeCreateDialog = () => { showCreateDialog.value = false; };

const viewDocument = async (doc) => {
  try {
    const res = await api.getDocumentById(doc.id);
    if (res?.data?.code === 200) { currentDocument.value = res.data.data; showDetailDialog.value = true; }
  } catch (e) { ElMessage.error('加载失败'); }
};

const closeDetailDialog = () => { showDetailDialog.value = false; currentDocument.value = null; };

const handleFileUpload = async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const items = [];
      jsonData.forEach((row, i) => {
        const m = String(row.Material || row.material || '').trim();
        const q = parseFloat(row.Qty || row.qty || 0);
        const b = String(row.BayNo || row.Bay || row.bayNo || row.bay || '').trim();
        if (m && q > 0 && b) items.push({ material: m, qty: q, bayNo: b });
      });
      formData.items = items;
      ElMessage.success('成功导入 ' + items.length + ' 条');
    };
    reader.readAsArrayBuffer(file);
  } catch (e) { ElMessage.error('解析失败'); }
  event.target.value = '';
};

const downloadTemplate = () => {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet([{ Material: 'M001', Qty: 100, BayNo: 'B01' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物料清单');
    XLSX.writeFile(wb, '回仓申请物料清单模板.xlsx');
  });
};

const clearItems = () => { formData.items = []; };
const removeItem = (index) => { formData.items.splice(index, 1); };

const submitForm = async () => {
  if (!formData.bayNo || !formData.receiveBuilding || formData.items.length === 0) {
    ElMessage.error('请填写完整信息'); return;
  }
  isSubmitting.value = true;
  try {
    const res = await api.createDocument(formData);
    if (res?.data?.code === 200) { ElMessage.success('提交成功'); closeCreateDialog(); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error(e.response?.data?.message || '提交失败'); }
  finally { isSubmitting.value = false; }
};

const handleReceive = async (doc) => {
  try {
    const res = await api.receiveDocument(doc.id);
    if (res?.data?.code === 200) { ElMessage.success('已接收'); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('接收失败'); }
};

const openReconcileDialog = async (doc) => {
  try {
    const detailRes = await api.getDocumentById(doc.id);
    if (detailRes?.data?.code === 200) currentDocument.value = detailRes.data.data;
    const res = await api.reconcileDocument(doc.id);
    if (res?.data?.code === 200) {
      reconcileResult.value = res.data.data;
      selectedMatchedItems.value = []; selectedListOnlyItems.value = [];
      showReconcileDialog.value = true;
    }
  } catch (e) { ElMessage.error('对账失败'); }
};

const closeReconcileDialog = () => { showReconcileDialog.value = false; reconcileResult.value = null; };
const toggleSelectMatched = () => { selectedMatchedItems.value = selectAllMatched.value ? (reconcileResult.value?.matchedItems?.map(i => i.id) || []) : []; };
const toggleSelectListOnly = () => { selectedListOnlyItems.value = selectAllListOnly.value ? (reconcileResult.value?.listOnlyItems?.map(i => i.id) || []) : []; };

const openReturnDialog = () => { showReturnDialog.value = true; };
const closeReturnDialog = () => { showReturnDialog.value = false; returnReason.value = ''; };

const handleReturn = async () => {
  try {
    const res = await api.returnItems(currentDocument.value.id, { itemIds: selectedListOnlyItems.value, reason: returnReason.value });
    if (res?.data?.code === 200) { ElMessage.success('退回成功'); closeReturnDialog(); closeReconcileDialog(); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('退回失败'); }
};

const handleCloseMatched = async () => {
  try {
    const res = await api.closeItems(currentDocument.value.id, { itemIds: selectedMatchedItems.value });
    if (res?.data?.code === 200) { ElMessage.success('关闭成功'); closeReconcileDialog(); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('关闭失败'); }
};

const saveEmailCc = async () => {
  try {
    const emails = emailCcInput.value.split(',').map(e => e.trim()).filter(e => e);
    const configs = emails.map(email => ({ email, emailType: 'cc' }));
    const res = await api.saveEmailCcConfig({ configs });
    if (res?.data?.code === 200) ElMessage.success('保存成功');
  } catch (e) { ElMessage.error('保存失败'); }
};

const addBuilding = () => { buildingConfigs.value.push({ code: '', name: '', isActive: true }); };

const removeBuilding = (index) => {
  if (buildingConfigs.value.filter(b => b.isActive).length <= 1 && buildingConfigs.value[index].isActive) {
    ElMessage.warning('至少保留一个'); return;
  }
  buildingConfigs.value.splice(index, 1);
};

const saveBuildings = async () => {
  for (let i = 0; i < buildingConfigs.value.length; i++) {
    if (!buildingConfigs.value[i].code || !buildingConfigs.value[i].name) {
      ElMessage.warning('编码和名称不能为空'); return;
    }
  }
  try {
    const res = await api.saveBuildingConfigs({ buildings: buildingConfigs.value });
    if (res?.data?.code === 200) { ElMessage.success('保存成功'); loadBuildingConfigs(); }
  } catch (e) { ElMessage.error('保存失败'); }
};

const formatDate = (date) => { if (!date) return '-'; return new Date(date).toLocaleString('zh-CN'); };
const getStatusText = (status, pendingCount) => { return statusTextMap[status] || status; };
const getStatusStyle = (status) => {
  const colors = {
    pending_receiving: { background: '#fff7e6', color: '#fa8c16' },
    received: { background: '#e6f7ff', color: '#1890ff' },
    reconciled_full_match: { background: '#f6ffed', color: '#52c41a' },
    reconciled_partial_return: { background: '#fff7e6', color: '#fa8c16' },
    closed: { background: '#d9d9d9', color: '#595959' }
  };
  return colors[status] || {};
};

onMounted(() => { loadStats(); loadDocuments(); loadBuildings(); loadEmailCcConfig(); loadBuildingConfigs(); });
</script>

<style scoped>
.warehouse-return-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.breadcrumb { font-size: 14px; color: #666; }
.breadcrumb-item.active { color: #333; font-weight: 500; }
.breadcrumb-separator { margin: 0 8px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card { flex: 1; background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-card-orange { border-left: 4px solid #fa8c16; }
.stat-card-blue { border-left: 4px solid #1890ff; }
.stat-card-yellow { border-left: 4px solid #faad14; }
.stat-card-green { border-left: 4px solid #52c41a; }
.stat-icon-bg { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; background: #f5f5f5; }
.stat-value { font-size: 28px; font-weight: 600; color: #333; }
.stat-label { font-size: 14px; color: #666; margin-top: 4px; }
.tabs-container { margin-bottom: 20px; }
.tabs-header { display: flex; gap: 4px; background: #fafafa; padding: 4px; border-radius: 8px; }
.tab-btn { padding: 8px 20px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666; }
.tab-btn:hover { background: #fff; }
.tab-btn.active { background: #fff; color: #1890ff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.table-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.table-card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
.table-card-title { font-size: 16px; font-weight: 500; }
.card-body { padding: 20px; }
.search-bar { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.search-item label { display: block; margin-bottom: 4px; font-size: 12px; color: #666; }
.search-item input { height: 32px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 0 12px; min-width: 150px; }
.search-actions { display: flex; gap: 8px; align-items: flex-end; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.data-table th { background: #fafafa; font-weight: 500; }
.empty-cell { text-align: center; color: #999; padding: 40px !important; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.table-actions { display: flex; gap: 8px; }
.action-btn { padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.action-btn.view { background: #e6f7ff; color: #1890ff; }
.action-btn.receive { background: #e6f7ff; color: #1890ff; }
.action-btn.reconcile { background: #f9f0ff; color: #722ed1; }
.action-btn.delete { background: #fff1f0; color: #ff4d4f; }
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-primary { background: #1890ff; color: #fff; }
.btn-secondary { background: #f0f0f0; color: #333; }
.btn-warning { background: #fa8c16; color: #fff; }
.btn-success { background: #52c41a; color: #fff; }
.btn-danger { background: #fff1f0; color: #ff4d4f; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn:hover:not(:disabled) { opacity: 0.85; }
.btn:disabled { cursor: not-allowed; opacity: 0.5; }
.btn-refresh { background: transparent; border: 1px solid #d9d9d9; }
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog { background: #fff; border-radius: 8px; width: 500px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.dialog-large { width: 900px; max-height: 85vh; }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
.dialog-header h3 { margin: 0; font-size: 16px; }
.dialog-close { width: 24px; height: 24px; border: none; background: transparent; font-size: 20px; cursor: pointer; color: #999; }
.dialog-body { padding: 20px; overflow-y: auto; flex: 1; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #f0f0f0; }
.form-row { display: flex; gap: 16px; margin-bottom: 16px; }
.form-item { flex: 1; margin-bottom: 16px; }
.form-item label { display: block; margin-bottom: 4px; font-size: 14px; color: #333; }
.form-item label.required::before { content: '*'; color: #ff4d4f; margin-right: 4px; }
.form-item input, .form-item select, .form-item textarea { width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; }
.upload-area { display: flex; gap: 12px; margin-top: 8px; }
.upload-tip { font-size: 12px; color: #999; margin-top: 8px; }
.items-preview { margin-top: 16px; }
.preview-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
.detail-info { margin-bottom: 24px; }
.detail-row { display: flex; gap: 24px; margin-bottom: 12px; }
.detail-item { flex: 1; }
.detail-item label { color: #666; margin-right: 8px; }
.detail-section { margin-top: 24px; }
.detail-section h4 { margin: 0 0 12px 0; font-size: 14px; }
.config-section { padding: 20px; border-bottom: 1px solid #f0f0f0; }
.config-section:last-child { border-bottom: none; }
.config-title { margin: 0 0 8px 0; font-size: 16px; }
.config-desc { margin: 0 0 16px 0; color: #666; font-size: 14px; }
.config-form { max-width: 600px; }
.building-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.building-item { display: flex; align-items: center; gap: 12px; }
.building-code-input { width: 120px; }
.building-name-input { width: 200px; }
.form-actions { margin-top: 16px; }
.reconcile-summary { display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #fafafa; border-radius: 8px; }
.summary-item { flex: 1; text-align: center; padding: 12px; border-radius: 8px; }
.summary-item.success { background: #f6ffed; }
.summary-item.warning { background: #fff7e6; }
.summary-item.info { background: #e6f7ff; }
.summary-count { display: block; font-size: 28px; font-weight: 600; }
.summary-label { font-size: 14px; color: #666; }
.reconcile-tabs { border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.reconcile-tab-header { display: flex; background: #fafafa; }
.reconcile-tab { flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-size: 14px; }
.reconcile-tab:hover { background: #fff; }
.reconcile-tab.active { background: #fff; border-bottom: 2px solid #1890ff; color: #1890ff; }
.reconcile-tab-content { padding: 16px; max-height: 400px; overflow-y: auto; }
</style>
