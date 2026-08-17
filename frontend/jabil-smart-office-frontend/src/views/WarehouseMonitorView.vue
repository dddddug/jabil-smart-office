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
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          size="default"
          style="width: 150px"
        />
        <el-button type="primary" @click="loadData" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-cards">
      <el-card class="summary-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon plr"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">发料</div>
            <div class="card-value">{{ summary.PLR?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon flr"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">回仓</div>
            <div class="card-value">{{ summary.FLR?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card" shadow="hover">
        <div class="card-content">
          <div class="card-icon iws"><el-icon><Box /></el-icon></div>
          <div class="card-info">
            <div class="card-label">收料</div>
            <div class="card-value">{{ summary.IWS?.count || 0 }} <span class="unit">卷</span></div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card alert-card" shadow="hover" @click="showExpiryDialog = true">
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
        <div class="hourly-chart">
          <div v-for="slot in timeSlots" :key="slot.time" class="hour-bar">
            <div class="bar-container">
              <div v-if="slot.PLR > 0" class="bar-segment plr" :style="{ height: `${getBarHeight(slot.PLR)}px` }" :title="`发料: ${slot.PLR}卷`"></div>
              <div v-if="slot.FLR > 0" class="bar-segment flr" :style="{ height: `${getBarHeight(slot.FLR)}px` }" :title="`回仓: ${slot.FLR}卷`"></div>
              <div v-if="slot.IWS > 0" class="bar-segment iws" :style="{ height: `${getBarHeight(slot.IWS)}px` }" :title="`收料: ${slot.IWS}卷`"></div>
            </div>
            <div class="hour-label">{{ slot.time }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 今日明细表格 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>📋 今日明细记录</span>
          <div class="header-actions">
            <el-select v-model="filterTrans" placeholder="移动类型" clearable size="default" style="width: 120px">
              <el-option label="PLR" value="PLR" />
              <el-option label="FLR" value="FLR" />
              <el-option label="IWS" value="IWS" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="tableData" stripe border height="400" v-loading="loading">
        <el-table-column prop="gr_document" label="GRN No" min-width="120" fixed />
        <el-table-column prop="trans" label="Trans" min-width="50" />
        <el-table-column prop="material" label="Material" min-width="120" />
        <el-table-column prop="quantity" label="Quantity" min-width="70" align="right">
          <template #default="{ row }">{{ formatNumber(row.quantity) }}</template>
        </el-table-column>
        <el-table-column prop="warehouse" label="Whse No." min-width="50" />
        <el-table-column prop="from_sloc" label="From SLoc" min-width="60" />
        <el-table-column prop="to_sloc" label="To SLoc" min-width="60" />
        <el-table-column prop="reference" label="Reference" min-width="110" show-overflow-tooltip />
        <el-table-column prop="sled" label="SLED" min-width="90" />
        <el-table-column prop="creation_time" label="Creation t" min-width="60" />
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadTableData"
          @current-change="loadTableData"
        />
      </div>
    </el-card>

    <!-- 过期预警弹窗 -->
    <el-dialog v-model="showExpiryDialog" title="⚠️ 物料过期预警" width="90%" top="5vh">
      <el-tabs v-model="expiryTab" class="expiry-tabs">
        <!-- 已过期页签 -->
        <el-tab-pane :label="`已过期 (${expiredList.length})`" name="expired">
          <div class="expiry-actions">
            <el-button type="success" @click="markProcessed('expired')" :disabled="selectedExpiredRows.length === 0">
              标记已处理 ({{ selectedExpiredRows.length }})
            </el-button>
            <el-button type="warning" @click="sendExpiryEmail('expired')" :disabled="expiredList.length === 0">
              发送邮件通知
            </el-button>
            <el-button @click="selectedExpiredRows = []">清除选择</el-button>
          </div>
          <el-table :data="expiredList" stripe border height="350" @selection-change="(s) => selectedExpiredRows = s">
            <el-table-column type="selection" width="40" fixed />
            <el-table-column prop="gr_document" label="GRN No" min-width="120" fixed />
            <el-table-column prop="material" label="Material" min-width="120" />
            <el-table-column prop="quantity" label="Quantity" min-width="70" align="right">
              <template #default="{ row }">{{ formatNumber(row.quantity) }}</template>
            </el-table-column>
            <el-table-column prop="warehouse" label="Whse No." min-width="50" />
            <el-table-column prop="trans" label="Trans" min-width="50" />
            <el-table-column prop="sled" label="SLED" min-width="90" />
            <el-table-column prop="expiry_days" label="Expiry Days" min-width="80" align="center">
              <template #default="{ row }"><el-tag type="danger">{{ row.expiry_days }}天</el-tag></template>
            </el-table-column>
            <el-table-column prop="reference" label="Reference" min-width="110" show-overflow-tooltip />
            <el-table-column prop="lot_code" label="Lot Code" min-width="80" show-overflow-tooltip />
            <el-table-column prop="creation_date" label="Creation D" min-width="100" />
          </el-table>
        </el-tab-pane>

        <!-- 7天内过期页签 -->
        <el-tab-pane :label="`7天内过期 (${expiringList.length})`" name="expiring">
          <div class="expiry-actions">
            <el-button type="success" @click="markProcessed('expiring')" :disabled="selectedExpiringRows.length === 0">
              标记已处理 ({{ selectedExpiringRows.length }})
            </el-button>
            <el-button type="warning" @click="sendExpiryEmail('expiring')" :disabled="expiringList.length === 0">
              发送邮件通知
            </el-button>
            <el-button @click="selectedExpiringRows = []">清除选择</el-button>
          </div>
          <el-table :data="expiringList" stripe border height="350" @selection-change="(s) => selectedExpiringRows = s">
            <el-table-column type="selection" width="40" fixed />
            <el-table-column prop="gr_document" label="GRN No" min-width="120" fixed />
            <el-table-column prop="material" label="Material" min-width="120" />
            <el-table-column prop="quantity" label="Quantity" min-width="70" align="right">
              <template #default="{ row }">{{ formatNumber(row.quantity) }}</template>
            </el-table-column>
            <el-table-column prop="warehouse" label="Whse No." min-width="50" />
            <el-table-column prop="trans" label="Trans" min-width="50" />
            <el-table-column prop="sled" label="SLED" min-width="90" />
            <el-table-column prop="expiry_days" label="Expiry Days" min-width="80" align="center">
              <template #default="{ row }"><el-tag type="warning">{{ row.expiry_days }}天</el-tag></template>
            </el-table-column>
            <el-table-column prop="reference" label="Reference" min-width="110" show-overflow-tooltip />
            <el-table-column prop="lot_code" label="Lot Code" min-width="80" show-overflow-tooltip />
            <el-table-column prop="creation_date" label="Creation D" min-width="100" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Box, Warning } from '@element-plus/icons-vue'
import request from '../utils/request'

// 状态
const loading = ref(false)
const selectedDate = ref('2026-08-15')
const filterPlant = ref('CN02')
const filterWarehouse = ref('')
const filterTrans = ref('')
const showExpiryDialog = ref(false)
const expiryTab = ref('expired')

// 数据
const summary = reactive({ PLR: {}, FLR: {}, IWS: {} })
const timeSlots = ref([])
const tableData = ref([])
const expiredList = ref([])
const expiringList = ref([])
const expiryStats = reactive({ expired: 0, expiring_soon: 0, total: 0 })
const selectedExpiredRows = ref([])
const selectedExpiringRows = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
})

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
  try {
    const res = await request.get('/warehouse-monitor/summary', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value
      }
    })
    if (res.success) {
      Object.assign(summary, res.data.trans)
      Object.assign(expiryStats, res.data.expiry)
    }
  } catch (error) {
    console.error('加载汇总失败:', error)
  }
}

// 加载时间统计数据
const loadTimeStats = async () => {
  try {
    const res = await request.get('/warehouse-monitor/stats-by-time', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value
      }
    })
    if (res.success) {
      timeSlots.value = res.data.timeSlots
    }
  } catch (error) {
    console.error('加载时间统计失败:', error)
  }
}

// 加载表格数据
const loadTableData = async () => {
  loading.value = true
  try {
    const res = await request.get('/warehouse-monitor/today-records', {
      params: {
        date: selectedDate.value,
        plant: filterPlant.value,
        warehouse: filterWarehouse.value,
        trans: filterTrans.value,
        page: pagination.page,
        pageSize: pagination.pageSize
      }
    })
    if (res.success) {
      tableData.value = res.data
      pagination.total = res.total
    }
  } catch (error) {
    console.error('加载表格数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载过期预警数据
const loadExpiryData = async () => {
  try {
    const res = await request.get('/warehouse-monitor/expiry-alerts', {
      params: {
        days: 30,
        plant: filterPlant.value
      }
    })
    if (res.success) {
      const allData = res.data
      // 分类：已过期和7天内过期
      expiredList.value = allData.filter(item => item.expiry_days < 0)
      expiringList.value = allData.filter(item => item.expiry_days >= 0 && item.expiry_days <= 7)
    }
  } catch (error) {
    console.error('加载过期预警失败:', error)
  }
}

// 标记已处理
const markProcessed = async (type) => {
  let rows, list
  if (type === 'expired') {
    rows = selectedExpiredRows.value
    list = expiredList
  } else {
    rows = selectedExpiringRows.value
    list = expiringList
  }

  if (rows.length === 0) {
    ElMessage.warning('请先选择要标记的记录')
    return
  }
  try {
    const ids = rows.map(row => row.id)
    const res = await request.post('/warehouse-monitor/mark-processed', { ids })
    if (res.success) {
      ElMessage.success(res.message || '标记成功')
      if (type === 'expired') {
        selectedExpiredRows.value = []
      } else {
        selectedExpiringRows.value = []
      }
      await loadExpiryData()
      await loadSummary()
    }
  } catch (error) {
    console.error('标记失败:', error)
    ElMessage.error('标记失败')
  }
}

// 发送过期预警邮件
const sendExpiryEmail = async (type) => {
  let list
  if (type === 'expired') {
    list = expiredList.value
  } else {
    list = expiringList.value
  }

  if (list.length === 0) {
    ElMessage.warning('没有数据可发送')
    return
  }

  try {
    const res = await request.post('/warehouse-monitor/send-expiry-email', {
      type: type,
      data: list
    })
    if (res.success) {
      ElMessage.success(res.message || '邮件发送成功')
    }
  } catch (error) {
    console.error('发送邮件失败:', error)
    ElMessage.error('发送邮件失败')
  }
}

// 加载所有数据
const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadSummary(),
      loadTimeStats(),
      loadTableData(),
      loadExpiryData()
    ])
  } finally {
    loading.value = false
  }
}

// 工具函数
const formatNumber = (num) => {
  if (!num) return '0'
  return parseFloat(num).toLocaleString('zh-CN', { maximumFractionDigits: 3 })
}

// 监听筛选变化
const handleFilterChange = () => {
  pagination.page = 1
  loadData()
}

// 监听筛选变化
watch([selectedDate, filterPlant, filterWarehouse, filterTrans], handleFilterChange)

onMounted(() => {
  loadData()
})
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
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 1px;
}

.bar-segment {
  width: 100%;
  min-height: 2px;
  transition: height 0.3s;
  cursor: pointer;
}

.bar-segment.plr { background: #f56c6c; }
.bar-segment.flr { background: #67c23a; }
.bar-segment.iws { background: #409eff; }

.hour-label {
  font-size: 10px;
  color: #909399;
  margin-top: 5px;
  transform: scale(0.9);
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
