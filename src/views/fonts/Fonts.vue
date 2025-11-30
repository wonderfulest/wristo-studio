<template>
  <div class="fonts-preview">
    <!-- 搜索栏 -->
    <FontsSearchPanel
      v-model:search-query="searchQuery"
      v-model:preview-text="previewText"
      v-model:is-monospace="isMonospace"
      v-model:italic="italic"
      v-model:weight-class="weightClass"
      v-model:width-class="widthClass"
      @search="handleSearch"
      @filterChange="handleFilterChange"
      @resetFilters="handleResetFilters"
      @openUploadDialog="uploadDialogVisible = true"
      @previewTextChange="handlePreviewTextChange"
    />

    <!-- 字体列表（按类型分 Tab 展示） -->
    <el-tabs v-model="activeFontType" type="card" class="font-type-tabs">
      <el-tab-pane
        v-for="opt in fontTypeOptions"
        :key="opt.value"
        :label="opt.name"
        :name="opt.value"
      >
        <div class="fonts-grid">
          <FontListItem
            v-for="font in fonts"
            :key="font.id"
            :label="font.fullName || font.family"
            :font-family="font.previewFamily || font.family"
            :type="font.type"
            :is-system="!!font.isSystem"
            :is-monospace="!!font.isMonospace"
            :subfamily="font.subfamily"
            :font-id="font.id"
            :font-url="(font as any)?.ttfFile?.url"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

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

    <!-- Font upload dialog -->
    <FontImportDialog
      v-model:visible="uploadDialogVisible"
      @selected="handleFontUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { ElMessage } from 'element-plus'
import { searchFonts } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import FontImportDialog from '@/components/font-picker/FontImportDialog.vue'
import FontsSearchPanel from './FontsSearchPanel.vue'
import { getEnumOptions, type EnumOption } from '@/api/common'
import FontListItem from '@/components/font-picker/FontListItem.vue'

// 状态
const fonts = ref<(DesignFontVO & { previewFamily?: string })[]>([])
const currentPage = ref(1)
const pageSize = ref(48)
const total = ref(0)
const fontTypeOptions = ref<EnumOption[]>([])
const activeFontType = ref<string>('number_font')
const searchQuery = ref('')
const previewText = ref('')
const fontStore = useFontStore()

// 上传对话框
const uploadDialogVisible = ref(false)

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
      type: activeFontType.value || undefined,
      isMonospace: isMonospace.value ? 1 : undefined,
      italic: italic.value ? 1 : undefined,
      weightClass: weightClass.value,
      widthClass: widthClass.value,
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

const loadFontTypes = async () => {
  try {
    const res: any = await getEnumOptions('DesignFontType')
    const list: EnumOption[] = res?.data ?? res ?? []
    fontTypeOptions.value = Array.isArray(list) ? list : []
  } catch {
    fontTypeOptions.value = []
  }
}

// 事件处理
const handleSearch = () => {
  currentPage.value = 1
  loadFonts()
}

const handlePreviewTextChange = () => {
  // 预览文本变化时不需要重新加载字体列表，只需要重新渲染即可
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

const handleFontUploaded = () => {
  // refresh list after a font is uploaded/selected in the dialog
  loadFonts()
}

watch(activeFontType, () => {
  currentPage.value = 1
  loadFonts()
})

// 初始化
onMounted(() => {
  loadFontTypes()
  loadFonts()
})
</script>

<style scoped>
.fonts-preview {
  padding: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

.search-panel {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.search-inputs {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  min-width: 280px;
  max-width: 320px;
}

.preview-input {
  min-width: 240px;
  max-width: 280px;
}

.preview-prefix {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}
.filters-form { margin-top: 12px; }
.filters-form :deep(.el-form-item) { margin-right: 16px; margin-bottom: 8px; }
.filters-form :deep(.el-select) { min-width: 160px; }

.search-toolbar { margin-top: 12px; }

.filters-form { margin-top: 12px; }

.fonts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.font-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fonts-grid :deep(.font-main) {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 6px 12px;
}

.font-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
}

.font-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-oneline {
  font-size: 32px;
  min-height: 32px;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-wrap { margin-top: 20px; }

/* 上传区域样式 */
.upload-section {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.upload-header {
  margin-bottom: 16px;
}

.upload-header h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.upload-description {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.font-upload-area {
  margin-bottom: 20px;
}

.font-upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.font-upload-area :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background: #f0f9ff;
}

.upload-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 32px;
  color: #999;
}

.upload-text span {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.upload-tip {
  margin: 0;
  font-size: 12px;
  color: #999;
}

/* 上传队列样式 */
.upload-queue {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.queue-list {
  margin-bottom: 16px;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.queue-item:last-child {
  margin-bottom: 0;
}

.queue-item.processing {
  border-color: #409eff;
  background: #f0f9ff;
}

.queue-item.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.queue-item.error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin: 0 12px;
}

.status-pending {
  color: #999;
}

.status-processing {
  color: #409eff;
  animation: spin 1s linear infinite;
}

.status-completed {
  color: #67c23a;
}

.status-error {
  color: #f56c6c;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.item-actions {
  display: flex;
  align-items: center;
}

.queue-actions {
  display: flex;
  justify-content: center;
}

.toolbar-actions {
  display: flex;
  align-items: center;
}
</style>