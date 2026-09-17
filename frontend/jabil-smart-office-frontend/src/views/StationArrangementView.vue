<template>
  <div class="station-arrangement-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">工位安排</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">🏭 工位安排</div>
        <div class="table-card-actions">
          <el-button type="default" size="small" @click="resetSelection">🔄 重置</el-button>
          <el-button type="default" size="small" @click="openAutoAssignRulesDialog">
            ⚙️ 自动分配规则
          </el-button>
          <el-button type="success" size="small" @click="openImportDialog">
            📥 批量导入
          </el-button>
          <el-button type="primary" size="small" @click="openBatchAssignDialog">
            📋 批量分配
          </el-button>
        </div>
      </div>

      <div class="card-body">
        <!-- 日期和班次选择 -->
        <div class="selection-bar">
          <div class="form-group">
            <label>日期:</label>
            <el-date-picker
              v-model="selectedDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :clearable="false"
              @change="onDateChange"
              style="width: 150px"
            />
            <el-button size="small" @click="goToPrevDay" style="margin-left: 8px">◀ 上一周期</el-button>
            <el-button size="small" @click="goToNextDay">下一周期 ▶</el-button>
          </div>
          <div class="form-group">
            <label>班次:</label>
            <el-select v-model="filterShift" placeholder="全部班次" multiple collapse-tags collapse-tags-tooltip @change="onFilterChange">
              <el-option v-for="shift in shiftOptions" :key="shift.value" :label="shift.label" :value="shift.value" />
            </el-select>
          </div>
          <div class="form-group">
            <label>厂区:</label>
            <el-select v-model="filterPlantId" placeholder="全部厂区" @change="onFilterChange">
              <el-option :value="0" label="全部厂区" />
              <el-option v-for="plant in plants" :key="plant.id" :label="plant.name" :value="plant.id" />
            </el-select>
          </div>
          <div class="form-group">
            <label>部门:</label>
            <el-select v-model="filterDepartmentId" placeholder="全部部门" @change="onDepartmentChange">
              <el-option :value="0" label="全部部门" />
              <el-option v-for="dept in filteredDepartments" :key="dept.id" :label="dept.name" :value="dept.id" />
            </el-select>
          </div>
          <div class="form-group">
            <label>岗位:</label>
            <el-select v-model="filterPosition" placeholder="全部岗位" multiple collapse-tags collapse-tags-tooltip @change="onFilterChange">
              <el-option v-for="pos in positionOptions" :key="pos" :label="pos" :value="pos" />
            </el-select>
          </div>
          <div class="form-group">
            <label>状态:</label>
            <el-select v-model="filterAssigned" placeholder="全部状态" @change="onFilterChange">
              <el-option :value="''" label="全部状态" />
              <el-option :value="'assigned'" label="已分配" />
              <el-option :value="'unassigned'" label="未分配" />
            </el-select>
          </div>
        </div>

        <!-- 排班员工列表 -->
        <div v-if="filteredEmployees.length > 0" class="employee-list-section">
          <div class="section-title">
            📋 排班员工列表 ({{ filteredEmployees.length }}人)
            <span class="page-info" v-if="totalPages > 1">（第 {{ currentPage }}/{{ totalPages }} 页）</span>
            <el-input
              v-model="filterEmployeeSearch"
              placeholder="搜索姓名或SAP工号"
              size="small"
              style="width: 180px; margin-left: 16px"
              clearable
              @input="currentPage = 1"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="employee-table">
            <el-table ref="employeeTableRef" :data="paginatedEmployees" border style="width: 100%" size="small" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="50" />
              <el-table-column prop="realName" label="姓名" width="100" />
              <el-table-column prop="level" label="Level" width="80" />
              <el-table-column label="SAP工号" min-width="150">
                <template #default="{ row }">
                  <div class="sap-cell" @click="startEditSapId(row)">
                    <span
                      v-for="(sapId, idx) in getSapIdsArray(row)"
                      :key="idx"
                      class="sap-id-tag"
                    >{{ sapId }}</span>
                    <el-input
                      v-if="editingSapId === row.employeeId"
                      v-model="editableSapIds[row.realName]"
                      size="small"
                      class="sap-input-inline"
                      placeholder="输入后回车"
                      @keyup.enter="onSapIdBlur(row)"
                      @blur="onSapIdBlur(row)"
                      ref="sapInputRef"
                      autofocus
                    />
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="plantName" label="厂区" width="120" />
              <el-table-column prop="departmentName" label="部门" width="150" />
              <el-table-column prop="shift" label="班次" width="80" />
              <el-table-column prop="durationHours" label="工作时长" width="90">
                <template #default="{ row }">
                  {{ row.durationHours ? Number(row.durationHours).toFixed(1) + 'H' : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="分配的工位" min-width="200">
                <template #default="{ row }">
                  <div class="assigned-workstations">
                    <el-tag
                      v-for="ws in getAssignedWorkstations(row.employeeId)"
                      :key="ws.workstationId"
                      closable
                      @close="unassignEmployee(row.employeeId, ws.workstationId)"
                      type="success"
                      class="ws-tag"
                    >
                      {{ ws.workstationName }}
                    </el-tag>
                    <span v-if="getAssignedWorkstations(row.employeeId).length === 0" class="no-assign">未分配</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="无产出时长" width="100">
                <template #default="{ row }">
                  {{ calculateNoProductionHours(row.employeeId, row.realName) > 0 ? calculateNoProductionHours(row.employeeId, row.realName).toFixed(1) + 'H' : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="150">
                <template #default="{ row }">
                  <div class="remark-cell">
                    <span
                      v-if="editingRemark.employeeId !== row.employeeId"
                      class="remark-text"
                      :class="{ 'remark-placeholder': !getRemark(row.employeeId) }"
                      @click="startEditRemark(row)"
                    >
                      {{ getRemark(row.employeeId) || '点击添加备注' }}
                    </span>
                    <el-input
                      v-else
                      v-model="editingRemark.remark"
                      size="small"
                      class="remark-input"
                      placeholder="输入备注后回车保存"
                      @keyup.enter="saveRemark(row.employeeId)"
                      @blur="saveRemark(row.employeeId)"
                      ref="remarkInputRef"
                      autofocus
                    />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="openAssignDialog(row)">
                    {{ getAssignedWorkstations(row.employeeId).length > 0 ? '改派' : '分配' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页 -->
            <div class="table-pagination" v-if="filteredEmployees.length > 0">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                :total="filteredEmployees.length"
                layout="total, prev, pager, next"
                small
                background
              />
            </div>
          </div>
        </div>

        <div v-else-if="selectedDate" class="empty-state">
          <p>该日期暂无排班员工</p>
        </div>

        <div v-else class="empty-state">
          <p>请选择日期</p>
        </div>
      </div>
    </div>

    <!-- 分配工位弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配工位" width="700px">
      <div class="assign-dialog-content">
        <div class="assign-employee-info">
          <span class="label">员工:</span>
          <span class="value">{{ currentEmployee?.realName }} ({{ currentEmployee?.sapEmployeeId || currentEmployee?.employeeId }})</span>
        </div>
        <div class="assign-employee-info">
          <span class="label">班次:</span>
          <span class="value">{{ currentEmployee?.shift }}班</span>
        </div>

        <div class="workstation-select-section">
          <div class="section-label">选择工位:</div>
          <el-checkbox-group v-model="selectedWorkstationIds">
            <!-- 普通工位 -->
            <div class="workstation-grid">
              <el-checkbox
                v-for="ws in regularWorkstations"
                :key="ws.workstationId"
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox-compact"
              >
                {{ ws.workstationName }}
              </el-checkbox>
            </div>
            <!-- 前台/特殊工时工位 -->
            <div v-for="ws in timeRequiredWorkstations" :key="ws.workstationId" class="time-required-ws">
              <el-checkbox
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox"
              >
                {{ ws.workstationName }}
              </el-checkbox>
              <!-- 只对选中的工位显示时间选择器 -->
              <div v-if="selectedWorkstationIds.includes(ws.workstationId)" class="time-picker-row">
                <template v-if="ws.workstationName && ws.workstationName.trim().includes('特殊工时')">
                  <div class="special-hours-section">
                    <div class="special-hours-header">
                      <div class="special-hours-actions">
                        <el-button
                          type="warning"
                          size="small"
                          @click="addHazardReceivingTime"
                        >
                          接收危废
                        </el-button>
                        <el-button
                          type="primary"
                          size="small"
                          @click="addSpecialHoursTime"
                        >
                          添加时间段
                        </el-button>
                      </div>
                    </div>
                    <!-- 特殊工时时间段列表 -->
                    <div v-if="specialHoursTimeSlots.length > 0" class="time-slots-list">
                      <div class="time-slot-card" v-for="slot in specialHoursTimeSlots" :key="slot.id">
                        <div class="time-slot-row">
                          <span class="time-slot-label">开始</span>
                          <el-time-picker
                            v-model="slot.startTime"
                            format="HH:mm"
                            value-format="HH:mm"
                            placeholder="开始时间"
                            style="width: 100px"
                            size="small"
                          />
                          <span class="time-slot-sep">-</span>
                          <span class="time-slot-label">结束</span>
                          <el-time-picker
                            v-model="slot.endTime"
                            format="HH:mm"
                            value-format="HH:mm"
                            placeholder="结束时间"
                            style="width: 100px"
                            size="small"
                          />
                          <span class="time-slot-label">原因</span>
                          <el-input
                            v-model="slot.reason"
                            placeholder="请输入原因"
                            style="flex: 1; min-width: 150px"
                            size="small"
                          />
                          <el-button
                            type="danger"
                            size="small"
                            link
                            @click="removeSpecialHoursTimeSlot(slot.id)"
                          >
                            ×
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                </div>
              </div>
          </el-checkbox-group>
        </div>
      </div>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配弹窗 -->
    <el-dialog v-model="batchAssignDialogVisible" title="批量分配工位" width="800px">
      <div class="assign-dialog-content">
        <div class="employee-select-section">
          <div class="section-label">选择员工 ({{ selectedEmployeesForBatch.length }}人):</div>
          <el-checkbox-group v-model="selectedEmployeeIdsForBatch">
            <div class="employee-options">
              <el-checkbox
                v-for="emp in filteredEmployees"
                :key="emp.employeeId"
                :value="emp.employeeId"
                class="employee-checkbox"
              >
                {{ emp.realName }}
                <span class="emp-sap">({{ emp.sapEmployeeId || '-' }})</span>
                <span class="emp-shift">{{ emp.shift }}班</span>
                <span v-if="getAssignedWorkstations(emp.employeeId).length > 0" class="emp-assigned">
                  已分配
                </span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>

        <div class="workstation-select-section">
          <div class="section-label">分配到工位:</div>

          <!-- 普通工位 - 网格布局 -->
          <el-checkbox-group v-model="batchSelectedWorkstationIds">
            <div class="workstation-grid">
              <el-checkbox
                v-for="ws in regularWorkstations"
                :key="ws.workstationId"
                :value="ws.workstationId"
                :disabled="ws.workstationStatus !== 'active'"
                class="workstation-checkbox-compact"
              >
                {{ ws.workstationName }}
                <span class="ws-count" v-if="ws.employees.length > 0">
                  ({{ ws.employees.length }})
                </span>
              </el-checkbox>
            </div>
          </el-checkbox-group>

          <!-- 前台/特殊工时工位 - 带时间选择 -->
          <div v-for="ws in timeRequiredWorkstations" :key="ws.workstationId" class="time-required-ws">
            <el-checkbox
              v-model="batchSelectedWorkstationIds"
              :value="ws.workstationId"
              :disabled="ws.workstationStatus !== 'active'"
            >
              {{ ws.workstationName }}
              <span class="ws-count" v-if="ws.employees.length > 0">
                ({{ ws.employees.length }})
              </span>
            </el-checkbox>
            <div class="time-picker-row">
              <span class="time-label">开始:</span>
              <el-time-picker
                v-model="batchStartTime"
                format="HH:mm"
                value-format="HH:mm:ss"
                placeholder="选择"
                style="width: 100px"
                size="small"
              />
              <span class="time-label">结束:</span>
              <el-time-picker
                v-model="batchEndTime"
                format="HH:mm"
                value-format="HH:mm:ss"
                placeholder="选择"
                style="width: 100px"
                size="small"
              />
              <!-- 特殊工时需要填写原因 -->
              <template v-if="ws.workstationName && ws.workstationName.trim().includes('特殊工时')">
                <span class="time-label">原因:</span>
                <el-input
                  v-model="batchReason"
                  type="textarea"
                  :rows="1"
                  placeholder="请填写原因"
                  style="width: 150px"
                  size="small"
                  resize="none"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchAssign">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入工位分配" width="600px">
      <div class="import-dialog-content">
        <div class="import-instructions">
          <p>📋 导入说明：</p>
          <ul>
            <li>支持 Excel 文件（.xlsx）或 CSV 文件（.csv）</li>
            <li>第一行为表头：日期、姓名、SAP工号、工位</li>
            <li>日期格式：YYYY-MM-DD（如：2024-01-15）</li>
            <li>一人多个工位时，工位之间用 <strong>&</strong> 连接</li>
            <li>工位名称需与系统中的工位名称一致</li>
          </ul>
          <p class="template-hint">📥 <el-button type="text" @click="downloadTemplate">下载导入模板</el-button></p>
        </div>

        <div class="import-upload">
          <el-upload
            ref="uploadRef"
            class="upload-component"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.csv"
            :on-change="handleFileChange"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">xlsx/csv 文件，大小不超过 5MB</div>
            </template>
          </el-upload>
        </div>

        <div v-if="importPreviewData.length > 0" class="import-preview">
          <div class="preview-title">📋 预览数据 ({{ importPreviewData.length }} 条):</div>
          <el-table :data="importPreviewData" border size="small" max-height="300">
            <el-table-column prop="date" label="日期" width="110" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column label="SAP工号" width="180">
              <template #default="{ row }">
                <div class="sap-id-cell">
                  <span class="sap-id-value">{{ row.sapId || '-' }}</span>
                  <span v-if="row.autoSapId && row.autoSapId !== row.rawSapId && row.rawSapId" class="auto-hint">
                    原: {{ row.rawSapId }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="workstations" label="工位" min-width="150" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '✓' : '✗' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="importErrorCount > 0" prop="errorMsg" label="错误原因" width="200">
              <template #default="{ row }">
                <span class="error-text">{{ row.errorMsg || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
          <!-- 错误详情列表 -->
          <div v-if="importErrorCount > 0" class="error-details">
            <div class="error-details-title">❌ 错误详情：</div>
            <div v-for="(err, idx) in errorRows" :key="idx" class="error-row">
              {{ idx + 1 }}. {{ err.date }} | {{ err.name }} | {{ err.workstations }} → {{ err.errorMsg }}
            </div>
          </div>
          <div v-if="importErrorCount > 0" class="error-summary">
            ⚠️ {{ importErrorCount }} 条数据存在问题，已跳过
            <span v-if="importErrorStats.date > 0">（日期格式错误: {{ importErrorStats.date }}）</span>
            <span v-if="importErrorStats.workstation > 0">（工位不存在: {{ importErrorStats.workstation }}）</span>
            <span v-if="importErrorStats.name > 0">（姓名为空: {{ importErrorStats.name }}）</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button @click="clearImportData">清空</el-button>
        <el-button type="primary" :disabled="importPreviewData.length === 0 || importErrorCount > 0" @click="confirmImport">
          确认导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 自动分配规则弹窗 -->
    <el-dialog v-model="autoAssignRulesDialogVisible" title="⚙️ 自动分配规则管理" width="800px">
      <div class="auto-assign-rules-content">
        <div class="rules-header">
          <div class="rules-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>设置员工的自动分配规则后，当该员工出现在排班表中时，将自动分配到指定的工位</span>
          </div>
        </div>

        <div class="rules-actions">
          <el-button type="primary" size="small" @click="openAddRuleDialog">
            ➕ 添加规则
          </el-button>
        </div>

        <el-table :data="autoAssignRules" border size="small" max-height="350" style="margin-top: 16px">
          <el-table-column prop="employeeName" label="员工姓名" width="120">
            <template #default="{ row }">
              {{ row.employeeName }}
              <span class="rule-sap-id" v-if="row.employeeSapId">({{ row.employeeSapId }})</span>
            </template>
          </el-table-column>
          <el-table-column prop="workstationName" label="分配工位" width="150" />
          <el-table-column prop="priority" label="优先级" width="80" align="center" />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                {{ row.isActive ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="toggleRule(row)">
                {{ row.isActive ? '禁用' : '启用' }}
              </el-button>
              <el-button type="danger" size="small" link @click="deleteRule(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="autoAssignRules.length === 0" class="rules-empty">
          暂无自动分配规则，点击上方按钮添加
        </div>
      </div>
      <template #footer>
        <el-button @click="autoAssignRulesDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加规则弹窗 -->
    <el-dialog v-model="addRuleDialogVisible" title="添加自动分配规则" width="500px">
      <div class="add-rule-form">
        <el-form :model="newRule" label-width="100px" size="small">
          <el-form-item label="选择员工" required>
            <el-select
              v-model="newRule.employeeId"
              filterable
              remote
              placeholder="搜索员工姓名或SAP工号"
              :remote-method="searchEmployees"
              :loading="searchingEmployees"
              style="width: 100%"
              @change="onEmployeeSelect"
            >
              <el-option
                v-for="emp in searchResults"
                :key="emp.id"
                :label="`${emp.realName} (${emp.sapId || '无SAP'})`"
                :value="emp.id"
              >
                <span>{{ emp.realName }}</span>
                <span class="option-sap-id">{{ emp.sapId || '无SAP' }}</span>
                <span class="option-position" v-if="emp.position">{{ emp.position }}</span>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="分配工位" required>
            <el-select v-model="newRule.workstationId" placeholder="选择工位" style="width: 100%">
              <el-option
                v-for="ws in allWorkstations"
                :key="ws.workstationId"
                :label="ws.workstationName"
                :value="ws.workstationId"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-input-number v-model="newRule.priority" :min="0" :max="999" />
            <span class="priority-tip">（数字越大优先级越高）</span>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="addRuleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddRule" :disabled="!newRule.employeeId || !newRule.workstationId">
          确定添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled, InfoFilled, Search } from '@element-plus/icons-vue';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { addSpecialWorkingHours, deleteSpecialWorkingHoursByCondition } from '@/api/specialWorkingHours';
import eventBus from '@/utils/eventBus';

interface Plant {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  plantId?: number;
}

interface ScheduledEmployee {
  employeeId: number;
  realName: string;
  sapEmployeeId?: string;
  shift: string;
  plantId?: number;
  plantName?: string;
  departmentId?: number;
  departmentName?: string;
  employeeType?: string;
  durationHours?: number;
  position?: string;
  level?: string;
  totalHours?: number;
}

interface AssignedEmployee {
  arrangementId: number;
  employeeId: number;
  employeeName: string;
  sapEmployeeId?: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number;
  reason?: string | null;
  remark?: string;
  level?: string | null;
}

interface WorkstationWithEmployees {
  workstationId: number;
  workstationName: string;
  workstationStatus: string;
  employees: AssignedEmployee[];
}

// 选择条件
const selectedDate = ref<string>(sessionStorage.getItem('stationArrangementDate') || dayjs().format('YYYY-MM-DD'));
const filterShift = ref<string[]>([]);
const filterPlantId = ref(0);
const filterDepartmentId = ref(0);
const filterPosition = ref<string[]>([]);
const filterAssigned = ref(''); // '' | 'assigned' | 'unassigned'

// 数据
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);
const filteredDepartments = ref<Department[]>([]);
const scheduledEmployees = ref<ScheduledEmployee[]>([]);
const workstations = ref<WorkstationWithEmployees[]>([]);
const specialHoursMap = ref<Record<string, Array<{startTime: string | null, endTime: string | null, event: string}>>>({});

// 分配弹窗
const assignDialogVisible = ref(false);
const currentEmployee = ref<ScheduledEmployee | null>(null);
const selectedWorkstationIds = ref<number[]>([]);

// 表格中选中的员工
const tableSelectedEmployees = ref<ScheduledEmployee[]>([]);
const employeeTableRef = ref();

// 批量分配弹窗
const batchAssignDialogVisible = ref(false);
const selectedEmployeeIdsForBatch = ref<number[]>([]);
const batchSelectedWorkstationIds = ref<number[]>([]);
const batchStartTime = ref<string>('');
const batchEndTime = ref<string>('');

// 单个分配弹窗
const singleStartTime = ref<string>('');
const singleEndTime = ref<string>('');

// 特殊工时原因
const singleReason = ref<string>('');
const batchReason = ref<string>('');

// 特殊工时勾选状态
const isSpecialHoursSelected = ref<boolean>(false);

// 原因输入框回车处理（允许换行）
// 接收危废时间段列表
interface HazardTimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  reason: string;
}
const hazardTimeSlots = ref<HazardTimeSlot[]>([]);
let hazardSlotIdCounter = 1;

// 添加接收危废时间段（同时添加到UI显示数组和后端提交数组）
const addHazardReceivingTime = () => {
  const reason = singleReason.value.trim() || '接收危废';

  // 添加到UI显示数组
  specialHoursTimeSlots.value.push({
    id: specialHoursSlotIdCounter++,
    startTime: '21:45',
    endTime: '23:15',
    reason: reason,
  });
  specialHoursTimeSlots.value.push({
    id: specialHoursSlotIdCounter++,
    startTime: '03:45',
    endTime: '05:15',
    reason: reason,
  });
};

// 删除接收危废时间段
const removeHazardTimeSlot = (id: number) => {
  hazardTimeSlots.value = hazardTimeSlots.value.filter(slot => slot.id !== id);
};

// 特殊工时时间段
interface SpecialHoursTimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  reason: string;
}
const specialHoursTimeSlots = ref<SpecialHoursTimeSlot[]>([]);
let specialHoursSlotIdCounter = 1;

// 添加特殊工时时间段
const addSpecialHoursTime = () => {
  specialHoursTimeSlots.value.push({
    id: specialHoursSlotIdCounter++,
    startTime: '09:00',
    endTime: '18:00',
    reason: '',
  });
};

// 删除特殊工时时间段
const removeSpecialHoursTimeSlot = (id: number) => {
  specialHoursTimeSlots.value = specialHoursTimeSlots.value.filter(slot => slot.id !== id);
};

// 批量导入
const importDialogVisible = ref(false);
const uploadRef = ref();
const sapInputRef = ref();
const editingSapId = ref<number | null>(null);
const employeeNameToId = ref<Record<string, number>>({});
const editableSapIds = ref<Record<string, string>>({});
const importFile = ref<File | null>(null);
const importPreviewData = ref<any[]>([]);
const importErrorCount = ref(0);

// 导入预览数据接口
interface ImportRow {
  date: string;
  name: string;
  rawSapId: string;      // 原始导入的SAP工号
  autoSapId: string;     // 自动带出的SAP工号（可能多个，用&连接）
  sapId: string;         // 最终使用的SAP工号（可手动修改）
  workstations: string;
  status: 'success' | 'error';
  errorMsg?: string;
  errorType?: 'date' | 'workstation' | 'name';  // 错误类型
}

// 错误统计
const importErrorStats = ref({
  date: 0,        // 日期格式错误
  workstation: 0, // 工位不存在
  name: 0         // 姓名为空
});

// 错误行列表（用于显示详情）
const errorRows = computed(() => {
  return importPreviewData.value.filter(row => row.status === 'error');
});

// ==================== 自动分配规则相关 ====================

interface AutoAssignRule {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeSapId?: string;
  workstationId: number;
  workstationName: string;
  priority: number;
  isActive: boolean;
}

const autoAssignRulesDialogVisible = ref(false);
const autoAssignRules = ref<AutoAssignRule[]>([]);
const addRuleDialogVisible = ref(false);
const newRule = ref({
  employeeId: undefined as number | undefined,
  workstationId: undefined as number | undefined,
  priority: 0,
});
const searchResults = ref<any[]>([]);
const searchingEmployees = ref(false);
const allWorkstations = ref<{ workstationId: number; workstationName: string }[]>([]);

// 打开自动分配规则弹窗
const openAutoAssignRulesDialog = async () => {
  autoAssignRulesDialogVisible.value = true;
  await fetchAutoAssignRules();
  await fetchAllWorkstationsForRules();
};

// 获取自动分配规则列表
const fetchAutoAssignRules = async () => {
  try {
    const res = await request.get('/workstations/auto-assign-rules');
    const data = (res as any)?.data ?? res;
    autoAssignRules.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取自动分配规则失败:', error);
  }
};

// 获取所有工位列表（用于规则配置）
const fetchAllWorkstationsForRules = async () => {
  try {
    const res = await request.get('/workstations/active-list');
    const data = (res as any)?.data ?? res;
    allWorkstations.value = Array.isArray(data) ? data.map((ws: any) => ({
      workstationId: ws.id,
      workstationName: ws.name,
    })) : [];
  } catch (error) {
    console.error('获取工位列表失败:', error);
  }
};

// 打开添加规则弹窗
const openAddRuleDialog = () => {
  newRule.value = {
    employeeId: undefined,
    workstationId: undefined,
    priority: 0,
  };
  searchResults.value = [];
  addRuleDialogVisible.value = true;
};

// 搜索员工
const searchEmployees = async (keyword: string) => {
  if (!keyword) {
    searchResults.value = [];
    return;
  }
  searchingEmployees.value = true;
  try {
    const res = await request.get('/workstations/employees', {
      params: { keyword }
    });
    const data = (res as any)?.data ?? res;
    searchResults.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('搜索员工失败:', error);
  } finally {
    searchingEmployees.value = false;
  }
};

// 员工选择变化
const onEmployeeSelect = (employeeId: number) => {
  // 可以在这里做一些额外的处理
  console.log('选中的员工ID:', employeeId);
};

// 确认添加规则
const confirmAddRule = async () => {
  if (!newRule.value.employeeId || !newRule.value.workstationId) {
    ElMessage.warning({ message: '请选择员工和工位', showClose: true });
    return;
  }

  // 检查是否已存在该员工的规则
  const existingRule = autoAssignRules.value.find(r => r.employeeId === newRule.value.employeeId);
  if (existingRule) {
    ElMessage.warning({ message: '该员工已有自动分配规则，将更新为新的工位', showClose: true });
  }

  try {
    await request.post('/workstations/auto-assign-rules', {
      employeeId: newRule.value.employeeId,
      workstationId: newRule.value.workstationId,
      priority: newRule.value.priority,
    });

    ElMessage.success({ message: '添加成功', showClose: true });
    addRuleDialogVisible.value = false;
    await fetchAutoAssignRules();
  } catch (error) {
    console.error('添加规则失败:', error);
    ElMessage.error({ message: '添加失败', showClose: true });
  }
};

// 切换规则启用状态
const toggleRule = async (rule: AutoAssignRule) => {
  try {
    await request.put(`/workstations/auto-assign-rules/${rule.id}/toggle`);
    ElMessage.success({ message: '状态更新成功', showClose: true });
    await fetchAutoAssignRules();
  } catch (error) {
    console.error('切换规则状态失败:', error);
    ElMessage.error({ message: '操作失败', showClose: true });
  }
};

// 删除规则
const deleteRule = async (rule: AutoAssignRule) => {
  const { ElMessageBox } = await import('element-plus');
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${rule.employeeName}" 的自动分配规则吗？`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );

    await request.delete(`/workstations/auto-assign-rules/${rule.id}`);
    ElMessage.success({ message: '删除成功', showClose: true });
    await fetchAutoAssignRules();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除规则失败:', error);
      ElMessage.error({ message: '删除失败', showClose: true });
    }
  }
};

// ==================== 原有逻辑 ====================

// 判断是否为需要时间的工位（前台或特殊工时）
const isTimeRequiredWorkstation = (workstationName: string): boolean => {
  const name = workstationName?.trim() || '';
  return name.includes('前台') || name.includes('特殊工时');
};

// 根据职位自动分配工位（按工位批量分配，支持多人同一工位）
// 根据数据库规则自动分配工位
const autoAssignByRules = async () => {
  if (workstations.value.length === 0 || scheduledEmployees.value.length === 0) return;

  // 获取自动分配规则
  let rules: AutoAssignRule[] = [];
  try {
    const res = await request.get('/workstations/auto-assign-rules');
    const data = (res as any)?.data ?? res;
    rules = Array.isArray(data) ? data.filter((r: AutoAssignRule) => r.isActive) : [];
  } catch (error) {
    console.error('获取自动分配规则失败:', error);
    return;
  }

  if (rules.length === 0) return;

  // 按工位分组收集需要自动分配的员工（只收集尚未分配的员工）
  const wsEmployeeMap: Record<number, { employees: ScheduledEmployee[]; sapIds: (string | undefined)[] }> = {};

  for (const employee of scheduledEmployees.value) {
    // 检查员工是否已有自动分配规则
    const rule = rules.find(r => r.employeeId === employee.employeeId);
    if (!rule) continue;

    // 检查员工是否已分配（任意工位）- 如果已分配则跳过
    const alreadyAssigned = workstations.value.some(ws =>
      ws.employees.some(e => e.employeeId === employee.employeeId)
    );
    if (alreadyAssigned) continue;

    // 收集到该工位
    if (!wsEmployeeMap[rule.workstationId]) {
      wsEmployeeMap[rule.workstationId] = { employees: [], sapIds: [] };
    }
    wsEmployeeMap[rule.workstationId]!.employees.push(employee);

    // 获取 SAP 工号
    const sapIdsArray = getSapIdsArray(employee);
    wsEmployeeMap[rule.workstationId]!.sapIds.push(sapIdsArray.length > 0 ? sapIdsArray.join('&') : undefined);
  }

  // 逐个工位调用API进行分配（使用追加模式，支持多人）
  for (const [wsId, data] of Object.entries(wsEmployeeMap)) {
    const ws = workstations.value.find(w => w.workstationId === parseInt(wsId));
    if (!ws || data.employees.length === 0) continue;

    try {
      const employeeIds = data.employees.map(e => e.employeeId);

      // 使用追加模式，保留已有员工并追加新员工
      await request.post('/workstations/arrangements', {
        workstationId: parseInt(wsId),
        arrangementDate: selectedDate.value,
        shiftName: currentEmployee.value?.shift,
        employeeIds: employeeIds,
        sapEmployeeIds: data.sapIds,
        append: true,
      });

      // 更新本地数据
      data.employees.forEach((employee, idx) => {
        ws.employees.push({
          arrangementId: 0,
          employeeId: employee.employeeId,
          employeeName: employee.realName,
          sapEmployeeId: data.sapIds[idx] || undefined,
          startTime: null,
          endTime: null,
          reason: null,
        });
      });

      console.log(`规则自动分配成功: ${ws.workstationName} 工位分配了 ${data.employees.length} 名员工`);
    } catch (err) {
      console.error('规则自动分配失败:', ws.workstationName, err);
    }
  }
};

// 根据员工职位获取默认工位ID（仅用于特殊职位）
const getDefaultWorkstationIdByPosition = (position?: string): number | null => {
  if (!position) return null;
  const pos = position.trim();

  // 职位与工位名称匹配映射
  const positionWorkstationMap: Record<string, string[]> = {
    'Cycle Count': ['Cycle Count'],
    'Spare part': ['Spare part'],
    'MRB': ['MRB'],
    'MRO': ['MRO'],
  };

  const targetNames = positionWorkstationMap[pos];
  if (!targetNames) return null;

  // 查找匹配的工位
  const matchedWorkstation = workstations.value.find(ws =>
    targetNames.some(name => ws.workstationName.trim() === name)
  );

  return matchedWorkstation?.workstationId || null;
};

// 根据职位自动分配工位（按工位批量分配，支持多人同一工位）
const autoAssignByPosition = async () => {
  if (workstations.value.length === 0 || scheduledEmployees.value.length === 0) return;

  const specialPositions = ['Cycle Count', 'Spare part', 'MRB', 'MRO'];

  // 按工位分组收集需要自动分配的员工（只收集尚未分配的员工）
  // key: workstationId, value: { employees: [], sapIds: [] }
  const wsEmployeeMap: Record<number, { employees: ScheduledEmployee[]; sapIds: (string | undefined)[] }> = {};

  for (const employee of scheduledEmployees.value) {
    // 检查员工是否有特殊职位
    if (!employee.position || !specialPositions.includes(employee.position)) continue;

    // 检查员工是否已分配（任意工位）- 如果已分配则跳过
    const alreadyAssigned = workstations.value.some(ws =>
      ws.employees.some(e => e.employeeId === employee.employeeId)
    );
    if (alreadyAssigned) continue;

    // 获取对应的工位ID
    const defaultWsId = getDefaultWorkstationIdByPosition(employee.position);
    if (!defaultWsId) continue;

    // 收集到该工位（支持多人同一工位）
    if (!wsEmployeeMap[defaultWsId]) {
      wsEmployeeMap[defaultWsId] = { employees: [], sapIds: [] };
    }
    wsEmployeeMap[defaultWsId].employees.push(employee);

    // 获取 SAP 工号
    const sapIdsArray = getSapIdsArray(employee);
    wsEmployeeMap[defaultWsId].sapIds.push(sapIdsArray.length > 0 ? sapIdsArray.join('&') : undefined);
  }

  // 逐个工位调用API进行分配（使用追加模式，支持多人）
  for (const [wsId, data] of Object.entries(wsEmployeeMap)) {
    const ws = workstations.value.find(w => w.workstationId === parseInt(wsId));
    if (!ws || data.employees.length === 0) continue;

    try {
      const employeeIds = data.employees.map(e => e.employeeId);

      // 使用追加模式，保留已有员工并追加新员工
      await request.post('/workstations/arrangements', {
        workstationId: parseInt(wsId),
        arrangementDate: selectedDate.value,
        shiftName: currentEmployee.value?.shift,
        employeeIds: employeeIds,
        sapEmployeeIds: data.sapIds,
        append: true,  // 追加模式
      });

      // 更新本地数据
      data.employees.forEach((employee, idx) => {
        ws.employees.push({
          arrangementId: 0,
          employeeId: employee.employeeId,
          employeeName: employee.realName,
          sapEmployeeId: data.sapIds[idx] || undefined,
          startTime: null,
          endTime: null,
          reason: null,
        });
      });

      console.log(`自动分配成功: ${ws.workstationName} 工位分配了 ${data.employees.length} 名员工`);
    } catch (err) {
      console.error('自动分配失败:', ws.workstationName, err);
    }
  }
};

// 根据选中的员工ID获取员工对象
const selectedEmployeesForBatch = computed(() => {
  return filteredEmployees.value.filter(e => selectedEmployeeIdsForBatch.value.includes(e.employeeId));
});

// 普通工位（不需要时间）
const regularWorkstations = computed(() => {
  return workstations.value.filter(w => !isTimeRequiredWorkstation(w.workstationName));
});

// 需要时间的工位（前台、特殊工时）
const timeRequiredWorkstations = computed(() => {
  return workstations.value.filter(w => isTimeRequiredWorkstation(w.workstationName));
});

// 状态
const loading = ref(false);

// 班次选项
const shiftOptions = ref<{ value: string; label: string }[]>([]);

// 获取班次选项（从 jso_config_shift_duration_rules 表获取，排除请假、调休、年假、离职、旷工）
const fetchShiftOptions = async () => {
  try {
    const res = await request.get('/config/shift-duration-rules/shifts');
    const data = (res as any)?.data ?? res;
    const shifts = Array.isArray(data) ? data : [];
    shiftOptions.value = shifts.map((shift: string) => ({
      value: shift,
      label: `${shift}班`
    }));
  } catch (error) {
    console.error('获取班次列表失败:', error);
    // 降级为静态数据
    shiftOptions.value = [
      { value: 'A', label: 'A班' },
      { value: 'B', label: 'B班' },
      { value: 'C', label: 'C班' },
      { value: 'N', label: 'N班' },
      { value: 'A+', label: 'A+班' },
      { value: 'B+', label: 'B+班' },
      { value: 'C+', label: 'C+班' },
      { value: 'N+', label: 'N+班' },
      { value: 'A2', label: 'A2班' },
    ];
  }
};

// 职位选项（从 jso_system_user_management 表的 position 字段获取）
const positionOptions = ref<string[]>([]);

// 获取职位列表
const fetchPositions = async () => {
  try {
    const res = await request.get('/users/positions', {
      params: { departmentId: filterDepartmentId.value || undefined }
    });
    // 响应拦截器返回的是 { code, message, data } 格式
    const data = (res as any)?.data ?? res;
    positionOptions.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取职位列表失败:', error);
  }
};

// 前一天
const goToPrevDay = () => {
  const prev = dayjs(selectedDate.value).subtract(1, 'day');
  selectedDate.value = prev.format('YYYY-MM-DD');
  sessionStorage.setItem('stationArrangementDate', selectedDate.value);
  onDateChange();
};

// 获取SAP工号数组（支持多个工号用 & 分隔）
const getSapIdsArray = (row: ScheduledEmployee): string[] => {
  const sapId = editableSapIds.value[row.realName] || '';
  if (!sapId || sapId === '-') return [];
  return sapId.split('&').map(s => s.trim()).filter(Boolean);
};

// 开始编辑SAP工号
const startEditSapId = (row: ScheduledEmployee) => {
  editingSapId.value = row.employeeId;
  setTimeout(() => {
    sapInputRef.value?.focus();
  }, 50);
};

// 备注编辑相关
const editingRemark = ref({
  employeeId: null as number | null,
  remark: '',
});
const remarkInputRef = ref();

// 获取员工的备注
const getRemark = (employeeId: number): string => {
  const wsAssignments = workstations.value.flatMap(ws => ws.employees.filter(e => e.employeeId === employeeId));
  if (wsAssignments.length > 0 && wsAssignments[0]) {
    return wsAssignments[0].remark || '';
  }
  return '';
};

// 开始编辑备注
const startEditRemark = (row: ScheduledEmployee) => {
  editingRemark.value = {
    employeeId: row.employeeId,
    remark: getRemark(row.employeeId),
  };
  setTimeout(() => {
    remarkInputRef.value?.focus();
  }, 50);
};

// 保存备注
const saveRemark = async (employeeId: number) => {
  if (editingRemark.value.employeeId !== employeeId) return;

  const newRemark = editingRemark.value.remark;
  editingRemark.value = { employeeId: null, remark: '' };

  // 获取该员工的第一个工位安排记录ID
  const wsAssignments = workstations.value.flatMap(ws => ws.employees.filter(e => e.employeeId === employeeId));
  if (wsAssignments.length === 0) {
    ElMessage.warning({ message: '请先为员工分配工位', showClose: true });
    return;
  }

  const firstAssignment = wsAssignments[0];
  if (!firstAssignment) {
    ElMessage.warning({ message: '工位安排记录不存在', showClose: true });
    return;
  }

  const arrangementId = firstAssignment.arrangementId;
  if (!arrangementId) {
    ElMessage.warning({ message: '工位安排记录ID不存在', showClose: true });
    return;
  }

  try {
    await request.put(`/workstations/arrangements/${arrangementId}/remark`, {
      remark: newRemark,
      arrangementDate: selectedDate.value
    });

    // 更新本地数据
    workstations.value.forEach(ws => {
      ws.employees.forEach(e => {
        if (e.employeeId === employeeId) {
          e.remark = newRemark;
        }
      });
    });

    ElMessage.success({ message: '备注已保存', showClose: true });
  } catch (err) {
    console.error('保存备注失败:', err);
    ElMessage.error({ message: '保存备注失败', showClose: true });
  }
};

// SAP工号编辑完成
const onSapIdBlur = async (row: ScheduledEmployee) => {
  editingSapId.value = null;
  const newSapId = editableSapIds.value[row.realName];
  // 保存到工位安排表（根据员工ID和当前日期更新所有相关安排）
  try {
    // 调用批量更新接口，根据员工ID和日期更新SAP工号
    await request.put('/workstations/arrangements/batch-sap-employee-id', {
      employeeId: row.employeeId,
      arrangementDate: selectedDate.value,
      sapEmployeeId: newSapId
    });
    ElMessage.success({ message: `员工 ${row.realName} 的SAP工号已更新`, showClose: true });
    // 同时更新本地显示
    row.sapEmployeeId = newSapId || undefined;
  } catch (err) {
    console.error('更新SAP工号失败:', err);
    ElMessage.error({ message: '更新SAP工号失败', showClose: true });
    editableSapIds.value[row.realName] = row.sapEmployeeId || '';
  }
};

// 后一天
const goToNextDay = () => {
  const next = dayjs(selectedDate.value).add(1, 'day');
  selectedDate.value = next.format('YYYY-MM-DD');
  sessionStorage.setItem('stationArrangementDate', selectedDate.value);
  onDateChange();
};

// 计算无产出时长（前台/特殊工时工位的实际工作时间）
const calculateNoProductionHours = (employeeId: number, employeeName: string): number => {
  let totalHours = 0;

  // 获取该员工分配到的所有前台或特殊工时工位
  const timeRequiredWsList = workstations.value.filter(w => isTimeRequiredWorkstation(w.workstationName));

  for (const timeRequiredWs of timeRequiredWsList) {
    // 获取该员工在该工位的所有记录（可能有多个时间段）
    const wsAssignments = timeRequiredWs.employees.filter(e => e.employeeId === employeeId);
    if (wsAssignments.length === 0) continue;

    // 累加该员工在该工位的所有记录的时长
    for (const wsAssignment of wsAssignments) {
      // 优先使用数据库返回的 hours 字段
      if (wsAssignment.hours) {
        totalHours += wsAssignment.hours;
      } else if (wsAssignment.startTime && wsAssignment.endTime) {
        // 使用工位安排中的时间计算
        const hours = calculateTimeDiff(wsAssignment.startTime, wsAssignment.endTime);
        totalHours += hours;
      }
    }
  }

  return totalHours;
};

// 计算时间差（小时）
const calculateTimeDiff = (startTime: string, endTime: string): number => {
  const startParts = startTime.split(':');
  const endParts = endTime.split(':');
  const startHour = parseFloat(startParts[0] || '0') || 0;
  const startMin = parseFloat(startParts[1] || '0') || 0;
  const endHour = parseFloat(endParts[0] || '0') || 0;
  const endMin = parseFloat(endParts[1] || '0') || 0;
  const startHours = startHour + startMin / 60;
  let endHours = endHour + endMin / 60;

  // 无产出时长 = 结束时间 - 开始时间
  // 如果结束时间 < 开始时间，说明跨越了午夜（如 21:45 到 05:15）
  let hours = endHours - startHours;
  if (hours < 0) {
    hours += 24; // 跨天加24小时
  }
  return Math.max(0, hours);
};

// 根据班次筛选员工
const filterEmployeeSearch = ref('');  // 员工姓名搜索

const filteredEmployees = computed(() => {
  let result = scheduledEmployees.value;

  // 姓名/SAP工号搜索
  if (filterEmployeeSearch.value.trim()) {
    const search = filterEmployeeSearch.value.trim().toLowerCase();
    result = result.filter(e =>
      e.realName.toLowerCase().includes(search) ||
      (e.sapEmployeeId && e.sapEmployeeId.toLowerCase().includes(search))
    );
  }

  // 按班次筛选
  if (filterShift.value && filterShift.value.length > 0) {
    result = result.filter(e => filterShift.value.includes(e.shift));
  }

  // 按岗位筛选（多选）
  if (filterPosition.value && filterPosition.value.length > 0) {
    result = result.filter(e => e.position && filterPosition.value.includes(e.position));
  }

  // 按分配状态筛选
  if (filterAssigned.value) {
    result = result.filter(e => {
      const hasAssignment = getAssignedWorkstations(e.employeeId).length > 0;
      if (filterAssigned.value === 'assigned') {
        return hasAssignment;
      } else {
        return !hasAssignment;
      }
    });
  }

  return result;
});

// 分页相关
const currentPage = ref(1);
const pageSize = ref(20);

// 分页后的员工列表
const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredEmployees.value.slice(start, end);
});

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredEmployees.value.length / pageSize.value);
});

// 获取厂区列表
const fetchPlants = async () => {
  try {
    const res = await request.get('/plants');
    const data = (res as any)?.data ?? res;
    plants.value = data?.plants || [];
  } catch (error) {
    console.error('获取厂区列表失败:', error);
  }
};

// 获取部门列表
const fetchDepartments = async () => {
  try {
    const res = await request.get('/departments');
    const data = (res as any)?.data ?? res;
    departments.value = data?.departments || [];
    filteredDepartments.value = departments.value;
  } catch (error) {
    console.error('获取部门列表失败:', error);
  }
};

// 获取排班表中的员工
const fetchScheduledEmployees = async () => {
  try {
    if (!selectedDate.value) {
      scheduledEmployees.value = [];
      return;
    }

    const res = await request.get('/schedule/by-date', {
      params: { scheduleDate: selectedDate.value }
    });

    let scheduleData = res;
    if (res && typeof res === 'object' && 'data' in res) {
      scheduleData = (res as any).data;
    }
    const scheduleList = Array.isArray(scheduleData?.list) ? scheduleData.list :
                         Array.isArray(scheduleData) ? scheduleData : [];

    // 过滤掉请假/调休/离职/年假状态的员工，排除Jabil员工类型
    const employees = scheduleList
      .filter((s: any) => !['请假', '调休', '离职', '年假'].includes(s.shift))
      .filter((s: any) => s.employee_type !== 'Jabil')
      .map((s: any) => ({
        employeeId: s.employee_id,
        realName: s.real_name || `员工${s.employee_id}`,
        sapEmployeeId: s.sap_employee_id || '-',
        shift: s.shift,
        plantId: s.plant_id,
        plantName: s.plant_name || '',
        departmentId: s.department_id,
        departmentName: s.department_name || '',
        employeeType: s.employee_type,
        durationHours: s.duration_hours || 0,
        position: s.position || '',
        level: s.level || '',
      }));

    scheduledEmployees.value = employees;

    // 初始化可编辑的SAP工号（按姓名收集所有SAP工号）
    for (const emp of employees) {
      const existingSapId = editableSapIds.value[emp.realName] || '';
      const newSapId = emp.sapEmployeeId && emp.sapEmployeeId !== '-' ? emp.sapEmployeeId : '';

      if (!existingSapId) {
        // 首次设置
        editableSapIds.value[emp.realName] = newSapId;
      } else if (newSapId && !existingSapId.split('&').includes(newSapId)) {
        // 追加新的SAP工号（去重）
        editableSapIds.value[emp.realName] = existingSapId + '&' + newSapId;
      }
      // 如果 newSapId 为空或已存在，不做处理
    }

    // 同步 employeeId 的映射（用于显示）
    for (const emp of employees) {
      if (!employeeNameToId.value[emp.realName]) {
        employeeNameToId.value[emp.realName] = emp.employeeId;
      }
    }

  } catch (error) {
    console.error('获取排班数据失败:', error);
    scheduledEmployees.value = [];
  }
};

// 获取工位及其当日安排
const fetchWorkstationsWithArrangements = async () => {
  if (!selectedDate.value) {
    return;
  }

  loading.value = true;
  try {
    const params: Record<string, any> = {
      arrangementDate: selectedDate.value,
    };
    if (filterPlantId.value !== 0) params.plantId = filterPlantId.value;
    if (filterDepartmentId.value !== 0) params.departmentId = filterDepartmentId.value;

    const res = await request.get('/workstations/arrangements/by-date-shift', { params });
    let wsData = res;
    if (res && typeof res === 'object' && 'data' in res) {
      const apiData = (res as any).data;
      // 处理新的响应格式 { workstations: [], specialHoursMap: {} }
      if (apiData.workstations) {
        workstations.value = apiData.workstations;
      } else {
        workstations.value = Array.isArray(apiData) ? apiData : [];
      }
      if (apiData.specialHoursMap) {
        specialHoursMap.value = apiData.specialHoursMap;
      }
    } else {
      workstations.value = Array.isArray(wsData) ? wsData : [];
    }
  } catch (error) {
    ElMessage.error({ message: '获取工位安排失败', showClose: true, duration: 3000 });
  } finally {
    loading.value = false;
  }
};

// 获取员工已分配的工位
const getAssignedWorkstations = (employeeId: number) => {
  const assigned: WorkstationWithEmployees[] = [];
  workstations.value.forEach(ws => {
    if (ws.employees.some(e => e.employeeId === employeeId)) {
      assigned.push(ws);
    }
  });
  return assigned;
};

// 获取厂区名称
const getPlantName = (plantId?: number) => {
  if (!plantId) return '-';
  const plant = plants.value.find(p => p.id === plantId);
  return plant?.name || '-';
};

// 获取部门名称
const getDepartmentName = (departmentId?: number) => {
  if (!departmentId) return '-';
  const dept = departments.value.find(d => d.id === departmentId);
  return dept?.name || '-';
};

// 打开分配弹窗
const openAssignDialog = (employee: ScheduledEmployee) => {
  currentEmployee.value = employee;
  // 回显已分配的工位
  const assignedWsIds = getAssignedWorkstations(employee.employeeId).map(ws => ws.workstationId);


  // 如果没有已分配的工位，根据职位自动选中默认工位
  if (assignedWsIds.length === 0) {
    const defaultWsId = getDefaultWorkstationIdByPosition(employee.position);
    if (defaultWsId) {
      assignedWsIds.push(defaultWsId);
    }
  }

  selectedWorkstationIds.value = assignedWsIds;
  // 清空时间选择器
  singleStartTime.value = '';
  singleEndTime.value = '';
  singleReason.value = '';
  hazardTimeSlots.value = [];
  specialHoursTimeSlots.value = []; // 清空特殊工时时间段
  isSpecialHoursSelected.value = false;
  assignDialogVisible.value = true;
};

// 确认分配
const confirmAssign = async () => {
  if (!currentEmployee.value) return;

  const employeeId = currentEmployee.value.employeeId;
  const newWsIds = new Set(selectedWorkstationIds.value);

  // 获取当前分配状态
  const currentWsIds = new Set(
    workstations.value
      .filter(ws => ws.employees.some(e => e.employeeId === employeeId))
      .map(ws => ws.workstationId)
  );

  // 计算需要添加和移除的工位
  const toAdd = [...newWsIds].filter(id => !currentWsIds.has(id));
  const toRemove = [...currentWsIds].filter(id => !newWsIds.has(id));

  try {
    // 移除分配
    for (const wsId of toRemove) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws) {
        const removedEmp = ws.employees.find(e => e.employeeId === employeeId);
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');

        ws.employees = ws.employees.filter(e => e.employeeId !== employeeId);
        await request.delete('/workstations/arrangements', {
          data: {
            workstationId: wsId,
            arrangementDate: selectedDate.value,
            employeeId: employeeId,
          }
        });

        // 如果是特殊工时工位，同步删除特殊工时记录
        if (isSpecialHours && removedEmp && removedEmp.reason) {
          try {
            await deleteSpecialWorkingHoursByCondition(
              removedEmp.employeeName,
              selectedDate.value,
              removedEmp.reason
            );
          } catch (deleteError) {
            console.error('删除特殊工时记录失败:', deleteError);
          }
        }
      }
    }

    // 添加分配
    for (const wsId of toAdd) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws && !ws.employees.some(e => e.employeeId === employeeId)) {
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');
        const hasTimeSlots = specialHoursTimeSlots.value.length > 0;

        // 特殊工时工位：必须有时间段或手动填写时间
        if (isSpecialHours && !hasTimeSlots && !singleStartTime.value && !singleEndTime.value) {
          ElMessage.warning({ message: '特殊工时必须填写时间段或开始/结束时间', showClose: true, duration: 3000 });
          return;
        }

        // 获取该员工的 SAP 工号
        const sapIdsArray = getSapIdsArray({ employeeId: employeeId, realName: currentEmployee.value!.realName } as ScheduledEmployee);
        const sapEmployeeId = sapIdsArray.length > 0 ? sapIdsArray.join('&') : undefined;

        const reason = isSpecialHours ? (singleReason.value || '特殊工时') : undefined;

        // 如果有多个时间段，为每个时间段单独创建记录
        if (isSpecialHours && hasTimeSlots) {
          for (const slot of specialHoursTimeSlots.value) {
            if (slot.startTime && slot.endTime) {
              const start = dayjs(`2000-01-01 ${slot.startTime}`);
              const end = dayjs(`2000-01-01 ${slot.endTime}`);
              let hours = end.diff(start, 'hour', true);
              if (hours < 0) hours += 24;

              // 添加到UI显示
              ws.employees.push({
                arrangementId: 0,
                employeeId: employeeId,
                employeeName: currentEmployee.value!.realName,
                sapEmployeeId: sapEmployeeId || undefined,
                startTime: slot.startTime || undefined,
                endTime: slot.endTime || undefined,
                hours: hours,
                reason: slot.reason || reason || undefined,
              });

              // 保存到工位安排表
              await request.post('/workstations/arrangements', {
                workstationId: wsId,
                arrangementDate: selectedDate.value,
                shiftName: currentEmployee.value?.shift,
                employeeIds: [employeeId],
                sapEmployeeIds: sapEmployeeId ? [sapEmployeeId] : undefined,
                startTime: slot.startTime,
                endTime: slot.endTime,
                hours: hours,
                reason: slot.reason || reason,
                append: true,
              });

              // 注意：特殊工时表由后端自动同步，前端不需要再调用 addSpecialWorkingHours
            }
          }
        } else if (singleStartTime.value && singleEndTime.value) {
          // 单个时间段或普通工位的处理
          const start = dayjs(`2000-01-01 ${singleStartTime.value}`);
          const end = dayjs(`2000-01-01 ${singleEndTime.value}`);
          let totalHours = end.diff(start, 'hour', true);
          if (totalHours < 0) totalHours += 24;

          ws.employees.push({
            arrangementId: 0,
            employeeId: employeeId,
            employeeName: currentEmployee.value!.realName,
            sapEmployeeId: sapEmployeeId || undefined,
            startTime: singleStartTime.value || undefined,
            endTime: singleEndTime.value || undefined,
            hours: isSpecialHours && totalHours > 0 ? totalHours : undefined,
            reason: reason || undefined,
          });

          await request.post('/workstations/arrangements', {
            workstationId: wsId,
            arrangementDate: selectedDate.value,
            shiftName: currentEmployee.value?.shift,
            employeeIds: [employeeId],
            sapEmployeeIds: sapEmployeeId ? [sapEmployeeId] : undefined,
            startTime: singleStartTime.value,
            endTime: singleEndTime.value,
            hours: isSpecialHours && totalHours > 0 ? totalHours : undefined,
            reason: reason,
            append: true,
          });

          // 注意：特殊工时表由后端自动同步，前端不需要再调用 addSpecialWorkingHours
        } else {
          // 没有时间段，只保存工位分配
          ws.employees.push({
            arrangementId: 0,
            employeeId: employeeId,
            employeeName: currentEmployee.value!.realName,
            sapEmployeeId: sapEmployeeId || undefined,
            reason: reason || undefined,
          });

          await request.post('/workstations/arrangements', {
            workstationId: wsId,
            arrangementDate: selectedDate.value,
            shiftName: currentEmployee.value?.shift,
            employeeIds: [employeeId],
            sapEmployeeIds: sapEmployeeId ? [sapEmployeeId] : undefined,
            reason: reason,
            append: true,
          });
        }
      }
    }

    assignDialogVisible.value = false;
    singleStartTime.value = '';
    singleEndTime.value = '';
    singleReason.value = '';
    hazardTimeSlots.value = []; // 清空危废时间段
    specialHoursTimeSlots.value = []; // 清空特殊工时时间段
    isSpecialHoursSelected.value = false; // 清空特殊工时勾选状态
    ElMessage.success({ message: '分配成功', showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    ElMessage.error({ message: '分配失败', showClose: true, duration: 3000 });
    // 重新加载数据
    fetchWorkstationsWithArrangements();
  }
};

// 打开批量分配弹窗（使用表格选中的员工）
const openBatchAssignDialog = () => {
  if (tableSelectedEmployees.value.length === 0) {
    ElMessage.warning({ message: '请先在表格中选择员工', showClose: true, duration: 3000 });
    return;
  }
  selectedEmployeeIdsForBatch.value = tableSelectedEmployees.value.map(e => e.employeeId);
  batchSelectedWorkstationIds.value = [];
  batchStartTime.value = ''; // 清空起始时间
  batchEndTime.value = ''; // 清空结束时间
  batchReason.value = ''; // 清空原因
  batchAssignDialogVisible.value = true;
};

// 确认批量分配
const confirmBatchAssign = async () => {
  if (selectedEmployeeIdsForBatch.value.length === 0 || batchSelectedWorkstationIds.value.length === 0) {
    ElMessage.warning({ message: '请选择员工和工位', showClose: true, duration: 3000 });
    return;
  }

  // 检查是否选择了需要时间的工位（前台或特殊工时），如果是则必须填写开始和结束时间
  const timeRequiredWs = workstations.value.find(w => isTimeRequiredWorkstation(w.workstationName) && batchSelectedWorkstationIds.value.includes(w.workstationId));
  if (timeRequiredWs && (!batchStartTime.value || !batchEndTime.value)) {
    ElMessage.warning({ message: '选择该工位时必须填写开始和结束时间', showClose: true, duration: 3000 });
    return;
  }

  // 检查是否选择了特殊工时工位，如果是则必须填写原因
  const specialHoursWs = workstations.value.find(w => w.workstationName && w.workstationName.trim().includes('特殊工时') && batchSelectedWorkstationIds.value.includes(w.workstationId));
  if (specialHoursWs && !batchReason.value.trim()) {
    ElMessage.warning({ message: '选择特殊工时工位时必须填写原因', showClose: true, duration: 3000 });
    return;
  }

  const selectedWsIds = new Set(batchSelectedWorkstationIds.value);
  let successCount = 0;

  try {
    for (const wsId of selectedWsIds) {
      const ws = workstations.value.find(w => w.workstationId === wsId);
      if (ws) {
        const employeeIds = selectedEmployeesForBatch.value.map(e => e.employeeId);
        // 如果是需要时间的工位（前台或特殊工时），需要传递开始和结束时间
        const isTimeRequired = isTimeRequiredWorkstation(ws.workstationName);
        const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');
        const startTime = isTimeRequired ? batchStartTime.value : undefined;
        const endTime = isTimeRequired ? batchEndTime.value : undefined;
        const reason = isSpecialHours ? batchReason.value : undefined;

        // 获取 SAP 工号数组（与 employeeIds 对应）
        const sapEmployeeIds = selectedEmployeesForBatch.value.map(emp => {
          const sapIdsArray = getSapIdsArray(emp);
          return sapIdsArray.length > 0 ? sapIdsArray.join('&') : undefined;
        });

        await request.post('/workstations/arrangements', {
          workstationId: wsId,
          arrangementDate: selectedDate.value,
          shiftName: currentEmployee.value?.shift,
          employeeIds: employeeIds,
          sapEmployeeIds: sapEmployeeIds,
          startTime: startTime,
          endTime: endTime,
          reason: reason,
          append: true,  // 追加模式，保留已有员工
        });

        // 更新前端数据
        selectedEmployeesForBatch.value.forEach(employee => {
          if (!ws.employees.some(e => e.employeeId === employee.employeeId)) {
            const sapIdsArray = getSapIdsArray(employee);
            ws.employees.push({
              arrangementId: 0,
              employeeId: employee.employeeId,
              employeeName: employee.realName,
              sapEmployeeId: sapIdsArray.length > 0 ? sapIdsArray.join('&') : undefined,
              startTime: startTime || undefined,
              endTime: endTime || undefined,
              reason: reason || undefined,
            });
          }
        });
        successCount++;

        // 如果是特殊工时工位，同时添加到特殊工时表
        if (isSpecialHours && startTime && endTime) {
          const employeeNames = selectedEmployeesForBatch.value.map(e => e.realName);
          await addSpecialWorkingHours({
            date: selectedDate.value,
            event: reason,
            employeeNames: employeeNames,
            startTime: startTime.substring(0, 5),
            endTime: endTime.substring(0, 5),
          });
        }
      }
    }

    batchAssignDialogVisible.value = false;
    batchStartTime.value = '';
    batchEndTime.value = '';
    batchReason.value = '';
    ElMessage.success({ message: `已分配 ${selectedEmployeesForBatch.value.length} 名员工到 ${successCount} 个工位`, showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    ElMessage.error({ message: '分配失败', showClose: true, duration: 3000 });
    fetchWorkstationsWithArrangements();
  }
};

// 移除员工的工位分配
const unassignEmployee = async (employeeId: number, workstationId: number) => {
  const ws = workstations.value.find(w => w.workstationId === workstationId);
  if (!ws) return;

  // 保存当前员工数据用于回滚
  const removedEmployee = ws.employees.find(e => e.employeeId === employeeId);
  const isSpecialHours = ws.workstationName && ws.workstationName.trim().includes('特殊工时');

  try {
    // 先从本地移除（乐观更新）
    ws.employees = ws.employees.filter(e => e.employeeId !== employeeId);

    await request.delete('/workstations/arrangements', {
      data: {
        workstationId: workstationId,
        arrangementDate: selectedDate.value,
        employeeId: employeeId,
      }
    });

    // 如果是特殊工时工位，同步删除特殊工时记录
    if (isSpecialHours && removedEmployee && removedEmployee.reason) {
      try {
        await deleteSpecialWorkingHoursByCondition(
          removedEmployee.employeeName,
          selectedDate.value,
          removedEmployee.reason
        );
      } catch (deleteError) {
        console.error('删除特殊工时记录失败:', deleteError);
        // 不影响主流程，只记录错误
      }
    }

    ElMessage.success({ message: '已取消分配', showClose: true, duration: 3000 });
    eventBus.emit('special-working-hours-changed');
    eventBus.emit('workstation-arrangement-changed');
  } catch (error) {
    // 失败时回滚本地数据
    if (removedEmployee) {
      ws.employees.push(removedEmployee);
    }
    ElMessage.error({ message: '取消分配失败', showClose: true, duration: 3000 });
  }
};

// 重置
const resetSelection = () => {
  tableSelectedEmployees.value = [];
  employeeTableRef.value?.clearSelection();
  fetchWorkstationsWithArrangements();
};

// 打开导入弹窗
const openImportDialog = () => {
  clearImportData();
  importDialogVisible.value = true;
};

// 清空导入数据
const clearImportData = () => {
  importFile.value = null;
  importPreviewData.value = [];
  importErrorCount.value = 0;
  importErrorStats.value = { date: 0, workstation: 0, name: 0 };
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 下载导入模板
const downloadTemplate = () => {
  const template = '日期,姓名,SAP工号,工位\n2024-01-15,张三,EMP001,工位A\n2024-01-15,李四,EMP002,工位B&工位C';
  const blob = new Blob(['﻿' + template], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '工位分配导入模板.csv';
  link.click();
  URL.revokeObjectURL(url);
};

// 处理文件选择
const handleFileChange = async (file: any) => {
  importFile.value = file.raw;
  await parseImportFile(file.raw);
};

// 解析导入文件
const parseImportFile = async (file: File) => {
  try {
    // 动态导入 xlsx 库
    const XLSX = await import('xlsx');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          ElMessage.warning({ message: '文件中没有工作表', showClose: true });
          return;
        }
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          ElMessage.warning({ message: '文件中没有工作表', showClose: true });
          return;
        }
        const worksheet = workbook.Sheets[sheetName]!;
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          ElMessage.warning({ message: '文件内容为空或格式不正确', showClose: true });
          return;
        }

        // 解析数据
        const previewData: ImportRow[] = [];
        let errorCount = 0;

        // 先加载所有工位用于验证
        let allWorkstations: Array<{ workstationName: string }> = [];
        try {
          const wsRes = await request.get('/workstations', {
            params: { page: 1, pageSize: 9999 }
          });
          let wsData = wsRes;
          if (wsRes && typeof wsRes === 'object' && 'data' in wsRes) {
            wsData = (wsRes as any).data;
          }
          const wsList = Array.isArray(wsData?.list) ? wsData.list :
                         Array.isArray(wsData) ? wsData : [];
          allWorkstations = wsList.map((ws: any) => ({ workstationName: ws.name }));
        } catch (err) {
          console.error('获取工位列表失败:', err);
        }

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 4 || !row[1]) continue;

          // 处理日期（Excel可能返回Date对象、序列号或字符串）
          let dateStr = '';
          const rawDate = row[0];
          if (rawDate instanceof Date) {
            // 如果是Date对象，转换为YYYY-MM-DD格式
            dateStr = rawDate.toISOString().substring(0, 10);
          } else if (typeof rawDate === 'number') {
            // Excel日期序列号转换为日期
            // Excel从1900-01-01开始，序列号1对应1900-01-01
            // 但Excel有一个bug，认为1900年是闰年，所以需要减1
            const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
            const date = new Date(excelEpoch.getTime() + rawDate * 86400000);
            dateStr = date.toISOString().substring(0, 10);
          } else {
            dateStr = String(rawDate || '').trim();
          }

          const name = String(row[1] || '').trim();
          const rawSapId = String(row[2] || '').trim();
          const workstationsStr = String(row[3] || '').trim();

          // 验证日期格式
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(dateStr)) {
            errorCount++;
            importErrorStats.value.date++;
            previewData.push({
              date: dateStr,
              name,
              rawSapId,
              autoSapId: '',
              sapId: rawSapId,
              workstations: workstationsStr,
              status: 'error',
              errorMsg: `日期格式不正确: "${dateStr}"，应为 YYYY-MM-DD`,
              errorType: 'date'
            });
            continue;
          }

          // 验证姓名为空
          if (!name) {
            errorCount++;
            importErrorStats.value.name++;
            previewData.push({
              date: dateStr,
              name: '',
              rawSapId,
              autoSapId: '',
              sapId: rawSapId,
              workstations: workstationsStr,
              status: 'error',
              errorMsg: '姓名为空',
              errorType: 'name'
            });
            continue;
          }

          // 验证工位是否存在（使用所有工位列表）
          const workstationNames = workstationsStr.split('&').map((w: string) => w.trim()).filter(Boolean);
          let isValid = true;
          let errorMsg = '';

          for (const wsName of workstationNames) {
            // 使用 trim 后比较，避免空格差异导致匹配失败
            const trimmedWsName = wsName.trim();
            const exists = allWorkstations.some(ws => ws.workstationName.trim() === trimmedWsName);
            if (!exists) {
              isValid = false;
              errorMsg = `工位"${wsName}"不存在`;
              break;
            }
          }

          if (!isValid) {
            errorCount++;
            importErrorStats.value.workstation++;
          }

          previewData.push({
            date: dateStr,
            name,
            rawSapId,
            autoSapId: '',  // 将通过后续函数自动带出
            sapId: rawSapId, // 默认使用原始值
            workstations: workstationNames.join(' & '),
            status: isValid ? 'success' : 'error',
            errorMsg,
            errorType: isValid ? undefined : 'workstation'
          });
        }

        importPreviewData.value = previewData;
        importErrorCount.value = errorCount;

        if (previewData.length === 0) {
          ElMessage.warning({ message: '未解析到有效数据', showClose: true });
        }
      } catch (parseError) {
        console.error('解析文件失败:', parseError);
        ElMessage.error({ message: '解析文件失败，请检查文件格式', showClose: true });
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('读取文件失败:', error);
    ElMessage.error({ message: '读取文件失败', showClose: true });
  }
};

// 自动根据姓名带出SAP工号（在导入时使用，不在预览时调用以提高性能）
const autoFillSapIds = async (previewData: ImportRow[]) => {
  // 按日期分组
  const dates = [...new Set(previewData.map(row => row.date))];

  // 并行获取所有日期的员工数据
  const fetchPromises = dates.map(async (date) => {
    const rowsForDate = previewData.filter(row => row.date === date);

    if (rowsForDate.length === 0) return { date, nameToSapIds: {} };

    try {
      const res = await request.get('/schedule/by-date', {
        params: { scheduleDate: date }
      });

      let scheduleData = res;
      if (res && typeof res === 'object' && 'data' in res) {
        scheduleData = (res as any).data;
      }
      const scheduleList = Array.isArray(scheduleData?.list) ? scheduleData.list :
                           Array.isArray(scheduleData) ? scheduleData : [];

      // 建立姓名到SAP工号的映射
      const nameToSapIds: Record<string, string[]> = {};

      for (const s of scheduleList) {
        const name = s.real_name || `员工${s.employee_id}`;
        const sapId = s.sap_employee_id;
        if (name && sapId && sapId !== '-') {
          if (!nameToSapIds[name]) {
            nameToSapIds[name] = [];
          }
          if (!nameToSapIds[name].includes(sapId)) {
            nameToSapIds[name].push(sapId);
          }
        }
      }

      return { date, nameToSapIds };
    } catch (err) {
      console.error(`获取日期 ${date} 的员工数据失败:`, err);
      return { date, nameToSapIds: {} };
    }
  });

  // 并行执行所有请求
  const results = await Promise.all(fetchPromises);

  // 建立日期到员工数据的映射
  const dateToNameSapIds: Record<string, Record<string, string[]>> = {};
  for (const result of results) {
    dateToNameSapIds[result.date] = result.nameToSapIds;
  }

  // 只为SAP工号为空的行自动填充
  let filledCount = 0;
  for (const row of previewData) {
    // 只有当原始工号为空时才自动填充
    if (!row.rawSapId) {
      const nameToSapIds = dateToNameSapIds[row.date] || {};
      const sapIds = nameToSapIds[row.name];
      if (sapIds && sapIds.length > 0) {
        row.autoSapId = sapIds.join('&');
        row.sapId = row.autoSapId;
        filledCount++;
      }
    } else {
      row.sapId = row.rawSapId;
    }
  }

  // 强制更新视图
  importPreviewData.value = [...previewData];
};

// 确认导入
const confirmImport = async () => {
  if (importPreviewData.value.length === 0) return;

  const validData = importPreviewData.value.filter(row => row.status === 'success');
  if (validData.length === 0) {
    ElMessage.warning({ message: '没有有效数据可导入', showClose: true });
    return;
  }

  // 检查是否有需要自动填充SAP工号的行（原始工号为空）
  const needsFill = validData.some(row => !row.rawSapId);
  if (needsFill) {
    ElMessage.info({ message: '正在自动填充SAP工号...', showClose: true });
    await autoFillSapIds(validData);
  }

  // 按日期分组
  const dataByDate: Record<string, ImportRow[]> = {};
  for (const row of validData) {
    if (!dataByDate[row.date]) {
      dataByDate[row.date] = [];
    }
    dataByDate[row.date]!.push(row);
  }

  const dates = Object.keys(dataByDate);

  ElMessage.info({ message: `开始导入 ${dates.length} 个日期的数据...`, showClose: true, duration: 2000 });

  try {
    // 收集所有需要的姓名（改为按姓名匹配）
    const allNames = new Set<string>();
    for (const row of validData) {
      if (row.name) {
        allNames.add(row.name);
      }
    }

    // 批量查询用户（按姓名）
    const nameArray = Array.from(allNames);
    ElMessage.info({ message: `正在查询 ${nameArray.length} 个姓名对应的员工...`, showClose: true });

    // 分批查询，每批100个姓名
    const batchSize = 100;
    const nameToEmployee: Record<string, any> = {};

    for (let i = 0; i < nameArray.length; i += batchSize) {
      const batchNames = nameArray.slice(i, i + batchSize);

      try {
        const res = await request.get('/users/by-names', {
          params: { names: batchNames.join(',') }
        });

        // 拦截器返回 response.data，格式为 { code: 200, data: { list, map, total } }
        const apiData = (res as any).data;
        if (apiData?.map && typeof apiData.map === 'object') {
          Object.assign(nameToEmployee, apiData.map);
        }
      } catch (err) {
        console.error(`查询员工姓名失败:`, err);
      }
    }

    ElMessage.info({ message: '正在导入数据...', showClose: true });

    if (Object.keys(nameToEmployee).length === 0) {
      ElMessage.error({ message: '员工姓名查询失败，请检查网络', showClose: true });
      return;
    }

    // 加载所有工位（完整列表，不只是当天有安排的工位）
    let allWorkstationsList: Array<{ workstationId: number; workstationName: string }> = [];
    try {
      const wsRes = await request.get('/workstations', {
        params: { page: 1, pageSize: 9999 }
      });
      let wsData = wsRes;
      if (wsRes && typeof wsRes === 'object' && 'data' in wsRes) {
        wsData = (wsRes as any).data;
      }
      const wsList = Array.isArray(wsData?.list) ? wsData.list :
                     Array.isArray(wsData) ? wsData : [];
      allWorkstationsList = wsList.map((ws: any) => ({
        workstationId: ws.id,
        workstationName: ws.name
      }));
    } catch (err) {
      console.error('获取工位列表失败:', err);
    }

    if (allWorkstationsList.length === 0) {
      ElMessage.error({ message: '工位列表获取失败', showClose: true });
      return;
    }

    // 按工位和日期分组，准备批量导入
    const batchData: Array<{
      workstationId: number;
      arrangementDate: string;
      shiftName: string;
      employeeIds: number[];
      sapEmployeeIds: (string | undefined)[];
    }> = [];

    for (const date of dates) {
      const dateRows = dataByDate[date] || [];

      // 按工位分组员工（使用员工ID作为key，同时存储SAP工号）
      const wsEmployeeMap: Record<string, { employeeIds: number[]; sapEmployeeIds: (string | undefined)[] }> = {};

      for (const row of dateRows) {
        const workstationNames = row.workstations.split(' & ');
        // 按姓名查找员工
        const employee = nameToEmployee[row.name];
        if (!employee || !employee.employeeId) {
          // 员工不存在，跳过
          continue;
        }
        const employeeId = employee.employeeId;
        // 获取该行的 SAP 工号
        const sapId = row.sapId;

        for (const wsName of workstationNames) {
          // 使用完整工位列表匹配，并 trim 空格
          const trimmedWsName = wsName.trim();
          const ws = allWorkstationsList.find(w => w.workstationName.trim() === trimmedWsName);
          if (!ws) {
            // 工位不存在，跳过
            continue;
          }

          // 按工位+日期+班次分组
          const key = `${ws.workstationId}|${date}|default`;
          if (!wsEmployeeMap[key]) {
            wsEmployeeMap[key] = { employeeIds: [], sapEmployeeIds: [] };
          }
          // 查找是否已有该员工
          const existingIndex = wsEmployeeMap[key].employeeIds.indexOf(employeeId);
          if (existingIndex === -1) {
            wsEmployeeMap[key].employeeIds.push(employeeId);
            wsEmployeeMap[key].sapEmployeeIds.push(sapId || undefined);
          }
        }
      }

      // 转换为批量数据
      for (const [key, value] of Object.entries(wsEmployeeMap)) {
        const parts = key.split('|');
        batchData.push({
          workstationId: parseInt(parts[0] || '0'),
          arrangementDate: parts[1] || '',
          shiftName: parts[2] || 'default',
          employeeIds: value.employeeIds,
          sapEmployeeIds: value.sapEmployeeIds,
        });
      }
    }

    // 批量提交（每批5个，大量延迟避免429）
    const submitBatchSize = 5;
    const totalBatches = Math.ceil(batchData.length / submitBatchSize);
    let successCount = 0;
    let failCount = 0;
    const failedWorkstationIds: number[] = [];

    ElMessage.info({ message: `共 ${batchData.length} 个工位待导入...`, showClose: true, duration: 2000 });

    for (let i = 0; i < batchData.length; i += submitBatchSize) {
      const batch = batchData.slice(i, i + submitBatchSize);
      const batchNum = Math.floor(i / submitBatchSize) + 1;
      ElMessage.info({ message: `正在导入第 ${batchNum}/${totalBatches} 批 (${i + 1}-${Math.min(i + submitBatchSize, batchData.length)})...`, showClose: true, duration: 1000 });

      // 串行提交这一批（每批内串行，避免429）
      for (const item of batch) {
        let retries = 0;
        const maxRetries = 3;
        let success = false;

        while (retries < maxRetries && !success) {
          try {
            await request.post('/workstations/arrangements', {
              workstationId: item.workstationId,
              arrangementDate: item.arrangementDate,
              shiftName: item.shiftName,
              employeeIds: item.employeeIds,
              sapEmployeeIds: item.sapEmployeeIds,
              append: true,  // 追加模式，保留已有员工
            });
            success = true;
            successCount++;
          } catch (err: any) {
            if (err?.response?.status === 429 && retries < maxRetries - 1) {
              // 429限流，等待更长时间后重试
              retries++;
              console.warn(`429限流，重试第 ${retries} 次...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            } else {
              // 其他错误或重试次数用完
              failCount++;
              failedWorkstationIds.push(item.workstationId);
              success = false;
              break;
            }
          }
        }
      }

      // 批次间延迟，避免触发限流（大幅增加延迟）
      if (i + submitBatchSize < batchData.length) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    importDialogVisible.value = false;
    clearImportData();

    // 计算导入的员工总数
    const importedEmployees = batchData
      .slice(0, successCount)
      .reduce((sum, item) => sum + item.employeeIds.length, 0);

    if (successCount > 0) {
      ElMessage.success({ message: `成功导入 ${successCount} 个工位的 ${importedEmployees} 名员工`, showClose: true, duration: 3000 });
      eventBus.emit('workstation-arrangement-changed');
    }
    if (failCount > 0) {
      // 获取失败工位的名称（去重）- 使用完整工位列表
      const failedWorkstationMap = new Map<string, number>();
      for (const id of failedWorkstationIds) {
        const name = allWorkstationsList.find(w => w.workstationId === id)?.workstationName || `ID:${id}`;
        failedWorkstationMap.set(name, (failedWorkstationMap.get(name) || 0) + 1);
      }

      // 用 ElMessageBox 显示详细失败列表
      const { ElMessageBox } = await import('element-plus');
      const failList = Array.from(failedWorkstationMap.entries())
        .map(([name, count]) => `${name}${count > 1 ? ` (${count}次)` : ''}`)
        .join('\n');

      ElMessageBox.alert(
        `失败工位 (共 ${failCount} 个):\n\n${failList}`,
        '导入结果',
        {
          confirmButtonText: '确定',
          dangerouslyUseHTMLString: false,
        }
      );
    }
  } catch (error) {
    console.error('导入失败:', error);
    ElMessage.error({ message: '导入失败', showClose: true });
  }
};

// 表格选择变化
const handleSelectionChange = (rows: ScheduledEmployee[]) => {
  tableSelectedEmployees.value = rows;
};

// 筛选变化
const onFilterChange = () => {
  currentPage.value = 1; // 重置页码
  fetchWorkstationsWithArrangements();
};

// 部门变化时重新获取职位列表
const onDepartmentChange = () => {
  filterPosition.value = []; // 清空职位筛选
  fetchPositions();
  onFilterChange();
};

// 日期变化
const onDateChange = async () => {
  sessionStorage.setItem('stationArrangementDate', selectedDate.value);
  currentPage.value = 1; // 重置页码
  // 清空缓存数据，确保切换日期时显示正确的数据
  editableSapIds.value = {};
  await fetchScheduledEmployees();
  await fetchWorkstationsWithArrangements();
  // 根据规则自动分配工位
  await autoAssignByRules();
  // 特殊职位自动分配（备用逻辑）
  await autoAssignByPosition();
};

onMounted(async () => {
  await Promise.all([
    fetchPlants(),
    fetchDepartments(),
    fetchPositions(),
    fetchScheduledEmployees(),
    fetchWorkstationsWithArrangements(),
    fetchShiftOptions(),
  ]);

  // 根据规则自动分配工位
  await autoAssignByRules();

  // 特殊职位自动分配（备用逻辑）
  await autoAssignByPosition();

  // 获取当前用户信息，设置默认厂区和部门筛选
  try {
    const res = await request.get('/users/me');
    const userData = (res as any)?.data ?? res;
    if (userData?.plantId) {
      filterPlantId.value = userData.plantId;
      // 触发部门筛选更新
      await fetchDepartmentsByPlant(userData.plantId);
      // 根据厂区过滤部门
      filteredDepartments.value = departments.value.filter(d => !d.plantId || d.plantId === userData.plantId);
    }
    if (userData?.departmentId) {
      filterDepartmentId.value = userData.departmentId;
    }
  } catch (error) {
    console.error('获取当前用户信息失败:', error);
  }

  // 监听特殊工时变化，刷新数据
  eventBus.on('special-working-hours-changed', () => {
    fetchWorkstationsWithArrangements();
  });
});

// 根据厂区获取部门列表
const fetchDepartmentsByPlant = async (plantId: number) => {
  try {
    const res = await request.get('/departments', {
      params: { plantId }
    });
    const data = (res as any)?.data ?? res;
    const deptList = data?.departments || [];
    // 合并到现有部门列表
    const existingIds = new Set(departments.value.map(d => d.id));
    for (const dept of deptList) {
      if (!existingIds.has(dept.id)) {
        departments.value.push(dept);
      }
    }
  } catch (error) {
    console.error('获取部门列表失败:', error);
  }
};
</script>

<style scoped>
.station-arrangement-container {
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

.table-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #F3F4F6;
}

.table-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #3B82F6;
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: #2563EB;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.card-body {
  padding: 24px;
}

.selection-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background-color: #F9FAFB;
  border-radius: 12px;
}

.selection-bar .form-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.selection-bar .form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.selection-bar .date-nav-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  position: relative;
}

.selection-bar .date-display {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  min-width: 100px;
  text-align: center;
  cursor: pointer;
}

.selection-bar .date-nav-container .el-button {
  font-size: 12px;
  color: #606266;
  border-color: #dcdfe6;
}

.selection-bar .date-nav-container .el-button:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background-color: #ecf5ff;
}

.selection-bar .form-group :deep(.el-select) {
  width: 180px;
}

.employee-list-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-info {
  font-size: 12px;
  font-weight: 400;
  color: #6B7280;
}

.employee-table {
  border-radius: 8px;
  overflow: hidden;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding: 8px 0;
}

.table-pagination :deep(.el-pagination) {
  font-weight: 400;
}

.assigned-workstations {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.ws-tag {
  margin: 2px;
}

.sap-id-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f0f9ff;
  color: #0284c7;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid #e0f2fe;
}

.sap-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  cursor: pointer;
  min-height: 24px;
  align-items: center;
}

.sap-cell:hover {
  background-color: #f9fafb;
  border-radius: 4px;
}

.sap-cell .sap-input-inline {
  width: 120px;
}

.sap-cell .sap-input-inline :deep(.el-input__wrapper) {
  padding: 2px 8px;
}

.no-assign {
  color: #9CA3AF;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
  font-size: 15px;
}

/* 分配弹窗样式 */
.assign-dialog-content {
  padding: 10px 0;
  max-height: 500px;
  overflow-y: auto;
}

.assign-employee-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 14px;
}

.assign-employee-info .label {
  color: #6B7280;
}

.assign-employee-info .value {
  color: #111827;
  font-weight: 500;
}

.employee-select-section {
  margin-bottom: 20px;
}

.employee-select-section .section-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.employee-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background-color: #F9FAFB;
  border-radius: 8px;
}

.employee-checkbox {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
  font-size: 13px;
}

.employee-checkbox:hover {
  background-color: #F3F4F6;
}

.emp-sap {
  margin-left: 6px;
  color: #6B7280;
  font-size: 12px;
}

.emp-shift {
  margin-left: 6px;
  color: #3B82F6;
  font-size: 12px;
}

.emp-assigned {
  margin-left: 6px;
  color: #10B981;
  font-size: 12px;
}

.workstation-select-section {
  margin-top: 20px;
}

.workstation-select-section .section-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.start-time-section {
  margin-top: 16px;
  padding: 12px;
  background-color: #FEF3C7;
  border-radius: 6px;
  border: 1px solid #FCD34D;
}

/* 工位网格布局 */
.workstation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.workstation-checkbox-compact {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
  margin-bottom: 0;
  transition: all 0.2s;
}

.workstation-checkbox-compact:hover {
  background-color: #F3F4F6;
  border-color: #3B82F6;
}

/* 前台/特殊工时工位样式 */
.time-required-ws {
  margin-top: 12px;
  padding: 10px 12px;
  background-color: #FEF3C7;
  border-radius: 8px;
  border: 1px solid #FCD34D;
}

.time-required-ws .el-checkbox {
  margin-bottom: 8px;
}

.time-picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-left: 24px;
}

.time-picker-row .time-label {
  font-size: 12px;
  color: #92400E;
  white-space: nowrap;
}

.ws-count {
  font-size: 11px;
  color: #9CA3AF;
}

/* 旧样式保留兼容性 */
.workstation-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.workstation-item {
  display: flex;
  flex-direction: column;
}

.front-desk-time-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 24px;
  margin-top: 2px;
  margin-bottom: 2px;
  padding: 4px 8px;
  background-color: #FEF3C7;
  border-radius: 4px;
  border: 1px solid #FCD34D;
  flex-wrap: wrap;
}

.front-desk-time-picker .time-label {
  font-size: 12px;
  color: #92400E;
  white-space: nowrap;
  margin-right: 2px;
}

.front-desk-time-picker .reason-input {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.front-desk-time-picker .reason-input .time-label {
  margin-top: 0;
}

.hazard-time-slots {
  margin-top: 8px;
  padding: 8px;
  background-color: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 4px;
}

.hazard-slot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.hazard-slot-item .time-label {
  color: #EA580C;
}

/* 特殊工时时间段新样式 */
.special-hours-section {
  margin-top: 8px;
}

.special-hours-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.special-hours-title {
  font-weight: bold;
  color: #92400E;
  font-size: 14px;
}

.special-hours-actions {
  display: flex;
  gap: 8px;
}

.time-slots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-slot-card {
  background-color: #FFFBEB;
  border: 1px solid #FCD34D;
  border-radius: 6px;
  padding: 10px 12px;
}

.time-slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-slot-label {
  font-size: 12px;
  color: #92400E;
  white-space: nowrap;
  min-width: 28px;
}

.time-slot-sep {
  color: #92400E;
  font-weight: bold;
}

.simple-time-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #FFFBEB;
  border: 1px solid #FCD34D;
  border-radius: 6px;
}

.simple-time-row .time-label {
  color: #92400E;
}

.workstation-checkbox {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  margin-right: 0;
}

.workstation-checkbox:hover {
  background-color: #F9FAFB;
}

.ws-count {
  margin-left: 4px;
  color: #9CA3AF;
  font-size: 11px;
}

.section-title {
  display: flex;
  align-items: center;
}

/* 导入弹窗样式 */
.import-dialog-content {
  padding: 10px 0;
}

.import-instructions {
  background-color: #F0F9FF;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.import-instructions p {
  margin: 0 0 8px 0;
  color: #0369A1;
  font-size: 14px;
}

.import-instructions ul {
  margin: 0;
  padding-left: 20px;
  color: #0C4A6E;
  font-size: 13px;
}

.import-instructions li {
  margin-bottom: 4px;
}

.template-hint {
  margin-top: 12px !important;
  margin-bottom: 0 !important;
}

.import-upload {
  margin-bottom: 20px;
}

.upload-component {
  width: 100%;
}

.import-preview {
  margin-top: 16px;
}

.preview-title {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 10px;
}

.error-summary {
  margin-top: 10px;
  padding: 10px;
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  color: #DC2626;
  font-size: 13px;
}

.error-text {
  color: #DC2626;
  font-size: 12px;
}

.error-details {
  margin-top: 10px;
  padding: 10px;
  background-color: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.error-details-title {
  font-weight: bold;
  color: #DC2626;
  margin-bottom: 8px;
}

.error-row {
  font-size: 12px;
  color: #991B1B;
  padding: 4px 0;
  border-bottom: 1px dashed #FECACA;
}

.error-row:last-child {
  border-bottom: none;
}

.sap-id-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sap-id-value {
  font-size: 12px;
  line-height: 1.4;
}

.sap-id-cell :deep(.el-input__inner) {
  font-size: 12px;
}

.auto-hint {
  font-size: 11px;
  color: #6B7280;
  line-height: 1.2;
}

/* 自动分配规则弹窗样式 */
.auto-assign-rules-content {
  padding: 10px 0;
}

.rules-header {
  margin-bottom: 16px;
}

.rules-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #F0F9FF;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  color: #0369A1;
  font-size: 13px;
}

.rules-tip .el-icon {
  flex-shrink: 0;
}

.rules-actions {
  display: flex;
  justify-content: flex-end;
}

.rules-empty {
  text-align: center;
  padding: 40px 20px;
  color: #9CA3AF;
  font-size: 14px;
}

.rule-sap-id {
  font-size: 11px;
  color: #6B7280;
  margin-left: 4px;
}

/* 添加规则弹窗样式 */
.add-rule-form {
  padding: 10px 0;
}

.priority-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #9CA3AF;
}

.option-sap-id {
  margin-left: 8px;
  color: #6B7280;
  font-size: 12px;
}

.option-position {
  margin-left: 8px;
  color: #3B82F6;
  font-size: 12px;
}

.remark-cell {
  min-height: 24px;
  cursor: pointer;
}

.remark-text {
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.remark-text:hover {
  background-color: #f3f4f6;
}

.remark-placeholder {
  color: #9CA3AF;
  font-style: italic;
}
</style>
