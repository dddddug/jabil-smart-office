<template>
  <h2>创建新账号</h2>
  <p>注册您的账号，加入 Jabil 智慧办公平台</p>

  <el-form :model="registerForm" ref="registerFormRef" @submit.prevent="handleRegister">
    <el-form-item class="form-item-username">
      <template #label>
        工号 / 用户名 <el-icon><User /></el-icon>
      </template>
      <el-input v-model="registerForm.username" placeholder="请输入工号或用户名"></el-input>
    </el-form-item>
    <el-form-item class="form-item-name">
      <template #label>
        姓名 <el-icon><Edit /></el-icon>
      </template>
      <el-input v-model="registerForm.name" placeholder="请输入您的姓名"></el-input>
    </el-form-item>
    <el-form-item class="form-item-phone">
      <template #label>
        手机号码 <el-icon><Phone /></el-icon>
      </template>
      <el-input v-model="registerForm.phoneNumber" placeholder="请输入您的手机号码"></el-input>
    </el-form-item>
    <el-form-item class="form-item-role">
      <template #label>
        角色 <el-icon><Avatar /></el-icon>
      </template>
      <el-select v-model="registerForm.role" placeholder="请选择角色">
        <el-option label="管理员" value="admin"></el-option>
        <el-option label="员工" value="employee"></el-option>
      </el-select>
    </el-form-item>
    <el-form-item class="form-item-password">
      <template #label>
        登录密码 <el-icon><Lock /></el-icon>
      </template>
      <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" show-password></el-input>
    </el-form-item>
    <el-form-item class="form-item-confirm-password">
      <template #label>
        确认密码 <el-icon><Lock /></el-icon>
      </template>
      <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" show-password></el-input>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" native-type="submit" class="register-button" :loading="isLoading">
        立即注册
      </el-button>
    </el-form-item>
  </el-form>

  <div class="system-info">
    <p><el-link type="primary" underline="never" @click="$emit('switch-view', 'login')">← 返回登录</el-link></p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { User, Edit, Phone, Avatar, Lock } from '@element-plus/icons-vue';

const emit = defineEmits(['switch-view']);

const registerFormRef = ref<FormInstance>();
const isLoading = ref(false);
const registerForm = reactive({
  username: '',
  name: '',
  phoneNumber: '',
  role: '',
  password: '',
  confirmPassword: '',
});

const handleRegister = async () => {
  if (!registerFormRef.value) return;
  try {
    isLoading.value = true;
    await registerFormRef.value.validate(async (valid) => {
      if (valid) {
        if (registerForm.password !== registerForm.confirmPassword) {
          ElMessage.error('两次输入的密码不一致！');
          return;
        }

        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: registerForm.username,
            name: registerForm.name,
            phoneNumber: registerForm.phoneNumber,
            role: registerForm.role,
            password: registerForm.password,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          ElMessage.success('注册成功！请登录。');
          emit('switch-view', 'login');
        } else {
          ElMessage.error(data.message || '注册失败，请稍后重试。');
        }
      } else {
        ElMessage.error('请完整填写表单并检查输入。');
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
  font-size: 1.0em;
}

.form-item-username .el-icon {
  color: #0891b2 !important;
}
.form-item-name .el-icon {
  color: #f97316 !important;
}
.form-item-phone .el-icon {
  color: #22c55e !important;
}
.form-item-role .el-icon {
  color: #ec4899 !important;
}
.form-item-password .el-icon,
.form-item-confirm-password .el-icon {
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

.register-button {
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

.register-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: all 0.5s ease;
}

.register-button:hover::before {
  left: 100%;
}

.register-button:hover {
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
