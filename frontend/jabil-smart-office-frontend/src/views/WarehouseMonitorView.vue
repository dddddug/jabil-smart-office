<template>
  <div class="warehouse-monitor">
    <div class="header">
      <h2>📦 物料进出效期监控</h2>
      <div class="header-actions">
        <el-select v-model="filterPlant" placeholder="选择工厂" clearable size="default" style="width: 150px">
          <el-option label="CN02" value="CN02" />
        </el-select>
        <el-select v-model="filterWarehouse" placeholder="选择仓库" clearable size="default" style="width: 150px">
          <el-option label="T01" value="T01" />
        </el-select>
        <el-button @click="prevDay" size="default">前一天</el-button>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          size="default"
          style="width: 150px"
        />
        <el-button @click="nextDay" size="default">后一天</el-button>
        <el-button type="warning" @click="showClass33Dialog = true">
          <el-icon><List /></el-icon> 33类物料清单
        </el-button>
        <el-button type="primary" @click="loadData" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-cards">
      <el-card class="summary-card" shadow="hover" @click="filterByTrans('PLR')" style="cursor: pointer;">
        <div class="card-content">
          <div class="card-icon plr"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">发料</div>
            <div class="card-value">{{ summary.PLR?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card" shadow="hover" @click="filterByTrans('FLR')" style="cursor: pointer;">
        <div class="card-content">
          <div class="card-icon flr"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">回仓</div>
            <div class="card-value">{{ summary.FLR?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card" shadow="hover" @click="filterByTrans('IWS')" style="cursor: pointer;">
        <div class="card-content">
          <div class="card-icon iws"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">收料</div>
            <div class="card-value">{{ summary.IWS?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card alert-card" :class="{ 'has-alert': expiryStats.expired + expiryStats.expiring_soon > 0 }" shadow="hover" @click="onExpiryCardClick" style="cursor: pointer;">
        <div class="card-content">
          <div class="card-icon expired"><el-icon><Warning /></el-icon></div>
          <div class="card-info">
            <div class="card-label">过期预警</div>
            <div class="card-value danger">{{ expiryStats.expired + expiryStats.expiring_soon }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 按小时统计图 -->
    <el-card class="chart-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📊 今日进出库统计（按小时）</span>
        </div>
      </template>
      <div class="chart-container">
        <div class="chart-legend">
          <span class="legend-item"><span class="dot plr"></span> 发料</span>
          <span class="legend-item"><span class="dot flr"></span> 回仓</span>
          <span class="legend-item"><span class="dot iws"></span> 收料</span>
        </div>
        <div class="hourly-chart" style="position: relative;">
          <div v-for="slot in timeSlots" :key="slot.time" class="hour-bar" @mouseenter="setHovered(slot, $event)" @mouseleave="hoveredSlot = null" @click="clickTimeSlot(slot)">
            <div class="bar-container">
              <div class="bar-stack">
                <div v-if="slot.PLR > 0" class="bar-item plr" :style="{ height: `${getBarHeight(slot.PLR)}%` }"></div>
                <div v-if="slot.FLR > 0" class="bar-item flr" :style="{ height: `${getBarHeight(slot.FLR)}%` }"></div>
                <div v-if="slot.IWS > 0" class="bar-item iws" :style="{ height: `${getBarHeight(slot.IWS)}%` }"></div>
              </div>
            </div>
            <div class="hour-label">{{ slot.time }}</div>
          </div>
          <!-- 悬浮提示框 -->
          <div v-if="hoveredSlot" class="chart-tooltip" :style="{ left: tooltipLeft + 'px' }">
            <div class="tooltip-title">{{ hoveredSlot.time }}</div>
            <div class="tooltip-row"><span class="dot plr"></span> 发料: {{ hoveredSlot.PLR || 0 }}</div>
            <div class="tooltip-row"><span class="dot flr"></span> 回仓: {{ hoveredSlot.FLR || 0 }}</div>
            <div class="tooltip-row"><span class="dot iws"></span> 收料: {{ hoveredSlot.IWS || 0 }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 今日明细表格 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📋 {{ showExpiredMode ? '过期预警明细' : '今日明细记录' }}</span>
          <div class="header-actions">
            <el-button v-if="showExpiredMode && selectedRows.length > 0" type="primary" size="small" @click="showPassDialog">
              Pass ({{ selectedRows.length }})
            </el-button>
            <el-select v-if="showExpiredMode" v-model="filterTrans" placeholder="Trans" clearable size="small" style="width: 90px" >
              <el-option v-for="t in transOptions" :key="t" :label="t" :value="t" />
            </el-select>
            <el-select v-if="showExpiredMode" v-model="filterType" placeholder="Type" clearable size="small" style="width: 90px" >
              <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
            </el-select>
            <el-select v-if="showExpiredMode" v-model="filterReference" placeholder="Reference" clearable size="small" style="width: 130px" >
              <el-option v-for="ref in referenceOptions" :key="ref" :label="ref" :value="ref" />
            </el-select>
            <el-select v-if="showExpiredMode" v-model="filterUser" placeholder="User" clearable size="small" style="width: 100px" >
              <el-option v-for="user in userOptions" :key="user" :label="user" :value="user" />
            </el-select>
            <el-select v-if="!showExpiredMode" v-model="filterTrans" placeholder="移动类型" clearable size="small" style="width: 120px">
              <el-option label="PLR" value="PLR" />
              <el-option label="FLR" value="FLR" />
              <el-option label="IWS" value="IWS" />
            </el-select>
            <el-button type="success" size="small" @click="exportData" :loading="exportLoading">
              导出
            </el-button>
            <el-button v-if="showExpiredMode" type="primary" size="small" @click="goToNormalMode">
              返回明细记录
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="sortedTableData" height="400" v-loading="loading" tableLayout="fixed" :cell-style="{ fontSize: '12px', padding: '2px 4px' }" :header-cell-style="{ fontSize: '12px', padding: '2px 4px' }" width="100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" v-if="showExpiredMode" />
        <el-table-column prop="warehouse" label="Whse No." width="70"  />
        <el-table-column prop="trans" label="Trans" width="70"  />
        <el-table-column prop="material" label="Material" width="180">
		        <template #default="{ row }">
		          <span :style="row.is_class33 ? 'color: #ff0000; font-weight: bold;' : ''">{{ row.material }}</span>
		        </template>
		      </el-table-column>
        <el-table-column prop="quantity" label="Qty." width="80" align="right">
          <template #default="{ row }">{{ formatNumber(row.quantity) }}</template>
        </el-table-column>
        <el-table-column prop="gr_document" label="GRN No" width="155"  />
        <el-table-column prop="type" label="Type" width="70"  />
        <el-table-column prop="storage_bin" label="Storage Bin" width="120"  />
        <el-table-column prop="from_sloc" label="From SLoc" width="95"  />
        <el-table-column prop="to_sloc" label="To SLoc" width="85"  />
        <el-table-column prop="reference" label="Reference" width="150"  />
        <el-table-column prop="user_name" label="User" width="85"  />
        <el-table-column prop="date_code" label="DC" width="70"  />
        <el-table-column prop="shelf_life" label="SLife" width="70"  />
        <el-table-column prop="period_indicator" label="Per. ind." width="80"  />
        <el-table-column prop="total_sl" label="TotalSLife" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.expiry_source === 'dc_sl'" type="warning" size="small">{{ row.total_sl }}</el-tag>
            <span v-else>{{ row.total_sl }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="extension_date" label="延期日期" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.expiry_source === 'extension_date'" type="primary" size="small">{{ formatExtensionDate(row.extension_date) }}</el-tag>
            <span v-else>{{ formatExtensionDate(row.extension_date) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sled" label="SLED" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.expiry_source === 'sled'" type="success" size="small">{{ row.sled }}</el-tag>
            <span v-else>{{ row.sled }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expiry_days" label="Expiry Days" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.expiry_days < 0" type="danger" size="small">{{ row.expiry_days }}</el-tag><el-tag v-else-if="row.expiry_days <= 7" type="warning" size="small">{{ row.expiry_days }}</el-tag><el-tag v-else type="success" size="small">{{ row.expiry_days }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="process_result" label="处理状态" width="80" v-if="showExpiredMode">
          <template #default="{ row }">
            <el-tag v-if="row.is_processed" type="success" size="small" class="clickable" @click="showDetailDialog(row)">已处理</el-tag>
            <el-tag v-else type="info" size="small">未处理</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Pass处理弹窗 -->
    <el-dialog v-model="passDialogVisible" title="Pass处理" width="400px">
      <el-form>
        <el-form-item label="已选择记录">
          <span>{{ selectedRows.length }} 条</span>
        </el-form-item>
        <el-form-item label="处理结果" required>
          <el-input v-model="passResult" type="textarea" :rows="3" placeholder="请填写处理结果" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPass">确认</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="处理详情" width="400px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="处理结果">{{ detailRow.process_result || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ detailRow.processed_by || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ formatProcessedAt(detailRow.processed_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 33类物料清单弹窗 -->
    <el-dialog v-model="showClass33Dialog" title="33类物料清单" width="900px" :close-on-click-modal="false" @opened="loadClass33List">
      <div class="class33-header">
        <el-input v-model="class33Search" placeholder="搜索物料编号或事业部" style="width: 300px; margin-right: 10px;" clearable @input="loadClass33List" />
        <el-button type="primary" @click="showAddClass33Dialog = true">新增物料</el-button>
        <el-button type="danger" @click="batchDeleteClass33" :disabled="selectedClass33Rows.length === 0">批量删除</el-button>
      </div>
      <el-table ref="class33TableRef" :data="class33List" stripe border v-loading="class33Loading" @selection-change="handleClass33SelectionChange" style="margin-top: 10px; max-height: 500px; overflow-y: auto;">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="part_no" label="PartNo" min-width="120" />
        <el-table-column prop="division" label="Division" min-width="100" />
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">{{ row.created_at ? dayjs(row.created_at).format('YYYY-MM-DD HH:mm') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editClass33Item(row)">编辑</el-button>
			          <el-button type="danger" size="small" @click="deleteClass33Item(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="class33Pagination.page"
        v-model:page-size="class33Pagination.pageSize"
        :total="class33Pagination.total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 10px; justify-content: flex-end;"
        @current-change="loadClass33List"
        @size-change="loadClass33List"
      />

      <!-- 新增物料弹窗 -->
      <el-dialog v-model="showAddClass33Dialog" title="新增物料" width="500px" append-to-body>
        <el-form :model="newClass33Form" label-width="100px">
          <el-form-item label="PartNo" required>
            <el-input v-model="newClass33Form.part_no" placeholder="请输入物料编号" />
          </el-form-item>
          <el-form-item label="Division">
            <el-input v-model="newClass33Form.division" placeholder="请输入事业部" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showAddClass33Dialog = false">取消</el-button>
          <el-button type="primary" @click="addClass33Item">确定</el-button>
        </template>
      </el-dialog>

      <!-- 编辑物料弹窗 -->
      <el-dialog v-model="showEditClass33Dialog" title="编辑物料" width="500px" append-to-body>
        <el-form :model="editClass33Form" label-width="100px">
          <el-form-item label="PartNo">
            {{ editClass33Form.part_no }}
          </el-form-item>
          <el-form-item label="Division">
            <el-input v-model="editClass33Form.division" placeholder="请输入事业部" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showEditClass33Dialog = false">取消</el-button>
          <el-button type="primary" @click="saveEditClass33Item">保存</el-button>
        </template>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Box, Warning, List } from '@element-plus/icons-vue'
import request from '../utils/request'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

// 状态
const loading = ref(false)
// 检查是否是从缓存恢复的会话（刷新页面），还是新打开页签
const isSessionRestored = localStorage.getItem('warehouse_monitor_date') && sessionStorage.getItem('warehouse_monitor_session')
// 新打开页签显示当天，刷新后保持之前的选择
const savedDate = isSessionRestored ? localStorage.getItem('warehouse_monitor_date') : null
const selectedDate = ref(savedDate || dayjs().format('YYYY-MM-DD'))
// 恢复过期模式状态（清除，恢复到普通模式）
const showExpiredMode = ref(false)
const filterPlant = ref('CN02')
const filterWarehouse = ref('')
const filterTrans = ref('')
const filterType = ref('')
const filterReference = ref('')
const filterUser = ref('')
const userOptions = ref([])
const referenceOptions = ref([])
const transOptions = ref([])
const typeOptions = ref([])
const selectedRows = ref([])
const passDialogVisible = ref(false)
const passResult = ref('')
const detailDialogVisible = ref(false)
const detailRow = ref({})
const exportLoading = ref(false)

// 33类物料清单
const showClass33Dialog = ref(false)
const class33List = ref([])
const class33Loading = ref(false)
const class33Search = ref('')
const class33Pagination = ref({ page: 1, pageSize: 20, total: 0 })
const class33Set = ref(new Set()) // 用于快速查找
const selectedClass33Rows = ref([])

// 请求取消控制器
let abortController = null
const class33TableRef = ref(null)
const showAddClass33Dialog = ref(false)
const newClass33Form = ref({ part_no: '', division: '' })
const showEditClass33Dialog = ref(false)
const editClass33Form = ref({ id: null, part_no: '', division: '' })

// 标记会话已开始，刷新时不再重置
sessionStorage.setItem('warehouse_monitor_session', '1')

// 监听日期和过期模式变化，保存到 localStorage
watch(selectedDate, (newDate) => {
  localStorage.setItem('warehouse_monitor_date', newDate)
})
watch(showExpiredMode, (newVal) => {
  localStorage.setItem('warehouse_monitor_showExpired', String(newVal))
})

// 前后一天
const prevDay = () => {
  selectedDate.value = dayjs(selectedDate.value).subtract(1, 'day').format('YYYY-MM-DD')
  loadData()
}
const nextDay = () => {
  selectedDate.value = dayjs(selectedDate.value).add(1, 'day').format('YYYY-MM-DD')
  loadData()
}

// 按Trans类型筛选
const filterByTrans = (trans) => {
  showExpiredMode.value = false
  filterTrans.value = trans
  pagination.page = 1
  loadTableData()
}

// 点击时间段跳转到明细
const clickTimeSlot = (slot) => {
  if (!slot) return
  showExpiredMode.value = false
  filterTrans.value = ''
  ElMessage.info(`已跳转到 ${slot.time} 时段的数据`)
  loadTableData()
}

// 数据
const summary = reactive({ PLR: {}, FLR: {}, IWS: {} })
const timeSlots = ref([])
const hoveredSlot = ref(null)
const tooltipLeft = ref(0)

const setHovered = (slot, event) => {
  hoveredSlot.value = slot
  const chartEl = event.target.closest('.hourly-chart')
  const barEl = event.target.closest('.hour-bar')
  if (chartEl && barEl) {
    const chartRect = chartEl.getBoundingClientRect()
    const barRect = barEl.getBoundingClientRect()
    tooltipLeft.value = barRect.left - chartRect.left + barRect.width / 2
  }
}
const tableData = ref([])
const expiredList = ref([])
const expiringList = ref([])
const expiryStats = reactive({ expired: 0, expiring_soon: 0, total: 0 })
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 分页版本追踪，用于强制刷新
const paginationVersion = ref(0)

// 计算最大卷数，用于图表高度
const maxRolls = computed(() => {
  let max = 0
  timeSlots.value.forEach(slot => {
    max = Math.max(max, slot.PLR || 0, slot.FLR || 0, slot.IWS || 0)
  })
  return max || 100
})

// 获取柱状图高度
const getBarHeight = (value) => {
  return Math.max(2, (value / maxRolls.value) * 100)
}

// 加载汇总数据
const loadSummary = async () => {
  // 取消之前的请求
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  try {
    const res = await request.get('/warehouse-monitor/summary', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value
      },
      signal: abortController.signal
    })
    if (res.success) {
      Object.assign(summary, res.data.trans)
      Object.assign(expiryStats, res.data.expiry)
    }
  } catch (error) {
    if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
      console.error('加载汇总失败:', error)
    }
  }
}

// 加载时间统计数据
const loadTimeStats = async () => {
  // 取消之前的请求
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()
  try {
    const res = await request.get('/warehouse-monitor/stats-by-time', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value
      },
      signal: abortController.signal
    })
    if (res.success) {
      timeSlots.value = res.data.timeSlots
    }
  } catch (error) {
    if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
      console.error('加载时间统计失败:', error)
    }
  }
}

// 加载表格数据
const loadTableData = async (forceMode) => {
  // 取消之前的请求
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  loading.value = true
  try {
    const mode = forceMode || (showExpiredMode.value ? 'expired' : 'normal')

    if (mode === 'expired') {
      await loadExpiryData()
      loading.value = false
      return
    }

    const res = await request.get('/warehouse-monitor/today-records', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value,
        warehouse: filterWarehouse.value,
        trans: filterTrans.value || undefined,
        type: filterType.value || undefined,
        reference: filterReference.value || undefined,
        user: filterUser.value || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize
      },
      signal: abortController.signal
    })

    if (res.code === 200 || res.success) {
      const dataList = res.data?.data || res.data || []
      tableData.value = dataList
      pagination.total = res.data?.total || res.total || dataList.length
    }
  } catch (error) {
    // 忽略取消的请求错误
    if (error?.code !== 'CANCELLED' && error?.name !== 'AbortError' && error?.name !== 'CanceledError') {
      console.error('加载表格数据失败:', error)
    }
  } finally {
    loading.value = false
  }
}

// 点击过期预警卡片
const onExpiryCardClick = async () => {
  // 保存当前的筛选条件
  savedFilters.value = {
    trans: filterTrans.value,
    type: filterType.value,
    reference: filterReference.value,
    user: filterUser.value
  }
  showExpiredMode.value = true
  pagination.page = 1
  filterTrans.value = ''
  filterType.value = ''
  filterReference.value = ''
  filterUser.value = ''
  selectedRows.value = []

  // 加载过期数据
  loadData()
  // 加载过期预警筛选选项
  loadFilterOptions()
}

// 加载过期模式的筛选选项
const loadFilterOptions = async () => {
  try {
    const res = await request.get('/warehouse-monitor/expired-filter-options', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value,
        warehouse: filterWarehouse.value
      }
    })
    if (res.code === 200 || res.success) {
      const options = res.data || {}
      transOptions.value = options.trans || []
      typeOptions.value = options.type || []
      referenceOptions.value = options.reference || []
      userOptions.value = options.user || []
    }
  } catch (error) {
    console.error('加载筛选选项失败:', error)
  }
}

const savedFilters = ref({
  trans: '',
  type: '',
  reference: '',
  user: ''
})

const goToNormalMode = () => {
  // 清除 localStorage 中的过期模式状态
  localStorage.removeItem('warehouse_monitor_showExpired')

  // 恢复之前保存的筛选条件（保存到 localStorage，页面刷新后恢复）
  localStorage.setItem('savedFilters', JSON.stringify(savedFilters.value))

  // 刷新页面，页面会以普通模式重新加载
  location.reload()
}

// 多选处理
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// Pass处理弹窗
const showPassDialog = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要处理的记录')
    return
  }
  passDialogVisible.value = true
  passResult.value = ''
}

// 查看详情弹窗
const showDetailDialog = (row) => {
  detailRow.value = { ...row }
  detailDialogVisible.value = true
}

// 格式化处理时间（转换为中国本地时间）
const formatProcessedAt = (datetime) => {
  if (!datetime) return '-'
  const d = new Date(datetime)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 导出数据
const exportData = async () => {
  exportLoading.value = true
  try {
    // 导出当前筛选条件下的全部数据（不分页）
    const params = {
      date: selectedDate.value,
      plant: filterPlant.value,
      pageSize: 50000 // 导出最多5万条
    }
    if (filterWarehouse.value) params.warehouse = filterWarehouse.value
    if (filterTrans.value) params.trans = filterTrans.value
    if (filterType.value) params.type = filterType.value
    if (filterReference.value) params.reference = filterReference.value
    if (filterUser.value) params.user = filterUser.value

    let res
    if (showExpiredMode.value) {
      // 过期预警明细导出
      res = await request.get('/warehouse-monitor/expiry-alerts', { params })
    } else {
      // 今日明细导出
      res = await request.get('/warehouse-monitor/today-records', { params })
    }

    if (!res.data || res.data.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }

    // 构建Excel数据
    const headers = showExpiredMode.value
      ? ['Whse No.', 'Trans', 'Material', 'Quantity', 'GRN No.', 'Type', 'Storage Bin', 'From SLoc', 'To SLoc', 'Reference', 'User', 'DC', 'SLife', 'Per. ind.', 'TotalSLife', '延期日期', 'SLED', 'Expiry Days', 'Expiry来源', '处理状态', '处理结果', '处理人', '处理时间']
      : ['Whse No.', 'Trans', 'Material', 'Qty.', 'GRN No.', 'Type', 'Storage Bin', 'From SLoc', 'To SLoc', 'Reference', 'User', 'DC', 'SLife', 'Per. ind.', 'TotalSLife', '延期日期', 'SLED', 'Expiry Days', 'Expiry来源']

    // Expiry来源映射
    const expirySourceMap = {
      'dc_sl': 'TotalSLife',
      'sled': 'SLED',
      'extension_date': '延期日期'
    }

    const rows = res.data.map(r => {
      const baseRow = [
        r.warehouse || '',
        r.trans_name || r.trans || '',
        r.material || '',
        r.quantity || '',
        r.gr_document || '',
        r.type || '',
        r.storage_bin || '',
        r.from_sloc || '',
        r.to_sloc || '',
        r.reference || '',
        r.user_name || '',
        r.date_code || '',
        r.shelf_life ?? '',
        r.period_indicator || '',
        r.total_sl || '',
        formatExtensionDate(r.extension_date) || '',
        r.sled || '',
        r.expiry_days ?? '',
        expirySourceMap[r.expiry_source] || ''
      ]

      if (showExpiredMode.value) {
        baseRow.push(
          r.is_processed ? '已处理' : '未处理',
          r.process_result || '',
          r.processed_by || '',
          r.processed_at ? formatProcessedAt(r.processed_at) : ''
        )
      }

      return baseRow
    })

    const excelData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    // 设置列宽
    ws['!cols'] = headers.map(() => ({ wch: 15 }))

    const fileName = `${showExpiredMode.value ? '过期预警明细' : '今日明细记录'}_${selectedDate.value}.xlsx`
    XLSX.writeFile(wb, fileName)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 确认Pass处理
const confirmPass = async () => {
  if (!passResult.value.trim()) {
    ElMessage.warning('请填写处理结果')
    return
  }
  try {
    const ids = selectedRows.value.map(r => r.id)
    const user = localStorage.getItem('user')
    let processedBy = ''
    try {
      const userObj = JSON.parse(user)
      processedBy = userObj.username || userObj.name || ''
    } catch {}
    const res = await request.post('/warehouse-monitor/pass-processed', {
      ids,
      result: passResult.value,
      processed_by: processedBy
    })
    if (res.success) {
      ElMessage.success(res.message || '处理成功')
      passDialogVisible.value = false
      selectedRows.value = []
      loadTableData()
    }
  } catch (error) {
    console.error('Pass处理失败:', error)
    ElMessage.error('Pass处理失败')
  }
}

// 排序后的数据（后端已排序，前端直接使用）
const sortedTableData = computed(() => {
  return tableData.value
})

// 加载过期预警数据
const loadExpiryData = async () => {
  // 取消之前的请求
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  loading.value = true
  try {
    const params = {
      date: selectedDate.value,
      plant: filterPlant.value,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterTrans.value) params.trans = filterTrans.value
    if (filterType.value) params.type = filterType.value
    if (filterReference.value) params.reference = filterReference.value
    if (filterUser.value) params.user = filterUser.value

    const res = await request.get('/warehouse-monitor/expiry-alerts', { params, signal: abortController.signal })
    if (res.code === 200) {
      const allData = res.data?.data || res.data || []
      // 分类：已过期和7天内过期
      expiredList.value = allData.filter(item => item.expiry_days < 0)
      expiringList.value = allData.filter(item => item.expiry_days >= 0 && item.expiry_days <= 7)
      // 合并到 tableData 用于显示
      tableData.value = allData
      pagination.total = res.data?.total || res.total || allData.length
    }
  } catch (error) {
    // 忽略取消的请求错误
    if (error?.code !== 'CANCELLED' && error?.name !== 'AbortError' && error?.name !== 'CanceledError') {
      console.error('加载过期预警失败:', error)
    }
  } finally {
    loading.value = false
  }
}

// 加载所有数据
const loadData = async () => {
  loading.value = true
  try {
    // 汇总和统计总是需要加载
    await Promise.all([
      loadSummary(),
      loadTimeStats(),
    ])
    // 过期预警数据只在过期模式下才加载
    if (showExpiredMode.value) {
      await loadExpiryData()
    } else {
      // 普通模式下加载今日明细
      await loadTableData()
    }
  } finally {
    loading.value = false
  }
}

// 工具函数
const formatNumber = (num) => {
  if (!num) return '0'
  // 去掉逗号后再转换
  const cleaned = String(num).replace(/,/g, '')
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return '0'
  return parsed.toLocaleString('zh-CN', { maximumFractionDigits: 3 })
}

// 延期日期格式化
const formatExtensionDate = (date) => {
  if (!date) return '-'
  // 支持 YYYY-MM-DD 和其他格式
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

// 监听筛选变化
const handleFilterChange = () => {
  pagination.page = 1
  loadTableData()
}

// 分页变化处理
const handlePageChange = () => {
  console.log('[DEBUG] handlePageChange called, page:', pagination.page, 'mode:', showExpiredMode.value)
  loadTableData()
}

watch([selectedDate, filterPlant, filterWarehouse, filterTrans, filterType, filterReference, filterUser], handleFilterChange)

onMounted(() => {
  loadData()
  loadClass33Set()
})

// ========== 33类物料清单 ==========
const loadClass33List = async () => {
  class33Loading.value = true
  try {
    const res = await request.get('/class33-materials', {
      params: {
        page: class33Pagination.value.page,
        pageSize: class33Pagination.value.pageSize,
        search: class33Search.value || undefined
      }
    })
    if (res.success) {
      class33List.value = res.data
      class33Pagination.value.total = res.total
    }
  } catch (error) {
    console.error('加载33类物料清单失败:', error)
  } finally {
    class33Loading.value = false
  }
}

// 加载33类物料Set用于快速查找
const loadClass33Set = async () => {
  try {
    const res = await request.get('/class33-materials/all-parts')
    if (res.success) {
      class33Set.value = new Set(res.data)
    }
  } catch (error) {
    console.error('加载33类物料Set失败:', error)
  }
}

// 新增物料
const addClass33Item = async () => {
  if (!newClass33Form.value.part_no) {
    ElMessage.warning('请输入物料编号')
    return
  }
  try {
    const res = await request.post('/class33-materials', {
      part_no: newClass33Form.value.part_no.trim(),
      division: newClass33Form.value.division || ''
    })
    if (res.success) {
      ElMessage.success('添加成功')
      showAddClass33Dialog.value = false
      newClass33Form.value = { part_no: '', division: '' }
      loadClass33List()
      loadClass33Set()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (error) {
    console.error('添加物料失败:', error)
    ElMessage.error(error.response?.data?.message || '添加失败')
  }
}

// 删除物料
const deleteClass33Item = async (row) => {
  try {
    const res = await request.delete(`/class33-materials/${row.id}`)
    if (res.success) {
      ElMessage.success('删除成功')
      loadClass33List()
      loadClass33Set()
    }
  } catch (error) {
    console.error('删除物料失败:', error)
    ElMessage.error('删除失败')
  }
}

// 批量删除物料
const batchDeleteClass33 = async () => {
  if (selectedClass33Rows.value.length === 0) {
    ElMessage.warning('请先选择要删除的物料')
    return
  }
  try {
    const ids = selectedClass33Rows.value.map(row => row.id)
    const res = await request.delete('/class33-materials', { data: { ids } })
    if (res.success) {
      ElMessage.success(res.message || '删除成功')
      selectedClass33Rows.value = []
      loadClass33List()
      loadClass33Set()
    }
  } catch (error) {
    console.error('批量删除物料失败:', error)
    ElMessage.error('批量删除失败')
  }
}

// 选中33类物料行
const handleClass33SelectionChange = (selection) => {
  selectedClass33Rows.value = selection
}

// 编辑物料
const editClass33Item = (row) => {
  editClass33Form.value = {
    id: row.id,
    part_no: row.part_no,
    division: row.division
  }
  showEditClass33Dialog.value = true
}

// 保存编辑
const saveEditClass33Item = async () => {
  if (!editClass33Form.value.id) {
    ElMessage.warning('数据错误')
    return
  }
  try {
    const res = await request.put(`/class33-materials/${editClass33Form.value.id}`, {
      division: editClass33Form.value.division
    })
    if (res.success) {
      ElMessage.success('保存成功')
      showEditClass33Dialog.value = false
      loadClass33List()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存物料失败:', error)
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.warehouse-monitor {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 汇总卡片 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.summary-card {
  cursor: pointer;
  transition: all 0.3s;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.card-icon.plr { background: linear-gradient(135deg, #f56c6c, #e64a4a); }
.card-icon.flr { background: linear-gradient(135deg, #67c23a, #5baf2d); }
.card-icon.iws { background: linear-gradient(135deg, #409eff, #2a7fc9); }
.card-icon.expired { background: linear-gradient(135deg, #e6a23c, #d68a2e); }

.card-info {
  flex: 1;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.card-value.danger {
  color: #f56c6c;
}

/* 过期预警卡片闪烁效果 */
.summary-card.has-alert {
  animation: pulse-alert 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(245, 108, 108, 0.5);
}

.summary-card.has-alert:hover {
  animation: none;
}

@keyframes pulse-alert {
  0%, 100% {
    box-shadow: 0 0 5px rgba(245, 108, 108, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(245, 108, 108, 0.7);
  }
}

.card-value .unit {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

/* 图表卡片 */
.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  padding: 15px 0;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.dot.plr { background: #f56c6c; }
.dot.flr { background: #67c23a; }
.dot.iws { background: #409eff; }

.hourly-chart {
  display: flex;
  gap: 2px;
  height: 200px;
  padding: 0 10px;
}

.hour-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
}

.bar-stack {
  width: 80%;
  display: flex;
  flex-direction: column-reverse;
  gap: 1px;
}

.bar-item {
  width: 100%;
  transition: height 0.3s;
  cursor: pointer;
}

.bar-item.plr { background: #f56c6c; }
.bar-item.flr { background: #67c23a; }
.bar-item.iws { background: #409eff; }

.hour-label {
  font-size: 10px;
  color: #909399;
  margin-top: 5px;
  transform: scale(0.9);
}

/* 悬浮提示框 */
.chart-tooltip {
  position: absolute;
  top: -10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translateX(-50%);
}

.chart-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 4px;
  text-align: center;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tooltip-row .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

/* 表格卡片 */
.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

/* 过期样式 */
.text-danger {
  color: #f56c6c;
  font-weight: bold;
}

.text-warning {
  color: #e6a23c;
  font-weight: bold;
}

.text-info {
  color: #909399;
}

/* 过期预警弹窗 */
.expiry-tabs {
  margin-top: 10px;
}

.expiry-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    flex-wrap: wrap;
  }
}
</style>
