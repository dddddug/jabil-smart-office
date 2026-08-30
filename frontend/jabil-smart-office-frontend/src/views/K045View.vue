<template>
  <div class="k045-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">K045 单据管理</span>
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
        @click="filterByStatusAndSwitchTab('submitted', 'receive')"
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
        @click="filterByStatusAndSwitchTab('received', 'receive')"
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
        :class="{ 'stat-card-active': selectedStatus === 'signed' }"
        @click="filterByStatusAndSwitchTab('signed', 'sign')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">📝</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.signed }}</div>
          <div class="stat-label">待分料</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-cyan"
        :class="{ 'stat-card-active': selectedStatus === 'material_sent' }"
        @click="filterByStatusAndSwitchTab('material_sent', 'sign')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">🔓</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.materialSent }}</div>
          <div class="stat-label">待签收</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-orange"
        :class="{ 'stat-card-active': selectedStatus === 'distribution_ended' }"
        @click="filterByStatusAndSwitchTab('distribution_ended', 'submit')"
      >
        <div class="stat-icon-bg">
          <span class="stat-icon">⏳</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.distributionEnded }}</div>
          <div class="stat-label">待完成</div>
        </div>
      </div>
      <div
        class="stat-card stat-card-purple"
        :class="{ 'stat-card-active': selectedStatus === 'completed' }"
        @click="filterByStatusAndSwitchTab('completed', 'submit')"
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
              <select v-model="searchQuery.wcName" class="search-select">
                <option value="">全部</option>
                <option v-for="wc in availableWCNames" :key="wc" :value="wc">{{ wc }}</option>
              </select>
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
                <th>配送地点</th>
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
                <td>{{ doc.deliveryLocation }}</td>
                <td>{{ doc.submitterName }}</td>
                <td>{{ formatDateTime(doc.submittedAt) }}</td>
                <td>
                  <span class="status-badge" :style="{ backgroundColor: K045StatusColor[doc.status] + '20', color: K045StatusColor[doc.status] }">
                    {{ K045StatusText[doc.status] }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="action-btn view" @click="viewDocument(doc)">查看</button>

                    <!-- 提交部门操作 -->
                    <template v-if="activeTab === 'submit'">
                      <button v-if="doc.status === 'submitted'" class="action-btn withdraw" @click="handleWithdraw(doc)">撤回</button>
                      <button v-if="doc.status === 'submitted'" class="action-btn rush" @click="handleRush(doc)">催单</button>
                      <button v-if="doc.status === 'submitted'" class="action-btn cancel" @click="handleCancel(doc)">取消</button>
                      <button
                        :class="['action-btn', doc.isUrgent ? 'urgent-active' : 'urgent']"
                        @click="handleSetUrgent(doc)"
                      >
                        {{ doc.isUrgent ? '⚡已加急' : '⚡加急' }}
                      </button>
                      <button v-if="doc.status === 'returned' && isDocumentOwner(doc)" class="action-btn edit" @click="openEditDialog(doc)">重新提交</button>
                      <button v-if="doc.status === 'returned' && isDocumentOwner(doc)" class="action-btn cancel" @click="handleCancel(doc)">取消</button>
                      <button v-if="(doc.status === 'signed' || doc.status === 'distribution_ended') && isDocumentOwner(doc)" class="action-btn complete" @click="handleConfirmComplete(doc)">确认完成</button>
                    </template>

                    <!-- 接收打印部门操作 -->
                    <template v-if="activeTab === 'receive'">
                      <button v-if="doc.status === 'submitted'" class="action-btn receive" @click="handleReceive(doc)">接单</button>
                      <button v-if="doc.status === 'received'" class="action-btn material-sent" @click="handleSendMaterial(doc)">📤 发料完成</button>
                      <button v-if="doc.status === 'received'" class="action-btn return" @click="openReturnDialog(doc)">退回</button>
                    </template>

                    <!-- 签收分料部门操作 -->
                    <template v-if="activeTab === 'sign'">
                      <button v-if="(doc.status === 'received' || doc.status === 'material_sent') && canSignForDocument(doc)" class="action-btn return" @click="openReturnDialog(doc)">退回</button>
                      <button v-if="(doc.status === 'received' || doc.status === 'material_sent') && canSignForDocument(doc)" class="action-btn sign" @click="handleSign(doc)">签收</button>
                      <button v-if="(doc.status === 'signed' || doc.status === 'distribution_ended') && canSignForDocument(doc)" class="action-btn complete" @click="handleEndDistribution(doc)">分料结束</button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="documents.length === 0 && !isLoading">
                <td colspan="7" class="empty-cell">
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
            <div class="form-group">
              <label>配送地点 <span class="required">*</span></label>
              <select
                v-model="submitForm.deliveryLocation"
                required
              >
                <option value="">请选择配送地点</option>
                <option v-for="location in configuredDeliveryLocations" :key="location" :value="location">
                  {{ location }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>提交人姓名</label>
              <input type="text" v-model="submitForm.submitterName" readonly placeholder="当前登录用户">
            </div>
            <div class="form-group">
              <label>上传单据附件（PDF格式）</label>
              <div class="upload-area" @click="triggerFileInput" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop" :class="{ 'drag-over': isDragOver, 'uploading': isUploading }">
                <input type="file" ref="fileInput" @change="handleFileChange" accept=".pdf" style="display: none;">
                <div v-if="!submitForm.attachmentName && !isUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽PDF文件到此处上传</p>
                  <p class="upload-hint">只支持 PDF 格式</p>
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
            <div class="form-group">
              <label>配送地点 <span class="required">*</span></label>
              <select
                v-model="submitForm.deliveryLocation"
                required
              >
                <option value="">请选择配送地点</option>
                <option v-for="location in configuredDeliveryLocations" :key="location" :value="location">
                  {{ location }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>提交人姓名</label>
              <input type="text" v-model="submitForm.submitterName" readonly placeholder="当前登录用户">
            </div>
            <div class="form-group">
              <label>上传单据附件（PDF格式）</label>
              <div class="upload-area" @click="triggerFileInput" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop" :class="{ 'drag-over': isDragOver, 'uploading': isUploading }">
                <input type="file" ref="fileInput" @change="handleFileChange" accept=".pdf" style="display: none;">
                <div v-if="!submitForm.attachmentName && !isUploading" class="upload-placeholder">
                  <span class="upload-icon">📎</span>
                  <p>点击或拖拽PDF文件到此处上传</p>
                  <p class="upload-hint">只支持 PDF 格式</p>
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
                <span class="detail-label">配送地点</span>
                <span class="detail-value">{{ currentDocument?.deliveryLocation }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">提交人</span>
                <span class="detail-value">{{ currentDocument?.submitterName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">状态</span>
                <span class="status-badge" :style="{ backgroundColor: K045StatusColor[currentDocument?.status || 'submitted'] + '20', color: K045StatusColor[currentDocument?.status || 'submitted'] }">
                  {{ K045StatusText[currentDocument?.status || 'submitted'] }}
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
                <span class="detail-label">接收时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.receivedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">接收人</span>
                <span class="detail-value">{{ currentDocument?.receivedBy || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">发料时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.materialSentAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">签收时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.signedAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">签收人</span>
                <span class="detail-value">{{ currentDocument?.signedBy || '-' }}</span>
              </div>
              <div v-if="currentDocument?.status === 'returned'" class="detail-item">
                <span class="detail-label">退回原因</span>
                <span class="detail-value" style="color: #EF4444;">{{ currentDocument?.returnReason || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">分料结束时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.distributionEndedAt) }}</span>
              </div>
              <div v-if="currentDocument?.status === 'withdrawn'" class="detail-item">
                <span class="detail-label">撤回时间</span>
                <span class="detail-value">{{ formatDateTime(currentDocument?.withdrawnAt) }}</span>
              </div>
            </div>
          </div>

          <div v-if="currentDocument?.attachmentName" class="detail-section">
            <h4 class="section-title">附件预览</h4>
            <div class="pdf-embed-container">
              <iframe
                :src="getPreviewUrl(currentDocument)"
                class="pdf-embed-frame"
                title="PDF预览"
              ></iframe>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="closeDetailDialog">关闭</button>
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
              <input type="checkbox" v-model="sendReturnEmail" />
              <span>发送邮件通知提交人</span>
            </label>
          </div>
          <div class="form-hint">退回后将通知提交人</div>
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
import {
  K045Status,
  K045StatusText,
  K045StatusColor,
  K045Document,
  K045DocumentForm,
  getK045Documents,
  createK045Document,
  getK045DocumentById,
  updateK045Document,
  withdrawK045Document,
  cancelK045Document,
  receiveK045Document,
  returnK045Document,
  signK045Document,
  endDistributionK045Document,
  confirmCompleteK045Document,
  sendK045Notification,
  sendMaterialK045Notification,
  getK045Stats,
  uploadK045Attachment,
  rushK045Document,
  setUrgentK045Document
} from '../api/k045';
import { getK045Configs, K045_CONFIG_KEYS } from '../api/k045Config';
import { getUserInfo } from '../api/user';
import { clearRequestCache } from '../utils/request';
import request from '../utils/request';

// 配送地点配置详情（包含允许签收的部门）
const deliveryLocationDetails = ref<Array<{ location: string; departments: string }>>([]);

// 当前用户信息
const currentUserDepartmentId = ref<number | null>(null);
const currentUserDepartmentName = ref<string>('');

// 获取当前用户部门信息
const loadCurrentUserInfo = async () => {
  try {
    const userInfoRes = await getUserInfo();
    const userInfo = userInfoRes?.data || userInfoRes;
    currentUserDepartmentId.value = userInfo?.departmentId || null;
    currentUserDepartmentName.value = userInfo?.departmentName || '';
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
};

// W/C用户分配配置缓存
const wcUserAssignments = ref<Array<{wcName: string, userIds: number[]}>>([]);

// 加载W/C用户分配配置（使用DA物料配置接口）
const loadWCUserAssignments = async () => {
  try {
    const res = await request.get('/da-material-config/configs');
    const configs = (res as any)?.data || res || [];
    const wcAssignmentConfig = configs.find((c: any) => c.configKey === 'wc_department_assignment');
    if (wcAssignmentConfig && wcAssignmentConfig.configValue) {
      try {
        wcUserAssignments.value = JSON.parse(wcAssignmentConfig.configValue);
      } catch (e) {
        wcUserAssignments.value = [];
      }
    }
  } catch (error) {
    wcUserAssignments.value = [];
  }
};

// 获取当前用户的W/C名称（用于自动填充）
const getCurrentUserWCAssignment = (): string | null => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const userId = Number(currentUser.id);
  const assignments = wcUserAssignments.value;

  // 查找当前用户负责的W/C（同时检查数字和字符串类型）
  const userAssignments = assignments.filter(a =>
    a.userIds.includes(userId) || a.userIds.includes(Number(userId))
  );

  if (userAssignments.length === 1 && userAssignments[0]) {
    return userAssignments[0].wcName;
  }
  return null;
};

// 可选的W/C名称列表（从配置中获取）
const availableWCNames = computed(() => {
  return wcUserAssignments.value.map(a => a.wcName).filter(wc => wc);
});

// 检查用户是否有签收权限（基于配送地点和部门）
const canSignForDocument = (doc: K045Document): boolean => {
  // 查找该配送地点的配置
  const locationConfig = deliveryLocationDetails.value.find(
    (loc: any) => loc.location === doc.deliveryLocation
  );

  // 如果该配送地点没有配置权限列表，允许所有人签收
  if (!locationConfig || !locationConfig.departments) {
    return true;
  }

  // 如果用户没有部门信息，检查是否在允许列表中（允许列表为空时允许所有人）
  if (!currentUserDepartmentName.value) {
    return true;
  }

  // 解析允许签收的部门列表
  const allowedDepartments = locationConfig.departments
    .split(',')
    .map((d: string) => d.trim())
    .filter((d: string) => d);

  // 如果允许列表为空，允许所有人
  if (allowedDepartments.length === 0) {
    return true;
  }

  // 检查当前用户部门是否在允许列表中
  return allowedDepartments.includes(currentUserDepartmentName.value);
};

// 检查是否是单据提交人或管理员
const isDocumentOwner = (doc: K045Document): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  const currentUserName = currentUser.realName || currentUser.username || '';
  // 提交人或超级管理员可以操作
  if (doc.submitterName === currentUserName) return true;
  // 超级管理员可以操作所有单据
  if (currentUser.roleName === '超级管理员' || currentUser.role === 'super_admin') return true;
  return false;
};

// 标签页配置
const tabs = [
  { key: 'submit', label: '📤 提交管理', status: ['submitted', 'received', 'material_sent', 'rejected', 'returned', 'withdrawn', 'cancelled', 'distribution_ended', 'completed'] },
  { key: 'receive', label: '🖨️ 接收打印', status: ['submitted', 'received', 'cancelled'] },
  { key: 'sign', label: '✅ 签收分料', status: ['material_sent', 'received', 'signed', 'cancelled'] }
];

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
  received: 0,
  materialSent: 0,
  signed: 0,
  distributionEnded: 0,
  completed: 0,
  returned: 0,
  cancelled: 0,
  withdrawn: 0
});

// 选中的状态筛选
const selectedStatus = ref<string | null>(null);

// 按状态筛选
const filterByStatus = (status: string) => {
  if (selectedStatus.value === status) {
    selectedStatus.value = null; // 再次点击取消筛选
  } else {
    selectedStatus.value = status;
  }
  currentPage.value = 1;
  loadDocuments();
};

// 按状态筛选并切换到对应页签
const filterByStatusAndSwitchTab = (status: string, tabKey: string) => {
  activeTab.value = tabKey; // 切换到对应页签
  if (selectedStatus.value === status) {
    selectedStatus.value = null;
  } else {
    selectedStatus.value = status;
  }
  currentPage.value = 1;
  loadDocuments();
};

// 文档列表
const documents = ref<K045Document[]>([]);
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

// 配送地点历史记录
const deliveryLocationHistory = ref<string[]>([]);
const STORAGE_KEY = 'k045-delivery-locations';
const MAX_HISTORY_SIZE = 10;

// 配置的配送地点列表（从 K045 配置获取）
const configuredDeliveryLocations = ref<string[]>([]);

// 加载配送地点配置
const loadDeliveryLocationsFromConfig = async () => {
  try {
    const res = await getK045Configs();
    const configs = (res as any)?.data || res || [];
    const deliveryConfig = configs.find((c: any) => c.configKey === K045_CONFIG_KEYS.DELIVERY_LOCATIONS);
    if (deliveryConfig?.configValue) {
      try {
        const parsed = JSON.parse(deliveryConfig.configValue);
        configuredDeliveryLocations.value = parsed
          .map((item: any) => item.location)
          .filter((loc: string) => loc);
        // 保存完整的配送地点配置详情（包含允许签收的部门）
        deliveryLocationDetails.value = parsed.filter((item: any) => item.location);
      } catch {
        configuredDeliveryLocations.value = [];
        deliveryLocationDetails.value = [];
      }
    }
  } catch (error) {
    console.error('加载配送地点配置失败:', error);
  }
};

// 加载配送地点历史记录
const loadDeliveryLocationHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      deliveryLocationHistory.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('加载配送地点历史失败:', e);
  }
};

// 保存配送地点到历史记录
const saveDeliveryLocationToHistory = (location: string) => {
  if (!location.trim()) return;

  const trimmed = location.trim();
  let history = [...deliveryLocationHistory.value];

  // 移除已存在的相同记录（避免重复）
  history = history.filter(item => item !== trimmed);

  // 添加到最前面
  history.unshift(trimmed);

  // 限制历史记录数量
  if (history.length > MAX_HISTORY_SIZE) {
    history = history.slice(0, MAX_HISTORY_SIZE);
  }

  deliveryLocationHistory.value = history;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

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
const submitForm = reactive<K045DocumentForm>({
  documentNo: '',
  wcName: '',
  deliveryLocation: '',
  submitterName: '',
  isUrgent: false,
  isRush: false,
  attachmentUrl: '',
  attachmentName: ''
});

// 详情对话框
const isDetailDialogOpen = ref(false);
const currentDocument = ref<K045Document | null>(null);

// 退回对话框
const isReturnDialogOpen = ref(false);
const returnReason = ref('');
const sendReturnEmail = ref(true); // 默认勾选发送邮件
const returningDocument = ref<K045Document | null>(null);

// 文件上传进度
const uploadProgress = ref(0);
const isUploading = ref(false);

// 加载文档列表
const loadDocuments = async () => {
  isLoading.value = true;
  // 清除缓存，确保获取最新数据
  clearRequestCache();
  try {
    const currentTabConfig = tabs.find(t => t.key === activeTab.value);
    // 如果有按状态筛选，使用筛选的状态；否则使用标签页的状态
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
      pageSize: pageSize.value,
      _t: Date.now()
    };

    const res: any = await getK045Documents(params);
    // 后端返回 { code, message, data: { items, pagination } }
    documents.value = res?.data?.items || res?.items || [];
    totalCount.value = res?.data?.pagination?.total || res?.total || documents.value.length;
  } catch (error) {
    console.error('加载单据列表失败:', error);
    documents.value = [];
    totalCount.value = 0;
  } finally {
    isLoading.value = false;
  }
};

// 语音提醒

// 加载统计数据
const loadStats = async () => {
  try {
    const res: any = await getK045Stats();
    // axios 拦截器返回 { code, message, data: {...} }
    const data = res?.data || res || {};
    const newStats = {
      submitted: data?.submitted || 0,
      received: data?.received || 0,
      materialSent: data?.materialSent || 0,
      signed: data?.signed || 0,
      distributionEnded: data?.distributionEnded || 0,
      completed: data?.completed || 0,
      returned: data?.returned || 0,
      cancelled: data?.cancelled || 0,
      withdrawn: data?.withdrawn || 0
    };
    stats.value = newStats;

    // 语音提醒：有待接收或待签收的单据时
    // 语音提醒已禁用
  } catch (error) {
    console.error('加载统计数据失败:', error);
    stats.value = {
      submitted: 0,
      received: 0,
      materialSent: 0,
      signed: 0,
      distributionEnded: 0,
      completed: 0,
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
const openSubmitDialog = async () => {
  resetSubmitForm();

  // 如果配置还没加载，先加载
  if (wcUserAssignments.value.length === 0) {
    await loadWCUserAssignments();
  }

  // 自动填充当前用户负责的W/C
  const autoWCName = getCurrentUserWCAssignment();
  if (autoWCName) {
    submitForm.wcName = autoWCName;
  }
  isSubmitDialogOpen.value = true;
};

// 打开编辑对话框
const openEditDialog = (doc: K045Document) => {
  editingDocumentId.value = doc.id || null;
  submitForm.documentNo = doc.documentNo;
  submitForm.wcName = doc.wcName;
  submitForm.deliveryLocation = doc.deliveryLocation;
  submitForm.submitterName = doc.submitterName;
  submitForm.isUrgent = doc.isUrgent;
  submitForm.isRush = doc.isRush;
  submitForm.attachmentUrl = doc.attachmentUrl || '';
  submitForm.attachmentName = doc.attachmentName || '';
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

  isSubmitting.value = true;
  try {
    await updateK045Document(editingDocumentId.value, {
      wcName: submitForm.wcName,
      deliveryLocation: submitForm.deliveryLocation,
      isUrgent: submitForm.isUrgent,
      isRush: submitForm.isRush,
      attachmentUrl: submitForm.attachmentUrl,
      attachmentName: submitForm.attachmentName
    });
    ElMessage.success({ message: '单据已重新提交', showClose: true, duration: 3000 });
    closeEditDialog();
    clearRequestCache();
    loadStats();
  } catch (error: any) {
    console.error('重新提交失败:', error);
    console.error('错误响应:', error?.response?.data);
    const errorMsg = error?.response?.data?.message || error?.message || '重新提交失败';
    ElMessage.error({ message: errorMsg, showClose: true, duration: 3000 });
  } finally {
    isSubmitting.value = false;
  }
};

// 重置提交表单
const resetSubmitForm = () => {
  submitForm.documentNo = '';
  submitForm.wcName = '';
  submitForm.deliveryLocation = '';
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
  if (file.type !== 'application/pdf') {
    ElMessage.error({ message: '只支持 PDF 格式文件', showClose: true, duration: 3000 });
    return;
  }

  // 验证文件大小（最大10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error({ message: '文件大小不能超过 10MB', showClose: true, duration: 3000 });
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
    const res = await uploadK045Attachment(file);
    clearInterval(progressInterval);
    uploadProgress.value = 100;
    submitForm.attachmentUrl = res.filePath;
    submitForm.attachmentName = res.originalName;
    ElMessage.success({ message: '文件上传成功', showClose: true, duration: 3000 });

    // 进度条保持1秒后消失
    setTimeout(() => {
      uploadProgress.value = 0;
    }, 1000);
  } catch (error) {
    clearInterval(progressInterval);
    console.error('文件上传失败:', error);
    ElMessage.error({ message: '文件上传失败，请重试', showClose: true, duration: 3000 });
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

// 提交单据
const handleSubmit = async () => {
  if (!submitForm.documentNo || !submitForm.wcName || !submitForm.deliveryLocation || !submitForm.submitterName) {
    ElMessage.warning({ message: '请填写必填项', showClose: true, duration: 3000 });
    return;
  }

  // 验证附件是否上传
  if (!submitForm.attachmentUrl || !submitForm.attachmentName) {
    ElMessage.warning({ message: '请上传单据附件（PDF格式）', showClose: true, duration: 3000 });
    return;
  }

  isSubmitting.value = true;
  try {
    await createK045Document(submitForm);
    // 保存配送地点到历史记录
    saveDeliveryLocationToHistory(submitForm.deliveryLocation);
    ElMessage.success({ message: '单据提交成功', showClose: true, duration: 3000 });
    closeSubmitDialog();
    clearRequestCache();
    loadDocuments();
    loadStats();
  } catch (error) {
    console.error('提交失败:', error);
    ElMessage.error({ message: '单据提交失败，请重试', showClose: true, duration: 3000 });
  } finally {
    isSubmitting.value = false;
  }
};

// 查看详情
const viewDocument = async (doc: K045Document) => {
  try {
    // 重新从服务器获取最新数据，确保显示接收人/签收人等信息
    const res: any = await getK045DocumentById(doc.id!);
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
const handleWithdraw = (doc: K045Document) => {
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
      await withdrawK045Document(doc.id!);
      ElMessage.success({ message: '单据已撤回', showClose: true, duration: 3000 });
      clearRequestCache();
      loadStats();
    } catch (error) {
      console.error('撤回失败:', error);
      ElMessage.error({ message: '单据撤回失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 取消单据
const handleCancel = (doc: K045Document) => {
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
      await cancelK045Document(doc.id!);
      ElMessage.success({ message: '单据已取消', showClose: true, duration: 3000 });
      clearRequestCache();
      loadStats();
    } catch (error) {
      console.error('取消失败:', error);
      ElMessage.error({ message: '单据取消失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 催单
const handleRush = (doc: K045Document) => {
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
      await rushK045Document(doc.id!);
      ElMessage.success({ message: '催单通知已发送', showClose: true, duration: 3000 });
      clearRequestCache();
      loadStats();
    } catch (error) {
      console.error('催单失败:', error);
      ElMessage.error({ message: '催单失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 设置/取消加急
const handleSetUrgent = async (doc: K045Document) => {
  const action = doc.isUrgent ? '取消加急' : '设为加急';
  try {
    await setUrgentK045Document(doc.id!, !doc.isUrgent);
    ElMessage.success({ message: `${action}成功`, showClose: true, duration: 3000 });
    clearRequestCache();
    loadDocuments();
    loadStats();
  } catch (error) {
    console.error(`${action}失败:`, error);
    ElMessage.error({ message: `${action}失败，请重试`, showClose: true, duration: 3000 });
  }
};

// 预览附件
const handlePreview = (doc: K045Document) => {
  if (doc.attachmentUrl) {
    const fileName = doc.attachmentUrl.split('/').pop();
    window.open(`/api/k045/preview/${fileName}`, '_blank');
  } else {
    ElMessage.warning({ message: '该单据没有附件', showClose: true, duration: 3000 });
  }
};

// 获取PDF预览URL
const getPreviewUrl = (doc: K045Document): string => {
  if (doc.attachmentUrl) {
    const fileName = doc.attachmentUrl.split('/').pop();
    return `/api/k045/preview/${fileName}`;
  }
  return '';
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

// 接收单据
const handleReceive = (doc: K045Document) => {
  const currentUser = getCurrentUser();
  const receivedBy = currentUser?.realName || currentUser?.username || '接收员';

  ElMessageBox.confirm(
    `确定接收单据 ${doc.documentNo} 吗？接收人：${receivedBy}\n\n接收后系统将自动打印附件。`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await receiveK045Document(doc.id!, receivedBy);
      ElMessage.success({ message: '单据已接收，正在打印...', showClose: true, duration: 3000 });

      // 打印附件
      printAttachment(doc);

      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('接收失败:', error);
      ElMessage.error({ message: '单据接收失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 发料完成 - 发送邮件通知
const handleSendMaterial = (doc: K045Document) => {
  ElMessageBox.confirm(
    `确定单据 ${doc.documentNo} 发料完成吗？\n\n系统将自动打开邮件客户端通知签收分料部门。`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      // 调用后端API获取邮件信息
      const result: any = await sendMaterialK045Notification(doc.id!);
      // axios 拦截器返回 { code, message, data: {...} }
      const resData = result?.data || result;

      // 构建 mailto 链接，发送给签收分料部门（收件人），抄送给W/C负责用户
      if (resData?.recipientEmails) {
        const recipientEmails = resData.recipientEmails;
        const ccEmails = resData.ccEmails || '';
        const subject = encodeURIComponent(resData.subject || '');
        const body = encodeURIComponent(resData.body || '');

        // 构建 mailto URL（收件人和抄送人）
        let mailtoUrl = `mailto:${recipientEmails}`;
        const params: string[] = [];
        if (ccEmails) {
          params.push(`cc=${ccEmails}`);
        }
        params.push(`subject=${subject}`);
        params.push(`body=${body}`);

        mailtoUrl += '?' + params.join('&');

        // 打开邮件客户端
        window.location.href = mailtoUrl;
      } else {
        ElMessage.warning({ message: '未配置收件人邮箱，请检查配送地点的部门邮箱配置', showClose: true, duration: 5000 });
      }

      ElMessage.success({ message: '发料完成', showClose: true, duration: 3000 });
      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('发料完成失败:', error);
      ElMessage.error({ message: '发料完成失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 打印附件 - 使用专门的打印页面
const printAttachment = (doc: K045Document) => {
  if (doc.attachmentUrl) {
    const fileName = doc.attachmentUrl.split('/').pop();

    // 打开打印页面，会自动触发打印
    const printUrl = `/print?file=${encodeURIComponent(fileName || '')}`;
    window.open(printUrl, '_blank', 'width=900,height=700');
  } else {
    ElMessage.warning({ message: '该单据没有附件可打印', showClose: true, duration: 3000 });
  }
};

// 打开退回对话框
const openReturnDialog = (doc: K045Document) => {
  returningDocument.value = doc;
  returnReason.value = '';
  sendReturnEmail.value = true;
  isReturnDialogOpen.value = true;
};

const closeReturnDialog = () => {
  isReturnDialogOpen.value = false;
  returningDocument.value = null;
  returnReason.value = '';
  sendReturnEmail.value = true;
};

// 确认退回
const isReturning = ref(false); // 防止重复点击

const confirmReturn = async () => {
  if (!returnReason.value.trim()) {
    ElMessage.warning({ message: '请输入退回原因', showClose: true, duration: 3000 });
    return;
  }

  if (isReturning.value) {
    return; // 防止重复提交
  }

  const currentUser = getCurrentUser();
  const returnedBy = currentUser?.realName || currentUser?.username || '接收打印员';
  const doc = returningDocument.value!;

  // 先弹出邮件通知确认
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
      const result = await returnK045Document(doc.id!, returnReason.value, returnedBy);
      const resData = result?.data || result;

      // 根据用户勾选决定是否发送邮件通知
      const submitterEmail = resData?.submitterEmail;
      if (submitterEmail && sendReturnEmail.value) {
        const documentNo = resData?.documentNo || doc.documentNo;
        const subject = encodeURIComponent(`【单据退回通知】${documentNo}`);
        const body = encodeURIComponent(
          `您好，${doc.submitterName}\n\n` +
          `您的单据 ${documentNo} 已被退回。\n\n` +
          `退回信息：\n` +
          `- 单号：${documentNo}\n` +
          `- 退回原因：${returnReason.value}\n` +
          `- 退回人：${returnedBy}\n` +
          `- 退回时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n` +
          `请登录 Jabil Smart Office 系统查看详情。\n\n` +
          `---\nJabil Smart Office 系统自动发送`
        );
        const mailtoUrl = `mailto:${submitterEmail}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
      } else if (submitterEmail) {
        ElMessage.info({ message: '已取消邮件通知', showClose: true, duration: 3000 });
      }

      ElMessage.success({ message: '单据已退回', showClose: true, duration: 3000 });
      closeReturnDialog();
      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('退回失败:', error);
      ElMessage.error({ message: '退回失败，请重试', showClose: true, duration: 3000 });
    } finally {
      isReturning.value = false;
    }
  }).catch(() => {
    // 用户取消
  });
};

// 签收单据
const handleSign = (doc: K045Document) => {
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
      await signK045Document(doc.id!, signedBy);
      ElMessage.success({ message: '单据已签收', showClose: true, duration: 3000 });
      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('签收失败:', error);
      ElMessage.error({ message: '单据签收失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 分料结束（同时发送邮件通知）
const handleEndDistribution = (doc: K045Document) => {
  ElMessageBox.confirm(
    `确定单据 ${doc.documentNo} 分料结束吗？\n\n系统将自动打开邮件客户端发送给 ${doc.submitterName}。`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    try {
      await endDistributionK045Document(doc.id!);
      // 分料结束后自动打开邮件客户端
      const notifyResult: any = await sendK045Notification(doc.id!);
      // axios 拦截器返回 { code, message, data: {...} }
      const notifyData = notifyResult?.data || notifyResult;
      // 在前端构建 mailto 链接，避免 URL 编码在 JSON 序列化/反序列化过程中被破坏
      if (notifyData?.submitterEmail) {
        const subject = encodeURIComponent(notifyData.subject || '');
        const body = encodeURIComponent(notifyData.body || '');
        const mailtoUrl = `mailto:${notifyData.submitterEmail}?subject=${subject}&body=${body}`;
        // 直接设置 location 打开邮件客户端，避免被浏览器阻止
        window.location.href = mailtoUrl;
      } else {
        ElMessage.warning({ message: `未找到 ${doc.submitterName} 的邮箱地址，请手动发送邮件通知`, showClose: true, duration: 3000 });
      }
      ElMessage.success({ message: '分料已结束', showClose: true, duration: 3000 });
      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('分料结束失败:', error);
      ElMessage.error({ message: '分料结束失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 提交人确认完成（签收）
const handleConfirmComplete = (doc: K045Document) => {
  const currentUser = getCurrentUser();
  const completedBy = currentUser?.realName || currentUser?.username || '提交人';

  ElMessageBox.confirm(
    `确认单据 ${doc.documentNo} 已完成分料收货吗？`,
    '确认完成',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'success'
    }
  ).then(async () => {
    try {
      await confirmCompleteK045Document(doc.id!, completedBy);
      ElMessage.success({ message: '单据已完成', showClose: true, duration: 3000 });
      clearRequestCache();
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('确认完成失败:', error);
      ElMessage.error({ message: '确认完成失败，请重试', showClose: true, duration: 3000 });
    }
  }).catch(() => {});
};

// 导出数据
const exportData = () => {
  ElMessage.info({ message: '导出功能开发中...', showClose: true, duration: 3000 });
};

// 监听标签页变化，重新加载数据
watch(() => activeTab.value, () => {
  currentPage.value = 1;
  selectedStatus.value = null; // 切换标签页时清除卡片筛选
  loadDocuments();
});

// ESC 键关闭对话框
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isDetailDialogOpen.value) {
      closeDetailDialog();
    } else if (isReturnDialogOpen.value) {
      closeReturnDialog();
    } else if (isEditDialogOpen.value) {
      closeEditDialog();
    } else if (isSubmitDialogOpen.value) {
      closeSubmitDialog();
    }
  }
};

// 组件挂载时加载数据
onMounted(() => {
  loadDocuments();
  loadStats();
  loadDeliveryLocationHistory();
  loadDeliveryLocationsFromConfig();
  loadCurrentUserInfo();
  loadWCUserAssignments();
  document.addEventListener('keydown', handleKeyDown);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.k045-container {
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
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden;
  flex: 1;
  min-width: 0;
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

.stat-card-red { color: #F5222D; }
.stat-card-red::before { background: linear-gradient(90deg, #F5222D, #ff7875); }
.stat-card-red .stat-icon-bg { background: linear-gradient(135deg, #FFF1F0 0%, #FFCCC7 100%); }

.stat-card-violet { color: #722ED1; }
.stat-card-violet::before { background: linear-gradient(90deg, #722ED1, #9254DE); }
.stat-card-violet .stat-icon-bg { background: linear-gradient(135deg, #F9F0FF 0%, #E8D5FF 100%); }

.stat-card-gray { color: #8C8C8C; }
.stat-card-gray::before { background: linear-gradient(90deg, #8C8C8C, #a6a6a6); }
.stat-card-gray .stat-icon-bg { background: linear-gradient(135deg, #FAFAFA 0%, #E8E8E8 100%); }

.stat-icon-bg {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 22px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
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

.search-select {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fff;
  cursor: pointer;
  min-width: 140px;
  transition: all 0.2s;
}

.search-select:focus {
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
  padding: 8px 12px;
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
  padding: 30px 16px !important;
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

.action-btn.urgent {
  background-color: #FEF3C7;
  color: #D97706;
}

.action-btn.urgent:hover {
  background-color: #FDE68A;
}

.action-btn.urgent-active {
  background-color: #FEE2E2;
  color: #DC2626;
}

.action-btn.urgent-active:hover {
  background-color: #FECACA;
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

.action-btn.receive {
  background-color: #D1FAE5;
  color: #059669;
}

.action-btn.receive:hover {
  background-color: #A7F3D0;
}

.action-btn.material-sent {
  background-color: #E9D5FF;
  color: #7C3AED;
}

.action-btn.material-sent:hover {
  background-color: #DDD6FE;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
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

.attachment-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
}

.attachment-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.attachment-preview .pdf-icon {
  font-size: 36px;
}

.attachment-preview .pdf-label {
  font-size: 12px;
  color: #DC2626;
  font-weight: 600;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-size: 14px;
  color: #1F2937;
  word-break: break-all;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 8px;
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

/* Responsive */
@media (max-width: 1400px) {
  .stats-cards {
    flex-wrap: wrap;
  }
  .stat-card {
    min-width: calc(33.333% - 12px);
  }
}

@media (max-width: 1200px) {
  .stats-cards {
    flex-wrap: wrap;
  }
  .stat-card {
    min-width: calc(50% - 12px);
  }
}

@media (max-width: 768px) {
  .stats-cards {
    flex-wrap: wrap;
  }
  .stat-card {
    min-width: calc(50% - 12px);
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
