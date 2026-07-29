<template>
  <div class="api-docs-container">
    <div class="page-header">
      <h1 class="page-title">📡 接口文档</h1>
      <p class="page-desc">Jabil Smart Office 系统所有 API 接口说明</p>
    </div>

    <!-- 接口统计 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ apiGroups.length }}</div>
          <div class="stat-label">接口分组</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔗</div>
        <div class="stat-info">
          <div class="stat-value">{{ totalEndpoints }}</div>
          <div class="stat-label">接口总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-info">
          <div class="stat-value">REST</div>
          <div class="stat-label">接口风格</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔒</div>
        <div class="stat-info">
          <div class="stat-value">JWT</div>
          <div class="stat-label">认证方式</div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-input
        v-model="searchQuery"
        placeholder="搜索接口名称、路径或描述..."
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select v-model="selectedMethod" placeholder="请求方法" clearable class="method-filter">
        <el-option label="全部" value="" />
        <el-option label="GET" value="GET" />
        <el-option label="POST" value="POST" />
        <el-option label="PUT" value="PUT" />
        <el-option label="DELETE" value="DELETE" />
        <el-option label="PATCH" value="PATCH" />
      </el-select>
    </div>

    <!-- 接口分组 -->
    <div class="api-groups">
      <div
        v-for="group in filteredGroups"
        :key="group.name"
        class="api-group"
      >
        <div class="group-header" @click="toggleGroup(group.name)">
          <div class="group-info">
            <span class="group-icon">{{ group.icon }}</span>
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">({{ group.endpoints.length }} 个接口)</span>
          </div>
          <span class="expand-icon">{{ expandedGroups.has(group.name) ? '▼' : '▶' }}</span>
        </div>

        <div v-show="expandedGroups.has(group.name)" class="endpoints-list">
          <div
            v-for="endpoint in group.endpoints"
            :key="endpoint.path + endpoint.method"
            class="endpoint-item"
            @click="selectEndpoint(endpoint)"
          >
            <div class="endpoint-header">
              <span :class="['method-badge', `method-${endpoint.method.toLowerCase()}`]">
                {{ endpoint.method }}
              </span>
              <span class="endpoint-path">{{ endpoint.path }}</span>
              <span v-if="endpoint.authRequired" class="auth-badge">需要认证</span>
            </div>
            <div class="endpoint-desc">{{ endpoint.description }}</div>
            <div v-if="endpoint.parameters?.length" class="endpoint-params">
              <span class="params-label">参数:</span>
              <span v-for="param in endpoint.parameters" :key="param.name" class="param-tag">
                {{ param.name }}{{ param.required ? '*' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredGroups.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">没有找到匹配的接口</div>
      </div>
    </div>

    <!-- 接口详情弹窗 -->
    <el-dialog
      v-model="showDetail"
      :title="`${selectedEndpoint?.method} ${selectedEndpoint?.path}`"
      width="800px"
      class="api-detail-dialog"
    >
      <div v-if="selectedEndpoint" class="endpoint-detail">
        <div class="detail-section">
          <div class="detail-title">接口说明</div>
          <div class="detail-content">{{ selectedEndpoint.description }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-title">请求方式</div>
          <div class="detail-content">
            <span :class="['method-badge', `method-${selectedEndpoint.method.toLowerCase()}`]">
              {{ selectedEndpoint.method }}
            </span>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-title">请求路径</div>
          <div class="detail-content code-block">{{ selectedEndpoint.path }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-title">认证要求</div>
          <div class="detail-content">
            <el-tag :type="selectedEndpoint.authRequired ? 'warning' : 'success'" size="small">
              {{ selectedEndpoint.authRequired ? '需要登录认证' : '无需认证' }}
            </el-tag>
          </div>
        </div>

        <div v-if="selectedEndpoint.parameters?.length" class="detail-section">
          <div class="detail-title">请求参数</div>
          <el-table :data="selectedEndpoint.parameters" border size="small">
            <el-table-column prop="name" label="参数名" width="150" />
            <el-table-column prop="type" label="类型" width="100" />
            <el-table-column prop="required" label="必填" width="80">
              <template #default="{ row }">
                <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                  {{ row.required ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
          </el-table>
        </div>

        <div v-if="selectedEndpoint.requestExample" class="detail-section">
          <div class="detail-title">请求示例</div>
          <pre class="code-block">{{ selectedEndpoint.requestExample }}</pre>
        </div>

        <div v-if="selectedEndpoint.responseExample" class="detail-section">
          <div class="detail-title">响应示例</div>
          <pre class="code-block">{{ selectedEndpoint.responseExample }}</pre>
        </div>

        <div v-if="selectedEndpoint.responseFields" class="detail-section">
          <div class="detail-title">响应字段说明</div>
          <el-table :data="selectedEndpoint.responseFields" border size="small">
            <el-table-column prop="field" label="字段" width="180" />
            <el-table-column prop="type" label="类型" width="100" />
            <el-table-column prop="description" label="说明" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search } from '@element-plus/icons-vue';

interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  authRequired: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  requestExample?: string;
  responseExample?: string;
  responseFields?: Array<{
    field: string;
    type: string;
    description: string;
  }>;
}

interface ApiGroup {
  name: string;
  icon: string;
  endpoints: ApiEndpoint[];
}

const searchQuery = ref('');
const selectedMethod = ref('');
const showDetail = ref(false);
const selectedEndpoint = ref<ApiEndpoint | null>(null);
const expandedGroups = ref<Set<string>>(new Set(['用户认证', '员工管理']));

// API 接口文档数据
const apiGroups = ref<ApiGroup[]>([
  {
    name: '用户认证',
    icon: '🔐',
    endpoints: [
      {
        path: '/api/auth/login',
        method: 'POST',
        description: '用户登录，获取访问令牌',
        authRequired: false,
        parameters: [
          { name: 'username', type: 'string', required: true, description: '用户名' },
          { name: 'password', type: 'string', required: true, description: '密码' }
        ],
        requestExample: `{
  "username": "admin",
  "password": "your_password"
}`,
        responseExample: `{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "realName": "管理员",
      "roleName": "超级管理员"
    }
  },
  "message": "登录成功"
}`,
        responseFields: [
          { field: 'token', type: 'string', description: 'JWT 访问令牌' },
          { field: 'user.id', type: 'number', description: '用户ID' },
          { field: 'user.username', type: 'string', description: '用户名' },
          { field: 'user.realName', type: 'string', description: '真实姓名' },
          { field: 'user.roleName', type: 'string', description: '角色名称' }
        ]
      },
      {
        path: '/api/auth/logout',
        method: 'POST',
        description: '用户登出，注销访问令牌',
        authRequired: true
      },
      {
        path: '/api/auth/current-user',
        method: 'GET',
        description: '获取当前登录用户信息',
        authRequired: true,
        responseExample: `{
  "code": 200,
  "data": {
    "id": 1,
    "username": "admin",
    "realName": "管理员",
    "roleName": "超级管理员",
    "plantId": 1,
    "departmentId": 1
  }
}`
      }
    ]
  },
  {
    name: '员工管理',
    icon: '👥',
    endpoints: [
      {
        path: '/api/employees',
        method: 'GET',
        description: '获取员工列表（分页）',
        authRequired: true,
        parameters: [
          { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
          { name: 'pageSize', type: 'number', required: false, description: '每页数量（默认20）' },
          { name: 'keyword', type: 'string', required: false, description: '搜索关键词（姓名/工号）' },
          { name: 'plantId', type: 'number', required: false, description: '厂区ID筛选' },
          { name: 'departmentId', type: 'number', required: false, description: '部门ID筛选' },
          { name: 'status', type: 'string', required: false, description: '在职状态（active/inactive）' }
        ],
        responseExample: `{
  "code": 200,
  "data": {
    "items": [
      {
        "id": 1,
        "employeeId": "EMP001",
        "name": "张三",
        "position": "工程师",
        "shiftType": "A",
        "status": "active"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}`
      },
      {
        path: '/api/employees/:id',
        method: 'GET',
        description: '获取员工详情',
        authRequired: true,
        parameters: [
          { name: 'id', type: 'number', required: true, description: '员工ID' }
        ]
      },
      {
        path: '/api/employees',
        method: 'POST',
        description: '创建新员工',
        authRequired: true,
        parameters: [
          { name: 'employeeId', type: 'string', required: true, description: '工号' },
          { name: 'name', type: 'string', required: true, description: '姓名' },
          { name: 'position', type: 'string', required: true, description: '职位' },
          { name: 'shiftType', type: 'string', required: true, description: '班次类型（A/B/C）' }
        ]
      },
      {
        path: '/api/employees/:id',
        method: 'PUT',
        description: '更新员工信息',
        authRequired: true
      },
      {
        path: '/api/employees/:id',
        method: 'DELETE',
        description: '删除员工',
        authRequired: true
      }
    ]
  },
  {
    name: '排班管理',
    icon: '📅',
    endpoints: [
      {
        path: '/api/schedules',
        method: 'GET',
        description: '获取排班列表',
        authRequired: true,
        parameters: [
          { name: 'startDate', type: 'string', required: false, description: '开始日期（YYYY-MM-DD）' },
          { name: 'endDate', type: 'string', required: false, description: '结束日期（YYYY-MM-DD）' },
          { name: 'employeeId', type: 'number', required: false, description: '员工ID' }
        ]
      },
      {
        path: '/api/schedules',
        method: 'POST',
        description: '创建排班记录',
        authRequired: true
      },
      {
        path: '/api/schedules/batch',
        method: 'POST',
        description: '批量创建排班',
        authRequired: true
      },
      {
        path: '/api/schedules/:id',
        method: 'PUT',
        description: '更新排班记录',
        authRequired: true
      },
      {
        path: '/api/schedules/:id',
        method: 'DELETE',
        description: '删除排班记录',
        authRequired: true
      },
      {
        path: '/api/smart-schedule',
        method: 'POST',
        description: '智能排班生成',
        authRequired: true,
        parameters: [
          { name: 'plantId', type: 'number', required: true, description: '厂区ID' },
          { name: 'startDate', type: 'string', required: true, description: '开始日期' },
          { name: 'endDate', type: 'string', required: true, description: '结束日期' }
        ]
      }
    ]
  },
  {
    name: '部门管理',
    icon: '🏢',
    endpoints: [
      {
        path: '/api/departments',
        method: 'GET',
        description: '获取部门列表',
        authRequired: true,
        parameters: [
          { name: 'plantId', type: 'number', required: false, description: '厂区ID' }
        ]
      },
      {
        path: '/api/departments',
        method: 'POST',
        description: '创建部门',
        authRequired: true
      },
      {
        path: '/api/departments/:id',
        method: 'PUT',
        description: '更新部门信息',
        authRequired: true
      },
      {
        path: '/api/departments/:id',
        method: 'DELETE',
        description: '删除部门',
        authRequired: true
      }
    ]
  },
  {
    name: '厂区管理',
    icon: '🏭',
    endpoints: [
      {
        path: '/api/plants',
        method: 'GET',
        description: '获取厂区列表',
        authRequired: true
      },
      {
        path: '/api/plants',
        method: 'POST',
        description: '创建厂区',
        authRequired: true
      },
      {
        path: '/api/plants/:id',
        method: 'PUT',
        description: '更新厂区信息',
        authRequired: true
      },
      {
        path: '/api/plants/:id',
        method: 'DELETE',
        description: '删除厂区',
        authRequired: true
      }
    ]
  },
  {
    name: 'K045管理',
    icon: '📦',
    endpoints: [
      {
        path: '/api/k045/documents',
        method: 'GET',
        description: '获取K045单据列表',
        authRequired: true,
        parameters: [
          { name: 'status', type: 'string', required: false, description: '单据状态' },
          { name: 'date', type: 'string', required: false, description: '日期' }
        ]
      },
      {
        path: '/api/k045/documents',
        method: 'POST',
        description: '创建K045单据',
        authRequired: true
      },
      {
        path: '/api/k045/documents/:id',
        method: 'PUT',
        description: '更新K045单据',
        authRequired: true
      },
      {
        path: '/api/k045/documents/:id/approve',
        method: 'POST',
        description: '审批K045单据',
        authRequired: true
      }
    ]
  },
  {
    name: '管控物料',
    icon: '📋',
    endpoints: [
      {
        path: '/api/da-materials/documents',
        method: 'GET',
        description: '获取管控物料单据列表',
        authRequired: true
      },
      {
        path: '/api/da-materials/documents',
        method: 'POST',
        description: '创建管控物料单据',
        authRequired: true
      },
      {
        path: '/api/da-materials/documents/:id',
        method: 'PUT',
        description: '更新管控物料单据',
        authRequired: true
      }
    ]
  },
  {
    name: '请假公差',
    icon: '📝',
    endpoints: [
      {
        path: '/api/leaves',
        method: 'GET',
        description: '获取请假记录列表',
        authRequired: true
      },
      {
        path: '/api/leaves',
        method: 'POST',
        description: '创建请假记录',
        authRequired: true,
        parameters: [
          { name: 'employeeId', type: 'number', required: true, description: '员工ID' },
          { name: 'type', type: 'string', required: true, description: '请假类型（leave/overtime）' },
          { name: 'startDate', type: 'string', required: true, description: '开始日期' },
          { name: 'endDate', type: 'string', required: true, description: '结束日期' },
          { name: 'reason', type: 'string', required: false, description: '原因' }
        ]
      },
      {
        path: '/api/leaves/:id',
        method: 'PUT',
        description: '更新请假记录',
        authRequired: true
      },
      {
        path: '/api/leaves/:id/approve',
        method: 'POST',
        description: '审批请假记录',
        authRequired: true
      }
    ]
  },
  {
    name: 'PNC转仓打印',
    icon: '🖨️',
    endpoints: [
      {
        path: '/api/pnc-transfer/documents',
        method: 'GET',
        description: '获取PNC转仓单据列表',
        authRequired: true
      },
      {
        path: '/api/pnc-transfer/documents',
        method: 'POST',
        description: '创建PNC转仓单据',
        authRequired: true,
        parameters: [
          { name: 'configId', type: 'number', required: true, description: '配置ID' },
          { name: 'departmentId', type: 'number', required: true, description: '部门ID' },
          { name: 'items', type: 'array', required: true, description: '物料列表' }
        ]
      },
      {
        path: '/api/pnc-transfer/configs',
        method: 'GET',
        description: '获取打印配置列表',
        authRequired: true
      },
      {
        path: '/api/pnc-transfer/configs',
        method: 'POST',
        description: '创建打印配置',
        authRequired: true
      }
    ]
  },
  {
    name: 'K**差异登记',
    icon: '📊',
    endpoints: [
      {
        path: '/api/k2-diff/records',
        method: 'GET',
        description: '获取K**差异记录列表',
        authRequired: true
      },
      {
        path: '/api/k2-diff/records',
        method: 'POST',
        description: '创建K**差异记录',
        authRequired: true
      },
      {
        path: '/api/k2-diff/scan',
        method: 'POST',
        description: '扫描物料条码',
        authRequired: true,
        parameters: [
          { name: 'barcode', type: 'string', required: true, description: '物料条码' }
        ]
      }
    ]
  },
  {
    name: '系统公告',
    icon: '📢',
    endpoints: [
      {
        path: '/api/announcements',
        method: 'GET',
        description: '获取公告列表',
        authRequired: true
      },
      {
        path: '/api/announcements',
        method: 'POST',
        description: '创建公告',
        authRequired: true
      },
      {
        path: '/api/announcements/:id',
        method: 'PUT',
        description: '更新公告',
        authRequired: true
      },
      {
        path: '/api/announcements/:id',
        method: 'DELETE',
        description: '删除公告',
        authRequired: true
      }
    ]
  },
  {
    name: '用户权限',
    icon: '🔐',
    endpoints: [
      {
        path: '/api/users',
        method: 'GET',
        description: '获取用户列表',
        authRequired: true
      },
      {
        path: '/api/users',
        method: 'POST',
        description: '创建用户',
        authRequired: true
      },
      {
        path: '/api/users/:id',
        method: 'PUT',
        description: '更新用户',
        authRequired: true
      },
      {
        path: '/api/users/:id',
        method: 'DELETE',
        description: '删除用户',
        authRequired: true
      },
      {
        path: '/api/roles',
        method: 'GET',
        description: '获取角色列表',
        authRequired: true
      },
      {
        path: '/api/permissions',
        method: 'GET',
        description: '获取权限列表',
        authRequired: true
      }
    ]
  },
  {
    name: 'Cost汇总',
    icon: '💰',
    endpoints: [
      {
        path: '/api/cost-summary',
        method: 'GET',
        description: '获取Cost汇总数据',
        authRequired: true,
        parameters: [
          { name: 'month', type: 'string', required: false, description: '月份（YYYY-MM）' },
          { name: 'plantId', type: 'number', required: false, description: '厂区ID' }
        ]
      },
      {
        path: '/api/cost-summary/export',
        method: 'GET',
        description: '导出Cost汇总Excel',
        authRequired: true
      }
    ]
  },
  {
    name: '系统配置',
    icon: '⚙️',
    endpoints: [
      {
        path: '/api/system/version',
        method: 'GET',
        description: '获取系统版本信息',
        authRequired: false,
        responseExample: `{
  "currentVersion": "1.1.4",
  "backendVersion": "1.1.4",
  "releaseDate": "2026-07-29",
  "buildTime": "2026/07/29 12:00:00",
  "nodeVersion": "v24.14.0",
  "versions": [
    {"version": "1.1.4", "date": "2026-07-29"}
  ]
}`
      },
      {
        path: '/api/system/health',
        method: 'GET',
        description: '系统健康检查',
        authRequired: false
      }
    ]
  }
]);

const totalEndpoints = computed(() => {
  return apiGroups.value.reduce((sum, group) => sum + group.endpoints.length, 0);
});

const filteredGroups = computed(() => {
  let groups = apiGroups.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    groups = groups.map(group => ({
      ...group,
      endpoints: group.endpoints.filter(ep =>
        ep.path.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query)
      )
    })).filter(group => group.endpoints.length > 0);
  }

  if (selectedMethod.value) {
    groups = groups.map(group => ({
      ...group,
      endpoints: group.endpoints.filter(ep => ep.method === selectedMethod.value)
    })).filter(group => group.endpoints.length > 0);
  }

  return groups;
});

const toggleGroup = (name: string) => {
  if (expandedGroups.value.has(name)) {
    expandedGroups.value.delete(name);
  } else {
    expandedGroups.value.add(name);
  }
};

const selectEndpoint = (endpoint: ApiEndpoint) => {
  selectedEndpoint.value = endpoint;
  showDetail.value = true;
};
</script>

<style scoped>
.api-docs-container {
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

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.method-filter {
  width: 150px;
}

/* 接口分组 */
.api-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.api-group {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.group-header:hover {
  background: #F9FAFB;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-icon {
  font-size: 24px;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.group-count {
  font-size: 14px;
  color: #6B7280;
}

.expand-icon {
  font-size: 12px;
  color: #9CA3AF;
}

/* 接口列表 */
.endpoints-list {
  border-top: 1px solid #E5E7EB;
}

.endpoint-item {
  padding: 16px 20px;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  transition: background 0.2s;
}

.endpoint-item:last-child {
  border-bottom: none;
}

.endpoint-item:hover {
  background: #F9FAFB;
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.method-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}

.method-get {
  background: #D1FAE5;
  color: #059669;
}

.method-post {
  background: #DBEAFE;
  color: #2563EB;
}

.method-put {
  background: #FEF3C7;
  color: #D97706;
}

.method-delete {
  background: #FEE2E2;
  color: #DC2626;
}

.method-patch {
  background: #F3E8FF;
  color: #9333EA;
}

.endpoint-path {
  font-family: monospace;
  font-size: 14px;
  color: #111827;
}

.auth-badge {
  font-size: 12px;
  color: #F59E0B;
  background: #FEF3C7;
  padding: 2px 8px;
  border-radius: 4px;
}

.endpoint-desc {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 8px;
}

.endpoint-params {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.params-label {
  font-size: 12px;
  color: #9CA3AF;
}

.param-tag {
  font-size: 12px;
  background: #E5E7EB;
  color: #374151;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9CA3AF;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

/* 详情弹窗 */
.detail-section {
  margin-bottom: 20px;
}

.detail-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.detail-content {
  font-size: 14px;
  color: #6B7280;
}

.code-block {
  background: #1F2937;
  color: #E5E7EB;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

<style>
.api-detail-dialog .el-dialog__header {
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
