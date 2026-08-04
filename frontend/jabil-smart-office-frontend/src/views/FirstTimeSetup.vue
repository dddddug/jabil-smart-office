<template>
  <div class="first-time-setup-container">
    <div class="setup-card">
      <div class="header-actions">
        <el-button link @click="handleLogout" class="logout-btn">
          退出登录
        </el-button>
      </div>
      <h2>首次登录设置</h2>
      <p>为了您的账户安全，请完成以下设置</p>

      <div class="step-indicator">
        <div :class="['step', { active: currentStep === 1, completed: currentStep > 1 }]">
          <span class="step-number">1</span>
          <span class="step-label">修改密码</span>
        </div>
        <div class="step-line" :class="{ completed: currentStep > 1 }"></div>
        <div :class="['step', { active: currentStep === 2, completed: currentStep > 2 }]">
          <span class="step-number">2</span>
          <span class="step-label">安全问题</span>
        </div>
      </div>

      <div v-if="currentStep === 1" class="step-content">
        <el-form :model="passwordForm" ref="passwordFormRef" :rules="passwordRules" label-width="100px">
          <el-form-item label="当前密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button @click="handleSkip">稍后设置</el-button>
          <el-button type="primary" :loading="loading" @click="handleChangePassword">
            下一步
          </el-button>
        </div>
      </div>

      <div v-if="currentStep === 2" class="step-content">
        <el-form :model="securityForm" ref="securityFormRef" :rules="securityRules" label-width="100px">
          <el-form-item label="安全问题" prop="securityQuestion">
            <el-select v-model="securityForm.securityQuestion" placeholder="请选择安全问题" style="width: 100%">
              <el-option label="您母亲的姓氏是什么？" value="您母亲的姓氏是什么？" />
              <el-option label="您的第一所学校名称？" value="您的第一所学校名称？" />
              <el-option label="您出生的城市是？" value="您出生的城市是？" />
              <el-option label="您的宠物名字是？" value="您的宠物名字是？" />
              <el-option label="您最喜欢的颜色是？" value="您最喜欢的颜色是？" />
            </el-select>
          </el-form-item>
          <el-form-item label="问题答案" prop="securityAnswer">
            <el-input v-model="securityForm.securityAnswer" placeholder="请输入安全问题的答案" />
          </el-form-item>
        </el-form>
        <div class="button-group">
          <el-button @click="currentStep = 1">上一步</el-button>
          <el-button type="primary" :loading="loading" @click="handleSetSecurityQuestion">
            完成设置
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();
const currentStep = ref(1);
const loading = ref(false);

const userData = ref(JSON.parse(localStorage.getItem('user') || '{}'));

const passwordFormRef = ref<FormInstance>();
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
};

const securityFormRef = ref<FormInstance>();
const securityForm = reactive({
  securityQuestion: '',
  securityAnswer: ''
});

const securityRules: FormRules = {
  securityQuestion: [{ required: true, message: '请选择安全问题', trigger: 'change' }],
  securityAnswer: [{ required: true, message: '请输入安全问题答案', trigger: 'blur' }]
};

const handleSkip = () => {
  localStorage.setItem('hasSkippedSetup', 'true');
  // 清除 mustChangePassword，下次登录时从服务器获取最新状态
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    user.mustChangePassword = false;
    localStorage.setItem('user', JSON.stringify(user));
  }
  router.push('/');
};

const handleLogout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
  router.push('/login');
};

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return;

  try {
    await passwordFormRef.value.validate();
    loading.value = true;

    const response = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jabil-token')}`
      },
      body: JSON.stringify({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      })
    });

    const data = await response.json();

    if (data.code === 200) {
      loading.value = false;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
      }
      ElMessage.success('密码修改成功');
      currentStep.value = 2;
    } else {
      loading.value = false;
      ElMessage.error(data.message || '密码修改失败');
    }
  } catch (error) {
    loading.value = false;
    ElMessage.error('请求失败，请稍后重试');
  }
};

const handleSetSecurityQuestion = async () => {
  if (!securityFormRef.value) return;

  try {
    await securityFormRef.value.validate();
    loading.value = true;

    const response = await fetch('/api/users/set-security-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jabil-token')}`
      },
      body: JSON.stringify({
        securityQuestion: securityForm.securityQuestion,
        securityAnswer: securityForm.securityAnswer
      })
    });

    const data = await response.json();

    if (data.code === 200) {
      loading.value = false;
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.hasSecurityQuestion = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      ElMessage.success('安全问题设置成功');
      localStorage.setItem('hasSkippedSetup', 'true');
      router.push('/');
    } else {
      loading.value = false;
      ElMessage.error(data.message || '安全问题设置失败');
    }
  } catch (error) {
    loading.value = false;
    ElMessage.error('请求失败，请稍后重试');
  }
};
</script>

<style scoped>
.first-time-setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0A1628 0%, #1a2a4a 100%);
  padding: 20px;
}

.setup-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.header-actions {
  position: absolute;
  top: 20px;
  right: 20px;
}

.logout-btn {
  color: #9CA3AF;
}

.logout-btn:hover {
  color: #0066CC;
}

.setup-card h2 {
  text-align: center;
  color: #111827;
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
}

.setup-card p {
  text-align: center;
  color: #6B7280;
  margin-bottom: 32px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #E5E7EB;
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
}

.step.active .step-number,
.step.completed .step-number {
  background: linear-gradient(135deg, #0066CC 0%, #00A8E8 100%);
  color: white;
}

.step-label {
  font-size: 14px;
  color: #9CA3AF;
  font-weight: 500;
}

.step.active .step-label {
  color: #0066CC;
}

.step.completed .step-label {
  color: #111827;
}

.step-line {
  width: 80px;
  height: 2px;
  background: #E5E7EB;
  margin: 0 16px;
  position: relative;
  top: -12px;
}

.step-line.completed {
  background: linear-gradient(90deg, #0066CC 0%, #00A8E8 100%);
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}
</style>
