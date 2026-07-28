<template>
  <div class="leave-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">人事中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">请假公差</span>
      </div>
    </div>

    <div class="content-card">
      <el-tabs v-model="activeTab" class="leave-tabs">
        <el-tab-pane label="临时加班" name="overtime">
          <LeaveTab tabType="overtime" />
        </el-tab-pane>
        <el-tab-pane label="临时请假&公差" name="temporary">
          <LeaveTab tabType="temporary" />
        </el-tab-pane>
        <el-tab-pane label="请假&年假" name="annual">
          <LeaveTab tabType="annual" />
        </el-tab-pane>
        <el-tab-pane label="离职&转岗" name="resignation">
          <LeaveTab tabType="resignation" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LeaveTab from './components/LeaveTab.vue'

const route = useRoute()
const router = useRouter()

// 使用 sessionStorage 持久化当前 tab
const getStoredTab = () => {
  return sessionStorage.getItem('leaveActiveTab') || 'overtime'
}

const activeTab = ref(getStoredTab())

// 监听 tab 切换，保存到 sessionStorage
watch(activeTab, (newTab) => {
  sessionStorage.setItem('leaveActiveTab', newTab)
  router.replace({ query: { tab: newTab } })
})

onMounted(() => {
  // 初始化时从 URL 同步（如果有的话）
  if (route.query.tab && typeof route.query.tab === 'string') {
    const urlTab = route.query.tab
    if (urlTab !== activeTab.value) {
      activeTab.value = urlTab
      sessionStorage.setItem('leaveActiveTab', urlTab)
    }
  } else if (!sessionStorage.getItem('leaveActiveTab')) {
    // 首次访问且 URL 没有 tab 参数
    router.replace({ query: { tab: activeTab.value } })
  }
})
</script>

<style scoped>
.leave-management-container {
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

.content-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.leave-tabs {
  width: 100%;
}
</style>
