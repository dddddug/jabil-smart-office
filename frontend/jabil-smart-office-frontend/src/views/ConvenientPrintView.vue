<template>
  <div class="convenient-print-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">PNC转仓打印</span>
      </div>
    </div>

    <!-- 历史记录按钮 -->
    <button class="history-toggle-btn" @click="showHistory = !showHistory; showHistory && loadHistory()">
      📋 {{ showHistory ? '关闭历史' : '查看历史记录' }}
    </button>

    <!-- 历史记录面板 -->
    <div v-if="showHistory" class="history-panel">
      <div class="history-modal">
        <button class="history-close-btn" @click="showHistory = false" title="关闭">✕</button>
        <div class="history-header">
          <h3>📋 打印历史记录</h3>
          <div class="history-filters">
            <input
              type="text"
              v-model="historySearch.transferNo"
              placeholder="搜索单号..."
              class="history-search"
            />
            <input
              type="text"
              v-model="historySearch.creatorName"
              placeholder="搜索创建人..."
              class="history-search"
            />
            <input
              type="date"
              v-model="historySearch.startDate"
              class="history-date"
            />
            <span>至</span>
            <input
              type="date"
              v-model="historySearch.endDate"
              class="history-date"
            />
            <button class="btn-search" @click="historyPage = 1; loadHistory()">🔍 搜索</button>
            <button class="btn-export" @click="exportHistory">📥 导出Excel</button>
          </div>
        </div>

        <div class="history-list">
          <!-- 批量操作栏 -->
          <div class="batch-actions" v-if="selectedDocs.length > 0">
            <span>已选择 {{ selectedDocs.length }} 项</span>
            <button class="btn-batch-print" @click="batchPrint">🖨️ 批量打印</button>
            <button class="btn-batch-cancel" @click="selectedDocs = []">取消选择</button>
          </div>

          <table class="history-table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" />
                </th>
                <th>序号</th>
                <th>单号</th>
                <th>转仓部门</th>
                <th>配置</th>
                <th>创建人</th>
                <th>创建时间</th>
                <th>打印次数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(doc, index) in historyList" :key="doc.id">
                <td class="text-center">
                  <input type="checkbox" :value="doc" v-model="selectedDocs" />
                </td>
                <td class="text-center">{{ (historyPage - 1) * historyPageSize + index + 1 }}</td>
                <td>{{ doc.transferNo }}</td>
                <td>{{ doc.departmentName || '-' }}</td>
                <td>{{ doc.configName || '-' }}</td>
                <td>{{ doc.creatorName }}</td>
                <td>{{ formatDate(doc.createdAt) }}</td>
                <td class="text-center">{{ doc.printCount || 0 }}</td>
                <td class="text-center">
                  <span class="status-badge" :class="doc.status === 'sent' ? 'status-sent' : 'status-created'">
                    {{ doc.status === 'sent' ? '已发送' : '已创建' }}
                  </span>
                </td>
                <td class="text-center">
                  <button class="btn-action" @click="rePrint(doc)" title="补打">🖨️ 补打</button>
                  <button class="btn-action" @click="viewDetail(doc)" title="查看">👁️</button>
                </td>
              </tr>
              <tr v-if="historyList.length === 0">
                <td colspan="10" class="empty-tip">暂无记录</td>
              </tr>
            </tbody>
          </table>

          <!-- 分页 -->
          <div class="history-pagination" v-if="historyTotal > 0">
            <span>共 {{ historyTotal }} 条</span>
            <button @click="historyPage = 1; loadHistory()" :disabled="historyPage === 1">首页</button>
            <button @click="historyPage--; loadHistory()" :disabled="historyPage === 1">上一页</button>
            <span>第 {{ historyPage }} / {{ Math.ceil(historyTotal / historyPageSize) }} 页</span>
            <button @click="historyPage++; loadHistory()" :disabled="historyPage >= Math.ceil(historyTotal / historyPageSize)">下一页</button>
            <button @click="historyPage = Math.ceil(historyTotal / historyPageSize); loadHistory()" :disabled="historyPage >= Math.ceil(historyTotal / historyPageSize)">末页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      title="单据详情"
      width="700px"
      :close-on-click-modal="true"
    >
      <div v-if="detailDialogDoc" class="detail-content">
        <div class="detail-header">
          <h3>PNC转仓单 #{{ detailDialogDoc.transferNo }}</h3>
          <span class="status-badge" :class="detailDialogDoc.status === 'sent' ? 'status-sent' : 'status-created'">
            {{ detailDialogDoc.status === 'sent' ? '已发送' : '已创建' }}
          </span>
        </div>
        <div class="detail-info">
          <div class="detail-row">
            <span class="detail-label">配置:</span>
            <span class="detail-value">{{ detailDialogDoc.configName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">转仓部门:</span>
            <span class="detail-value">{{ detailDialogDoc.departmentName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建人:</span>
            <span class="detail-value">{{ detailDialogDoc.creatorName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建时间:</span>
            <span class="detail-value">{{ formatDate(detailDialogDoc.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">打印次数:</span>
            <span class="detail-value">{{ detailDialogDoc.printCount || 0 }}</span>
          </div>
        </div>
        <div class="detail-items">
          <h4>明细列表 (共 {{ detailDialogDoc.items?.length || 0 }} 条)</h4>
          <table class="detail-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>P/N</th>
                <th>GRN</th>
                <th>Batch</th>
                <th>数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in detailDialogDoc.items" :key="index">
                <td class="text-center">{{ index + 1 }}</td>
                <td>{{ item.partNumber || '-' }}</td>
                <td>{{ item.grn || '-' }}</td>
                <td>{{ item.batch || '-' }}</td>
                <td class="text-right">{{ item.quantity || '-' }}</td>
              </tr>
              <tr v-if="!detailDialogDoc.items || detailDialogDoc.items.length === 0">
                <td colspan="5" class="text-center empty-tip">暂无明细</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <div class="detail-footer">
          <button class="btn-action btn-print-action" @click="handleDetailPrint">
            🖨️ 打印
          </button>
          <button class="btn-action" @click="showDetailDialog = false">
            关闭
          </button>
        </div>
      </template>
    </el-dialog>

    <div class="print-layout">
      <div class="print-config-panel">
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">🖨️ 打印配置</div>
          </div>
          <div class="panel-body">
            <div class="config-section">
              <div class="config-title">PNC转仓打印设置</div>

              <!-- 转仓部门 -->
              <div class="form-group">
                <label>转仓部门 <span class="required">*</span></label>
                <select v-model="pncForm.departmentId" @change="onDepartmentChange">
                  <option value="">请选择部门...</option>
                  <option v-for="dept in departmentList" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
              </div>

              <!-- 选择配置 -->
              <div class="form-group">
                <label>接收方配置 <span class="required">*</span></label>
                <select v-model="pncForm.configId" @change="onConfigChange">
                  <option value="">请选择配置...</option>
                  <option v-for="config in filteredConfigs" :key="config.id" :value="config.id">
                    {{ config.configName }}
                  </option>
                </select>
              </div>

              <!-- 显示配置详情 -->
              <div v-if="selectedConfig" class="config-detail">
                <div class="detail-item">
                  <span class="detail-label">收件人:</span>
                  <span class="detail-value">{{ selectedConfig.recipientEmail || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">抄送人:</span>
                  <span class="detail-value">{{ selectedConfig.ccEmail || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">电话:</span>
                  <span class="detail-value">{{ selectedConfig.contactPhone || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">接收人:</span>
                  <span class="detail-value">{{ selectedConfig.recipientName || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">地址:</span>
                  <span class="detail-value">{{ selectedConfig.receivingAddress || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">位置:</span>
                  <span class="detail-value">{{ selectedConfig.systemLocation || '-' }}</span>
                </div>
              </div>

              <!-- 明细列表 -->
              <div class="form-group">
                <div class="item-header">
                  <label>明细列表 <span class="required">*</span></label>
                  <button type="button" class="btn-add-item" @click="addItem">➕ 添加明细</button>
                </div>

                <!-- 扫码输入区域 -->
                <div class="scan-input-area">
                  <div class="scan-mode-selector">
                    <label>扫码模式：</label>
                    <label class="radio-label">
                      <input type="radio" v-model="scanMode" value="A" />
                      <span>A模式</span>
                      <span class="mode-desc">P/N → GRN → 数量</span>
                    </label>
                    <label class="radio-label">
                      <input type="radio" v-model="scanMode" value="B" />
                      <span>B模式</span>
                      <span class="mode-desc">P/N → GRN → Batch → 数量</span>
                    </label>
                  </div>
                  <div class="scan-input-row">
                    <input
                      type="text"
                      v-model="scanInput"
                      :placeholder="scanPlaceholder"
                      @keydown.enter.prevent="handleScanInput"
                      ref="scanInputRef"
                      class="scan-input"
                    />
                    <button type="button" class="btn-scan" @click="handleScanInput">→ 录入</button>
                    <button type="button" class="btn-scan-next" @click="skipBatchAndGoToQuantity">跳过Batch</button>
                  </div>
                  <div class="scan-status" v-if="lastScanInfo">
                    上次录入: <strong>{{ lastScanInfo.value }}</strong> → {{ lastScanInfo.target }}
                  </div>
                </div>

                <div class="items-table">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 50px;">序号</th>
                        <th>P/N</th>
                        <th>GRN</th>
                        <th>Batch</th>
                        <th style="width: 80px;">数量</th>
                        <th style="width: 50px;">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in pncForm.items" :key="index" :class="{ 'scan-active-row': currentFocusIndex === index }">
                        <td class="text-center">{{ index + 1 }}</td>
                        <td>
                          <input
                            type="text"
                            v-model="item.partNumber"
                            placeholder="P/N"
                            :class="{ 'scan-active-field': currentFocusIndex === index && currentFocusField === 'partNumber' }"
                            @focus="currentFocusIndex = index; currentFocusField = 'partNumber'"
                            @input="item.partNumber = item.partNumber?.toUpperCase()"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            v-model="item.grn"
                            placeholder="GRN"
                            :class="{ 'scan-active-field': currentFocusIndex === index && currentFocusField === 'grn' }"
                            @focus="currentFocusIndex = index; currentFocusField = 'grn'"
                            @input="item.grn = item.grn?.toUpperCase()"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            v-model="item.batch"
                            placeholder="Batch"
                            :class="{ 'scan-active-field': currentFocusIndex === index && currentFocusField === 'batch' }"
                            @focus="currentFocusIndex = index; currentFocusField = 'batch'"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            v-model.number="item.quantity"
                            placeholder="数量"
                            min="0"
                            step="0.001"
                            :class="{ 'scan-active-field': currentFocusIndex === index && currentFocusField === 'quantity' }"
                            @focus="currentFocusIndex = index; currentFocusField = 'quantity'"
                          />
                        </td>
                        <td class="text-center">
                          <button type="button" class="btn-icon btn-delete" @click="removeItem(index)" title="删除">🗑️</button>
                        </td>
                      </tr>
                      <tr v-if="pncForm.items.length === 0">
                        <td colspan="6" class="empty-tip">暂无明细，请点击上方按钮添加</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 创建人 -->
              <div class="form-group">
                <label>创建人 <span class="required">*</span></label>
                <input type="text" v-model="pncForm.creatorName" placeholder="请输入创建人姓名" />
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-primary" @click="executePrint" :disabled="submitting">
                {{ submitting ? '处理中...' : '🖨️ 打印' }}
              </button>
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
            <!-- PNC转仓打印预览 -->
            <div class="pnc-preview">
              <div class="preview-content">
                <div class="preview-header">
                  <h2>PNC转仓单</h2>
                  <div class="preview-meta">
                    <span>单号: {{ generatedTransferNo || '自动生成' }}</span>
                    <span>转仓部门: {{ selectedDepartmentName || '待选择' }}</span>
                    <span>创建人: {{ pncForm.creatorName || '待输入' }}</span>
                  </div>
                </div>

                <div class="preview-section">
                  <div class="section-title">接收信息</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">接收人</span>
                      <span class="info-value">{{ selectedConfig?.recipientName || '-' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">联系电话</span>
                      <span class="info-value">{{ selectedConfig?.contactPhone || '-' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">接收地址</span>
                      <span class="info-value">{{ selectedConfig?.receivingAddress || '-' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">系统位置</span>
                      <span class="info-value">{{ selectedConfig?.systemLocation || '-' }}</span>
                    </div>
                  </div>
                </div>

                <div class="preview-section">
                  <div class="section-title">明细列表</div>
                  <table class="items-preview-table">
                    <thead>
                      <tr>
                        <th>序号</th>
                        <th>P/N</th>
                        <th>GRN</th>
                        <th>Batch</th>
                        <th>数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in pncForm.items" :key="index">
                        <td class="text-center">{{ index + 1 }}</td>
                        <td>{{ item.partNumber || '-' }}</td>
                        <td>{{ item.grn || '-' }}</td>
                        <td>{{ item.batch || '-' }}</td>
                        <td class="text-right">{{ item.quantity || '-' }}</td>
                      </tr>
                      <tr v-if="pncForm.items.length === 0">
                        <td colspan="5" class="empty-tip">暂无明细</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="preview-footer">
                  <div class="footer-text">© 广州捷普 {{ new Date().getFullYear() }}</div>
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
import { ref, computed, reactive, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { getActiveConfigs, PncTransferConfig } from '../api/pncTransferConfig';
import { formatShanghaiDate } from '../utils/dateUtils';
import { createDocument, sendEmail, getDocuments, getDocumentById, PncTransferDocument, GetDocumentsParams, recordPrint } from '../api/pncTransfer';
import { getDepartmentList, Department } from '../api/userManagement';
import * as XLSX from 'xlsx';

// PNC转仓表单数据
const pncForm = reactive({
  departmentId: '' as number | '',
  configId: '' as number | '',
  creatorName: '',
  items: [] as { batch: string; partNumber: string; grn: string; quantity: number }[]
});

// 获取当前登录用户
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

// 获取当前用户部门ID
const getCurrentUserDepartmentId = (): number | null => {
  const deptIdStr = localStorage.getItem('userDepartmentId');
  if (deptIdStr && deptIdStr !== 'null' && deptIdStr !== 'undefined' && deptIdStr !== '') {
    return parseInt(deptIdStr, 10);
  }
  return null;
};

// 部门列表
const departmentList = ref<Department[]>([]);

// 活跃配置列表
const activeConfigs = ref<PncTransferConfig[]>([]);

// 根据部门过滤的配置列表
const filteredConfigs = computed(() => {
  // 配置是通用的，没有按部门区分，显示所有启用的配置
  return activeConfigs.value.filter(c => c.isActive !== false);
});

// 选中的配置
const selectedConfig = computed(() => {
  if (!pncForm.configId) return null;
  return activeConfigs.value.find(c => c.id === pncForm.configId) || null;
});

// 选中的部门名称
const selectedDepartmentName = computed(() => {
  if (!pncForm.departmentId) return '';
  const dept = departmentList.value.find(d => d.id === pncForm.departmentId);
  return dept?.name || '';
});

// 生成的转仓单号
const generatedTransferNo = ref('');

// 邮件相关
const submitting = ref(false);

// 历史记录相关
const showHistory = ref(false);
const historyList = ref<PncTransferDocument[]>([]);
const historyPage = ref(1);
const historyPageSize = ref(10);
const historyTotal = ref(0);
const historySearch = reactive<{
  transferNo: string;
  creatorName: string;
  startDate: string;
  endDate: string;
}>({
  transferNo: '',
  creatorName: '',
  startDate: '',
  endDate: ''
});
const loadingHistory = ref(false);

// 批量选择相关
const selectedDocs = ref<PncTransferDocument[]>([]);
const isAllSelected = computed(() => {
  return historyList.value.length > 0 && selectedDocs.value.length === historyList.value.length;
});

// 全选/取消全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedDocs.value = [];
  } else {
    selectedDocs.value = [...historyList.value];
  }
};

// 批量打印
const batchPrint = async () => {
  if (selectedDocs.value.length === 0) {
    ElMessage.warning('请选择要打印的单据');
    return;
  }

  try {
    // 逐个打印选中的单据
    for (const doc of selectedDocs.value) {
      if (doc.id) {
        const fullDoc = await getDocumentById(doc.id);
        openPrintWindow(fullDoc);
        // 等待一下，避免打印窗口重叠
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    ElMessage.success(`已发送 ${selectedDocs.value.length} 份单据到打印机`);
    selectedDocs.value = [];
  } catch (error) {
    console.error('批量打印失败:', error);
    ElMessage.error('批量打印失败');
  }
};

// 详情弹窗相关
const showDetailDialog = ref(false);
const detailDialogDoc = ref<PncTransferDocument | null>(null);

// 加载历史记录
const loadHistory = async () => {
  loadingHistory.value = true;
  try {
    const params: GetDocumentsParams = {
      page: historyPage.value,
      pageSize: historyPageSize.value
    };
    if (historySearch.transferNo) {
      params.transferNo = historySearch.transferNo;
    }
    if (historySearch.creatorName) {
      params.creatorName = historySearch.creatorName;
    }
    if (historySearch.startDate) {
      params.startDate = historySearch.startDate;
    }
    if (historySearch.endDate) {
      params.endDate = historySearch.endDate;
    }
    const response = await getDocuments(params);
    historyList.value = response.items || [];
    historyTotal.value = response.total || 0;
  } catch (error) {
    console.error('加载历史记录失败:', error);
    ElMessage.error('加载历史记录失败');
  } finally {
    loadingHistory.value = false;
  }
};

// 格式化日期
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 补打功能 - 直接打开打印窗口，不填充表单
const rePrint = async (doc: PncTransferDocument) => {
  if (!doc.id) {
    ElMessage.error('单据ID不存在');
    return;
  }
  try {
    // 获取完整单据详情
    const fullDoc = await getDocumentById(doc.id);

    // 关闭历史记录面板
    showHistory.value = false;

    // 直接打开打印窗口并自动打印
    openPrintWindow(fullDoc);

  } catch (error) {
    console.error('加载单据失败:', error);
    ElMessage.error('加载单据失败');
  }
};

// 打开打印窗口 - 与预览区域样式一致
const openPrintWindow = (doc: PncTransferDocument) => {
  // 获取配置信息
  const config = activeConfigs.value.find((c) => c.id === doc.configId);

  // 记录打印次数（异步，不阻塞打印）
  if (doc.id) {
    recordPrint(doc.id).catch(err => console.error('记录打印次数失败:', err));
  }

  // 构建明细行
  const itemsHtml = doc.items.map((item, index) => `
    <tr>
      <td style="text-align:center">${index + 1}</td>
      <td>${item.partNumber || '-'}</td>
      <td>${item.grn || '-'}</td>
      <td>${item.batch || '-'}</td>
      <td style="text-align:right">${item.quantity || '-'}</td>
    </tr>
  `).join('');

  const printContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PNC转仓单</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 14px; padding: 20px; background: white; }
    .content { background: white; padding: 20px; border: 2px solid #333; }
    .header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #E5E7EB; margin-bottom: 12px; }
    .header h2 { margin: 0 0 8px 0; font-size: 24px; color: #111827; font-weight: 700; }
    .meta { display: flex; justify-content: center; gap: 30px; font-size: 16px; color: #374151; font-weight: 500; }
    .meta span { font-size: 16px; }
    .section { margin-bottom: 12px; }
    .section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #E5E7EB; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 16px; color: #6B7280; margin-bottom: 4px; }
    .info-value { font-size: 20px; color: #111827; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 6px; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; text-align: center; }
    .empty-row td { text-align: center; color: #9CA3AF; font-style: italic; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #9CA3AF; }
    .no-print { text-align: center; margin-top: 20px; }
    .no-print button { padding: 10px 30px; font-size: 14px; cursor: pointer; border: none; border-radius: 4px; }
    .btn-print { background: #0066CC; color: white; margin-right: 10px; }
    .btn-close { background: #6B7280; color: white; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="content">
    <div class="header">
      <h2>PNC转仓单</h2>
      <div class="meta">
        <span>单号: ${doc.transferNo}</span>
        <span>转仓部门: ${doc.departmentName || '待选择'}</span>
        <span>创建人: ${doc.creatorName}</span>
      </div>
    </div>
    <div class="section">
      <div class="section-title">接收信息</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">接收人</span>
          <span class="info-value">${config?.recipientName || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">联系电话</span>
          <span class="info-value">${config?.contactPhone || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">接收地址</span>
          <span class="info-value">${config?.receivingAddress || '-'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">系统位置</span>
          <span class="info-value">${config?.systemLocation || '-'}</span>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">明细列表</div>
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>P/N</th>
            <th>GRN</th>
            <th>Batch</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr class="empty-row"><td colspan="5">暂无明细</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="footer">© 广州捷普 ${new Date().getFullYear()}</div>
  </div>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ 打印</button>
    <button class="btn-close" onclick="window.close()">关闭</button>
  </div>
  <script>
    window.addEventListener('DOMContentLoaded', function() { window.print(); });
    window.addEventListener('afterprint', function() { window.close(); });
  <\/script>
</body>
</html>`;

  // 使用 iframe 方式打印，更快
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    // DOM 加载完成后立即打印
    const printFrame = () => {
      iframe.contentWindow?.print();
      // 打印完成后移除 iframe
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    // 尝试立即打印，如果失败则等待 load 事件
    try {
      iframe.contentWindow?.print();
    } catch {
      iframe.contentWindow?.addEventListener('load', printFrame);
    }
  } else {
    // fallback: 使用新窗口
    const printWindow = window.open('', '_blank', 'width=1,height=1');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  }
};

// 查看详情
const viewDetail = async (doc: PncTransferDocument) => {
  try {
    const fullDoc = await getDocumentById(doc.id!);
    detailDialogDoc.value = fullDoc;
    showDetailDialog.value = true;
  } catch (error) {
    console.error('查看详情失败:', error);
    ElMessage.error('查看详情失败');
  }
};

// 详情弹窗中的打印功能
const handleDetailPrint = () => {
  if (detailDialogDoc.value) {
    showDetailDialog.value = false;
    openPrintWindow(detailDialogDoc.value);
  }
};

// 导出历史记录为Excel
const exportHistory = async () => {
  if (historyList.value.length === 0) {
    ElMessage.warning('暂无记录可导出');
    return;
  }

  try {
    // 准备导出数据
    const exportData = historyList.value.map((doc, index) => ({
      '序号': (historyPage.value - 1) * historyPageSize.value + index + 1,
      '单号': doc.transferNo,
      '转仓部门': doc.departmentName || '-',
      '配置': doc.configName || '-',
      '创建人': doc.creatorName,
      '创建时间': formatDate(doc.createdAt),
      '状态': doc.status === 'sent' ? '已发送' : '已创建'
    }));

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '打印历史');

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 20 },  // 单号
      { wch: 15 },  // 转仓部门
      { wch: 20 },  // 配置
      { wch: 12 },  // 创建人
      { wch: 20 },  // 创建时间
      { wch: 10 }   // 状态
    ];

    // 生成文件名
    const fileName = `PNC转仓打印历史_${formatShanghaiDate().replace(/-/g, '')}.xlsx`;

    // 下载文件
    XLSX.writeFile(workbook, fileName);

    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败');
  }
};

// 扫码相关
const scanInput = ref('');
const scanInputRef = ref<HTMLInputElement | null>(null);
const currentFocusIndex = ref(0);
const currentFocusField = ref<'partNumber' | 'grn' | 'batch' | 'quantity'>('partNumber');
const lastScanInfo = ref<{ value: string; target: string } | null>(null);
const scanMode = ref<'A' | 'B'>('A'); // A模式: P/N→GRN→数量, B模式: P/N→GRN→Batch→数量

// A模式的字段顺序
const modeAFields: Array<'partNumber' | 'grn' | 'batch' | 'quantity'> = ['partNumber', 'grn', 'quantity'];

// B模式的字段顺序
const modeBFields: Array<'partNumber' | 'grn' | 'batch' | 'quantity'> = ['partNumber', 'grn', 'batch', 'quantity'];

// 获取当前模式的有效字段顺序
const getCurrentFields = () => {
  return scanMode.value === 'A' ? modeAFields : modeBFields;
};

// 获取下一个字段
const getNextField = (current: 'partNumber' | 'grn' | 'batch' | 'quantity') => {
  const fields = getCurrentFields();
  const currentIndex = fields.indexOf(current);
  if (currentIndex < fields.length - 1) {
    return fields[currentIndex + 1];
  }
  return null; // 已到最后字段
};

// 扫码输入框的占位符提示
const scanPlaceholder = computed(() => {
  if (pncForm.items.length === 0) {
    return '请先添加一行或开始扫描...';
  }
  return `扫码: ${getFieldLabel(currentFocusField.value)} (第${currentFocusIndex.value + 1}行)`;
});

// 获取字段中文标签
const getFieldLabel = (field: string) => {
  const labels: Record<string, string> = {
    partNumber: 'P/N',
    grn: 'GRN',
    batch: 'Batch',
    quantity: '数量'
  };
  return labels[field] || field;
};

// 处理扫码输入
const handleScanInput = () => {
  const value = scanInput.value.trim();
  if (!value) return;

  // 确保有明细行
  if (pncForm.items.length === 0) {
    addItem();
  }

  const currentItem = pncForm.items[currentFocusIndex.value];
  if (!currentItem) return;

  // 根据当前聚焦字段填入对应位置
  switch (currentFocusField.value) {
    case 'partNumber':
      currentItem.partNumber = value.toUpperCase();
      lastScanInfo.value = { value, target: `第${currentFocusIndex.value + 1}行 P/N` };
      break;
    case 'grn':
      currentItem.grn = value;
      lastScanInfo.value = { value, target: `第${currentFocusIndex.value + 1}行 GRN` };
      break;
    case 'batch':
      currentItem.batch = value;
      lastScanInfo.value = { value, target: `第${currentFocusIndex.value + 1}行 Batch` };
      break;
    case 'quantity':
      currentItem.quantity = parseFloat(value) || 0;
      lastScanInfo.value = { value, target: `第${currentFocusIndex.value + 1}行 数量` };
      break;
  }

  // 跳到下一个字段
  const nextField = getNextField(currentFocusField.value);
  if (nextField) {
    currentFocusField.value = nextField;
  } else {
    // 已到最后字段，添加新行并回到P/N
    addItem();
    currentFocusIndex.value = pncForm.items.length - 1;
    currentFocusField.value = 'partNumber';
  }

  // 清空扫码输入
  scanInput.value = '';

  // 聚焦回扫码输入框
  nextTick(() => {
    scanInputRef.value?.focus();
  });
};

// 跳过Batch，直接到数量（B模式专用）
const skipBatchAndGoToQuantity = () => {
  if (scanMode.value === 'A') {
    // A模式下，直接跳到数量
    if (currentFocusField.value === 'grn') {
      currentFocusField.value = 'quantity';
    }
  } else {
    // B模式下，跳过Batch字段
    if (currentFocusField.value === 'batch') {
      currentFocusField.value = 'quantity';
    }
  }
  scanInput.value = '';
  nextTick(() => {
    scanInputRef.value?.focus();
  });
};

// 页面加载时获取配置
const loadDepartments = async () => {
  try {
    const response = await getDepartmentList({});
    console.log('[loadDepartments] 响应:', response);
    // 响应拦截器已自动解包 data，直接使用 response.departments
    const data = response as { departments?: Department[] };
    if (data && Array.isArray(data.departments)) {
      departmentList.value = data.departments;
    } else if (Array.isArray(response)) {
      // 兼容直接返回数组的情况
      departmentList.value = response as Department[];
    }
    console.log('[loadDepartments] 部门列表:', departmentList.value);
  } catch (error) {
    console.error('加载部门失败:', error);
  }
};

// 加载活跃配置列表
const loadActiveConfigs = async () => {
  try {
    const response = await getActiveConfigs();
    activeConfigs.value = response || [];
  } catch (error) {
    console.error('加载配置失败:', error);
  }
};

// 部门变更
const onDepartmentChange = () => {
  // 部门变更时清空配置选择
  pncForm.configId = '';
  generatedTransferNo.value = '';
};

// 配置变更
const onConfigChange = () => {
  // 配置变更时可以重新生成单号
  generatedTransferNo.value = '';
};

// 添加明细项
const addItem = () => {
  pncForm.items.push({
    batch: '',
    partNumber: '',
    grn: '',
    quantity: 0
  });
};

// 删除明细项
const removeItem = (index: number) => {
  pncForm.items.splice(index, 1);
};

const executePrint = async () => {
  // 验证PNC表单
  if (!pncForm.departmentId) {
    ElMessage.warning('请选择转仓部门');
    return;
  }

  if (!pncForm.configId) {
    ElMessage.warning('请选择接收方配置');
    return;
  }

  if (!pncForm.creatorName.trim()) {
    ElMessage.warning('请输入创建人姓名');
    return;
  }

  // 过滤出有效的明细项（跳过空行）
  const validItems = pncForm.items.filter(item =>
    item && item.partNumber && item.partNumber.trim() && item.quantity && item.quantity > 0
  );

  if (validItems.length === 0) {
    ElMessage.warning('请添加至少一项有效的明细（P/N和数量不能为空）');
    return;
  }

  // 自动删除空行
  if (validItems.length < pncForm.items.length) {
    pncForm.items = validItems;
  }

  submitting.value = true;
  try {
    // 创建单据
    const response = await createDocument({
      configId: pncForm.configId as number,
      departmentId: pncForm.departmentId as number,
      departmentName: selectedDepartmentName.value,
      creatorName: pncForm.creatorName,
      items: pncForm.items.map((item, index) => ({
        sequenceNo: index + 1,
        batch: item.batch || undefined,
        partNumber: item.partNumber,
        grn: item.grn || undefined,
        quantity: item.quantity
      }))
    });

    const doc = response;

    // 打开打印窗口（新窗口打印，与补打功能一致）
    openPrintWindow(doc);

    // 发送邮件
    try {
      if (!doc.id) {
        throw new Error('单据ID不存在');
      }
      const emailData = await sendEmail(doc.id);

      // 打开邮件客户端
      if (emailData.mailtoLink) {
        window.open(emailData.mailtoLink, '_self');
      }

      ElMessage.success(`转仓单 ${doc.transferNo} 已创建并发送邮件`);
    } catch (emailError: unknown) {
      console.error('发送邮件失败:', emailError);
      const message = emailError instanceof Error ? emailError.message : '未知错误';
      ElMessage.warning(`转仓单 ${doc.transferNo} 已创建并触发打印，但邮件发送失败: ${message}`);
    }

    // 重置表单
    pncForm.departmentId = '';
    pncForm.configId = '';
    pncForm.items = [];
    pncForm.creatorName = '';

  } catch (error: unknown) {
    console.error('创建单据失败:', error);
    const message = error instanceof Error ? error.message : '创建单据失败';
    ElMessage.error(message);
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  // 先加载部门列表
  await loadDepartments();
  await loadActiveConfigs();

  // 自动填充当前登录用户
  const currentUser = getCurrentUser();
  if (currentUser) {
    pncForm.creatorName = currentUser.realName || currentUser.username || '';
  }

  // 自动选择当前用户所属部门
  const currentDeptId = getCurrentUserDepartmentId();
  if (currentDeptId) {
    const deptId = Number(currentDeptId);
    // 确保部门列表中有这个部门才设置
    if (departmentList.value.some(d => d.id === deptId)) {
      pncForm.departmentId = deptId;
    }
  }

  // 自动聚焦到扫码输入框
  nextTick(() => {
    scanInputRef.value?.focus();
  });
});
</script>

<style scoped>
.convenient-print-container {
  padding: 20px 24px 24px 24px;
  background-color: #F9FAFB;
  height: calc(100vh - 112px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  padding: 0 0 16px 0;
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
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.print-config-panel,
.print-preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.panel-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.config-section {
  margin-bottom: 16px;
}

.config-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
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

.required {
  color: #EF4444;
}

/* PNC转仓打印样式 */
.config-detail {
  background-color: #F9FAFB;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  padding: 4px 0;
  font-size: 13px;
}

.detail-label {
  color: #6B7280;
  width: 60px;
}

.detail-value {
  color: #111827;
  flex: 1;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.btn-add-item {
  padding: 4px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: #FFFFFF;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: all 0.2s;
}

.btn-add-item:hover {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

/* 扫码输入区域 */
.scan-input-area {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px dashed #0ea5e9;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.scan-mode-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #0ea5e9;
}

.scan-mode-selector > label:first-child {
  font-size: 13px;
  color: #0369a1;
  font-weight: 500;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #0369a1;
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.radio-label input[type="radio"]:checked + span:first-of-type {
  font-weight: 600;
  color: #0284c7;
}

.mode-desc {
  font-size: 11px;
  color: #64748b;
  margin-left: 4px;
}

.scan-hint {
  font-size: 13px;
  color: #0369a1;
  margin-bottom: 8px;
  font-weight: 500;
}

.scan-input-row {
  display: flex;
  gap: 8px;
}

.scan-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #0ea5e9;
  border-radius: 6px;
  font-size: 15px;
  font-family: 'Consolas', 'Monaco', monospace;
  background-color: #fff;
}

.scan-input:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
}

.btn-scan {
  padding: 10px 16px;
  background-color: #0ea5e9;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-scan:hover {
  background-color: #0284c7;
}

.btn-scan-next {
  padding: 10px 12px;
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-scan-next:hover {
  background-color: #d97706;
}

.scan-status {
  margin-top: 8px;
  font-size: 12px;
  color: #0369a1;
}

.scan-status strong {
  color: #0284c7;
}

/* 扫码高亮样式 */
.scan-active-row {
  background-color: #fef3c7 !important;
}

.scan-active-field {
  border-color: #f59e0b !important;
  background-color: #fffbeb !important;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

.items-table {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
}

.items-table table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  font-size: 13px;
}

.items-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
}

.items-table tbody tr:last-child td {
  border-bottom: none;
}

.items-table input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.items-table input:focus {
  outline: none;
  border-color: #0066CC;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #EEF2FF;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.batch-actions span {
  color: #4338CA;
  font-weight: 500;
}

.btn-batch-print {
  padding: 6px 16px;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.btn-batch-print:hover {
  background: #4338C8;
}

.btn-batch-cancel {
  padding: 6px 16px;
  background: white;
  color: #6B7280;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-batch-cancel:hover {
  background: #F3F4F6;
}

/* 详情弹窗样式 */
.detail-content {
  padding: 0 4px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E5E7EB;
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.detail-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  gap: 8px;
}

.detail-label {
  color: #6B7280;
  font-size: 14px;
  min-width: 70px;
}

.detail-value {
  color: #111827;
  font-size: 14px;
  font-weight: 500;
}

.detail-items h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #374151;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.detail-table th,
.detail-table td {
  border: 1px solid #E5E7EB;
  padding: 8px;
  text-align: left;
}

.detail-table th {
  background: #F9FAFB;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-print-action {
  background: #0066CC;
  color: white;
  border: none;
}

.btn-print-action:hover {
  background: #0052A3;
}

.empty-tip {
  color: #9CA3AF;
  font-style: italic;
  text-align: center;
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

/* PNC预览样式 */
.pnc-preview {
  background-color: #E5E7EB;
  padding: 16px;
  border-radius: 8px;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.pnc-preview .preview-content {
  background-color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.pnc-preview .preview-header {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #E5E7EB;
  margin-bottom: 12px;
}

.pnc-preview .preview-header h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #111827;
}

.pnc-preview .preview-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6B7280;
}

.pnc-preview .preview-section {
  margin-bottom: 12px;
}

.pnc-preview .section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #E5E7EB;
}

.pnc-preview .info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.pnc-preview .info-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pnc-preview .info-label {
  font-size: 11px;
  color: #6B7280;
}

.pnc-preview .info-value {
  font-size: 12px;
  color: #111827;
}

.items-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.items-preview-table th,
.items-preview-table td {
  padding: 6px 8px;
  border: 1px solid #E5E7EB;
  text-align: left;
}

.items-preview-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
}

.pnc-preview .preview-footer {
  text-align: center;
  padding-top: 12px;
  border-top: 2px solid #E5E7EB;
  margin-top: 12px;
}

.pnc-preview .footer-text {
  font-size: 11px;
  color: #9CA3AF;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* 打印样式 - 只打印预览区域 */
@media print {
  body {
    background: white !important;
  }

  /* 隐藏整个布局结构 - 只打印预览内容 */
  .main-header,
  .sidebar,
  .print-config-panel,
  .breadcrumb,
  .page-header,
  .action-buttons,
  .btn,
  .scan-input-area,
  .items-table,
  .config-detail,
  .history-toggle-btn,
  .history-panel,
  .form-group:not(.print-hidden) {
    display: none !important;
  }

  .convenient-print-container {
    padding: 0 !important;
    background: white !important;
    height: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }

  /* 确保预览内容填满整个打印页面 */
  .print-preview-panel,
  .print-layout,
  .panel-card,
  .panel-body {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  .pnc-preview {
    padding: 20px !important;
  }

  .preview-content {
    border: 2px solid #333 !important;
    padding: 20px !important;
  }
}

.btn {
  flex: 1;
  padding: 10px 16px;
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

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 历史记录面板 */
.history-toggle-btn {
  position: fixed;
  top: 120px;
  right: 20px;
  z-index: 100;
  padding: 10px 16px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
  transition: all 0.2s;
}

.history-toggle-btn:hover {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4);
}

.history-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.history-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.history-panel > .history-header {
  flex-shrink: 0;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-panel > .history-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 24px 20px 24px;
}

.history-header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.history-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: white;
  border: 1px solid #E5E7EB;
  font-size: 20px;
  cursor: pointer;
  color: #6B7280;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 11;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.history-close-btn:hover {
  background-color: #FEE2E2;
  color: #EF4444;
  border-color: #FECACA;
  transform: scale(1.05);
}

.history-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.history-search {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  width: 180px;
}

.history-date {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
}

.btn-search {
  padding: 8px 16px;
  background-color: #0066CC;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-search:hover {
  background-color: #0052A3;
}

.btn-export {
  padding: 8px 16px;
  background-color: #059669;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background-color: #047857;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.history-table th,
.history-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  font-size: 14px;
}

.history-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  position: sticky;
  top: 0;
}

.history-table tbody tr:hover {
  background-color: #F9FAFB;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-sent {
  background-color: #D1FAE5;
  color: #065F46;
}

.status-created {
  background-color: #DBEAFE;
  color: #1E40AF;
}

.btn-action {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background-color: #EFF6FF;
  color: #0066CC;
  transition: all 0.2s;
  margin-right: 4px;
}

.btn-action:hover {
  background-color: #DBEAFE;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.history-pagination button {
  padding: 6px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.history-pagination button:hover:not(:disabled) {
  background-color: #F3F4F6;
}

.history-pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
