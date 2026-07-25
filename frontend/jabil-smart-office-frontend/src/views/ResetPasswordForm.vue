<template>
  <h2>验证您的身份</h2>
  <p>步骤 1 / 2 · 请输入您的工号并回答安全问题</p>

  <el-form :model="resetPasswordForm" ref="resetPasswordFormRef" @submit.prevent="handleResetPassword">
    <el-form-item class="form-item-employee-id">
      <template #label>
        工号 <el-icon><CreditCard /></el-icon>
      </template>
      <el-input v-model="resetPasswordForm.username" placeholder="请输入您的工号"></el-input>
    </el-form-item>
    <el-form-item class="form-item-security-question">
      <template #label>
        安全问题 <el-icon><QuestionFilled /></el-icon>
      </template>
      <el-select v-model="resetPasswordForm.securityQuestion" placeholder="请选择安全问题">
        <el-option label="您母亲的姓氏是什么？" value="mother_maiden_name"></el-option>
        <el-option label="您的第一所学校名称？" value="first_school_name"></el-option>
      </el-select>
    </el-form-item>
    <el-form-item class="form-item-answer">
      <template #label>
        答案 <el-icon><Key /></el-icon>
      </template>
      <el-input v-model="resetPasswordForm.answer" placeholder="请输入安全问题的答案"></el-input>
    </el-form-item>
    <p class="el-form-item__tip">💡 提示：如果您还没有设置安全问题，请先登录账号进行设置。</p>

    <el-form-item>
      <el-button type="primary" native-type="submit" class="reset-password-button" :loading="isLoading">
        下一步 · 验证身份 →
      </el-button>
    </el-form-item>
  </el-form>

  <div class="system-info">
    <p>记得密码了？<el-link type="primary" :underline="false" @click="$emit('switch-view', 'login')">返回登录</el-link></p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { CreditCard, QuestionFilled, Key } from '@element-plus/icons-vue';

const emit = defineEmits(['switch-view']);

const resetPasswordFormRef = ref<FormInstance>();
const isLoading = ref(false);
const resetPasswordForm = reactive({
  username: '',
  securityQuestion: '',
  answer: '',
});

const handleResetPassword = async () => {
  if (!resetPasswordFormRef.value) return;
  try {
    isLoading.value = true;
    await resetPasswordFormRef.value.validate(async (valid) => {
      if (valid) {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: resetPasswordForm.username,
            securityQuestion: resetPasswordForm.securityQuestion,
            answer: resetPasswordForm.answer,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          ElMessage.success('身份验证成功，请设置新密码！');
          emit('switch-view', 'set-new-password'); // Assuming a new view for setting password
        } else {
          ElMessage.error(data.message || '身份验证失败，请检查您的信息。');
        }
      } else {
        ElMessage.error('请完整填写表单。');
      }
    });
  } catch (error) {
    ElMessage.error('请求出错，请稍后重试。');
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
h2 {
  color: white;
  font-size: 1.8em;
  margin-bottom: 10px;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

p {
  color: #B0B0B0;
  font-size: 0.9em;
  margin-bottom: 15px;
}

.el-form-item {
  margin-bottom: 15px;
}

.el-form-item .el-form-item__label {
  display: flex;
  align-items: center;
  color: #E0E0E0;
  font-size: 0.85em;
  margin-bottom: 5px;
}

.el-form-item .el-icon {
  margin-left: 8px;
  vertical-align: middle;
  font-size: 1.2em;
}

.form-item-employee-id .el-icon {
  color: #0891b2 !important;
}
.form-item-security-question .el-icon {
  color: #f97316 !important;
}
.form-item-answer .el-icon {
  color: #7c3aed !important;
}

.el-input__wrapper {
  background-color: rgba(10, 20, 30, 0.9) !important;
  border: 1px solid #0066CC !important;
  box-shadow: inset 0 0 8px rgba(0, 102, 204, 0.4) !important;
  border-radius: 8px !important;
}

.el-input__inner {
  color: white !important;
  text-align: left !important;
}

.el-input__inner::placeholder {
  color: #888 !important;
}

.el-checkbox__label {
  color: #E0E0E0 !important;
}

.el-link {
  float: right;
  font-size: 0.95em;
  color: #00A8E8 !important;
  text-shadow: 0 0 5px rgba(0, 168, 232, 0.5);
}

.reset-password-button {
  width: 100%;
  background: linear-gradient(to right, #0066CC, #00A8E8);
  border: none;
  padding: 12px 0;
  font-size: 1.0em;
  font-weight: bold;
  letter-spacing: 1px;
  margin-top: 15px;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 102, 204, 0.6);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.reset-password-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: all 0.5s ease;
}

.reset-password-button:hover::before {
  left: 100%;
}

.reset-password-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 102, 204, 0.8);
}

.system-info {
  margin-top: 25px;
  font-size: 0.85em;
  color: #A0A0A0;
  text-align: center;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.1);
}
</style>
