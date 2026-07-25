<template>
  <h2>欢迎回到 Jabil</h2>
  <p>登录您的账号，开启高效办公之旅</p>

  <el-form :model="loginForm" ref="loginFormRef" @submit.prevent="handleLogin">
    <el-form-item class="form-item-username">
      <template #label>
        工号 / 用户名 <el-icon><User /></el-icon>
      </template>
      <el-input v-model="loginForm.username" placeholder="请输入工号或用户名"></el-input>
    </el-form-item>
    <el-form-item class="form-item-password">
      <template #label>
        登录密码 <el-icon><Lock /></el-icon>
      </template>
      <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password></el-input>
    </el-form-item>
    <el-form-item class="login-options-row">
      <el-checkbox v-model="loginForm.rememberUsername">记住用户名</el-checkbox>
      <el-link type="primary" :underline="false" @click="$emit('switch-view', 'resetPassword')">忘记密码？</el-link>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" native-type="submit" class="login-button" :loading="isLoggingIn">
        {{ isLoggingIn ? '登录中...' : '立即登录' }}
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import type { FormInstance } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { setToken } from '../utils/request'; // 导入 setToken 函数

const emit = defineEmits(['switch-view']);
const router = useRouter();

const loginFormRef = ref<FormInstance>();
const loginForm = reactive({
  username: '',
  password: '',
  rememberUsername: false,
});
const isLoggingIn = ref(false);

// 页面加载时检查是否有记住的用户名
onMounted(() => {
  const rememberedUser = localStorage.getItem('rememberedUser');
  if (rememberedUser) {
    loginForm.username = rememberedUser;
    loginForm.rememberUsername = true;
  }
});

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      isLoggingIn.value = true;
        try {
          const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: loginForm.username,
              password: loginForm.password,
            }),
          });

          const fullResponse = await response.json();

          if (!response.ok) {
            throw new Error(fullResponse.message || fullResponse.error || '登录失败');
          }

          if (fullResponse.code === 200) {
            if (fullResponse.data && fullResponse.data.token) {
              console.log('[LoginForm] Received Token from backend:', fullResponse.data.token);
              setToken(fullResponse.data.token);
              console.log('[LoginForm] Token after setToken():', localStorage.getItem('jabil-token'));
            }
            if (fullResponse.data && fullResponse.data.user) {
              localStorage.setItem('user', JSON.stringify(fullResponse.data.user));
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('userRole', fullResponse.data.user.roleName);
              localStorage.setItem('userPlantId', String(fullResponse.data.user.plantId));
              localStorage.setItem('userDepartmentId', String(fullResponse.data.user.departmentId));

              ElMessage.success('登录成功！');

              const targetRoute = fullResponse.data.user.mustChangePassword || !fullResponse.data.user.hasSecurityQuestion ? '/first-time-setup' : '/';
              console.log('[LoginForm] Preparing to navigate to:', targetRoute);
              router.push(targetRoute);
            } else {
              ElMessage.error('登录成功，但用户信息不完整，请联系管理员。');
              router.push('/login');
            }
          } else {
            ElMessage.error(fullResponse.message || '登录失败');
          }
        } catch (error: any) {

          ElMessage.error(error.message || '登录请求失败');
        } finally {
          isLoggingIn.value = false;
        }
    }
  });
};
</script>

<style scoped>
:global(body) {
  --jabil-blue: #0066CC;
  --tech-cyan: #00A8E8;
}

h2 {
  color: #FFFFFF;
  font-size: 2em;
  margin-bottom: 10px;
  text-shadow: 0 0 15px rgba(0, 168, 232, 0.7);
  font-weight: bold;
  text-align: center;
}

p {
  color: #A0A0A0;
  font-size: 1em;
  margin-bottom: 25px;
  text-align: center;
  line-height: 1.5;
}

.el-form {
  width: 100%;
}

.el-form-item {
  margin-bottom: 22px;
}

.el-form-item__label {
  display: flex;
  align-items: center;
  color: var(--tech-cyan);
  font-size: 0.9em;
  margin-bottom: 8px;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 168, 232, 0.3);
}

.el-form-item__label .el-icon {
  margin-left: 8px;
  font-size: 1.3em;
  color: var(--jabil-blue);
  transition: color 0.3s ease;
}

.el-form-item.is-error .el-form-item__label .el-icon {
  color: #F56C6C;
}

.el-input {
  --el-input-bg-color: rgba(10, 20, 30, 0.7);
  --el-input-border-color: var(--jabil-blue);
  --el-input-hover-border-color: var(--tech-cyan);
  --el-input-focus-border-color: var(--tech-cyan);
  --el-input-text-color: #E0E0E0;
  --el-input-placeholder-color: #888;
  --el-input-border-radius: 8px;
}

.el-input__wrapper {
  box-shadow: inset 0 0 10px rgba(0, 102, 204, 0.4);
  transition: all 0.3s ease;
}

.el-input__wrapper.is-focus {
  box-shadow: inset 0 0 15px rgba(0, 168, 232, 0.6), 0 0 8px rgba(0, 168, 232, 0.6);
}

.el-checkbox__label {
  color: #E0E0E0;
  font-size: 0.9em;
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: var(--jabil-blue);
  border-color: var(--jabil-blue);
}

.el-checkbox__input.is-checked + .el-checkbox__label {
  color: var(--tech-cyan);
}

.login-options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.login-links-group {
  display: flex;
  gap: 15px;
}

.el-link {
  font-size: 0.9em;
  color: var(--tech-cyan);
  text-shadow: 0 0 5px rgba(0, 168, 232, 0.5);
  transition: color 0.3s ease;
}

.el-link:hover {
  color: #FFFFFF;
  text-decoration: underline;
}

.login-button {
  width: 100%;
  background: linear-gradient(to right, var(--jabil-blue), var(--tech-cyan));
  border: none;
  padding: 14px 0;
  font-size: 1.2em;
  font-weight: bold;
  letter-spacing: 1.5px;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.6);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  color: white;
}

.login-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 102, 204, 0.8);
  cursor: pointer;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: all 0.6s ease;
}

.login-button:hover::before {
  left: 100%;
}
</style>
