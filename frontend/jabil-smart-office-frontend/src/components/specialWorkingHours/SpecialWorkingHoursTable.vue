<template>
  <div class="special-working-hours-table">
    <el-table
      :data="tableData"
      :key="tableKey"
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55"></el-table-column>
      <el-table-column prop="date" label="日期" width="120"></el-table-column>
      <el-table-column prop="event" label="事项"></el-table-column>
      <el-table-column prop="oldEmployeeId" label="工号" width="100"></el-table-column>
      <el-table-column prop="employeeName" label="姓名" width="100"></el-table-column>
      <el-table-column prop="startTime" label="开始时间" width="100" :formatter="formatTime"></el-table-column>
      <el-table-column prop="endTime" label="结束时间" width="100" :formatter="formatTime"></el-table-column>
      <el-table-column label="用时" width="100" :formatter="calculateDuration"></el-table-column>
      <el-table-column prop="registeredBy" label="登记人" width="100"></el-table-column>
      <!-- 操作列已移除 -->
    </el-table>

    <el-pagination
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      :current-page="pagination.pageNum"
      :page-sizes="[20, 50, 100]"
      :page-size="pagination.pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      background
    >
    </el-pagination>
  </div>
</template>

<script>
import dayjs from '@/plugins/dayjs';

export default {
  name: 'SpecialWorkingHoursTable',
  props: {
    tableData: {
      type: Array,
      default: () => []
    },
    total: {
      type: Number,
      default: 0
    },
    pagination: {
      type: Object,
      default: () => ({ pageNum: 1, pageSize: 20 })
    },
    startDate: {
      type: String,
      default: ''
    },
    endDate: {
      type: String,
      default: ''
    }
  },
  watch: {
    tableData: {
      handler(newVal, oldVal) {
        if (newVal.length > 0) {
        }
      },
      deep: true,
      immediate: true
    }
  },
  computed: {
    tableKey() {
      const key = `${this.startDate}-${this.endDate}`;
      return key;
    }
  },
  data() {
    return {
      multipleSelection: []
    }
  },
  methods: {
    handleSelectionChange(val) {
      this.multipleSelection = val
      this.$emit('selection-change', val)
    },
    handleSizeChange(val) {
      this.$emit('size-change', val)
    },
    handleCurrentChange(val) {
      this.$emit('current-change', val)
    },
    // Formatter for startTime and endTime
    formatTime(row, column, cellValue) {
      if (!cellValue) return '';
      // Assuming cellValue could be 'HH:mm' or 'YYYY-MM-DD HH:mm:ss'
      return dayjs(cellValue, ['HH:mm', 'YYYY-MM-DD HH:mm:ss']).format('HH:mm');
    },
    // Formatter to calculate and display duration
    calculateDuration(row, column, cellValue) {
      const startTime = dayjs(row.startTime, ['HH:mm', 'YYYY-MM-DD HH:mm:ss']);
      const endTime = dayjs(row.endTime, ['HH:mm', 'YYYY-MM-DD HH:mm:ss']);

      if (!startTime.isValid() || !endTime.isValid()) {
        return '';
      }

      const durationMinutes = endTime.diff(startTime, 'minute');

      if (durationMinutes < 0) {
        return '无效时间'; // End time is before start time
      }

      const totalHours = (durationMinutes / 60).toFixed(1);
      return `${totalHours}H`;
    }
  }
}
</script>

<style scoped>
.special-working-hours-table {
  margin-top: 20px;
}
.el-pagination {
  margin-top: 20px;
  text-align: right;
}
</style>
