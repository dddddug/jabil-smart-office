<template>
  <div class="expired-material-extension-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">库存管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">过期料延期</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📦 过期料延期管理</div>
      </div>
      <div class="card-body">
        <div class="search-bar">
          <div class="search-item">
            <label>物料名称</label>
            <input type="text" v-model="searchQuery.materialName" placeholder="请输入物料名称" />
          </div>
          <div class="search-item">
            <label>物料编码</label>
            <input type="text" v-model="searchQuery.materialCode" placeholder="请输入物料编码" />
          </div>
          <div class="search-item">
            <label>过期日期</label>
            <input type="date" v-model="searchQuery.expirationDate" />
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
                <th>ID</th>
                <th>物料名称</th>
                <th>物料编码</th>
                <th>批次号</th>
                <th>数量</th>
                <th>单位</th>
                <th>生产日期</th>
                <th>过期日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="material in paginatedMaterials" :key="material.id">
                <td>{{ material.id }}</td>
                <td>{{ material.materialName }}</td>
                <td>{{ material.materialCode }}</td>
                <td>{{ material.batchNumber }}</td>
                <td>{{ material.quantity }}</td>
                <td>{{ material.unit }}</td>
                <td>{{ material.manufactureDate }}</td>
                <td>
                  <span class="status-badge" :class="getExpirationClass(material.expirationDate)">
                    {{ material.expirationDate }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusClass(material.status)">
                    {{ material.status }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn primary" @click="applyForExtension(material)">申请延期</button>
                    <button class="action-btn secondary" @click="viewExtensionRecords(material)">延期记录</button>
                    <button class="action-btn delete" @click="handleDeleteMaterial(material)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">共 {{ filteredMaterials.length }} 条记录</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="extensionDialogVisible" class="dialog-overlay" @click.self="closeExtensionDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>申请物料延期</h3>
          <button class="dialog-close" @click="closeExtensionDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="submitExtensionApplication">
            <div class="form-group">
              <label>物料名称</label>
              <input type="text" v-model="extensionForm.materialName" disabled />
            </div>
            <div class="form-group">
              <label>物料编码</label>
              <input type="text" v-model="extensionForm.materialCode" disabled />
            </div>
            <div class="form-group">
              <label>原过期日期</label>
              <input type="text" v-model="extensionForm.originalExpirationDate" disabled />
            </div>
            <div class="form-group">
              <label>申请延期至 *</label>
              <input type="date" v-model="extensionForm.newExpirationDate" :min="extensionForm.originalExpirationDate" required />
            </div>
            <div class="form-group">
              <label>延期原因 *</label>
              <textarea v-model="extensionForm.reason" placeholder="请输入延期原因" required rows="4"></textarea>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeExtensionDialog">取消</button>
          <button class="btn btn-primary" @click="submitExtensionApplication">提交申请</button>
        </div>
      </div>
    </div>

    <div v-if="recordsDialogVisible" class="dialog-overlay" @click.self="closeRecordsDialog">
      <div class="dialog-content records-dialog">
        <div class="dialog-header">
          <h3>物料延期记录</h3>
          <button class="dialog-close" @click="closeRecordsDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>申请人</th>
                  <th>申请日期</th>
                  <th>原过期日期</th>
                  <th>新过期日期</th>
                  <th>延期原因</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in currentMaterialExtensionRecords" :key="record.id">
                  <td>{{ record.applicant }}</td>
                  <td>{{ record.applicationDate }}</td>
                  <td>{{ record.originalExpirationDate }}</td>
                  <td>{{ record.newExpirationDate }}</td>
                  <td>{{ record.reason }}</td>
                  <td>
                    <span class="status-badge" :class="getStatusClass(record.status)">
                      {{ record.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeRecordsDialog">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';

interface ExpiredMaterial {
  id: string;
  materialName: string;
  materialCode: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  manufactureDate: string;
  expirationDate: string;
  status: '正常' | '即将过期' | '已过期' | '已延期' | '延期申请中';
}

interface ExtensionRequest {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  applicant: string;
  applicationDate: string;
  originalExpirationDate: string;
  newExpirationDate: string;
  reason: string;
  status: '待审批' | '已批准' | '已拒绝';
}

const mockMaterials = ref<ExpiredMaterial[]>([
  {
    id: 'M001',
    materialName: '原料A',
    materialCode: 'RA001',
    batchNumber: '20230101-001',
    quantity: 100,
    unit: 'kg',
    manufactureDate: '2023-01-01',
    expirationDate: '2024-07-01',
    status: '正常',
  },
  {
    id: 'M002',
    materialName: '原料B',
    materialCode: 'RB002',
    batchNumber: '20230201-002',
    quantity: 200,
    unit: 'pcs',
    manufactureDate: '2023-02-01',
    expirationDate: '2024-06-30',
    status: '即将过期',
  },
  {
    id: 'M003',
    materialName: '原料C',
    materialCode: 'RC003',
    batchNumber: '20220301-003',
    quantity: 50,
    unit: 'm',
    manufactureDate: '2022-03-01',
    expirationDate: '2024-01-01',
    status: '已过期',
  },
  {
    id: 'M004',
    materialName: '原料D',
    materialCode: 'RD004',
    batchNumber: '20230401-004',
    quantity: 150,
    unit: 'L',
    manufactureDate: '2023-04-01',
    expirationDate: '2024-08-01',
    status: '正常',
  },
  {
    id: 'M005',
    materialName: '原料E',
    materialCode: 'RE005',
    batchNumber: '20230501-005',
    quantity: 80,
    unit: 'kg',
    manufactureDate: '2023-05-01',
    expirationDate: '2024-07-25',
    status: '延期申请中',
  },
]);

const mockExtensionRequests = ref<ExtensionRequest[]>([
  {
    id: 'ER001',
    materialId: 'M005',
    materialName: '原料E',
    materialCode: 'RE005',
    applicant: '张三',
    applicationDate: '2024-07-01',
    originalExpirationDate: '2024-07-25',
    newExpirationDate: '2024-10-25',
    reason: '项目紧急，需要延期使用',
    status: '待审批',
  },
]);

const searchQuery = reactive({
  materialName: '',
  materialCode: '',
  expirationDate: '',
});

const filteredMaterials = computed(() => {
  return mockMaterials.value.filter((material) => {
    const nameMatch = searchQuery.materialName
      ? material.materialName.includes(searchQuery.materialName)
      : true;
    const codeMatch = searchQuery.materialCode
      ? material.materialCode.includes(searchQuery.materialCode)
      : true;
    const expirationMatch = searchQuery.expirationDate
      ? material.expirationDate === searchQuery.expirationDate
      : true;
    return nameMatch && codeMatch && expirationMatch;
  });
});

const currentPage = ref(1);
const pageSize = ref(10);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredMaterials.value.length / pageSize.value));
});

const paginatedMaterials = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredMaterials.value.slice(start, end);
});

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
};

const resetSearch = () => {
  searchQuery.materialName = '';
  searchQuery.materialCode = '';
  searchQuery.expirationDate = '';
  currentPage.value = 1;
};

const getExpirationClass = (date: string) => {
  const today = dayjs();
  const expiration = dayjs(date);
  if (expiration.isBefore(today, 'day')) {
    return 'danger';
  } else if (expiration.diff(today, 'day') <= 30) {
    return 'warning';
  }
  return 'success';
};

const getStatusClass = (status: string) => {
  switch (status) {
    case '已过期':
    case '已拒绝':
      return 'danger';
    case '即将过期':
    case '待审批':
    case '延期申请中':
      return 'warning';
    case '正常':
    case '已延期':
    case '已批准':
      return 'success';
    default:
      return 'default';
  }
};

const extensionDialogVisible = ref(false);
const extensionForm = reactive({
  materialId: '',
  materialName: '',
  materialCode: '',
  originalExpirationDate: '',
  newExpirationDate: '',
  reason: '',
});

const applyForExtension = (material: ExpiredMaterial) => {
  extensionForm.materialId = material.id;
  extensionForm.materialName = material.materialName;
  extensionForm.materialCode = material.materialCode;
  extensionForm.originalExpirationDate = material.expirationDate;
  extensionForm.newExpirationDate = '';
  extensionForm.reason = '';
  extensionDialogVisible.value = true;
};

const submitExtensionApplication = () => {
  if (!extensionForm.newExpirationDate || !extensionForm.reason) {
    ElMessage.warning('请填写完整信息！');
    return;
  }

  const newRequest: ExtensionRequest = {
    id: `ER${String(mockExtensionRequests.value.length + 1).padStart(3, '0')}`,
    materialId: extensionForm.materialId,
    materialName: extensionForm.materialName,
    materialCode: extensionForm.materialCode,
    applicant: '当前用户',
    applicationDate: dayjs().format('YYYY-MM-DD'),
    originalExpirationDate: extensionForm.originalExpirationDate,
    newExpirationDate: extensionForm.newExpirationDate,
    reason: extensionForm.reason,
    status: '待审批',
  };
  mockExtensionRequests.value.push(newRequest);

  const materialIndex = mockMaterials.value.findIndex(
    (m) => m.id === extensionForm.materialId
  );
  if (materialIndex !== -1) {
    const material = mockMaterials.value[materialIndex];
    if (material) {
      material.status = '延期申请中';
    }
  }

  ElMessage.success('延期申请已提交！');
  extensionDialogVisible.value = false;
};

const closeExtensionDialog = () => {
  extensionDialogVisible.value = false;
};

const recordsDialogVisible = ref(false);
const currentMaterialExtensionRecords = ref<ExtensionRequest[]>([]);

const viewExtensionRecords = (material: ExpiredMaterial) => {
  currentMaterialExtensionRecords.value = mockExtensionRequests.value.filter(
    (req) => req.materialId === material.id
  );
  recordsDialogVisible.value = true;
};

const closeRecordsDialog = () => {
  recordsDialogVisible.value = false;
  currentMaterialExtensionRecords.value = [];
};

const handleDeleteMaterial = (material: ExpiredMaterial) => {
  ElMessageBox.confirm(
    `确定要删除物料 "${material.materialName}" (ID: ${material.id}) 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      const index = mockMaterials.value.findIndex((m) => m.id === material.id);
      if (index !== -1) {
        mockMaterials.value.splice(index, 1);
        mockExtensionRequests.value = mockExtensionRequests.value.filter(
          (req) => req.materialId !== material.id
        );
        ElMessage.success('物料删除成功！');
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
};
</script>

<style scoped>
.expired-material-extension-container {
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
  min-width: 200px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.search-item input {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus {
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
  transition: background-color 0.2s;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
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
  color: #92400E;
}

.status-badge.danger {
  background-color: #FEE2E2;
  color: #991B1B;
}

.status-badge.default {
  background-color: #F3F4F6;
  color: #4B5563;
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

.action-btn.secondary {
  background-color: #F3F4F6;
  color: #4B5563;
}

.action-btn.secondary:hover {
  background-color: #E5E7EB;
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

.dialog-content.records-dialog {
  width: 700px;
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
.form-group textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-group input:disabled {
  background-color: #F3F4F6;
  color: #9CA3AF;
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
