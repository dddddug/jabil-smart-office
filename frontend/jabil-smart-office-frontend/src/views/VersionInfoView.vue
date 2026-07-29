<template>
  <div class="version-info-container">
    <div class="page-header">
      <h1 class="page-title">📋 版本信息</h1>
      <p class="page-desc">查看系统当前版本和历史更新记录</p>
    </div>

    <!-- 当前版本信息卡片 -->
    <div class="version-card current-version">
      <div class="version-badge">当前版本</div>
      <div class="version-number">v{{ versionInfo.currentVersion || '1.0.0' }}</div>
      <div class="version-meta">
        <span class="meta-item">
          <span class="meta-icon">📅</span>
          发布时间：{{ versionInfo.releaseDate || '未知' }}
        </span>
        <span class="meta-item">
          <span class="meta-icon">🔧</span>
          构建时间：{{ versionInfo.buildTime || '未知' }}
        </span>
      </div>
      <div v-if="versionInfo.description" class="version-desc">
        {{ versionInfo.description }}
      </div>
    </div>

    <!-- 版本对比信息 -->
    <div class="version-comparison" v-if="versionInfo.versions && versionInfo.versions.length > 0">
      <div class="comparison-card">
        <div class="comparison-header">
          <span class="comparison-icon">🚀</span>
          <span>最新版本</span>
          <span class="comparison-version">v{{ versionInfo.versions[0]?.version }}</span>
        </div>
        <div class="comparison-content">
          <span class="comparison-status" :class="isUpToDate ? 'up-to-date' : 'update-available'">
            {{ isUpToDate ? '✅ 您使用的是最新版本' : '⚠️ 有可用更新' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 环境信息 -->
    <div class="env-info-section">
      <h2 class="section-title">🔧 环境信息</h2>
      <div class="env-grid">
        <div class="env-item">
          <span class="env-label">前端版本</span>
          <span class="env-value">{{ versionInfo.currentVersion || '未知' }}</span>
        </div>
        <div class="env-item">
          <span class="env-label">后端版本</span>
          <span class="env-value">{{ versionInfo.backendVersion || '未知' }}</span>
        </div>
        <div class="env-item">
          <span class="env-label">Node.js</span>
          <span class="env-value">{{ versionInfo.nodeVersion || process.env.NODE_VERSION || '未知' }}</span>
        </div>
        <div class="env-item">
          <span class="env-label">浏览器</span>
          <span class="env-value">{{ userAgent }}</span>
        </div>
        <div class="env-item">
          <span class="env-label">API 地址</span>
          <span class="env-value api-url">{{ apiBaseUrl }}</span>
        </div>
        <div class="env-item">
          <span class="env-label">构建时间</span>
          <span class="env-value">{{ versionInfo.buildTime || '未知' }}</span>
        </div>
      </div>
    </div>

    <!-- 更新日志 -->
    <div class="changelog-section">
      <h2 class="section-title">📝 更新日志</h2>

      <el-tabs v-model="activeTab" class="changelog-tabs">
        <el-tab-pane label="全部版本" name="all">
          <div class="changelog-list">
            <div
              v-for="(commit, index) in commitHistory"
              :key="commit.hash"
              class="changelog-item"
              :class="{ 'latest': index === 0 && !commit.version }"
            >
              <div class="commit-header">
                <span class="commit-hash" :title="commit.fullHash">{{ commit.hash }}</span>
                <span class="commit-type" :class="getCommitTypeClass(commit.type)">
                  {{ getCommitTypeLabel(commit.type) }}
                </span>
                <span class="commit-time">{{ commit.time }}</span>
              </div>
              <div class="commit-message">{{ commit.message }}</div>
              <div v-if="commit.version" class="commit-version-badge">
                <span class="version-tag">v{{ commit.version }}</span>
                <span class="version-date">{{ commit.date }}</span>
              </div>
            </div>
          </div>
          <div v-if="loading" class="loading-more">
            <el-icon class="is-loading"><Loading /></el-icon>
            加载中...
          </div>
          <div v-if="hasMore && !loading" class="load-more-btn">
            <el-button @click="loadMore" :loading="loadingMore">加载更多</el-button>
          </div>
          <div v-if="!loading && commitHistory.length === 0" class="empty-history">
            暂无更新记录
          </div>
        </el-tab-pane>

        <el-tab-pane label="版本更新" name="versions">
          <div class="version-list">
            <div
              v-for="commit in versionCommits"
              :key="commit.hash"
              class="version-item"
            >
              <div class="version-header">
                <span class="version-tag-large">{{ commit.version }}</span>
                <span class="version-date">{{ commit.date }}</span>
              </div>
              <div class="version-message">{{ commit.message }}</div>
              <div class="version-commits">
                <span
                  v-for="c in commit.commits"
                  :key="c.hash"
                  class="version-commit"
                  :class="getCommitTypeClass(c.type)"
                >
                  {{ c.message }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="!loading && versionCommits.length === 0" class="empty-history">
            暂无版本记录
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import request from '../utils/request';

interface CommitInfo {
  hash: string;
  fullHash: string;
  message: string;
  type: string;
  time: string;
  date?: string;
  version?: string;
}

interface VersionCommit {
  version: string;
  date: string;
  message: string;
  commits: CommitInfo[];
}

interface VersionInfo {
  currentVersion: string;
  backendVersion?: string;
  releaseDate?: string;
  buildTime?: string;
  description?: string;
  versions?: Array<{
    version: string;
    date: string;
  }>;
}

const versionInfo = ref<VersionInfo>({
  currentVersion: '1.1.3',
  backendVersion: '未知',
  releaseDate: '-',
  buildTime: '-',
});

const commitHistory = ref<CommitInfo[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const pageSize = 20;
const currentPage = ref(0);
const activeTab = ref('all');

const userAgent = computed(() => {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
});

const apiBaseUrl = computed(() => {
  return request.defaults.baseURL || window.location.origin;
});

const isUpToDate = computed(() => {
  if (!versionInfo.value.versions || versionInfo.value.versions.length === 0) return true;
  return versionInfo.value.currentVersion === versionInfo.value.versions[0]?.version;
});

const versionCommits = computed(() => {
  const versions: VersionCommit[] = [];
  let currentVersion: VersionCommit | null = null;

  for (const commit of commitHistory.value) {
    if (commit.version) {
      if (currentVersion) {
        versions.push(currentVersion);
      }
      currentVersion = {
        version: commit.version,
        date: commit.date || '',
        message: commit.message,
        commits: [],
      };
    } else if (currentVersion) {
      currentVersion.commits.push(commit);
    }
  }

  if (currentVersion) {
    versions.push(currentVersion);
  }

  return versions;
});

const getCommitTypeClass = (type: string): string => {
  const typeMap: Record<string, string> = {
    feat: 'type-feat',
    fix: 'type-fix',
    chore: 'type-chore',
    docs: 'type-docs',
    style: 'type-style',
    refactor: 'type-refactor',
    perf: 'type-perf',
    test: 'type-test',
    build: 'type-build',
    ci: 'type-ci',
  };
  return typeMap[type] || 'type-default';
};

const getCommitTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    feat: '新功能',
    fix: '问题修复',
    chore: '构建/工具',
    docs: '文档更新',
    style: '代码格式',
    refactor: '代码重构',
    perf: '性能优化',
    test: '测试相关',
    build: '构建系统',
    ci: 'CI/CD',
  };
  return labelMap[type] || type;
};

const parseCommitMessage = (message: string): { type: string; message: string; version?: string } => {
  // 匹配版本标签
  const versionMatch = message.match(/^v?(\d+\.\d+\.\d+):\s*(.*)/);
  if (versionMatch) {
    return {
      type: 'feat',
      version: versionMatch[1],
      message: versionMatch[2] || message,
    };
  }

  // 匹配 conventional commit 格式
  const conventionalMatch = message.match(/^(\w+)(\([^)]+\))?:\s*(.*)/);
  if (conventionalMatch) {
    return {
      type: conventionalMatch[1],
      message: conventionalMatch[3] || message,
    };
  }

  return {
    type: 'chore',
    message: message,
  };
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);

  if (days > 30) {
    return date.toLocaleDateString('zh-CN');
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  }
  return '刚刚';
};

const loadVersionInfo = async () => {
  try {
    const res = await request.get('/system/version');
    if (res?.data) {
      versionInfo.value = { ...versionInfo.value, ...res.data };
    }
  } catch (error) {
    console.log('无法获取后端版本信息，使用默认值');
    // 使用前端 package.json 版本作为默认值
    versionInfo.value.currentVersion = '1.1.3';
  }
};

const loadCommitHistory = async (append = false) => {
  if (append) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    // 模拟从 git log 获取的提交历史
    // 在实际环境中，这应该从后端 API 获取
    const mockCommits: CommitInfo[] = [
      { hash: 'ba23599', fullHash: 'ba2359923c6d1b4e5f8a2c1d9e7f3b4a5c6d7e8f', message: 'fix: 修复保存临时加班后刷新数据的日期参数', type: 'fix', time: '2天前' },
      { hash: '0055afe', fullHash: '0055afe123456789abcdef123456789abcdef12', message: 'fix: 保存临时加班/请假后刷新数据列表', type: 'fix', time: '2天前' },
      { hash: '8f0d580', fullHash: '8f0d580123456789abcdef123456789abcdef12', message: 'fix: 排除离职员工后重新计算级别工时汇总', type: 'fix', time: '3天前' },
      { hash: '267b809', fullHash: '267b809123456789abcdef123456789abcdef12', message: 'fix: 表格容器改为内部滚动，高度限制', type: 'fix', time: '3天前' },
      { hash: '82b91f1', fullHash: '82b91f1123456789abcdef123456789abcdef12', message: 'fix: 修复表头固定单元格的top属性', type: 'fix', time: '4天前' },
      { hash: 'd666bda', fullHash: 'd666bda123456789abcdef123456789abcdef12', message: 'fix: 移除粘性定位修复页面显示问题', type: 'fix', time: '4天前' },
      { hash: 'aa6d7a6', fullHash: 'aa6d7a6123456789abcdef123456789abcdef12', message: 'fix: 修复排班表头滚动时被遮挡的问题', type: 'fix', time: '5天前' },
      { hash: 'cc55acc', fullHash: 'cc55acc123456789abcdef123456789abcdef12', message: 'feat: 优化排班表头 - 周末区分、悬停效果、紧凑布局', type: 'feat', time: '5天前' },
      { hash: 'da66a73', fullHash: 'da66a73123456789abcdef123456789abcdef12', message: 'v1.1.3: 版本更新', type: 'feat', time: '5天前', version: '1.1.3', date: '2026-07-26' },
      { hash: 'a8791a6', fullHash: 'a8791a6123456789abcdef123456789abcdef12', message: 'fix: 修复排班总览自动刷新和转仓打印部门列表问题', type: 'fix', time: '6天前' },
      { hash: '485b851', fullHash: '485b851123456789abcdef123456789abcdef12', message: 'chore: 更新版本号到 v1.1.2', type: 'chore', time: '7天前' },
      { hash: '8de88d9', fullHash: '8de88d9123456789abcdef123456789abcdef12', message: 'fix: 修复K**差异登记扫码自动跳转和自动刷新问题', type: 'fix', time: '8天前' },
      { hash: '58b0e3f', fullHash: '58b0e3f123456789abcdef123456789abcdef12', message: 'fix: 修复前端构建时的 TypeScript 类型错误', type: 'fix', time: '9天前' },
      { hash: '6e2741e', fullHash: '6e2741e123456789abcdef123456789abcdef12', message: 'v1.1.1: 版本更新', type: 'feat', time: '10天前', version: '1.1.1', date: '2026-07-18' },
      { hash: '7d76820', fullHash: '7d76820123456789abcdef123456789abcdef12', message: 'v1.1.0: 工位安排功能优化 - 根据职位自动分配工位，班次筛选支持多选', type: 'feat', time: '15天前', version: '1.1.0', date: '2026-07-13' },
      { hash: 'e1c8a3f', fullHash: 'e1c8a3f123456789abcdef123456789abcdef12', message: 'chore: remove workflows requiring workflow scope', type: 'chore', time: '16天前' },
      { hash: 'fd9bb84', fullHash: 'fd9bb84123456789abcdef123456789abcdef12', message: 'fix: 修复排班模板下载及代码审查问题', type: 'fix', time: '17天前' },
      { hash: '21ba598', fullHash: '21ba598123456789abcdef123456789abcdef12', message: 'docs: 添加部署文档和快捷启动脚本', type: 'docs', time: '20天前' },
      { hash: '8b09eaf', fullHash: '8b09eaf123456789abcdef123456789abcdef12', message: 'Initial commit: Jabil Smart Office v1.0', type: 'feat', time: '25天前', version: '1.0.0', date: '2026-07-03' },
    ];

    // 解析提交类型
    const parsedCommits = mockCommits.map(commit => {
      const parsed = parseCommitMessage(commit.message);
      return {
        ...commit,
        type: parsed.type,
        version: parsed.version,
      };
    });

    if (append) {
      commitHistory.value = [...commitHistory.value, ...parsedCommits.slice(currentPage.value * pageSize, (currentPage.value + 1) * pageSize)];
    } else {
      commitHistory.value = parsedCommits;
    }

    hasMore.value = (currentPage.value + 1) * pageSize < mockCommits.length;
  } catch (error) {
    console.error('加载更新历史失败:', error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  currentPage.value++;
  loadCommitHistory(true);
};

onMounted(() => {
  loadVersionInfo();
  loadCommitHistory();
});
</script>

<style scoped>
.version-info-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

/* 当前版本卡片 */
.version-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  color: white;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.version-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  pointer-events: none;
}

.version-card.current-version {
  background: linear-gradient(135deg, #0066CC 0%, #004999 100%);
}

.version-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 16px;
}

.version-number {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: -1px;
}

.version-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.9;
}

.meta-icon {
  font-size: 16px;
}

.version-desc {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.6;
}

/* 版本对比 */
.version-comparison {
  margin-bottom: 24px;
}

.comparison-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 500;
}

.comparison-icon {
  font-size: 24px;
}

.comparison-version {
  background: #E5E7EB;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
}

.comparison-status {
  font-size: 14px;
  font-weight: 500;
}

.comparison-status.up-to-date {
  color: #10B981;
}

.comparison-status.update-available {
  color: #F59E0B;
}

/* 环境信息 */
.env-info-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.env-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #F9FAFB;
  border-radius: 8px;
}

.env-label {
  font-size: 14px;
  color: #6B7280;
}

.env-value {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.env-value.api-url {
  font-size: 12px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 更新日志 */
.changelog-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.changelog-tabs {
  margin-top: 16px;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changelog-item {
  padding: 16px;
  background: #F9FAFB;
  border-radius: 8px;
  border-left: 4px solid #E5E7EB;
  transition: all 0.2s ease;
}

.changelog-item:hover {
  background: #F3F4F6;
  border-left-color: #0066CC;
}

.changelog-item.latest {
  border-left-color: #10B981;
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
}

.commit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.commit-hash {
  font-family: monospace;
  font-size: 12px;
  color: #9CA3AF;
  background: #E5E7EB;
  padding: 2px 8px;
  border-radius: 4px;
}

.commit-type {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 4px;
}

.type-feat {
  background: #D1FAE5;
  color: #059669;
}

.type-fix {
  background: #FEE2E2;
  color: #DC2626;
}

.type-chore {
  background: #E5E7EB;
  color: #6B7280;
}

.type-docs {
  background: #DBEAFE;
  color: #2563EB;
}

.type-refactor {
  background: #F3E8FF;
  color: #9333EA;
}

.type-perf {
  background: #FEF3C7;
  color: #D97706;
}

.type-default {
  background: #F3F4F6;
  color: #6B7280;
}

.commit-time {
  font-size: 12px;
  color: #9CA3AF;
  margin-left: auto;
}

.commit-message {
  font-size: 14px;
  color: #111827;
  line-height: 1.5;
}

.commit-version-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #E5E7EB;
}

.version-tag {
  display: inline-block;
  background: linear-gradient(135deg, #0066CC 0%, #004999 100%);
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.version-date {
  font-size: 12px;
  color: #9CA3AF;
}

/* 版本列表 */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-item {
  padding: 20px;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  border-radius: 12px;
  border: 1px solid #E5E7EB;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.version-tag-large {
  font-size: 24px;
  font-weight: 700;
  color: #0066CC;
}

.version-message {
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.5;
}

.version-commits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 16px;
  border-left: 2px solid #D1D5DB;
}

.version-commit {
  font-size: 13px;
  color: #6B7280;
  padding: 4px 0;
}

/* 加载状态 */
.loading-more,
.load-more-btn {
  text-align: center;
  padding: 20px;
  color: #6B7280;
  font-size: 14px;
}

.load-more-btn :deep(.el-button) {
  background: #F3F4F6;
  border-color: #E5E7EB;
  color: #374151;
}

.load-more-btn :deep(.el-button:hover) {
  background: #E5E7EB;
  border-color: #D1D5DB;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: #9CA3AF;
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 768px) {
  .version-info-container {
    padding: 16px;
  }

  .version-number {
    font-size: 36px;
  }

  .version-meta {
    flex-direction: column;
    gap: 8px;
  }

  .env-grid {
    grid-template-columns: 1fr;
  }
}
</style>
