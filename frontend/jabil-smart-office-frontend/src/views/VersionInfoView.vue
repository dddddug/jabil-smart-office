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
          <span class="env-value">{{ nodeVersion }}</span>
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
              v-for="(commit, index) in visibleCommitHistory"
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
          <div v-if="hasMoreCommits && !loading" class="load-more-btn">
            <el-button @click="toggleShowAllCommits" :icon="showAllCommits ? ArrowUp : ArrowDown">
              {{ showAllCommits ? '收起' : `显示更多 (${commitHistory.length - initialCommitCount} 条)` }}
            </el-button>
          </div>
          <div v-if="!loading && commitHistory.length === 0" class="empty-history">
            暂无更新记录
          </div>
        </el-tab-pane>

        <el-tab-pane label="版本更新" name="versions">
          <div class="version-list compact">
            <div
              v-for="commit in visibleVersionCommits"
              :key="commit.hash"
              class="version-item compact"
            >
              <div class="version-header">
                <span class="version-tag-large">v{{ commit.version }}</span>
                <span class="version-date-inline">{{ commit.date }}</span>
              </div>
              <div class="version-message compact">{{ commit.message }}</div>
              <div class="version-commits compact" v-if="commit.commits.length > 0">
                <span
                  v-for="c in commit.commits.slice(0, 5)"
                  :key="c.hash"
                  class="version-commit compact"
                  :class="getCommitTypeClass(c.type)"
                >
                  {{ c.message }}
                </span>
                <span v-if="commit.commits.length > 5" class="more-commits">
                  +{{ commit.commits.length - 5 }} 条更新
                </span>
              </div>
            </div>
          </div>
          <div v-if="hasMoreVersions && !loading" class="show-more-btn">
            <el-button @click="toggleShowAll" :icon="showAllVersions ? 'ArrowUp' : 'ArrowDown'">
              {{ showAllVersions ? '收起' : `显示更多 (${versionCommits.length - initialVersionCount} 条)` }}
            </el-button>
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
import { Loading, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import request from '../utils/request';

interface CommitInfo {
  hash: string;
  fullHash: string;
  message: string;
  type: string;
  time: string;
  date?: string;
  version?: string;
  refs?: string;
}

interface VersionCommit {
  version: string;
  date: string;
  message: string;
  commits: CommitInfo[];
  hash?: string;
}

interface VersionInfo {
  currentVersion: string;
  backendVersion?: string;
  releaseDate?: string;
  buildTime?: string;
  description?: string;
  nodeVersion?: string;
  versions?: Array<{
    version: string;
    date: string;
  }>;
  gitHistory?: CommitInfo[];
}

const versionInfo = ref<VersionInfo>({
  currentVersion: __APP_VERSION__ || '1.0.0',
  backendVersion: '未知',
  releaseDate: '-',
  buildTime: '-',
  nodeVersion: '未知',
});

const commitHistory = ref<CommitInfo[]>([]);
const versionCommits = ref<VersionCommit[]>([]);
const showAllVersions = ref(false);
const showAllCommits = ref(false);
const initialVersionCount = 2;
const initialCommitCount = 2;
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

const nodeVersion = computed(() => {
  return versionInfo.value.nodeVersion || '未知';
});

const apiBaseUrl = computed(() => {
  return request.defaults.baseURL || window.location.origin;
});

const isUpToDate = computed(() => {
  if (!versionInfo.value.versions || versionInfo.value.versions.length === 0) return true;
  return versionInfo.value.currentVersion === versionInfo.value.versions[0]?.version;
});

const visibleVersionCommits = computed(() => {
  if (showAllVersions.value) {
    return versionCommits.value;
  }
  return versionCommits.value.slice(0, initialVersionCount);
});

const hasMoreVersions = computed(() => {
  return versionCommits.value.length > initialVersionCount;
});

const visibleCommitHistory = computed(() => {
  if (showAllCommits.value) {
    return commitHistory.value;
  }
  return commitHistory.value.slice(0, initialCommitCount);
});

const hasMoreCommits = computed(() => {
  return commitHistory.value.length > initialCommitCount;
});

const toggleShowAll = () => {
  showAllVersions.value = !showAllVersions.value;
};

const toggleShowAllCommits = () => {
  showAllCommits.value = !showAllCommits.value;
};

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

const buildVersionCommits = (commits: CommitInfo[]): VersionCommit[] => {
  const versions: VersionCommit[] = [];
  let currentVersion: VersionCommit | null = null;

  for (const commit of commits) {
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
};

const parseCommitMessage = (message: string, refs?: string): { type: string; message: string; version?: string; date?: string } => {
  // 先检查 refs 中是否有 tag
  let version: string | undefined;
  if (refs) {
    const tagMatch = refs.match(/tag:\s*v?(\d+\.\d+\.\d+)/i);
    if (tagMatch) {
      version = tagMatch[1];
    }
  }

  // 如果 refs 没有版本，再从消息中匹配
  if (!version) {
    const versionMatch = message.match(/^v?(\d+\.\d+\.\d+):\s*(.*)/);
    if (versionMatch) {
      version = versionMatch[1];
    }
  }

  // 匹配 conventional commit 格式
  const conventionalMatch = message.match(/^(\w+)(\([^)]+\))?:\s*(.*)/);
  if (conventionalMatch) {
    return {
      type: conventionalMatch[1] || 'chore',
      message: conventionalMatch[3] || message,
      version,
    };
  }

  return {
    type: 'chore',
    message: message,
    version,
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
    // API 直接返回数据对象（没有包装在 {data: ...} 中）
    if (res && typeof res === 'object' && 'currentVersion' in res) {
      versionInfo.value = { ...versionInfo.value, ...res };
      // 如果 API 返回了 git 历史，直接使用
      if (res.gitHistory && res.gitHistory.length > 0) {
        commitHistory.value = res.gitHistory.map((commit: CommitInfo) => {
          const parsed = parseCommitMessage(commit.message, commit.refs);
          return {
            ...commit,
            type: parsed.type,
            version: parsed.version,
          };
        });
        // 构建版本提交列表
        versionCommits.value = buildVersionCommits(commitHistory.value);
        // 不再调用 loadCommitHistory()
        hasMore.value = false;
      }
    }
  } catch (error) {
    console.log('无法获取后端版本信息，使用默认值');
    // 使用构建时注入的版本号作为默认值
    versionInfo.value.currentVersion = __APP_VERSION__ || '1.0.0';
    // 如果 API 调用失败，加载模拟数据
    loadCommitHistory();
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
      { hash: 'lmn7890', fullHash: 'lmn7890123456abcdef1234567890abcdef1234', message: 'fix: 修复首次登录设置安全问题保存后不生效的问题，改为调用实际API', type: 'fix', time: '刚刚' },
      { hash: 'opq4567', fullHash: 'opq4567890123abcdef1234567890abcdef1234', message: 'feat: 新增/api/users/reset-password/verify和/api/users/reset-password端点用于忘记密码重置', type: 'feat', time: '刚刚' },
      { hash: 'ijk3456', fullHash: 'ijk3456789012abcdef1234567890abcdef1234', message: 'fix: 修复破7休1结束日期逻辑，如有调休请假则用实际结束日期，否则用开始日期+12天', type: 'fix', time: '刚刚' },
      { hash: 'abc1234', fullHash: 'abc1234567890abcdef1234567890abcdef1234', message: 'fix: 修复发送邮件附件中区域和部门列显示不正确的问题', type: 'fix', time: '刚刚' },
      { hash: 'def5678', fullHash: 'def5678901234abcdef1234567890abcdef1234', message: 'fix: 修复破7休1和周工时上限Excel导出中区域和部门列为空的问题', type: 'fix', time: '刚刚' },
      { hash: 'fgh9012', fullHash: 'fgh9012345678abcdef1234567890abcdef1234', message: 'v1.1.6: 修复破7休1和周工时上限导出Excel区域和部门列显示问题', type: 'feat', time: '刚刚', version: '1.1.6', date: '2026-07-30' },
      { hash: '464a71b', fullHash: '464a71b3c6d1b4e5f8a2c1d9e7f3b4a5c6d7e8f', message: 'v1.1.5: 修复K**差异登记问题描述选择后刷新问题，新增接口文档功能', type: 'feat', time: '1天前', version: '1.1.5', date: '2026-07-30' },
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

    // 构建版本提交列表
    versionCommits.value = buildVersionCommits(commitHistory.value);

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
  padding: 20px 24px;
  color: white;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.version-card.current-version {
  background: linear-gradient(135deg, #0066CC 0%, #004999 100%);
}

.version-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
}

.version-number {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.version-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.meta-icon {
  font-size: 14px;
}

.version-desc {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.5;
}

/* 版本对比 */
.version-comparison {
  margin-bottom: 16px;
}

.comparison-card {
  background: white;
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.comparison-icon {
  font-size: 18px;
}

.comparison-version {
  background: #E5E7EB;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
}

.comparison-status {
  font-size: 12px;
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
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
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

.changelog-section {
  background: white;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.changelog-tabs {
  margin-top: 12px;
}

.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 500px;
  overflow-y: auto;
}

.changelog-item {
  padding: 10px 12px;
  background: #F9FAFB;
  border-radius: 6px;
  border-left: 3px solid #E5E7EB;
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
  gap: 8px;
  margin-bottom: 4px;
}

.commit-hash {
  font-family: monospace;
  font-size: 11px;
  color: #9CA3AF;
  background: #E5E7EB;
  padding: 1px 6px;
  border-radius: 3px;
}

.commit-type {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 3px;
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
  font-size: 11px;
  color: #9CA3AF;
  margin-left: auto;
}

.commit-message {
  font-size: 13px;
  color: #111827;
  line-height: 1.4;
}

.commit-version-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #E5E7EB;
}

.version-tag {
  display: inline-block;
  background: linear-gradient(135deg, #0066CC 0%, #004999 100%);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
}

.version-date {
  font-size: 12px;
  color: #9CA3AF;
}

/* 版本列表 */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  padding: 20px;
  background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
  border-radius: 12px;
  border: 1px solid #E5E7EB;
}

.version-item.compact {
  padding: 12px 16px;
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

.version-item.compact .version-tag-large {
  font-size: 18px;
  margin-bottom: 0;
}

.version-date-inline {
  font-size: 12px;
  color: #9CA3AF;
}

.version-message {
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.5;
}

.version-message.compact {
  font-size: 13px;
  margin-bottom: 8px;
}

.version-commits {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 16px;
  border-left: 2px solid #D1D5DB;
}

.version-commits.compact {
  gap: 4px;
  padding-left: 12px;
}

.version-commit {
  font-size: 13px;
  color: #6B7280;
  padding: 4px 0;
}

.version-commit.compact {
  font-size: 12px;
  padding: 2px 0;
}

.more-commits {
  font-size: 12px;
  color: #9CA3AF;
  font-style: italic;
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

.show-more-btn {
  text-align: center;
  padding: 16px 0 8px 0;
}

.show-more-btn :deep(.el-button) {
  background: #F3F4F6;
  border-color: #E5E7EB;
  color: #374151;
  font-size: 13px;
}

.show-more-btn :deep(.el-button:hover) {
  background: #E5E7EB;
  border-color: #D1D5DB;
  color: #0066CC;
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
