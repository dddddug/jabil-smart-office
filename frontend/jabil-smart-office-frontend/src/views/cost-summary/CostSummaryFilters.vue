<template>
  <div class="cost-summary-filters p-2 rounded-2xl shadow-xl" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
    <el-form :inline="true" :model="form" class="filter-form flex flex-nowrap gap-x-1 items-center">
      <el-form-item class="mb-0">
        <div class="flex items-center">
          <span class="text-xs text-gray-600 mr-0.5" style="width: 90px; height: 32px; margin-top: 0; margin-bottom: 0;">时间</span>
          <el-select v-model="timeDimension" placeholder="维度" @change="handleTimeDimensionChange" class="w-24" style="margin-left: -10px; margin-right: -10px;">
            <el-option label="日度" value="daily"></el-option>
            <el-option label="周度" value="weekly"></el-option>
            <el-option label="月度" value="monthly"></el-option>
            <el-option label="年度" value="yearly"></el-option>
          </el-select>
        </div>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-date-picker
          v-if="timeDimension === 'monthly'"
          v-model="form.fiscalMonth"
          type="month"
          placeholder="选择"
          value-format="YYYY-MM"
          @change="emitFilterChange"
          class="w-24"
        />
        <el-date-picker
          v-else-if="timeDimension === 'yearly'"
          v-model="form.fiscalYear"
          type="year"
          placeholder="选择"
          value-format="YYYY"
          @change="emitFilterChange"
          class="w-24"
        />
        <el-date-picker
          v-else-if="timeDimension === 'daily'"
          v-model="form.fiscalDate"
          type="date"
          placeholder="选择"
          value-format="YYYY-MM-DD"
          @change="emitFilterChange"
          class="w-24"
        />
        <el-select
          v-else-if="timeDimension === 'weekly'"
          v-model="form.fiscalWeek"
          placeholder="选择"
          @change="emitFilterChange"
          class="w-32"
          style="width: 220px; margin-left: -10px; margin-right: -10px;"
        >
          <el-option
            v-for="week in weekOptions"
            :key="week.value"
            :label="week.label"
            :value="week.value"
          />
        </el-select>
        <el-date-picker
          v-else-if="timeDimension === 'customRange'"
          v-model="form.customDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DD"
          @change="emitFilterChange"
          class="w-32" style="width: 165px; margin-left: -10px; margin-right: -10px;"
        />
      </el-form-item>

      <el-form-item class="mb-0">
        <el-select
          v-model="form.departmentId"
          placeholder="部门"
          clearable
          filterable
          @change="emitFilterChange"
          class="w-14" style="width: 120px; margin-left: -10px; margin-right: -10px;"
        >
          <el-option
            v-for="dept in departmentOptions"
            :key="dept.id"
            :label="dept.name"
            :value="dept.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-select
          v-model="form.position"
          placeholder="岗位"
          clearable
          filterable
          @change="emitFilterChange"
          class="w-14" style="width: 120px; margin-left: -10px; margin-right: -10px;"
        >
          <el-option
            v-for="pos in positionOptions"
            :key="pos"
            :label="pos"
            :value="pos"
          />
        </el-select>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-select
          v-model="form.plantId"
          placeholder="厂区"
          clearable
          filterable
          @change="emitFilterChange"
          class="w-14" style="width: 120px; padding-left: 15px; padding-right: 15px; margin-left: -10px; margin-right: -10px; margin-top: 0; margin-bottom: 0;"
        >
          <el-option
            v-for="plant in plantOptions"
            :key="plant.id"
            :label="plant.name"
            :value="plant.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-button type="primary" @click="emitFilterChange" class="w-12">查询</el-button>
      </el-form-item>

      <el-form-item class="mb-0">
        <el-button type="success" @click="emitExportData" class="w-16">导出</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import dayjs from '@/plugins/dayjs';
import { ElMessage } from 'element-plus';
import { getCostSummaryDropdowns } from '@/api/costSummary';
import { getUserInfo } from '@/api/user'; // Assuming API for user info
import { getToken } from '@/utils/request'; // 导入 getToken

const emit = defineEmits(['filter-change', 'export-data', 'time-dimension-change']);

const timeDimension = ref('daily'); // Default time dimension

// 获取默认财周（格式: YYYY-WXX）
const getDefaultFiscalWeek = () => {
  const lastWeek = dayjs().subtract(1, 'week');
  const year = lastWeek.isoWeekYear();
  const week = lastWeek.isoWeek();
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

const form = reactive({
  fiscalDate: dayjs().format('YYYY-MM-DD'),
  fiscalMonth: dayjs().subtract(1, 'month').format('YYYY-MM'),
  fiscalYear: dayjs().format('YYYY'),
  fiscalWeek: getDefaultFiscalWeek(),
  customDateRange: [
    dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ],
  departmentId: null as number | null,
  position: null as string | null,
  plantId: null as number | null,
});

const departmentOptions = ref<any[]>([]);
const plantOptions = ref<any[]>([]);
const positionOptions = ref<string[]>([]);
const currentUserRole = ref<string>('');
const currentUserPlantId = ref<number | null>(null);
const currentUserDepartmentId = ref<number | null>(null);

// 生成周选项列表（过去52周）
const weekOptions = computed(() => {
  const options = [];
  const today = dayjs();
  for (let i = 0; i < 52; i++) {
    const date = today.subtract(i, 'week');
    const year = date.isoWeekYear();
    const week = date.isoWeek();
    // 计算该周的周一和周日
    const monday = date.startOf('week').add(1, 'day'); // ISO week starts from Monday
    const sunday = monday.add(6, 'day');
    const value = `${year}-W${week.toString().padStart(2, '0')}`;
    const label = `${value} (${monday.format('MM-DD')} ~ ${sunday.format('MM-DD')})`;
    options.push({ value, label });
  }
  return options;
});

const showPlantFilter = computed(() => {
  return currentUserRole.value === 'super_admin' || currentUserRole.value === 'ic_manager';
});

const fetchFilterOptions = async () => {
  try {
    // Only fetch user info if a token is present
    if (getToken()) {
      const userInfoRes = await getUserInfo();
      const userInfoData = userInfoRes.data || userInfoRes;
      currentUserRole.value = userInfoData.roleName;
      currentUserPlantId.value = userInfoData.plantId;
      currentUserDepartmentId.value = userInfoData.departmentId;

      if (currentUserRole.value === 'plant_admin') {
        form.plantId = currentUserPlantId.value;
      } else if (currentUserRole.value === 'department_admin' || currentUserRole.value === 'normal_employee') {
        form.departmentId = currentUserDepartmentId.value;
      }
    } else {
      // If no token, clear any existing user info related states
      currentUserRole.value = '';
      currentUserPlantId.value = null;
      currentUserDepartmentId.value = null;
    }

    // 使用 Cost Summary 专用的下拉框 API
    const dropdownsRes = await getCostSummaryDropdowns();
    const dropdownsData = dropdownsRes?.data || dropdownsRes;
    const { plants, departments, positions } = dropdownsData || {};

    // 厂区选项
    if (currentUserRole.value === 'plant_admin' && currentUserPlantId.value) {
      plantOptions.value = (plants || []).filter((p: any) => p.id === currentUserPlantId.value);
    } else {
      plantOptions.value = plants || [];
    }

    // 部门选项 (注意：API 返回的是 plantId 不是 plant_id)
    if (currentUserRole.value === 'plant_admin' && currentUserPlantId.value) {
      departmentOptions.value = (departments || []).filter((d: any) => d.plantId === currentUserPlantId.value);
    } else if (currentUserRole.value === 'department_admin' && currentUserDepartmentId.value) {
      departmentOptions.value = (departments || []).filter((d: any) => d.id === currentUserDepartmentId.value);
    } else if (currentUserRole.value === 'normal_employee' && currentUserDepartmentId.value) {
      departmentOptions.value = (departments || []).filter((d: any) => d.id === currentUserDepartmentId.value);
    } else {
      departmentOptions.value = departments || [];
    }

    // 岗位选项
    positionOptions.value = positions || [];

  } catch (error: any) {
    console.error('获取筛选条件失败:', error);
    ElMessage.error({ message: error.message || '获取筛选条件失败', showClose: true, duration: 3000 });
  }
};

const handleTimeDimensionChange = (newDimension: string) => {
  switch (newDimension) {
    case 'daily':
      form.fiscalDate = dayjs().format('YYYY-MM-DD');
      break;
    case 'monthly':
      form.fiscalMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
      break;
    case 'yearly':
      form.fiscalYear = dayjs().format('YYYY');
      break;
    case 'weekly':
      form.fiscalWeek = getDefaultFiscalWeek();
      break;
    default:
      break;
  }
  emitFilterChange();
  emit('time-dimension-change', newDimension);
};

const emitFilterChange = () => {
  const filters: any = { departmentId: form.departmentId, position: form.position, plantId: form.plantId };
  switch (timeDimension.value) {
    case 'daily':
      filters.fiscalDate = form.fiscalDate;
      break;
    case 'monthly':
      filters.fiscalMonth = form.fiscalMonth;
      break;
    case 'yearly':
      filters.fiscalYear = form.fiscalYear;
      break;
    case 'weekly':
      filters.fiscalWeek = form.fiscalWeek;
      break;
    default:
      break;
  }
  emit('filter-change', filters);
};

const emitExportData = () => {
  const filters: any = { departmentId: form.departmentId, position: form.position, plantId: form.plantId };
  switch (timeDimension.value) {
    case 'daily':
      filters.fiscalDate = form.fiscalDate;
      break;
    case 'monthly':
      filters.fiscalMonth = form.fiscalMonth;
      break;
    case 'yearly':
      filters.fiscalYear = form.fiscalYear;
      break;
    case 'weekly':
      filters.fiscalWeek = form.fiscalWeek;
      break;
    default:
      break;
  }
  emit('export-data', filters);
};

const resetFilters = () => {
  timeDimension.value = 'daily';
  form.fiscalDate = dayjs().format('YYYY-MM-DD');
  form.fiscalMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  form.fiscalYear = dayjs().format('YYYY');
  form.fiscalWeek = dayjs().subtract(1, 'week').format('YYYY-[W]WW');
  form.departmentId = null;
  form.position = null;
  if (currentUserRole.value === 'plant_admin') {
    form.plantId = currentUserPlantId.value;
  } else if (currentUserRole.value === 'department_admin' || currentUserRole.value === 'normal_employee') {
    form.departmentId = currentUserDepartmentId.value;
  } else {
    form.plantId = null;
  }
  emitFilterChange();
};

onMounted(async () => {
  try {
    await fetchFilterOptions();
  } catch (e) {
    console.error('获取筛选条件失败:', e);
  }
  emitFilterChange();
});
</script>
