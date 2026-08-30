<template>
  <div class="material-package-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">仓储管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">MaterialPackage</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">📦 MaterialPackage</div>
        <div class="table-card-actions">
          <button type="button" class="btn btn-secondary" @click="handleExport">📥 导出</button>
          <button type="button" class="btn btn-secondary" @click="showImportDialog = true">📤 批量导入</button>
          <button type="button" class="btn btn-primary" @click="openAddDialog">➕ 新增</button>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-item">
          <label>PartNo：</label>
          <input type="text" v-model="searchParams.partNo" placeholder="请输入PartNo" @keyup.enter="handleSearch" />
        </div>
        <div class="search-item">
          <label>MaterialGroup：</label>
          <input type="text" v-model="searchParams.materialGroup" placeholder="请输入MaterialGroup" @keyup.enter="handleSearch" />
        </div>
        <div class="search-item">
          <label>Manufacturer：</label>
          <input type="text" v-model="searchParams.manufacturer" placeholder="请输入Manufacturer" @keyup.enter="handleSearch" />
        </div>
        <div class="search-actions">
          <button type="button" class="btn btn-secondary" @click="handleReset">🔄 重置</button>
          <button type="button" class="btn btn-primary" @click="handleSearch">🔍 搜索</button>
        </div>
      </div>

      <div class="card-body" style="padding: 0;">
        <!-- 图表分析区域 -->
        <div v-if="chartData.length > 0" class="charts-section">
          <div class="charts-header">
            <span class="charts-title">📊 数据分析</span>
            <button type="button" class="btn-icon" @click="showCharts = !showCharts" :title="showCharts ? '收起图表' : '展开图表'">
              {{ showCharts ? '▲' : '▼' }}
            </button>
          </div>
          <div v-if="showCharts" class="charts-container">
            <div class="chart-wrapper">
              <div class="chart-title">MaterialGroup 分布</div>
              <div ref="materialGroupChartRef" class="chart"></div>
            </div>
            <div class="chart-wrapper">
              <div class="chart-title">Manufacturer 分布</div>
              <div ref="manufacturerChartRef" class="chart"></div>
            </div>
            <div class="chart-wrapper">
              <div class="chart-title">规格 分布</div>
              <div ref="specChartRef" class="chart"></div>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 60px;">序号</th>
                <th>PartNo</th>
                <th>MaterialGroup</th>
                <th>Manufacturer</th>
                <th>规格</th>
                <th>长(cm)</th>
                <th>宽(cm)</th>
                <th>高(cm)</th>
                <th>厚度(mm)</th>
                <th>备注</th>
                <th style="width: 120px;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in tableData" :key="item.id">
                <td class="text-center">{{ (pagination.page - 1) * pagination.pageSize + index + 1 }}</td>
                <td>{{ item.partNo }}</td>
                <td>{{ item.materialGroup || '-' }}</td>
                <td>{{ item.manufacturer || '-' }}</td>
                <td>{{ item.spec || '-' }}</td>
                <td class="text-center">{{ item.length ?? '-' }}</td>
                <td class="text-center">{{ item.width ?? '-' }}</td>
                <td class="text-center">{{ item.height ?? '-' }}</td>
                <td class="text-center">{{ item.thickness ?? '-' }}</td>
                <td>{{ item.remark || '-' }}</td>
                <td class="text-center">
                  <button type="button" class="btn-icon" @click="openEditDialog(item)" title="编辑">✏️</button>
                  <button type="button" class="btn-icon btn-delete" @click="handleDelete(item)" title="删除">🗑️</button>
                </td>
              </tr>
              <tr v-if="tableData.length === 0">
                <td colspan="11" class="text-center empty-tip">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title">{{ isEdit ? '编辑 MaterialPackage' : '新增 MaterialPackage' }}</div>
          <button type="button" class="dialog-close" @click="closeDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-row">
            <div class="form-item required">
              <label>PartNo：</label>
              <input type="text" v-model="formData.partNo" placeholder="请输入PartNo" :disabled="isEdit" />
            </div>
            <div class="form-item">
              <label>MaterialGroup：</label>
              <input type="text" v-model="formData.materialGroup" placeholder="请输入MaterialGroup" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>Manufacturer：</label>
              <input type="text" v-model="formData.manufacturer" placeholder="请输入Manufacturer" />
            </div>
            <div class="form-item">
              <label>规格：</label>
              <input type="text" v-model="formData.spec" placeholder="请输入规格" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>长度(cm)：</label>
              <input type="number" v-model.number="formData.length" placeholder="请输入长度" step="0.01" />
            </div>
            <div class="form-item">
              <label>宽度(cm)：</label>
              <input type="number" v-model.number="formData.width" placeholder="请输入宽度" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>高度(cm)：</label>
              <input type="number" v-model.number="formData.height" placeholder="请输入高度" step="0.01" />
            </div>
            <div class="form-item">
              <label>厚度(mm)：</label>
              <input type="number" v-model.number="formData.thickness" placeholder="请输入厚度" step="0.01" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item" style="flex: 2;">
              <label>备注：</label>
              <textarea v-model="formData.remark" placeholder="请输入备注" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeDialog">取消</button>
          <button type="button" class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showImportDialog" class="dialog-overlay" @click.self="closeImportDialog">
      <div class="dialog dialog-import">
        <div class="dialog-header">
          <div class="dialog-title">📤 批量导入物料包装信息</div>
          <button type="button" class="dialog-close" @click="closeImportDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="import-tips">
            <p><strong>导入说明：</strong></p>
            <ul>
              <li>请下载模板文件，按格式填写数据后上传</li>
              <li>物料号为必填项，其他字段可选</li>
              <li>如果物料号已存在，将更新该记录</li>
              <li>支持 .xlsx 和 .xls 格式</li>
            </ul>
          </div>
          <div class="import-actions">
            <button type="button" class="btn btn-secondary" @click="downloadTemplate">📥 下载导入模板</button>
            <button type="button" class="btn btn-secondary" @click="triggerFileInput">📁 选择Excel文件</button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              style="display: none;"
              @change="handleFileChange"
            />
          </div>
          <div v-if="importFileName" class="import-file-info">
            已选择文件：{{ importFileName }}
          </div>
          <div v-if="importResult" class="import-result" :class="(importResult.errors?.length ?? 0) > 0 ? 'has-errors' : ''">
            <p v-if="importResult.inserted !== undefined">✅ 新增：{{ importResult.inserted }} 条</p>
            <p v-if="importResult.updated !== undefined">🔄 更新：{{ importResult.updated }} 条</p>
            <div v-if="(importResult.errors?.length ?? 0) > 0" class="import-errors">
              <p class="error-title">❌ 失败记录：</p>
              <ul>
                <li v-for="(err, idx) in importResult.errors!.slice(0, 10)" :key="idx">{{ err }}</li>
                <li v-if="(importResult.errors?.length ?? 0) > 10">...还有 {{ (importResult.errors?.length ?? 0) - 10 }} 条错误</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn btn-secondary" @click="closeImportDialog">关闭</button>
          <button type="button" class="btn btn-primary" :disabled="!selectedFile || importing" @click="handleImport">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as XLSX from 'xlsx';
import * as echarts from 'echarts';
import {
  getMaterialPackages,
  createMaterialPackage,
  updateMaterialPackage,
  deleteMaterialPackage,
  exportMaterialPackages,
  batchImportMaterialPackages,
  downloadMaterialPackageTemplate,
  MaterialPackage
} from '../api/materialPackage';

interface ImportResult {
  inserted?: number;
  updated?: number;
  errors?: string[];
}

const tableData = ref<MaterialPackage[]>([]);
const showDialog = ref(false);
const showImportDialog = ref(false);
const isEdit = ref(false);
const currentId = ref<number | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const importFileName = ref('');
const importing = ref(false);
const importResult = ref<ImportResult | null>(null);

// 图表相关
const showCharts = ref(true);
const chartData = ref<MaterialPackage[]>([]);
const materialGroupChartRef = ref<HTMLElement | null>(null);
const manufacturerChartRef = ref<HTMLElement | null>(null);
const specChartRef = ref<HTMLElement | null>(null);
let materialGroupChart: echarts.ECharts | null = null;
let manufacturerChart: echarts.ECharts | null = null;
let specChart: echarts.ECharts | null = null;

const searchParams = reactive({
  partNo: '',
  materialGroup: '',
  manufacturer: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const formData = reactive({
  partNo: '',
  materialGroup: '',
  manufacturer: '',
  spec: '',
  length: undefined as number | undefined,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  thickness: undefined as number | undefined,
  remark: ''
});

// 加载数据
const loadData = async () => {
  try {
    const params = {
      partNo: searchParams.partNo || undefined,
      materialGroup: searchParams.materialGroup || undefined,
      manufacturer: searchParams.manufacturer || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    const res: any = await getMaterialPackages(params);
    tableData.value = res.items || [];
    pagination.total = res.total || 0;
    // 加载图表数据
    loadChartData();
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error({ message: '加载数据失败', showClose: true });
  }
};

// 加载图表数据
const loadChartData = async () => {
  try {
    // 获取所有数据用于图表分析
    const res: any = await getMaterialPackages({ pageSize: 10000 });
    chartData.value = res.items || [];
    nextTick(() => {
      renderCharts();
    });
  } catch (error) {
    console.error('加载图表数据失败:', error);
  }
};

// 渲染图表
const renderCharts = () => {
  renderMaterialGroupChart();
  renderManufacturerChart();
  renderSpecChart();
};

// 渲染物料组分布图
const renderMaterialGroupChart = () => {
  if (!materialGroupChartRef.value) return;

  const data = chartData.value;
  const groupCount: Record<string, number> = {};
  data.forEach(item => {
    const group = item.materialGroup || '未分类';
    groupCount[group] = (groupCount[group] || 0) + 1;
  });

  const chartDataArr = Object.entries(groupCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (!materialGroupChart) {
    materialGroupChart = echarts.init(materialGroupChartRef.value);
  }

  materialGroupChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c} ({d}%)' },
      data: chartDataArr
    }]
  });
};

// 渲染制造商分布图
const renderManufacturerChart = () => {
  if (!manufacturerChartRef.value) return;

  const data = chartData.value;
  const mfrCount: Record<string, number> = {};
  data.forEach(item => {
    const mfr = item.manufacturer || '未分类';
    mfrCount[mfr] = (mfrCount[mfr] || 0) + 1;
  });

  const chartDataArr = Object.entries(mfrCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // 只显示前10个

  if (!manufacturerChart) {
    manufacturerChart = echarts.init(manufacturerChartRef.value);
  }

  manufacturerChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: chartDataArr.map(d => d.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: chartDataArr.map(d => d.value),
      itemStyle: { color: '#5470C6', borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top' }
    }]
  });
};

// 渲染规格分布图
const renderSpecChart = () => {
  if (!specChartRef.value) return;

  const data = chartData.value;
  const specCount: Record<string, number> = {};
  data.forEach(item => {
    const spec = item.spec || '未分类';
    specCount[spec] = (specCount[spec] || 0) + 1;
  });

  const chartDataArr = Object.entries(specCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // 只显示前10个

  if (!specChart) {
    specChart = echarts.init(specChartRef.value);
  }

  specChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: chartDataArr.map(d => d.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: chartDataArr.map(d => d.value),
      itemStyle: { color: '#91CC75', borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top' }
    }]
  });
};

// 窗口大小变化时重绘图表
const handleResize = () => {
  materialGroupChart?.resize();
  manufacturerChart?.resize();
  specChart?.resize();
};

// 搜索
const handleSearch = () => {
  pagination.page = 1;
  loadData();
};

// 重置
const handleReset = () => {
  searchParams.partNo = '';
  searchParams.materialGroup = '';
  searchParams.manufacturer = '';
  pagination.page = 1;
  loadData();
};

// 分页
const handleSizeChange = () => {
  pagination.page = 1;
  loadData();
};

const handlePageChange = () => {
  loadData();
};

// 打开新增弹窗
const openAddDialog = () => {
  isEdit.value = false;
  currentId.value = null;
  formData.partNo = '';
  formData.materialGroup = '';
  formData.manufacturer = '';
  formData.spec = '';
  formData.length = undefined;
  formData.width = undefined;
  formData.height = undefined;
  formData.thickness = undefined;
  formData.remark = '';
  showDialog.value = true;
};

// 打开编辑弹窗
const openEditDialog = (item: MaterialPackage) => {
  isEdit.value = true;
  currentId.value = item.id!;
  formData.partNo = item.partNo;
  formData.materialGroup = item.materialGroup || '';
  formData.manufacturer = item.manufacturer || '';
  formData.spec = item.spec || '';
  formData.length = item.length;
  formData.width = item.width;
  formData.height = item.height;
  formData.thickness = item.thickness;
  formData.remark = item.remark || '';
  showDialog.value = true;
};

// 关闭弹窗
const closeDialog = () => {
  showDialog.value = false;
};

// 保存
const handleSave = async () => {
  if (!formData.partNo) {
    ElMessage.warning({ message: '物料号不能为空', showClose: true });
    return;
  }

  try {
    if (isEdit.value && currentId.value) {
      await updateMaterialPackage(currentId.value, { ...formData });
      ElMessage.success({ message: '更新成功', showClose: true });
    } else {
      await createMaterialPackage({ ...formData });
      ElMessage.success({ message: '新增成功', showClose: true });
    }
    closeDialog();
    loadData();
  } catch (error: any) {
    console.error('保存失败:', error);
    ElMessage.error({ message: error.message || '保存失败', showClose: true });
  }
};

// 删除
const handleDelete = async (item: MaterialPackage) => {
  try {
    await ElMessageBox.confirm(
      `确认删除物料号 "${item.partNo}" 吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await deleteMaterialPackage(item.id!);
    ElMessage.success({ message: '删除成功', showClose: true });
    loadData();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error);
      ElMessage.error({ message: '删除失败', showClose: true });
    }
  }
};

// 导出
const handleExport = async () => {
  try {
    const res: any = await exportMaterialPackages({
      partNo: searchParams.partNo || undefined,
      materialGroup: searchParams.materialGroup || undefined,
      manufacturer: searchParams.manufacturer || undefined
    });

    const data = res || [];
    if (data.length === 0) {
      ElMessage.warning({ message: '没有可导出的数据', showClose: true });
      return;
    }

    // 构建Excel数据
    const exportData = data.map((item: MaterialPackage, index: number) => ({
      '序号': index + 1,
      '物料号': item.partNo,
      '物料组': item.materialGroup || '',
      '制造商': item.manufacturer || '',
      '规格': item.spec || '',
      '长度(cm)': item.length ?? '',
      '宽度(cm)': item.width ?? '',
      '高度(cm)': item.height ?? '',
      '厚度(mm)': item.thickness ?? '',
      '备注': item.remark || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物料包装信息');

    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 20 },  // 物料号
      { wch: 15 },  // 物料组
      { wch: 25 },  // 制造商
      { wch: 20 },  // 规格
      { wch: 10 },  // 长度
      { wch: 10 },  // 宽度
      { wch: 10 },  // 高度
      { wch: 10 },  // 厚度
      { wch: 30 }   // 备注
    ];

    const fileName = `物料包装信息_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    ElMessage.success({ message: '导出成功', showClose: true });
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error({ message: '导出失败', showClose: true });
  }
};

// 下载模板
const downloadTemplate = () => {
  downloadMaterialPackageTemplate();
};

// 触发文件选择
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    importFileName.value = file.name;
    importResult.value = null;
  }
};

// 关闭导入弹窗
const closeImportDialog = () => {
  showImportDialog.value = false;
  selectedFile.value = null;
  importFileName.value = '';
  importResult.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// 处理导入
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning({ message: '请选择要导入的文件', showClose: true });
    return;
  }

  importing.value = true;
  importResult.value = null;

  try {
    const res: any = await batchImportMaterialPackages(selectedFile.value);
    importResult.value = {
      inserted: res.inserted || 0,
      updated: res.updated || 0,
      errors: res.errors || []
    };

    if (res.errors?.length > 0) {
      ElMessage.warning({ message: `导入完成，部分数据存在错误`, showClose: true });
    } else {
      ElMessage.success({ message: '导入成功', showClose: true });
      loadData();
    }
  } catch (error: any) {
    console.error('导入失败:', error);
    ElMessage.error({ message: error.message || '导入失败', showClose: true });
  } finally {
    importing.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  materialGroupChart?.dispose();
  manufacturerChart?.dispose();
  specChart?.dispose();
});
</script>

<style scoped>
.material-package-container {
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
  padding-bottom: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-item {
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
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.table-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.table-card-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #0066CC;
  color: #FFFFFF;
}

.btn-primary:hover {
  background-color: #0052A3;
}

.btn-primary:disabled {
  background-color: #9CA3AF;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover {
  background-color: #F3F4F6;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px;
  background-color: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-item label {
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.search-item input {
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  width: 160px;
}

.search-item input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.search-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.table-wrapper {
  overflow-x: auto;
}

/* 图表区域样式 */
.charts-section {
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #FAFBFC;
}

.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.charts-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.chart-wrapper {
  background-color: #FFFFFF;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  text-align: center;
}

.chart {
  width: 100%;
  height: 250px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
  font-size: 14px;
}

.data-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background-color: #F9FAFB;
}

.text-center {
  text-align: center;
}

.empty-tip {
  color: #9CA3AF;
  font-style: italic;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  transition: all 0.2s;
  font-size: 16px;
}

.btn-icon:hover {
  background-color: #E5E7EB;
}

.btn-icon.btn-delete:hover {
  background-color: #FEE2E2;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-import {
  width: 500px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6B7280;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.dialog-close:hover {
  color: #111827;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item.required label::after {
  content: ' *';
  color: #EF4444;
}

.form-item label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-item input,
.form-item textarea {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-item input:disabled {
  background-color: #F3F4F6;
  cursor: not-allowed;
}

/* 导入弹窗样式 */
.import-tips {
  background-color: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.import-tips p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.import-tips ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #92400E;
}

.import-tips li {
  margin-bottom: 4px;
}

.import-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.import-file-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #E0F2FE;
  border-radius: 6px;
  font-size: 14px;
  color: #0369A1;
}

.import-result {
  margin-top: 16px;
  padding: 16px;
  background-color: #ECFDF5;
  border: 1px solid #6EE7B7;
  border-radius: 8px;
}

.import-result.has-errors {
  background-color: #FEF2F2;
  border-color: #FCA5A5;
}

.import-result p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.import-result .error-title {
  color: #DC2626;
  font-weight: 500;
}

.import-errors {
  margin-top: 12px;
}

.import-errors ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #DC2626;
}

.import-errors li {
  margin-bottom: 4px;
}
</style>
