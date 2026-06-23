<template>
  <div ref="pickerRef" class="font-picker">
    <!-- Current selected font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
      <FontPreviewText :font-family="selectedFontFamily" :type="type" />
    </div>

    <!-- Font selection panel -->
    <Teleport to="body">
      <div v-if="isOpen" ref="panelRef" class="font-panel" :style="panelStyle" @scroll.passive="onPanelScroll">
        <div class="font-panel-toolbar">
          <button v-if="canUsePremiumAssets" class="add-font-btn" type="button" @click.stop.prevent="addCustomFont">{{ t('font.addCustomFont') }}</button>
          <RouterLink
            v-if="type === FontTypes.ICON_FONT"
            class="open-library-anchor"
            to="/icon-library"
            target="_blank"
            rel="noopener"
          >
            {{ t('font.manageIconFonts') }}
          </RouterLink>
          <RouterLink
            v-else
            class="open-library-anchor"
            to="/fonts"
            target="_blank"
            rel="noopener"
          >
            {{ t('font.openFontsLibrary') }}
          </RouterLink>
          <el-segmented
            v-if="canUsePremiumAssets"
            v-model="fontScope"
            class="font-scope-toggle"
            :options="fontScopeOptions"
            size="small"
          />
        </div>
        <!-- Number font library guidance (only for number fonts) -->
        <!-- <div v-if="type === FontTypes.NUMBER_FONT && isMerchantUser" class="icon-lib-tip">
          <button type="button" class="open-library-anchor" @click.stop="openNumberGlyphEditor">
            Custom your number fonts
          </button>
        </div> -->
        <!-- Search (extracted component) -->
        <FontSearch
          :model-value="modelValue"
          :type="type"
          :can-use-premium-assets="canUsePremiumAssets"
          :include-all-users="includeAllUsers"
          @select="selectFont"
          @edit-search-index="openSearchIndexDialog"
        />
        <!-- Recent fonts -->
        <RecentFontList
            :fonts="recentFonts"
            :model-value="modelValue"
            :type="type"
            :can-use-premium-assets="canUsePremiumAssets"
            @select="selectFont"
            @edit-search-index="openSearchIndexDialog"
        />
        <!-- Designer available fonts (paginated by usage) -->
        <DesignerFontList
            ref="designerFontListRef"
            :model-value="modelValue"
            :type="type"
            :can-use-premium-assets="canUsePremiumAssets"
            :include-all-users="includeAllUsers"
            @select="selectFont"
            @edit-search-index="openSearchIndexDialog"
        />
      </div>
    </Teleport>
    <!-- Add font dialog -->
    <FontImportDialog v-if="canUsePremiumAssets" v-model:visible="dialogVisible" @selected="onFontUploaded" />
    <!-- Number glyph editor dialog (for number fonts) -->
    <NumberGlyphEditorDialog ref="numberGlyphDialogRef" />

    <el-dialog
      v-model="searchIndexDialogVisible"
      :title="t('font.editSearchTags')"
      width="560px"
      :append-to-body="true"
      :z-index="12050"
      :close-on-click-modal="false"
    >
      <el-form :model="searchIndexForm" label-width="110px">
        <el-form-item :label="t('font.fontLabel')">
          <div class="font-dialog-title">{{ currentSearchIndexFont?.fullName || currentSearchIndexFont?.family || currentSearchIndexFont?.label || '-' }}</div>
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
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { getFontBySlug, getFontStyleTags, getSystemFonts, increaseFontUsage, updateMyFontSearchIndex } from '@/api/wristo/fonts'
import { FontTypes } from '@/config/fonts'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
import { canUseAsset } from '@/utils/studioAssetAccess'
import RecentFontList from '@/components/font-picker/RecentFontList.vue'
import DesignerFontList from '@/components/font-picker/DesignerFontList.vue'
import FontImportDialog from '@/components/font-picker/FontImportDialog.vue'
import NumberGlyphEditorDialog from '@/views/fonts/number/NumberGlyphEditorDialog.vue'
import FontSearch from '@/components/font-picker/FontSearch.vue'
import FontPreviewText from '@/components/fonts/FontPreviewText.vue'
import type { FontItem } from '@/types/font-picker'
import type { DesignFontVO } from '@/types/font'
import { useI18n } from '@/i18n'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  // Optional font type filter, e.g. 'text_font', 'icon_font', ...
  type: {
    type: String,
    required: false,
    default: FontTypes.TEXT_FONT
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
const fontStore = useFontStore()
const userStore = useUserStore()
const iconFontStrategyStore = useIconFontStrategyStore()
const membershipGate = useStudioMembershipGate()
const { t } = useI18n()
const numberGlyphDialogRef = ref<InstanceType<typeof NumberGlyphEditorDialog> | null>(null)

type SectionName = 'recent' | 'condensed' | 'sans-serif' | 'fixed' | 'serif' | 'lcd' | 'icon' | 'custom'

const isOpen = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const pickerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const designerFontListRef = ref<InstanceType<typeof DesignerFontList> | null>(null)
const fontScope = ref<'mine' | 'all'>('mine')
type EditableSearchIndexFont = {
  id: number
  label?: string
  value?: string
  family?: string
  fullName?: string
  slug?: string
  styleTags?: string | string[]
  searchKeywords?: string
  isMonospace?: number
  italic?: number
  weightClass?: number
  widthClass?: number
}
const searchIndexDialogVisible = ref(false)
const searchIndexSaving = ref(false)
const currentSearchIndexFont = ref<EditableSearchIndexFont | null>(null)
const styleTagOptions = ref<string[]>([])
const searchIndexForm = ref({
  styleTags: [] as string[],
  searchKeywords: '',
  isMonospace: 0,
  italic: 0,
  weightClass: undefined as number | undefined,
  widthClass: undefined as number | undefined,
})

// parsed font info moved to child component

// Store data with precise typing for template usage
const fontSections = computed(() => fontStore.fontSections as Array<{ label: string; name: SectionName | string; fonts: FontItem[] }>)
const systemSections = computed(() => (fontSections.value || []).filter(s => s.name !== 'recent'))
const recentFonts = computed(() => fontStore.recentFonts as FontItem[])
const selectedFontLabel = computed(() => fontStore.getFontLabel(props.modelValue))
// Map current value (slug) -> family for preview/rendering
const selectedFontFamily = computed(() => {
  const slug = props.modelValue
  for (const sec of fontSections.value) {
    const m = sec.fonts?.find(f => f.value === slug)
    if (m) return m.value
  }
  return slug
})
const canUsePremiumAssets = computed(() => userStore.canUsePremiumStudioAssets)
const includeAllUsers = computed(() => canUsePremiumAssets.value === true && fontScope.value === 'all')
const fontScopeOptions = computed(() => [
  { label: t('font.scopeMine'), value: 'mine' },
  { label: t('font.scopeAll'), value: 'all' },
])

// 切换面板显示
const updatePanelPosition = () => {
  const picker = pickerRef.value
  if (!picker) return

  const rect = picker.getBoundingClientRect()
  const viewportPadding = 16
  const desiredWidth = Math.min(560, window.innerWidth - viewportPadding * 2)
  const left = Math.min(
    Math.max(viewportPadding, rect.right - desiredWidth),
    window.innerWidth - desiredWidth - viewportPadding,
  )

  panelStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${left}px`,
    width: `${desiredWidth}px`,
    maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
  }
}

const togglePanel = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    fontStore.expandedSections.recent = true
    await nextTick()
    updatePanelPosition()
  }
}

const onPanelScroll = () => {
  const panel = panelRef.value
  if (!panel) return
  const threshold = 120
  if (panel.scrollTop + panel.clientHeight + threshold >= panel.scrollHeight) {
    designerFontListRef.value?.loadNextPage()
  }
}

const parseTokenList = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  return raw
    .split(/[,，\s]+/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

const parseTokenText = (value?: string | string[]) => parseTokenList(value)
  .filter((item, index, list) => list.indexOf(item) === index)

const normalizeTokenText = (value?: string | string[]) => parseTokenText(value).join(',')

const normalizeKeywordText = (value?: string) => String(value || '')
  .split(/[,，\s]+/)
  .map(item => item.trim())
  .filter(Boolean)
  .join(',')

const loadStyleTagOptions = async () => {
  try {
    const resp = await getFontStyleTags()
    styleTagOptions.value = Array.isArray(resp.data) ? resp.data : []
  } catch {
    styleTagOptions.value = ['digital', 'sport', 'rounded', 'tech', 'outline', 'minimal', 'classic', 'pixel', 'bold', 'thin', 'mono', 'italic']
  }
}

const openSearchIndexDialog = async (font: FontItem | DesignFontVO) => {
  if (!font.id) return
  if (!styleTagOptions.value.length) {
    await loadStyleTagOptions()
  }
  const editableFont: EditableSearchIndexFont = {
    ...font,
    id: font.id,
    label: 'label' in font ? font.label : font.fullName || font.family || font.slug,
    value: 'value' in font ? font.value : font.slug,
    family: font.family || ('fullName' in font ? font.fullName : font.label),
    isMonospace: typeof font.isMonospace === 'boolean' ? (font.isMonospace ? 1 : 0) : font.isMonospace ?? 0,
    italic: typeof font.italic === 'boolean' ? (font.italic ? 1 : 0) : font.italic ?? 0,
  }
  const allowedTags = new Set(styleTagOptions.value)
  const styleTags = parseTokenText(editableFont.styleTags || '').filter(tag => allowedTags.has(tag))
  currentSearchIndexFont.value = editableFont
  searchIndexForm.value = {
    styleTags,
    searchKeywords: editableFont.searchKeywords || '',
    isMonospace: editableFont.isMonospace ?? 0,
    italic: editableFont.italic ?? 0,
    weightClass: editableFont.weightClass || undefined,
    widthClass: editableFont.widthClass || undefined,
  }
  searchIndexDialogVisible.value = true
}

const saveSearchIndex = async () => {
  const font = currentSearchIndexFont.value
  if (!font?.id) return
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

const openNumberGlyphEditor = () => {
	numberGlyphDialogRef.value?.open()
}

// 选择字体
const ensureFontBySlug = async (slug: string, family: string) => {
  try {
    if (document.fonts && (document as any).fonts.check && (document as any).fonts.check(`12px ${family}`)) return
    let url = ''
    try {
      const by = await getFontBySlug(slug)
      url = by?.data?.ttfFile?.url || ''
    } catch {}
    if (!url) {
      try {
        const sys = await getSystemFonts(undefined, userStore.userInfo?.id)
        const hit = (sys.data || []).find((f: any) => f.slug === slug)
        url = hit?.ttfFile?.url || ''
      } catch {}
    }
    if (!url) return
    const ttfUrl = url.startsWith('http') ? url : `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    await fontStore.loadFont(slug, ttfUrl)
  } catch {}
}

// 选择字体
const selectFont = async (font: FontItem) => {
  if (!canUseAsset(font, canUsePremiumAssets.value)) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }

  // If selecting icon font, enforce single set per watch face
  if (props.type === FontTypes.ICON_FONT) {
    const current = iconFontStrategyStore.currentIconFontSlug
    if (current && current !== font.value) {
      try {
        await ElMessageBox.confirm(
          t('font.switchIconFontConfirm'),
          t('font.switchIconFontTitle'),
          { type: 'warning', confirmButtonText: t('font.switch'), cancelButtonText: t('common.cancel') }
        )
      } catch {
        return
      }
      await ensureFontBySlug(font.value, font.family)
      iconFontStrategyStore.updateAllIconFont(font.value)
    } else if (!current) {
      iconFontStrategyStore.setIconFontSlug(font.value)
      await ensureFontBySlug(font.value, font.family)
    } else {
      await ensureFontBySlug(font.value, font.family)
    }
  } else {
    await ensureFontBySlug(font.value, font.family)
  }

  emit('update:modelValue', font.value)
  emit('change', font.value)
  try { await increaseFontUsage(font.value, userStore.userInfo?.id) } catch {}
  fontStore.addRecentFont(font)
}

// 上传完成回调（来自子组件）
const onFontUploaded = async (slug: string) => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.premiumAssetRequired')
    return
  }

  if (props.type === FontTypes.ICON_FONT) {
    const current = iconFontStrategyStore.currentIconFontSlug
    if (current && current !== slug) {
      try {
        await ElMessageBox.confirm(
          t('font.switchIconFontConfirm'),
          t('font.switchIconFontTitle'),
          { type: 'warning', confirmButtonText: t('font.switch'), cancelButtonText: t('common.cancel') }
        )
      } catch {
        return
      }
      iconFontStrategyStore.updateAllIconFont(slug)
    } else if (!current) {
      iconFontStrategyStore.setIconFontSlug(slug)
    }
  }
  emit('update:modelValue', slug)
  emit('change', slug)
}

const addCustomFont = () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  dialogVisible.value = true
}

onMounted(async () => {
  await fontStore.fetchFonts()
  loadStyleTagOptions()
  // initial refresh with current type (if provided)
  if (props.type !== undefined) {
    try {
      await Promise.all([
        fontStore.initBuiltinFontsFromSystem(props.type),
        fontStore.initRecentFonts(props.type)
      ])
    } catch {}
  }
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
})

// When type changes, refresh system and recent fonts for the new type
watch(
  () => props.type,
  async (newType, oldType) => {
    if (newType === oldType) return
    try {
      await Promise.all([
        fontStore.initBuiltinFontsFromSystem(newType),
        fontStore.initRecentFonts(newType)
      ])
    } catch {}
  }
)

void [systemSections, openNumberGlyphEditor]
</script>

<style scoped>
.font-picker {
  position: relative;
  width: 100%;
}

.font-preview {
  padding: 8px 12px;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  cursor: pointer;
  background: var(--studio-surface);
  color: var(--studio-text);
  display: flex;
  gap: 12px;
  align-items: center;
}

.font-preview:hover {
  border-color: var(--studio-primary);
}

.font-panel {
  position: fixed;
  max-height: min(820px, calc(100vh - 48px));
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--studio-surface-raised);
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  box-shadow: var(--studio-shadow-md);
  z-index: 10000;
}

.font-name {
  font-size: 13px;
  color: var(--studio-text-muted);
}

.preview-text {
  font-size: 18px;
  color: var(--studio-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-text-icon {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.font-panel-toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--studio-surface-raised);
  border-bottom: 1px solid var(--studio-border);
}

.add-font-btn,
.open-library-anchor {
  min-width: 0;
  min-height: 28px;
  padding: 5px 8px;
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  background: var(--studio-surface);
  color: var(--studio-primary);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-font-btn:hover,
.open-library-anchor:hover {
  background: var(--studio-surface-soft);
}

.font-scope-toggle {
  flex-shrink: 0;
}

/* solid divider between sections (thicker with subtle pattern) */
.section-divider {
  width: 100%;
  height: 6px; /* thicker */
  border-radius: 4px;
  margin: 12px 0; /* more spacing */
  background: repeating-linear-gradient(
    135deg,
    var(--studio-border) 0px,
    var(--studio-border) 8px,
    var(--studio-surface-soft) 8px,
    var(--studio-surface-soft) 16px
  );
  box-shadow: inset 0 0 0 1px var(--studio-border); /* crisp border */
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--studio-surface-soft);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--studio-border-strong);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--studio-primary-border);
}

.font-upload {
  margin: 16px 0;
  display: flex;
  justify-content: center;
}

.font-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.font-upload-area {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-icon {
  font-size: 48px;
  color: var(--studio-primary);
}

.upload-text {
  text-align: center;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--studio-text-subtle);
}

.font-info {
  background: var(--studio-surface-soft);
  border-radius: 8px;
  padding: 16px;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-name {
  font-size: 14px;
  color: var(--studio-text);
  font-weight: 500;
}

.remove-btn {
  padding: 2px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-label {
  font-size: 14px;
  color: var(--studio-text-muted);
}

.font-preview {
  background: var(--studio-surface);
  border: 1px solid var(--studio-border);
  border-radius: 4px;
  padding: 16px;
}

.preview-section .preview-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 16px;
}

.preview-numbers {
  font-size: 24px;
  color: var(--studio-primary);
}

.preview-letters {
  font-size: 20px;
  color: var(--studio-text);
}

.preview-chinese {
  font-size: 18px;
  color: var(--studio-text-muted);
}

</style>
