<template>
  <div class="config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">规则配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">OLE效率配置</span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- 岗位等级目标效率配置 -->
      <el-tab-pane label="岗位等级目标效率" name="level">
        <div class="tab-content">
          <div class="tab-header">
            <div class="tab-title">岗位等级目标效率配置</div>
            <el-button type="primary" size="small" @click="openLevelDialog()">➕ 新增</el-button>
          </div>

          <el-table :data="levelConfig" border stripe size="small">
            <el-table-column prop="level_name" label="等级名称" width="150" />
            <el-table-column prop="target_efficiency" label="目标效率" width="120">
              <template #default="{ row }">
                {{ row.target_efficiency !== null ? (row.target_efficiency * 100).toFixed(0) + '%' : '无目标' }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '生效' : '失效' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="openLevelDialog(row)">编辑</el-button>
                <el-button type="danger" size="small" link @click="deleteLevelConfig(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Area效率系数配置 -->
      <el-tab-pane label="Area效率系数" name="area">
        <div class="tab-content">
          <div class="tab-header">
            <div class="tab-title">Area效率系数配置</div>
            <el-button type="primary" size="small" @click="openAreaDialog()">➕ 新增</el-button>
          </div>

          <el-table :data="areaConfig" border stripe size="small">
            <el-table-column prop="area_name" label="Area区域" width="150" />
            <el-table-column prop="iws_coefficient" label="IWS系数(A)" width="120" />
            <el-table-column prop="plr_coefficient" label="PLR系数(B)" width="120" />
            <el-table-column prop="flr_coefficient" label="FLR系数" width="120" />
            <el-table-column prop="description" label="描述" min-width="150" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '生效' : '失效' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="openAreaDialog(row)">编辑</el-button>
                <el-button type="danger" size="small" link @click="deleteAreaConfig(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 等级配置弹窗 -->
    <el-dialog v-model="levelDialogVisible" title="岗位等级目标效率配置" width="500px">
      <el-form :model="levelForm" label-width="120px">
        <el-form-item label="等级名称" required>
          <el-input v-model="levelForm.level_name" placeholder="如：3 Level, 4 Level, 其他" />
        </el-form-item>
        <el-form-item label="目标效率">
          <el-input-number
            v-model="levelForm.target_efficiency"
            :min="0"
            :max="1"
            :step="0.05"
            :precision="2"
            placeholder="0.00 - 1.00"
          />
          <span style="margin-left: 8px;">(0.00 - 1.00)</span>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="levelForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="levelForm.status">
            <el-radio label="active">生效</el-radio>
            <el-radio label="inactive">失效</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="levelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLevelConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- Area配置弹窗 -->
    <el-dialog v-model="areaDialogVisible" title="Area效率系数配置" width="500px">
      <el-form :model="areaForm" label-width="120px">
        <el-form-item label="Area区域" required>
          <el-input v-model="areaForm.area_name" placeholder="如：C区, HMP, 借料" />
        </el-form-item>
        <el-form-item label="IWS系数(A)" required>
          <el-input-number v-model="areaForm.iws_coefficient" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="PLR系数(B)" required>
          <el-input-number v-model="areaForm.plr_coefficient" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="FLR固定系数" required>
          <el-input-number v-model="areaForm.flr_coefficient" :min="0" :step="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="areaForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="areaForm.status">
            <el-radio label="active">生效</el-radio>
            <el-radio label="inactive">失效</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="areaDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAreaConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getLevelEfficiencyConfig,
  createLevelEfficiencyConfig,
  updateLevelEfficiencyConfig,
  deleteLevelEfficiencyConfig,
  getAreaCoefficientConfig,
  createAreaCoefficientConfig,
  updateAreaCoefficientConfig,
  deleteAreaCoefficientConfig
} from '@/api/oleTracking';

interface LevelConfig {
  id?: number;
  level_name: string;
  target_efficiency: number | null;
  description: string;
  status: string;
}

interface AreaConfig {
  id?: number;
  area_name: string;
  iws_coefficient: number;
  plr_coefficient: number;
  flr_coefficient: number;
  description: string;
  status: string;
}

const activeTab = ref('level');
const levelConfig = ref<LevelConfig[]>([]);
const areaConfig = ref<AreaConfig[]>([]);

const levelDialogVisible = ref(false);
const areaDialogVisible = ref(false);

const levelForm = ref<LevelConfig>({
  level_name: '',
  target_efficiency: null,
  description: '',
  status: 'active'
});

const areaForm = ref<AreaConfig>({
  area_name: '',
  iws_coefficient: 15,
  plr_coefficient: 22,
  flr_coefficient: 11.53,
  description: '',
  status: 'active'
});

// 加载等级配置
const loadLevelConfig = async () => {
  try {
    const res = await getLevelEfficiencyConfig();
    levelConfig.value = res.data || [];
  } catch (error) {
    console.error('加载等级配置失败:', error);
    ElMessage.error({ message: '加载配置失败', showClose: true });
  }
};

// 加载Area配置
const loadAreaConfig = async () => {
  try {
    const res = await getAreaCoefficientConfig();
    areaConfig.value = res.data || [];
  } catch (error) {
    console.error('加载Area配置失败:', error);
    ElMessage.error({ message: '加载配置失败', showClose: true });
  }
};

// 打开等级配置弹窗
const openLevelDialog = (row?: LevelConfig) => {
  if (row) {
    levelForm.value = { ...row };
  } else {
    levelForm.value = {
      level_name: '',
      target_efficiency: null,
      description: '',
      status: 'active'
    };
  }
  levelDialogVisible.value = true;
};

// 保存等级配置
const saveLevelConfig = async () => {
  if (!levelForm.value.level_name) {
    ElMessage.warning({ message: '请填写等级名称', showClose: true });
    return;
  }

  try {
    if (levelForm.value.id) {
      await updateLevelEfficiencyConfig(levelForm.value.id, levelForm.value);
      ElMessage.success({ message: '更新成功', showClose: true });
    } else {
      await createLevelEfficiencyConfig(levelForm.value);
      ElMessage.success({ message: '创建成功', showClose: true });
    }
    levelDialogVisible.value = false;
    loadLevelConfig();
  } catch (error) {
    console.error('保存等级配置失败:', error);
    ElMessage.error({ message: '保存失败', showClose: true });
  }
};

// 删除等级配置
const deleteLevelConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteLevelEfficiencyConfig(id);
    ElMessage.success({ message: '删除成功', showClose: true });
    loadLevelConfig();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除等级配置失败:', error);
      ElMessage.error({ message: '删除失败', showClose: true });
    }
  }
};

// 打开Area配置弹窗
const openAreaDialog = (row?: AreaConfig) => {
  if (row) {
    areaForm.value = { ...row };
  } else {
    areaForm.value = {
      area_name: '',
      iws_coefficient: 15,
      plr_coefficient: 22,
      flr_coefficient: 11.53,
      description: '',
      status: 'active'
    };
  }
  areaDialogVisible.value = true;
};

// 保存Area配置
const saveAreaConfig = async () => {
  if (!areaForm.value.area_name) {
    ElMessage.warning({ message: '请填写Area区域名称', showClose: true });
    return;
  }

  try {
    if (areaForm.value.id) {
      await updateAreaCoefficientConfig(areaForm.value.id, areaForm.value);
      ElMessage.success({ message: '更新成功', showClose: true });
    } else {
      await createAreaCoefficientConfig(areaForm.value);
      ElMessage.success({ message: '创建成功', showClose: true });
    }
    areaDialogVisible.value = false;
    loadAreaConfig();
  } catch (error) {
    console.error('保存Area配置失败:', error);
    ElMessage.error({ message: '保存失败', showClose: true });
  }
};

// 删除Area配置
const deleteAreaConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await deleteAreaCoefficientConfig(id);
    ElMessage.success({ message: '删除成功', showClose: true });
    loadAreaConfig();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除Area配置失败:', error);
      ElMessage.error({ message: '删除失败', showClose: true });
    }
  }
};

onMounted(() => {
  loadLevelConfig();
  loadAreaConfig();
});
</script>

<style scoped>
.config-container {
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
  padding: 8px 0 16px 0;
  margin-bottom: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

.config-tabs {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-content {
  padding-top: 16px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tab-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
</style>
