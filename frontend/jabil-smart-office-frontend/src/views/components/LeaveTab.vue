<template>
  <div class="leave-tab-container">
    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总申请</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">{{ tabType === 'annual' ? '待审批' : '待提交' }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.approved }}</div>
            <div class="stat-label">{{ tabType === 'annual' ? '已批准' : '已提交' }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card" v-if="tabType === 'annual'">
        <div class="stat-content">
          <div class="stat-icon">
            <el-icon><Close /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.rejected }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="filter-input"
      />
      <el-select v-model="filterStatus" placeholder="选择状态" clearable class="filter-select">
        <el-option label="全部" value="" />
        <el-option :label="tabType === 'annual' ? '待审批' : '待提交'" value="pending" />
        <el-option :label="tabType === 'annual' ? '已批准' : '已提交'" value="approved" />
        <el-option label="已拒绝" value="rejected" v-if="tabType === 'annual'" />
      </el-select>
      <el-input
        v-model="filterEmployee"
        placeholder="搜索员工姓名"
        clearable
        class="filter-input"
      />
      <el-button
        type="primary"
        @click="handleAdd"
        :icon="Plus"
        :disabled="!hasAddPermission()"
      >
        新增申请
      </el-button>
      <el-button
        type="success"
        @click="handleBatchUpload"
        :icon="Upload"
        :disabled="!hasAddPermission()"
      >
        批量上传
      </el-button>
      <el-button
        type="warning"
        @click="handleExport"
        :icon="Download"
      >
        导出
      </el-button>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedRows.length > 0" class="batch-action-bar">
      <span>已选择 {{ selectedRows.length }} 条</span>
      <el-button type="success" size="small" @click="handleBatchSubmit" :disabled="!hasBatchSubmitPermission()">
        批量提交
      </el-button>
      <el-button size="small" @click="clearSelection">取消选择</el-button>
    </div>

    <el-table
  :data="filteredData"
  stripe
  class="data-table"
  border
  :row-key="(row: LeaveRequest) => row.id"
  :row-class-name="getRowClassName"
  @selection-change="handleSelectionChange"
>
    <!-- 多选列 -->
    <el-table-column type="selection" width="40" :selectable="checkSelectable" />
    <!-- 通用信息列 -->
    <el-table-column prop="employeeName" label="姓名" width="80" fixed="left" />
    <el-table-column prop="departmentName" label="部门" width="140" />
    <el-table-column prop="type" label="类型" width="80">
      <template #default="{ row }">
        <el-tag :type="getTypeTagType(row.type)" size="small">{{ row.type }}</el-tag>
      </template>
    </el-table-column>

      <!-- 临时加班、临时请假&公差的时间列 -->
      <el-table-column label="开始时间" width="150" v-if="tabType === 'overtime' || tabType === 'temporary'">
        <template #default="{ row }">
          <span>{{ formatTemporaryTime(row.startDate, row.startTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结束时间" width="150" v-if="tabType === 'overtime' || tabType === 'temporary'">
        <template #default="{ row }">
          <span>{{ formatTemporaryTime(row.endDate, row.endTime) }}</span>
        </template>
      </el-table-column>

      <!-- 请假&年假的日期列 -->
      <el-table-column prop="startDate" label="开始日期" width="120" v-if="tabType === 'annual'" />
      <el-table-column prop="endDate" label="结束日期" width="120" v-if="tabType === 'annual'" />

      <!-- 时长/天数（离职&转岗显示转入时间） -->
      <el-table-column v-if="tabType !== 'resignation'" prop="duration" label="时长" width="80">
        <template #default="{ row }">
          <span class="duration-text">{{ row.duration }}{{ durationUnit }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="tabType === 'resignation'" prop="transferDate" label="转入时间" width="100">
        <template #default="{ row }">
          <span>{{ (row.transferDate || row.transfer_date) ? (row.transferDate || row.transfer_date).split('T')[0] : '-' }}</span>
        </template>
      </el-table-column>

      <!-- 状态列 -->
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>

      <!-- 转岗审批状态列 -->
      <template v-if="tabType === 'resignation'">
        <el-table-column label="转出审批" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.type === '转岗'" :type="getApprovalStatusTagType(row.transferOutApprovalStatus)" size="small">
              {{ getApprovalStatusText(row.transferOutApprovalStatus) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="转入审批" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.type === '转岗'" :type="getApprovalStatusTagType(row.transferInApprovalStatus)" size="small">
              {{ getApprovalStatusText(row.transferInApprovalStatus) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </template>

      <!-- 审批人列 -->
      <el-table-column label="审批人" width="75" v-if="tabType === 'annual' || tabType === 'resignation'">
        <template #default="{ row }">
          <span v-if="row.type === '转岗'">
            {{ (row.transferOutApproverName || '-') + ' / ' + (row.transferInApproverName || '-') }}
          </span>
          <span v-else>{{ row.approverName || '-' }}</span>
        </template>
      </el-table-column>

      <!-- 原因和申请日期 -->
      <el-table-column prop="reason" label="原因" width="200" show-overflow-tooltip />
      <el-table-column label="证明文件" width="100" v-if="tabType === 'temporary'">
        <template #default="{ row }">
          <div v-if="row.proofFile" class="proof-file-container">
            <!-- 图片预览 -->
            <el-image
              v-if="isImageFile(row.proofFile)"
              :src="getImageUrl(row.proofFile)"
              fit="cover"
              style="width: 80px; height: 60px; border-radius: 4px; cursor: pointer;"
              :preview-src-list="[getImageUrl(row.proofFile)]"
              preview-teleported
            >
              <template #error>
                <div style="width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f5f7fa; color: #909399; font-size: 12px;">
                  失败
                </div>
              </template>
            </el-image>
            <!-- 非图片文件显示查看链接 -->
            <span
              v-else
              class="proof-file-link"
              @click="handleViewProof(row)"
            >
              <el-icon><Document /></el-icon>
              查看
            </span>
          </div>
          <span v-else style="color: #909399;">-</span>
        </template>
      </el-table-column>
      <el-table-column label="申请日期" width="120">
        <template #default="{ row }">
          <span>{{ row.applyDate ? row.applyDate.split(' ')[0] : '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" :width="tabType === 'resignation' ? 420 : (tabType === 'temporary' ? 300 : 380)" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons" style="gap: 4px;">
            <el-button 
              text
              type="primary" 
              size="small" 
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button 
              text
              type="success" 
              size="small" 
              @click="handleSubmitStatus(row)" 
              v-if="tabType !== 'annual' && row.status === 'pending'"
            >
              提交
            </el-button>
            <el-button 
              text
              type="warning" 
              size="small" 
              @click="handleUnsubmit(row)" 
              v-if="tabType !== 'annual' && row.status === 'approved'"
            >
              撤回
            </el-button>
            <!-- 转岗审批按钮 -->
            <template v-if="tabType === 'resignation' && row.type === '转岗'">
              <el-button 
                text
                type="success" 
                size="small" 
                @click="handleTransferOutApprove(row)" 
              >
                转出批准
              </el-button>
              <el-button 
                text
                type="warning" 
                size="small" 
                @click="handleTransferOutReject(row)" 
              >
                转出拒绝
              </el-button>
              <el-button 
                text
                type="success" 
                size="small" 
                @click="handleTransferInApprove(row)" 
              >
                转入批准
              </el-button>
              <el-button 
                text
                type="warning" 
                size="small" 
                @click="handleTransferInReject(row)" 
              >
                转入拒绝
              </el-button>
            </template>
            <!-- 离职审批按钮 -->
            <template v-if="tabType === 'resignation' && row.type === '离职'">
              <el-button 
                text
                type="success" 
                size="small" 
                @click="handleApprove(row)" 
              >
                批准
              </el-button>
              <el-button 
                text
                type="warning" 
                size="small" 
                @click="handleReject(row)" 
              >
                拒绝
              </el-button>
            </template>
            <!-- 普通请假审批按钮 -->
            <template v-if="tabType === 'annual'">
              <el-button 
                text
                type="success" 
                size="small" 
                @click="handleApprove(row)" 
              >
                批准
              </el-button>
              <el-button 
                text
                type="warning" 
                size="small" 
                @click="handleReject(row)" 
              >
                拒绝
              </el-button>
              <el-button 
                text
                type="info" 
                size="small" 
                @click="handleTransfer(row)" 
              >
                转审
              </el-button>
            </template>
            <!-- 打回重提按钮 -->
            <el-button 
              text
              type="primary" 
              size="small" 
              @click="handleResubmit(row)" 
              v-if="tabType === 'annual'"
            >
              打回重提
            </el-button>
            <el-button 
              text
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[15, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      @size-change="handlePageSizeChange"
      class="pagination"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑申请' : '新增申请'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="员工" prop="employeeId">
          <el-select v-model="form.employeeId" placeholder="请选择员工" style="width: 100%">
            <el-option v-for="emp in employees" :key="emp.id" :label="emp.name" :value="emp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批人" prop="approverId" v-if="(tabType === 'annual') || (tabType === 'resignation' && form.type === '离职')">
          <el-select v-model="form.approverId" placeholder="请选择审批人" style="width: 100%">
            <el-option v-for="emp in filteredApprovers" :key="emp.id" :label="emp.name" :value="emp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type" v-if="tabType === 'temporary'">
          <el-select 
            v-model="form.type" 
            placeholder="请选择类型" 
            style="width: 100%"
            @change="handleTypeChange"
          >
            <el-option label="临时请假" value="临时请假" />
            <el-option label="公差" value="公差" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type" v-else-if="tabType === 'annual'">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="年假" value="年假" />
            <el-option label="事假" value="事假" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type" v-else-if="tabType === 'resignation'">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="离职" value="离职" />
            <el-option label="转岗" value="转岗" />
          </el-select>
        </el-form-item>
        
        <!-- 临时加班/临时请假：日期 + 时间 -->
        <template v-if="tabType === 'overtime' || tabType === 'temporary'">
          <el-form-item label="日期" prop="date">
            <el-date-picker
              v-model="formDate"
              type="date"
              placeholder="选择日期"
              style="width: 100%"
              @change="handleFormDateChange"
            />
          </el-form-item>
          <el-form-item label="开始时间" prop="startTime">
            <el-time-picker
              v-model="formStartTime"
              placeholder="选择开始时间"
              format="HH:mm"
              value-format="HH:mm"
              style="width: 100%"
              @change="handleFormTimeChange"
            />
          </el-form-item>
          <el-form-item label="结束时间" prop="endTime">
            <el-time-picker
              v-model="formEndTime"
              placeholder="选择结束时间"
              format="HH:mm"
              value-format="HH:mm"
              style="width: 100%"
              @change="handleFormTimeChange"
            />
          </el-form-item>
        </template>
        
        <!-- 请假&年假：日期区间 -->
        <template v-else-if="props.tabType === 'annual'">
          <el-form-item label="日期范围" prop="formDateRange">
            <el-date-picker
              v-model="formDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 100%"
              @change="handleFormDateRangeChange"
            />
          </el-form-item>
        </template>
        
        <!-- 离职&转岗 -->
        <template v-else-if="props.tabType === 'resignation'">
          <!-- 离职类型：显示单个办理日期 -->
          <el-form-item 
            v-if="form.type === '离职'" 
            label="离职办理日期" 
            prop="transferDate"
          >
            <el-date-picker
              v-model="form.transferDate"
              type="date"
              placeholder="请选择离职办理日期"
              style="width: 100%"
            />
          </el-form-item>
          
          <!-- 转岗类型：显示转入时间和转入部门 -->
          <template v-if="form.type === '转岗'">
            <el-form-item label="新部门转入时间" prop="transferDate">
              <el-date-picker
                v-model="form.transferDate"
                type="date"
                placeholder="请选择转入时间"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="转入部门" prop="transferDepartmentId">
              <el-select
                v-model="form.transferDepartmentId"
                placeholder="请选择转入部门"
                style="width: 100%"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </el-form-item>
          </template>
        </template>
        <el-form-item label="原因" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入原因"
          />
        </el-form-item>
        <el-form-item 
          label="证明材料" 
          v-if="tabType === 'temporary'"
          prop="proofFile"
        >
          <div style="margin-bottom: 8px; font-size: 12px; color: #6b7280;">
            <span v-if="isOvertimeAndMoreThan2Hours">公差超过2小时，证明材料必填</span>
            <span v-else>证明材料（可选）</span>
          </div>
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
          >
            <el-button type="primary">上传文件</el-button>
          </el-upload>
          <!-- 上传文件预览 -->
          <div v-if="uploadedProofFile" style="margin-top: 12px;">
            <div style="font-size: 12px; color: #606266; margin-bottom: 8px;">已上传文件：</div>
            <!-- 图片预览 -->
            <el-image
              v-if="isImageFile(uploadedProofFile)"
              :src="getImageUrl(uploadedProofFile)"
              fit="cover"
              style="width: 150px; height: 150px; border-radius: 4px;"
              :preview-src-list="[getImageUrl(uploadedProofFile)]"
              preview-teleported
            />
            <!-- 非图片文件显示文件名 -->
            <div v-else style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px;">
              <el-icon><Document /></el-icon>
              <span>{{ uploadedProofFile.substring(uploadedProofFile.indexOf('-') + 1) }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="transferDialogVisible"
      title="转审申请"
      width="500px"
    >
      <el-form :model="transferForm" :rules="transferRules" ref="transferFormRef" label-width="100px">
        <el-form-item label="当前审批人">
          <span>{{ currentApprover }}</span>
        </el-form-item>
        <el-form-item label="转审给" prop="transferTo">
          <el-select v-model="transferForm.transferTo" placeholder="请选择审批人" style="width: 100%">
            <el-option v-for="user in filteredApprovers" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="转审原因" prop="reason">
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入转审原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTransferSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量上传对话框 -->
    <el-dialog
      v-model="batchUploadDialogVisible"
      title="批量上传"
      width="600px"
    >
      <div class="batch-upload-container">
        <div class="upload-tips">
          <p>1. 请先下载Excel模板，按照模板格式填写数据</p>
          <p>2. 员工姓名必须与系统中已有的员工姓名一致</p>
          <p>3. 时长由系统自动根据日期/时间计算</p>
          <p>4. 状态自动设置为"待提交/待审批"</p>
          <p>5. 支持的文件格式：.xlsx / .xls</p>
        </div>
        
        <el-button type="primary" @click="downloadTemplate" :icon="Download">
          下载Excel模板
        </el-button>
        
        <el-upload
          class="upload-area"
          drag
          :auto-upload="false"
          :on-change="handleFileUploadChange"
          :file-list="batchUploadFileList"
          :limit="1"
          accept=".xlsx,.xls"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传Excel文件(.xlsx/.xls)
            </div>
          </template>
        </el-upload>
        
        <!-- 上传预览和错误信息 -->
        <div v-if="batchUploadErrors.length > 0" class="upload-errors">
          <h4>数据验证错误：</h4>
          <ul>
            <li v-for="(error, index) in batchUploadErrors" :key="index">
              {{ error }}
            </li>
          </ul>
        </div>
        
        <div v-if="batchUploadSuccess" class="upload-success">
          <el-alert
            :title="`成功导入 ${batchUploadSuccess.insertedCount} 条数据`"
            type="success"
            :closable="false"
            show-icon
          />
        </div>
      </div>
      
      <template #footer>
        <el-button @click="closeBatchUploadDialog">取消</el-button>
        <el-button 
          type="primary" 
          @click="confirmBatchUpload" 
          :loading="batchUploadLoading"
          :disabled="!batchUploadFileList.length"
        >
          确认上传
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ref, computed, onMounted, nextTick, watch } from 'vue'

// 错误信息处理辅助函数
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    return (error as { message?: string; msg?: string }).message || (error as { msg?: string }).msg || JSON.stringify(error);
  }
  return String(error);
}

// 获取当前登录用户信息
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch (error) {
    ElMessage.error('获取用户信息失败: ' + getErrorMessage(error))
  }
  return null
}

const currentUser = getCurrentUser()
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Document, Clock, SuccessFilled, Close, Plus, Upload, Download, UploadFilled } from '@element-plus/icons-vue'
import dayjs from '@/plugins/dayjs'

interface Props {
  tabType: 'overtime' | 'temporary' | 'annual' | 'resignation'
  highlightId?: number | null
}

const props = defineProps<Props>()

// 高亮相关
const highlightRowId = ref<number | null>(props.highlightId || null)

// 监听highlightId变化
watch(() => props.highlightId, (newId) => {
  highlightRowId.value = newId ?? null
  
  // 如果有高亮ID，添加高亮效果
  if (newId) {
    nextTick(() => {
      highlightRow(newId)
    })
  }
})

// 获取行类名
const getRowClassName = ({ row }: { row: LeaveRequest }) => {
  if (highlightRowId.value && row.id === highlightRowId.value) {
    return 'highlight-row'
  }
  return ''
}

// 高亮指定行
const highlightRow = (_id: number | null) => {
  // 滚动到对应的行（简单实现）
  nextTick(() => {
    const row = document.querySelector('.highlight-row')
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 添加闪烁动画
      row.classList.add('blink-animation')
      setTimeout(() => {
        row.classList.remove('blink-animation')
      }, 3000)
    }
  })
}

interface LeaveRequest {
  id: number
  employeeId: number
  employeeName: string
  type: string
  startDate: string
  endDate: string
  duration: number
  reason: string
  status: string
  applyDate: string
  plantId?: number
  plantName?: string
  departmentId?: number
  departmentName?: string
  applicantId?: number
  applicantName?: string
  approverId?: number | null
  approverName?: string
  transferToId?: number
  transferToName?: string
  transferDate?: string
  transferDepartmentId?: number
  transferPlantId?: number
  transferOutApproverId?: number
  transferOutApproverName?: string
  transferOutApprovalStatus?: string
  transferOutApprovalComment?: string
  transferInApproverId?: number
  transferInApproverName?: string
  transferInApprovalStatus?: string
  transferInApprovalComment?: string
  proofFile?: string // 证明文件
  startTime?: string // 临时请假/加班的开始时间（时:分）
  endTime?: string // 临时请假/加班的结束时间（时:分）
  hours?: number | string // 请假时长（小时）
}

interface Employee {
  id: number
  name: string
  plantId?: number
  plantName?: string
  departmentId?: number
  departmentName?: string
}

interface Approver {
  id: number
  name: string
  plantId?: number
  departmentId?: number
  roleId?: number
}

const formRef = ref<FormInstance>()
const transferFormRef = ref<FormInstance>()
const dialogVisible = ref(false)
const transferDialogVisible = ref(false)
const isEdit = ref(false)
const currentPage = ref(1)
const pageSize = ref(15)
const total = ref(0)
const totalPages = ref(1)
const totalPending = ref(0)
const totalApproved = ref(0)
const totalRejected = ref(0)
const dateRange = ref<[Date, Date] | null>(null)
const filterStatus = ref('')
const filterEmployee = ref('')
const fileList = ref<any[]>([])
const uploadedProofFile = ref<string>('') // 保存已上传的证明文件名
const currentApprover = ref('张经理')
const editingId = ref<number | null>(null)

// 批量上传相关状态
const batchUploadDialogVisible = ref(false)
const batchUploadFileList = ref<any[]>([])
const batchUploadLoading = ref(false)
const batchUploadErrors = ref<string[]>([])
const batchUploadSuccess = ref<any>(null)

// 批量提交相关状态
const selectedRows = ref<LeaveRequest[]>([])

// 生成状态存储的key
const getStorageKey = (suffix: string) => {
  return `leaveTab_${props.tabType}_${suffix}`
}

// 保存状态到localStorage
const saveState = () => {
  const state = {
    currentPage: currentPage.value,
    pageSize: pageSize.value,
    filterStatus: filterStatus.value,
    filterEmployee: filterEmployee.value,
    dateRange: dateRange.value ? [
      dateRange.value[0] instanceof Date ? dateRange.value[0].toISOString() : dateRange.value[0],
      dateRange.value[1] instanceof Date ? dateRange.value[1].toISOString() : dateRange.value[1]
    ] : null
  }
  localStorage.setItem(getStorageKey('state'), JSON.stringify(state))
}

// 从localStorage加载状态
const loadState = () => {
  try {
    const savedState = localStorage.getItem(getStorageKey('state'))
    if (savedState) {
      const state = JSON.parse(savedState)
      currentPage.value = state.currentPage || 1
      // 迁移：如果存储的 pageSize 是旧默认值 10 或 20，则改为 15
      pageSize.value = (state.pageSize && state.pageSize !== 10 && state.pageSize !== 20) ? state.pageSize : 15
      filterStatus.value = state.filterStatus || ''
      filterEmployee.value = state.filterEmployee || ''
      // 恢复日期范围
      if (state.dateRange && Array.isArray(state.dateRange) && state.dateRange.length === 2) {
        dateRange.value = [
          new Date(state.dateRange[0]),
          new Date(state.dateRange[1])
        ]
      } else {
        dateRange.value = null
      }
    }
  } catch (error) {
    ElMessage.error('加载状态失败: ' + getErrorMessage(error))
  }
}

// 监听分页变化保存
watch(currentPage, saveState)
watch(pageSize, saveState)
watch(filterStatus, saveState)
watch(filterEmployee, saveState)
watch(dateRange, () => {
  saveState()
  currentPage.value = 1
  loadData()
}, { deep: true })

const employees = ref<Employee[]>([])
const departments = ref<{ id: number, name: string, plantId: number }[]>([])


// 加载员工列表
const loadEmployees = async () => {
  try {
    const response = await fetch('/api/users', {
      headers: getAuthHeaders()
    })
    if (response.ok) {
      const data = await response.json()
      employees.value = (data.data.items || []).map((u: any) => ({
        id: u.id,
        name: u.realName,
        plantId: u.plantId,
        plantName: u.plantName,
        departmentId: u.departmentId,
        departmentName: u.departmentName
      }))
    }
  } catch (error) {
    ElMessage.error('加载员工列表失败: ' + getErrorMessage(error))
  }
}

// 加载部门列表
const loadDepartments = async () => {
  try {
    const response = await fetch('/api/departments', {
      headers: getAuthHeaders()
    })
    if (response.ok) {
      // fetch 不经过拦截器，需要手动解包
      const res = await response.json()
      const data = res?.data || res;
      departments.value = data?.departments || []
    }
  } catch (error) {
    ElMessage.error('加载部门列表失败: ' + getErrorMessage(error))
  }
}

// 加载审批人列表
const loadApprovers = async () => {
  try {
    const response = await fetch('/api/users/approvers', {
      headers: getAuthHeaders()
    })
    if (response.ok) {
      // fetch 不经过拦截器，需要手动解包
      const res = await response.json()
      const data = res?.data || res;
      approvers.value = data?.approvers || []
    }
  } catch (error) {
    ElMessage.error('加载审批人失败: ' + getErrorMessage(error))
  }
}

const requests = ref<LeaveRequest[]>([])

// 从后端加载数据
const loadData = async () => {
  try {
    const apiType = getApiType()
    const params = new URLSearchParams()
    params.append('page', currentPage.value.toString())
    params.append('pageSize', pageSize.value.toString())

    // 根据tab类型传递type参数，区分请假和离职
    if (props.tabType === 'annual') {
      params.append('type', 'annual')
    } else if (props.tabType === 'resignation') {
      params.append('type', 'resignation')
    }

    // 传递筛选条件
    if (filterStatus.value) {
      params.append('status', filterStatus.value)
    }

    // 传递日期范围
    if (dateRange.value && dateRange.value.length === 2) {
      const startDate = dateRange.value[0]
      const endDate = dateRange.value[1]
      if (startDate instanceof Date) {
        params.append('startDate', dayjs(startDate).format('YYYY-MM-DD'))
      }
      if (endDate instanceof Date) {
        params.append('endDate', dayjs(endDate).format('YYYY-MM-DD'))
      }
    }

    const response = await fetch(`/api/${apiType}?${params}`, {
      headers: getAuthHeaders()
    })
    
    if (response.ok) {
      const result = await response.json()
      const data = result.items || result // 支持两种格式
      
      // 更新分页信息
      if (result.total !== undefined) {
        total.value = result.total
        totalPages.value = result.totalPages || Math.ceil(result.total / pageSize.value)
      }
      
      // 更新统计数据
      if (result.totalPending !== undefined) {
        totalPending.value = result.totalPending
      }
      if (result.totalApproved !== undefined) {
        totalApproved.value = result.totalApproved
      }
      if (result.totalRejected !== undefined) {
        totalRejected.value = result.totalRejected
      }
      
      // 将后端数据转换为前端格式
      requests.value = data.map((item: any) => {
        let type = ''
        let startDate = ''
        let endDate = ''
        let duration = 0
        
        if (props.tabType === 'overtime') {
          type = item.overtimeType || '临时加班'
          const otDate = item.overtimeDate?.split('T')[0] || item.overtimeDate || ''
          const sTime = item.startTime?.split('T')[1]?.slice(0, 5) || item.startTime || ''
          const eTime = item.endTime?.split('T')[1]?.slice(0, 5) || item.endTime || ''
          startDate = `${otDate} ${sTime}`.trim()
          endDate = `${otDate} ${eTime}`.trim()
          duration = parseFloat(item.hours) || 0
        } else if (props.tabType === 'temporary') {
          type = item.leaveType || '临时请假'
          // 转换类型为中文
          if (type === 'LEAVE') type = '临时请假'
          if (type === 'ERRAND') type = '公差'

          // 后端现在直接返回带时间的完整日期！
          startDate = item.startDate || ''
          endDate = item.endDate || ''
          duration = parseFloat(item.hours) || 0
        } else if (props.tabType === 'resignation') { // Handle resignation/transfer specifically
          type = item.type || '离职' // Use 'type' from resignation_transfer table
          startDate = '' // Not applicable for resignation/transfer
          endDate = '' // Not applicable for resignation/transfer
          duration = 0 // Not applicable
        } else { // 'annual' formal leave
          type = item.leaveType || '年假'
          // 转换类型为中文
          if (type === 'ANNUAL_LEAVE' || type === 'annual') type = '年假'
          if (type === 'PERSONAL_LEAVE' || type === 'personal') type = '事假'
          if (type === 'SICK_LEAVE' || type === 'sick') type = '病假'
          startDate = item.startDate?.split('T')[0] || item.startDate || ''
          endDate = item.endDate?.split('T')[0] || item.endDate || ''
          duration = parseInt(item.days) || 0
        }
        
        return {
            id: item.id,
            employeeId: item.employeeId,
            employeeName: item.employeeName || '未知',
            type: type, // This will be leaveType for annual, and type for resignation
            startDate: startDate,
            endDate: endDate,
            duration: duration,
            reason: item.reason || '',
            status: item.status || 'pending',
            applyDate: item.createdAt?.split('T')[0] || '',
            plantId: item.plantId,
            plantName: item.plantName || '',
            departmentId: item.departmentId,
            departmentName: item.departmentName || '',
            applicantId: item.applicantId || item.applicant_id,
            applicantName: item.applicantName || item.applicant_name,
            approverId: item.approverId || item.approver_id,
            approverName: item.approverName || item.approver_name,
            transferToId: item.transferToId || item.transfer_to_id,
            transferToName: item.transferToName || item.transfer_to_name,
            transferDepartmentId: item.transferDepartmentId || item.transfer_department_id,
            transferDepartmentName: item.transferDepartmentName || item.transfer_department_name,
            transferPlantId: item.transferPlantId || item.transfer_plant_id,
            transferDate: (item.transferDate || item.transfer_date) ? (item.transferDate || item.transfer_date).split('T')[0] : null,
            // 证明文件
            proofFile: item.proofFile || item.proof_file || '',
            // 时间字段（供编辑时使用）
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            // 转岗审批相关字段
            transferOutApproverId: item.transferOutApproverId || item.transfer_out_approver_id,
            transferOutApproverName: item.transferOutApproverName || item.transfer_out_approver_name,
            transferOutApprovalStatus: item.transferOutApprovalStatus || item.transfer_out_approval_status,
            transferOutApprovalComment: item.transferOutApprovalComment || item.transfer_out_approval_comment,
            transferInApproverId: item.transferInApproverId || item.transfer_in_approver_id,
            transferInApproverName: item.transferInApproverName || item.transfer_in_approver_name,
            transferInApprovalStatus: item.transferInApprovalStatus || item.transfer_in_approval_status,
            transferInApprovalComment: item.transferInApprovalComment || item.transfer_in_approval_comment,
          }
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    ElMessage.error('加载数据失败: ' + errorMessage)
  }
}

// 在组件挂载时加载真实数据
onMounted(async () => {
  loadState() // 先加载状态
  await loadEmployees()
  await loadApprovers()
  await loadDepartments()
  await loadData()
  if (highlightRowId.value) {
    highlightRow(highlightRowId.value)
  }
})

// 监听标签页切换，重新加载数据
watch(() => props.tabType, () => {
  loadState() // 加载对应标签页的状态
  loadData()
})

// 监听分页变化
watch([currentPage, pageSize], () => {
  loadData()
})

// 监听筛选条件变化
watch([filterStatus, filterEmployee], () => {
  currentPage.value = 1
  loadData()
})

// 分页事件处理
const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const stats = computed(() => {
  return { 
    total: total.value, 
    pending: totalPending.value, 
    approved: totalApproved.value, 
    rejected: totalRejected.value 
  }
})

const durationUnit = computed(() => {
  return (props.tabType === 'overtime' || props.tabType === 'temporary') ? '小时' : '天'
})

// 格式化日期时间显示
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '-'

  try {
    let result = dateTime

    // 1. 处理 ISO 格式：2024-07-01T18:00:00.000Z
    if (dateTime.includes('T')) {
      const datePart = dateTime.split('T')[0]
      const timePart = dateTime.split('T')[1]?.substring(0, 5) || '00:00'
      result = datePart + ' ' + timePart
    } else if (dateTime.includes(' ')) {
      // 2. 处理已经有空格的格式
      const parts = dateTime.split(' ')
      if (parts.length >= 2) {
        result = parts[0] + ' ' + (parts[1]?.substring(0, 5) || '00:00')
      }
    } else if (dateTime.length === 10) {
      // 3. 如果只有日期，添加默认时间
      result = dateTime + ' 00:00'
    }
    
    return result || dateTime
  } catch (error) {
    ElMessage.error('日期格式化错误: ' + dateTime + ', ' + getErrorMessage(error))
    return dateTime || '-'
  }
}

// 格式化临时请假/加班的时间显示（优先使用单独的time字段）
const formatTemporaryTime = (dateStr: string | undefined, timeStr: string | undefined) => {
  if (!dateStr) return '-'

  // 提取日期部分
  let datePart = dateStr
  if (dateStr.includes('T')) {
    datePart = dateStr.split('T')[0] || dateStr
  } else if (dateStr.includes(' ')) {
    datePart = dateStr.split(' ')[0] || dateStr
  }

  // 优先使用单独的 timeStr，其次从 dateStr 解析时间
  let timePart = ''
  if (timeStr) {
    // timeStr 可能是 "02:00" 或 "02:00:00" 格式
    timePart = timeStr.substring(0, 5)
  } else if (dateStr.includes(' ')) {
    // 从 dateStr 解析时间
    const match = dateStr.match(/(\d{2}):(\d{2})/)
    if (match) {
      timePart = match[0]
    }
  } else if (dateStr.includes('T')) {
    // 从 ISO 格式解析
    const match = dateStr.match(/T(\d{2}):(\d{2})/)
    if (match) {
      timePart = match[1] + ':' + match[2]
    }
  }

  return timePart ? `${datePart} ${timePart}` : datePart
}

// 正确解析日期字符串，处理 'YYYY-MM-DD HH:mm' 或 'YYYY-MM-DD HH:mm:ss' 格式
const parseDateStr = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null
  // 处理 'YYYY-MM-DD HH:mm' 或 'YYYY-MM-DD HH:mm:ss' 格式
  const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/)
  if (match) {
    const [, date, hours, minutes] = match
    return new Date(`${date}T${hours}:${minutes}:00`)
  }
  return new Date(dateStr)
}

// 从带日期和时间的字符串中提取日期部分
const extractDateFromDateTime = (dateTimeStr: string | null | undefined): Date | null => {
  if (!dateTimeStr) return null
  const match = String(dateTimeStr).match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) {
    return new Date(match[1] + 'T00:00:00')
  }
  return parseDateStr(dateTimeStr)
}

const filteredData = computed(() => {
  return requests.value.filter(r => {
    // 员工姓名筛选
    if (filterEmployee.value && !r.employeeName.includes(filterEmployee.value)) {
      return false
    }
    // 状态筛选
    if (filterStatus.value && r.status !== filterStatus.value) {
      return false
    }
    // 日期范围筛选
    if (dateRange.value && dateRange.value.length === 2) {
      const itemDate = r.startDate?.split(' ')[0] || r.startDate || ''
      const startDateStr = dateRange.value[0] instanceof Date
        ? dayjs(dateRange.value[0]).format('YYYY-MM-DD')
        : dateRange.value[0]
      const endDateStr = dateRange.value[1] instanceof Date
        ? dayjs(dateRange.value[1]).format('YYYY-MM-DD')
        : dateRange.value[1]
      if (itemDate && itemDate < startDateStr) {
        return false
      }
      if (itemDate && itemDate > endDateStr) {
        return false
      }
    }
    return true
  })
})

const form = ref({
  employeeId: null as number | null,
  type: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  reason: '',
  approverId: null as number | null | undefined,
  transferDate: null as Date | null,
  transferDepartmentId: null as number | null,
  transferToId: null as number | null, // Added
  transferPlantId: null as number | null, // Added
})

const approvers = ref<Approver[]>([])

// Helper function to get the authentication token
import { getToken } from '@/utils/request'
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// 当前可选审批人（根据选择的员工筛选）
const filteredApprovers = computed(() => {
  if (props.tabType === 'resignation') {
    return approvers.value
  }
  
  if (!form.value.employeeId) {
    return approvers.value
  }
  
  const selectedEmployee = employees.value.find(emp => emp.id === form.value.employeeId)
  
  if (!selectedEmployee) {
    return approvers.value
  }
  
  const empPlantId = selectedEmployee.plantId
  const empDeptId = selectedEmployee.departmentId
  
  const result = approvers.value.filter(approver => {
    // 超级管理员（roleId=1）：所有人都可以选择
    if (approver.roleId === 1) {
      return true
    }
    
    // 厂区管理员（roleId=2）：同一厂区
    if (approver.roleId === 2) {
      const ok = approver.plantId && empPlantId && approver.plantId === empPlantId
      return ok
    }
    
    // 部门管理员（roleId=3）：同一部门
    if (approver.roleId === 3) {
      const ok = approver.departmentId && empDeptId && approver.departmentId === empDeptId
      return ok
    }
    
    return false
  })
  
  return result
})

const formDate = ref<Date | null>(null)
const formStartTime = ref<string>('')
const formEndTime = ref<string>('')
const formDateRange = ref<[Date | null, Date | null]>([null, null])

const transferForm = ref({
  transferTo: null as number | null,
  reason: '',
})

const rules: FormRules = {
  employeeId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  approverId: [
    { 
      validator: (rule, value, callback) => {
        if (props.tabType === 'annual' && !value) {
          callback(new Error('请选择审批人'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  // 离职/转岗特有字段验证
  transferDate: [
    { 
      validator: (rule, value, callback) => {
        if (props.tabType === 'resignation' && !value) {
          callback(new Error('请选择离职/转岗日期'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  transferDepartmentId: [
    { 
      validator: (rule, value, callback) => {
        if (props.tabType === 'resignation' && form.value.type === '转岗' && !value) {
          callback(new Error('请选择转入部门'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  transferToId: [
    {
      validator: (rule, value, callback) => {
        // 交接人是可选的，只有当填写了才需要验证存在性
        if (props.tabType === 'resignation' && value && !employees.value.some(emp => emp.id === value)) {
          callback(new Error('选择的交接人不存在'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  // 移除 date, startTime, endTime 的验证，因为这些是通过 formDate/formStartTime/formEndTime 收集的
  reason: [{ required: true, message: '请输入原因', trigger: 'blur' }],
  proofFile: [
    {
      validator: (rule, value, callback) => {
        // 只有在 temporary 标签页且类型为公差时才需要验证
        if (props.tabType === 'temporary' && form.value.type === '公差') {
          
          // 确保只要是公差且超过2小时就必须上传证明
          if (isOvertimeAndMoreThan2Hours.value && fileList.value.length === 0) {
            callback(new Error('公差超过2小时，请上传证明材料'))
          } else {
            callback()
          }
        } else {
          // 其他情况，不需要验证证明文件
          callback()
        }
      },
      trigger: ['change', 'blur']
    }
  ]
}

const updateFormDateTime = () => {
  if (formDate.value && formStartTime.value && formEndTime.value) {
    const [startHour, startMin] = formStartTime.value.split(':').map(Number)
    const [endHour, endMin] = formEndTime.value.split(':').map(Number)
    
    const start = new Date(formDate.value)
    start.setHours(startHour ?? 0, startMin ?? 0, 0, 0)
    
    const end = new Date(formDate.value)
    end.setHours(endHour ?? 0, endMin ?? 0, 0, 0)
    
    form.value.startDate = start
    form.value.endDate = end
  }
}

const handleFormDateChange = () => {
  updateFormDateTime()
  // 确保在日期变化时触发验证
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

const handleFormTimeChange = () => {
  updateFormDateTime()
  // 确保在时间变化时触发验证
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

const handleFormDateRangeChange = (val: [Date | null, Date | null]) => {
  if (val && val.length === 2 && val[0] && val[1]) {
    const start = new Date(val[0])
    const end = new Date(val[1])
    
    // 开始时间设为当天0点
    start.setHours(0, 0, 0, 0)
    // 结束时间设为当天23:59:59
    end.setHours(23, 59, 59, 999)
    
    form.value.startDate = start
    form.value.endDate = end
  }
}

const isOvertimeAndMoreThan2Hours = computed(() => {
  
  if (props.tabType !== 'temporary' || form.value.type !== '公差') {
    return false
  }
  if (!form.value.startDate || !form.value.endDate) {
    return false
  }
  const hours = calculateDuration(form.value.startDate, form.value.endDate)
  const result = hours > 2
  return result
})

const transferRules: FormRules = {
  transferTo: [{ required: true, message: '请选择转审对象', trigger: 'change' }],
  reason: [{ required: true, message: '请输入转审原因', trigger: 'blur' }],
}

const getTypeTagType = (type: string) => {
  if (type.includes('加班')) return 'danger'
  if (type.includes('公差')) return 'success'
  if (type.includes('年假')) return 'warning'
  return 'info'
}

const getStatusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

const getStatusText = (status: string) => {
  if (props.tabType === 'annual') {
    if (status === 'approved') return '已批准'
    if (status === 'rejected') return '已拒绝'
    return '待审批'
  } else {
    if (status === 'approved') return '已提交'
    return '待提交'
  }
}

const isStatusDisabled = (status: string) => {
  if (props.tabType === 'annual') {
    // 年假页：待审批状态下可以编辑、删除，其他状态禁用
    return status !== 'pending'
  } else {
    // 临时加班、临时请假&公差页：已提交状态禁用编辑、删除
    return status === 'approved'
  }
}

// 检查当前用户是否有审批权限
const hasApprovalPermission = (row: any) => {
  if (!currentUser) return false
  
  const userRoleId = currentUser.roleId
  
  // 超级管理员（roleId=1）有所有权限
  if (userRoleId === 1) return true
  
  // 厂区管理员（roleId=2）：检查厂区是否匹配
  if (userRoleId === 2) {
    // 申请员工的厂区需要和当前管理员的厂区一致
    return row.plantId === currentUser.plantId
  }
  
  // 部门管理员（roleId=3）：检查部门是否匹配
  if (userRoleId === 3) {
    // 申请员工的部门需要和当前管理员的部门一致
    return row.departmentId === currentUser.departmentId
  }
  
  // 其他角色（普通员工）没有审批权限
  return false
}

// 转岗审批状态相关函数
const getApprovalStatusTagType = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

const getApprovalStatusText = (status: string) => {
  if (status === 'approved') return '已批准'
  if (status === 'rejected') return '已拒绝'
  return '待审批'
}

// 检查转出审批权限
const hasTransferOutApprovalPermission = (row: any) => {
  if (!currentUser) return false
  
  const userRoleId = currentUser.roleId
  
  // 超级管理员（roleId=1）有所有权限
  if (userRoleId === 1) return true
  
  // 厂区管理员（roleId=2）：检查厂区是否匹配
  if (userRoleId === 2) {
    return row.plantId === currentUser.plantId
  }
  
  // 部门管理员（roleId=3）：检查部门是否匹配
  if (userRoleId === 3) {
    return row.departmentId === currentUser.departmentId
  }
  
  return false
}

// 检查转入审批权限
const hasTransferInApprovalPermission = (row: any) => {
  if (!currentUser) return false
  
  const userRoleId = currentUser.roleId
  
  // 超级管理员（roleId=1）有所有权限
  if (userRoleId === 1) return true
  
  // 厂区管理员（roleId=2）：检查转入厂区是否匹配
  if (userRoleId === 2) {
    return row.transferPlantId === currentUser.plantId
  }
  
  // 部门管理员（roleId=3）：检查转入部门是否匹配
  if (userRoleId === 3) {
    return row.transferDepartmentId === currentUser.departmentId
  }
  
  return false
}

// 转岗审批处理函数
const handleTransferOutApprove = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要批准 "${row.employeeName}" 的转出申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/transfer-out-approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      ElMessage.success('转出批准成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleTransferOutReject = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要拒绝 "${row.employeeName}" 的转出申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/transfer-out-reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      ElMessage.success('转出拒绝成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleTransferInApprove = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要批准 "${row.employeeName}" 的转入申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/transfer-in-approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      ElMessage.success('转入批准成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleTransferInReject = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要拒绝 "${row.employeeName}" 的转入申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/transfer-in-reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      ElMessage.success('转入拒绝成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 检查当前用户是否有添加申请的权限
const hasAddPermission = () => {
  if (!currentUser) return false
  
  const userRoleId = currentUser.roleId
  
  // 超级管理员（roleId=1）有所有权限
  if (userRoleId === 1) return true
  
  // 临时加班、临时请假&公差只允许：
  // - 厂区管理员（roleId=2）
  // - 部门管理员（roleId=3）
  if (props.tabType === 'overtime' || props.tabType === 'temporary') {
    return userRoleId === 2 || userRoleId === 3
  }
  
  // 请假&年假、离职&转岗页面，普通员工也可以申请
  return true
}

// 检查当前用户是否有编辑/提交/撤回的权限
const hasEditPermission = (row: any) => {
  if (!currentUser) return false

  const userRoleId = currentUser.roleId

  // 超级管理员（roleId=1）有所有权限
  if (userRoleId === 1) return true

  // 临时加班、临时请假&公差只允许：
  // - 厂区管理员（roleId=2）且厂区匹配
  // - 部门管理员（roleId=3）且部门匹配
  if (props.tabType === 'overtime' || props.tabType === 'temporary') {
    if (userRoleId === 2) {
      return row.plantId === currentUser.plantId
    }
    if (userRoleId === 3) {
      return row.departmentId === currentUser.departmentId
    }
    return false
  }
  
  // 请假&年假页面，编辑、删除所有人都可以（之前已有状态控制）
  return true
}

// 判断文件是否为图片
const isImageFile = (fileName: string) => {
  if (!fileName) return false
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const lowerFileName = (fileName || '').toLowerCase()
  return imageExtensions.some(ext => lowerFileName.endsWith(ext))
}

// 获取图片 URL
const getImageUrl = (fileName: string) => {
  if (!fileName) return ''
  return `/uploads/${fileName}`
}

const handleViewProof = (row: any) => {
  
  // 检查是否有文件
  if (!row.proofFile) {
    ElMessage.warning('该记录没有上传证明文件')
    return
  }
  
  // 如果是图片，直接在新标签页打开预览
  if (isImageFile(row.proofFile)) {
    const fileUrl = `/uploads/${row.proofFile}`
    window.open(fileUrl, '_blank')
  } else {
    // 如果是其他文件，使用下载 API
    const downloadUrl = `/api/proof/download/${row.proofFile}`
    window.open(downloadUrl, '_blank')
  }
}

const handleAdd = () => {
  if (!hasAddPermission()) {
    ElMessage.warning('您没有新增申请的权限，只有厂区管理员和部门管理员可以填写临时加班和临时请假&公差申请')
    return
  }
  isEdit.value = false
  form.value = {
    employeeId: null,
    type:
      props.tabType === 'overtime' ? '临时加班' :
      props.tabType === 'temporary' ? '' :
      props.tabType === 'resignation' ? '离职' : '',
    startDate: null,
    endDate: null,
    reason: '',
    approverId: null,
    transferDate: null,
    transferDepartmentId: null,
    transferToId: null,
    transferPlantId: null,
  }
  
  // 重置所有日期时间控件
  formDate.value = null
  formStartTime.value = ''
  formEndTime.value = ''
  formDateRange.value = [null, null]
  
  fileList.value = []
  uploadedProofFile.value = '' // 重置已上传的文件
  loadApprovers() // Load approvers when opening the dialog
  dialogVisible.value = true
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  })
}

const handleEdit = (row: LeaveRequest) => {
  if (!hasEditPermission(row)) {
    ElMessage.warning('您没有编辑此申请的权限，只有对应的厂区管理员和部门管理员可以编辑')
    return
  }
  if (isStatusDisabled(row.status)) {
    ElMessage.warning('此申请已提交，无法编辑')
    return
  }
  isEdit.value = true
  editingId.value = row.id
  const rowAny = row as any

  form.value = {
            employeeId: row.employeeId,
            type: row.type,
            startDate: parseDateStr(row.startDate),
            endDate: parseDateStr(row.endDate),
            reason: row.reason,
            approverId: rowAny.approverId ?? null,
            transferDate: rowAny.transferDate ? parseDateStr(rowAny.transferDate) : null,
            transferDepartmentId: rowAny.transferDepartmentId ?? null,
            transferToId: rowAny.transferToId ?? null,
            transferPlantId: rowAny.transferPlantId ?? null,
          }

  // 初始化已上传的文件信息
  if (props.tabType === 'temporary') {
    uploadedProofFile.value = (row as any).proofFile || ''
    if (uploadedProofFile.value) {
      fileList.value = [{ name: '已上传文件' }] // 显示一个占位文件
    } else {
      fileList.value = []
    }
  } else {
    uploadedProofFile.value = ''
    fileList.value = []
  }

  // 根据 tabType 不同初始化不同的控件
  if (props.tabType === 'overtime' || props.tabType === 'temporary') {
    // 临时加班/临时请假：日期 + 时间
    const start = parseDateStr(row.startDate)
    const end = parseDateStr(row.endDate)

    // 使用 startDate 中的日期部分作为 formDate
    formDate.value = start ? extractDateFromDateTime(row.startDate) : null
    // 使用后端返回的 startTime 和 endTime（如果存在），否则从 startDate/endDate 解析
    formStartTime.value = row.startTime || (start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : '')
    formEndTime.value = row.endTime || (end ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}` : '')
    formDateRange.value = [null, null]
  } else if (props.tabType === 'annual') {
    // 请假&年假：日期区间
    formDateRange.value = [parseDateStr(row.startDate), parseDateStr(row.endDate)]
    formDate.value = null
    formStartTime.value = ''
    formEndTime.value = ''
  } else {
    // 离职&转岗
    formDateRange.value = [null, null]
    formDate.value = null
    formStartTime.value = ''
    formEndTime.value = ''
  }
  loadApprovers() // Load approvers when opening the dialog
  dialogVisible.value = true
}

const handleSubmitStatus = async (row: LeaveRequest) => {
  if (!hasEditPermission(row)) {
    ElMessage.warning('您没有提交此申请的权限，只有对应的厂区管理员和部门管理员可以提交')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要提交 "${row.employeeName}" 的申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })

    const apiPath = getApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/submit`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })

    if (res.ok) {
      const index = requests.value.findIndex(r => r.id === row.id)
      if (index !== -1) {
        requests.value[index]!.status = 'approved'
      }
      ElMessage.success('提交成功')
      loadData()
    } else {
      const data = await res.json()
      ElMessage.error(data.error || '提交失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('提交失败')
    }
  }
};

const handleUnsubmit = async (row: LeaveRequest) => {
  if (!hasEditPermission(row)) {
    ElMessage.warning('您没有撤回此申请的权限，只有对应的厂区管理员和部门管理员可以撤回')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要撤回 "${row.employeeName}" 的申请吗？撤回后状态将变为待提交。`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const apiPath = getApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/withdraw`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })

    if (res.ok) {
      const index = requests.value.findIndex(r => r.id === row.id)
      if (index !== -1) {
        requests.value[index]!.status = 'pending'
      }
      ElMessage.success('撤回成功')
    } else {
      const data = await res.json()
      ElMessage.error(data.error || '撤回失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('撤回失败')
    }
  }
}

// Helper to get correct API path for approval/rejection/transfer actions
const getApprovalApiType = () => {
  if (props.tabType === 'resignation') {
    return 'resignation-transfer';
  }
  return 'formal-leave';
};

// Helper to get correct API path for data operations (load, add, edit, delete)
const getApiType = () => {
  if (props.tabType === 'overtime') {
    return 'temporary-overtime';
  } else if (props.tabType === 'temporary') {
    return 'temporary-leave';
  } else if (props.tabType === 'annual') {
    return 'formal-leave';
  } else if (props.tabType === 'resignation') {
    return 'resignation-transfer';
  }
  return ''; // Default or error case, should ideally not be reached
};

const handleApprove = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要批准 "${row.employeeName}" 的申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      const index = requests.value.findIndex(r => r.id === row.id)
      if (index !== -1) {
        requests.value[index]!.status = 'approved'
        requests.value[index]!.approverId = currentUser?.id
        requests.value[index]!.approverName = currentUser?.realName || currentUser?.username
      }
      ElMessage.success('批准成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('批准失败')
    }
  }
}

const handleReject = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要拒绝 "${row.employeeName}" 的申请吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        approverId: currentUser?.id,
        approvalComment: ''
      })
    })
    
    if (res.ok) {
      const index = requests.value.findIndex(r => r.id === row.id)
      if (index !== -1) {
        requests.value[index]!.status = 'rejected'
        requests.value[index]!.approverId = currentUser?.id
        requests.value[index]!.approverName = currentUser?.realName || currentUser?.username
      }
      ElMessage.success('已拒绝')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('拒绝失败')
    }
  }
}

const handleResubmit = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要将 "${row.employeeName}" 的申请打回重提吗？`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'primary',
    })
    
    const apiPath = getApprovalApiType();
    const res = await fetch(`/api/${apiPath}/${row.id}/resubmit`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    
    if (res.ok) {
      const index = requests.value.findIndex(r => r.id === row.id)
      if (index !== -1) {
        requests.value[index]!.status = 'pending'
      }
      ElMessage.success('打回重提成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('打回重提失败')
    }
  }
}

const handleDelete = async (row: LeaveRequest) => {
  try {
    await ElMessageBox.confirm(`确定要删除 "${row.employeeName}" 的申请吗？此操作不可恢复。`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error',
    })
    
    const apiType = getApiType()
    const res = await fetch(`/api/${apiType}/${row.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    if (res.ok) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleTransfer = (row: LeaveRequest) => {
  // 如果有转审到的审批人，显示转审到的审批人，否则显示当前审批人
  currentApprover.value = row.transferToName || row.approverName || '-'
  transferForm.value = {
    transferTo: null,
    reason: '',
  }
  editingId.value = row.id
  transferDialogVisible.value = true
}

const handleTransferSubmit = async () => {
  if (!transferFormRef.value) return
  await transferFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const apiPath = getApprovalApiType();
        const res = await fetch(`/api/${apiPath}/${editingId.value}/transfer`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            transferToId: transferForm.value.transferTo,
            transferReason: transferForm.value.reason
          })
        })
        
        if (res.ok) {
          ElMessage.success('转审成功')
          transferDialogVisible.value = false
          loadData()
        }
      } catch (err) {
        ElMessage.error('转审失败')
      }
    }
  })
}

const calculateDuration = (start: Date, end: Date) => {
  const startDate = dayjs(start)
  const endDate = dayjs(end)
  if (props.tabType === 'overtime' || props.tabType === 'temporary') {
    // 计算精确的小时数，保留1位小数
    const diffMinutes = endDate.diff(startDate, 'minute')
    return Math.max(0, diffMinutes / 60)
  } else {
    return endDate.diff(startDate, 'day') + 1
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 在验证前检查日期和时间是否已填写
  if ((props.tabType === 'overtime' || props.tabType === 'temporary') && 
      (!formDate.value || !formStartTime.value || !formEndTime.value)) {
    ElMessage.warning('请填写完整的日期和时间')
    return
  }
  
  try {
    await formRef.value.validate(async (valid, invalidFields) => {
      if (!valid) {
        return
      }
      
      console.log('表单验证通过！')
      
      let apiPath = ''
      let method = 'POST'

      const employee = employees.value.find(emp => emp.id === form.value.employeeId)
      if (!employee) {
        ElMessage.error('选择的员工不存在')
        return
      }

      const approver = filteredApprovers.value.find(a => a.id === form.value.approverId)
      if ((props.tabType === 'annual' || (props.tabType === 'resignation' && form.value.type === '离职')) && !approver) {
        ElMessage.error('选择的审批人不存在或不具备审批权限')
        return
      }

      const requestBody: any = {
        employeeId: form.value.employeeId,
        reason: form.value.reason,
        applicantId: currentUser?.id, // 记录申请人ID
        plantId: currentUser?.plantId,
        departmentId: currentUser?.departmentId,
      }

      // 根据 tabType 和 type 组装请求体
      if (props.tabType === 'overtime') {
        apiPath = 'temporary-overtime'
        requestBody.overtimeType = form.value.type
        requestBody.overtimeDate = dayjs(formDate.value).format('YYYY-MM-DD')
        requestBody.startTime = formStartTime.value
        requestBody.endTime = formEndTime.value
        requestBody.hours = calculateDuration(form.value.startDate!, form.value.endDate!)
      } else if (props.tabType === 'temporary') {
        apiPath = 'temporary-leave'
        // 转换回英文类型
        requestBody.leaveType = form.value.type === '临时请假' ? 'LEAVE' : 'ERRAND'
        requestBody.startDate = dayjs(form.value.startDate).format('YYYY-MM-DD HH:mm:ss')
        requestBody.endDate = dayjs(form.value.endDate).format('YYYY-MM-DD HH:mm:ss')
        requestBody.startTime = formStartTime.value
        requestBody.endTime = formEndTime.value
        requestBody.hours = calculateDuration(form.value.startDate!, form.value.endDate!)
        requestBody.proofFile = uploadedProofFile.value // 提交证明文件
      } else if (props.tabType === 'annual') {
        apiPath = 'formal-leave'
        // 转换回英文类型
        requestBody.leaveType = 
          form.value.type === '年假' ? 'ANNUAL_LEAVE' :
          form.value.type === '事假' ? 'PERSONAL_LEAVE' : ''
        requestBody.startDate = dayjs(form.value.startDate).format('YYYY-MM-DD')
        requestBody.endDate = dayjs(form.value.endDate).format('YYYY-MM-DD')
        requestBody.days = calculateDuration(form.value.startDate!, form.value.endDate!)
        requestBody.approverId = form.value.approverId
      } else if (props.tabType === 'resignation') {
        apiPath = 'resignation-transfer'
        requestBody.type = form.value.type // 离职或转岗
        if (form.value.type === '离职') {
          requestBody.transferDate = dayjs(form.value.transferDate).format('YYYY-MM-DD')
          requestBody.approverId = form.value.approverId
        } else if (form.value.type === '转岗') {
          requestBody.transferDate = dayjs(form.value.transferDate).format('YYYY-MM-DD')
          requestBody.transferDepartmentId = form.value.transferDepartmentId
          
          // 根据当前用户的角色设置转出/转入审批人ID
          if (currentUser) {
            // 如果是厂区管理员，自动设置为转出审批人
            if (currentUser.roleId === 2) {
              requestBody.transferOutApproverId = currentUser.id
            }
            // 如果是部门管理员，自动设置为转入审批人
            if (currentUser.roleId === 3) {
              requestBody.transferInApproverId = currentUser.id
            }
          }
        }
      }

      let url = `/api/${apiPath}`
      if (isEdit.value) {
        method = 'PUT'
        url = `${url}/${editingId.value}`
      }

      try {
        const response = await fetch(url, {
          method: method,
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || '提交失败')
        }

        const result = await response.json()
        if (!isEdit.value) {
          // Add to frontend data
            const employee = employees.value.find(emp => emp.id === form.value.employeeId)
            // Update frontend data
            const approver = filteredApprovers.value.find(a => a.id === form.value.approverId)
            let duration = 0;
            if (form.value.startDate && form.value.endDate) {
              duration = calculateDuration(form.value.startDate, form.value.endDate);
            }
            const newRequest: LeaveRequest = {
              id: result.item?.id || (requests.value.length ? Math.max(...requests.value.map(r => r.id)) + 1 : 1),
              employeeId: form.value.employeeId!,
              employeeName: employee?.name || '',
              plantId: employee?.plantId,
              plantName: employee?.plantName,
              departmentId: employee?.departmentId,
              departmentName: employee?.departmentName,
              type: form.value.type, // Use form.value.type directly
              startDate: (props.tabType === 'annual') ? dayjs(form.value.startDate).format('YYYY-MM-DD') : dayjs(form.value.startDate).format('YYYY-MM-DD HH:mm'),
              endDate: (props.tabType === 'annual') ? dayjs(form.value.endDate).format('YYYY-MM-DD') : dayjs(form.value.endDate).format('YYYY-MM-DD HH:mm'),
              duration,
              reason: form.value.reason,
              status: 'pending',
              applyDate: dayjs().format('YYYY-MM-DD'),
              approverId: form.value.approverId,
              approverName: approver?.name || '',
              transferDate: form.value.transferDate ? dayjs(form.value.transferDate).format('YYYY-MM-DD') : undefined,
              transferDepartmentId: form.value.transferDepartmentId || undefined,
              transferPlantId: form.value.transferPlantId || undefined, // Added
              transferToId: form.value.transferToId || undefined, // Added
              transferOutApprovalStatus: form.value.type === '转岗' ? 'pending' : undefined,
              transferInApprovalStatus: form.value.type === '转岗' ? 'pending' : undefined,
            }

            // Conditionally add proofFile
            if (props.tabType === 'temporary') {
              newRequest.proofFile = uploadedProofFile.value;
            }
            requests.value.unshift(newRequest)
          }
          
          dialogVisible.value = false
          ElMessage.success(isEdit.value ? '编辑成功' : '申请成功')
          
          // 重新加载数据
          await loadData()
      } catch (error) {
        ElMessage.error('提交失败，请重试')
      }

    })
  } catch (error) {
    ElMessage.error('验证失败')
  }
}

const handleFileChange = async (file: any) => {
  try {
    // 创建FormData
    const formData = new FormData()
    formData.append('file', file.raw)
    
    // 上传文件到后端
    const response = await fetch('/api/proof/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
      body: formData
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || '上传失败')
    }
    
    // 保存上传后的文件名
    uploadedProofFile.value = result.fileName
    fileList.value = [file]
    
    ElMessage.success('文件上传成功')
  } catch (error) {
    ElMessage.error((error as Error).message || '上传失败，请重试')
    // 清空文件列表
    fileList.value = []
    uploadedProofFile.value = ''
  }
  
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

const handleFileRemove = (file: any) => {
  const index = fileList.value.indexOf(file)
  if (index !== -1) {
    fileList.value.splice(index, 1)
  }
  // 清空已上传的文件名
  uploadedProofFile.value = ''
  
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

const handleDateChange = () => {
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

const handleTypeChange = () => {
  if (formRef.value) {
    formRef.value.validateField('proofFile')
  }
}

// ==================== 批量上传相关函数 ====================

const handleBatchUpload = () => {
  batchUploadDialogVisible.value = true
  batchUploadFileList.value = []
  batchUploadErrors.value = []
  batchUploadSuccess.value = null
}

const closeBatchUploadDialog = () => {
  batchUploadDialogVisible.value = false
  batchUploadFileList.value = []
  batchUploadErrors.value = []
  batchUploadSuccess.value = null
}

const handleFileUploadChange = (file: any) => {
  batchUploadFileList.value = [file]
}

const downloadTemplate = () => {
  const apiType = getApiType()
  let templateName = ''
  if (apiType === 'temporary-overtime') {
    templateName = '临时加班导入模板.xlsx'
  } else if (apiType === 'temporary-leave') {
    templateName = '临时请假&公差导入模板.xlsx'
  } else if (apiType === 'formal-leave') {
    templateName = '正式请假导入模板.xlsx'
  } else if (apiType === 'resignation-transfer') {
    templateName = '离职转岗导入模板.xlsx'
  }

  if (templateName) {
    window.open(`/api/templates/${encodeURIComponent(templateName)}`, '_blank')
  } else {
    ElMessage.warning('当前类型没有可用的模板')
  }
}

const confirmBatchUpload = async () => {
  if (batchUploadFileList.value.length === 0) {
    ElMessage.warning('请选择要上传的Excel文件')
    return
  }
  
  const file = batchUploadFileList.value[0].raw
  const formData = new FormData()
  formData.append('file', file)
  
  // 添加申请人ID
  if (currentUser && currentUser.id) {
    formData.append('applicantId', currentUser.id.toString())
  }
  
  const apiType = getApiType()
  
  batchUploadLoading.value = true
  batchUploadErrors.value = []
  batchUploadSuccess.value = null
  
  try {
    const token = getToken()
    const response = await fetch(`/api/batch/${apiType}/batch-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      if (result.details && Array.isArray(result.details)) {
        batchUploadErrors.value = result.details
      } else {
        batchUploadErrors.value = [result.error || '上传失败']
      }
      return
    }
    
    batchUploadSuccess.value = result
    
    if (result.errors && result.errors.length > 0) {
      batchUploadErrors.value = result.errors
    }
    
    let message = `批量上传完成，成功导入 ${result.insertedCount} 条数据`
    if (result.skippedCount && result.skippedCount > 0) {
      message += `，跳过 ${result.skippedCount} 条重复数据`
    }
    ElMessage.success(message)
    
    // 成功上传后，延迟关闭弹窗，让用户看到成功提示
    setTimeout(() => {
      closeBatchUploadDialog()
      
      // 刷新数据
      loadData()
    }, 1500)
  } catch (error) {
    console.error('批量上传失败:', error)
    ElMessage.error('上传失败，请检查网络连接')
  } finally {
    batchUploadLoading.value = false
  }
}

// ==================== 批量选择和提交相关 ====================

// 处理表格选择变化
const handleSelectionChange = (selection: LeaveRequest[]) => {
  selectedRows.value = selection
}

// 检查行是否可选（只有pending状态且有权限的行可选）
const checkSelectable = (row: LeaveRequest) => {
  return row.status === 'pending' && hasAddPermission()
}

// 清空选择
const clearSelection = () => {
  selectedRows.value = []
}

// 检查是否有批量提交权限（与新增权限相同）
const hasBatchSubmitPermission = () => {
  return hasAddPermission()
}

// 批量提交
const handleBatchSubmit = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要提交的记录')
    return
  }

  // 检查是否有非pending状态的记录
  const nonPendingRows = selectedRows.value.filter(row => row.status !== 'pending')
  if (nonPendingRows.length > 0) {
    ElMessage.warning('只能提交待提交状态的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要提交选中的 ${selectedRows.value.length} 条申请吗？`,
      '批量提交确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const apiType = getApiType()
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const row of selectedRows.value) {
      try {
        const token = getToken()
        const response = await fetch(`/api/${apiType}/${row.id}/submit`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
          const errorData = await response.json()
          errors.push(`${row.employeeName}: ${errorData.error || '提交失败'}`)
        }
      } catch (error) {
        failCount++
        errors.push(`${row.employeeName}: 提交失败`)
      }
    }

    // 清空选择
    clearSelection()

    // 显示结果
    if (failCount === 0) {
      ElMessage.success(`成功提交 ${successCount} 条申请`)
    } else {
      ElMessage.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
      if (errors.length > 0) {
        console.error('提交失败详情:', errors)
      }
    }

    // 刷新数据
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量提交失败:', error)
      ElMessage.error('批量提交失败')
    }
  }
}

// ==================== 导出功能 ====================

const handleExport = async () => {
  try {
    ElMessage.info('正在准备导出数据...')

    // 动态导入ExcelJS
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()

    // 根据tab类型设置工作表名称和标题
    let sheetName = '请假记录'
    let titleText = '请假记录'

    if (props.tabType === 'overtime') {
      sheetName = '临时加班'
      titleText = '临时加班记录'
    } else if (props.tabType === 'temporary') {
      sheetName = '临时请假公差'
      titleText = '临时请假&公差记录'
    } else if (props.tabType === 'annual') {
      sheetName = '请假年假'
      titleText = '请假&年假记录'
    } else if (props.tabType === 'resignation') {
      sheetName = '离职转岗'
      titleText = '离职&转岗记录'
    }

    const worksheet = workbook.addWorksheet(sheetName)

    // 添加标题行
    worksheet.mergeCells('A1:H1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = titleText
    titleCell.font = { size: 16, bold: true }
    titleCell.alignment = { horizontal: 'center' }

    // 添加导出时间
    worksheet.mergeCells('A2:H2')
    const exportTimeCell = worksheet.getCell('A2')
    exportTimeCell.value = `导出时间: ${new Date().toLocaleString('zh-CN')}`
    exportTimeCell.font = { size: 10, color: { argb: 'FF666666' } }
    exportTimeCell.alignment = { horizontal: 'right' }

    // 定义表头
    const headers: string[] = []
    const columnWidths: number[] = []

    // 通用列
    headers.push('员工姓名', '部门')
    columnWidths.push(12, 15)

    // 根据tab类型添加不同列
    if (props.tabType === 'overtime' || props.tabType === 'temporary') {
      headers.push('类型', '开始时间', '结束时间', '时长(小时)', '状态', '原因')
      columnWidths.push(10, 20, 20, 12, 10, 30)
    } else if (props.tabType === 'annual') {
      headers.push('类型', '开始日期', '结束日期', '天数', '状态', '审批人', '原因')
      columnWidths.push(10, 12, 12, 8, 10, 12, 30)
    } else if (props.tabType === 'resignation') {
      headers.push('类型', '原因', '转入时间', '状态', '转出审批', '转入审批', '申请日期')
      columnWidths.push(10, 30, 15, 10, 12, 12, 15)
    }

    // 添加表头行
    const headerRow = worksheet.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    // 设置列宽
    columnWidths.forEach((width, index) => {
      const col = index + 1
      worksheet.getColumn(col).width = width
    })

    // 添加数据行
    for (const row of filteredData.value) {
      const dataRow: any[] = []

      // 通用字段
      dataRow.push(row.employeeName || '', row.departmentName || '')

      if (props.tabType === 'overtime' || props.tabType === 'temporary') {
        dataRow.push(
          row.type || '',
          formatTemporaryTime(row.startDate, row.startTime),
          formatTemporaryTime(row.endDate, row.endTime),
          row.duration || 0,
          getStatusText(row.status),
          row.reason || ''
        )
      } else if (props.tabType === 'annual') {
        dataRow.push(
          row.type || '',
          row.startDate || '',
          row.endDate || '',
          row.duration || 0,
          getStatusText(row.status),
          row.approverName || '',
          row.reason || ''
        )
      } else if (props.tabType === 'resignation') {
        dataRow.push(
          row.type || '',
          row.reason || '',
          row.transferDate || '',
          getStatusText(row.status),
          getApprovalStatusText(row.transferOutApprovalStatus || ''),
          getApprovalStatusText(row.transferInApprovalStatus || ''),
          row.applyDate ? row.applyDate.split(' ')[0] : ''
        )
      }

      const dataRowObj = worksheet.addRow(dataRow)
      dataRowObj.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { vertical: 'middle' }
      })
    }

    // 生成文件并下载
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // 生成文件名
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    let fileName = `请假记录_${dateStr}`
    if (props.tabType === 'overtime') {
      fileName = `临时加班记录_${dateStr}`
    } else if (props.tabType === 'temporary') {
      fileName = `临时请假公差记录_${dateStr}`
    } else if (props.tabType === 'annual') {
      fileName = `请假年假记录_${dateStr}`
    } else if (props.tabType === 'resignation') {
      fileName = `离职转岗记录_${dateStr}`
    }

    link.download = `${fileName}.xlsx`
    link.click()
    URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

</script>

<style scoped>
.leave-tab-container {
  padding: 12px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-container {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12px;
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 160px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 28px;
  color: #409eff;
}

.stat-info .stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-info .stat-label {
  font-size: 12px;
  color: #909399;
}

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
  flex-shrink: 0;
}

.batch-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.batch-action-bar span {
  color: #1890ff;
  font-weight: 500;
}

.filter-input {
  width: 180px;
}

.filter-select {
  width: 130px;
}

.data-table {
  width: 100%;
  flex: 1;
  overflow: hidden;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto !important;
}

:deep(.el-table) {
  height: 100%;
}

.pagination {
  justify-content: flex-end;
  flex-shrink: 0;
  margin-top: 8px;
}

.action-buttons .el-button {
  margin-left: 0;
  margin-right: 8px; /* 调整按钮间距 */
}

.action-buttons .el-button:last-child {
  margin-right: 0;
}

/* Dialog Form */
.el-dialog__body {
  padding-top: 10px;
  padding-bottom: 10px;
}

.proof-file-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.proof-file-link {
  color: #409eff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.proof-file-link:hover {
  text-decoration: underline;
}

.el-image {
  border: 1px solid #dcdfe6;
}

.batch-upload-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.upload-tips {
  width: 100%;
  background-color: #f0f9eb;
  border-color: #e1f3d8;
  color: #67c23a;
  padding: 15px;
  border-radius: 4px;
  text-align: left;
}

.upload-tips p {
  margin: 5px 0;
  font-size: 14px;
}

.upload-area {
  width: 80%;
  max-width: 400px;
}

.upload-errors {
  width: 100%;
  background-color: #fef0f0;
  border-color: #fde2e2;
  color: #f56c6c;
  padding: 15px;
  border-radius: 4px;
  text-align: left;
}

.upload-errors h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #f56c6c;
}

.upload-errors ul {
  margin: 0;
  padding-left: 20px;
}

.upload-errors li {
  margin-bottom: 5px;
}

.upload-success {
  width: 100%;
}

/* 高亮行样式 */
.el-table .highlight-row {
  background-color: #fdf6ec !important;
}

.el-table .highlight-row.blink-animation {
  animation: blink 1.5s ease-in-out 2;
}

@keyframes blink {
  0% { background-color: #fdf6ec; }
  50% { background-color: #ffe7ba; }
  100% { background-color: #fdf6ec; }
}
</style>
