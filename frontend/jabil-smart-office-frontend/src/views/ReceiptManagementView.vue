<template>
  <div class="receipt-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">单据接收</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📦 单据管理</div>
        <div class="table-card-actions">
          <button class="btn btn-primary" @click="openAddReceiptDialog">➕新增单据</button>
          <button class="btn btn-secondary" @click="batchConfirm">✓批量确认</button>
          <button class="btn btn-secondary" @click="exportData">📤导出</button>
        </div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>单据编号</label>
            <input type="text" v-model="searchQuery.id" placeholder="请输入单据编号">
          </div>
          <div class="search-item">
            <label>状态</label>
            <select v-model="searchQuery.status">
              <option value="">全部</option>
              <option value="pending">待接收</option>
              <option value="received">已接收</option>
              <option value="processed">已处理</option>
              <option value="error">异常</option>
            </select>
          </div>
          <div class="search-item">
            <label>日期范围</label>
            <input type="date" v-model="searchQuery.startDate">
            <input type="date" v-model="searchQuery.endDate">
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input type="checkbox" v-model="selectAll" @change="toggleSelectAll">
                </th>
                <th>ID</th>
                <th>单据编号</th>
                <th>类型</th>
                <th>状态</th>
                <th>来源</th>
                <th>接收人</th>
                <th>接收时间</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="receipt in receipts" :key="receipt.id" @click="selectReceipt(receipt)" :class="{ 'selected': selectedReceipt && selectedReceipt.id === receipt.id }">
                <td>
                  <input type="checkbox" :value="receipt.id" v-model="selectedIds" @click.stop>
                </td>
                <td>{{ receipt.id }}</td>
                <td>{{ receipt.receiptNo }}</td>
                <td>{{ receipt.type }}</td>
                <td>
                  <span class="status-badge" :class="getStatusClass(receipt.status)">{{ getStatusText(receipt.status) }}</span>
                </td>
                <td>{{ receipt.source }}</td>
                <td>{{ receipt.receiver || '-' }}</td>
                <td>{{ receipt.receivedAt || '-' }}</td>
                <td>{{ receipt.remark || '-' }}</td>
                <td>
                  <div class="table-actions">
                    <button v-if="receipt.status === 'pending'" class="action-btn primary" @click.stop="confirmReceipt(receipt)">确认接收</button>
                    <button class="action-btn edit" @click.stop="openEditReceiptDialog">编辑</button>
                    <button class="action-btn delete" @click.stop="deleteReceipt">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, receipts.length) }} 条，共 {{ receipts.length }} 条</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Receipt Dialog -->
    <div v-if="isReceiptDialogOpen" class="dialog-overlay" @click.self="closeReceiptDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ isEditMode ? '编辑单据' : '新增单据' }}</h3>
          <button class="dialog-close" @click="closeReceiptDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="saveReceipt">
            <div class="form-group">
              <label>单据编号:</label>
              <input type="text" v-model="currentReceipt.receiptNo" required>
            </div>
            <div class="form-group">
              <label>单据类型:</label>
              <select v-model="currentReceipt.type" required>
                <option value="">请选择</option>
                <option value="delivery">送货单</option>
                <option value="receiving">收货单</option>
                <option value="return">退货单</option>
                <option value="transfer">调拨单</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label>来源:</label>
              <input type="text" v-model="currentReceipt.source" required>
            </div>
            <div class="form-group">
              <label>状态:</label>
              <select v-model="currentReceipt.status">
                <option value="pending">待接收</option>
                <option value="received">已接收</option>
                <option value="processed">已处理</option>
                <option value="error">异常</option>
              </select>
            </div>
            <div class="form-group">
              <label>备注:</label>
              <textarea v-model="currentReceipt.remark" rows="3"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeReceiptDialog">取消</button>
          <button class="btn btn-primary" @click="saveReceipt">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

interface Receipt {
  id: number;
  receiptNo: string;
  type: string;
  status: string;
  source: string;
  receiver?: string;
  receivedAt?: string;
  remark?: string;
}

const receipts = ref<Receipt[]>([]);
const isLoading = ref(false);
const selectAll = ref(false);
const selectedIds = ref<number[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const isReceiptDialogOpen = ref(false);
const isEditMode = ref(false);
const selectedReceipt = ref<Receipt | null>(null);
const currentReceipt = ref<Receipt>({
  id: 0,
  receiptNo: '',
  type: '',
  status: 'pending',
  source: ''
});

const searchQuery = reactive({
  id: '',
  status: '',
  startDate: '',
  endDate: ''
});

const totalPages = computed(() => Math.max(1, Math.ceil(receipts.value.length / pageSize.value)));

const loadReceipts = async () => {
  isLoading.value = true;
  try {
    const response = await fetch('/api/receipts');
    if (!response.ok) {
      throw new Error('网络响应异常');
    }
    const data = await response.json();
    receipts.value = data.receipts; // Assuming the API returns { receipts: [...] }
    ElMessage.success('单据数据加载成功');
  } catch (error) {
    ElMessage.error('加载单据数据失败，请检查后端服务。');
    // Fallback to local mock data if API fails (for development/demo)
    receipts.value = [
      { id: 1, receiptNo: 'REC202406001', type: 'delivery', status: 'pending', source: '供应商A', remark: '电子元件一批' },
      { id: 2, receiptNo: 'REC202406002', type: 'receiving', status: 'received', source: '仓库', receiver: '张三', receivedAt: '2024-06-25 10:30:00', remark: '物料验收' },
      { id: 3, receiptNo: 'REC202406003', type: 'return', status: 'processed', source: '客户B', receiver: '李四', receivedAt: '2024-06-24 14:20:00', remark: '质量问题退货' },
      { id: 4, receiptNo: 'REC202406004', type: 'transfer', status: 'error', source: '生产车间', remark: '单据异常' },
    ];
  } finally {
    isLoading.value = false;
  }
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'warning',
    'received': 'success',
    'processed': 'info',
    'error': 'danger'
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'pending': '待接收',
    'received': '已接收',
    'processed': '已处理',
    'error': '异常'
  };
  return map[status] || status;
};

const openAddReceiptDialog = () => {
  isEditMode.value = false;
  currentReceipt.value = { id: 0, receiptNo: '', type: '', status: 'pending', source: '' };
  isReceiptDialogOpen.value = true;
};

const openEditReceiptDialog = () => {
  if (selectedReceipt.value) {
    isEditMode.value = true;
    currentReceipt.value = { ...selectedReceipt.value };
    isReceiptDialogOpen.value = true;
  }
};

const closeReceiptDialog = () => {
  isReceiptDialogOpen.value = false;
};

const saveReceipt = async () => {
  isLoading.value = true;
  try {
    let response;
    let method;
    let url;

    if (isEditMode.value) {
      method = 'PUT';
      url = `/receipts/${currentReceipt.value.id}`;
    } else {
      method = 'POST';
      url = '/receipts';
    }

    response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentReceipt.value)
    });

    if (!response.ok) {
      throw new Error('操作失败');
    }

    const data = await response.json();

    if (isEditMode.value) {
      const index = receipts.value.findIndex(r => r.id === currentReceipt.value.id);
      if (index !== -1) {
        receipts.value[index] = data.receipt; // Assuming API returns updated receipt
      }
      ElMessage.success('单据更新成功');
    } else {
      receipts.value.unshift(data.receipt); // Assuming API returns new receipt with ID
      ElMessage.success('单据新增成功');
    }
    closeReceiptDialog();
  } catch (error) {
    ElMessage.error('保存失败，请稍后重试');
  } finally {
    isLoading.value = false;
  }
};

const selectReceipt = (receipt: Receipt) => {
  selectedReceipt.value = receipt;
};

const confirmReceipt = async (receipt: Receipt) => {
  isLoading.value = true;
  try {
    const response = await fetch(`/api/receipts/${receipt.id}/confirm`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver: '当前用户', receivedAt: new Date().toISOString() })
    });

    if (!response.ok) {
      throw new Error('确认接收失败');
    }

    const data = await response.json();
    const index = receipts.value.findIndex(r => r.id === receipt.id);
    if (index !== -1) {
      receipts.value[index] = data.receipt; // Assuming API returns updated receipt
    }
    ElMessage.success('单据确认接收成功');
  } catch (error) {
    ElMessage.error('确认接收失败，请稍后重试');
  } finally {
    isLoading.value = false;
  }
};

const deleteReceipt = async () => {
  if (selectedReceipt.value) {
    ElMessageBox.confirm(
      '确定要删除这条单据吗？此操作不可恢复！',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        isLoading.value = true;
        try {
          const response = await fetch(`/api/receipts/${selectedReceipt.value!.id}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            throw new Error('删除失败');
          }
          receipts.value = receipts.value.filter(r => r.id !== selectedReceipt.value!.id);
          selectedReceipt.value = null;
          ElMessage.success('删除成功');
        } catch (error) {
          ElMessage.error('删除失败，请稍后重试');
        } finally {
          isLoading.value = false;
        }
      })
      .catch(() => {
        ElMessage.info('已取消删除');
      });
  }
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = receipts.value.map(r => r.id);
  } else {
    selectedIds.value = [];
  }
};

const batchConfirm = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要批量确认接收的单据');
    return;
  }

  ElMessageBox.confirm(
    `确定要批量确认接收这 ${selectedIds.value.length} 条单据吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      isLoading.value = true;
      try {
        const response = await fetch('/api/receipts/batch-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds.value })
        });

        if (!response.ok) {
          throw new Error('批量确认失败');
        }

        // Assuming the API returns the updated receipts or a success message
        // Reloading data to reflect changes
        await loadReceipts();
        ElMessage.success('批量确认接收成功');
        selectedIds.value = [];
        selectAll.value = false;
      } catch (error) {
        ElMessage.error('批量确认失败，请稍后重试');
      } finally {
        isLoading.value = false;
      }
    })
    .catch(() => {
      ElMessage.info('已取消批量确认');
    });
};

const exportData = () => {
  ElMessage.warning('导出功能暂未实现。');
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.id = '';
  searchQuery.status = '';
  searchQuery.startDate = '';
  searchQuery.endDate = '';
  currentPage.value = 1;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

onMounted(() => {
  loadReceipts();
});
</script>

<style scoped>
.receipt-management-container {
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
  padding: 8px 0 16px 0;
  margin-bottom: 0;
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

.table-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.card-body {
  padding: 24px;
}

.search-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.search-item input,
.search-item select {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus,
.search-item select:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-actions {
  display: flex;
  gap: 12px;
}

.table-container {
  overflow-x: auto;
  position: relative;
}

.table-container[v-loading]::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-container[v-loading]::after {
  content: '加载中...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 11;
  color: #0066CC;
  font-size: 14px;
  font-weight: 500;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  border-bottom: 2px solid #E5E7EB;
}

.data-table td {
  color: #4B5563;
  font-size: 14px;
  border-bottom: 1px solid #F3F4F6;
}

.data-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.data-table tbody tr.selected {
  background-color: #EFF6FF;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #D1FAE5;
  color: #065F46;
}

.status-badge.warning {
  background-color: #FEF3C7;
  color: #D97706;
}

.status-badge.info {
  background-color: #DBEAFE;
  color: #1E40AF;
}

.status-badge.danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
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

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.primary:hover {
  background-color: #DBEAFE;
}

.action-btn.edit {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.edit:hover {
  background-color: #DBEAFE;
}

.action-btn.delete {
  background-color: #FEF2F2;
  color: #DC2626;
}

.action-btn.delete:hover {
  background-color: #FEE2E2;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  background-color: white;
  color: #4B5563;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #4B5563;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
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
  background: transparent;
  font-size: 24px;
  color: #6B7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background-color: #F3F4F6;
  color: #374151;
}

.dialog-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}
</style>
