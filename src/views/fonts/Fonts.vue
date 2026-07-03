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
      :interpreted-filters="interpretedFilters"
      :can-upload-fonts="canUsePremiumAssets"
      @search="handleSearch"
      @filterChange="handleFilterChange"
      @resetFilters="handleResetFilters"
      @openUploadDialog="openUploadDialog"
      @previewTextChange="handlePreviewTextChange"
      @removeInterpretedFilter="handleRemoveInterpretedFilter"
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
            :language="font.language"
            :is-system="!!font.isSystem"
            :is-monospace="!!font.isMonospace"
            :subfamily="font.subfamily"
	            :style-tags="font.styleTags"
            :favorite-weight="font.favoriteWeight"
            :font-id="font.id"
            :owner-user-id="font.userId"
            :font-url="(font as any)?.ttfFile?.url"
            :preview-text="previewText"
            :can-edit-search-index="canEditFontSearchIndex(font)"
	            @edit-search-index="openSearchIndexDialog"
	            @favorite-changed="handleFontFavoriteChanged"
	            @removed="handleFontRemoved"
	          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <div class="library-footer">
      <div class="result-summary">
        <span>{{ currentFontTypeName }}</span>
        <span>{{ t('font.results') }}</span>
        <strong>{{ total }}</strong>
      </div>
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
      v-if="canUsePremiumAssets"
      v-model:visible="uploadDialogVisible"
      @selected="handleFontUploaded"
    />

    <el-dialog
      v-model="searchIndexDialogVisible"
      :title="t('font.editSearchIndex')"
      width="560px"
      :append-to-body="true"
      :z-index="12050"
      :close-on-click-modal="false"
    >
      <el-form :model="searchIndexForm" label-width="110px">
        <el-form-item :label="t('font.fontLabel')">
          <div class="font-dialog-title">{{ currentSearchIndexFont?.fullName || currentSearchIndexFont?.family || '-' }}</div>
        </el-form-item>
        <el-form-item :label="t('font.styleTags')">
          <el-select
            v-model="searchIndexForm.styleTags"
            multiple
            filterable
            default-first-option
            clearable
            popper-class="font-search-index-popper"
            placeholder="digital,sport,rounded"
          >
            <el-option
              v-for="tag in styleTagOptions"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('font.searchKeywords')">
          <el-input
            v-model="searchIndexForm.searchKeywords"
            type="textarea"
            :rows="3"
            :placeholder="t('font.searchKeywordsPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('font.monospace')">
          <el-switch v-model="searchIndexForm.isMonospace" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item :label="t('font.italic')">
          <el-switch v-model="searchIndexForm.italic" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item :label="t('font.weightClassLabel')">
          <el-select v-model="searchIndexForm.weightClass" clearable :placeholder="t('common.any')">
            <el-option v-for="w in [100,200,300,400,500,600,700,800,900]" :key="w" :label="String(w)" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('font.widthClassLabel')">
          <el-select v-model="searchIndexForm.widthClass" clearable :placeholder="t('common.any')">
            <el-option v-for="w in [1,2,3,4,5,6,7,8,9]" :key="w" :label="String(w)" :value="w" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="searchIndexDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="searchIndexSaving" @click="saveSearchIndex">
          {{ t('common.save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { ElMessage } from 'element-plus'
import { getFontStyleTags, searchFonts, updateMyFontSearchIndex } from '@/api/wristo/fonts'
import type { DesignFontVO } from '@/types/font'
import FontImportDialog from '@/components/font-picker/FontImportDialog.vue'
import FontsSearchPanel from './FontsSearchPanel.vue'
import { getEnumOptions, type EnumOption } from '@/api/common'
import FontListItem from '@/components/fonts/FontListItem.vue'
import { filterAssetsByStudioAccess } from '@/utils/studioAssetAccess'
import { useI18n } from '@/i18n'

const { t } = useI18n()

// 状态
const fonts = ref<(DesignFontVO & { previewFamily?: string })[]>([])
const currentPage = ref(1)
const pageSize = ref(48)
const total = ref(0)
const fontTypeOptions = ref<EnumOption[]>([])
const activeFontType = ref<string>('text_font')
const searchQuery = ref('')
const previewText = ref('')
const fontStore = useFontStore()
const userStore = useUserStore()
const membershipGate = useStudioMembershipGate()
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)

// 上传对话框
const uploadDialogVisible = ref(false)

// Filters
const isMonospace = ref<boolean>(false)
const italic = ref<boolean>(false)
const weightClass = ref<number | undefined>(undefined)
const widthClass = ref<number | undefined>(undefined)
const interpretedFilters = ref<string[]>([])
const searchIndexDialogVisible = ref(false)
const searchIndexSaving = ref(false)
const currentSearchIndexFont = ref<DesignFontVO | null>(null)
const searchIndexForm = ref({
  styleTags: [] as string[],
  searchKeywords: '',
  isMonospace: 0,
  italic: 0,
  weightClass: undefined as number | undefined,
  widthClass: undefined as number | undefined,
})
const styleTagOptions = ref<string[]>([])
const currentFontTypeName = computed(() => {
  return fontTypeOptions.value.find(item => item.value === activeFontType.value)?.name || t('font.searchFonts')
})

// Apple UI 风格：移除状态展示，无需状态映射函数

// 使用 searchFonts 服务端搜索 + 分页，并以 slug 为准进行预览渲染
const loadFonts = async () => {
  try {
    const { data } = await searchFonts({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      name: searchQuery.value || undefined,
      type: activeFontType.value || undefined,
      isSystem: canUsePremiumAssets.value ? undefined : 1,
      isMonospace: isMonospace.value ? 1 : undefined,
      italic: italic.value ? 1 : undefined,
      weightClass: weightClass.value,
      widthClass: widthClass.value,
    })
    const list = filterAssetsByStudioAccess(data?.list ?? [], canUsePremiumAssets.value)
    interpretedFilters.value = Array.isArray(data?.meta?.interpretedFilters)
      ? (data.meta.interpretedFilters as string[])
      : []
    total.value = data?.total ?? list.length
    // 预注册本页字体，使用 slug 作为 font-family
    await Promise.all(
      list.map((f: DesignFontVO) =>
        f?.slug ? fontStore.loadFont(f.slug, (f as any)?.ttfFile?.url) : Promise.resolve(true)
      )
    )
    fonts.value = list.map((f: any) => ({ ...f, previewFamily: f.slug || f.family }))
  } catch (error) {
    console.error('加载字体失败:', error)
    ElMessage.error(t('font.loadListFailed'))
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

const loadStyleTagOptions = async () => {
  try {
    const resp = await getFontStyleTags()
    styleTagOptions.value = Array.isArray(resp.data) ? resp.data : []
  } catch (e) {
    console.warn('Failed to load font style tags', e)
    styleTagOptions.value = [
      'digital',
      'sport',
      'rounded',
      'tech',
      'outline',
      'cute',
      'retro',
      'minimal',
      'classic',
      'luxury',
      'pixel',
      'bold',
      'thin',
      'condensed',
      'wide',
      'mono',
      'italic',
    ]
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
  interpretedFilters.value = []
  currentPage.value = 1
  loadFonts()
}

const intentRemovalPatterns: Record<string, RegExp> = {
  Sport: /运动|sport/ig,
  Tech: /科技|未来|tech/ig,
  Digital: /数码|数字表|电子表|lcd|digital/ig,
  Outline: /轮廓|空心|描边|outline/ig,
  Rounded: /圆润|圆角|rounded/ig,
  Cute: /可爱|cute/ig,
  Retro: /复古|老表|retro/ig,
  Minimal: /极简|简洁|minimal/ig,
  Classic: /经典|classic/ig,
  Luxury: /高级|奢华|luxury/ig,
  Pixel: /像素|pixel/ig,
  Monospace: /等宽|对齐|monospace|mono|same width/ig,
  Italic: /斜体|italic/ig,
  Bold: /粗|醒目|bold|heavy|black/ig,
  Thin: /细|轻|thin|light/ig,
  Condensed: /窄|condensed|narrow/ig,
  Wide: /宽|wide|expanded/ig,
  'Number font': /数字|digit|number|0-9/ig,
  'Icon font': /图标|icon/ig,
}

const handleRemoveInterpretedFilter = (filter: string) => {
  const pattern = intentRemovalPatterns[filter]
  if (pattern) {
    searchQuery.value = searchQuery.value.replace(pattern, '').replace(/\s+/g, ' ').trim()
  }
  interpretedFilters.value = interpretedFilters.value.filter(item => item !== filter)
  currentPage.value = 1
  loadFonts()
}

const openUploadDialog = () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  uploadDialogVisible.value = true
}

const handleFontUploaded = () => {
  // refresh list after a font is uploaded/selected in the dialog
  loadFonts()
}

const parseTokenList = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  return raw
    .split(/[,，\s]+/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

const normalizeTokenText = (value?: string | string[]) => parseTokenList(value)
  .filter((item, index, list) => list.indexOf(item) === index)
  .join(',')

const parseTokenText = (value?: string | string[]) => parseTokenList(value)
  .filter((item, index, list) => list.indexOf(item) === index)

const normalizeKeywordText = (value?: string) => String(value || '')
  .split(/[,，\s]+/)
  .map(item => item.trim())
  .filter(Boolean)
  .join(',')

const canEditFontSearchIndex = (font: DesignFontVO) => {
  const currentUserId = userStore.userInfo?.id
  return !!currentUserId && !!font.id
}

const openSearchIndexDialog = async (id: number) => {
  const font = fonts.value.find(item => item.id === id)
  if (!font || !canEditFontSearchIndex(font)) return
  if (!styleTagOptions.value.length) {
    await loadStyleTagOptions()
  }
  const allowedTags = new Set(styleTagOptions.value)
  const styleTags = parseTokenText(font.styleTags || '').filter(tag => allowedTags.has(tag))
  currentSearchIndexFont.value = font
  searchIndexForm.value = {
    styleTags,
    searchKeywords: font.searchKeywords || '',
    isMonospace: font.isMonospace ?? 0,
    italic: font.italic ?? 0,
    weightClass: font.weightClass || undefined,
    widthClass: font.widthClass || undefined,
  }
  searchIndexDialogVisible.value = true
}

const saveSearchIndex = async () => {
  const font = currentSearchIndexFont.value
  if (!font) return
  searchIndexSaving.value = true
  try {
    const resp = await updateMyFontSearchIndex(font.id, {
      styleTags: normalizeTokenText(searchIndexForm.value.styleTags),
      searchKeywords: normalizeKeywordText(searchIndexForm.value.searchKeywords),
      isMonospace: searchIndexForm.value.isMonospace,
      italic: searchIndexForm.value.italic,
      weightClass: searchIndexForm.value.weightClass,
      widthClass: searchIndexForm.value.widthClass,
    })
    if (resp.code === 0 && resp.data) {
      const index = fonts.value.findIndex(item => item.id === font.id)
      if (index >= 0) {
        fonts.value[index] = { ...fonts.value[index], ...resp.data, previewFamily: resp.data.slug || resp.data.family }
      }
      ElMessage.success(t('common.savedSuccessfully'))
      searchIndexDialogVisible.value = false
    } else {
      ElMessage.error(resp.msg || t('common.saveFailed'))
    }
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || t('common.saveFailed'))
  } finally {
    searchIndexSaving.value = false
  }
}

const handleFontRemoved = (id: number) => {
  fonts.value = fonts.value.filter(font => font.id !== id)
  total.value = Math.max(0, total.value - 1)
}

const handleFontFavoriteChanged = (id: number, favoriteWeight: number | null | undefined) => {
  fonts.value = fonts.value
    .map(font => font.id === id ? { ...font, favoriteWeight } : font)
    .sort((a, b) => Number(b.favoriteWeight || 0) - Number(a.favoriteWeight || 0))
}

watch(activeFontType, () => {
  currentPage.value = 1
  loadFonts()
})

// 初始化
onMounted(() => {
  loadFontTypes()
  loadStyleTagOptions()
  loadFonts()
})
</script>

<style scoped>
.fonts-preview {
  min-height: 100%;
  padding: 18px;
  font-family: var(--studio-font-ui);
  color: var(--studio-text);
  background:
    linear-gradient(180deg, rgba(15, 107, 104, 0.04), transparent 280px),
    var(--studio-bg);
}

.search-panel {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
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
  color: var(--studio-text-muted);
}
.filters-form { margin-top: 12px; }
.filters-form :deep(.el-form-item) { margin-right: 16px; margin-bottom: 8px; }
.filters-form :deep(.el-select) { min-width: 160px; }

.search-toolbar { margin-top: 12px; }

.filters-form { margin-top: 12px; }

.fonts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.font-card {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fonts-grid :deep(.font-main) {
  min-width: 0;
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
  color: var(--studio-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preview-oneline {
  font-size: 32px;
  min-height: 32px;
  color: var(--studio-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.font-type-tabs {
  padding: 14px;
  background: color-mix(in srgb, var(--studio-surface) 74%, transparent);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  box-shadow: var(--studio-shadow-sm);
}

.font-type-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.font-type-tabs :deep(.el-tabs__nav) {
  border: 0;
  gap: 8px;
}

.font-type-tabs :deep(.el-tabs__item) {
  min-height: 40px;
  border: 1px solid var(--studio-border) !important;
  border-radius: var(--studio-radius-md);
  color: var(--studio-text-muted);
  font-weight: 700;
}

.font-type-tabs :deep(.el-tabs__item.is-active) {
  color: var(--studio-primary);
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border) !important;
}

.library-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 12px 14px;
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--studio-text-muted);
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
}

.result-summary strong {
  color: var(--studio-text);
  font-size: 18px;
}

/* 上传区域样式 */
.upload-section {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
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
  color: var(--studio-text);
}

.upload-description {
  margin: 0;
  font-size: 14px;
  color: var(--studio-text-muted);
}

.font-upload-area {
  margin-bottom: 20px;
}

.font-upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  border: 2px dashed var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.font-upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.upload-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 32px;
  color: var(--studio-text-subtle);
}

.upload-text span {
  display: block;
  font-size: 14px;
  color: var(--studio-text);
  margin-bottom: 4px;
}

.upload-tip {
  margin: 0;
  font-size: 12px;
  color: var(--studio-text-subtle);
}

/* 上传队列样式 */
.upload-queue {
  border-top: 1px solid var(--studio-border);
  padding-top: 16px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text);
}

.queue-list {
  margin-bottom: 16px;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--studio-border);
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.queue-item:last-child {
  margin-bottom: 0;
}

.queue-item.processing {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.queue-item.completed {
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.queue-item.error {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--studio-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  font-size: 12px;
  color: var(--studio-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  margin: 0 12px;
}

.status-pending {
  color: var(--studio-text-subtle);
}

.status-processing {
  color: var(--studio-primary);
  animation: spin 1s linear infinite;
}

.status-completed {
  color: var(--el-color-success);
}

.status-error {
  color: var(--el-color-danger);
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

.font-dialog-title {
  color: var(--studio-text);
  font-weight: 650;
}

@media (max-width: 760px) {
  .fonts-preview {
    padding: 12px;
  }

  .font-type-tabs {
    padding: 10px;
  }

  .fonts-grid {
    grid-template-columns: 1fr;
  }

  .library-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
