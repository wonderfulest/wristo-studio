<template>
  <div class="template-list">
    <div class="template-grid">
      <el-card 
        v-for="template in templates" 
        :key="template.id"
        class="template-card"
        :body-style="{ padding: '0px' }"
        shadow="hover"
      >
        <div class="template-image">
          <el-image 
            :src="template.design.screenshotUrl" 
            fit="cover"
            loading="lazy"
            :preview-src-list="[template.design.screenshotUrl]"
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
        <div class="template-info">
          <h3 class="template-name">{{ template.design.name }}</h3>
          <div class="template-meta">
            <span class="template-id">ID: {{ template.design.kpayId }}</span>
            <span class="template-date">{{ formatDate(template.design.createdAt) }}</span>
          </div>
          <div class="template-actions">
            <el-button 
              type="primary" 
              @click="useTemplate(template)"
              :loading="loading === template.id"
            >
              Use this template
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
      v-if="templates.length === 0 && !loading"
      description="No recommended templates"
    />

    <!-- Loading state -->
    <div v-if="loading === true" class="loading-container">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>Loading...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'
import { Picture, Loading } from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores/message'
import moment from 'moment'
import { getTemplates } from '@/api/templates'

const route = useRoute()
const messageStore = useMessageStore()

const templates = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)

// Set English locale to ensure UI stays in English
moment.locale('en')

// 格式化日期
const formatDate = (date) => {
  const now = moment()
  const targetDate = moment(date)
  const diff = now.diff(targetDate, 'days')
  
  // If today
  if (diff === 0) {
    return targetDate.format('HH:mm')
  }
  
  // If yesterday
  if (diff === 1) {
    return 'Yesterday ' + targetDate.format('HH:mm')
  }
  
  // Within last 7 days
  if (diff < 7) {
    return targetDate.fromNow()
  }
  
  // If this year
  if (targetDate.year() === now.year()) {
    return targetDate.format('MM-DD HH:mm')
  }
  
  // Otherwise show full date
  return targetDate.format('YYYY-MM-DD HH:mm')
}

// 获取模板列表
const fetchTemplates = async () => {
  loading.value = true
  try {
    const response = await getTemplates({
      page: currentPage.value,
      pageSize: pageSize.value
    })
    
    templates.value = response.data
    total.value = response.meta.pagination.total
  } catch (error) {
    console.error('Failed to get template list:', error)
    messageStore.error('Failed to get template list')
  } finally {
    loading.value = false
  }
}

// 使用模板
const useTemplate = async (template) => {
  loading.value = template.id
  try {
    // TODO: Implement use template logic
    messageStore.success('Template applied successfully')
  } catch (error) {
    console.error('Failed to apply template:', error)
    messageStore.error('Failed to apply template')
  } finally {
    loading.value = false
  }
}

// 处理页码改变
const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchTemplates()
}

// 处理每页数量改变
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchTemplates()
}

// 首次挂载时加载数据
onMounted(() => {
  fetchTemplates()
})

// 每次组件被激活时重新加载数据
onActivated(() => {
  fetchTemplates()
})
</script>

<style scoped>
.template-list {
  padding: 24px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.template-card {
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s;
}

.template-card:hover {
  transform: translateY(-4px);
}

.template-image {
  position: relative;
  padding-bottom: 100%;
  overflow: hidden;
}

.template-image :deep(.el-image) {
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

.template-info {
  padding: 16px;
}

.template-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.template-actions {
  display: flex;
  justify-content: flex-end;
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
