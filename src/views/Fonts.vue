<template>
  <div class="fonts-preview">
    <h2 class="text-xl font-bold mb-6">System Fonts Preview</h2>
    
    <!-- 搜索栏 -->
    <div class="search-panel">
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
        <template #append>
          <el-button :icon="Search" @click="handleSearch">Search</el-button>
        </template>
      </el-input>
      <el-divider />
      <!-- Filters -->
      <el-form :inline="true" class="filters-form" label-position="left" size="small">
        <el-form-item>
          <template #label>
            Monospace: {{ isMonospace ? 'On' : 'Off' }}
          </template>
          <el-switch
            v-model="isMonospace"
            active-text="On"
            inactive-text="Off"
            inline-prompt
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item>
          <template #label>
            Italic: {{ italic ? 'On' : 'Off' }}
          </template>
          <el-switch
            v-model="italic"
            active-text="On"
            inactive-text="Off"
            inline-prompt
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item>
          <template #label>
            Weight: {{ weightClass ?? 'Any' }}
          </template>
          <el-select
            v-model="weightClass"
            placeholder="Any"
            class="w-40"
            clearable
            @change="handleFilterChange"
          >
            <el-option v-for="w in [100,200,300,400,500,600,700,800,900]" :key="w" :label="String(w)" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label>
            Width: {{ widthClass ?? 'Any' }}
          </template>
          <el-select
            v-model="widthClass"
            placeholder="Any"
            class="w-40"
            clearable
            @change="handleFilterChange"
          >
            <el-option v-for="w in [1,2,3,4,5,6,7,8,9]" :key="w" :label="String(w)" :value="w" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- Toolbar: total + reset -->
      <div class="search-toolbar flex items-center justify-between">
        <span class="text-sm text-gray-600">Total: {{ total }}</span>
        <el-button size="small" @click="handleResetFilters">Reset Filters</el-button>
      </div>
    </div>

    <!-- 字体列表（紧凑网格） -->
    <div class="fonts-grid">
      <div 
        v-for="font in fonts" 
        :key="font.id"
        class="font-card"
      >
        <div class="font-card-header">
          <div class="font-name" :title="font.fullName || font.family">{{ font.fullName || font.family }}</div>
        </div>
        <div class="preview-oneline" :style="{ fontFamily: font.previewFamily || font.family }">
          12:23 AM 72°F & Sunny 0123456789
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap flex justify-center">
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
import { searchFonts } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'

// 状态
const fonts = ref<(DesignFontVO & { previewFamily?: string })[]>([])
const currentPage = ref(1)
const pageSize = ref(12)
const total = ref(0)
const searchQuery = ref('')
const fontStore = useFontStore()

// Filters
const isMonospace = ref<boolean>(false)
const italic = ref<boolean>(false)
const weightClass = ref<number | undefined>(undefined)
const widthClass = ref<number | undefined>(undefined)

// Apple UI 风格：移除状态展示，无需状态映射函数

// 使用 searchFonts 服务端搜索 + 分页，并以 slug 为准进行预览渲染
const loadFonts = async () => {
  try {
    const { data } = await searchFonts({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      name: searchQuery.value || undefined,
      isMonospace: isMonospace.value ? 1 : undefined,
      italic: italic.value ? 1 : undefined,
      weightClass: weightClass.value,
      widthClass: widthClass.value,
      onlyApprovedActive: true
    })
    const list = data?.list ?? []
    total.value = data?.total ?? 0
    // 预注册本页字体，使用 slug 作为 font-family
    await Promise.all(
      list.map((f: DesignFontVO) =>
        f?.slug ? fontStore.loadFont(f.slug, (f as any)?.ttfFile?.url) : Promise.resolve(true)
      )
    )
    fonts.value = list.map((f: any) => ({ ...f, previewFamily: f.slug || f.family }))
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

// 当筛选条件变化时，重置页码并重新加载
const handleFilterChange = () => {
  currentPage.value = 1
  loadFonts()
}

// 重置筛选条件并重新加载
const handleResetFilters = () => {
  searchQuery.value = ''
  isMonospace.value = false
  italic.value = false
  weightClass.value = undefined
  widthClass.value = undefined
  currentPage.value = 1
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
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.search-panel {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.search-panel :deep(.el-input) { max-width: 320px; }
.filters-form { margin-top: 12px; }
.filters-form :deep(.el-form-item) { margin-right: 16px; margin-bottom: 8px; }
.filters-form :deep(.el-select) { min-width: 160px; }

.search-toolbar { margin-top: 12px; }

.filters-form { margin-top: 12px; }

.fonts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 8px;
}

.font-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.font-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.font-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-oneline {
  font-size: 16px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-wrap { margin-top: 20px; }
</style>