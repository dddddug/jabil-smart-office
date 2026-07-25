<template>
  <div class="announcement-management-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">系统管理</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">系统公告</span>
      </div>
    </div>
    
    <div class="action-bar">
      <div class="search-box">
        <el-input v-model="searchKeyword" placeholder="搜索公告标题"></el-input>
      </div>
      <el-button type="primary" @click="showCreateDialog" v-if="canManage">
        <el-icon><Plus /></el-icon>
        新建公告
      </el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="公告列表" name="list">
        <div class="list-container">
          <div v-if="announcements.length > 0">
            <div v-for="announcement in announcements" :key="announcement.id" class="announcement-card" @click="showDetail(announcement)">
              <div class="card-header">
                <el-tag :type="getTypeClass(announcement.type)">{{ getTypeText(announcement.type) }}</el-tag>
                <el-tag :type="getStatusClass(announcement.status)">{{ getStatusText(announcement.status) }}</el-tag>
                <span v-if="announcement.isRead" class="read-tag">已读</span>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ announcement.title }}</h3>
                <p class="card-preview">{{ announcement.content.substring(0, 100) }}{{ announcement.content.length > 100 ? '...' : '' }}</p>
              </div>
              <div class="card-footer">
                <span class="creator">{{ announcement.creatorName || '系统' }}</span>
                <span class="publish-time">{{ announcement.publishDate || announcement.createdAt }}</span>
              </div>
              <div v-if="!announcement.isRead" class="unread-dot"></div>
            </div>
          </div>
          <el-empty v-else description="暂无公告"></el-empty>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="公告管理" name="manage" v-if="canManage">
        <el-table :data="manageList" stripe v-loading="loadingManage">
          <el-table-column prop="id" label="ID" width="80"></el-table-column>
          <el-table-column prop="title" label="标题" width="200"></el-table-column>
          <el-table-column prop="type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getTypeClass(row.type)">{{ getTypeText(row.type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusClass(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="可见范围" width="200">
            <template #default="{ row }">
              {{ getScopeText(row) }}
            </template>
          </el-table-column>
          <el-table-column prop="creatorName" label="创建者" width="120"></el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="showEditDialog(row)">编辑</el-button>
              <el-button v-if="row.status === 'draft'" type="success" size="small" @click="publishAnnouncement(row.id)">发布</el-button>
              <el-button type="danger" size="small" @click="deleteAnnouncement(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 新建/编辑公告对话框 -->
    <el-dialog
      :title="isEdit ? '编辑公告' : '新建公告'"
      v-model="dialogVisible"
      width="700px"
    >
      <el-form :model="announcementForm" label-width="100px" ref="formRef">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题" :maxlength="200"></el-input>
        </el-form-item>
        <el-form-item label="公告类型" prop="type">
          <el-select v-model="announcementForm.type" placeholder="请选择公告类型">
            <el-option label="普通" value="normal"></el-option>
            <el-option label="重要" value="important"></el-option>
            <el-option label="紧急" value="urgent"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="厂区" prop="plantId">
      <el-select v-model="announcementForm.plantId" placeholder="请选择厂区" clearable :disabled="currentUser?.roleId === 3 || currentUser?.roleId === 2">
        <el-option label="全部厂区" :value="null" v-if="currentUser?.roleId === 1"></el-option>
        <el-option v-for="plant in plants" :key="plant.id" :label="plant.name" :value="plant.id"></el-option>
      </el-select>
    </el-form-item>
    <el-form-item label="目标部门" prop="targetDepartments">
      <div style="display: flex; gap: 10px; align-items: center; padding-right: 20px;">
        <el-select 
          v-model="announcementForm.targetDepartments" 
          placeholder="请选择目标部门" 
          multiple
          clearable
          :disabled="currentUser?.roleId === 3"
          style="flex: 1;"
        >
          <el-option v-for="dept in filteredDepartments" :key="dept.id" :label="dept.name" :value="dept.id"></el-option>
        </el-select>
        <el-button 
          v-if="currentUser?.roleId !== 3"
          @click="toggleSelectAllDepartments"
          style="white-space: nowrap; flex-shrink: 0;"
        >
          {{ isAllDepartmentsSelected ? '取消全选' : '全选' }}
        </el-button>
      </div>
    </el-form-item>
        <el-form-item label="公告内容" prop="content">
          <el-input
            v-model="announcementForm.content"
            type="textarea"
            :rows="8"
            placeholder="请输入公告内容"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAnnouncement" :loading="saving">保存草稿</el-button>
        <el-button type="success" @click="saveAndPublish">保存并发布</el-button>
      </template>
    </el-dialog>

    <!-- 公告详情对话框 -->
    <el-dialog
      title="公告详情"
      v-model="detailDialogVisible"
      width="600px"
    >
      <div v-if="currentAnnouncement" class="detail-container">
        <div class="detail-header">
          <h2 class="detail-title">{{ currentAnnouncement.title }}</h2>
          <div class="detail-meta">
            <el-tag :type="getTypeClass(currentAnnouncement.type)">{{ getTypeText(currentAnnouncement.type) }}</el-tag>
            <span class="creator-name">{{ currentAnnouncement.creatorName }}</span>
            <span class="publish-time">{{ currentAnnouncement.publishDate || currentAnnouncement.createdAt }}</span>
          </div>
        </div>
        <div class="detail-content">
          <p>{{ currentAnnouncement.content }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request';

interface Announcement {
  id?: number
  title: string
  content: string
  type: string
  status: string
  plantId?: number | null
  targetDepartments?: number[] | null
  createdBy: number
  createdAt: string
  updatedAt: string
  publishDate?: string | null
  isRead?: boolean
  creatorName?: string
}

interface Plant {
  id: number
  name: string
}

interface Department {
  id: number
  name: string
  plantId: number
}

const currentUser = ref<any>(null)
const activeTab = ref('list')
const searchKeyword = ref('')
const loadingManage = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)

const announcements = ref<Announcement[]>([])
const manageList = ref<Announcement[]>([])
const plants = ref<Plant[]>([])
const departments = ref<Department[]>([])
const currentAnnouncement = ref<Announcement | null>(null)
const formRef = ref<FormInstance>()

const announcementForm = ref({
  id: null as number | null,
  title: '',
  content: '',
  type: 'normal',
  plantId: null as number | null,
  targetDepartments: [] as number[],
  status: 'draft' as string
})

// 根据选择的厂区过滤部门
const filteredDepartments = computed(() => {
  if (!announcementForm.value.plantId) {
    return departments.value
  }
  return departments.value.filter(dept => dept.plantId === announcementForm.value.plantId)
})

// 判断是否已全选部门
const isAllDepartmentsSelected = computed(() => {
  const currentDepts = filteredDepartments.value
  if (currentDepts.length === 0) return false
  return currentDepts.every(dept => announcementForm.value.targetDepartments.includes(dept.id))
})

// 切换全选/取消全选部门
const toggleSelectAllDepartments = () => {
  const currentDepts = filteredDepartments.value
  if (isAllDepartmentsSelected.value) {
    announcementForm.value.targetDepartments = []
  } else {
    announcementForm.value.targetDepartments = currentDepts.map(dept => dept.id)
  }
}

const canManage = computed(() => {
  if (!currentUser.value) return false
  const roleId = currentUser.value.roleId || 0
  // roleId: 1=超级管理员, 2=厂区管理员, 3=部门管理员
  return [1, 2, 3].includes(roleId)
})

// 获取当前用户信息
const getCurrentUser = () => {
  try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        currentUser.value = user
        const roleId = user.roleId || 0
        // 如果是部门管理员(3)或厂区管理员(2)，自动设置其所属的厂区
        if ([2, 3].includes(roleId)) {
          announcementForm.value.plantId = user.plantId || null
        }
        // 如果是部门管理员(3)，自动设置其所属的部门
        if (roleId === 3) {
          announcementForm.value.targetDepartments = user.departmentId ? [user.departmentId] : []
        }
        return user
      }
    } catch (error: any) {
      ElMessage.error('获取当前用户失败:' + (error?.message || error));
    }
    return null
  }

// 获取厂区和部门数据
const loadPlantsAndDepartments = async () => {
  try {
    const [plantsRes, deptsRes] = await Promise.all([
      request.get('/plants'),
      request.get('/departments')
    ])

    const plantsData = plantsRes?.data || plantsRes;
    const deptsData = deptsRes?.data || deptsRes;
    plants.value = plantsData?.plants || [];
    departments.value = deptsData?.departments || [];
  } catch (error: any) {
    ElMessage.error('获取数据失败:' + (error?.message || error))
  }
}

// 获取公告列表
const loadAnnouncements = async () => {
  try {
    const user = getCurrentUser()
    const url = '/announcements'
    const params = new URLSearchParams()
    if (user) {
      params.append('userId', user.id.toString())
      if (user.plantId) {
        params.append('plantId', user.plantId.toString())
      }
      if (user.departmentId) {
        params.append('departmentId', user.departmentId.toString())
      }
    }
    
    const response = await request.get<any>(`${url}?${params.toString()}`)
    announcements.value = response?.data?.items || response?.items || []
  } catch (error: any) {
    ElMessage.error('获取公告列表失败:' + (error?.message || error))
  }
}

// 获取管理列表
const loadManageList = async () => {
  try {
    loadingManage.value = true
    const user = getCurrentUser()
    const response = await request.get<any>(`/announcements/admin?userId=${user.id}`)
    manageList.value = response?.data?.items || response?.items || []
  } catch (error: any) {
    ElMessage.error('获取管理列表失败:' + (error?.message || error))
  } finally {
    loadingManage.value = false
  }
}

// 获取类型文本
const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    'normal': '普通',
    'important': '重要',
    'urgent': '紧急'
  }
  return map[type] || type
}

// 获取类型对应的Element Plus类型
const getTypeClass = (type: string) => {
  const map: Record<string, any> = {
    'normal': '',
    'important': 'warning',
    'urgent': 'danger'
  }
  return map[type] || ''
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'draft': '草稿',
    'published': '已发布',
    'archived': '已归档'
  }
  return map[status] || status
}

// 获取状态对应的Element Plus类型
const getStatusClass = (status: string) => {
  const map: Record<string, any> = {
    'draft': 'info',
    'published': 'success',
    'archived': ''
  }
  return map[status] || ''
}

// 获取可见范围文本
const getScopeText = (announcement: Announcement) => {
  if (!announcement.plantId) return '全部厂区全部部门'
  
  let text = ''
  const plant = plants.value.find(p => p.id === announcement.plantId)
  text += plant ? plant.name : ''
  
  if (announcement.targetDepartments && announcement.targetDepartments.length > 0) {
    const deptNames = announcement.targetDepartments.map(id => {
      const dept = departments.value.find(d => d.id === id)
      return dept ? dept.name : ''
    }).filter(Boolean)
    text += ` (${deptNames.join(', ')})`
  } else {
    text += ' 全部部门'
  }
  return text
}

// 显示新建对话框
const showCreateDialog = () => {
  isEdit.value = false
  const user = getCurrentUser()
  const roleId = user?.roleId || 0
  announcementForm.value = {
    id: null,
    title: '',
    content: '',
    type: 'normal',
    plantId: (roleId === 3 || roleId === 2) ? (user.plantId || null) : null,
    targetDepartments: roleId === 3 ? (user.departmentId ? [user.departmentId] : []) : [],
    status: 'draft'
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (announcement: Announcement) => {
  isEdit.value = true
  const user = getCurrentUser()
  const roleId = user?.roleId || 0
  announcementForm.value = {
    id: announcement.id || null,
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    plantId: (roleId === 3 || roleId === 2) ? (user.plantId || null) : (announcement.plantId || null),
    targetDepartments: roleId === 3 ? (user.departmentId ? [user.departmentId] : []) : (announcement.targetDepartments || []),
    status: announcement.status
  }
  dialogVisible.value = true
}

// 显示详情
const showDetail = async (announcement: Announcement) => {
  currentAnnouncement.value = announcement
  detailDialogVisible.value = true
  
  // 如果未读，标记为已读
  if (!announcement.isRead) {
    try {
      const user = getCurrentUser()
      await request.put(`/announcements/${announcement.id}/read`, { userId: user?.id })
      announcement.isRead = true
      loadAnnouncements()
    } catch (error: any) {
      ElMessage.error('标记已读失败:' + (error?.message || error))
    }
  }
}

// 保存公告
const saveAnnouncementCommon = async (publish = false) => {
  if (!announcementForm.value.title.trim() || !announcementForm.value.content.trim()) {
    ElMessage.warning('请填写公告标题和内容')
    return
  }
  
  try {
    saving.value = true
    const user = getCurrentUser()
    let url = '/announcements/admin'
    let method = 'POST'
    const data: any = {
      title: announcementForm.value.title,
      content: announcementForm.value.content,
      type: announcementForm.value.type,
      plantId: announcementForm.value.plantId,
      targetDepartments: announcementForm.value.targetDepartments,
      userId: user.id,
      createdBy: user.id
    }
    
    if (publish) {
      data['status'] = 'published'
    } else if (isEdit.value) {
      // 编辑时如果不发布，不改变状态
      // 这里可以保持原来的状态，或者设置为draft
    }
    
    if (isEdit.value && announcementForm.value.id) {
      url = `/announcements/admin/${announcementForm.value.id}`
      method = 'PUT'
      delete data.createdBy
      // 设置状态
      if (publish) {
        data.status = 'published'
      } else {
        // 保存草稿时，使用表单中的状态（如果有），否则用draft
        data.status = announcementForm.value.status || 'draft'
      }
    }
    
    let responseData;
    if (method === 'POST') {
      responseData = await request.post(url, data);
    } else if (method === 'PUT') {
      responseData = await request.put(url, data);
    } else {
      throw new Error('Unsupported method');
    }

    ElMessage.success(publish ? '公告发布成功' : '公告保存成功')
    dialogVisible.value = false
    loadManageList()
    loadAnnouncements()
  } catch (error: any) {
    ElMessage.error(error.message || '保存公告失败')
  } finally {
    saving.value = false
  }
}

const saveAnnouncement = () => saveAnnouncementCommon(false)
const saveAndPublish = () => saveAnnouncementCommon(true)

// 发布公告
const publishAnnouncement = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要发布此公告吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const responseData = await request.put(`/announcements/admin/${id}/publish`)
    
    ElMessage.success('公告发布成功')
    loadManageList()
    loadAnnouncements()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '发布公告失败')
    }
  }
}

// 删除公告
const deleteAnnouncement = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此公告吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const user = getCurrentUser()
    const responseData = await request.delete(`/announcements/admin/${id}?userId=${user.id}`)
    
    ElMessage.success('公告删除成功')
    loadManageList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除公告失败')
    }
  }
}

// 切换标签页
const handleTabChange = (tabName: string) => {
  if (tabName === 'manage') {
    loadManageList()
  }
}

onMounted(() => {
  getCurrentUser()
  loadPlantsAndDepartments()
  loadAnnouncements()
})
</script>

<style scoped>
.announcement-management-container {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: calc(100vh - 120px);
  padding-top: 80px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 24px 0;
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

.action-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-box {
  width: 300px;
}

.list-container {
  padding: 20px 0;
}

.announcement-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.announcement-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.read-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #E5E7EB;
  color: #6B7280;
}

.card-body {
  margin-bottom: 12px;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.card-preview {
  margin: 0;
  font-size: 14px;
  color: #6B7280;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #9CA3AF;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #EF4444;
  border-radius: 50%;
}

.detail-container {
  padding: 10px;
}

.detail-header {
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.detail-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
}

.detail-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.creator-name {
  color: #6B7280;
}

.publish-time {
  color: #9CA3AF;
}

.detail-content {
  line-height: 1.8;
  font-size: 15px;
  color: #374151;
  white-space: pre-wrap;
}
</style>
