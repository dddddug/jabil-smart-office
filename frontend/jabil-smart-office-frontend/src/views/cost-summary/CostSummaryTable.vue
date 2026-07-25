<template>
  <div class="cost-summary-table overflow-x-auto bg-white p-4 rounded-lg shadow-md">
    <el-table
      :data="tableData"
      v-loading="loading"
      row-key="id"
      default-expand-all
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      class="w-full"
      border
      stripe
      :cell-class-name="({ row, column, rowIndex, columnIndex }) => getCellClassName(row, column, rowIndex, columnIndex)"
    >
      <el-table-column prop="fiscal_month" label="财月" min-width="100"></el-table-column>
      <el-table-column prop="department_name" label="部门" min-width="150"></el-table-column>
      <el-table-column prop="position" label="岗位" min-width="120"></el-table-column>
      <el-table-column prop="personnel_type" label="人员类型" min-width="120"></el-table-column>
      <el-table-column label="可用预算额度" min-width="140">
        <template #default="scope">
          {{ formatCurrency(scope.row.available_budget) }}
        </template>
      </el-table-column>
      <el-table-column label="已消耗实际费用" min-width="140">
        <template #default="scope">
          {{ formatCurrency(scope.row.total_cost) }}
        </template>
      </el-table-column>
      <el-table-column label="剩余可用费用" min-width="140">
        <template #default="scope">
          {{ formatCurrency(scope.row.remainingCost) }}
        </template>
      </el-table-column>
      <el-table-column label="费用消耗占比" min-width="150">
        <template #default="scope">
          <el-progress
            :percentage="(scope.row.consumptionRatio * 100).toFixed(2)"
            :color="getProgressBarColor(scope.row.consumptionRatio)"
            :stroke-width="10"
            text-inside
          />
        </template>
      </el-table-column>
      
      <el-table-column label="费用拆解明细" min-width="180">
        <template #default="scope">
          <el-popover effect="light" trigger="hover" placement="top" width="250px">
            <template #default>
              <p>工时基数: {{ scope.row.total_work_hours }} 小时</p>
              <p>时薪单价: {{ formatCurrency(scope.row.hourly_rate) }} /小时</p>
              <p>福利分摊: {{ formatCurrency(scope.row.welfare_cost) }}</p>
            </template>
            <template #reference>
              <el-button type="text" size="small" class="text-blue-500 hover:text-blue-700">查看详情</el-button>
            </template>
          </el-popover>
        </template>
      </el-table-column>

      <!-- Other dynamic columns if needed -->
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
});

const emit = defineEmits(['page-change', 'size-change']);

const currentPage = ref(1);
const pageSize = ref(10);

const formatCurrency = (value: number | string): string => {
  if (value === null || value === undefined) return '-';
  return `$${parseFloat(value as string).toFixed(2)}`;
};

const getProgressBarColor = (ratio: number) => {
  if (ratio > 1) return '#F56C6C'; // Red for over 100%
  if (ratio > 0.8) return '#E6A23C'; // Yellow for over 80%
  return '#67C23A'; // Green otherwise
};

const getCellClassName = ({ row, column }: { row: any; column: any }) => {
  console.log('[getCellClassName] - row:', row);
  console.log('[getCellClassName] - column:', column);
  console.log('[getCellClassName] - column.property:', column?.property);
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
