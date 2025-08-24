<template>
  <div class="fonts-preview">
    <h1 class="text-2xl font-bold mb-6">System Fonts Preview</h1>
    
    <!-- 搜索栏 -->
    <div class="mb-6">
      <el-input
        v-model="searchQuery"
        placeholder="Search fonts..."
        class="w-64"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 字体列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="font in fonts" 
        :key="font.id"
        class="font-card bg-white p-6 rounded-lg shadow-md"
      >
        <!-- 字体信息 -->
        <div class="mb-4">
          <h3 class="text-lg font-bold">{{ font.fullName || font.family }}</h3>
          <p class="text-gray-600">{{ font.family }}</p>
        </div>
        
        <!-- 字体预览 -->
        <div 
          class="preview-text"
          :style="{ fontFamily: font.previewFamily || font.family }"
        >
          <!-- 数字预览 -->
          <div class="preview-numbers">
            0123456789
          </div>
          <!-- 字母预览 -->
          <div class="preview-letters">
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </div>
          <div class="preview-letters-lower">
            abcdefghijklmnopqrstuvwxyz
          </div>
        </div>

        <!-- 字体状态 -->
        <div class="text-sm text-gray-500 mt-4">
          <el-tag 
            size="small" 
            :type="getStatusType(font.status)"
          >
            {{ getStatusText(font.status) }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="mt-6 flex justify-center">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[12, 24, 36, 48]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { DesignFontVO } from '@/types/font'

// 状态
const fonts = ref<(DesignFontVO & { previewFamily?: string })[]>([])
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)
const searchQuery = ref('')
const fontStore = useFontStore()

// 状态处理函数
const getStatusType = (status: string) => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    approved: 'success',
    submitted: 'warning',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    approved: 'Approved',
    submitted: 'Submitted',
    rejected: 'Rejected'
  }
  return texts[status] || status
}

// 加载字体（系统预置，通过 admin 接口），并以 slug 为准进行渲染
const loadFonts = async () => {
  try {
    const items = await fontStore.loadSystemFonts(searchQuery.value || '')
    total.value = items.length
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    fonts.value = items.slice(start, end)
  } catch (error) {
    console.error('加载字体失败:', error)
    ElMessage.error('加载字体列表失败')
  }
}

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
  loadFonts()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  loadFonts()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadFonts()
}

// 初始化
onMounted(() => {
  loadFonts()
})
</script>

<style scoped>
.fonts-preview {
  padding: 24px;
}

.font-card {
  transition: all 0.3s ease;
}

.font-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-text {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
}

.preview-numbers {
  font-size: 32px;
  margin-bottom: 12px;
  color: #333;
}

.preview-letters {
  font-size: 20px;
  margin-bottom: 8px;
  color: #444;
}

.preview-letters-lower {
  font-size: 20px;
  color: #444;
}
</style> 