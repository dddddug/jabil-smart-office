<template>
  <h2>设置新密码</h2>
  <p>步骤 2 / 2 · 请设置您的新密码</p>

  <el-form :model="newPasswordForm" ref="newPasswordFormRef" :rules="passwordRules" @submit.prevent="handleSetNewPassword">
    <el-form-item class="form-item-new-password">
      <template #label>
        新密码 <el-icon><Lock /></el-icon>
      </template>
      <el-input v-model="newPasswordForm.newPassword" type="password" placeholder="请输入新密码" show-password></el-input>
    </el-form-item>
    <el-form-item class="form-item-confirm-password">
      <template #label>
        确认密码 <el-icon><Lock /></el-icon>
      </template>
      <el-input v-model="newPasswordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password></el-input>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" native-type="submit" class="set-password-button" :loading="isLoading">
        完成设置 →
      </el-button>
    </el-form-item>
  </el-form>

  <div class="system-info">
    <p>想起密码了？<el-link type="primary" underline="never" @click="$emit('switch-view', 'login')">返回登录</el-link></p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Lock } from '@element-plus/icons-vue';

const props = defineProps<{
  userId: string;
}>();

const emit = defineEmits(['switch-view']);

const newPasswordFormRef = ref<FormInstance>();
const isLoading = ref(false);
const newPasswordForm = reactive({
  newPassword: '',
  confirmPassword: '',
});

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value !== newPasswordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const passwordRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
};

const handleSetNewPassword = async () => {
  if (!newPasswordFormRef.value) return;
  try {
    isLoading.value = true;
    await newPasswordFormRef.value.validate(async (valid) => {
      if (valid) {
        const response = await fetch('/api/users/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: props.userId,
            newPassword: newPasswordForm.newPassword,
            confirmPassword: newPasswordForm.confirmPassword,
          }),
        });

        const data = await response.json();
        if (response.ok && data.code === 200) {
          ElMessage.success('密码设置成功！请使用新密码登录。');
          emit('switch-view', 'login');
        } else {
          ElMessage.error(data.message || '密码设置失败，请稍后重试。');
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

.form-item-new-password .el-icon {
  color: #10b981 !important;
}
.form-item-confirm-password .el-icon {
  color: #10b981 !important;
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

.el-link {
  float: right;
  font-size: 0.95em;
  color: #00A8E8 !important;
  text-shadow: 0 0 5px rgba(0, 168, 232, 0.5);
}

.set-password-button {
  width: 100%;
  background: linear-gradient(to right, #059669, #10b981);
  border: none;
  padding: 12px 0;
  font-size: 1.0em;
  font-weight: bold;
  letter-spacing: 1px;
  margin-top: 15px;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(5, 150, 105, 0.6);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.set-password-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: all 0.5s ease;
}

.set-password-button:hover::before {
  left: 100%;
}

.set-password-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(5, 150, 105, 0.8);
}

.system-info {
  margin-top: 25px;
  font-size: 0.85em;
  color: #A0A0A0;
  text-align: center;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.1);
}
</style>
