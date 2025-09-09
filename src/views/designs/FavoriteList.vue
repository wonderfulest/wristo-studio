<template>
  <div class="favorite-list">
    <div class="favorite-grid">
      <el-card 
        v-for="favorite in favorites" 
        :key="favorite.id"
        class="favorite-card"
        :body-style="{ padding: '0px' }"
        shadow="hover"
      >
        <div class="favorite-image">
          <el-image 
            :src="favorite.design.screenshotUrl" 
            fit="cover"
            loading="lazy"
            :preview-src-list="[favorite.design.screenshotUrl]"
          >
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
            <template #placeholder>
              <div class="image-placeholder">
                <el-icon><Loading /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        <div class="favorite-info">
          <h3 class="favorite-name">{{ favorite.design.name }}</h3>
          <div class="favorite-meta">
            <span class="favorite-id">ID: {{ favorite.design.kpayId }}</span>
            <span class="favorite-date">{{ formatDate(favorite.createdAt) }}</span>
          </div>
          <div class="favorite-actions">
            <el-button 
              type="primary" 
              @click="copyDesign(favorite.design)"
              :loading="loading === favorite.id"
            >
              Copy Design
            </el-button>
            <el-button 
              type="danger" 
              @click="removeFavorite(favorite)"
              :loading="loading === favorite.id"
            >
              Remove Favorite
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 分页 -->
    <div class="pagination-container" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 36]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- Empty state -->
    <el-empty
      v-if="favorites.length === 0 && !loading"
      description="No favorite designs"
    />

    <!-- Loading state -->
    <div v-if="loading === true" class="loading-container">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>Loading...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, Loading } from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import moment from 'moment'
import { getFavorites, toggleFavorite } from '@/api/favorites'
import { ElMessageBox } from 'element-plus'
import { designApi } from '@/api/wristo/design'
import { ApiResponse, Design } from '@/types/api/api'
import { UpdateDesignParams } from '@/api/wristo/design'

const router = useRouter()
const messageStore = useMessageStore()
const userStore = useUserStore()

const favorites = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

// Set English locale to ensure UI stays in English
moment.locale('en')

// 格式化日期
const formatDate = (date: number) => {
  const now = moment()
  const targetDate = moment(date)
  const diff = now.diff(targetDate, 'days')
  
  if (diff === 0) {
    return targetDate.format('HH:mm')
  }
  
  if (diff === 1) {
    return 'Yesterday ' + targetDate.format('HH:mm')
  }
  
  if (diff < 7) {
    return targetDate.fromNow()
  }
  
  if (targetDate.year() === now.year()) {
    return targetDate.format('MM-DD HH:mm')
  }
  
  return targetDate.format('YYYY-MM-DD HH:mm')
}

// 获取收藏列表
const fetchFavorites = async () => {
  loading.value = true
  try {
    const response = await getFavorites({
      page: currentPage.value,
      pageSize: pageSize.value,
      userId: userStore.userInfo?.id
    })
    
    favorites.value = response.data
    total.value = response.meta.pagination.total
  } catch (error) {
    console.error('Failed to get favorites:', error)
    messageStore.error('Failed to get favorites')
  } finally {
    loading.value = false
  }
}

// 打开设计
const openDesign = async (design: Design) => {
  try {
    router.push(`/design?id=${design.id}`)
  } catch (error) {
    console.error('Failed to open design:', error)
    messageStore.error('Failed to open design')
  }
}

// 取消收藏
const removeFavorite = async (favorite: Design) => {
  try {
    // 添加确认对话框
    await ElMessageBox.confirm(
      'Are you sure you want to remove this favorite?',
      'Remove Favorite',
      {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )

    loading.value = favorite.id
    await toggleFavorite(favorite.name, favorite.design.id, userStore.userInfo?.id, false)
    messageStore.success('Removed from favorites')
    
    // 如果当前页只有一条数据，且不是第一页，则跳转到上一页
    if (favorites.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    
    // 刷新列表
    await fetchFavorites()
  } catch (error) {
    if (error !== 'cancel') { // ignore user cancel
      console.error('Failed to remove favorite:', error)
      messageStore.error('Failed to remove favorite')
    }
  } finally {
    loading.value = false
  }
}

// 处理页码改变
const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchFavorites()
}

// 处理每页数量改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchFavorites()
}

// 添加复制设计方法
const copyDesign = async (design: Design) => {
  try {
    loading.value = true
    
    // Generate a new watch face name with a "copy" suffix
    const newName = `${design.name}—copy`
    // 创建新表盘数据
    const newDesignData = {
      name: newName,
      description: design.description,
    }
    const response: ApiResponse<Design> = await designApi.createDesign(newDesignData)
    
    if (response.code === 0 && response.data) {
    const updateDesignData = {
      uid: response.data.id,
      designStatus: 'draft',
      configJson: design.configJson,
    } as UpdateDesignParams
    const updateResponse = await designApi.updateDesign(updateDesignData)
    
    if (updateResponse.code === 0 && updateResponse.data) {
        messageStore.success('Copy successful')
        // 可以选择是否跳转到我的设计页面
        router.push('/designs')
      }
    }
  } catch (error) {
    console.error('Copy failed:', error)
    messageStore.error('Copy failed')
  } finally {
    loading.value = false
  }
}

// 首次挂载时加载数据
onMounted(() => {
  fetchFavorites()
})

// 每次组件被激活时重新加载数据
onActivated(() => {
  fetchFavorites()
})
</script>

<style scoped>
.favorite-list {
  padding: 24px;
}

.favorite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.favorite-card {
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s;
}

.favorite-card:hover {
  transform: translateY(-4px);
}

.favorite-image {
  position: relative;
  padding-bottom: 100%;
  overflow: hidden;
}

.favorite-image :deep(.el-image) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-error,
.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.image-error .el-icon,
.image-placeholder .el-icon {
  font-size: 32px;
}

.favorite-info {
  padding: 16px;
}

.favorite-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.favorite-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.favorite-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--el-text-color-secondary);
}

.loading-icon {
  font-size: 32px;
  margin-bottom: 16px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .image-error,
  .image-placeholder {
    background-color: var(--el-fill-color-dark);
  }
}
</style>