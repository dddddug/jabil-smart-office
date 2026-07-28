<template>
  <div class="da-material-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">管控物料 单据管理</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="loadDocuments" :disabled="isLoading">
          <span :class="{ 'spin': isLoading }">🔄</span>
          {{ isLoading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 统计卡片 - 核心流程 -->
    <div class="stats-cards">
      <div
        class="stat-card stat-card-orange"
        :class="{ 'stat-card-active': selectedStatus === 'submitted' }"
        @click="filterByStatus('submitted')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">📋</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.submitted }}</div>
          <div class="stat-label">待接收</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-blue"
        :class="{ 'stat-card-active': selectedStatus === 'received' }"
        @click="filterByStatus('received')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">📦</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.received }}</div>
          <div class="stat-label">待发料</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-green"
        :class="{ 'stat-card-active': selectedStatus === 'material_issued' }"
        @click="filterByStatus('material_issued')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">🔓</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.material_issued }}</div>
          <div class="stat-label">待签收</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-cyan"
        :class="{ 'stat-card-active': selectedStatus === 'completed' }"
        @click="filterByStatus('completed')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">🎉</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="tabs-container">
      <div class="tabs-header">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 表格卡片 -->
    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📦 {{ currentTabTitle }}</div>
        <div class="table-card-actions">
          <!-- 提交标签页显示新增按钮 -->
          <button v-if="activeTab === 'submit'" class="btn btn-primary" @click="openSubmitDialog">
            ➕ 提交单据
          </button>
          <button class="btn btn-secondary" @click="exportData">📤 导出</button>
        </div>
      </div>
      <div class="card-body">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-item">
            <div class="search-item-wrapper">
              <label>单号</label>
              <input type="text" v-model="searchQuery.documentNo" placeholder="请输入单号">
            </div>
          </div>
          <div class="search-item">
            <div class="search-item-wrapper">
              <label>W/C名称</label>
              <input type="text" v-model="searchQuery.wcName" placeholder="请输入W/C名称">
            </div>
          </div>
          <div class="search-item">
            <div class="search-item-wrapper">
              <label>提交人</label>
              <input type="text" v-model="searchQuery.submitterName" placeholder="请输入提交人">
            </div>
          </div>
          <div class="search-item date-range-item">
            <div class="date-range-wrapper">
              <label>日期范围</label>
              <div class="date-range-inputs">
                <input type="date" v-model="searchQuery.startDate">
                <span class="date-separator">至</span>
                <input type="date" v-model="searchQuery.endDate">
              </div>
            </div>
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" @click="handleSearch">查询</button>
            <button class="btn btn-secondary" @click="resetSearch">重置</button>
          </div>
        </div>

        <!-- 数据表格 -->
        <div class="table-container" v-loading="isLoading">
          <table class="data-table">
            <thead>
              <tr>
                <th>单号</th>
                <th>W/C名称</th>
                <th>DA编号</th>
                <th>ECN编号</th>
                <th>管控类型</th>
                <th>提交人</th>
                <th>提交时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td>{{ doc.documentNo }}</td>
                <td>{{ doc.wcName }}</td>
                <td>{{ doc.daNo }}</td>
                <td>{{ doc.ecnNo || '-' }}</td>
                <td>{{ doc.controlType || '-' }}</td>
                <td>{{ doc.submitterName }}</td>
                <td>{{ formatDateTime(doc.submittedAt) }}</td>
                <td>
                  <span class="status-badge" :style="{ backgroundColor: DAMaterialStatusColor[doc.status] + '20', color: DAMaterialStatusColor[doc.status] }">
                    {{ DAMaterialStatusText[doc.status] }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn view" @click="viewDocument(doc)">查看</button>

                    <!-- 提交管理页签操作 -->
                    <template v-if="activeTab === 'submit'">
                      <button v-if="doc.status === 'submitted'" class="action-btn rush" @click="handleRush(doc)">催单</button>
                      <button v-if="doc.status === 'submitted' && isDocumentOwner(doc)" class="action-btn cancel" @click="handleCancel(doc)">取消</button>
                      <button v-if="doc.status === 'returned' && isDocumentOwner(doc)" class="action-btn edit" @click="openEditDialog(doc)">编辑</button>
                      <button v-if="doc.status === 'returned' && isDocumentOwner(doc)" class="action-btn cancel" @click="handleCancel(doc)">取消</button>
                      <button v-if="doc.status === 'material_issued' && isDocumentOwner(doc)" class="action-btn sign" @click="handleSign(doc)">签收</button>
                    </template>

                    <!-- 打印和接收页签操作 -->
                    <template v-if="activeTab === 'print-receive'">
                      <button v-if="doc.status === 'submitted'" class="action-btn receive" @click="handleReceive(doc)">接收</button>
                      <button v-if="doc.status === 'printed'" class="action-btn receive" @click="handleReceive(doc)">接收</button>
                      <button v-if="doc.status === 'received'" class="action-btn lock-bin" @click="handleLockBin(doc)">🔒 锁BIN</button>
                      <button v-if="doc.status === 'received'" class="action-btn return" @click="openReturnDialog(doc)">↩️ 退回</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="documents.length === 0 && !isLoading">
                <td colspan="9" class="empty-cell">
                  <div class="empty-state">
                    <span>📋</span>
                    <p>暂无数据</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <span class="pagination-info">显示 {{ paginationInfo }}</span>
          <div class="pagination-controls">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">上一页</button>
            <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage >= totalPages">下一页</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 提交单据对话框 -->
    <div v-if="isSubmitDialogOpen" class="dialog-overlay" @click.self="closeSubmitDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>📝 提交单据</h3>
          <button class="dialog-close" @click="closeSubmitDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="handleSubmit">
            <div class="form-row">
              <div class="form-group">
                <label>单号 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.documentNo" required placeholder="请输入单号">
              </div>
              <div class="form-group">
                <label>W/C名称 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.wcName" @input="submitForm.wcName = submitForm.wcName.toUpperCase()" required placeholder="请输入W/C名称" style="text-transform: uppercase;">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>DA编号 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.daNo" required placeholder="请输入DA编号" @input="checkDaNoInput">
                <div class="form-hint" v-if="submitForm.daNo.toUpperCase() === 'N/A'">⚠️ DA编号为N/A时，ECN编号和ECN附件为必填</div>
              </div>
              <div class="form-group">
                <label>ECN编号 <span class="required" v-if="submitForm.daNo.toUpperCase() === 'N/A'">*</span></label>
                <input type="text" v-model="submitForm.ecnNo" placeholder="DA为N/A时必填">
              </div>
            </div>
            <div v-if="submitForm.daNo.toUpperCase() === 'N/A'" class="form-group">
              <label>上传ECN附件（必须）<span class="required">*</span></label>
              <div class="upload-area" @click="triggerEcnFileInput" @dragover.prevent="onEcnDragOver" @dragleave="onEcnDragLeave" @drop.prevent="onEcnDrop" :class="{ 'drag-over': isEcnDragOver, 'uploading': isEcnUploading }">
                <input type="file" ref="ecnFileInput" @change="handleEcnFileChange" accept=".pdf,.xlsx,.xls,.csv" style="display: none;">
                <div v-if="!submitForm.ecnAttachmentName && !isEcnUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽文件到此处上传</p>
                  <p class="upload-hint">支持 PDF、Excel、CSV 格式</p>
                </div>
                <div v-else-if="isEcnUploading" class="upload-progress">
                  <div class="upload-progress-icon">⏳</div>
                  <p>上传中...</p>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: ecnUploadProgress + '%' }"></div>
                  </div>
                  <p class="progress-text">{{ Math.round(ecnUploadProgress) }}%</p>
                </div>
                <div v-else class="upload-file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ submitForm.ecnAttachmentName }}</span>
                  <button type="button" class="file-remove" @click.stop="removeEcnFile">×</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>提交人姓名</label>
              <input type="text" v-model="submitForm.submitterName" readonly placeholder="当前登录用户">
            </div>
            <div class="form-group">
              <label>管控类型 <span class="required">*</span></label>
              <select v-model="submitForm.controlType" required>
                <option v-for="type in controlTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>上传单据附件（必须） <span class="required">*</span></label>
              <div class="upload-area" @click="triggerFileInput" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop" :class="{ 'drag-over': isDragOver, 'uploading': isUploading }">
                <input type="file" ref="fileInput" @change="handleFileChange" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                <div v-if="!submitForm.attachmentName && !isUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽文件到此处上传</p>
                  <p class="upload-hint">支持 PDF、JPG、PNG 格式</p>
                </div>
                <div v-else-if="isUploading" class="upload-progress">
                  <div class="upload-progress-icon">⏳</div>
                  <p>上传中...</p>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
                  </div>
                  <p class="progress-text">{{ Math.round(uploadProgress) }}%</p>
                </div>
                <div v-else class="upload-file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ submitForm.attachmentName }}</span>
                  <button type="button" class="file-remove" @click.stop="removeFile">×</button>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="submitForm.isUrgent">
                  <span class="checkbox-text">加急</span>
                </label>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="submitForm.isRush">
                  <span class="checkbox-text">催单</span>
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeSubmitDialog">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="isSubmitting">
            {{ isSubmitting ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑单据对话框 -->
    <div v-if="isEditDialogOpen" class="dialog-overlay" @click.self="closeEditDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>✏️ 编辑单据</h3>
          <button class="dialog-close" @click="closeEditDialog">×</button>
        </div>
        <div class="dialog-body">
          <form @submit.prevent="handleReSubmit">
            <div class="form-row">
              <div class="form-group">
                <label>单号 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.documentNo" required placeholder="请输入单号" readonly class="readonly-input">
              </div>
              <div class="form-group">
                <label>W/C名称 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.wcName" @input="submitForm.wcName = submitForm.wcName.toUpperCase()" required placeholder="请输入W/C名称" style="text-transform: uppercase;">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>DA编号 <span class="required">*</span></label>
                <input type="text" v-model="submitForm.daNo" required placeholder="请输入DA编号" @input="checkDaNoInput">
                <div class="form-hint" v-if="submitForm.daNo.toUpperCase() === 'N/A'">⚠️ DA编号为N/A时，ECN编号和ECN附件为必填</div>
              </div>
              <div class="form-group">
                <label>ECN编号 <span class="required" v-if="submitForm.daNo.toUpperCase() === 'N/A'">*</span></label>
                <input type="text" v-model="submitForm.ecnNo" placeholder="DA为N/A时必填">
              </div>
            </div>
            <div v-if="submitForm.daNo.toUpperCase() === 'N/A'" class="form-group">
              <label>上传ECN附件（必须）<span class="required">*</span></label>
              <div class="upload-area" @click="triggerEcnFileInput" @dragover.prevent="onEcnDragOver" @dragleave="onEcnDragLeave" @drop.prevent="onEcnDrop" :class="{ 'drag-over': isEcnDragOver, 'uploading': isEcnUploading }">
                <input type="file" ref="ecnFileInput" @change="handleEcnFileChange" accept=".pdf,.xlsx,.xls,.csv" style="display: none;">
                <div v-if="!submitForm.ecnAttachmentName && !isEcnUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽文件到此处上传</p>
                  <p class="upload-hint">支持 PDF、Excel、CSV 格式</p>
                </div>
                <div v-else-if="isEcnUploading" class="upload-progress">
                  <div class="upload-progress-icon">⏳</div>
                  <p>上传中...</p>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: ecnUploadProgress + '%' }"></div>
                  </div>
                  <p class="progress-text">{{ Math.round(ecnUploadProgress) }}%</p>
                </div>
                <div v-else class="upload-file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ submitForm.ecnAttachmentName }}</span>
                  <button type="button" class="file-remove" @click.stop="removeEcnFile">×</button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>提交人姓名</label>
              <input type="text" v-model="submitForm.submitterName" readonly placeholder="当前登录用户">
            </div>
            <div class="form-group">
              <label>管控类型 <span class="required">*</span></label>
              <select v-model="submitForm.controlType" required>
                <option v-for="type in controlTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>上传单据附件（必须） <span class="required">*</span></label>
              <div class="upload-area" @click="triggerFileInput" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop" :class="{ 'drag-over': isDragOver, 'uploading': isUploading }">
                <input type="file" ref="fileInput" @change="handleFileChange" accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                <div v-if="!submitForm.attachmentName && !isUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽文件到此处上传</p>
                  <p class="upload-hint">支持 PDF、JPG、PNG 格式</p>
                </div>
                <div v-else-if="isUploading" class="upload-progress">
                  <div class="upload-progress-icon">⏳</div>
                  <p>上传中...</p>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
                  </div>
                  <p class="progress-text">{{ Math.round(uploadProgress) }}%</p>
                </div>
                <div v-else class="upload-file">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ submitForm.attachmentName }}</span>
                  <button type="button" class="file-remove" @click.stop="removeFile">×</button>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="submitForm.isUrgent">
                  <span class="checkbox-text">加急</span>
                </label>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="submitForm.isRush">
                  <span class="checkbox-text">催单</span>
                </label>
              </div>
            </div>
          </form>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeEditDialog">取消</button>
          <button class="btn btn-primary" @click="handleReSubmit" :disabled="isSubmitting">
            {{ isSubmitting ? '提交中...' : '重新提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 查看详情对话框 -->
    <div v-if="isDetailDialogOpen" class="dialog-overlay" @click.self="closeDetailDialog">
      <div class="dialog-content dialog-large">
        <div class="dialog-header">
          <h3>📋 单据详情</h3>
          <button class="dialog-close" @click="closeDetailDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="detail-section">
            <h4 class="section-title">基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">单号</span>
                <span class="detail-value">{{ currentDocument?.documentNo }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">W/C名称</span>
                <span class="detail-value">{{ currentDocument?.wcName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">DA编号</span>
                <span class="detail-value">{{ currentDocument?.daNo }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ECN编号</span>
                <span class="detail-value">{{ currentDocument?.ecnNo || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">管控类型</span>
                <span class="detail-value">{{ currentDocument?.controlType || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">提交人</span>
                <span class="detail-value">{{ currentDocument?.submitterName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span class="status-badge" :style="{ backgroundColor: DAMaterialStatusColor[currentDocument?.status || 'submitted'] + '20', color: DAMaterialStatusColor[currentDocument?.status || 'submitted'] }">
                  {{ DAMaterialStatusText[currentDocument?.status || 'submitted'] }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">加急</span>
                <span class="detail-value">{{ currentDocument?.isUrgent ? '是' : '否' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">催单</span>
                <span class="detail-value">{{ currentDocument?.isRush ? '是' : '否' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">时间记录</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">提交时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.submittedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">打印时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.printedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">打印人</span>
                <span class="detail-value">{{ currentDocument?.printedBy || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">接收时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.receivedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">接收人</span>
                <span class="detail-value">{{ currentDocument?.receivedBy || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">签收时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.signedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">签收人</span>
                <span class="detail-value">{{ currentDocument?.signedBy || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">完成时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.completedAt) }}</span>
              </div>
              <div v-if="currentDocument?.status === 'rejected'" class="detail-item full-width">
                <span class="detail-label">拒绝时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.rejectedAt) }}</span>
              </div>
              <div v-if="currentDocument?.status === 'rejected'" class="detail-item full-width">
                <span class="detail-label">拒绝原因</span>
                <span class="detail-value error">{{ currentDocument?.rejectReason }}</span>
              </div>
              <div v-if="currentDocument?.status === 'withdrawn'" class="detail-item">
                <span class="detail-label">撤回时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.withdrawnAt) }}</span>
              </div>
              <div v-if="currentDocument?.status === 'returned'" class="detail-item full-width">
                <span class="detail-label">退回时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.returnedAt) }}</span>
              </div>
              <div v-if="currentDocument?.status === 'returned'" class="detail-item full-width">
                <span class="detail-label">退回原因</span>
                <span class="detail-value error">{{ currentDocument?.returnReason }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentDocument?.attachmentName" class="detail-section">
            <h4 class="section-title">附件预览</h4>
            <div v-if="isImageFile(currentDocument.attachmentName)" class="image-preview-container">
              <img :src="getPreviewUrl(currentDocument)" class="image-preview" alt="附件预览">
            </div>
            <div v-else class="pdf-embed-container">
              <iframe
                :src="getPreviewUrl(currentDocument)"
                class="pdf-embed-frame"
                title="PDF预览"
              ></iframe>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button v-if="currentDocument?.status === 'received'" class="btn btn-warning" @click="openReturnDialogFromDetail(currentDocument!)">↩️ 退回</button>
          <button class="btn btn-secondary" @click="closeDetailDialog">关闭</button>
        </div>
      </div>
    </div>

    <!-- 拒绝原因对话框 -->
    <div v-if="isRejectDialogOpen" class="dialog-overlay" @click.self="closeRejectDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>❌ 拒绝单据</h3>
          <button class="dialog-close" @click="closeRejectDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>拒绝原因 <span class="required">*</span></label>
            <textarea v-model="rejectReason" rows="4" placeholder="请输入拒绝原因" required></textarea>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeRejectDialog">取消</button>
          <button class="btn btn-danger" @click="confirmReject" :disabled="!rejectReason.trim()">确认拒绝</button>
        </div>
      </div>
    </div>

    <!-- 退回原因对话框 -->
    <div v-if="isReturnDialogOpen" class="dialog-overlay" @click.self="closeReturnDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>↩️ 退回单据</h3>
          <button class="dialog-close" @click="closeReturnDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>退回原因 <span class="required">*</span></label>
            <textarea v-model="returnReason" rows="4" placeholder="请输入退回原因" required></textarea>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="sendReturnEmail" class="checkbox-input">
              <span>发送邮件通知提交人</span>
            </label>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeReturnDialog">取消</button>
          <button class="btn btn-primary" @click="confirmReturn" :disabled="!returnReason.trim() || isReturning">
            {{ isReturning ? '处理中...' : '确认退回' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { clearRequestCache } from '../utils/request';
import {
  DAMaterialStatus,
  DAMaterialStatusText,
  DAMaterialStatusColor,
  DAMaterialDocument,
  DAMaterialDocumentForm,
  getDAMaterialDocuments,
  createDAMaterialDocument,
  getDAMaterialDocumentById,
  updateDAMaterialDocument,
  withdrawDAMaterialDocument,
  cancelDAMaterialDocument,
  printDAMaterialDocument,
  receiveDAMaterialDocument,
  lockBinDAMaterialDocument,
  rejectDAMaterialDocument,
  returnDAMaterialDocument,
  signDAMaterialDocument,
  rushDAMaterialDocument,
  getDAMaterialStats,
  uploadDAMaterialAttachment
} from '../api/daMaterial';
import { getDAMaterialConfigs, DAMATERIAL_CONFIG_KEYS } from '../api/daMaterialConfig';

// 标签页配置 - 两个页签：提交管理和打印接收
const tabs = [
  { key: 'submit', label: '📤 提交管理', status: ['submitted', 'printed', 'received', 'rejected', 'returned', 'withdrawn', 'cancelled', 'material_issued', 'signed', 'completed'] },
  { key: 'print-receive', label: '🖨️ 打印和接收', status: ['submitted', 'printed', 'received', 'cancelled'] }
];

// 管控类型列表
const controlTypes = ref<string[]>(['正常', '加急', '样品']);

// 当前激活的标签页
const activeTab = ref('submit');

// 获取当前标签页标题
const currentTabTitle = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value);
  return tab?.label.replace(/^[^\s]+\s/, '') || '';
});

// 统计数据
const stats = ref({
  submitted: 0,
  printed: 0,
  received: 0,
  material_issued: 0,
  signed: 0,
  completed: 0,
  rejected: 0,
  returned: 0,
  cancelled: 0,
  withdrawn: 0
});

// 选中的状态筛选
const selectedStatus = ref<string | null>(null);

// 按状态筛选
const filterByStatus = (status: string) => {
  if (selectedStatus.value === status) {
    selectedStatus.value = null;
  } else {
    selectedStatus.value = status;
  }
  currentPage.value = 1;
  loadDocuments();
};

// 文档列表
const documents = ref<DAMaterialDocument[]>([]);
const isLoading = ref(false);

// 分页
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)));
const totalCount = ref(0);
const paginationInfo = computed(() => {
  if (totalCount.value === 0) return '0 条';
  const start = (currentPage.value - 1) * pageSize.value + 1;
  const end = Math.min(currentPage.value * pageSize.value, totalCount.value);
  return `${start}-${end} 条，共 ${totalCount.value} 条`;
});

// 搜索条件
const searchQuery = reactive({
  documentNo: '',
  wcName: '',
  submitterName: '',
  startDate: '',
  endDate: ''
});

// 提交表单
const isSubmitDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isSubmitting = ref(false);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const editingDocumentId = ref<number | null>(null);
const submitForm = reactive<DAMaterialDocumentForm>({
  documentNo: '',
  wcName: '',
  daNo: '',
  ecnNo: '',
  ecnAttachmentUrl: '',
  ecnAttachmentName: '',
  submitterName: '',
  isUrgent: false,
  isRush: false,
  attachmentUrl: '',
  attachmentName: '',
  controlType: '正常'
});

// 详情对话框
const isDetailDialogOpen = ref(false);
const currentDocument = ref<DAMaterialDocument | null>(null);

// 拒绝对话框
const isRejectDialogOpen = ref(false);
const rejectReason = ref('');
const rejectingDocument = ref<DAMaterialDocument | null>(null);

// 退回对话框
const isReturnDialogOpen = ref(false);
const returnReason = ref('');
const returningDocument = ref<DAMaterialDocument | null>(null);

// 文件上传进度
const uploadProgress = ref(0);
const isUploading = ref(false);

// ECN附件上传进度
const ecnUploadProgress = ref(0);
const isEcnUploading = ref(false);
const ecnFileInput = ref<HTMLInputElement | null>(null);
const isEcnDragOver = ref(false);

const isDocumentOwner = (doc: DAMaterialDocument): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  const currentUserName = currentUser.realName || currentUser.username || '';
  return doc.submitterName === currentUserName;
};

// 加载文档列表
const loadDocuments = async () => {
  isLoading.value = true;
  try {
    const currentTabConfig = tabs.find(t => t.key === activeTab.value);
    const statusFilter = selectedStatus.value
      ? selectedStatus.value
      : currentTabConfig?.status.join(',');
    const params = {
      documentNo: searchQuery.documentNo,
      wcName: searchQuery.wcName,
      submitterName: searchQuery.submitterName,
      startDate: searchQuery.startDate,
      endDate: searchQuery.endDate,
      status: statusFilter,
      page: currentPage.value,
      pageSize: pageSize.value
    };

    const res: any = await getDAMaterialDocuments(params);
    documents.value = res?.data?.items || res?.items || res?.data || [];
    totalCount.value = res?.data?.pagination?.total || res?.total || documents.value.length;
  } catch (error) {
    console.error('加载单据列表失败:', error);
    documents.value = [];
    totalCount.value = 0;
  } finally {
    isLoading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getDAMaterialStats();
    stats.value = {
      submitted: res?.submitted || 0,
      printed: res?.printed || 0,
      received: res?.received || 0,
      material_issued: res?.material_issued || 0,
      signed: res?.signed || 0,
      completed: res?.completed || 0,
      rejected: res?.rejected || 0,
      returned: res?.returned || 0,
      cancelled: res?.cancelled || 0,
      withdrawn: res?.withdrawn || 0
    };
  } catch (error) {
    console.error('加载统计数据失败:', error);
    stats.value = {
      submitted: 0,
      printed: 0,
      received: 0,
      material_issued: 0,
      signed: 0,
      completed: 0,
      rejected: 0,
      returned: 0,
      cancelled: 0,
      withdrawn: 0
    };
  }
};

// 格式化日期时间
const formatDateTime = (dateStr?: string): string => {
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

// 判断是否为图片文件
const isImageFile = (fileName?: string): boolean => {
  if (!fileName) return false;
  const ext = fileName.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
};

// 获取预览URL
const getPreviewUrl = (doc: DAMaterialDocument): string => {
  if (doc.attachmentUrl) {
    const fileName = doc.attachmentUrl.split('/').pop();
    return `/api/da-material/preview/${fileName}`;
  }
  return '';
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadDocuments();
};

// 重置搜索
const resetSearch = () => {
  searchQuery.documentNo = '';
  searchQuery.wcName = '';
  searchQuery.submitterName = '';
  searchQuery.startDate = '';
  searchQuery.endDate = '';
  currentPage.value = 1;
  loadDocuments();
};

// 分页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadDocuments();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadDocuments();
  }
};

// 打开提交对话框
const openSubmitDialog = () => {
  resetSubmitForm();
  isSubmitDialogOpen.value = true;
};

// 打开编辑对话框
const openEditDialog = (doc: DAMaterialDocument) => {
  editingDocumentId.value = doc.id || null;
  submitForm.documentNo = doc.documentNo;
  submitForm.wcName = doc.wcName;
  submitForm.daNo = doc.daNo;
  submitForm.ecnNo = doc.ecnNo || '';
  submitForm.ecnAttachmentUrl = doc.ecnAttachmentUrl || '';
  submitForm.ecnAttachmentName = doc.ecnAttachmentName || '';
  submitForm.submitterName = doc.submitterName;
  submitForm.isUrgent = doc.isUrgent;
  submitForm.isRush = doc.isRush;
  submitForm.attachmentUrl = doc.attachmentUrl || '';
  submitForm.attachmentName = doc.attachmentName || '';
  submitForm.controlType = doc.controlType || controlTypes.value[0] || '正常';
  isEditDialogOpen.value = true;
};

// 关闭编辑对话框
const closeEditDialog = () => {
  isEditDialogOpen.value = false;
  editingDocumentId.value = null;
  resetSubmitForm();
};

// 重新提交单据
const handleReSubmit = async () => {
  if (!editingDocumentId.value) return;

  const ecnNo = submitForm.ecnNo ?? '';

  // DA编号为N/A时，ECN编号和ECN附件为必填
  if (submitForm.daNo.toUpperCase() === 'N/A') {
    if (!ecnNo.trim()) {
      ElMessage.warning('DA编号为N/A时，ECN编号为必填');
      return;
    }
    if (!submitForm.ecnAttachmentUrl || !submitForm.ecnAttachmentName) {
      ElMessage.warning('DA编号为N/A时，ECN附件为必填');
      return;
    }
  }

  isSubmitting.value = true;
  try {
    await updateDAMaterialDocument(editingDocumentId.value, {
      wcName: submitForm.wcName,
      daNo: submitForm.daNo,
      ecnNo: submitForm.ecnNo,
      ecnAttachmentUrl: submitForm.ecnAttachmentUrl,
      ecnAttachmentName: submitForm.ecnAttachmentName,
      isUrgent: submitForm.isUrgent,
      isRush: submitForm.isRush,
      attachmentUrl: submitForm.attachmentUrl,
      attachmentName: submitForm.attachmentName
    });
    ElMessage.success('单据已重新提交');
    closeEditDialog();
    clearRequestCache(); // 清除请求缓存
    loadDocuments();
    loadStats();
  } catch (error: any) {
    console.error('重新提交失败:', error);
    const errorMsg = error?.response?.data?.message || error?.message || '重新提交失败';
    ElMessage.error(errorMsg);
  } finally {
    isSubmitting.value = false;
  }
};

// 重置提交表单
const resetSubmitForm = () => {
  submitForm.documentNo = '';
  submitForm.wcName = '';
  submitForm.daNo = '';
  submitForm.ecnNo = '';
  submitForm.ecnAttachmentUrl = '';
  submitForm.ecnAttachmentName = '';
  // 自动填充当前登录用户
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      submitForm.submitterName = user.realName || user.username || '';
    } catch (e) {
      submitForm.submitterName = '';
    }
  } else {
    submitForm.submitterName = '';
  }
  submitForm.isUrgent = false;
  submitForm.isRush = false;
  submitForm.attachmentUrl = '';
  submitForm.attachmentName = '';
  submitForm.controlType = controlTypes.value[0] || '正常';
};

// 加载管控类型
const loadControlTypes = async () => {
  try {
    const res = await getDAMaterialConfigs();
    const configs = (res as any)?.data || res || [];
    const controlTypeConfig = configs.find((c: any) => c.configKey === DAMATERIAL_CONFIG_KEYS.CONTROL_TYPES);
    if (controlTypeConfig && controlTypeConfig.configValue) {
      controlTypes.value = controlTypeConfig.configValue.split(',').map((s: string) => s.trim()).filter((s: string) => s);
    }
    // 设置默认管控类型
    if (!submitForm.controlType && controlTypes.value.length > 0) {
      submitForm.controlType = controlTypes.value[0];
    }
  } catch (error) {
    console.error('加载管控类型失败:', error);
    controlTypes.value = ['正常', '加急', '样品'];
  }
};

// DA编号自动转大写
const checkDaNoInput = () => {
  submitForm.daNo = submitForm.daNo.toUpperCase();
};

// 关闭提交对话框
const closeSubmitDialog = () => {
  isSubmitDialogOpen.value = false;
  resetSubmitForm();
};

// 文件上传相关
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadFile(file);
  }
};

const onDragOver = () => {
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    uploadFile(file);
  }
};

const uploadFile = async (file: File) => {
  // 验证文件类型
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 PDF、JPG、PNG 格式文件');
    return;
  }

  // 验证文件大小（最大10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB');
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  // 模拟上传进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += Math.random() * 15;
    }
  }, 200);

  try {
    const res = await uploadDAMaterialAttachment(file);
    clearInterval(progressInterval);
    uploadProgress.value = 100;
    submitForm.attachmentUrl = res.filePath;
    submitForm.attachmentName = res.originalName;
    ElMessage.success('文件上传成功');

    setTimeout(() => {
      uploadProgress.value = 0;
    }, 1000);
  } catch (error) {
    clearInterval(progressInterval);
    console.error('文件上传失败:', error);
    ElMessage.error('文件上传失败，请重试');
    uploadProgress.value = 0;
  } finally {
    isUploading.value = false;
  }
};

const removeFile = () => {
  submitForm.attachmentUrl = '';
  submitForm.attachmentName = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// ECN附件上传相关函数
const triggerEcnFileInput = () => {
  ecnFileInput.value?.click();
};

const handleEcnFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadEcnFile(file);
  }
};

const onEcnDragOver = () => {
  isEcnDragOver.value = true;
};

const onEcnDragLeave = () => {
  isEcnDragOver.value = false;
};

const onEcnDrop = (e: DragEvent) => {
  isEcnDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    uploadEcnFile(file);
  }
};

const uploadEcnFile = async (file: File) => {
  // 验证文件类型 - ECN附件支持PDF和Excel表格
  const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 PDF、Excel、CSV 格式文件');
    return;
  }

  // 验证文件大小（最大10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB');
    return;
  }

  isEcnUploading.value = true;
  ecnUploadProgress.value = 0;

  // 模拟上传进度
  const progressInterval = setInterval(() => {
    if (ecnUploadProgress.value < 90) {
      ecnUploadProgress.value += Math.random() * 15;
    }
  }, 200);

  try {
    const res = await uploadDAMaterialAttachment(file);
    clearInterval(progressInterval);
    ecnUploadProgress.value = 100;
    submitForm.ecnAttachmentUrl = res.filePath;
    submitForm.ecnAttachmentName = res.originalName;
    ElMessage.success('ECN附件上传成功');

    setTimeout(() => {
      ecnUploadProgress.value = 0;
    }, 1000);
  } catch (error) {
    clearInterval(progressInterval);
    console.error('ECN附件上传失败:', error);
    ElMessage.error('ECN附件上传失败，请重试');
    ecnUploadProgress.value = 0;
  } finally {
    isEcnUploading.value = false;
  }
};

const removeEcnFile = () => {
  submitForm.ecnAttachmentUrl = '';
  submitForm.ecnAttachmentName = '';
  if (ecnFileInput.value) {
    ecnFileInput.value.value = '';
  }
};

// 提交单据
const handleSubmit = async () => {
  if (!submitForm.documentNo || !submitForm.wcName || !submitForm.daNo || !submitForm.submitterName) {
    ElMessage.warning('请填写必填项');
    return;
  }

  const ecnNo = submitForm.ecnNo ?? '';

  // DA编号为N/A时，ECN编号和ECN附件为必填
  if (submitForm.daNo.toUpperCase() === 'N/A') {
    if (!ecnNo.trim()) {
      ElMessage.warning('DA编号为N/A时，ECN编号为必填');
      return;
    }
    if (!submitForm.ecnAttachmentUrl || !submitForm.ecnAttachmentName) {
      ElMessage.warning('DA编号为N/A时，ECN附件为必填');
      return;
    }
  }

  // 验证附件是否上传
  if (!submitForm.attachmentUrl || !submitForm.attachmentName) {
    ElMessage.warning('请上传单据附件（必须）');
    return;
  }

  isSubmitting.value = true;
  try {
    await createDAMaterialDocument(submitForm);
    ElMessage.success('单据提交成功');
    closeSubmitDialog();
    clearRequestCache(); // 清除请求缓存，确保刷新获取最新数据
    loadDocuments();
    loadStats();
  } catch (error) {
    console.error('提交失败:', error);
    ElMessage.error('单据提交失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};

// 查看详情
const viewDocument = async (doc: DAMaterialDocument) => {
  try {
    const res: any = await getDAMaterialDocumentById(doc.id!);
    currentDocument.value = res?.data || res;
  } catch (error) {
    console.error('获取详情失败:', error);
    currentDocument.value = doc;
  }
  isDetailDialogOpen.value = true;
};

const closeDetailDialog = () => {
  isDetailDialogOpen.value = false;
  currentDocument.value = null;
};

// 撤回单据
const handleWithdraw = (doc: DAMaterialDocument) => {
  ElMessageBox.confirm(
    `确定要撤回单据 ${doc.documentNo} 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await withdrawDAMaterialDocument(doc.id!);
      ElMessage.success('单据已撤回');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('撤回失败:', error);
      ElMessage.error('单据撤回失败，请重试');
    }
  }).catch(() => {});
};

// 取消单据
const handleCancel = (doc: DAMaterialDocument) => {
  ElMessageBox.confirm(
    `确定要取消单据 ${doc.documentNo} 吗？取消后记录保留，状态将更新为已取消。`,
    '取消确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await cancelDAMaterialDocument(doc.id!);
      ElMessage.success('单据已取消');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('取消失败:', error);
      ElMessage.error('单据取消失败，请重试');
    }
  }).catch(() => {});
};

// 催单
const handleRush = (doc: DAMaterialDocument) => {
  ElMessageBox.confirm(
    `确定要催单吗？将通知相关人员加快处理单据 ${doc.documentNo}`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await rushDAMaterialDocument(doc.id!);
      ElMessage.success('催单通知已发送');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('催单失败:', error);
      ElMessage.error('催单失败，请重试');
    }
  }).catch(() => {});
};

// 打印单据
const handlePrint = (doc: DAMaterialDocument) => {
  const currentUser = getCurrentUser();
  const printedBy = currentUser?.realName || currentUser?.username || '打印员';

  ElMessageBox.confirm(
    `确定打印单据 ${doc.documentNo} 吗？打印人：${printedBy}`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await printDAMaterialDocument(doc.id!, printedBy);
      ElMessage.success('单据已打印');

      // 打印附件
      printAttachment(doc);

      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('打印失败:', error);
      ElMessage.error('单据打印失败，请重试');
    }
  }).catch(() => {});
};

// 打印附件
const printAttachment = (doc: DAMaterialDocument) => {
  if (doc.attachmentUrl) {
    const fileName = doc.attachmentUrl.split('/').pop();
    const printUrl = `/print?file=${encodeURIComponent(fileName || '')}&module=da-material`;
    window.open(printUrl, '_blank', 'width=900,height=700');
  } else {
    ElMessage.warning('该单据没有附件可打印');
  }
};

// 接收单据
const handleReceive = (doc: DAMaterialDocument) => {
  const currentUser = getCurrentUser();
  const receivedBy = currentUser?.realName || currentUser?.username || '接收员';

  ElMessageBox.confirm(
    `确定接收单据 ${doc.documentNo} 吗？接收人：${receivedBy}`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await receiveDAMaterialDocument(doc.id!, receivedBy);
      ElMessage.success('单据已接收');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('接收失败:', error);
      ElMessage.error('单据接收失败，请重试');
    }
  }).catch(() => {});
};

// 锁BIN（已发料）
// 防重复操作的状态
const lockBinLoading = ref(false);

const handleLockBin = (doc: DAMaterialDocument) => {
  if (lockBinLoading.value) {
    ElMessage.warning('操作进行中，请稍候');
    return;
  }

  const currentUser = getCurrentUser();
  const lockedBy = currentUser?.realName || currentUser?.username || '仓库操作员';

  ElMessageBox.confirm(
    `确定执行锁BIN操作吗？单据 ${doc.documentNo} 将标记为已发料，并通知提交人。操作人：${lockedBy}`,
    '🔒 锁BIN确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    lockBinLoading.value = true;
    try {
      const result = await lockBinDAMaterialDocument(doc.id!, lockedBy);
      const resData = result?.data || result;

      // 调试日志
      console.log('[lockBIN] API响应结果:', result);
      console.log('[lockBIN] 解析后数据:', resData);

      // 获取提交人邮箱并发送邮件通知
      const submitterEmail = resData?.submitterEmail;
      console.log('[lockBIN] 提交人邮箱:', submitterEmail);
      if (submitterEmail) {
        const documentNo = resData?.documentNo || doc.documentNo;
        const subject = encodeURIComponent(`【发料通知】管控物料单据 ${documentNo} 已发料完成`);
        const body = encodeURIComponent(
          `您好，${doc.submitterName}\n\n` +
          `您的管控物料单据 ${documentNo} 已完成发料，请尽快到仓库领取。\n\n` +
          `发料信息：\n` +
          `- 单号：${documentNo}\n` +
          `- W/C：${doc.wcName}\n` +
          `- DA编号：${doc.daNo}\n` +
          `- 操作人：${lockedBy}\n` +
          `- 发料时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n` +
          `请登录 Jabil Smart Office 系统查看详情。\n\n` +
          `---\nJabil Smart Office 系统自动发送`
        );
        const mailtoUrl = `mailto:${submitterEmail}?subject=${subject}&body=${body}`;
        console.log('[lockBIN] === 准备发送邮件 ===');
        console.log('[lockBIN] 收件人:', submitterEmail);
        console.log('[lockBIN] 邮件链接:', mailtoUrl);
        console.log('[lockBIN] 尝试打开邮件客户端...');
        window.location.href = mailtoUrl;
        console.log('[lockBIN] window.location.href 已设置');
      } else {
        ElMessage.warning(`提交人 ${doc.submitterName} 未设置邮箱，已跳过邮件通知`);
      }

      ElMessage.success('锁BIN操作成功，状态已更新为已发料');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error: any) {
      ElMessage.error(error?.message || '锁BIN操作失败，请重试');
    } finally {
      lockBinLoading.value = false;
    }
  }).catch(() => {});
};

// 签收单据
const handleSign = (doc: DAMaterialDocument) => {
  const currentUser = getCurrentUser();
  const signedBy = currentUser?.realName || currentUser?.username || '签收员';

  ElMessageBox.confirm(
    `确定签收单据 ${doc.documentNo} 吗？签收人：${signedBy}`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await signDAMaterialDocument(doc.id!, signedBy);
      ElMessage.success('单据已签收');
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('签收失败:', error);
      ElMessage.error('单据签收失败，请重试');
    }
  }).catch(() => {});
};

// 打开拒绝对话框
const openRejectDialog = (doc: DAMaterialDocument) => {
  rejectingDocument.value = doc;
  rejectReason.value = '';
  isRejectDialogOpen.value = true;
};

const closeRejectDialog = () => {
  isRejectDialogOpen.value = false;
  rejectingDocument.value = null;
  rejectReason.value = '';
};

// 确认拒绝
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因');
    return;
  }

  try {
    await rejectDAMaterialDocument(rejectingDocument.value!.id!, rejectReason.value);
    ElMessage.success('单据已拒绝');
    closeRejectDialog();
    clearRequestCache(); // 清除请求缓存
    loadDocuments();
    loadStats();
  } catch (error) {
    console.error('拒绝失败:', error);
    ElMessage.error('单据拒绝失败，请重试');
  }
};

// 打开退回对话框
const openReturnDialog = (doc: DAMaterialDocument) => {
  returningDocument.value = doc;
  returnReason.value = '';
  isReturnDialogOpen.value = true;
};

// 从详情页打开退回对话框
const openReturnDialogFromDetail = (doc: DAMaterialDocument) => {
  closeDetailDialog();
  setTimeout(() => {
    openReturnDialog(doc);
  }, 100);
};

const closeReturnDialog = () => {
  isReturnDialogOpen.value = false;
  returningDocument.value = null;
  returnReason.value = '';
};

// 确认退回
const isReturning = ref(false);
const sendReturnEmail = ref(true);

const confirmReturn = async () => {
  if (!returnReason.value.trim()) {
    ElMessage.warning('请输入退回原因');
    return;
  }

  if (isReturning.value) {
    return;
  }

  const currentUser = getCurrentUser();
  const returnedBy = currentUser?.realName || currentUser?.username || '操作员';
  const doc = returningDocument.value!;

  // 弹出退回确认
  ElMessageBox.confirm(
    `退回后将通知提交人 ${doc.submitterName}，确定要退回吗？`,
    '退回确认',
    {
      confirmButtonText: '确认退回',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    isReturning.value = true;
    try {
      const result = await returnDAMaterialDocument(doc.id!, returnReason.value, returnedBy);
      const resData = result?.data || result;

      // 根据用户勾选决定是否发送邮件通知
      const submitterEmail = resData?.submitterEmail;
      if (submitterEmail && sendReturnEmail.value) {
        const documentNo = resData?.documentNo || doc.documentNo;
        const subject = encodeURIComponent(`【单据退回通知】管控物料单据 ${documentNo}`);
        const body = encodeURIComponent(
          `您好，${doc.submitterName}\n\n` +
          `您的管控物料单据 ${documentNo} 已被退回。\n\n` +
          `退回信息：\n` +
          `- 单号：${documentNo}\n` +
          `- W/C：${doc.wcName}\n` +
          `- DA编号：${doc.daNo}\n` +
          `- 退回原因：${returnReason.value}\n` +
          `- 退回人：${returnedBy}\n` +
          `- 退回时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n` +
          `请登录 Jabil Smart Office 系统查看详情。\n\n` +
          `---\nJabil Smart Office 系统自动发送`
        );
        const mailtoUrl = `mailto:${submitterEmail}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
      } else if (submitterEmail) {
        ElMessage.info('已取消邮件通知');
      }

      ElMessage.success('单据已退回');
      closeReturnDialog();
      clearRequestCache(); // 清除请求缓存
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('退回失败:', error);
      ElMessage.error('退回失败，请重试');
    } finally {
      isReturning.value = false;
    }
  }).catch(() => {});
};

// 获取当前登录用户
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// 导出数据
const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

// 监听标签页变化，重新加载数据
watch(activeTab, () => {
  currentPage.value = 1;
  selectedStatus.value = null;
  loadDocuments();
});

// ESC 键关闭对话框
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isDetailDialogOpen.value) {
      closeDetailDialog();
    } else if (isReturnDialogOpen.value) {
      closeReturnDialog();
    } else if (isRejectDialogOpen.value) {
      closeRejectDialog();
    } else if (isEditDialogOpen.value) {
      closeEditDialog();
    } else if (isSubmitDialogOpen.value) {
      closeSubmitDialog();
    }
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadControlTypes();
  loadDocuments();
  loadStats();
  document.addEventListener('keydown', handleKeyDown);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.da-material-container {
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
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-refresh:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  opacity: 0;
  transition: opacity 0.3s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card-active {
  border-color: currentColor;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-card-active::before {
  opacity: 1;
}

.stat-card-orange { color: #FF6B35; }
.stat-card-orange::before { background: linear-gradient(90deg, #FF6B35, #ff8f66); }
.stat-card-orange .stat-icon-bg { background: linear-gradient(135deg, #FFF5F0 0%, #FFE4D6 100%); }

.stat-card-blue { color: #1890FF; }
.stat-card-blue::before { background: linear-gradient(90deg, #1890FF, #69c0ff); }
.stat-card-blue .stat-icon-bg { background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); }

.stat-card-green { color: #52C41A; }
.stat-card-green::before { background: linear-gradient(90deg, #52C41A, #73d13d); }
.stat-card-green .stat-icon-bg { background: linear-gradient(135deg, #F6FFED 0%, #D9F7BE 100%); }

.stat-card-cyan { color: #13C2C2; }
.stat-card-cyan::before { background: linear-gradient(90deg, #13C2C2, #36CFC9); }
.stat-card-cyan .stat-icon-bg { background: linear-gradient(135deg, #EFFFFA 0%, #D6F3F3 100%); }

.stat-card-purple { color: #722ED1; }
.stat-card-purple::before { background: linear-gradient(90deg, #722ED1, #9254DE); }
.stat-card-purple .stat-icon-bg { background: linear-gradient(135deg, #F9F0FF 0%, #E8D5FF 100%); }

.stat-icon-bg {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 26px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
  white-space: nowrap;
}

/* Tabs */
.tabs-container {
  margin-bottom: 20px;
}

.tabs-header {
  display: flex;
  gap: 4px;
  background: #FFFFFF;
  padding: 4px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #111827;
  background: #F3F4F6;
}

.tab-btn.active {
  background: #0066CC;
  color: #FFFFFF;
}

/* Table Card */
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
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
}

.card-body {
  padding: 24px;
}

/* Search Bar */
.search-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.search-item input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-item input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-item-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-separator {
  color: #9CA3AF;
  margin: 0 4px;
  display: inline-flex;
  align-items: center;
}

.date-range-inputs {
  display: inline-flex;
  align-items: center;
}

.date-range-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range-item {
  min-width: 320px;
}

.date-range-item .date-range-wrapper label {
  white-space: nowrap;
}

.date-range-item input {
  width: 120px;
}

.search-actions {
  display: flex;
  gap: 8px;
}

/* Table */
.table-container {
  overflow-x: auto;
  position: relative;
  min-height: 200px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #F3F4F6;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
}

.data-table td {
  color: #4B5563;
  font-size: 14px;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.empty-cell {
  text-align: center;
  padding: 60px 16px !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #9CA3AF;
}

.empty-state span {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Status Badge */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* Table Actions */
.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.view {
  background-color: #EFF6FF;
  color: #0066CC;
}

.action-btn.view:hover {
  background-color: #DBEAFE;
}

.action-btn.rush {
  background-color: #FEF3C7;
  color: #D97706;
}

.action-btn.rush:hover {
  background-color: #FDE68A;
}

.action-btn.withdraw {
  background-color: #F3F4F6;
  color: #6B7280;
}

.action-btn.withdraw:hover {
  background-color: #E5E7EB;
}

.action-btn.edit {
  background-color: #DBEAFE;
  color: #2563EB;
}

.action-btn.edit:hover {
  background-color: #BFDBFE;
}

.action-btn.print {
  background-color: #E0F2FE;
  color: #0284C7;
}

.action-btn.print:hover {
  background-color: #BAE6FD;
}

.action-btn.receive {
  background-color: #D1FAE5;
  color: #059669;
}

.action-btn.receive:hover {
  background-color: #A7F3D0;
}

.action-btn.reject {
  background-color: #FEE2E2;
  color: #DC2626;
}

.action-btn.reject:hover {
  background-color: #FECACA;
}

.action-btn.return {
  background-color: #FEF3C7;
  color: #B45309;
}

.action-btn.return:hover {
  background-color: #FDE68A;
}

.action-btn.sign {
  background-color: #D1FAE5;
  color: #059669;
}

.action-btn.sign:hover {
  background-color: #A7F3D0;
}

.action-btn.complete {
  background-color: #EDE9FE;
  color: #7C3AED;
}

.action-btn.complete:hover {
  background-color: #DDD6FE;
}

.action-btn.lock-bin {
  background-color: #E0F2FE;
  color: #0284C7;
}

.action-btn.lock-bin:hover {
  background-color: #BAE6FD;
}

.action-btn.cancel {
  background-color: #FEE2E2;
  color: #DC2626;
}

.action-btn.cancel:hover {
  background-color: #FECACA;
}

/* Pagination */
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
  border-radius: 6px;
  background-color: #FFFFFF;
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

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #4B5563;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #9CA3AF;
}

.btn-warning {
  background-color: #F59E0B;
  color: white;
}

.btn-warning:hover {
  background-color: #D97706;
}

.btn-danger {
  background-color: #EF4444;
  color: white;
}

.btn-danger:hover {
  background-color: #DC2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Dialog */
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
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 500px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

.dialog-large {
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}

/* Form */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.required {
  color: #EF4444;
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

/* 只读输入框样式 */
.readonly-input {
  background-color: #F3F4F6 !important;
  color: #6B7280 !important;
  cursor: not-allowed;
  border-color: #E5E7EB !important;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6B7280;
}

/* Checkbox */
.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  font-size: 14px;
  color: #374151;
}

/* Upload Area */
.upload-area {
  border: 2px dashed #D1D5DB;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #0066CC;
  background-color: #F0F7FF;
}

.upload-area.uploading {
  border-color: #1890FF;
  background-color: #F0F9FF;
}

.upload-placeholder {
  color: #9CA3AF;
}

.upload-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
}

.upload-hint {
  font-size: 12px !important;
  margin-top: 4px !important;
}

.upload-file {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
}

.file-name {
  font-size: 14px;
  color: #374151;
}

.file-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: #FEE2E2;
  color: #DC2626;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.file-remove:hover {
  background: #FECACA;
}

/* 上传进度样式 */
.upload-progress {
  color: #1890FF;
}

.upload-progress-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.upload-progress p {
  margin: 0;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  max-width: 200px;
  height: 8px;
  background-color: #E5E7EB;
  border-radius: 4px;
  margin: 12px auto;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890FF, #0066CC);
  border-radius: 4px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 12px !important;
  color: #6B7280;
}

/* Detail Section */
.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #E5E7EB;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 13px;
  color: #6B7280;
}

.detail-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.detail-value.error {
  color: #DC2626;
}

/* PDF Embed */
.pdf-embed-container {
  width: 100%;
  height: 500px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  background: #F9FAFB;
}

.pdf-embed-frame {
  width: 100%;
  height: 100%;
  border: none;
}

/* Image Preview */
.image-preview-container {
  width: 100%;
  max-height: 500px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  background: #F9FAFB;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
}

/* Responsive */
@media (max-width: 1400px) {
  .stats-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .tabs-header {
    flex-direction: column;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
