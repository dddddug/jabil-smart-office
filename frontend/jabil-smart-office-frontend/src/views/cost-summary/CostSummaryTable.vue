<template>
  <div class="cost-summary-table overflow-x-auto bg-white p-4 rounded-lg shadow-md">
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
      <!-- 动态级别列 - 人数 -->
      <el-table-column
        v-for="level in uniqueLevels"
        :key="level.key"
        :label="level.label"
        min-width="70"
        align="center"
      >
        <template #default="scope">
          <el-tag v-if="scope.row.level_counts && scope.row.level_counts[level.key] > 0" type="success" size="small">
            {{ scope.row.level_counts[level.key] }}
          </el-tag>
          <span v-else class="text-gray-300">-</span>
        </template>
      </el-table-column>
      <!-- 动态级别列 - 工时 -->
      <el-table-column
        v-for="level in uniqueLevels"
        :key="'hours_' + level.key"
        :label="level.label + '工时'"
        min-width="80"
        align="center"
      >
        <template #default="scope">
          <span v-if="scope.row.level_hours && scope.row.level_hours[level.key] !== undefined">
            {{ (scope.row.level_hours[level.key] || 0).toFixed(1) }}
          </span>
          <span v-else class="text-gray-300">-</span>
        </template>
      </el-table-column>
      <!-- 动态级别列 - 费用 -->
      <el-table-column
        v-for="level in uniqueLevels"
        :key="'cost_' + level.key"
        :label="level.label + '费用'"
        min-width="90"
        align="right"
      >
        <template #default="scope">
          <span v-if="scope.row.level_costs && scope.row.level_costs[level.key] !== undefined" class="text-orange-600 font-medium">
            {{ formatCurrency(scope.row.level_costs[level.key]) }}
          </span>
          <span v-else class="text-gray-300">-</span>
        </template>
      </el-table-column>
      <el-table-column label="福利费用" min-width="100">
        <template #default="scope">
          {{ formatCurrency(scope.row.welfare_cost) }}
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
      <el-table-column label="费用消耗占比" min-width="150">
        <template #default="scope">
          <el-progress
            :percentage="Number((scope.row.consumptionRatio * 100).toFixed(2))"
            :color="getProgressBarColor(scope.row.consumptionRatio)"
            :stroke-width="10"
            text-inside
          />
        </template>
      </el-table-column>

      <el-table-column label="费用拆解明细" min-width="180">
        <template #default="scope">
          <el-popover effect="light" trigger="hover" placement="top" width="280px">
            <template #default>
              <p>岗位人数: {{ scope.row.employee_count || 0 }} 人</p>
              <p>工时基数: {{ scope.row.total_work_hours.toFixed(1) }} 小时</p>
              <p>时薪单价: {{ formatCurrency(scope.row.hourly_rate) }} /小时</p>
              <p>福利分摊: {{ formatCurrency(scope.row.welfare_cost) }}</p>
            </template>
            <template #reference>
              <el-button link size="small" class="text-blue-500 hover:text-blue-700">查看详情</el-button>
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

const props = defineProps({
  tableData: {
    type: Array,
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
const uniqueLevels = computed(() => {
  const levelSet = new Map();
  for (const item of props.tableData) {
    if (item.level_counts) {
      for (const [key, value] of Object.entries(item.level_counts)) {
        if (value > 0) {
          if (!levelSet.has(key)) {
            // 将 "level_6_level" 转换为 "6 Level" 等
            const match = key.match(/level_(\d+)_level/);
            const levelNum = match ? match[1] : key.replace(/level_(\d+)_.*/, '$1');
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
