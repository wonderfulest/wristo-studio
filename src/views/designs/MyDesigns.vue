<template>
  <div class="my-designs">
    <!-- 搜索栏 -->
    <div class="search-bar">
          <el-input v-model="searchName" placeholder="Search Name" class="name-filter" clearable
      @keyup.enter="handleSearch" />
      <el-select v-model="selectedStatus" placeholder="Select Status" class="status-filter" @change="handleStatusChange">
        <el-option label="All" value="" />
        <el-option label="Draft" value="draft" />
        <el-option label="Pending" value="submitted" />
        <el-option label="Published" value="published" />
      </el-select>

      <el-select v-model="sortField" placeholder="Sort Field" @change="handleSortChange" class="sort-field-filter">
        <el-option label="Created Time" value="created_at" />
        <el-option label="Updated Time" value="updated_at" />
      </el-select>
      <el-select v-model="sortOrder" placeholder="Sort Order" @change="handleSortChange" class="sort-order-filter">
        <el-option label="Ascending" value="asc" />
        <el-option label="Descending" value="desc" />
      </el-select>
      <el-button type="primary" @click="handleSearch">
        <Icon icon="material-symbols:search" />
        Search
      </el-button>
      <div class="display-options">
        <el-switch
          v-model="showCreator"
          active-text="Show Creator"
          inactive-text="Hide Creator"
        />
      </div>
    </div>

    <!-- 设计列表 -->
    <el-row :gutter="20" class="design-grid">
      <el-col :xs="24" :sm="8" :md="6" :lg="4" :xl="3" v-for="design in designs" :key="design.id">
        <!-- 设计卡片 -->
        <el-card class="design-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <!-- 标题单独一行 -->
              <div class="title-row">
                <span class="title">{{ design.name }}</span>
                <el-button 
                  type="primary" 
                  size="small" 
                  link 
                  @click="copyDesignName(design.name)"
                  title="Copy Design Name"
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              
               
              </div>
              <!-- 状态和操作按钮第二行 -->
              <div class="status-actions-row">
                <el-tooltip
                  v-if="design.designStatus === 'rejected' && design.reviewComment"
                  :content="design.reviewComment"
                  placement="top"
                >
                  <div class="status-tag" :style="{ backgroundColor: getStatusColor(design.designStatus) }">
                    {{ getStatusText(design.designStatus) }}
                  </div>
                </el-tooltip>
                <div
                  v-else
                  class="status-tag"
                  :style="{ backgroundColor: getStatusColor(design.designStatus) }"
                >
                  {{ getStatusText(design.designStatus) }}
                </div>
                <div class="header-actions">
                  <el-button-group>
                    <!-- 收藏 -->
                    <el-button 
                      type="primary" 
                      size="small" 
                      link 
                      @click.stop="handleFavorite(design)"
                      :title="'Favorite'"
                      :loading="loadingStates.favorite.has(design.id)"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                    <!-- 编辑 -->
                    <el-button 
                      type="primary" 
                      size="small" 
                      link 
                      @click="editDesign(design)"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <!-- 删除 -->
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
            </div>
          </template>
          <div class="design-info">
            <div class="design-background" v-if="getDesignImageUrl(design)">
              <img :src="getDesignImageUrl(design)" :alt="design.name" class="background-image" />
              <div class="creator-badge" v-if="showCreator">
                <span>Creator: {{ getCreatorName(design) }}</span>
              </div>
            </div>
            <div class="meta">
              <span>App ID: {{ design.product?.appId }}</span>
              <span>Design: {{ design.designUid }}</span>
              <div class="last-go-live-row">
                <span>Last Go Live: {{ formatDateNullable(design.product?.lastGoLive ?? null) }}</span>
                <el-tooltip
                  v-if="hasNewRelease(design)"
                  content="New version available to upload"
                  placement="top"
                >
                  <span class="new-release-indicator" role="img" aria-label="New version available to upload">
                    <span class="dot"></span>
                  </span>
                </el-tooltip>
              </div>
            </div>
            <div class="actions">
              <el-button v-if="userStore.userInfo?.id == 1 || design.user.id == userStore.userInfo?.id" type="primary" size="small" @click="openCanvas(design)">Edit</el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="copyDesign(design)"
                :loading="loadingStates.copy.has(design.id)"
              >
                Copy
              </el-button>
              <el-button 
                v-if="design.designStatus === 'draft'" 
                type="success" 
                size="small"
                @click="submitDesign(design)"
                :loading="loadingStates.submit.has(design.id)"
              >
                Submit
              </el-button>
              <el-button 
                v-if="hasDownloadablePackage(design)"
                type="info" 
                size="small"
                @click="downloadPackage(design)"
              >
                <el-icon><Download /></el-icon>
                Download
              </el-button>
              <el-button 
                v-if="design.product?.release"
                type="success" 
                size="small"
                @click="goLive(design)"
              >
                <el-icon><Promotion /></el-icon>
                Go Live
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
    <el-dialog v-model="deleteDialogVisible" title="Confirm Delete" width="30%">
      <span>Are you sure you want to delete this watch face design? This action cannot be undone.</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">Cancel</el-button>
          <el-button 
            type="danger" 
            @click="confirmDeleteDesign"
            :loading="designToDelete && loadingStates.delete.has(designToDelete.id)"
          >
            Confirm Delete
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <EditDesignDialog ref="editDesignDialog" @success="handleEditSuccess" />
    
    <!-- 提交设计对话框 -->
    <SubmitDesignDialog ref="submitDesignDialog" @success="handleSubmitSuccess" />
    
    <!-- Go Live 对话框 -->
    <GoLiveDialog ref="goLiveDialog" @success="handleGoLiveSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
// 移除旧的API导入，使用新的designApi
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import { useBaseStore } from '@/stores/baseStore'
import dayjs from 'dayjs'
import { Star, Edit, Delete, Download, Promotion, DocumentCopy } from '@element-plus/icons-vue'
import { toggleFavorite } from '@/api/favorites'
import { useUserStore } from '@/stores/user'
import { ApiResponse, PageResponse } from '@/types/api/api'
import { CreateCopyDesignParams } from '@/types/api/design'
import EditDesignDialog from '@/components/dialogs/EditDesignDialog.vue'
import SubmitDesignDialog from '@/components/dialogs/SubmitDesignDialog.vue'
import GoLiveDialog from '@/components/dialogs/GoLiveDialog.vue'
import { Design, DesignStatus } from '@/types/api/design'
const editDesignDialog = ref<any>(null)
const submitDesignDialog = ref<any>(null)
type GoLiveDialogRef = { show: (design: Design) => void }
const goLiveDialog = ref<GoLiveDialogRef | null>(null)
const router = useRouter()
const messageStore = useMessageStore()
const baseStore = useBaseStore()
const userStore = useUserStore()

const designs = ref<Design[]>([])
const currentPage = ref(1)
const pageSize = ref(24)
const total = ref(0)
const deleteDialogVisible = ref(false)
const designToDelete = ref<Design | null>(null)

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
const sortField = ref('updated_at')
const sortOrder = ref('desc')

// 添加作者显示控制
const showCreator = ref(false)  // 默认隐藏作者

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

// 处理排序变化
const handleSortChange = () => {
  currentPage.value = 1
  fetchDesigns()
}

// 获取状态文本
const getStatusText = (status: DesignStatus) => {
  const statusMap = {
    draft: 'Draft',
    submitted: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    packaged: 'Packaged',
    published: 'Published'
  }
  return statusMap[status as keyof typeof statusMap] || 'Unknown'
}

// 获取状态颜色
const getStatusColor = (status: DesignStatus) => {
  const statusMap = {
    draft: '#606266',        // 暗色 - 草稿状态
    submitted: '#909399',    // 灰色 - 待审核状态
    approved: '#67C23A',     // 亮色 - 已批准状态
    rejected: '#F56C6C',     // 红色 - 被拒绝状态
    packaged: '#E6A23C',     // 橙色 - 已打包状态
    published: '#409EFF'     // 蓝色 - 已发布状态
  }
  return statusMap[status as keyof typeof statusMap] || '#909399'
}

// 格式化可空日期（用于 Last Go Live）
const formatDateNullable = (date: string | number | null | undefined) => {
  if (!date) return 'Never'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取创作者名称
const getCreatorName = (design: Design) => {
  return design.user?.username || 'Unknown User'
}

// 获取设计图片URL
const getDesignImageUrl = (design: Design) => {
  return designApi.getDesignImageUrl(design, true) || ''
}

// 获取设计列表
const fetchDesigns = async () => {
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      status: selectedStatus.value,
      name: searchName.value,
      orderBy: `${sortField.value}:${sortOrder.value}`,
      populate: 'user,product,payment,release,cover,category,bundle'
    }
    
    const response: ApiResponse<PageResponse<Design>> = await designApi.getDesignPage(params)
    
    if (response.code === 0 && response.data) {
      designs.value = response.data.list
      total.value = response.data.total
      
    } else {
      console.error('API返回错误:', response)
      messageStore.error(response.msg || 'Failed to get design list')
    }
  } catch (error: any) {
    console.error('[MyDesigns] fetchDesigns error:', error)
    console.error('错误详情:', error.response?.data)
    messageStore.error('Failed to get design list')
  }
}

// 处理页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  fetchDesigns()
}

// 处理每页数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  fetchDesigns()
}

// 打开画布编辑器
const openCanvas = async (design: Design) => {
  try {
    const response = await designApi.getDesignByUid(design.designUid) as ApiResponse<Design>
    const designData = response.data || {} as Design

    baseStore.watchFaceName = designData.name

    if (designData.configJson) {
      baseStore.elements = designData.configJson
    }

    router.push('/design?id=' + designData.designUid)
  } catch (error) {
    console.error('加载设计失败:', error)
    messageStore.error('Failed to load design')
  }
}

// 编辑设计信息
const editDesign = (design: Design) => {
  if (editDesignDialog.value && typeof editDesignDialog.value.show === 'function') {
    editDesignDialog.value.show(design.designUid)
  }
}

// 复制设计
const copyDesign = async (design: Design) => {
  if (loadingStates.value.copy.has(design.id)) return
  
  try {
    loadingStates.value.copy.add(design.id)
    const newDesignData = {
      uid: design.designUid
    } as CreateCopyDesignParams
    const createResponse = await designApi.createDesignByCopy(newDesignData) as ApiResponse<Design>
    
    if (createResponse.code === 0 && createResponse.data) {
      messageStore.success('Copy successful')
      await fetchDesigns()
    } else {
      messageStore.error(createResponse.msg || 'Copy failed')
    }
  } catch (error) {
    console.error('复制失败:', error)
    messageStore.error('Copy failed')
  } finally {
    loadingStates.value.copy.delete(design.id)
  }
}

// 复制设计名称
const copyDesignName = (name: string) => {
  navigator.clipboard.writeText(name).then(() => {
    messageStore.success('Design name copied to clipboard!')
  }).catch(err => {
    console.error('Failed to copy design name:', err)
    messageStore.error('Failed to copy design name')
  })
}

// 确认删除
const confirmDelete = (design: Design) => {
  designToDelete.value = design
  deleteDialogVisible.value = true
}

// 执行删除
const confirmDeleteDesign = async () => {
  if (!designToDelete.value || loadingStates.value.delete.has(designToDelete.value.id)) return

  try {
    loadingStates.value.delete.add(designToDelete.value.id)
    const response = await designApi.deleteDesign(designToDelete.value.designUid)
    if (response.code === 0) {
      messageStore.success('Delete successful')
      deleteDialogVisible.value = false
      await fetchDesigns()
    } else {
      messageStore.error(response.msg || 'Delete failed')
    }
  } catch (error) {
    console.error('删除失败:', error)
    messageStore.error('Delete failed')
  } finally {
    loadingStates.value.delete.delete(designToDelete.value.id)
  }
}

// 提交设计
const submitDesign = async (design: Design) => {
  if (submitDesignDialog.value && typeof submitDesignDialog.value.show === 'function') {
    submitDesignDialog.value.show(design)
  }
}

// 下载安装包
const downloadPackage = (design: Design) => {
  if (design.product?.release?.packageUrl) {
    window.open(design.product.release.packageUrl, '_blank')
  } else {
    messageStore.error('Download link not available')
  }
}

// 检查是否有可下载的安装包
const hasDownloadablePackage = (design: Design): boolean => {
  return !!(design.product?.release?.packageUrl)
}

// 检查是否有新版本需要上传
const hasNewRelease = (design: Design): boolean => {
  const releaseExists = !!design.product?.release
  if (!releaseExists) return false

  const releaseUpdatedAt = (design.product?.release as { updatedAt?: string | number })?.updatedAt
  const lastGoLive = (design.product as { lastGoLive?: string | number | null })?.lastGoLive

  if (!releaseUpdatedAt) return false
  if (!lastGoLive) return true

  return dayjs(releaseUpdatedAt).isAfter(dayjs(lastGoLive))
}

// 点击新版本红点提示
const showNewReleaseTip = (): void => {
  messageStore.info('New version available to upload')
}

// 处理提交成功
const handleSubmitSuccess = () => {
  fetchDesigns() // 刷新设计列表
}

// 处理刷新事件
const handleRefresh = (event: any ) => {
  if (event.detail.route === 'my-designs') {
    currentPage.value = 1
    fetchDesigns()
  }
}

// 首次挂载时加载数据
onMounted(() => {
  
  fetchDesigns()
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('refresh-list', handleRefresh)
})

// 处理收藏
const handleFavorite = async (design: Design) => {
  if (loadingStates.value.favorite.has(design.id)) return
  
  try {
    loadingStates.value.favorite.add(design.id)
    await toggleFavorite(design.name, design.id, userStore.userInfo?.id, true)
    messageStore.success('Favorite successful')
  } catch (error) {
    console.error('收藏失败:', error)
    messageStore.error('Favorite failed')
  } finally {
    loadingStates.value.favorite.delete(design.id)
  }
}

// 添加编辑成功处理方法
const handleEditSuccess = () => {
  fetchDesigns() // 刷新设计列表
}

// Go live 方法
const goLive = async (design: Design) => {
  try {
    const res = await designApi.getDesignByUid(design.designUid) as ApiResponse<Design>
    const fullDesign = res.data as Design
    if (!fullDesign) {
      messageStore.error('Failed to load design')
      return
    }
    if (goLiveDialog.value && typeof goLiveDialog.value.show === 'function') {
      goLiveDialog.value.show(fullDesign)
    }
  } catch (e) {
    messageStore.error('Failed to load design')
  }
}

// 处理 Go Live 成功
const handleGoLiveSuccess = () => {
  fetchDesigns() // 刷新设计列表
}
</script>

<style scoped>
.design-grid {
  margin-bottom: 24px;
  margin-top: 20px;
}

.design-card {
  border-radius: 12px;
  transition: all 0.3s;
  height: 100%;
  overflow: hidden;
}

.design-card :deep(.el-card__body) {
  padding: 8px;
}

.design-card :deep(.el-card__header) {
  padding: 6px 8px;
}

.card-header {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  position: relative;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-word;
  line-height: 1.2;
  flex: 1;
}

.status-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.status-tag {
  display: inline-block;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  color: #fff;
  background-color: var(--el-color-info);
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
  gap: 8px;
  padding: 8px;
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
  gap: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.last-go-live-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.last-go-live-row .new-release-indicator {
  position: static;
  top: auto;
  right: auto;
  width: 10px;
  height: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
}

.last-go-live-row .new-release-indicator .dot {
  width: 8px;
  height: 8px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  font-weight: 500;
}

.category-info .el-icon {
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  padding: 3px;
  justify-content: center;
}

.actions .el-button {
  font-size: 10px;
  padding: 3px 6px;
  margin: 0;
  flex: 0 0 auto;
  min-width: 45px;
  height: 24px;
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

.new-release-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 12px;
  height: 12px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.new-release-indicator .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #ff4d4f;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
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
