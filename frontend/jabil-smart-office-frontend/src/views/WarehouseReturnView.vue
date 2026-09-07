<template>
  <div class="warehouse-return-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">产线回仓申请</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-refresh" @click="loadStats">刷新</button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card stat-card-orange" @click="filterByStatus('pending_receiving')">
        <div class="stat-icon-bg">
          <span class="stat-icon">📥</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pendingReceiving }}</div>
          <div class="stat-label">待接收</div>
        </div>
      </div>
      <div class="stat-card stat-card-blue" @click="filterByStatus('received')">
        <div class="stat-icon-bg">
          <span class="stat-icon">📋</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.received }}</div>
          <div class="stat-label">待对账</div>
        </div>
      </div>
      <div class="stat-card stat-card-yellow" @click="filterByStatus('processing')">
        <div class="stat-icon-bg">
          <span class="stat-icon">🔄</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.processing }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>
      <div class="stat-card stat-card-green" @click="filterByStatus('closed')">
        <div class="stat-icon-bg">
          <span class="stat-icon">✅</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.closed }}</div>
          <div class="stat-label">已完结</div>
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button v-for="tab in tabs" :key="tab.key" :class="['tab-btn', { active: activeTab === tab.key }]" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-show="activeTab === 'submit'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
          <div class="table-card-actions">
            <button class="btn btn-solid" @click="openCreateDialog">新建产线回仓申请</button>
          </div>
        </div>
        <div class="card-body">
          <div class="search-bar">
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>单号</label>
                <input type="text" v-model="searchQuery.returnNo" placeholder="请输入单号" @keyup.enter="handleSearch">
              </div>
            </div>
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>Bay号</label>
                <input type="text" v-model="searchQuery.bayNo" placeholder="请输入Bay号" @keyup.enter="handleSearch">
              </div>
            </div>
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>接收Building</label>
                <el-select v-model="searchQuery.receiveBuilding" placeholder="请选择" clearable filterable>
                  <el-option v-for="b in buildings" :key="b.code" :label="b.name" :value="b.code" />
                </el-select>
              </div>
            </div>
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>提交人</label>
                <input type="text" v-model="searchQuery.submitterName" placeholder="请输入提交人" @keyup.enter="handleSearch">
              </div>
            </div>
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>状态</label>
                <el-select v-model="searchQuery.status" placeholder="请选择" clearable>
                  <el-option label="待仓库接收" value="pending_receiving" />
                  <el-option label="仓库已接收" value="received" />
                  <el-option label="对账完成" value="reconciled_full_match" />
                  <el-option label="部分退回" value="reconciled_partial_return" />
                  <el-option label="已完结" value="closed" />
                </el-select>
              </div>
            </div>
            <div class="search-item">
              <div class="search-item-wrapper">
                <label>提交时间</label>
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                />
              </div>
            </div>
            <div class="search-actions">
              <button class="btn btn-solid" @click="handleSearch">查询</button>
              <button class="btn btn-outline" @click="resetSearch">重置</button>
            </div>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>回仓单号</th>
                  <th>Bay号</th>
                  <th>接收Building</th>
                  <th>提交人</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.id">
                  <td>{{ doc.returnNo }}</td>
                  <td>{{ doc.bayNo }}</td>
                  <td>{{ doc.receiveBuilding }}</td>
                  <td>{{ doc.submitterName }}</td>
                  <td>{{ formatDate(doc.createdAt) }}</td>
                  <td><span class="status-badge" :style="getStatusStyle(doc.status)">{{ getStatusText(doc.status, doc.pendingCount) }}</span></td>
                  <td>
                    <div class="table-actions">
                      <button class="action-btn view" @click="viewDocument(doc)">查看</button>
                      <button class="action-btn print" @click="printDocument(doc)">补打</button>
                      <button v-if="doc.status !== 'pending_receiving'" class="action-btn transfer" @click="generateTransferOrder(doc)">生成转仓单</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="documents.length === 0">
                  <td colspan="7" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'warehouse'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>回仓单号</th>
                  <th>Bay号</th>
                  <th>接收Building</th>
                  <th>提交人</th>
                  <th>状态</th>
                  <th>接收时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in documents" :key="doc.id">
                  <td>{{ doc.returnNo }}</td>
                  <td>{{ doc.bayNo }}</td>
                  <td>{{ doc.receiveBuilding }}</td>
                  <td>{{ doc.submitterName }}</td>
                  <td><span class="status-badge" :style="getStatusStyle(doc.status)">{{ getStatusText(doc.status, doc.pendingCount) }}</span></td>
                  <td>{{ formatDate(doc.receivedAt) }}</td>
                  <td>
                    <div class="table-actions">
                      <button class="action-btn view" @click="viewDocument(doc)">查看</button>
                      <button class="action-btn print" @click="printDocument(doc)">补打</button>
                      <button v-if="doc.status === 'pending_receiving'" class="action-btn receive" @click="handleReceive(doc)">接收</button>
                      <button v-if="doc.status === 'received' || doc.status === 'reconciled_diff'" class="action-btn reconcile" @click="openReconcileDialog(doc)">{{ doc.status === 'reconciled_diff' ? '继续对账' : '对账' }}</button>
                      <button v-if="doc.status !== 'pending_receiving'" class="action-btn transfer" @click="generateTransferOrder(doc)">生成转仓单</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="documents.length === 0">
                  <td colspan="7" class="empty-cell">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'config'" class="tab-content">
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">{{ currentTabTitle }}</div>
        </div>
        <div class="card-body">
          <!-- 邮件抄送配置 -->
          <div class="config-card">
            <div class="config-card-header">
              <div class="config-card-icon">
                <el-icon><Message /></el-icon>
              </div>
              <div class="config-card-info">
                <h3>邮件抄送设置</h3>
                <p>配置退回邮件的默认抄送人员，多个邮箱用逗号分隔</p>
              </div>
            </div>
            <div class="config-card-body">
              <el-form label-width="100px">
                <el-form-item label="抄送邮箱">
                  <el-input v-model="emailCcInput" placeholder="如：user1@example.com, user2@example.com" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="saveEmailCc">保存邮件配置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <!-- 接收Building配置 -->
          <div class="config-card">
            <div class="config-card-header">
              <div class="config-card-icon">
                <el-icon><OfficeBuilding /></el-icon>
              </div>
              <div class="config-card-info">
                <h3>接收Building配置</h3>
                <p>配置产线回仓申请的接收Building下拉选项</p>
              </div>
            </div>
            <div class="config-card-body">
              <el-table :data="buildingConfigs" border style="width: 100%; margin-bottom: 16px;" size="small">
                <el-table-column label="启用" width="70" align="center">
                  <template #default="{ $index }">
                    <el-checkbox v-model="buildingConfigs[$index].isActive" />
                  </template>
                </el-table-column>
                <el-table-column label="Building" prop="code">
                  <template #default="{ $index }">
                    <el-select v-model="buildingConfigs[$index].code" placeholder="请选择Building" clearable style="width: 100%">
                      <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.name" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="仓位" prop="name">
                  <template #default="{ $index }">
                    <el-input v-model="buildingConfigs[$index].name" placeholder="请输入仓位" />
                  </template>
                </el-table-column>
                <el-table-column label="系统位置" prop="systemLocation">
                  <template #default="{ $index }">
                    <el-input v-model="buildingConfigs[$index].systemLocation" placeholder="请输入系统位置" />
                  </template>
                </el-table-column>
                <el-table-column label="邮箱" prop="email">
                  <template #default="{ $index }">
                    <el-tooltip :content="buildingConfigs[$index].email || '多个邮箱用逗号分隔'" placement="top" :disabled="!buildingConfigs[$index].email">
                      <el-input v-model="buildingConfigs[$index].email" placeholder="多个用逗号分隔" />
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ $index }">
                    <el-button type="danger" size="small" link @click="removeBuilding($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="config-actions">
                <el-button @click="addBuilding">添加Building</el-button>
                <el-button type="primary" @click="saveBuildings">保存Building配置</el-button>
              </div>
            </div>
          </div>

          <!-- 仓库-用户映射配置 -->
          <div class="config-card">
            <div class="config-card-header">
              <div class="config-card-icon">
                <el-icon><Setting /></el-icon>
              </div>
              <div class="config-card-info">
                <h3>仓库-用户映射配置</h3>
                <p>配置对账时SAP筛选的warehouse值与user_name值（支持同一warehouse多个user_name）</p>
              </div>
            </div>
            <div class="config-card-body">
              <el-table :data="warehouseMappings" border size="small" style="width: 100%; margin-bottom: 16px;">
                <el-table-column prop="warehouse" label="Warehouse值" min-width="140">
                  <template #default="{ row, $index }">
                    <el-input v-model="row.warehouse" size="small" placeholder="如: WH01" />
                  </template>
                </el-table-column>
                <el-table-column prop="username" label="Username值" min-width="140">
                  <template #default="{ row, $index }">
                    <el-input v-model="row.username" size="small" placeholder="如: zhangsan" />
                  </template>
                </el-table-column>
                <el-table-column prop="isActive" label="启用" width="70" align="center">
                  <template #default="{ row }">
                    <el-switch v-model="row.isActive" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="70" align="center">
                  <template #default="{ row, $index }">
                    <el-button type="danger" size="small" text @click="removeMapping($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="mapping-actions">
                <el-button size="small" @click="addMapping">+ 添加</el-button>
                <el-button type="primary" size="small" @click="saveMappings">保存配置</el-button>
              </div>
              <div class="config-hint">
                💡 提示：同一warehouse可配置多个username（如WH01配user001、user002），对账时会匹配任一组合
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="closeCreateDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>📝 新建产线回仓申请</h3>
          <button class="dialog-close" @click="closeCreateDialog">✕</button>
        </div>
        <div class="dialog-body">
          <!-- 模式切换 -->
          <div class="create-mode-tabs">
            <button :class="['mode-tab', { active: createMode === 'upload' }]" @click="createMode = 'upload'">
              <span class="mode-icon">📤</span>
              <span>上传附件模式</span>
            </button>
            <button :class="['mode-tab', { active: createMode === 'scan' }]" @click="switchToScanMode">
              <span class="mode-icon">📷</span>
              <span>扫码枪扫描模式</span>
            </button>
          </div>

          <!-- 基础信息 -->
          <div class="form-group">
            <label class="form-label required">Bay号</label>
            <input type="text" v-model="formData.bayNo" class="form-input" placeholder="请输入Bay号">
          </div>
          <div class="form-group">
            <label class="form-label required">接收Building</label>
            <select v-model="formData.receiveBuilding" class="form-select">
              <option value="">请选择接收Building</option>
              <option v-for="b in buildings" :key="b.code" :value="b.code">{{ b.name }}</option>
            </select>
          </div>

          <!-- 上传模式 -->
          <div v-if="createMode === 'upload'" class="form-group">
            <label class="form-label">物料清单</label>
            <div class="upload-buttons">
              <button class="btn btn-outline" @click="downloadTemplate">
                <span class="btn-icon">📥</span> 下载模板
              </button>
              <button class="btn btn-solid" @click="$refs.fileInput.click()">
                <span class="btn-icon">📤</span> 导入Excel
              </button>
            </div>
            <input type="file" ref="fileInput" accept=".xlsx,.xls" @change="handleFileUpload" style="display:none">
            <div class="upload-hint">📋 提示：Material、GRN、Qty三列为必填，Bay号自动使用上方输入的Bay号</div>
          </div>

          <!-- 扫码模式 -->
          <div v-if="createMode === 'scan'" class="scan-mode">
            <div class="scan-input-area">
              <label class="form-label">扫码输入区</label>
              <div class="scan-input-wrapper">
                <input
                  v-model="scanInput"
                  class="scan-input"
                  :placeholder="getScanPlaceholder()"
                  @keydown="handleScanKeydown"
                >
                <button class="btn btn-solid btn-sm" @click="manualAddScanItem">手动添加</button>
                <button class="btn btn-outline btn-sm" @click="clearScanItems">清空列表</button>
              </div>
              <div class="scan-hint">
                <span>📷 扫描枪连续扫描：Material → GRN → Qty，自动分步录入</span>
              </div>
              <!-- 扫码进度指示 -->
              <div class="scan-progress" v-if="formData.bayNo">
                <span :class="['progress-step', { active: scanStep === 0, done: scanStep > 0 }]">
                  {{ scanStep > 0 ? '✓' : '1' }} Material
                </span>
                <span class="progress-arrow">→</span>
                <span :class="['progress-step', { active: scanStep === 1, done: scanStep > 1 }]">
                  {{ scanStep > 1 ? '✓' : '2' }} GRN
                </span>
                <span class="progress-arrow">→</span>
                <span :class="['progress-step', { active: scanStep === 2 }]">
                  {{ scanStep === 2 ? '3' : '3' }} Qty
                </span>
                <span class="progress-cached" v-if="scanCache.material">
                  已扫描: {{ scanCache.material }}{{ scanCache.grn ? ' * ' + scanCache.grn : '' }}{{ scanCache.qty ? ' * ' + scanCache.qty : '' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 物料预览列表 -->
          <div v-if="formData.items.length > 0" class="items-preview">
            <div class="preview-header">
              <span>已录入 <strong>{{ formData.items.length }}</strong> 条物料</span>
              <button class="btn btn-text" @click="clearItems">清空列表</button>
            </div>
            <table class="data-table">
              <thead><tr><th>序号</th><th>Material</th><th>GRN</th><th>Qty</th><th>Bay号</th><th>录入方式</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="(item, index) in formData.items" :key="index">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>{{ item.material }}</td>
                  <td>{{ item.grn || '-' }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ item.bayNo }}</td>
                  <td><span :class="['entry-badge', item.entryType || 'upload']">{{ item.entryType === 'scan' ? '扫码' : '导入' }}</span></td>
                  <td><button class="action-btn delete" @click="removeItem(index)">删除</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-outline" @click="closeCreateDialog">取消</button>
          <button class="btn btn-solid" @click="submitForm" :disabled="isSubmitting || formData.items.length === 0">{{ isSubmitting ? '提交中...' : '提交' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailDialog" class="dialog-overlay" @click.self="closeDetailDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>产线回仓申请详情</h3>
          <button class="dialog-close" @click="closeDetailDialog">X</button>
        </div>
        <div class="dialog-body">
          <div class="detail-info">
            <div class="detail-row">
              <div class="detail-item"><label>回仓单号：</label><span>{{ currentDocument?.returnNo }}</span></div>
              <div class="detail-item"><label>Bay号：</label><span>{{ currentDocument?.bayNo }}</span></div>
              <div class="detail-item"><label>接收Building：</label><span>{{ currentDocument?.receiveBuilding }}</span></div>
            </div>
            <div class="detail-row">
              <div class="detail-item"><label>提交人：</label><span>{{ currentDocument?.submitterName }}</span></div>
              <div class="detail-item"><label>提交时间：</label><span>{{ formatDate(currentDocument?.createdAt) }}</span></div>
              <div class="detail-item"><label>状态：</label><span class="status-badge" :style="getStatusStyle(currentDocument?.status)">{{ getStatusText(currentDocument?.status, currentDocument?.pendingCount) }}</span></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>物料明细</h4>
            <table class="data-table">
              <thead><tr><th>Material</th><th>GRN</th><th>Qty</th><th>Bay号</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="item in currentDocument?.items" :key="item.id">
                  <td>{{ item.material }}</td>
                  <td>{{ item.grn || '-' }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ item.bayNo }}</td>
                  <td>{{ getMatchStatusText(item.matchStatus) }}</td>
                </tr>
                <tr v-if="!currentDocument?.items?.length"><td colspan="5" class="empty-cell">暂无物料明细</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeDetailDialog">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showReconcileDialog" class="dialog-overlay" @click.self="closeReconcileDialog">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>对账 - {{ currentDocument?.returnNo }}</h3>
          <button class="dialog-close" @click="closeReconcileDialog">X</button>
        </div>
        <div class="dialog-body">
          <div v-if="reconcileResult" class="reconcile-summary">
            <div class="summary-item success" style="cursor:pointer" @click="reconcileTab = 'matched'"><span class="summary-count">{{ reconcileResult.summary?.matched || 0 }}</span><span class="summary-label">匹配成功</span></div>
            <div class="summary-item warning" style="cursor:pointer" @click="reconcileTab = 'listOnly'"><span class="summary-count">{{ reconcileResult.summary?.listOnly || 0 }}</span><span class="summary-label">清单有SAP无</span></div>
            <div class="summary-item info" style="cursor:pointer" @click="reconcileTab = 'sapOnly'"><span class="summary-count">{{ reconcileResult.summary?.sapOnly || 0 }}</span><span class="summary-label">SAP有清单无</span></div>
          </div>
          <div v-if="reconcileResult" class="reconcile-tabs">
            <div class="reconcile-tab-header">
              <button :class="['reconcile-tab', { active: reconcileTab === 'matched' }]" @click="reconcileTab = 'matched'">匹配成功</button>
              <button :class="['reconcile-tab', { active: reconcileTab === 'listOnly' }]" @click="reconcileTab = 'listOnly'">清单有SAP无</button>
              <button :class="['reconcile-tab', { active: reconcileTab === 'sapOnly' }]" @click="reconcileTab = 'sapOnly'">SAP有清单无</button>
            </div>
            <div v-show="reconcileTab === 'matched'" class="reconcile-tab-content">
              <table class="data-table">
                <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th><input type="checkbox" v-model="selectAllMatched" @change="toggleSelectMatched"></th></tr></thead>
                <tbody>
                  <tr v-for="item in reconcileResult.matchedItems" :key="item.id">
                    <td>{{ item.material }}</td><td>{{ item.qty }}</td><td>{{ item.bay_no || item.bayNo }}</td>
                    <td><input type="checkbox" :value="item.id" v-model="selectedMatchedItems"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-show="reconcileTab === 'listOnly'" class="reconcile-tab-content">
              <table class="data-table">
                <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th><input type="checkbox" v-model="selectAllListOnly" @change="toggleSelectListOnly"></th></tr></thead>
                <tbody>
                  <tr v-for="item in reconcileResult.listOnlyItems" :key="item.id">
                    <td>{{ item.material }}</td><td>{{ item.qty }}</td><td>{{ item.bay_no || item.bayNo }}</td>
                    <td><input type="checkbox" :value="item.id" v-model="selectedListOnlyItems"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-show="reconcileTab === 'sapOnly'" class="reconcile-tab-content">
              <table class="data-table">
                <thead><tr><th>物料号</th><th>数量</th><th>Bay号</th><th>GRN</th></tr></thead>
                <tbody>
                  <tr v-for="item in reconcileResult.sapOnlyItems" :key="item.sap_item_id">
                    <td>{{ item.sap_material || item.material }}</td><td>{{ item.sap_quantity || item.quantity }}</td><td>{{ item.from_sloc }}</td><td>{{ item.reference || item.grn || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeReconcileDialog">取消</button>
          <button v-if="selectedListOnlyItems.length > 0" class="btn btn-warning" @click="openReturnDialog">退回选中</button>
          <button v-if="selectedMatchedItems.length > 0" class="btn btn-success" @click="handleCloseMatched">关闭选中</button>
        </div>
      </div>
    </div>

    <div v-if="showReturnDialog" class="dialog-overlay" @click.self="closeReturnDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>填写退回原因</h3>
          <button class="dialog-close" @click="closeReturnDialog">X</button>
        </div>
        <div class="dialog-body">
          <div class="form-item">
            <label class="required">退回原因：</label>
            <textarea v-model="returnReason" rows="4" placeholder="请填写退回原因"></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeReturnDialog">取消</button>
          <button class="btn btn-warning" @click="handleReturn" :disabled="!returnReason.trim()">确认退回</button>
        </div>
      </div>
    </div>

    <!-- 回仓单打印预览 -->
    <div v-if="showReturnSlipDialog" class="dialog-overlay" @click.self="showReturnSlipDialog = false">
      <div class="dialog dialog-large">
        <div class="dialog-header">
          <h3>📄 产线回仓单</h3>
          <button class="dialog-close" @click="showReturnSlipDialog = false">X</button>
        </div>
        <div class="dialog-body">
          <div class="return-slip" id="returnSlipContent">
            <div class="slip-header">
              <h2>产线回仓单</h2>
              <div class="slip-qr-area">
                <div class="slip-qr-placeholder">二维码区域</div>
              </div>
            </div>
            <div class="slip-info">
              <div class="slip-row">
                <div class="slip-item">
                  <label>回仓单号：</label>
                  <span class="slip-value slip-highlight">{{ currentDocument?.returnNo }}</span>
                </div>
                <div class="slip-item">
                  <label>Bay号：</label>
                  <span class="slip-value">{{ currentDocument?.bayNo }}</span>
                </div>
                <div class="slip-item">
                  <label>接收Building：</label>
                  <span class="slip-value">{{ currentDocument?.receiveBuilding }}</span>
                </div>
              </div>
              <div class="slip-row">
                <div class="slip-item">
                  <label>提交时间：</label>
                  <span class="slip-value">{{ formatDate(currentDocument?.createdAt) }}</span>
                </div>
                <div class="slip-item">
                  <label>物料数量：</label>
                  <span class="slip-value slip-highlight">{{ currentDocument?.items?.length || 0 }} 种</span>
                </div>
                <div class="slip-item">
                  <label>状态：</label>
                  <span class="slip-value slip-status">待接收</span>
                </div>
              </div>
            </div>
            <div class="slip-items">
              <table class="slip-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>Material</th>
                    <th>GRN</th>
                    <th>Qty</th>
                    <th>Bay号</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in currentDocument?.items" :key="index">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td>{{ item.material }}</td>
                    <td>{{ item.grn || '-' }}</td>
                    <td class="text-center">{{ item.qty }}</td>
                    <td>{{ item.bayNo }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="slip-footer">
              <div class="slip-signatures">
                <div class="signature-item">
                  <div class="signature-line">提交人签名：__________</div>
                </div>
                <div class="signature-item">
                  <div class="signature-line">仓库接收人签名：__________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-outline" @click="showReturnSlipDialog = false">关闭</button>
          <button class="btn btn-solid" @click="printReturnSlip">
            <span class="btn-icon">🖨️</span> 打印回仓单
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Message, OfficeBuilding } from '@element-plus/icons-vue';
import * as api from '../api/warehouseReturn';

const isLoading = ref(false);
const isSubmitting = ref(false);
const activeTab = ref('submit');
const tabs = [
  { key: 'submit', label: '提交管理' },
  { key: 'warehouse', label: '仓库操作' },
  { key: 'config', label: '配置管理' }
];

const stats = reactive({ pendingReceiving: 0, received: 0, processing: 0, closed: 0 });
const searchQuery = reactive({ returnNo: '', bayNo: '', receiveBuilding: '', submitterName: '', status: '' });
const dateRange = ref(null);
const documents = ref([]);
const buildings = ref([]);
const departments = ref([]);
const currentDocument = ref(null);
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const showReconcileDialog = ref(false);
const showReturnDialog = ref(false);
const showReturnSlipDialog = ref(false);
const formData = reactive({ bayNo: '', receiveBuilding: '', items: [] });
const reconcileResult = ref(null);
const reconcileTab = ref('matched');
const selectedMatchedItems = ref([]);
const selectedListOnlyItems = ref([]);
const selectAllMatched = ref(false);
const selectAllListOnly = ref(false);
const returnReason = ref('');
const emailCcInput = ref('');
const buildingConfigs = ref([]);
const warehouseMappings = ref([]);

// 扫码模式相关
const createMode = ref('upload');
const scanInput = ref('');

// 扫码缓存：分三次扫描录入一个物料
const scanCache = ref({ material: '', grn: '', qty: '' });
const scanStep = ref(0); // 0: 等待物料, 1: 等待GRN, 2: 等待Qty

const currentTabTitle = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '');

const statusTextMap = {
  pending_receiving: '待仓库接收',
  received: '仓库已接收',
  reconciled_full_match: '对账完成-匹配成功',
  reconciled_partial_return: '对账完成-部分退回',
  reconciled_diff: '对账完成-差异',
  closed: '已完结'
};

const loadStats = async () => {
  try {
    const res = await api.getStats();
    if (res?.code === 200) Object.assign(stats, res.data);
  } catch (e) { console.error(e); }
};

const loadDocuments = async () => {
  isLoading.value = true;
  try {
    const params = { page: 1, pageSize: 100, ...searchQuery };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await api.getDocuments(params);
    if (res?.code === 200) documents.value = res.data.items || [];
  } catch (e) { console.error(e); }
  finally { isLoading.value = false; }
};

const loadBuildings = async () => {
  try {
    const res = await api.getBuildings();
    if (res?.code === 200) buildings.value = res.data || [];
  } catch (e) { console.error(e); }
};

const loadDepartments = async () => {
  try {
    const res = await fetch('/api/departments', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jabil-token')}` }
    });
    const data = await res.json();
    departments.value = data?.data?.departments || data?.data || data?.departments || [];
  } catch (e) { console.error(e); }
};

const loadBuildingConfigs = async () => {
  try {
    const res = await api.getAllBuildingConfigs();
    // 响应拦截器已返回 response.data，直接用 res.code 和 res.data
    if (res?.code === 200) buildingConfigs.value = res.data || [];
  } catch (e) { console.error(e); }
};

const loadEmailCcConfig = async () => {
  try {
    const res = await api.getEmailCcConfig();
    if (res?.code === 200) {
      const configs = res.data || [];
      emailCcInput.value = configs.map(c => c.email).filter(e => e).join(', ');
    }
  } catch (e) { console.error(e); }
};

const handleSearch = () => { loadDocuments(); };
const resetSearch = () => { Object.keys(searchQuery).forEach(k => searchQuery[k] = ''); dateRange.value = null; handleSearch(); };
const filterByStatus = (status) => { searchQuery.status = status; handleSearch(); };

const openCreateDialog = () => {
  formData.bayNo = '';
  formData.receiveBuilding = '';
  formData.items = [];
  createMode.value = 'upload';
  scanInput.value = '';
  scanCache.value = { material: '', grn: '', qty: '' };
  scanStep.value = 0;
  showCreateDialog.value = true;
};
const closeCreateDialog = () => { showCreateDialog.value = false; };

// 切换到扫码模式
const switchToScanMode = () => {
  createMode.value = 'scan';
  scanCache.value = { material: '', grn: '', qty: '' };
  scanStep.value = 0;
  // 等待 DOM 更新后聚焦扫码输入框
  setTimeout(() => {
    const el = document.querySelector('.scan-input');
    if (el) el.focus();
  }, 100);
};

// 处理扫码输入
const handleScanKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    processScanInput(scanInput.value);
    scanInput.value = '';
  }
};

// 处理扫码输入，分三次扫描录入
const processScanInput = (input) => {
  if (!input || !input.trim()) return;

  const trimmed = input.trim();
  const bayNo = formData.bayNo;

  if (!bayNo) {
    ElMessage.warning('请先输入Bay号');
    return;
  }

  // 根据当前步骤处理输入
  if (scanStep.value === 0) {
    // 第一步：扫描 Material
    scanCache.value.material = trimmed;
    scanStep.value = 1;
    ElMessage.info(`已扫描 Material: ${trimmed}，请扫描 GRN`);
  } else if (scanStep.value === 1) {
    // 第二步：扫描 GRN，去掉前两位9K
    let grn = trimmed;
    if (grn.substring(0, 2).toUpperCase() === '9K') {
      grn = grn.substring(2);
    }
    scanCache.value.grn = grn;
    scanStep.value = 2;
    ElMessage.info(`已扫描 GRN: ${grn}，请扫描 Qty`);
  } else if (scanStep.value === 2) {
    // 第三步：扫描 Qty，去掉前一位Q
    let qtyStr = trimmed;
    if (qtyStr.charAt(0).toUpperCase() === 'Q') {
      qtyStr = qtyStr.substring(1);
    }
    const qty = parseFloat(qtyStr) || 1;
    scanCache.value.qty = qty;

    // 完成扫描，添加到列表
    addScannedItem(scanCache.value.material, scanCache.value.grn, scanCache.value.qty, bayNo);

    // 重置缓存，开始下一轮扫描
    scanCache.value = { material: '', grn: '', qty: '' };
    scanStep.value = 0;
  }

  // 扫码后自动聚焦回输入框
  setTimeout(() => {
    const el = document.querySelector('.scan-input');
    if (el) el.focus();
  }, 50);
};

// 添加扫码物料
const addScannedItem = (material, grn, qty, bayNo) => {
  if (!material) {
    ElMessage.warning('请输入有效的物料号');
    return;
  }

  // 检查是否已存在，存在则累加数量
  const existingIndex = formData.items.findIndex(item => item.material === material && item.bayNo === bayNo);
  if (existingIndex >= 0) {
    formData.items[existingIndex].qty += qty;
    if (grn) formData.items[existingIndex].grn = grn;
    ElMessage.success(`已更新物料 ${material}，数量累加为 ${formData.items[existingIndex].qty}`);
  } else {
    formData.items.push({ grn, material, qty, bayNo, entryType: 'scan' });
    ElMessage.success(`已添加物料 ${material}`);
  }
};

// 手动添加扫码项
const manualAddScanItem = () => {
  if (!formData.bayNo) {
    ElMessage.warning('请先输入Bay号');
    return;
  }
  processScanInput(scanInput.value);
  scanInput.value = '';
};

// 清空扫码缓存和列表
const clearScanItems = () => {
  scanCache.value = { material: '', grn: '', qty: '' };
  scanStep.value = 0;
  formData.items = formData.items.filter(item => item.entryType !== 'scan');
  ElMessage.success('已清空扫码录入的物料');
};

// 获取扫码输入框提示文字
const getScanPlaceholder = () => {
  if (scanStep.value === 0) return '请扫描 Material 条码...';
  if (scanStep.value === 1) return '请扫描 GRN 条码...';
  if (scanStep.value === 2) return '请扫描 Qty 条码...';
  return '请扫描 Material 条码...';
};

const viewDocument = async (doc) => {
  try {
    const res = await api.getDocumentById(doc.id);
    if (res?.code === 200) { currentDocument.value = res.data; showDetailDialog.value = true; }
  } catch (e) { ElMessage.error('加载失败'); }
};

// 补打回仓单
const printDocument = async (doc) => {
  try {
    const res = await api.getDocumentById(doc.id);
    if (res?.code === 200) {
      currentDocument.value = res.data;
      showReturnSlipDialog.value = true;
    }
  } catch (e) { ElMessage.error('加载失败'); }
};

// 生成转仓单并自动打印两张（预留功能）
const generateTransferOrder = async (doc) => {
  try {
    ElMessage.info('正在生成转仓单...');
    // TODO: 待提供接口后替换为实际API调用
    // const res = await api.generateTransferOrder(doc.id);
    // if (res?.code === 200) {
    //   ElMessage.success('转仓单生成成功，正在打印...');
    //   // 自动打印两张
    //   printTransferOrder(res.data);
    //   printTransferOrder(res.data);
    // }
    ElMessage.success('转仓单生成功能预留中');
  } catch (e) {
    ElMessage.error('生成转仓单失败');
  }
};

const closeDetailDialog = () => { showDetailDialog.value = false; currentDocument.value = null; };

const handleFileUpload = async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const items = [];
      jsonData.forEach((row, i) => {
        const m = String(row.Material || row.material || '').trim();
        const grn = String(row.GRN || row.grn || '').trim();
        const q = parseFloat(row.Qty || row.qty || 0);
        if (m && q > 0) {
          items.push({ material: m, grn, qty: q, bayNo: formData.bayNo, entryType: 'upload' });
        }
      });
      // 如果切换到扫码模式上传文件，自动切换回上传模式
      if (createMode.value === 'scan' && items.length > 0) {
        createMode.value = 'upload';
      }
      formData.items = items;
      ElMessage.success('成功导入 ' + items.length + ' 条');
    };
    reader.readAsArrayBuffer(file);
  } catch (e) { ElMessage.error('解析失败'); }
  event.target.value = '';
};

const downloadTemplate = () => {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet([{ Material: 'M001', GRN: 'GRN001', Qty: 100 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物料清单');
    XLSX.writeFile(wb, '产线回仓申请物料清单模板.xlsx');
  });
};

const clearItems = () => { formData.items = []; };
const removeItem = (index) => { formData.items.splice(index, 1); };

const submitForm = async () => {
  if (!formData.bayNo || !formData.receiveBuilding || formData.items.length === 0) {
    ElMessage.error('请填写完整信息'); return;
  }
  isSubmitting.value = true;
  try {
    const res = await api.createDocument(formData);
    if (res?.code === 200) {
      ElMessage.success('提交成功');
      // 显示回仓单打印预览
      if (res.data?.returnNo) {
        currentDocument.value = {
          returnNo: res.data.returnNo,
          bayNo: formData.bayNo,
          receiveBuilding: formData.receiveBuilding,
          items: [...formData.items],
          createdAt: new Date().toISOString()
        };
        showReturnSlipDialog.value = true;
      }
      closeCreateDialog();
      loadDocuments();
      loadStats();
    }
  } catch (e) { ElMessage.error(e.response?.data?.message || '提交失败'); }
  finally { isSubmitting.value = false; }
};

const handleReceive = async (doc) => {
  try {
    const res = await api.receiveDocument(doc.id);
    if (res?.code === 200) { ElMessage.success('已接收'); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('接收失败'); }
};

const openReconcileDialog = async (doc) => {
  try {
    reconcileResult.value = null; // 清除旧结果
    const detailRes = await api.getDocumentById(doc.id);
    if (detailRes?.data?.code === 200) currentDocument.value = detailRes.data.data;
    const res = await api.reconcileDocument(doc.id);
    if (res?.code === 200) {
      reconcileResult.value = res.data;
      selectedMatchedItems.value = []; selectedListOnlyItems.value = [];
      reconcileTab.value = 'matched'; // 重置到第一个标签
      showReconcileDialog.value = true;
    }
  } catch (e) { ElMessage.error('对账失败'); }
};

const closeReconcileDialog = () => { showReconcileDialog.value = false; reconcileResult.value = null; };
const toggleSelectMatched = () => { selectedMatchedItems.value = selectAllMatched.value ? (reconcileResult.value?.matchedItems?.map(i => i.id) || []) : []; };
const toggleSelectListOnly = () => { selectedListOnlyItems.value = selectAllListOnly.value ? (reconcileResult.value?.listOnlyItems?.map(i => i.id) || []) : []; };

const openReturnDialog = () => { showReturnDialog.value = true; };
const closeReturnDialog = () => { showReturnDialog.value = false; returnReason.value = ''; };

// 打印回仓单
const printReturnSlip = () => {
  const printContent = document.getElementById('returnSlipContent');
  if (!printContent) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    ElMessage.error('无法打开打印窗口，请检查浏览器弹窗设置');
    return;
  }

  printWindow.document.write(`
    <html>
    <head>
      <title>产线回仓单 - ${currentDocument.value?.returnNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; font-size: 14px; }
        .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .slip-header h2 { font-size: 24px; color: #333; }
        .slip-qr-area { width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; }
        .slip-info { margin-bottom: 20px; }
        .slip-row { display: flex; gap: 30px; margin-bottom: 12px; }
        .slip-item { flex: 1; }
        .slip-item label { color: #666; }
        .slip-value { font-weight: 600; color: #333; }
        .slip-highlight { font-size: 16px; color: #e74c3c; }
        .slip-status { color: #f39c12; }
        .slip-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .slip-table th, .slip-table td { border: 1px solid #333; padding: 10px 8px; text-align: left; }
        .slip-table th { background: #f5f5f5; font-weight: 600; }
        .slip-table td { text-align: center; }
        .slip-footer { margin-top: 40px; }
        .slip-signatures { display: flex; gap: 60px; }
        .signature-line { font-size: 14px; color: #333; }
      </style>
    </head>
    <body>
      ${printContent.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};

const handleReturn = async () => {
  try {
    const res = await api.returnItems(currentDocument.value.id, { itemIds: selectedListOnlyItems.value, reason: returnReason.value });
    if (res?.code === 200) { ElMessage.success('退回成功'); closeReturnDialog(); closeReconcileDialog(); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('退回失败'); }
};

const handleCloseMatched = async () => {
  try {
    const res = await api.closeItems(currentDocument.value.id, { itemIds: selectedMatchedItems.value });
    if (res?.code === 200) { ElMessage.success('关闭成功'); closeReconcileDialog(); loadDocuments(); loadStats(); }
  } catch (e) { ElMessage.error('关闭失败'); }
};

const saveEmailCc = async () => {
  try {
    const emails = emailCcInput.value.split(',').map(e => e.trim()).filter(e => e);
    const configs = emails.map(email => ({ email, emailType: 'cc' }));
    const res = await api.saveEmailCcConfig({ configs });
    if (res?.code === 200) ElMessage.success('保存成功');
  } catch (e) { ElMessage.error('保存失败'); }
};

const addBuilding = () => { buildingConfigs.value.push({ code: '', name: '', systemLocation: '', email: '', isActive: true }); };

const removeBuilding = (index) => {
  if (buildingConfigs.value.filter(b => b.isActive).length <= 1 && buildingConfigs.value[index].isActive) {
    ElMessage.warning('至少保留一个'); return;
  }
  buildingConfigs.value.splice(index, 1);
};

const saveBuildings = async () => {
  for (let i = 0; i < buildingConfigs.value.length; i++) {
    if (!buildingConfigs.value[i].code || !buildingConfigs.value[i].name) {
      ElMessage.warning('编码和名称不能为空'); return;
    }
  }
  try {
    const res = await api.saveBuildingConfigs({ buildings: buildingConfigs.value });
    if (res?.code === 200) { ElMessage.success('保存成功'); loadBuildingConfigs(); }
  } catch (e) { ElMessage.error('保存失败'); }
};

// 加载SAP字段映射配置
const loadWarehouseMappings = async () => {
  try {
    const res = await api.getWarehouseReturnConfig();
    if (res?.code === 200) {
      warehouseMappings.value = (res.data?.mappings || []).map(m => ({
        id: m.id,
        warehouse: m.warehouse || '',
        username: m.username || '',
        isActive: m.isActive !== false
      }));
    }
  } catch (e) { console.error('加载配置失败', e); }
};

// 添加映射
const addMapping = () => {
  warehouseMappings.value.push({ warehouse: '', username: '', isActive: true });
};

const removeMapping = (index) => {
  const item = warehouseMappings.value[index];
  if (item.id) {
    // 已保存的记录，调用删除接口
    ElMessageBox.confirm('确定要删除此映射配置吗？', '提示', { type: 'warning' })
      .then(async () => {
        try {
          const res = await api.deleteWarehouseReturnConfig(item.id);
          if (res?.code === 200) {
            warehouseMappings.value.splice(index, 1);
            ElMessage.success('删除成功');
          }
        } catch (e) { ElMessage.error('删除失败'); }
      })
      .catch(() => {});
  } else {
    // 未保存的记录，直接移除
    warehouseMappings.value.splice(index, 1);
  }
};

const saveMappings = async () => {
  // 过滤掉空记录
  const validMappings = warehouseMappings.value.filter(m => m.warehouse && m.username);
  if (validMappings.length === 0) {
    ElMessage.warning('请至少添加一条有效的映射配置');
    return;
  }
  try {
    const res = await api.saveWarehouseReturnConfig({
      mappings: validMappings.map(m => ({
        id: m.id,
        warehouse: m.warehouse,
        username: m.username,
        is_active: m.isActive
      }))
    });
    if (res?.code === 200) {
      ElMessage.success('保存成功');
      loadWarehouseMappings();
    }
  } catch (e) { ElMessage.error('保存失败'); }
};

const formatDate = (date) => { if (!date) return '-'; return new Date(date).toLocaleString('zh-CN'); };
const getStatusText = (status, pendingCount) => {
  if (status === 'closed') return '已完结';
  return statusTextMap[status] || status;
};
const getMatchStatusText = (status) => {
  const map = { pending: '待匹配', matched: '已匹配', returned: '已退回', closed: '已关闭' };
  return map[status] || status;
};
const getStatusStyle = (status) => {
  const colors = {
    pending_receiving: { background: '#fff7e6', color: '#fa8c16' },
    received: { background: '#e6f7ff', color: '#1890ff' },
    reconciled_full_match: { background: '#f6ffed', color: '#52c41a' },
    reconciled_partial_return: { background: '#fff7e6', color: '#fa8c16' },
    reconciled_diff: { background: '#fff7e6', color: '#fa8c16' },
    closed: { background: '#d9d9d9', color: '#595959' }
  };
  return colors[status] || {};
};

onMounted(() => { loadStats(); loadDocuments(); loadBuildings(); loadDepartments(); loadEmailCcConfig(); loadBuildingConfigs(); loadWarehouseMappings(); });
</script>

<style scoped>
.warehouse-return-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.breadcrumb { font-size: 14px; color: #666; }
.breadcrumb-item.active { color: #333; font-weight: 500; }
.breadcrumb-separator { margin: 0 8px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.stat-card-orange { border-left: 4px solid #f25757; }
.stat-card-blue { border-left: 4px solid #4facfe; }
.stat-card-yellow { border-left: 4px solid #fa709a; }
.stat-card-green { border-left: 4px solid #38ef7d; }
.stat-icon-bg { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 14px; }
.stat-card-orange .stat-icon-bg { background: #fff2e8; }
.stat-card-blue .stat-icon-bg { background: #e6f7ff; }
.stat-card-yellow .stat-icon-bg { background: #fff7e6; }
.stat-card-green .stat-icon-bg { background: #f6ffed; }
.stat-icon { font-size: 22px; }
.stat-value { font-size: 24px; font-weight: 700; color: #333; }
.stat-label { font-size: 13px; color: #666; margin-top: 2px; }
.tabs-container { margin-bottom: 20px; }
.tabs-header { display: flex; gap: 4px; background: #fafafa; padding: 4px; border-radius: 8px; }
.tab-btn { padding: 8px 20px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666; }
.tab-btn:hover { background: #fff; }
.tab-btn.active { background: #fff; color: #1890ff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.table-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.table-card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f0; }
.table-card-title { font-size: 16px; font-weight: 500; }
.card-body { padding: 20px; }
.search-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; align-items: flex-end; }
.search-item { display: flex; align-items: center; }
.search-item-wrapper { display: flex; align-items: center; gap: 8px; }
.search-item-wrapper label { white-space: nowrap; font-size: 13px; color: #666; min-width: 56px; }
.search-item input { height: 32px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 0 10px; min-width: 140px; font-size: 13px; }
.search-item .el-select { width: 150px; }
.search-item .el-date-editor { width: 240px !important; }
.search-actions { display: flex; gap: 8px; align-items: center; margin-left: 8px; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
.data-table th, .data-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.data-table th { background: #fafafa; font-weight: 600; font-size: 13px; color: #333; }
.data-table tbody tr:hover { background: #fafafa; }
.empty-cell { text-align: center; color: #999; padding: 40px !important; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.table-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.action-btn { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; white-space: nowrap; }
.action-btn.view { background: #e6f7ff; color: #1890ff; }
.action-btn.view:hover { background: #bae7ff; }
.action-btn.receive { background: #e6f7ff; color: #1890ff; }
.action-btn.receive:hover { background: #bae7ff; }
.action-btn.reconcile { background: #f9f0ff; color: #722ed1; }
.action-btn.reconcile:hover { background: #d3adf7; }
.action-btn.transfer { background: #e6fffb; color: #13c2c2; }
.action-btn.transfer:hover { background: #b5f5ec; }
.action-btn.print { background: #fff7e6; color: #fa8c16; }
.action-btn.print:hover { background: #ffd591; }
.action-btn.delete { background: #fff1f0; color: #ff4d4f; }
.action-btn.delete:hover { background: #ffccc7; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; gap: 6px; }
.btn-solid { background: #3b82f6; color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-solid:hover:not(:disabled) { background: #2563eb; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); transform: translateY(-1px); }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.btn-outline:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
.btn-text { background: transparent; color: #6b7280; padding: 6px 12px; }
.btn-text:hover { color: #ef4444; background: #fef2f2; }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.btn:disabled { cursor: not-allowed; opacity: 0.5; transform: none; }
.btn-refresh { background: transparent; border: 1px solid #d1d5db; color: #6b7280; }
.btn-refresh:hover { background: #f9fafb; }
/* 兼容旧样式 */
.btn-primary { background: #3b82f6; color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn-primary:hover:not(:disabled) { background: #2563eb; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); transform: translateY(-1px); }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.btn-secondary:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog { background: #fff; border-radius: 12px; width: 560px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.dialog-large { width: 960px; max-height: 90vh; }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; background: #fff; }
.dialog-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #111827; }
.dialog-close { width: 32px; height: 32px; border: none; background: #f3f4f6; border-radius: 8px; font-size: 14px; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.dialog-close:hover { background: #fee2e2; color: #ef4444; }
.dialog-body { padding: 24px; overflow-y: auto; flex: 1; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #374151; }
.form-label.required::after { content: ' *'; color: #ef4444; }
.form-input, .form-select { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; color: #111827; background: #fff; transition: all 0.2s; box-sizing: border-box; }
.form-input:focus, .form-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); outline: none; }
.form-input::placeholder { color: #9ca3af; }
.upload-buttons { display: flex; gap: 12px; }
.btn-icon { margin-right: 6px; }
.upload-hint { margin-top: 12px; font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 10px 14px; border-radius: 8px; }
.items-preview { margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
.preview-header strong { color: #3b82f6; }
.detail-info { margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px; }
.detail-row { display: flex; gap: 24px; margin-bottom: 12px; }
.detail-row:last-child { margin-bottom: 0; }
.detail-item { flex: 1; }
.detail-item label { color: #6b7280; margin-right: 8px; font-weight: 500; }
.detail-item span { color: #111827; }
.detail-section { margin-top: 24px; }
.detail-section h4 { margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #111827; border-left: 3px solid #3b82f6; padding-left: 10px; }
.config-section { padding: 20px; border-bottom: 1px solid #f0f0f0; }
.config-section:last-child { border-bottom: none; }
.config-title { margin: 0 0 8px 0; font-size: 16px; font-weight: 600; }
.config-desc { margin: 0 0 16px 0; color: #666; font-size: 14px; }
.config-form { max-width: 600px; }
.building-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.building-item { display: flex; align-items: center; gap: 12px; }
.building-code-input { width: 120px; }
.building-name-input { width: 200px; }
.form-actions { margin-top: 16px; }

/* 配置卡片样式 */
.config-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
  overflow: hidden;
}
.config-card:last-child { margin-bottom: 0; }
.config-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.config-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
}
.config-card-info { flex: 1; }
.config-card-info h3 { margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #111827; }
.config-card-info p { margin: 0; font-size: 14px; color: #6b7280; }
.config-card-body { padding: 20px; }
.config-actions { display: flex; gap: 12px; }
.config-hint { margin-left: 12px; color: #999; font-size: 12px; }
.mapping-actions { display: flex; gap: 8px; }
.mapping-actions + .config-hint { margin-top: 12px; }
.reconcile-summary { display: flex; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 12px; }
.summary-item { flex: 1; text-align: center; padding: 16px; border-radius: 12px; }
.summary-item.success { background: #ecfdf5; border: 1px solid #a7f3d0; }
.summary-item.warning { background: #fffbeb; border: 1px solid #fde68a; }
.summary-item.info { background: #eff6ff; border: 1px solid #bfdbfe; }
.summary-count { display: block; font-size: 28px; font-weight: 600; color: #111827; }
.summary-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
.reconcile-tabs { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
.reconcile-tab-header { display: flex; background: #f9fafb; }
.reconcile-tab { flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-size: 14px; transition: all 0.2s; color: #6b7280; }
.reconcile-tab:hover { background: #fff; color: #374151; }
.reconcile-tab.active { background: #fff; border-bottom: 3px solid #3b82f6; color: #3b82f6; font-weight: 500; }
.reconcile-tab-content { padding: 16px; max-height: 400px; overflow-y: auto; }

/* 新建模式切换样式 */
.create-mode-tabs { display: flex; gap: 8px; margin-bottom: 20px; background: #f5f5f5; padding: 4px; border-radius: 8px; }
.mode-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; color: #666; transition: all 0.2s; }
.mode-tab:hover { background: #fff; color: #333; }
.mode-tab.active { background: #fff; color: #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500; }
.mode-icon { font-size: 18px; }

/* 扫码模式样式 */
.scan-mode { margin-top: 16px; }
.scan-input-area { margin-bottom: 16px; }
.scan-input-wrapper { display: flex; gap: 8px; align-items: center; }
.scan-input { flex: 1; padding: 12px 16px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 16px; font-family: monospace; background: #f0f7ff; }
.scan-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
.scan-hint { margin-top: 8px; font-size: 13px; color: #666; }
.scan-status { color: #3b82f6; font-weight: 500; }

/* 扫码进度指示 */
.scan-progress { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 10px 12px; background: #f0f7ff; border-radius: 8px; font-size: 13px; }
.progress-step { padding: 4px 10px; border-radius: 4px; background: #e5e7eb; color: #666; }
.progress-step.active { background: #3b82f6; color: #fff; font-weight: 500; }
.progress-step.done { background: #52c41a; color: #fff; }
.progress-arrow { color: #999; }
.progress-cached { margin-left: 16px; padding-left: 16px; border-left: 1px solid #d1d5db; color: #666; font-family: monospace; }

/* 录入方式标签 */
.entry-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.entry-badge.upload { background: #e6f7ff; color: #1890ff; }
.entry-badge.scan { background: #f6ffed; color: #52c41a; }

/* 回仓单打印样式 */
.return-slip { background: #fff; padding: 20px; }
.slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
.slip-header h2 { font-size: 22px; color: #333; font-weight: 700; }
.slip-qr-area { width: 70px; height: 70px; border: 1px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; }
.slip-info { margin-bottom: 20px; }
.slip-row { display: flex; gap: 20px; margin-bottom: 10px; flex-wrap: wrap; }
.slip-item { flex: 1; min-width: 150px; }
.slip-item label { color: #666; }
.slip-value { font-weight: 600; color: #333; }
.slip-highlight { font-size: 18px; color: #e74c3c; }
.slip-status { color: #f39c12; background: #fef9e7; padding: 2px 8px; border-radius: 4px; }
.slip-items { margin-bottom: 20px; }
.slip-table { width: 100%; border-collapse: collapse; }
.slip-table th, .slip-table td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
.slip-table th { background: #f8f9fa; font-weight: 600; color: #333; }
.slip-table td { text-align: center; }
.slip-footer { margin-top: 30px; }
.slip-signatures { display: flex; gap: 60px; }
.signature-line { color: #333; }
.text-center { text-align: center; }
</style>
