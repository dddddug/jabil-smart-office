<template>
  <div class="ole-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item" @click="$router.push('/production-tracking')">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item" @click="$router.push('/production-tracking')">数据中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">OLE配置</span>
      </div>
      <el-button type="primary" size="small" @click="loadData">
        <span>🔄 刷新</span>
      </el-button>
    </div>

    <div class="config-content">
      <!-- 不参与效率计算的Area配置 -->
      <el-card class="config-card">
        <template #header>
          <div class="card-header">
            <span>不参与效率计算的Area</span>
            <el-button type="primary" size="small" @click="saveExcludedAreas" :loading="saving1">
              保存配置
            </el-button>
          </div>
        </template>
        <p class="config-tip">勾选的Area不参与效率计算。如果一个人同时被分配到参与和不参与的岗位时，默认参与计算。</p>
        <el-checkbox-group v-model="selectedExcludedAreas" class="area-check-group">
          <el-checkbox v-for="area in allAreas" :key="area.area_name" :label="area.area_name" :value="area.area_name">
            {{ area.area_name }}
          </el-checkbox>
        </el-checkbox-group>
      </el-card>

      <!-- Area效率计算规则配置 -->
      <el-card class="config-card">
        <template #header>
          <div class="card-header">
            <span>Area效率计算规则</span>
            <el-button type="primary" size="small" @click="showAddRuleDialog">
              新增规则
            </el-button>
          </div>
        </template>
        <p class="config-tip">配置特定Area组合时，哪些操作类型（IWS/FLR/PLR）计入效率计算。</p>

        <el-table :data="areaRules" border stripe size="small">
          <el-table-column prop="area_list" label="Area列表" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="area in row.area_list.split(',')" :key="area" size="small" style="margin-right: 4px;">
                {{ area.trim() }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="IWS时间(秒)" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.iws_enabled && row.iws_seconds">{{ row.iws_seconds }}</span>
              <span v-else-if="row.iws_enabled">启用</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="FLR时间(秒)" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.flr_enabled && row.flr_seconds">{{ row.flr_seconds }}</span>
              <span v-else-if="row.flr_enabled">启用</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="PLR时间(秒)" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.plr_enabled && row.plr_seconds">{{ row.plr_seconds }}</span>
              <span v-else-if="row.plr_enabled">启用</span>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'warning'" size="small">
                {{ row.enabled ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editRule(row)">编辑</el-button>
              <el-popconfirm title="确定删除此规则？" @confirm="deleteRule(row.id)">
                <template #reference>
                  <el-button type="danger" link size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 新增/编辑规则对话框 -->
    <el-dialog v-model="ruleDialogVisible" :title="editingRule ? '编辑规则' : '新增规则'" width="600px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="Area列表" required>
          <el-select v-model="ruleForm.area_list" multiple filterable allow-create default-first-option
            placeholder="选择或输入Area，多个用&分隔" style="width: 100%;">
            <el-option v-for="area in allAreas" :key="area.area_name" :label="area.area_name" :value="area.area_name" />
          </el-select>
        </el-form-item>
        <el-form-item label="IWS时间(秒)">
          <el-input-number v-model="ruleForm.iws_seconds" :min="0" :step="0.01" :precision="2" placeholder="0表示不启用" />
          <span class="form-tip">（输入秒数，如1800表示30分钟，0表示不启用）</span>
        </el-form-item>
        <el-form-item label="FLR时间(秒)">
          <el-input-number v-model="ruleForm.flr_seconds" :min="0" :step="0.01" :precision="2" placeholder="0表示不启用" />
          <span class="form-tip">（输入秒数，如1800表示30分钟，0表示不启用）</span>
        </el-form-item>
        <el-form-item label="PLR时间(秒)">
          <el-input-number v-model="ruleForm.plr_seconds" :min="0" :step="0.01" :precision="2" placeholder="0表示不启用" />
          <span class="form-tip">（输入秒数，如1800表示30分钟，0表示不启用）</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule" :loading="saving2">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getAllAreas, getExcludedAreas, updateExcludedAreas, getAreaRules, createAreaRule, updateAreaRule, deleteAreaRule } from '../api/oleTracking';

interface Area {
  area_name: string;
}

interface ExcludedArea {
  area_name: string;
  enabled: boolean;
}

interface AreaCalcRule {
  id: number;
  area_list: string;
  iws_enabled: boolean;
  flr_enabled: boolean;
  plr_enabled: boolean;
  enabled: boolean;
  iws_seconds: number;
  flr_seconds: number;
  plr_seconds: number;
}

const allAreas = ref<Area[]>([]);
const excludedAreas = ref<ExcludedArea[]>([]);
const selectedExcludedAreas = ref<string[]>([]);
const areaRules = ref<AreaCalcRule[]>([]);

const saving1 = ref(false);
const saving2 = ref(false);

const ruleDialogVisible = ref(false);
const editingRule = ref<AreaCalcRule | null>(null);
const ruleForm = ref({
  area_list: [] as string[],
  iws_seconds: 0 as number,
  flr_seconds: 0 as number,
  plr_seconds: 0 as number,
  enabled: true
});

const loadData = async () => {
  try {
    // 加载所有Area
    const areasRes = await getAllAreas();
    allAreas.value = areasRes.data || [];

    // 加载已排除的Area
    const excludedRes = await getExcludedAreas();
    excludedAreas.value = excludedRes.data || [];
    selectedExcludedAreas.value = excludedAreas.value.filter(a => a.enabled).map(a => a.area_name);

    // 加载计算规则
    const rulesRes = await getAreaRules();
    areaRules.value = rulesRes.data || [];
  } catch (error) {
    console.error('加载配置失败:', error);
    ElMessage.error({ message: '加载配置失败', showClose: true });
  }
};

const saveExcludedAreas = async () => {
  saving1.value = true;
  try {
    const areas = allAreas.value.map(area => ({
      area_name: area.area_name,
      enabled: selectedExcludedAreas.value.includes(area.area_name)
    }));
    await updateExcludedAreas(areas);
    ElMessage.success({ message: '保存成功', showClose: true });
    await loadData();
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error({ message: '保存失败', showClose: true });
  } finally {
    saving1.value = false;
  }
};

const showAddRuleDialog = () => {
  editingRule.value = null;
  ruleForm.value = {
    area_list: [],
    iws_seconds: 0 as number,
    flr_seconds: 0 as number,
    plr_seconds: 0 as number,
    enabled: true
  };
  ruleDialogVisible.value = true;
};

const editRule = (rule: AreaCalcRule) => {
  editingRule.value = rule;
  ruleForm.value = {
    area_list: rule.area_list.split('&').map(a => a.trim()),
    iws_seconds: Number(rule.iws_seconds) || 0,
    flr_seconds: Number(rule.flr_seconds) || 0,
    plr_seconds: Number(rule.plr_seconds) || 0,
    enabled: rule.enabled
  };
  ruleDialogVisible.value = true;
};

const saveRule = async () => {
  if (ruleForm.value.area_list.length === 0) {
    ElMessage.warning({ message: '请选择至少一个Area', showClose: true });
    return;
  }

  saving2.value = true;
  try {
    const data = {
      area_list: ruleForm.value.area_list.join('&'),
      iws_enabled: ruleForm.value.iws_seconds > 0,
      flr_enabled: ruleForm.value.flr_seconds > 0,
      plr_enabled: ruleForm.value.plr_seconds > 0,
      enabled: ruleForm.value.enabled,
      iws_seconds: Number(ruleForm.value.iws_seconds) || 0,
      flr_seconds: Number(ruleForm.value.flr_seconds) || 0,
      plr_seconds: Number(ruleForm.value.plr_seconds) || 0
    };

    if (editingRule.value) {
      await updateAreaRule(editingRule.value.id, data);
    } else {
      await createAreaRule(data);
    }

    ElMessage.success({ message: '保存成功', showClose: true });
    ruleDialogVisible.value = false;
    await loadData();
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error({ message: '保存失败', showClose: true });
  } finally {
    saving2.value = false;
  }
};

const deleteRule = async (id: number) => {
  try {
    await deleteAreaRule(id);
    ElMessage.success({ message: '删除成功', showClose: true });
    await loadData();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error({ message: '删除失败', showClose: true });
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.ole-config-container {
  background-color: #f5f7fa;
  min-height: 100%;
  padding: 20px 24px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 16px;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #f5f7fa;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.breadcrumb-item {
  cursor: pointer;
}

.breadcrumb-item.active {
  color: #303133;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #c0c4cc;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-tip {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.area-check-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.area-check-group :deep(.el-checkbox) {
  margin-right: 16px;
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.text-muted {
  color: #C0C4CC;
}
</style>
