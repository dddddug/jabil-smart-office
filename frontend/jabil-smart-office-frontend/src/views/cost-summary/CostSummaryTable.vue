<template>
  <div class="cost-summary-table bg-white p-4 rounded-lg shadow-md">
    <el-table
      :data="tableData"
      v-loading="loading"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      class="w-full"
      border
      stripe
      :row-class-name="getRowClassName"
      :cell-class-name="(params: { row: any; column: any; rowIndex: number; columnIndex: number }) => getCellClassName(params)"
      show-summary
      :summary-method="getSummaryData"
    >
      <el-table-column :prop="timeDimension === 'weekly' ? 'fiscal_week' : timeDimension === 'yearly' ? 'fiscal_year' : 'fiscal_month'" :label="periodColumnLabel" min-width="120">
        <template #default="scope">
          <div class="flex items-center gap-1">
            <span v-if="timeDimension === 'daily' && isAnomalyDate(scope.row.fiscal_date)" class="anomaly-badge">
              ⚠️
            </span>
            {{ getPeriodDisplay(scope.row) }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="department_name" label="部门" min-width="150"></el-table-column>
      <el-table-column prop="position" label="岗位" min-width="150"></el-table-column>
      <el-table-column prop="employee_count" label="人数" min-width="80" align="center">
        <template #default="scope">
          <el-tag type="info" size="small">{{ scope.row.employee_count || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="福利费用" min-width="100">
        <template #default="scope">
          {{ formatCurrency(scope.row.welfare_cost) }}
        </template>
      </el-table-column>
      <el-table-column label="工时费用" min-width="100">
        <template #default="scope">
          {{ formatCurrency(getWorkHoursCost(scope.row)) }}
        </template>
      </el-table-column>
      <el-table-column label="可用预算额度" min-width="110">
        <template #default="scope">
          {{ formatCurrency(scope.row.available_budget) }}
        </template>
      </el-table-column>
      <el-table-column label="已消耗实际费用" min-width="140">
        <template #default="scope">
          {{ formatCurrency(scope.row.total_cost) }}
        </template>
      </el-table-column>
      <el-table-column label="费用消耗占比" min-width="180">
        <template #default="scope">
          <div class="flex items-center">
            <el-progress
              :percentage="Number(((scope.row.consumptionRatio || 0) * 100).toFixed(2))"
              :color="getProgressBarColor(scope.row.consumptionRatio || 0)"
              :stroke-width="10"
              :show-text="false"
              class="flex-1 mr-2"
            />
            <span class="text-xs whitespace-nowrap">{{ ((scope.row.consumptionRatio || 0) * 100).toFixed(1) }}%</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="费用拆解明细" min-width="160">
        <template #default="scope">
          <el-popover effect="light" trigger="hover" placement="top" width="320px">
            <template #default>
              <div class="text-sm space-y-1">
                <p class="font-medium mb-2">费用拆解明细</p>
                <div v-for="level in getLevelDetails(scope.row)" :key="level.key">
                  <p v-if="level.count > 0">
                    <span class="font-medium">{{ level.label }}:</span>
                    人数 {{ level.count }}, 工时 {{ level.hours.toFixed(1) }}h, 费用 {{ formatCurrency(level.cost) }}
                  </p>
                </div>
                <p class="mt-2 pt-2 border-t">
                  <span class="font-medium">福利费用:</span> {{ formatCurrency(scope.row.welfare_cost) }}
                </p>
                <p>
                  <span class="font-medium">工时总数:</span> {{ scope.row.total_work_hours.toFixed(1) }}h
                </p>
              </div>
            </template>
            <template #reference>
              <el-button link size="small" class="text-blue-500 hover:text-blue-700">查看详情</el-button>
            </template>
          </el-popover>
        </template>
        <template #summary>
          <el-popover effect="light" trigger="click" placement="top" width="380px">
            <template #default>
              <div class="text-sm">
                <p class="font-bold text-base mb-3 text-center border-b pb-2">费用拆解明细汇总</p>
                <div v-for="level in summaryLevelData" :key="level.key" class="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <span class="font-medium">{{ level.label }}:</span>
                  <span>人数 {{ level.count }}, 工时 {{ level.hours.toFixed(1) }}h, 费用 {{ formatCurrency(level.cost) }}</span>
                </div>
                <div class="mt-3 pt-2 border-t-2 border-gray-300">
                  <p class="flex justify-between"><span class="font-medium">福利费用:</span> <span>{{ formatCurrency(summaryWelfareCost) }}</span></p>
                  <p class="flex justify-between"><span class="font-medium">工时总数:</span> <span>{{ summaryTotalHours.toFixed(1) }}h</span></p>
                  <p class="flex justify-between"><span class="font-medium">工时费用:</span> <span>{{ formatCurrency(summaryWorkCost) }}</span></p>
                  <p class="flex justify-between text-blue-600 font-bold"><span>总费用:</span> <span>{{ formatCurrency(summaryConsumed) }}</span></p>
                </div>
              </div>
            </template>
            <template #reference>
              <el-button link size="small" type="primary">查看详情</el-button>
            </template>
          </el-popover>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      :current-page="currentPage"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      background
      class="pagination mt-4 flex justify-end"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface TableRowItem {
  employee_count?: number;
  welfare_cost?: number;
  total_cost?: number;
  available_budget?: number;
  level_counts?: Record<string, number>;
  level_hours?: Record<string, number>;
  level_costs?: Record<string, number>;
  total_work_hours?: number;
  [key: string]: unknown;
}

const props = defineProps({
  tableData: {
    type: Array as () => TableRowItem[],
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  timeDimension: {
    type: String,
    default: 'weekly',
  },
  // 日度维度：异常数据
  anomalyData: {
    type: Object,
    default: () => ({
      anomalyFlags: [], // 每日异常标记数组
      anomalyDates: [], // 异常日期列表
    }),
  },
  allData: {
    type: Array as () => TableRowItem[],
    default: () => [],
  },
});

const emit = defineEmits(['page-change', 'size-change']);

// 根据时间维度计算时间列标签
const periodColumnLabel = computed(() => {
  switch (props.timeDimension) {
    case 'daily':
      return '日期';
    case 'weekly':
      return '财周';
    case 'yearly':
      return '财年';
    case 'monthly':
    default:
      return '财月 (24日-23日)';
  }
});

// 提取所有级别列配置（按级别名称排序）
interface LevelEntry {
  key: string;
  label: string;
}

const uniqueLevels = computed(() => {
  const levelSet = new Map<string, LevelEntry>();
  for (const item of props.tableData as TableRowItem[]) {
    if (item.level_counts) {
      for (const [key, value] of Object.entries(item.level_counts)) {
        // 过滤掉 unknown 级别和没有人数的级别
        if ((value as number) > 0 && !key.toLowerCase().includes('unknown')) {
          if (!levelSet.has(key)) {
            // 将 "level_6_level" 转换为 "6 Level" 等
            const match = key.match(/level_(\d+)_level/);
            const levelNum = match && match[1] ? match[1] : key.replace(/level_(\d+)_.*/, '$1');
            levelSet.set(key, { key, label: `${levelNum} Level` });
          }
        }
      }
    }
  }
  return Array.from(levelSet.values()).sort((a, b) => {
    // 按级别数字排序（6级在前）
    const numA = parseInt(a.label);
    const numB = parseInt(b.label);
    return numB - numA;
  });
});

// 获取级别详情（用于费用拆解明细）
const getLevelDetails = (row: TableRowItem) => {
  return uniqueLevels.value.map(level => ({
    key: level.key,
    label: level.label,
    count: row.level_counts?.[level.key] || 0,
    hours: row.level_hours?.[level.key] || 0,
    cost: row.level_costs?.[level.key] || 0,
  }));
};

// 计算工时费用（各级别费用总和）
const getWorkHoursCost = (row: TableRowItem): number => {
  if (!row.level_costs) return 0;
  return Object.values(row.level_costs).reduce((sum: number, cost: number) => sum + (cost || 0), 0);
};

// 获取时间周期显示值
const getPeriodDisplay = (row: any): string => {
  switch (props.timeDimension) {
    case 'daily':
      return row.fiscal_date || '-';
    case 'weekly':
      return row.fiscal_week || '-';
    case 'yearly':
      return row.fiscal_year || '-';
    case 'monthly':
    default:
      return row.fiscal_month || '-';
  }
};

const currentPage = ref(1);
const pageSize = ref(10);

// 检查日期是否有异常
const isAnomalyDate = (fiscalDate: string): boolean => {
  if (!fiscalDate || !props.anomalyData?.anomalyDates) return false;
  return props.anomalyData.anomalyDates.includes(fiscalDate);
};

// 获取行样式类名
const getRowClassName = ({ row }: { row: any }): string => {
  if (props.timeDimension === 'daily') {
    const fiscalDate = row.fiscal_date;
    if (isAnomalyDate(fiscalDate)) {
      return 'anomaly-row';
    }
  }
  // 基于费用消耗比例的风险等级
  if (row.consumptionRatio > 1) {
    return 'risk-red-row';
  } else if (row.consumptionRatio > 0.8) {
    return 'risk-yellow-row';
  }
  return '';
};

const formatCurrency = (value: number | string): string => {
  if (value === null || value === undefined) return '-';
  return `$${parseFloat(value as string).toFixed(2)}`;
};

const getProgressBarColor = (ratio: number) => {
  if (ratio > 1) return '#F56C6C'; // Red for over 100%
  if (ratio > 0.8) return '#E6A23C'; // Yellow for over 80%
  return '#67C23A'; // Green otherwise
};

const getCellClassName = ({ row, column, rowIndex, columnIndex }: { row: any; column: any; rowIndex: number; columnIndex: number }) => {
  if (column && column.property === 'consumptionRatio') {
    if (row.consumptionRatio > 1) {
      return 'risk-red';
    } else if (row.consumptionRatio > 0.8) {
      return 'risk-yellow';
    }
  }
  return '';
};


const handleSizeChange = (val: number) => {
  pageSize.value = val;
  emit('size-change', val);
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  emit('page-change', val);
};

const getSummaryData = ({ data }: { data: TableRowItem[] }) => {
  const sums: (string | number)[] = [];
  sums[0] = '总计';
  sums[1] = '';
  sums[2] = '';
  sums[3] = data.reduce((sum, row) => sum + (row.employee_count || 0), 0);
  sums[4] = formatCurrency(data.reduce((sum, row) => sum + (row.welfare_cost || 0), 0));
  sums[5] = formatCurrency(data.reduce((sum, row) => sum + getWorkHoursCost(row), 0));
  sums[6] = formatCurrency(data.reduce((sum, row) => sum + (row.available_budget || 0), 0));
  sums[7] = formatCurrency(data.reduce((sum, row) => sum + (row.total_cost || 0), 0));
  const totalBudget = data.reduce((sum, row) => sum + (row.available_budget || 0), 0);
  const totalConsumed = data.reduce((sum, row) => sum + (row.total_cost || 0), 0);
  const totalRatio = totalBudget > 0 ? (totalConsumed / totalBudget) : 0;
  sums[8] = `${(totalRatio * 100).toFixed(1)}%`;
  sums[9] = '';
  return sums;
};

// 汇总行计算属性（基于 allData 全量数据）
const summaryEmployees = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + (row.employee_count || 0), 0);
});

const summaryWelfareCost = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + (row.welfare_cost || 0), 0);
});

const summaryWorkCost = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + getWorkHoursCost(row), 0);
});

const summaryBudget = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + (row.available_budget || 0), 0);
});

const summaryConsumed = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + (row.total_cost || 0), 0);
});

const summaryRatio = computed(() => {
  return summaryBudget.value > 0 ? (summaryConsumed.value / summaryBudget.value) : 0;
});

const summaryTotalHours = computed(() => {
  return (props.allData as TableRowItem[]).reduce((sum, row) => sum + (row.total_work_hours || 0), 0);
});

// 费用拆解汇总（基于 allData）
const summaryLevelData = computed(() => {
  const summary: Record<string, { count: number; hours: number; cost: number }> = {};
  for (const row of props.allData as TableRowItem[]) {
    for (const level of uniqueLevels.value) {
      if (!summary[level.key]) {
        summary[level.key] = { count: 0, hours: 0, cost: 0 };
      }
      const entry = summary[level.key]!;
      entry.count += row.level_counts?.[level.key] || 0;
      entry.hours += row.level_hours?.[level.key] || 0;
      entry.cost += row.level_costs?.[level.key] || 0;
    }
  }
  return uniqueLevels.value.map(level => ({
    key: level.key,
    label: level.label,
    count: summary[level.key]?.count || 0,
    hours: summary[level.key]?.hours || 0,
    cost: summary[level.key]?.cost || 0,
  }));
});

const getRatioClass = (ratio: number): string => {
  if (ratio > 1) return 'text-red-600';
  if (ratio > 0.8) return 'text-yellow-600';
  return 'text-green-600';
};

// 分页数据汇总（用于表格各列小计）
const totalEmployees = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + (row.employee_count || 0), 0);
});

const totalWelfareCost = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + (row.welfare_cost || 0), 0);
});

const totalWorkCost = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + getWorkHoursCost(row), 0);
});

const totalBudget = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + (row.available_budget || 0), 0);
});

const totalConsumed = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + (row.total_cost || 0), 0);
});

const totalRatio = computed(() => {
  return totalBudget.value > 0 ? (totalConsumed.value / totalBudget.value) : 0;
});

const totalWorkHours = computed(() => {
  return (props.tableData as TableRowItem[]).reduce((sum, row) => sum + (row.total_work_hours || 0), 0);
});

// 费用拆解（用于各行详情）
const levelSummary = computed(() => {
  const summary: Record<string, { count: number; hours: number; cost: number }> = {};
  for (const row of props.tableData as TableRowItem[]) {
    for (const level of uniqueLevels.value) {
      if (!summary[level.key]) {
        summary[level.key] = { count: 0, hours: 0, cost: 0 };
      }
      const entry = summary[level.key]!;
      entry.count += row.level_counts?.[level.key] || 0;
      entry.hours += row.level_hours?.[level.key] || 0;
      entry.cost += row.level_costs?.[level.key] || 0;
    }
  }
  return uniqueLevels.value.map(level => ({
    key: level.key,
    label: level.label,
    count: summary[level.key]?.count || 0,
    hours: summary[level.key]?.hours || 0,
    cost: summary[level.key]?.cost || 0,
  }));
});
</script>

<style scoped>
/* 日度异常行样式 */
:deep(.anomaly-row) {
  background-color: #fff2e8 !important;
}

:deep(.anomaly-row:hover > td) {
  background-color: #ffd6b3 !important;
}

:deep(.risk-red-row) {
  background-color: #fff1f0 !important;
}

:deep(.risk-red-row:hover > td) {
  background-color: #ffccc7 !important;
}

:deep(.risk-yellow-row) {
  background-color: #fffbe6 !important;
}

:deep(.risk-yellow-row:hover > td) {
  background-color: #ffe58f !important;
}

/* 异常日期徽章 */
.anomaly-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #ff4d4f;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
