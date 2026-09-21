<template>
  <div class="ole-tracking-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">数据中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">部门OLE追踪</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="refreshData">
          🔄 刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <label>维度:</label>
          <el-radio-group v-model="filterDimension" size="default" @change="onDimensionChange">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
            <el-radio-button value="year">年</el-radio-button>
          </el-radio-group>
        </div>
        <div class="filter-item">
          <label>日期:</label>
          <el-button size="default" @click="prevDate" :disabled="loading">◀</el-button>
          <el-date-picker
            v-model="filterDate"
            :type="datePickerType"
            :placeholder="datePickerPlaceholder"
            :format="datePickerFormat"
            :value-format="datePickerValueFormat"
            size="default"
            @change="onDateChange"
          />
          <el-button size="default" @click="nextDate" :disabled="loading">▶</el-button>
        </div>
        <div class="filter-item">
          <label>班次:</label>
          <el-select v-model="filterShift" placeholder="全部班次" clearable size="default" @change="onFilterChange">
            <el-option v-for="shift in shiftOptions" :key="shift.value" :label="shift.label" :value="shift.value" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>Area:</label>
          <el-select v-model="filterArea" placeholder="全部Area" clearable size="default" @change="onFilterChange">
            <el-option v-for="area in areaOptions" :key="area" :label="area" :value="area" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>人员:</label>
          <el-input v-model="filterEmployee" placeholder="姓名搜索" clearable size="default" @input="onFilterChange" style="width: 150px;" />
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="loading-spinner"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <template v-else>
      <!-- 主体内容区域 -->
      <div class="main-content">
        <!-- 左侧：班次信息 + 统计卡片 -->
        <div class="left-panel">
          <!-- 班次信息头部（显示当前选中班次或默认班次） -->
          <div class="shift-info-header">
            <!-- 左侧：日期、班次、负责人 -->
            <div class="shift-info-left">
              <div class="shift-info-item">
                <span class="shift-info-label">📅 日期</span>
                <span class="shift-info-value">{{ filterDate }}</span>
              </div>
              <div class="shift-info-item">
                <span class="shift-info-label">🕐 班次</span>
                <span class="shift-info-value">{{ getCurrentShiftDisplay() }}</span>
              </div>
              <div class="shift-info-item">
                <span class="shift-info-label">👤 负责人</span>
                <span class="shift-info-value">{{ currentShiftLeader.name || '待分配' }}</span>
              </div>
            </div>
            <!-- 右侧：照片 -->
            <div class="supervisor-section">
              <div class="supervisor-photo">
                <img v-if="currentShiftLeader.photoUrl" :src="currentShiftLeader.photoUrl" :alt="currentShiftLeader.name" @error="handlePhotoError" />
                <div v-else class="photo-placeholder">
                  <el-icon><User /></el-icon>
                </div>
              </div>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div class="stats-grid">
            <div class="stat-row efficiency-row">
              <div class="stat-card a-shift-efficiency" :class="{ highlight: isAShift }">
                <div class="stat-icon">📈</div>
                <div class="stat-content">
                  <div class="stat-label">A班效率</div>
                  <div class="stat-value">{{ aShiftEfficiency.avgPercentage }}%</div>
                  <div class="stat-sub">
                    <span class="stat-success">✓ {{ aShiftEfficiency.achievedCount }} 达标</span>
                    <span class="stat-warning">✗ {{ aShiftEfficiency.unachievedCount }} 未达标</span>
                  </div>
                </div>
              </div>
              <div class="stat-card c-shift-efficiency" :class="{ highlight: !isAShift }">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-label">C班效率</div>
                  <div class="stat-value">{{ cShiftEfficiency.avgPercentage }}%</div>
                  <div class="stat-sub">
                    <span class="stat-success">✓ {{ cShiftEfficiency.achievedCount }} 达标</span>
                    <span class="stat-warning">✗ {{ cShiftEfficiency.unachievedCount }} 未达标</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="stat-row">
              <div class="stat-card work-hours">
                <div class="stat-icon">⏱️</div>
                <div class="stat-content">
                  <div class="stat-label">总工时</div>
                  <div class="stat-value">{{ currentShiftSummary.totalHours || 0 }}</div>
                  <div class="stat-sub">小时</div>
                </div>
              </div>
              <div class="stat-card employee-count">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                  <div class="stat-label">作业人数</div>
                  <div class="stat-value">{{ totalEmployeesAllShifts || 0 }}</div>
                  <div class="stat-sub">人</div>
                </div>
              </div>
              <div class="stat-card output-summary">
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                  <div class="stat-label">产出汇总</div>
                  <div class="stat-value">{{ getTotalOutput }}</div>
                  <div class="stat-sub">IWS+FLR+PLR</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：图表区域 -->
        <div class="right-panel">
          <!-- 效率达标排名 - 显示达标人员照片和姓名 -->
          <div class="chart-card ranking-card">
            <div class="chart-title">🏆 效率达标排名</div>
            <div class="ranking-list-container">
              <div v-if="achievedRanking.length === 0" class="ranking-empty">
                <div class="empty-icon">🏅</div>
                <div>暂无达标人员</div>
              </div>
              <template v-else>
                <!-- 第一行：前三名大卡片 -->
                <div class="ranking-top3-row">
                  <div v-for="(item, index) in achievedRanking.slice(0, 3)" :key="item.employee_id" class="ranking-item ranking-item-top3" :class="getRankClass(index)">
                    <div class="ranking-badge-top3">
                      <span v-if="index === 0">🥇</span>
                      <span v-else-if="index === 1">🥈</span>
                      <span v-else>🥉</span>
                    </div>
                    <div class="ranking-photo-top3">
                      <img v-if="item.photoUrl" :src="item.photoUrl" :alt="item.name" @error="handlePhotoError" />
                      <div v-else class="photo-placeholder-top3">👤</div>
                    </div>
                    <div class="ranking-info">
                      <div class="ranking-name">{{ item.name }}</div>
                      <div class="ranking-percentage">{{ item.percentage }}%</div>
                    </div>
                  </div>
                </div>
                <!-- 第二行：4-10名小卡片 -->
                <div v-if="achievedRanking.length > 3" class="ranking-other-row">
                  <div v-for="(item, index) in achievedRanking.slice(3)" :key="item.employee_id" class="ranking-item ranking-item-other">
                    <div class="ranking-badge-small">{{ index + 4 }}</div>
                    <div class="ranking-photo-small">
                      <img v-if="item.photoUrl" :src="item.photoUrl" :alt="item.name" @error="handlePhotoError" />
                      <div v-else class="photo-placeholder-small">👤</div>
                    </div>
                    <div class="ranking-info">
                      <div class="ranking-name">{{ item.name }}</div>
                      <div class="ranking-percentage">{{ item.percentage }}%</div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 差异警告排名 -->
          <div class="chart-card">
            <div class="chart-title">⚠️ 差异警告排名</div>
            <div class="diff-content">
              <!-- 左侧：差异排名统计 -->
              <div class="diff-ranking-panel">
                <div v-if="diffRankingData.length === 0" class="diff-empty">
                  <div class="empty-icon">🎉</div>
                  <div class="empty-text">暂无产生差异，继续努力！</div>
                </div>
                <table v-else class="diff-ranking-table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>PIC</th>
                      <th>差异次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in diffRankingData" :key="index" :class="{ 'highlight-row': selectedDiffPic === item.diff_pic }" @click="selectedDiffPic = item.diff_pic">
                      <td class="rank-cell">
                        <span v-if="index === 0" class="rank-badge gold">🥇</span>
                        <span v-else-if="index === 1" class="rank-badge silver">🥈</span>
                        <span v-else-if="index === 2" class="rank-badge bronze">🥉</span>
                        <span v-else class="rank-num">{{ index + 1 }}</span>
                      </td>
                      <td class="name-cell">{{ item.diff_pic }}</td>
                      <td class="count-cell">{{ item.diff_count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- 右侧：差异明细 -->
              <div class="diff-detail-panel">
                <div v-if="!selectedDiffPic && diffData.length === 0" class="diff-empty">
                  <div class="empty-icon">📋</div>
                  <div class="empty-text">请选择左侧PIC查看明细</div>
                </div>
                <div v-else-if="filteredDiffData.length === 0" class="diff-empty">
                  <div class="empty-icon">📋</div>
                  <div class="empty-text">暂无明细数据</div>
                </div>
                <div v-else class="diff-table-wrapper">
                  <table class="diff-table">
                    <thead>
                      <tr>
                        <th>Part No</th>
                        <th>数量</th>
                        <th>差异类型</th>
                        <th>PIC</th>
                        <th>详情</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in filteredDiffData" :key="index">
                        <td>{{ item.part_no || '-' }}</td>
                        <td>{{ Number(item.qty || 0).toFixed(0) }}</td>
                        <td>{{ item.diff_type || '-' }}</td>
                        <td>{{ item.diff_pic || '-' }}</td>
                        <td>
                          <el-popover
                            placement="top-start"
                            :title="'处理结果'"
                            width="300"
                            trigger="click"
                            :content="item.handling_result || '-'">
                            <template #reference>
                              <span class="detail-link">查看详情</span>
                            </template>
                            <div class="detail-content">{{ item.handling_result || '-' }}</div>
                          </el-popover>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 产出明细与效率完成比（与表格同宽） -->
      <div class="chart-section">
        <div class="chart-card wide">
          <div class="chart-title">📊 产出明细与效率完成比</div>
          <div class="chart-container" ref="efficiencyChartRef"></div>
        </div>
      </div>

      <!-- 明细表格 -->
      <div class="table-section">
        <div class="table-header">
          <div class="table-title">📋 OLE明细</div>
          <div class="table-actions">
            <el-button size="small" @click="exportData">📤 导出</el-button>
          </div>
        </div>
        <div class="table-container">
          <el-table :data="scrollRecords" border stripe size="small" max-height="650" default-sort="{ prop: 'percentage', order: 'descending' }">
              <el-table-column prop="name" label="姓名" width="100" fixed />
            <el-table-column label="User ID" width="180">
              <template #default="{ row }">
                <span v-if="row.user_ids && (Array.isArray(row.user_ids) ? row.user_ids.length > 0 : String(row.user_ids).length > 0)">
                  <el-tag v-for="(uid, idx) in (() => {
                    const ids = Array.isArray(row.user_ids) ? row.user_ids : String(row.user_ids).split(/[&,]/).map((s: string) => s.trim()).filter((s: string) => s);
                    return ids.filter((id: string) => id !== String(row.employee_id));
                  })()" :key="idx" size="small" :type="getTagType(idx)" style="margin-right: 4px;">
                    {{ uid }}
                  </el-tag>
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="level" label="Level" width="80" />
            <el-table-column label="班次" width="100">
              <template #default="{ row }">
                <span v-if="row.shift_names && row.shift_names.length > 0">
                  <el-tag v-for="(s, idx) in (Array.isArray(row.shift_names) ? row.shift_names : row.shift_names.split(','))" :key="idx" size="small" :type="getTagType(idx)" style="margin-right: 4px;">
                    {{ s.trim() }}
                  </el-tag>
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="Area" width="220">
              <template #default="{ row }">
                <span v-if="row.areas && row.areas.length > 0">
                  <el-tag v-for="(area, idx) in (Array.isArray(row.areas) ? row.areas : row.areas.split(','))" :key="idx" size="small" :type="getTagType(idx)" style="margin-right: 4px;">
                    {{ area.trim() }}
                  </el-tag>
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="hours" label="工作时长" width="90">
              <template #default="{ row }">
                {{ Number(row.hours || 0).toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column prop="special_hours" label="特殊工时" width="90">
              <template #default="{ row }">
                {{ Number(row.special_hours || 0).toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column prop="iws" label="IWS" width="80" align="center" />
            <el-table-column prop="flr" label="FLR" width="80" align="center" />
            <el-table-column prop="plr" label="PLR" width="80" align="center" />
            <el-table-column prop="grs" label="GRS" width="80" align="center" />
            <el-table-column prop="pull_list" label="Pull List" width="100" align="center" />
            <el-table-column label="目标效率" width="90">
              <template #default="{ row }">
                {{ row.target_efficiency ? (row.target_efficiency * 100).toFixed(0) + '%' : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="实际效率" width="100">
              <template #default="{ row }">
                <span class="efficiency-value" :class="getEfficiencyClass(row.percentage)">
                  {{ row.percentage !== null ? row.percentage + '%' : '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" fixed="right">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status === '达标' ? 'success' : 'warning'">
                  {{ row.status || '未计算' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" width="190" fixed="right">
              <template #default="{ row }">
                <span class="remark-cell">{{ row.remark || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading, User } from '@element-plus/icons-vue';
import dayjs from '@/plugins/dayjs';
import * as echarts from 'echarts';
import request from '@/utils/request';
import {
  getOleTrackingStats,
  getOleTrackingRanking,
  getOleAreaStats,
  getOleDiffStats,
  getOleShiftDetail
} from '@/api/oleTracking';

interface ShiftSummary {
  totalEmployees: number;
  totalHours: string;
  totalIws: number;
  totalFlr: number;
  totalPlr: number;
  totalGrs: number;
  totalPullList: number;
  achievedCount: number;
  unachievedCount: number;
  avgPercentage: number;
  leaderName?: string;
  leaderCode?: string;
  currentShiftType?: string;
  shiftDisplay?: string;
}

interface ShiftLeader {
  shiftType: 'A+' | 'C+';  // A班或C班
  shiftDisplay: string;    // 显示名称（如"A班"）
  name: string;            // Leader姓名
  photoUrl: string;        // 照片URL
}

// 根据当前时间判断班次：7:00-18:59为A+，19:00-次日6:59为C+
const getCurrentShiftType = (): 'A+' | 'C+' => {
  const now = new Date();
  const hours = now.getHours();
  // 7:00-18:59 为 A+ 班
  if (hours >= 7 && hours < 19) {
    return 'A+';
  }
  // 19:00-23:59 和 0:00-6:59 为 C+ 班
  return 'C+';
};

// 获取当前班次显示（从API获取）
const getCurrentShiftDisplay = () => {
  return currentShiftLeader.value?.shiftDisplay || (getCurrentShiftType() === 'A+' ? 'A班' : 'C班');
};

// 获取当前班次Leader信息（从API响应中获取）
const currentShiftLeader = computed<ShiftLeader>(() => {
  const summary = statsSummary.value;
  if (summary?.leaderName) {
    return {
      shiftType: summary.currentShiftType || getCurrentShiftType(),
      shiftDisplay: summary.shiftDisplay || 'A班',
      name: summary.leaderName,
      photoUrl: summary.leaderCode ? `/photos/${summary.leaderCode}.jpg` : ''
    };
  }
  // 备用：如果API没有返回，显示当前班次但没有负责人
  const shiftType = getCurrentShiftType();
  return {
    shiftType,
    shiftDisplay: shiftType === 'A+' ? 'A班' : 'C班',
    name: '',  // 空表示未分配
    photoUrl: ''
  };
});

interface ShiftDetail {
  employee_id?: number;
  name: string;
  level: string;
  hours: string;
  special_hours: number;
  user_ids: string[];
  areas: string[];
  shift_names: string[];
  remark?: string;
  iws: number;
  flr: number;
  plr: number;
  grs: number;
  pull_list: number;
  target_efficiency: number | null;
  percentage: number | null;
  status: string;
  is_excluded_from_efficiency?: boolean;
}

interface RankingItem {
  name: string;
  level: string;
  department: string;
  area: string;
  work_days: number;
  total_hours: number;
  total_iws: number;
  total_flr: number;
  total_plr: number;
  total_grs: number;
  total_pull_list: number;
  avg_percentage: number | null;
  target_efficiency: number | null;
  status: string;
}

interface DiffStat {
  part_no: string;
  qty: number;
  diff_type: string;
  diff_pic: string;
  handling_result: string;
}

interface AreaStat {
  area: string;
  employee_count: number;
  record_count: number;
  total_hours: number;
  total_iws: number;
  total_flr: number;
  total_plr: number;
  total_grs: number;
  total_pull_list: number;
  avg_percentage: number | null;
}

// 筛选条件
const filterDimension = ref('day');
// 从 sessionStorage 恢复之前的选择，否则使用当天日期
const savedDate = sessionStorage.getItem('oleTrackingDate');
const savedShift = sessionStorage.getItem('oleTrackingShift');
const savedDimension = sessionStorage.getItem('oleTrackingDimension');
const filterDate = ref(savedDate || dayjs().format('YYYY-MM-DD'));
const filterShift = ref(savedShift || '');
const filterArea = ref('');
const filterEmployee = ref('');

// 如果有保存的筛选维度，也恢复
if (savedDimension) {
  filterDimension.value = savedDimension;
}

// 数据
const loading = ref(false);
const records = ref<ShiftDetail[]>([]);
const shiftStats = ref<Record<string, ShiftSummary>>({});
const rankingData = ref<RankingItem[]>([]);
const diffData = ref<DiffStat[]>([]);
const diffRankingData = ref<{ diff_pic: string; diff_count: number }[]>([]);
const selectedDiffPic = ref<string | null>(null);

// 过滤后的差异明细
const filteredDiffData = computed(() => {
  if (!selectedDiffPic.value) {
    return diffData.value;
  }
  return diffData.value.filter(item => item.diff_pic === selectedDiffPic.value);
});
const areaData = ref<AreaStat[]>([]);
const selectedShift = ref('');
const statsSummary = ref<any>({});  // 存储API返回的summary数据

// 滚动播放相关
const scrollRecords = ref<ShiftDetail[]>([]);

// 图表实例
let efficiencyChart: echarts.ECharts | null = null;
let areaChart: echarts.ECharts | null = null;
let diffChart: echarts.ECharts | null = null;

// 获取标签颜色类型
const getTagType = (index: number): '' | 'success' | 'warning' | 'danger' | 'info' | 'primary' => {
  const types: Array<'' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = ['', 'success', 'warning', 'danger', 'info', 'primary'];
  return types[index % types.length] ?? '';
};

// 图表容器
const efficiencyChartRef = ref<HTMLElement>();
const areaChartRef = ref<HTMLElement>();
const diffChartRef = ref<HTMLElement>();

// 班次选项
const shiftOptions = [
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

// 可用的班次
const availableShifts = computed(() => {
  return shiftOptions.filter(s => shiftStats.value[s.value]);
});

// Area选项
const areaOptions = computed(() => {
  const areas = new Set<string>();
  records.value.forEach(r => {
    if (r.areas && Array.isArray(r.areas)) {
      r.areas.forEach(a => areas.add(a));
    }
  });
  return Array.from(areas);
});

// 日期选择器配置
const datePickerType = computed(() => {
  if (filterDimension.value === 'month') return 'month';
  if (filterDimension.value === 'year') return 'year';
  return 'date';
});

const datePickerPlaceholder = computed(() => {
  if (filterDimension.value === 'month') return '选择月份';
  if (filterDimension.value === 'year') return '选择年份';
  return '选择日期';
});

const datePickerFormat = computed(() => {
  if (filterDimension.value === 'month') return 'YYYY-MM';
  if (filterDimension.value === 'year') return 'YYYY';
  return 'YYYY-MM-DD';
});

const datePickerValueFormat = computed(() => {
  if (filterDimension.value === 'month') return 'YYYY-MM';
  if (filterDimension.value === 'year') return 'YYYY';
  return 'YYYY-MM-DD';
});

// 当前班次汇总
const currentShiftSummary = computed(() => {
  // 如果没有选中特定班次，返回所有班次的汇总数据
  if (!selectedShift.value) {
    const allShifts = Object.values(shiftStats.value);
    if (allShifts.length === 0) return {} as ShiftSummary;

    return {
      totalEmployees: allShifts.reduce((sum, s) => sum + (s.totalEmployees || 0), 0),
      totalHours: allShifts.reduce((sum, s) => sum + parseFloat(s.totalHours || '0'), 0).toFixed(2),
      totalIws: allShifts.reduce((sum, s) => sum + (s.totalIws || 0), 0),
      totalFlr: allShifts.reduce((sum, s) => sum + (s.totalFlr || 0), 0),
      totalPlr: allShifts.reduce((sum, s) => sum + (s.totalPlr || 0), 0),
      achievedCount: allShifts.reduce((sum, s) => sum + (s.achievedCount || 0), 0),
      unachievedCount: allShifts.reduce((sum, s) => sum + (s.unachievedCount || 0), 0),
      avgPercentage: allShifts.length > 0
        ? Number((allShifts.reduce((sum, s) => sum + (s.avgPercentage || 0), 0) / allShifts.length).toFixed(1))
        : 0,
      totalGrs: allShifts.reduce((sum, s) => sum + (s.totalGrs || 0), 0),
      totalPullList: allShifts.reduce((sum, s) => sum + (s.totalPullList || 0), 0)
    } as ShiftSummary;
  }
  return shiftStats.value[selectedShift.value] || {} as ShiftSummary;
});

// 所有班次总人数
const totalEmployeesAllShifts = computed(() => {
  return Object.values(shiftStats.value).reduce((sum, s) => sum + (s.totalEmployees || 0), 0);
});

// 总产出（从OLE明细表格数据计算）
const getTotalOutput = computed(() => {
  const data = filteredRecords.value;
  if (data.length === 0) return 0;
  const totalIws = data.reduce((sum, r) => sum + Number(r.iws || 0), 0);
  const totalFlr = data.reduce((sum, r) => sum + Number(r.flr || 0), 0);
  const totalPlr = data.reduce((sum, r) => sum + Number(r.plr || 0), 0);
  return totalIws + totalFlr + totalPlr;
});

// A班效率：基于OLE明细表格数据，排除状态为未计算且班次不为C或C+的员工
const aShiftEfficiency = computed(() => {
  // 从 filteredRecords 中筛选：状态不为"未计算" 且 班次不为 C 或 C+
  const aShiftRecords = filteredRecords.value.filter(r => {
    const status = r.status;
    const shiftNames = r.shift_names || '';
    const isCShift = shiftNames.includes('C') || shiftNames.includes('C+');
    return status && status !== '未计算' && !isCShift;
  });

  if (aShiftRecords.length === 0) {
    return { avgPercentage: 0, achievedCount: 0, unachievedCount: 0 };
  }

  // 计算平均效率
  const totalPercentage = aShiftRecords.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
  const avgPercentage = aShiftRecords.length > 0 ? Number((totalPercentage / aShiftRecords.length).toFixed(1)) : 0;

  // 统计达标/未达标人数
  const achievedCount = aShiftRecords.filter(r => r.status === '达标').length;
  const unachievedCount = aShiftRecords.filter(r => r.status === '未达标').length;

  return { avgPercentage, achievedCount, unachievedCount };
});

// C班效率：C和C+班次
const cShiftEfficiency = computed(() => {
  // 从 filteredRecords 中筛选：C 或 C+ 班次的员工
  const cShiftRecords = filteredRecords.value.filter(r => {
    const shiftNames = r.shift_names || '';
    return shiftNames.includes('C') || shiftNames.includes('C+');
  });

  if (cShiftRecords.length === 0) {
    return { avgPercentage: 0, achievedCount: 0, unachievedCount: 0 };
  }

  // 计算平均效率（只统计状态不为"未计算"的记录）
  const validRecords = cShiftRecords.filter(r => r.status && r.status !== '未计算');
  if (validRecords.length === 0) {
    return { avgPercentage: 0, achievedCount: 0, unachievedCount: 0 };
  }

  const totalPercentage = validRecords.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
  const avgPercentage = validRecords.length > 0 ? Number((totalPercentage / validRecords.length).toFixed(1)) : 0;

  // 统计达标/未达标人数
  const achievedCount = validRecords.filter(r => r.status === '达标').length;
  const unachievedCount = validRecords.filter(r => r.status === '未达标').length;

  return { avgPercentage, achievedCount, unachievedCount };
});

// 效率达标排名 - 从OLE明细表格中筛选状态为达标的人员
interface AchievedRankingItem {
  employee_id: number | undefined;
  name: string;
  percentage: number;
  photoUrl: string;
}

const achievedRanking = computed<AchievedRankingItem[]>(() => {
  // 从 filteredRecords 中筛选状态为"达标"的员工
  const achievedRecords = filteredRecords.value
    .filter(r => r.status === '达标' && r.percentage !== null && r.percentage !== undefined)
    .map(r => ({
      employee_id: r.employee_id || Math.random(),
      name: r.name || '未知',
      percentage: Number(r.percentage) || 0,
      photoUrl: r.user_ids && r.user_ids.length > 0 ? `/photos/${r.user_ids[0]}.jpg` : ''
    }))
    .sort((a, b) => b.percentage - a.percentage) // 按效率从高到低排序
    .slice(0, 10); // 最多显示10个

  return achievedRecords;
});

// 获取排名样式类
const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold';
  if (index === 1) return 'rank-silver';
  if (index === 2) return 'rank-bronze';
  return 'rank-normal';
};

// 过滤后的记录（排除只被分配到不参与效率计算的Area的员工）
const filteredRecords = computed(() => {
  let result = records.value;
  // 排除只被分配到不参与效率计算的Area的员工（用于OLE明细表格）
  result = result.filter(r => !r.is_excluded_from_efficiency);
  if (filterArea.value) {
    result = result.filter(r => r.areas && r.areas.includes(filterArea.value));
  }
  if (filterEmployee.value) {
    const keyword = filterEmployee.value.toLowerCase();
    result = result.filter(r => r.name?.toLowerCase().includes(keyword));
  }
  return result;
});

// 获取班次标签类型
const getShiftTagType = (shift: string) => {
  if (shift?.includes('N')) return 'danger';
  if (shift?.includes('+')) return 'warning';
  return 'primary';
};

// 获取效率样式类
const getEfficiencyClass = (percentage: number | null | undefined) => {
  if (percentage === null || percentage === undefined) return '';
  if (percentage >= 85) return 'efficiency-high';
  if (percentage >= 60) return 'efficiency-medium';
  return 'efficiency-low';
};

// 判断当前班次是否为A班（A+/A/A2等，不包含C/N）
const isAShift = computed(() => {
  const shiftDisplay = getCurrentShiftDisplay();
  // A班包括：A班、A+班、A2班（不包含C班和N班）
  return shiftDisplay.includes('A') && !shiftDisplay.includes('C') && !shiftDisplay.includes('N');
});

// 获取班次标签
const getShiftLabel = (shift: string) => {
  const option = shiftOptions.find(s => s.value === shift);
  return option ? option.label : shift;
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('MM-DD');
};

// 根据班次获取Area
const getAreaByShift = (shift: string) => {
  if (records.value.length > 0) {
    const areas = new Set<string>();
    records.value.forEach(r => {
      if (r.areas && Array.isArray(r.areas)) {
        r.areas.forEach(a => areas.add(a));
      }
    });
    return Array.from(areas).join(', ');
  }
  return '';
};

// 照片加载失败处理
const handlePhotoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const parent = img.parentElement;
  if (parent) {
    const placeholder = parent.querySelector('.photo-placeholder') as HTMLElement;
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }
};

// 选择班次（不再使用，始终显示所有）
const selectShift = (shift: string) => {
  // selectedShift.value = shift;
  // // 保存班次选择到 sessionStorage
  // sessionStorage.setItem('oleTrackingShift', shift);
  // loadShiftDetail();
};

// 日期变化
const onDateChange = () => {
  selectedShift.value = '';
  // 保存筛选条件到 sessionStorage
  sessionStorage.setItem('oleTrackingDate', filterDate.value);
  sessionStorage.setItem('oleTrackingDimension', filterDimension.value);
  sessionStorage.removeItem('oleTrackingShift');
  loadData();
};

// 维度变化
const onDimensionChange = () => {
  selectedShift.value = '';
  // 保存筛选条件到 sessionStorage
  sessionStorage.setItem('oleTrackingDate', filterDate.value);
  sessionStorage.setItem('oleTrackingDimension', filterDimension.value);
  sessionStorage.removeItem('oleTrackingShift');
  loadData();
};

// 上翻日期
const prevDate = () => {
  let newDate: dayjs.Dayjs;
  if (filterDimension.value === 'day') {
    newDate = dayjs(filterDate.value).subtract(1, 'day');
  } else if (filterDimension.value === 'week') {
    newDate = dayjs(filterDate.value).subtract(1, 'week');
  } else if (filterDimension.value === 'month') {
    newDate = dayjs(filterDate.value).subtract(1, 'month');
  } else {
    newDate = dayjs(filterDate.value).subtract(1, 'year');
  }
  filterDate.value = newDate.format(datePickerValueFormat.value);
  sessionStorage.setItem('oleTrackingDate', filterDate.value);
  selectedShift.value = '';
  loadData();
};

// 下翻日期
const nextDate = () => {
  let newDate: dayjs.Dayjs;
  if (filterDimension.value === 'day') {
    newDate = dayjs(filterDate.value).add(1, 'day');
  } else if (filterDimension.value === 'week') {
    newDate = dayjs(filterDate.value).add(1, 'week');
  } else if (filterDimension.value === 'month') {
    newDate = dayjs(filterDate.value).add(1, 'month');
  } else {
    newDate = dayjs(filterDate.value).add(1, 'year');
  }
  filterDate.value = newDate.format(datePickerValueFormat.value);
  sessionStorage.setItem('oleTrackingDate', filterDate.value);
  selectedShift.value = '';
  loadData();
};

// 筛选变化
const onFilterChange = () => {
  // 筛选在前端处理
};

// 加载数据
const loadData = async () => {
  if (!filterDate.value) return;

  loading.value = true;
  try {
    // 根据维度计算日期范围
    let startDate = '';
    let endDate = '';

    if (filterDimension.value === 'day') {
      // 日：当天
      startDate = filterDate.value;
      endDate = filterDate.value;
    } else if (filterDimension.value === 'week') {
      // 周：从周一开始
      const current = dayjs(filterDate.value);
      const dayOfWeek = current.day();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = current.add(mondayOffset, 'day').format('YYYY-MM-DD');
      endDate = current.add(6 + mondayOffset, 'day').format('YYYY-MM-DD');
    } else if (filterDimension.value === 'month') {
      // 月：月初到月末（filterDate格式为 YYYY-MM）
      const current = dayjs(filterDate.value + '-01');
      startDate = current.startOf('month').format('YYYY-MM-DD');
      endDate = current.endOf('month').format('YYYY-MM-DD');
    } else if (filterDimension.value === 'year') {
      // 年：年初到年末（filterDate格式为 YYYY）
      const current = dayjs(filterDate.value + '-01-01');
      startDate = current.startOf('year').format('YYYY-MM-DD');
      endDate = current.endOf('year').format('YYYY-MM-DD');
    }

    // 获取统计数据
    const [statsRes, rankingRes, areaRes, diffRes] = await Promise.all([
      getOleTrackingStats({
        startDate: startDate,
        endDate: endDate
      }).catch(() => ({ data: null })),
      getOleTrackingRanking({
        startDate: dayjs(filterDate.value).subtract(30, 'day').format('YYYY-MM-DD'),
        endDate: filterDate.value,
        limit: 20
      }).catch(() => ({ data: [] })),
      getOleAreaStats({
        startDate: startDate,
        endDate: endDate
      }).catch(() => ({ data: [] })),
      getOleDiffStats({
        startDate: startDate,
        endDate: endDate,
        limit: 10
      }).catch(() => ({ data: [] }))
    ]);

    if (statsRes.data) {
      shiftStats.value = statsRes.data.shiftStats || {};
      statsSummary.value = statsRes.data.summary || {};  // 保存summary数据
      // 自动选择第一个有数据的班次
      const firstShift = Object.keys(shiftStats.value)[0];
      if (firstShift && !selectedShift.value) {
        // 始终显示所有班次，不自动选择特定班次
        // const savedShift = sessionStorage.getItem('oleTrackingShift');
        // if (savedShift && shiftStats.value[savedShift]) {
        //   selectedShift.value = savedShift;
        // } else {
        //   selectedShift.value = firstShift;
        // }
        // 清空班次选择，显示所有班次
        selectedShift.value = '';
      }
    }

    rankingData.value = rankingRes.data?.data || [];
    areaData.value = areaRes.data?.data || [];
    diffData.value = diffRes.data || [];

    // 计算差异排名数据
    const picMap = new Map<string, number>();
    diffData.value.forEach((item: DiffStat) => {
      const pic = item.diff_pic || '-';
      picMap.set(pic, (picMap.get(pic) || 0) + 1);
    });
    diffRankingData.value = Array.from(picMap.entries())
      .map(([diff_pic, diff_count]) => ({ diff_pic, diff_count }))
      .sort((a, b) => b.diff_count - a.diff_count)
      .slice(0, 10);

    // 加载OLE明细（始终加载所有班次）
    await loadShiftDetail();

    // 更新图表
    await nextTick();
    updateCharts();
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error({ message: '加载数据失败', showClose: true });
  } finally {
    loading.value = false;
  }
};

// 加载班次明细
const loadShiftDetail = async () => {
  if (!filterDate.value) return;

  // 根据维度计算查询日期
  let queryDate = '';
  if (filterDimension.value === 'day') {
    queryDate = filterDate.value;
  } else if (filterDimension.value === 'week') {
    // 周：使用该周的周一
    const current = dayjs(filterDate.value);
    const dayOfWeek = current.day();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    queryDate = current.add(mondayOffset, 'day').format('YYYY-MM-DD');
  } else if (filterDimension.value === 'month') {
    // 月：使用该月第一天
    queryDate = dayjs(filterDate.value + '-01').startOf('month').format('YYYY-MM-DD');
  } else if (filterDimension.value === 'year') {
    // 年：使用该年第一天
    queryDate = dayjs(filterDate.value + '-01-01').startOf('year').format('YYYY-MM-DD');
  }

  try {
    const params: any = { date: queryDate };
    // 如果选择了特定班次则传入shift参数，否则获取所有班次
    if (selectedShift.value) {
      params.shift = selectedShift.value;
    }
    const res = await getOleShiftDetail(params);

    if (res.data) {
      records.value = res.data.records || [];
      // 更新滚动播放数据
      updateScrollRecords();
    }
  } catch (error) {
    console.error('加载班次明细失败:', error);
    records.value = [];
  }
};

// 更新滚动播放数据（复制记录用于无限滚动）
const updateScrollRecords = () => {
  const data = filteredRecords.value;
  if (data.length === 0) {
    scrollRecords.value = [];
    return;
  }
  // 复制2份数据确保无缝滚动（CSS动画滚动50%后重置）
  scrollRecords.value = [...data, ...data];
};

// 刷新数据
const refreshData = () => {
  loadData();
};

// 监听筛选数据变化，更新滚动
watch(filteredRecords, () => {
  nextTick(() => {
    updateScrollRecords();
  });
}, { deep: true });

// 导出数据
const exportData = () => {
  ElMessage.info({ message: '导出功能开发中', showClose: true });
};

// 更新图表
const updateCharts = () => {
  // 确保 DOM 完全渲染
  nextTick(() => {
    nextTick(() => {
      updateEfficiencyChart();
      updateAreaChart();
      updateDiffChart();
    });
  });
};

// 计算当前班次已过小时数（基于当前时间）
const getCurrentShiftElapsedHours = (): number => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  // 检查是否是查看当天
  const today = new Date().toISOString().split('T')[0];
  const isToday = filterDate.value === today;

  // 如果查看的不是今天，返回完整班次时长（约10小时）
  if (!isToday) {
    return 10;
  }

  // A班/A+班：7:00-18:59
  if (currentTime >= 7 && currentTime < 19) {
    return Math.max(0, currentTime - 7);
  }
  // C班/C+班：19:00-次日6:59
  if (currentTime >= 19) {
    return currentTime - 19;
  }
  // 凌晨 0:00-6:59（属于前一天C班）
  return currentTime + 5; // 5 = 24 - 19
};

// 产出明细与效率完成比融合图表
const updateEfficiencyChart = () => {
  if (!efficiencyChartRef.value) return;

  // 如果已有实例，先销毁再重新创建
  if (efficiencyChart) {
    efficiencyChart.dispose();
    efficiencyChart = null;
  }

  efficiencyChart = echarts.init(efficiencyChartRef.value);

  const currentHours = getCurrentShiftElapsedHours();

  // 图表数据：排除不参与效率计算的Area的员工 或 状态为未计算
  const chartData = records.value
    .filter(r => !r.is_excluded_from_efficiency && r.status !== '未计算')
    .map(r => {
    const workingHours = Number(r.hours || 0);
    const specialHours = Number(r.special_hours || 0);
    const targetEff = r.target_efficiency ? r.target_efficiency * 100 : 85;
    const availableHours = workingHours - specialHours;

    // 当前平均效率 = 目标效率 × (当前已过小时数 / 工作时长)，最高不超过100%
    let avgEfficiency = 0;
    if (availableHours > 0 && currentHours > 0) {
      avgEfficiency = Math.min(targetEff * (currentHours / availableHours), 100);
    }

    return {
      name: r.name,
      efficiency: r.percentage || 0,
      avgEfficiency: Math.round(avgEfficiency * 100) / 100,
      target: targetEff,
      availableHours,
      iws: r.iws || 0,
      flr: r.flr || 0,
      plr: r.plr || 0,
      totalOutput: (r.iws || 0) + (r.flr || 0) + (r.plr || 0)
    };
  });

  efficiencyChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      z: 9999,
      formatter: (params: any) => {
        const data = chartData[params[0]?.dataIndex];
        if (!data) return '';
        const isHistorical = filterDate.value !== new Date().toISOString().split('T')[0];
        const isMeet = data.efficiency >= data.avgEfficiency;
        const statusText = isMeet ? '✓ 已达标' : '✗ 未达标';
        const statusColor = isMeet ? '#67C23A' : '#F56C6C';
        return `
          <div style="font-weight: bold; margin-bottom: 5px;">${data.name}</div>
          <div style="color: ${statusColor}; font-weight: 600;">${statusText}</div>
          <div style="color: #67C23A; margin-top: 3px;">实际效率: ${data.efficiency}%</div>
          <div style="color: #909399;">预计效率: ${Math.min(data.avgEfficiency, 100)}%</div>
          <div style="color: #E6A23C;">目标效率: ${data.target}%</div>
          <div style="margin-top: 5px; color: #909399;">产出明细:</div>
          <div>IWS: ${data.iws} | FLR: ${data.flr} | PLR: ${data.plr}</div>
          <div style="margin-top: 3px; color: #606266;">班次时长: ${data.availableHours.toFixed(1)}h${isHistorical ? ' (历史)' : ` | 已过: ${currentHours.toFixed(1)}h`}</div>
        `;
      }
    },
    legend: {
      data: ['实际效率(%)', '目标效率(%)', '预计效率(↑达标/↓未达标)'],
      bottom: '0%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.name),
      axisLabel: {
        rotate: 0,
        fontSize: 11,
        interval: 0
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '效率(%)',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      }
    ],
    series: [
      {
        name: '目标效率(%)',
        type: 'bar',
        data: chartData.map(d => d.target),
        itemStyle: {
          color: '#E6A23C',
          opacity: 0.5
        },
        barWidth: '30%',
        yAxisIndex: 0
      },
      {
        name: '实际效率(%)',
        type: 'bar',
        data: chartData.map(d => Math.min(d.efficiency, 100)),
        itemStyle: {
          color: (params: any) => {
            const val = params.value;
            if (val >= 85) return '#67C23A';
            if (val >= 60) return '#E6A23C';
            return '#F56C6C';
          }
        },
        barWidth: '30%',
        barGap: '30%',
        yAxisIndex: 0
      },
      {
        name: '预计效率(%)',
        type: 'line',
        data: chartData.map(d => Math.min(d.avgEfficiency, 100)),
        lineStyle: { width: 3 },
        itemStyle: {
          color: (params: any) => {
            const data = chartData[params.dataIndex];
            if (!data) return '#909399';
            if (data.efficiency >= data.avgEfficiency) return '#67C23A';
            return '#F56C6C';
          }
        },
        symbol: (value: number, params: any) => {
          const data = chartData[params.dataIndex];
          if (!data) return 'circle';
          return data.efficiency >= data.avgEfficiency ? 'arrow' : 'roundRect';
        },
        symbolSize: 12,
        yAxisIndex: 0
      }
    ]
  });
};

// Area效率排名图表
const updateAreaChart = () => {
  if (!areaChartRef.value) return;

  if (areaChart) {
    areaChart.dispose();
    areaChart = null;
  }

  areaChart = echarts.init(areaChartRef.value);

  const sortedData = [...areaData.value]
    .filter(d => d.avg_percentage !== null)
    .sort((a, b) => (b.avg_percentage || 0) - (a.avg_percentage || 0))
    .slice(0, 8);

  areaChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>效率: ${item.value}%`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.area).reverse()
    },
    series: [
      {
        type: 'bar',
        data: sortedData.map(d => d.avg_percentage).reverse(),
        itemStyle: {
          color: (params: any) => {
            const val = params.value;
            if (val >= 85) return '#67C23A';
            if (val >= 60) return '#E6A23C';
            return '#F56C6C';
          }
        }
      }
    ]
  });
};

// 差异排名图表
const updateDiffChart = () => {
  if (!diffChartRef.value) return;

  if (diffChart) {
    diffChart.dispose();
    diffChart = null;
  }

  if (diffRankingData.value.length === 0) return;

  diffChart = echarts.init(diffChartRef.value);

  const sortedData = [...diffRankingData.value].slice(0, 10);

  diffChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0];
        const diff = sortedData[item.dataIndex];
        return `${item.name}<br/>差异次数: ${item.value}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sortedData.map(d => d.diff_pic),
      axisLabel: { rotate: 45, fontSize: 10 }
    },
    yAxis: { type: 'value', name: '差异次数' },
    series: [
      {
        type: 'bar',
        data: sortedData.map(d => d.diff_count),
        itemStyle: { color: '#F56C6C' },
        barWidth: '50%'
      }
    ]
  });
};

// 窗口大小变化时重绘图表
const handleResize = () => {
  efficiencyChart?.resize();
  areaChart?.resize();
  diffChart?.resize();
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
  // 每5分钟自动刷新数据
  refreshTimer = setInterval(() => {
    loadData();
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  efficiencyChart?.dispose();
  areaChart?.dispose();
  diffChart?.dispose();
});
</script>

<style scoped>
.ole-tracking-container {
  padding: 0 24px 24px 24px;
  background-color: #F5F7FA;
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
  background-color: #F5F7FA;
  padding: 8px 0 16px 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.breadcrumb-item.active {
  color: #303133;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #C0C4CC;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px;
  gap: 12px;
  color: #909399;
  font-size: 16px;
}

.loading-spinner {
  font-size: 28px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 班次选择卡片 */
.shift-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.shift-card {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  min-width: 100px;
  text-align: center;
}

.shift-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.shift-card.active {
  border-color: #409EFF;
  background: linear-gradient(135deg, #ECF5FF 0%, #FFFFFF 100%);
}

.shift-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.shift-employee-count {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.shift-efficiency {
  font-size: 18px;
  font-weight: 700;
}

.shift-efficiency.efficiency-high { color: #67C23A; }
.shift-efficiency.efficiency-medium { color: #E6A23C; }
.shift-efficiency.efficiency-low { color: #F56C6C; }

/* 主体内容区域 */
.main-content {
  display: grid;
  grid-template-columns: 440px 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

/* 左侧面板 - 班次信息卡片宽度撑满 */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 440px;
  max-width: 440px;
}

/* 班次信息头部 */
.shift-info-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shift-info-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shift-info-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shift-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shift-info-label {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.85);
}

.shift-info-value {
  font-size: 18px;
  color: #FFFFFF;
  font-weight: 600;
}

.supervisor-section {
  display: flex;
  align-items: center;
}

.supervisor-photo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid rgba(255, 255, 255, 0.8);
  margin-top: 8px;  /* 照片下移 */
}

.supervisor-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 10%;  /* 显示人物上半身 */
}

.photo-placeholder {
  color: rgba(255, 255, 255, 0.8);
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.supervisor-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.supervisor-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.supervisor-name {
  font-size: 16px;
  color: #FFFFFF;
  font-weight: 600;
}

/* 统计卡片（1x3网格） */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.stats-grid .stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stats-grid .stat-row.efficiency-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stats-grid .stat-row.efficiency-row .stat-card {
  width: auto;
}

.stats-grid .stat-card {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  min-width: 0;
}

.stats-grid .stat-card.employee-count {
  min-width: auto;
  flex: 1 1 calc(33.33% + 10px);
}

.stats-grid .stat-card.work-hours {
  min-width: 105px;
  flex-shrink: 0;
}

.stats-grid .stat-card.output-summary {
  min-width: 110px;
  flex-shrink: 0;
  padding: 12px 32px;
}

.stats-grid .stat-card.highlight:not(.a-shift-efficiency):not(.c-shift-efficiency) {
  background: linear-gradient(135deg, #409EFF 0%, #66B1FF 100%);
  color: white;
  grid-column: span 3;
}

.stats-grid .stat-card.c-shift-efficiency,
.stats-grid .stat-card.a-shift-efficiency {
  min-width: 0;
  flex: 1;
  transition: background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
  box-sizing: border-box;
  width: 100%;
}

/* A班效率/C班效率卡片高亮效果 - 覆盖整个卡片 */
.stats-grid .stat-card.a-shift-efficiency.highlight,
.stats-grid .stat-card.c-shift-efficiency.highlight {
  background: linear-gradient(135deg, #409EFF 0%, #66B1FF 100%) !important;
  color: white !important;
  width: 100% !important;
  height: 100% !important;
}

.stats-grid .stat-card.a-shift-efficiency.highlight .stat-icon,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-icon {
  background: rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.stats-grid .stat-card.a-shift-efficiency.highlight .stat-label,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-label,
.stats-grid .stat-card.a-shift-efficiency.highlight .stat-value,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-value,
.stats-grid .stat-card.a-shift-efficiency.highlight .stat-sub,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-sub,
.stats-grid .stat-card.a-shift-efficiency.highlight .stat-success,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-success {
  color: white !important;
}

/* 高亮卡片中的未达标文字显示为红色 */
.stats-grid .stat-card.a-shift-efficiency.highlight .stat-warning,
.stats-grid .stat-card.c-shift-efficiency.highlight .stat-warning {
  color: #FFD2D2 !important;
}

.stats-grid .stat-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stats-grid .stat-card:not(.highlight) .stat-icon {
  background: #ECF5FF;
}

.stats-grid .stat-content {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.stats-grid .stat-label {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 2px;
  white-space: nowrap;
}

.stats-grid .stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.stats-grid .stat-sub {
  font-size: 10px;
  opacity: 0.85;
  margin-top: 2px;
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.stats-grid .stat-success {
  color: #C2E7B0;
}

.stats-grid .stat-warning {
  color: #FCD9D9;
}

/* 右侧面板 */
.right-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 25px;
  align-self: start;
  min-height: 260px;
  padding-left: 0;
}

/* 效率达标排名 - 左侧图表 */
.right-panel > :first-child {
}

/* 排名卡片高度与左侧面板对齐，下移10px */
.chart-card.ranking-card {
  height: auto;
  min-height: 320px;
  max-height: 320px;
}

/* 排名列表容器固定高度 */
.ranking-list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
  height: 265px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* 前三名行 */
.ranking-top3-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 4-10名行 */
.ranking-other-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.ranking-empty {
  width: 100%;
  text-align: center;
  color: #909399;
  padding: 30px 0;
  font-size: 14px;
}

.ranking-empty .empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

/* 前三名大卡片 */
.ranking-item-top3 {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #F5F7FA 0%, #FFFFFF 100%);
  border: 2px solid #EBEEF5;
  border-radius: 14px;
  min-width: 110px;
  flex: 1;
  max-width: 145px;
  transition: all 0.3s ease;
}

.ranking-item-top3:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 前三名特殊样式 */
.ranking-item-top3.rank-gold {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFFDE7 100%);
  border-color: #FFD700;
}

.ranking-item-top3.rank-silver {
  background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);
  border-color: #C0C0C0;
}

.ranking-item-top3.rank-bronze {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFF8F0 100%);
  border-color: #CD7F32;
}

.ranking-badge-top3 {
  font-size: 24px;
  margin-bottom: 6px;
}

.ranking-photo-top3 {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 8px;
  border: 3px solid #ECF5FF;
}

.ranking-item-top3.rank-gold .ranking-photo-top3 {
  border-color: #FFD700;
}

.ranking-item-top3.rank-silver .ranking-photo-top3 {
  border-color: #C0C0C0;
}

.ranking-item-top3.rank-bronze .ranking-photo-top3 {
  border-color: #CD7F32;
}

.ranking-photo-top3 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder-top3 {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ECF5FF, #E6EFFB);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

/* 4-10名小卡片 */
.ranking-item-other {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #F5F7FA 0%, #FFFFFF 100%);
  border: 1px solid #EBEEF5;
  border-radius: 10px;
  min-width: 130px;
  transition: all 0.3s ease;
}

.ranking-item-other:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.ranking-badge-small {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #909399, #606266);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.ranking-photo-small {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #ECF5FF;
}

.ranking-photo-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder-small {
  width: 100%;
  height: 100%;
  background: #ECF5FF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.ranking-info {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.ranking-item-top3 .ranking-info {
  width: 100%;
}

.ranking-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.ranking-item-top3 .ranking-name {
  font-size: 14px;
}

.ranking-percentage {
  font-size: 16px;
  font-weight: 700;
  color: #67C23A;
}

.ranking-item-top3.rank-gold .ranking-percentage {
  color: #E6A23C;
}

.ranking-item-top3.rank-silver .ranking-percentage {
  color: #909399;
}

.ranking-item-top3.rank-bronze .ranking-percentage {
  color: #CD7F32;
}

/* 差异警告排名 - 右侧图表，缩小40px */
.right-panel > :last-child {
  margin-left: 0;
  max-height: 320px;
  min-height: 320px;
}

.right-panel > :last-child .chart-container {
  height: 265px;
}

/* 图表空状态 */
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 265px;
  color: #909399;
}

.chart-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.chart-empty .empty-text {
  font-size: 14px;
}

/* 差异内容区域 - 左右布局 */
.diff-content {
  display: flex;
  gap: 12px;
  height: 260px;
}

/* 差异排名面板 */
.diff-ranking-panel {
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid #EBEEF5;
  padding-right: 12px;
  overflow-y: auto;
}

/* 差异明细面板 */
.diff-detail-panel {
  flex: 1;
  overflow: hidden;
}

/* 差异空状态 */
.diff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.diff-empty .empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.diff-empty .empty-text {
  font-size: 13px;
}

/* 差异排名表格 */
.diff-ranking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.diff-ranking-table th,
.diff-ranking-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #EBEEF5;
}

.diff-ranking-table th {
  background: #F5F7FA;
  color: #606266;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.diff-ranking-table .rank-cell {
  width: 40px;
  text-align: center;
}

.diff-ranking-table .rank-badge {
  font-size: 16px;
}

.diff-ranking-table .rank-num {
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  background: #909399;
  color: white;
  border-radius: 50%;
  font-size: 10px;
}

.diff-ranking-table .name-cell {
  font-weight: 500;
  color: #303133;
}

.diff-ranking-table .count-cell {
  text-align: right;
  color: #F56C6C;
  font-weight: 600;
}

.diff-ranking-table tbody tr {
  cursor: pointer;
}

.diff-ranking-table tbody tr:hover {
  background: #F5F7FA;
}

.diff-ranking-table tbody tr.highlight-row {
  background: #FEF0F0;
}

/* 差异明细表格包装器 */
.diff-table-wrapper {
  height: 100%;
  overflow-y: auto;
}

/* 差异明细表格 */
.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.diff-table th,
.diff-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #EBEEF5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.diff-table th {
  background: #F5F7FA;
  color: #606266;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.diff-table td {
  color: #303133;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diff-table td:last-child {
  max-width: 200px;
  cursor: pointer;
  color: #409EFF;
}

.diff-table td:last-child:hover {
  color: #66b1ff;
}

.diff-table tbody tr:hover {
  background: #F5F7FA;
}

/* 详情链接样式 */
.detail-link {
  color: #409EFF;
  cursor: pointer;
  text-decoration: none;
}

.detail-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

/* 详情内容样式 */
.detail-content {
  padding: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
  word-break: break-all;
}

/* 产出明细图表（与表格同宽） */
.chart-section {
  margin-bottom: 20px;
  width: 100%;
  overflow: visible !important;
  height: auto !important;
  min-height: 270px !important;
  position: relative;
  z-index: 1;
}

/* 图表卡片 */
.chart-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  z-index: 1;
  overflow: visible !important;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.chart-container {
  flex: 1;
  min-height: 125px;
  width: 100%;
}

.chart-card.wide {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  max-width: 100%;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-card.wide .chart-container {
  height: 230px !important;
  width: 100% !important;
  min-height: 230px !important;
}

/* 表格区域 */
.table-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  min-height: 480px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.table-container {
  overflow-x: auto;
}

.output-badges {
  display: flex;
  gap: 6px;
}

.output-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.output-badge.iws { background: #ECF5FF; color: #409EFF; }
.output-badge.flr { background: #F0F9EB; color: #67C23A; }
.output-badge.plr { background: #FDF6EC; color: #E6A23C; }

.grs-pl {
  font-size: 13px;
  color: #606266;
}

.efficiency-value {
  font-weight: 600;
}

.efficiency-high { color: #67C23A; }
.efficiency-medium { color: #E6A23C; }
.efficiency-low { color: #F56C6C; }

/* 备注单元格 */
.remark-cell {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  display: inline-block;
}

/* 表格滚动 */
.table-container {
  overflow: hidden;
}

/* 表格内容自动滚动 - 只滚动tbody */
:deep(.el-table__body) {
  animation: tableScroll 20s linear infinite;
}

:deep(.el-table__body-wrapper):hover .el-table__body {
  animation-play-state: paused;
}

@keyframes tableScroll {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}

/* 排名区域 */
.ranking-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.ranking-header {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.ranking-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #F5F7FA;
  border-radius: 8px;
  border: 1px solid #EBEEF5;
}

.ranking-item.top3 {
  background: linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%);
  border-color: #FCD34D;
}

.ranking-rank {
  width: 26px;
  height: 26px;
  background: #DCDFE6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  flex-shrink: 0;
}

.ranking-item.top3 .ranking-rank {
  background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%);
  color: white;
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-level {
  font-size: 11px;
  color: #909399;
}

.ranking-area {
  font-size: 11px;
  color: #606266;
  padding: 2px 6px;
  background: #ECF5FF;
  border-radius: 4px;
  white-space: nowrap;
}

.ranking-output {
  display: flex;
  gap: 4px;
  font-size: 10px;
}

.ranking-output span {
  padding: 2px 4px;
  border-radius: 3px;
}

.out-iws { background: #ECF5FF; color: #409EFF; }
.out-flr { background: #F0F9EB; color: #67C23A; }
.out-plr { background: #FDF6EC; color: #E6A23C; }

.ranking-percentage {
  font-size: 15px;
  font-weight: 700;
  min-width: 55px;
  text-align: right;
}

.ranking-percentage.efficiency-high { color: #67C23A; }
.ranking-percentage.efficiency-medium { color: #E6A23C; }
.ranking-percentage.efficiency-low { color: #F56C6C; }

/* 响应式 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .left-panel {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .shift-info-header {
    flex: 1;
    min-width: 260px;
  }

  .stats-grid {
    flex: 1;
    min-width: 300px;
  }

  .stat-card {
    flex: 1;
    min-width: 140px;
  }

  .right-panel {
    grid-template-columns: 1fr;
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid .stat-card.highlight:not(.a-shift-efficiency):not(.c-shift-efficiency),
  .stats-grid .stat-card.c-shift-efficiency,
  .stats-grid .stat-card.a-shift-efficiency {
    grid-column: span 1;
    max-width: 100%;
  }

  .stat-card {
    min-width: auto;
  }

  .ranking-list {
    grid-template-columns: 1fr;
  }
}
</style>
