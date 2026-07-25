<template>
  <div class="login-page">
    <!-- Header -->
    <header class="login-header">
      SYSTEM ONLINE | Jabil 广州 | 智能办公中心 | {{ currentDateTime }}
    </header>

    <!-- Main Content -->
    <main class="login-main">
      <div class="login-left">
        <div class="jabil-logo-css">
          <span class="jabil-logo-J">J</span>
          <span class="jabil-logo-A-container">
            A
            <span class="jabil-logo-A-line"></span>
          </span>
          <span class="jabil-logo-BIL">BIL</span>
        </div>
        <p class="welcome-text">欢迎使用</p>
        <h1>Jabil 智慧协同平台</h1>
        <p class="description">
          集员工排班、数据管理、关键KPI 追踪、绩效评估等核心功能于一体，助力企业数字化转型，提升工作效率与协作体验。
        </p>
        <div class="features">
          <div class="feature-item">
            <span class="feature-icon"><span class="feature-number">10</span>+</span>
            <span class="feature-text">核心功能模块</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><span class="feature-number">24</span>/7</span>
            <span class="feature-text">全天候运维支持</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"><span class="feature-number">99</span>.9%</span>
            <span class="feature-text">系统可用性保障</span>
          </div>
        </div>

        <!-- Footer Navigation -->
        <footer class="login-footer-nav">
          <div class="nav-item">
            <span class="icon">📊</span> 员工排班
          </div>
          <div class="nav-item">
            <span class="icon">🏭</span> 工位安排
          </div>
          <div class="nav-item">
            <span class="icon">📈</span> 数据报表
          </div>
          <div class="nav-item">
            <span class="icon">🏆</span> 绩效评比
          </div>
          <div class="nav-item">
            <span class="icon">📝</span> 请假公差
          </div>
          <div class="nav-item">
            <span class="icon">📉</span> KPI指标
          </div>
          <div class="nav-item">
            <span class="icon">👥</span> 员工管理
          </div>
          <div class="nav-item">
            <span class="icon">🔐</span> 权限分配
          </div>
        </footer>
      </div>

      <div class="login-right">
        <component :is="currentViewComponent" @switch-view="goToView" />

        <div class="system-info">
          <p>🎯 SERVER ONLINE    SYS-ID: JABIL-202606</p>
          <p>© 2026 Jabil 智慧协同平台 v2.0.0</p>
          <p>Powered by Jabil Smart Office</p>
        </div>
      </div>
    </main>


  </div>
</template>

<script setup lang="ts">
import { reactive, ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import type { FormInstance } from 'element-plus'
import { useRoute } from 'vue-router'

// Import components (will create these soon)
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'
import ResetPasswordForm from './ResetPasswordForm.vue'

const currentView = shallowRef('login') // 'login', 'register', 'resetPassword'

// 实时日期时间
const currentDateTime = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const updateDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekDay = weekDays[now.getDay()]
  currentDateTime.value = `${year}年${month}月${day}日${weekDay} ${hours}:${minutes}:${seconds}`
}

const currentViewComponent = computed(() => {
  switch (currentView.value) {
    case 'login':
      return LoginForm
    case 'register':
      return RegisterForm
    case 'resetPassword':
      return ResetPasswordForm
    default:
      return LoginForm
  }
})

// Function to switch views
const goToView = (viewName: string) => {
  currentView.value = viewName
}

const route = useRoute() // Initialize useRoute

onMounted(() => {
  updateDateTime()
  timer = setInterval(updateDateTime, 1000)

  const viewParam = route.query.view as string
  if (viewParam && ['login', 'register', 'resetPassword'].includes(viewParam)) {
    currentView.value = viewParam
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
:global(body) {
  --jabil-blue: #0066CC;
  --tech-cyan: #00A8E8;
  --dark-blue-background: rgba(10, 22, 40, 0.8);
}

.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: linear-gradient(135deg, #0A1628 0%, #000000 100%);
  color: #E0E0E0;
}

.login-header {
  color: white;
  padding: 10px 20px;
  text-align: left;
  font-size: 0.9em;
  box-shadow: 0 2px 10px rgba(0, 102, 204, 0.5);
  position: relative;
  z-index: 1;
}

.login-main {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 40px;
  position: relative;
  z-index: 1;
}

.login-left {
  width: 50%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 40px;
  background-color: rgba(10, 22, 40, 0.8);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 102, 204, 0.3);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.jabil-logo-css {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.125rem;
  font-size: 3em;
  font-weight: 900;
  letter-spacing: 0.24em;
  margin-bottom: 20px;
  filter: drop-shadow(0 0 10px #00A8E8);
  width: fit-content;
  margin-left: 0;
  transform: translateX(-10px);
}

.jabil-logo-css .jabil-logo-J {
  color: #0066CC;
}

.jabil-logo-css .jabil-logo-A-container {
  position: relative;
  color: #0066CC;
}

.jabil-logo-css .jabil-logo-A-line {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.8em;
  height: 0.15em;
  border-radius: 999px;
  background: #63be3b;
  transform: translate(-50%, -50%) rotate(130deg);
}

.jabil-logo-css .jabil-logo-BIL {
  color: var(--jabil-blue);
}

.login-left .welcome-text {
  font-size: 2.2em;
  font-weight: bold;
  margin-bottom: 5px;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  padding-left: 0;
}

.login-left h1 {
  background-image: linear-gradient(to right, white, #0066CC);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 3.2em;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 0 0 15px rgba(0, 168, 232, 0.7);
  padding-left: 70px;
}

.login-left .description {
  font-size: 17px;
  line-height: 1.5;
  color: #A0A0A0;
  margin-bottom: 30px;
  margin-top: 15px;
}

.features {
  display: flex;
  justify-content: flex-start;
  gap: 15px;
  flex-wrap: wrap;
  padding: 30px 0;
  padding-left: 20px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(0, 102, 204, 0.1);
  border: 1px solid rgba(0, 168, 232, 0.4);
  border-radius: 8px;
  padding: 10px 20px;
  min-width: 120px;
  box-shadow: 0 0 15px rgba(0, 168, 232, 0.3);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 0 25px rgba(0, 168, 232, 0.6);
  background-color: rgba(0, 102, 204, 0.2);
}

.feature-icon {
  font-size: 1.8em;
  font-weight: bold;
  color: var(--tech-cyan);
  margin-bottom: 5px;
  text-shadow: 0 0 10px rgba(0, 168, 232, 0.8);
}

.feature-text {
  font-size: 1em;
  color: #E0E0E0;
}

.feature-icon .feature-number {
  color: #0066CC;
  text-shadow: 0 0 10px rgba(0, 102, 204, 0.8);
}

.login-footer-nav {
  background-color: var(--dark-blue-background);
  padding: 15px 20px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  border-top: 1px solid var(--jabil-blue);
  box-shadow: 0 -2px 10px rgba(0, 102, 204, 0.5);
  position: relative;
  z-index: 1;
  margin-top: 50px;
}

.nav-item {
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  color: #E0E0E0;
  font-size: 1em;
  padding: 10px 20px;
  border-radius: 6px;
  overflow: hidden;
}

.nav-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  border-radius: 0 999px 999px 0;
  background: transparent;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(0, 102, 204, 0.15);
  color: var(--tech-cyan);
  cursor: pointer;
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(0, 102, 204, 0.25) 0%, rgba(0, 102, 204, 0.08) 75%, rgba(0, 102, 204, 0) 100%);
  color: #FFFFFF;
}

.nav-item.active::before {
  background: linear-gradient(180deg, var(--tech-cyan) 0%, var(--jabil-blue) 100%);
  box-shadow: 0 0 15px rgba(0, 168, 232, 0.3);
}

.login-right {
  width: 50%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 102, 204, 0.5);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 30px rgba(0, 102, 204, 0.3);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

.system-info {
  margin-top: 30px;
  font-size: 0.9em;
  color: #A0A0A0;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .login-main {
    flex-direction: column;
    gap: 40px;
    padding: 30px;
  }

  .login-left, .login-right {
    min-width: unset;
    width: 100%;
    max-width: 500px;
  }

  .login-right {
    padding: 40px;
  }

  .login-left h1 {
    font-size: 2.2em;
  }

  .login-left .welcome-text {
    font-size: 1.4em;
  }
}

@media (max-width: 768px) {
  .login-header {
    text-align: center;
    font-size: 0.8em;
  }

  .login-main {
    padding: 20px;
  }

  .login-left {
    padding: 10px;
  }

  .login-left h1 {
    font-size: 1.8em;
  }

  .login-left .welcome-text {
    font-size: 1.2em;
  }

  .feature-item {
    padding: 10px 15px;
    min-width: 100px;
  }

  .feature-icon {
    font-size: 1.5em;
  }

  .login-right {
    padding: 30px;
  }

  .login-right h2 {
    font-size: 1.8em;
  }

  .login-button {
    padding: 12px 0;
    font-size: 1.1em;
  }

  .login-footer-nav {
    padding: 15px 20px;
    font-size: 0.8em;
  }
}
</style>
