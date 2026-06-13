<template>
  <div ref="pickerRef" class="font-picker">
    <!-- Current selected font preview -->
    <div class="font-preview" @click="togglePanel">
      <span class="font-name">{{ selectedFontLabel }}</span>
      <FontPreviewText :font-family="selectedFontFamily" :type="type" />
    </div>

    <!-- Font selection panel -->
    <Teleport to="body">
      <div v-if="isOpen" ref="panelRef" class="font-panel" :style="panelStyle">
        <!-- Add custom font button -->
        <button v-if="canUsePremiumAssets" class="add-font-btn" type="button" @click.stop.prevent="addCustomFont">{{ t('font.addCustomFont') }}</button>
        <!-- Icon library guidance (only for icon fonts) -->
        <div v-if="type === FontTypes.ICON_FONT" class="icon-lib-tip">
          <RouterLink class="open-library-anchor" to="/icon-library" target="_blank" rel="noopener">{{ t('font.manageIconFonts') }}</RouterLink>
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
          @select="selectFont"
        />
        <!-- Recent fonts -->
        <RecentFontList
            :fonts="recentFonts"
            :model-value="modelValue"
            :expanded="expandedSections['recent']"
            :type="type"
            :can-use-premium-assets="canUsePremiumAssets"
            @select="selectFont"
            @toggle="() => toggleSection('recent')"
        />
        <!-- Designer available fonts (paginated by usage) -->
        <DesignerFontList
            :model-value="modelValue"
            :type="type"
            :can-use-premium-assets="canUsePremiumAssets"
            @select="selectFont"
            @scroll="onDesignerScroll"
        />
      </div>
    </Teleport>
    <!-- Add font dialog -->
    <FontImportDialog v-if="canUsePremiumAssets" v-model:visible="dialogVisible" @selected="onFontUploaded" />
    <!-- Number glyph editor dialog (for number fonts) -->
    <NumberGlyphEditorDialog ref="numberGlyphDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'
import { getFontBySlug, getSystemFonts, increaseFontUsage } from '@/api/wristo/fonts'
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

// parsed font info moved to child component

// Store data with precise typing for template usage
const fontSections = computed(() => fontStore.fontSections as Array<{ label: string; name: SectionName | string; fonts: FontItem[] }>)
const systemSections = computed(() => (fontSections.value || []).filter(s => s.name !== 'recent'))
const recentFonts = computed(() => fontStore.recentFonts as FontItem[])
const expandedSections = computed(() => fontStore.expandedSections as Record<string, boolean>)
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
    await nextTick()
    updatePanelPosition()
  }
}

// 切换分组展开/收起
const toggleSection = (section: SectionName | string) => {
  fontStore.toggleSection(section)
}

const onDesignerScroll = () => {
  if (fontStore.expandedSections?.recent) {
    fontStore.toggleSection('recent')
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
  isOpen.value = false
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
  isOpen.value = false
}

const addCustomFont = () => {
  if (!canUsePremiumAssets.value) {
    membershipGate.requirePremium('font.uploadRequiresPremium')
    return
  }
  dialogVisible.value = true
}

// 监听点击外部关闭面板
const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!pickerRef.value?.contains(target) && !panelRef.value?.contains(target)) {
    isOpen.value = false
  }
}

onMounted(async () => {
  await fontStore.fetchFonts()
  // initial refresh with current type (if provided)
  if (props.type !== undefined) {
    try {
      await Promise.all([
        fontStore.initBuiltinFontsFromSystem(props.type),
        fontStore.initRecentFonts(props.type)
      ])
    } catch {}
  }
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
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

.add-font-btn {
  width: 100%;
  padding: 12px;
  border: none;
  background: none;
  color: var(--studio-primary);
  font-size: 14px;
  cursor: pointer;
  border-top: 1px solid var(--studio-border);
}

.add-font-btn:hover {
  background: var(--studio-surface-soft);
}

.icon-lib-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--studio-border);
  border-bottom: 1px solid var(--studio-border);
  font-size: 13px;
  color: var(--studio-text-muted);
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
