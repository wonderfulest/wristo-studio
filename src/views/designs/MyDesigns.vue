<template>
  <div class="my-designs">
    <div class="search-bar">
      <el-input v-model="searchName" placeholder="搜索名称" class="name-filter" clearable
        @keyup.enter="handleSearch" />
      <el-select v-model="selectedStatus" placeholder="选择状态" class="status-filter" @change="handleStatusChange">
        <el-option label="全部" value="" />
        <el-option label="草稿" value="draft" />
        <el-option label="已提交" value="submitted" />
      </el-select>
      <el-select v-model="selectedUserId" placeholder="选择用户" clearable class="user-filter" @change="handleUserChange">
        <el-option v-for="user in usersList" :key="user.id" :label="user.username" :value="user.id">
          <span>{{ user.username }}</span>
          <span class="user-email">({{ user.email }})</span>
        </el-option>
      </el-select>
      <el-select v-model="sortField" placeholder="排序字段" @change="handleSortChange" class="sort-field-filter">
        <el-option label="创建时间" value="createdAt" />
        <el-option label="更新时间" value="updatedAt" />
      </el-select>
      <el-select v-model="sortOrder" placeholder="排序方式" @change="handleSortChange" class="sort-order-filter">
        <el-option label="升序" value="asc" />
        <el-option label="降序" value="desc" />
      </el-select>
      <el-button type="primary" @click="handleSearch">
        <Icon icon="material-symbols:search" />
        搜索
      </el-button>
      <div class="display-options">
        <el-switch
          v-model="showCreator"
          active-text="显示作者"
          inactive-text="隐藏作者"
        />
      </div>
    </div>

    <el-row :gutter="20" class="design-grid">
      <el-col :xs="24" :sm="8" :md="6" :lg="4" :xl="3" v-for="design in designs" :key="design.id">
        <el-card class="design-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <span class="title">{{ design.name }}</span>
                <div class="status-tag" :class="design.designStatus">
                  {{ getStatusText(design.designStatus) }}
                </div>
              </div>
              <div class="header-actions">
                <el-button-group>
                  <el-button 
                    type="primary" 
                    size="small" 
                    link 
                    @click.stop="handleFavorite(design)"
                    :title="'收藏'"
                    :loading="loadingStates.favorite.has(design.id)"
                  >
                    <el-icon><Star /></el-icon>
                  </el-button>
                  <el-button 
                    type="primary" 
                    size="small" 
                    link 
                    @click="editDesign(design)"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    link 
                    @click="confirmDelete(design)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </template>
          <div class="design-info">
            <div class="design-background" v-if="design.screenshotUrl">
              <img :src="design.screenshotUrl" :alt="design.name" class="background-image" />
              <div class="creator-badge" v-if="showCreator">
                <span>作者：{{ getCreatorName(design) }}</span>
              </div>
            </div>
            <div class="design-background" v-else-if="design.backgroundUrl">
              <img :src="design.backgroundUrl" :alt="design.name" class="background-image" />
              <div class="creator-badge" v-if="showCreator">
                <span>作者：{{ getCreatorName(design) }}</span>
              </div>
            </div>
            <div class="meta">
              <span>KPay ID: {{ design.kpayId }}</span>
              <span>更新时间: {{ formatDate(design.updatedAt) }}</span>
            </div>
            <div class="actions">
              <el-button v-if="authStore.user.id == 1 || design.userId == authStore.user.id" type="primary" size="small" @click="openCanvas(design)">编 辑</el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="copyDesign(design)"
                :loading="loadingStates.copy.has(design.id)"
              >
                复 制
              </el-button>
              <el-button 
                v-if="design.designStatus === 'draft'" 
                type="success" 
                size="small"
                @click="submitDesign(design)"
                :loading="loadingStates.submit.has(design.id)"
              >
                提 交
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分页组件 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[24, 48, 72, 96]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="deleteDialogVisible" title="确认删除" width="30%">
      <span>确定要删除这个表盘设计吗？此操作不可恢复。</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button 
            type="danger" 
            @click="confirmDeleteDesign"
            :loading="designToDelete && loadingStates.delete.has(designToDelete.id)"
          >
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <EditDesignDialog ref="editDesignDialog" @success="handleEditSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDesigns, getDesign, updateDesignStatus, updateDesign, deleteDesign } from '@/api/design'
import { useMessageStore } from '@/stores/message'
import { useBaseStore } from '@/stores/baseStore'
import { createOrUpdateDesign } from '@/api/design'
import dayjs from 'dayjs'
import { Star, StarFilled, Edit, Delete } from '@element-plus/icons-vue'
import { toggleFavorite } from '@/api/favorites'
import { useAuthStore } from '@/stores/auth'
import { getUsers } from '@/api/users'
import EditDesignDialog from '@/components/dialogs/EditDesignDialog.vue'
const editDesignDialog = ref(null)
const router = useRouter()
const route = useRoute()
const messageStore = useMessageStore()
const baseStore = useBaseStore()
const authStore = useAuthStore()

const designs = ref([])
const currentPage = ref(1)
const pageSize = ref(24)
const total = ref(0)
const deleteDialogVisible = ref(false)
const designToDelete = ref(null)

// 添加加载状态
const loadingStates = ref({
  submit: new Set(),
  copy: new Set(),
  delete: new Set(),
  favorite: new Set()
})

// 搜索相关状态
const searchName = ref('')
const selectedStatus = ref('')
const selectedUserId = ref(null)
const sortField = ref('updatedAt')
const sortOrder = ref('desc')
const usersList = ref([])

// 添加作者显示控制
const showCreator = ref(false)  // 默认隐藏作者

// 获取用户列表
const fetchUsers = async () => {
  try {
    const response = await getUsers()
    usersList.value = response.data
  } catch (error) {
    console.error('获取用户列表失败:', error)
    messageStore.error('获取用户列表失败')
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchDesigns()
}

// 处理状态变化
const handleStatusChange = () => {
  currentPage.value = 1
  fetchDesigns()
}

// 处理用户选择变化
const handleUserChange = () => {
  currentPage.value = 1
  fetchDesigns()
}

// 处理排序变化
const handleSortChange = () => {
  currentPage.value = 1
  fetchDesigns()
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交'
  }
  return statusMap[status] || '未知'
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取创作者名称
const getCreatorName = (design) => {
  return design.creator.username || '未知用户'
}

// 获取设计列表
const fetchDesigns = async () => {
  try {
    console.log('currentPage.value', currentPage.value)
    const response = await getDesigns({
      page: currentPage.value,
      pageSize: pageSize.value,
      userId: selectedUserId.value || authStore.user.id,
      status: selectedStatus.value,
      name: searchName.value,
      sort: `${sortField.value}:${sortOrder.value}`
    })
    console.log('response', response)
    designs.value = response.data
    total.value = response.meta.pagination.total
  } catch (error) {
    console.error('[MyDesigns] fetchDesigns error:', error)
    messageStore.error('获取设计列表失败')
  }
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchDesigns()
}

// 处理每页数量变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchDesigns()
}

// 打开画布编辑器
const openCanvas = async (design) => {
  try {
    const response = await getDesign(design.documentId)
    const designData = response.data

    baseStore.watchFaceName = designData.name
    baseStore.kpayId = designData.kpayId

    if (designData.configJson) {
      baseStore.elements = designData.configJson
    }

    router.push('/design?id=' + designData.documentId)
  } catch (error) {
    console.error('加载设计失败:', error)
    messageStore.error('加载设计失败')
  }
}

// 编辑设计信息
const editDesign = (design) => {
  editDesignDialog.value?.show(design.documentId)
}

// 复制设计
const copyDesign = async (design) => {
  if (loadingStates.value.copy.has(design.id)) return
  
  try {
    loadingStates.value.copy.add(design.id)
    const newDesignData = {
      name: `${design.name}—copy`,
      kpayId: new Date().getTime().toString(),
      designStatus: 'draft',
      description: design.description,
      screenshotUrl: design.screenshotUrl,
      configJson: design.configJson,
      userId: authStore.user.id
    }
    const response = await createOrUpdateDesign(newDesignData)
    if (response.data) {
      messageStore.success('复制成功')
      await fetchDesigns()
    }
  } catch (error) {
    console.error('复制失败:', error)
    messageStore.error('复制失败')
  } finally {
    loadingStates.value.copy.delete(design.id)
  }
}

// 确认删除
const confirmDelete = (design) => {
  designToDelete.value = design
  deleteDialogVisible.value = true
}

// 执行删除
const confirmDeleteDesign = async () => {
  if (!designToDelete.value || loadingStates.value.delete.has(designToDelete.value.id)) return

  try {
    loadingStates.value.delete.add(designToDelete.value.id)
    await deleteDesign(designToDelete.value.documentId)
    messageStore.success('删除成功')
    deleteDialogVisible.value = false
    await fetchDesigns()
  } catch (error) {
    console.error('删除失败:', error)
    messageStore.error('删除失败')
  } finally {
    loadingStates.value.delete.delete(designToDelete.value.id)
  }
}

// 提交设计
const submitDesign = async (design) => {
  if (loadingStates.value.submit.has(design.id)) return
  
  try {
    loadingStates.value.submit.add(design.id)
    await updateDesignStatus(design.documentId, 'submitted')
    messageStore.success('提交成功')
    await fetchDesigns()
  } catch (error) {
    console.error('提交失败:', error)
    messageStore.error('提交失败')
  } finally {
    loadingStates.value.submit.delete(design.id)
  }
}

// 处理刷新事件
const handleRefresh = (event) => {
  if (event.detail.route === 'my-designs') {
    currentPage.value = 1
    fetchDesigns()
  }
}

// 首次挂载时加载数据
onMounted(() => {
  fetchUsers()
  fetchDesigns()
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('refresh-list', handleRefresh)
})

// 处理收藏
const handleFavorite = async (design) => {
  if (loadingStates.value.favorite.has(design.id)) return
  
  try {
    loadingStates.value.favorite.add(design.id)
    await toggleFavorite(design.name, design.id, authStore.user.id, true)
    messageStore.success('收藏成功')
  } catch (error) {
    console.error('收藏失败:', error)
    messageStore.error('收藏失败')
  } finally {
    loadingStates.value.favorite.delete(design.id)
  }
}

// 添加编辑成功处理方法
const handleEditSuccess = () => {
  fetchDesigns() // 刷新设计列表
}
</script>

<style scoped>
.design-grid {
  margin-bottom: 24px;
  margin-top: 20px;
}

.design-card {
  margin-bottom: 20px;
  transition: all 0.3s;
  height: 100%;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.status-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
}

.status-tag.draft {
  background-color: var(--el-color-info);
}

.status-tag.submitted {
  background-color: var(--el-color-success);
}

.design-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.design-background {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creator-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  backdrop-filter: blur(3px);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
}

.actions .el-button {
  font-size: 12px;
  padding: 6px 12px;
  margin: 0;
  flex: 0 0 auto;
  min-width: 60px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 40px;
  padding: 20px 0;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .creator-badge {
    background-color: rgba(255, 255, 255, 0.2);
  }
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button-group {
  display: flex;
  gap: 2px;
}

.header-actions .el-button {
  padding: 4px 8px;
  height: 28px;
  font-size: 14px;
}

.header-actions .el-button:hover {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.header-actions .el-button.el-button--primary.is-link {
  color: var(--el-text-color-regular);
}

.header-actions .el-button.el-button--primary.is-link:hover {
  color: var(--el-color-primary);
}

.header-actions .el-button.el-button--danger.is-link {
  color: var(--el-text-color-regular);
}

.header-actions .el-button.el-button--danger.is-link:hover {
  color: var(--el-color-danger);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.name-filter {
  width: 200px;
}

.user-filter {
  width: 200px;
}

.user-email {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.status-filter {
  width: 120px;
}

.sort-field-filter {
  width: 120px;
}

.sort-order-filter {
  width: 100px;
}

.display-options {
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* 响应式布局调整 */
@media screen and (max-width: 768px) {
  .design-grid {
    margin: 20px -10px 24px;
  }
  
  .el-col {
    padding: 0 10px;
    margin-bottom: 20px;
  }

  .header-actions .el-button {
    padding: 2px 6px;
  }
  
  .design-info .actions {
    justify-content: center;
  }
  
  .design-info .actions .el-button {
    padding: 4px 8px;
  }
}

@media screen and (min-width: 769px) and (max-width: 992px) {
  .design-grid {
    margin: 20px -15px 24px;
  }
  
  .el-col {
    padding: 0 15px;
    margin-bottom: 20px;
  }
}

@media screen and (min-width: 993px) {
  .design-grid {
    margin: 20px -20px 24px;
  }
  
  .el-col {
    padding: 0 20px;
    margin-bottom: 20px;
  }
}
</style>
