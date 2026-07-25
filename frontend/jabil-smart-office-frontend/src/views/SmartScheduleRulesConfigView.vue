<template>
  <div class="smart-schedule-rules-config-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统配置</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">智能排班规则配置</span>
      </div>
    </div>

    <div class="table-card">
      <div class="table-card-header">
        <div class="table-card-title">⚙️ 智能排班规则配置</div>
        <div class="table-card-actions">
          <button class="btn btn-secondary" @click="resetRules">🔄 重置</button>
          <button class="btn btn-primary" @click="saveRules">💾 保存配置</button>
        </div>
      </div>
      <div class="card-body">
        <form class="form">
          <!-- 通用设置 -->
          <div class="form-section">
            <div class="form-section-title">通用设置</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="scheduleRules.enabled" />
                启用智能排班
              </label>
            </div>
          </div>

          <!-- 班次配置 -->
          <div class="form-section">
            <div class="form-section-title">班次配置</div>
            <div class="form-group">
              <label>可选班次</label>
              <div class="checkbox-group">
                <label v-for="shift in allShifts" :key="shift" class="checkbox-item">
                  <input type="checkbox" :value="shift" v-model="scheduleRules.shiftTypes" />
                  {{ shift }}
                </label>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>每班次人数上限</label>
                <input type="number" v-model.number="scheduleRules.headcountLimitPerShift" min="1" max="999" />
                <span class="form-tip">（0表示不限制）</span>
              </div>
            </div>
            <div class="form-group">
              <label>人员配比要求</label>
              <textarea v-model="scheduleRules.staffingRatio" rows="3" placeholder="例如：L1:20%, L2:50%, L3:30%"></textarea>
              <span class="form-tip">（各级别人员比例要求，文本描述）</span>
            </div>
          </div>

          <!-- 日期与人员过滤 -->
          <div class="form-section">
            <div class="form-section-title">日期与人员过滤</div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="scheduleRules.holidayAvoidanceEnabled" />
                节假日自动规避
              </label>
              <span class="form-tip">（排班时自动跳过法定节假日）</span>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="scheduleRules.leaveFilteringEnabled" />
                请假人员自动过滤
              </label>
              <span class="form-tip">（排班时自动排除已审批请假人员）</span>
            </div>
          </div>

          <!-- 高级规则 -->
          <div class="form-section">
            <div class="form-section-title">高级规则</div>
            <div class="form-group">
              <label>跨工位均衡策略</label>
              <textarea v-model="scheduleRules.crossStationBalancingRule" rows="3" placeholder="例如：避免员工连续2天分配同一工位"></textarea>
              <span class="form-tip">（描述避免员工连续分配同一工位的策略）</span>
            </div>
            <div class="form-group">
              <label>夜班轮换规则</label>
              <textarea v-model="scheduleRules.nightShiftRotationRule" rows="3" placeholder="例如：每位员工连续夜班不超过2天，轮休1天"></textarea>
              <span class="form-tip">（描述夜班人员轮换的具体规则）</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>单日加班上限（小时）</label>
                <input type="number" v-model.number="scheduleRules.overtimeLimit.daily" min="0" max="24" />
              </div>
              <div class="form-group">
                <label>单周加班上限（小时）</label>
                <input type="number" v-model.number="scheduleRules.overtimeLimit.weekly" min="0" max="168" />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

interface SmartScheduleRules {
  enabled: boolean;
  shiftTypes: string[];
  headcountLimitPerShift: number;
  staffingRatio: string;
  holidayAvoidanceEnabled: boolean;
  leaveFilteringEnabled: boolean;
  crossStationBalancingRule: string;
  nightShiftRotationRule: string;
  overtimeLimit: {
    daily: number;
    weekly: number;
  };
}

const allShifts = ['A班', 'B班', 'C班', 'N班', 'A+班', 'B+班', 'C+班', 'N+班', 'A2班'];

const initialScheduleRules: SmartScheduleRules = {
  enabled: true,
  shiftTypes: ['A班', 'B班', 'C班', 'N班'],
  headcountLimitPerShift: 50,
  staffingRatio: 'L1:30%, L2:40%, L3:30%',
  holidayAvoidanceEnabled: true,
  leaveFilteringEnabled: true,
  crossStationBalancingRule: '避免员工连续2天分配同一工位',
  nightShiftRotationRule: '每位员工连续夜班不超过2天，轮休至少1天',
  overtimeLimit: {
    daily: 4,
    weekly: 12,
  },
};

const scheduleRules = reactive<SmartScheduleRules>({ ...initialScheduleRules });

const saveRules = () => {
  ElMessageBox.confirm(
    '确认保存智能排班规则配置吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage.success('智能排班规则配置保存成功！');
    })
    .catch(() => {
      ElMessage.info('已取消保存');
    });
};

const resetRules = () => {
  ElMessageBox.confirm(
    '确认重置智能排班规则配置吗？所有修改将丢失！',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      Object.assign(scheduleRules, initialScheduleRules);
      ElMessage.success('智能排班规则已重置');
    })
    .catch(() => {
      ElMessage.info('已取消重置');
    });
};
</script>

<style scoped>
.smart-schedule-rules-config-container {
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
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item {
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: #9CA3AF;
}

.table-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
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

.card-body {
  padding: 24px;
}

.form {
  width: 100%;
}

.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #F3F4F6;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 400;
  cursor: pointer;
}

.form-tip {
  display: block;
  margin-top: 6px;
  color: #9CA3AF;
  font-size: 13px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%);
}

.btn-secondary {
  background-color: #F3F4F6;
  color: #4B5563;
}

.btn-secondary:hover {
  background-color: #E5E7EB;
}
</style>