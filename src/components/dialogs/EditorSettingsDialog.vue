<template>
  <section class="editor-settings-bar" :aria-label="t('editor.editorSettings')">
    <div class="bar-group left-group">
      <div class="bar-cell device-cell" :title="deviceCodeLabel">
        <Icon icon="material-symbols:watch-outline-rounded" width="17" height="17" />
        <span>{{ deviceCodeLabel }}</span>
      </div>

      <div class="bar-cell selected-cell" :title="selectedElementLabel">
        <Icon icon="material-symbols:ads-click-rounded" width="17" height="17" />
        <span>{{ selectedElementLabel }}</span>
      </div>

      <div class="bar-cell canvas-size-cell" :title="canvasSizeLabel">
        <Icon icon="material-symbols:crop-square-rounded" width="17" height="17" />
        <span>{{ canvasSizeLabel }}</span>
      </div>

      <div class="bar-cell zoom-cell">
        <el-button circle class="icon-button" @click="handleZoomOut" :title="t('canvas.zoomOut')">
          <Icon icon="material-symbols:remove-rounded" width="18" height="18" />
        </el-button>
        <span class="zoom-level">{{ zoomPercentLabel }}</span>
        <el-button circle class="icon-button" @click="handleZoomIn" :title="t('canvas.zoomIn')">
          <Icon icon="material-symbols:add-rounded" width="18" height="18" />
        </el-button>
        <el-button circle class="icon-button" @click="handleResetZoom" :title="t('canvas.resetZoom')">
          <Icon icon="material-symbols:refresh-rounded" width="18" height="18" />
        </el-button>
      </div>

    </div>

    <div class="bar-group center-group">
      <label class="bar-cell check-cell time-simulator-cell">
        <el-checkbox
          v-model="showTimeSimulator"
          @change="handleTimeSimulatorChange"
        />
        <span>{{ t('editorSettings.timeSimulator') }}</span>
      </label>

      <label class="bar-cell check-cell chinese-content-cell">
        <el-switch
          :model-value="chineseContentEnabled"
          size="small"
          @change="handleChineseContentChange"
        />
        <span>{{ t('editorSettings.chineseContent') }}</span>
      </label>

      <div v-if="canQuickAlign" class="bar-cell quick-align-cell">
        <el-button
          v-for="option in quickAlignOptions"
          :key="option.type"
          circle
          class="icon-button quick-align-button"
          :title="t(option.labelKey)"
          @click="handleQuickAlign(option.type)"
        >
          <Icon :icon="option.icon" width="17" height="17" />
        </el-button>
      </div>
    </div>

    <div class="bar-group right-group">
      <div class="bar-cell key-guides-cell">
        <label class="check-cell compact-check">
          <el-checkbox
            v-model="showKeyGuidelines"
            @change="handleKeyGuidelinesToggle"
          />
          <span>{{ t('editorSettings.keyGuidelines') }}</span>
        </label>
        <el-select
          v-model="keyGuidelineDivisions"
          :disabled="!showKeyGuidelines"
          size="small"
          class="divisions-select"
          :placeholder="t('editorSettings.divisions')"
          @change="handleKeyGuidelinesDivisionsChange"
        >
          <el-option :label="'2'" :value="2" />
          <el-option :label="'3'" :value="3" />
          <el-option :label="'4'" :value="4" />
          <el-option :label="'5'" :value="5" />
          <el-option :label="'6'" :value="6" />
          <el-option :label="'8'" :value="8" />
        </el-select>
      </div>

      <el-button
        circle
        class="bar-cell icon-button toggle-button device-frame-toggle"
        :class="{ active: showDeviceFrame }"
        @click="toggleDeviceFrame"
        :title="t('editorSettings.deviceFrame')"
      >
        <Icon icon="material-symbols:watch-outline-rounded" width="18" height="18" />
      </el-button>

      <el-button
        circle
        class="bar-cell icon-button toggle-button ruler-toggle"
        :class="{ active: showRulerGuides }"
        @click="toggleRulerGuides"
        :title="t('editorSettings.rulerGuides')"
      >
        <Icon icon="material-symbols:grid-4x4-rounded" width="18" height="18" />
      </el-button>

      <div class="bar-cell grid-color-cell">
        <span class="cell-label">{{ t('editorSettings.gridColor') }}</span>
        <el-color-picker
          v-model="rulerGuidesColor"
          size="small"
          @change="applyRulerGuidesStyle"
        />
      </div>

      <div v-if="themeStore.currentTheme === 'light'" class="bar-cell canvas-bg-cell">
        <span class="cell-label">{{ t('editorSettings.lightCanvasBackground') }}</span>
        <el-color-picker
          v-model="lightCanvasBackgroundColor"
          size="small"
          show-alpha
          @change="handleLightCanvasBackgroundColorChange"
        />
      </div>

      <div v-if="themeStore.currentTheme === 'dark'" class="bar-cell canvas-bg-cell">
        <span class="cell-label">{{ t('editorSettings.darkCanvasBackground') }}</span>
        <el-color-picker
          v-model="darkCanvasBackgroundColor"
          size="small"
          show-alpha
          @change="handleDarkCanvasBackgroundColorChange"
        />
      </div>

      <el-popover
        v-model:visible="opacityPopoverVisible"
        placement="top-end"
        trigger="click"
        :width="280"
        popper-class="editor-opacity-popover"
      >
        <template #reference>
          <button
            type="button"
            class="bar-cell opacity-trigger"
            :class="{ active: opacityPopoverVisible }"
            :title="t('editorSettings.opacity')"
          >
            <span class="cell-label">{{ t('editorSettings.opacity') }}</span>
            <span class="opacity-summary">{{ rulerGuidesMajor.toFixed(2) }} / {{ rulerGuidesMinor.toFixed(2) }}</span>
          </button>
        </template>

        <div class="opacity-popover-content">
          <div class="opacity-popover-header">
            <span>{{ t('editorSettings.opacity') }}</span>
            <el-button
              circle
              size="small"
              class="opacity-close-button"
              :title="t('common.confirm')"
              @click="opacityPopoverVisible = false"
            >
              <Icon icon="material-symbols:close-rounded" width="16" height="16" />
            </el-button>
          </div>

          <div class="opacity-row">
            <div class="opacity-row-label">
              <span>{{ t('editorSettings.majorOpacity') }}</span>
              <span>{{ rulerGuidesMajor.toFixed(2) }}</span>
            </div>
            <el-slider
              v-model="rulerGuidesMajor"
              :min="0"
              :max="1"
              :step="0.01"
              @input="applyRulerGuidesStyle"
              @change="applyRulerGuidesStyle"
            />
          </div>

          <div class="opacity-row">
            <div class="opacity-row-label">
              <span>{{ t('editorSettings.minorOpacity') }}</span>
              <span>{{ rulerGuidesMinor.toFixed(2) }}</span>
            </div>
            <el-slider
              v-model="rulerGuidesMinor"
              :min="0"
              :max="1"
              :step="0.01"
              @input="applyRulerGuidesStyle"
              @change="applyRulerGuidesStyle"
            />
          </div>
        </div>
      </el-popover>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { elementConfigs } from '@/elements/schemaMap'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDesignStore } from '@/stores/designStore'
import { useEditorStore } from '@/stores/editorStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'
import { clearAllGuidelines } from '@/utils/guidelineUtil'
import type { FabricElement } from '@/types/element'
import { alignSelection, type AlignType } from '@/engine/managers/alignManager'
import * as elementManager from '@/engine/managers/elementManager'
import { useHistoryStore } from '@/stores/historyStore'
import { getFontBySlug } from '@/api/wristo/fonts'
import {
  DEFAULT_NON_CHINESE_DATE_FORMATTER,
  getDateContentLanguageForRuntimeLocale,
  getDateFontRequirementLabel,
  isChineseDateFormatter,
  isFontCompatibleWithDateLanguage,
} from '@/utils/dateFontCompatibility'
import { resolveMetricLabel, resolveMetricUnit } from '@/utils/metricLabel'

const props = defineProps<{
  canvasRef?: {
    zoomIn?: () => void
    zoomOut?: () => void
    resetZoom?: () => void
  } | null
}>()

const baseStore = useBaseStore()
const canvasStore = useCanvasStore()
const designStore = useDesignStore()
const editorStore = useEditorStore()
const elementDataStore = useElementDataStore()
const themeStore = useThemeStore()
const userStore = useUserStore()
const fontStore = useFontStore()
const historyStore = useHistoryStore()
const propertiesStore = usePropertiesStore()
const { t } = useI18n()

const lightCanvasBackgroundColor = ref<string>(editorStore.lightCanvasBackgroundColor)
const darkCanvasBackgroundColor = ref<string>(editorStore.darkCanvasBackgroundColor)
const showTimeSimulator = ref<boolean>(editorStore.showTimeSimulator)
const showDeviceFrame = ref<boolean>(editorStore.showDeviceFrame)
const showRulerGuides = ref<boolean>(editorStore.showRulerGuides)
const rulerGuidesColor = ref<string>(editorStore.rulerGuidesColor)
const rulerGuidesMajor = ref<number>(editorStore.rulerGuidesMajor)
const rulerGuidesMinor = ref<number>(editorStore.rulerGuidesMinor)
const opacityPopoverVisible = ref<boolean>(false)
const showKeyGuidelines = ref<boolean>(editorStore.showKeyGuidelines)
const keyGuidelineDivisions = ref<2 | 3 | 4 | 5 | 6 | 8>(editorStore.keyGuidelineDivisions)

const quickAlignOptions: Array<{ type: AlignType; icon: string; labelKey: string }> = [
  { type: 'left', icon: 'mdi:align-horizontal-left', labelKey: 'editor.alignLeft' },
  { type: 'center', icon: 'mdi:align-horizontal-center', labelKey: 'editor.alignCenter' },
  { type: 'right', icon: 'mdi:align-horizontal-right', labelKey: 'editor.alignRight' },
  { type: 'top', icon: 'mdi:align-vertical-top', labelKey: 'editor.alignTop' },
  { type: 'middle', icon: 'mdi:align-vertical-center', labelKey: 'editor.alignMiddle' },
  { type: 'bottom', icon: 'mdi:align-vertical-bottom', labelKey: 'editor.alignBottom' },
]

const canvasSizeLabel = computed(() => {
  const width = Number(designStore.designSpec.width || 0)
  const height = Number(designStore.designSpec.height || 0)
  return `${width} x ${height}`
})

const zoomPercentLabel = computed(() => `${Math.round(editorStore.zoomLevel * 100)}%`)

const selectedElements = computed<FabricElement[]>(() => {
  if (!canvasStore.canvas) return []
  const idSet = new Set(canvasStore.activeIds)
  return canvasStore.canvas
    .getObjects()
    .filter((object) => {
      const id = (object as FabricElement).id
      return id && idSet.has(String(id))
    }) as FabricElement[]
})

const currentDeviceCode = computed(() => {
  const device = userStore.userInfo?.device
  return device?.deviceId || device?.partNumber || device?.hardwarePartNumber || device?.displayName || ''
})

const deviceCodeLabel = computed(() => currentDeviceCode.value || '-')

const getElementName = (element: FabricElement | null): string => {
  const elementType = element?.eleType
  if (!elementType) return ''
  for (const category of Object.values(elementConfigs)) {
    const config = category[elementType]
    if (config?.label) return String(config.label)
  }
  return elementType
}

const selectedElementLabel = computed(() => {
  if (selectedElements.value.length === 1) {
    return getElementName(selectedElements.value[0])
  }
  if (selectedElements.value.length > 1) {
    return `${selectedElements.value.length} Elements`
  }
  return '-'
})

const canQuickAlign = computed(() => selectedElements.value.length > 1)
const chineseContentEnabled = computed(() => designStore.supportsChineseContent)

const handleLightCanvasBackgroundColorChange = (color: string) => {
  lightCanvasBackgroundColor.value = color
  editorStore.updateSetting('lightCanvasBackgroundColor', color)
}

const handleDarkCanvasBackgroundColorChange = (color: string) => {
  darkCanvasBackgroundColor.value = color
  editorStore.updateSetting('darkCanvasBackgroundColor', color)
}

const handleTimeSimulatorChange = (value: boolean) => {
  showTimeSimulator.value = Boolean(value)
  editorStore.updateSetting('showTimeSimulator', showTimeSimulator.value)
}

const getDateElementsUsingChineseFormats = () => {
  const canvas = canvasStore.canvas
  return ((canvas?.getObjects?.() || []) as FabricElement[])
    .filter((object) => (object as any).eleType === 'date' && isChineseDateFormatter((object as any).formatter))
}

const resolveFontForDateCheck = async (slug: string) => {
  const local = [
    ...(fontStore.allFonts as any[]),
    ...(fontStore.recentFonts as any[]),
  ].find((font) => font?.value === slug || font?.slug === slug)
  if (local) return local
  const cached = fontStore.serverFonts.get(slug)
  if (cached) return cached
  try {
    const res = await getFontBySlug(slug)
    if (res.data) {
      fontStore.serverFonts.set(slug, res.data)
      return res.data
    }
  } catch {}
  return null
}

const warnIncompatibleDateFonts = async () => {
  const dateElements = ((canvasStore.canvas?.getObjects?.() || []) as FabricElement[])
    .filter((object) => (object as any).eleType === 'date')
  const datePreviewLocale = designStore.supportsChineseContent ? 'zh' : designStore.defaultLocale
  for (const element of dateElements) {
    const fontFamily = String((element as any).fontFamily || '')
    if (!fontFamily) continue
    const language = getDateContentLanguageForRuntimeLocale((element as any).formatter, datePreviewLocale)
    const font = await resolveFontForDateCheck(fontFamily)
    if (font && !isFontCompatibleWithDateLanguage(font, language)) {
      ElMessage.warning(`A date element now requires a ${getDateFontRequirementLabel(language)}. Please choose a compatible font.`)
      return
    }
  }
}

const refreshMetricTextElementsForContentLanguage = () => {
  const language = designStore.supportsChineseContent ? 'zh' : 'en'
  const metricTextElements = ((canvasStore.canvas?.getObjects?.() || []) as FabricElement[])
    .filter((object) => ['label', 'unit'].includes(String((object as any).eleType ?? '')))

  for (const element of metricTextElements) {
    const metric = propertiesStore.getMetricByOptions({
      dataProperty: (element as any).dataProperty,
      goalProperty: (element as any).goalProperty,
      metricSymbol: (element as any).metricSymbol,
    })
    const nextText = (element as any).eleType === 'unit'
      ? resolveMetricUnit(metric, language)
      : resolveMetricLabel(metric, language)
    ;(element as any).set?.('text', nextText)
    if ((element as any).eleType === 'unit') {
      ;(element as any).metricValue = nextText
    }
    const elementId = String((element as any).id || '')
    if (elementId) {
      const patch: Record<string, string> = { text: nextText }
      if ((element as any).eleType === 'unit') patch.metricValue = nextText
      elementDataStore.patchElement(elementId, patch as any)
    }
  }

  if (metricTextElements.length > 0) {
    canvasStore.canvas?.requestRenderAll?.()
  }
}

const refreshDateElementsForContentLanguage = async () => {
  const dateElements = ((canvasStore.canvas?.getObjects?.() || []) as FabricElement[])
    .filter((object) => (object as any).eleType === 'date')

  for (const element of dateElements) {
    const id = (element as any).id
    if (id != null) {
      await elementManager.updateElementById(id, { formatter: (element as any).formatter })
    }
  }
}

const handleChineseContentChange = async (value: boolean | string | number) => {
  const nextEnabled = Boolean(value)
  if (nextEnabled) {
    designStore.setSupportsChineseContent(true)
    refreshMetricTextElementsForContentLanguage()
    await refreshDateElementsForContentLanguage()
    await warnIncompatibleDateFonts()
    historyStore.saveState('settings:enable-chinese-content')
    return
  }

  const affectedDates = getDateElementsUsingChineseFormats()
  if (affectedDates.length > 0) {
    try {
      await ElMessageBox.confirm(
        t('editorSettings.disableChineseContentConfirm', { count: affectedDates.length }),
        t('editorSettings.disableChineseContentTitle'),
        {
          type: 'warning',
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
        },
      )
    } catch {
      return
    }

    for (const element of affectedDates) {
      const id = (element as any).id
      if (id != null) {
        await elementManager.updateElementById(id, { formatter: DEFAULT_NON_CHINESE_DATE_FORMATTER })
      }
    }
    historyStore.saveState('settings:disable-chinese-content')
    ElMessage.warning(t('editorSettings.chineseDateFormatsReset'))
    await warnIncompatibleDateFonts()
  }

  designStore.setSupportsChineseContent(false)
  refreshMetricTextElementsForContentLanguage()
  await refreshDateElementsForContentLanguage()
}

const handleQuickAlign = (type: AlignType) => {
  if (!canQuickAlign.value) return
  alignSelection(type)
}

const handleDeviceFrameChange = (value: boolean) => {
  showDeviceFrame.value = Boolean(value)
  editorStore.updateSetting('showDeviceFrame', showDeviceFrame.value)
}

const toggleDeviceFrame = () => {
  handleDeviceFrameChange(!showDeviceFrame.value)
}

const handleRulerGuidesChange = (value: boolean) => {
  showRulerGuides.value = Boolean(value)
  editorStore.updateSetting('showRulerGuides', showRulerGuides.value)
}

const toggleRulerGuides = () => {
  handleRulerGuidesChange(!showRulerGuides.value)
}

const handleZoomIn = () => {
  props.canvasRef?.zoomIn?.()
}

const handleZoomOut = () => {
  props.canvasRef?.zoomOut?.()
}

const handleResetZoom = () => {
  props.canvasRef?.resetZoom?.()
  clearAllGuidelines(baseStore.canvas as any)
}

const applyRulerGuidesStyle = () => {
  editorStore.updateSettings({
    rulerGuidesColor: rulerGuidesColor.value,
    rulerGuidesMajor: Number(rulerGuidesMajor.value),
    rulerGuidesMinor: Number(rulerGuidesMinor.value),
  })
}

const handleKeyGuidelinesToggle = (value: boolean) => {
  showKeyGuidelines.value = Boolean(value)
  editorStore.updateSetting('showKeyGuidelines', showKeyGuidelines.value)
  if (showKeyGuidelines.value) {
    editorStore.updateSetting('keyGuidelineDivisions', keyGuidelineDivisions.value)
  }
}

const handleKeyGuidelinesDivisionsChange = (value: number) => {
  const valid: ReadonlyArray<number> = [2, 3, 4, 5, 6, 8]
  if (!valid.includes(value)) return
  keyGuidelineDivisions.value = value as 2 | 3 | 4 | 5 | 6 | 8
  editorStore.updateSetting('keyGuidelineDivisions', keyGuidelineDivisions.value)
}

</script>

<style scoped>
.editor-settings-bar {
  flex-shrink: 0;
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  border-top: 1px solid var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-text);
  box-shadow: 0 -1px 0 rgba(15, 23, 42, 0.02);
  white-space: nowrap;
}

.bar-group {
  height: 34px;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
}

.left-group {
  justify-content: flex-start;
}

.center-group {
  flex: 1 1 420px;
  justify-content: center;
  gap: 24px;
  padding: 0 32px;
  border-left: 1px solid var(--studio-border);
  border-right: 1px solid var(--studio-border);
  box-sizing: border-box;
}

.right-group {
  justify-content: flex-end;
}

.bar-cell {
  height: 34px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-right: 1px solid var(--studio-border);
  font-size: 12px;
  line-height: 1;
}

.bar-group .bar-cell:last-child {
  border-right: 0;
}

.device-cell,
.selected-cell {
  justify-content: flex-start;
  color: var(--studio-text);
  font-weight: 750;
}

.device-cell {
  width: 154px;
}

.selected-cell {
  width: 132px;
}

.device-cell span,
.selected-cell span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-size-cell {
  width: 108px;
  justify-content: flex-start;
  color: var(--studio-text-muted);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.canvas-bg-cell {
  width: 166px;
}

.cell-label {
  color: var(--studio-text-muted);
  font-size: 12px;
}

.check-cell {
  cursor: pointer;
}

.compact-check {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: auto;
  padding: 0;
  border-right: 0;
}

.key-guides-cell {
  width: 210px;
  align-items: center;
  justify-content: space-between;
}

.divisions-select {
  width: 72px;
}

.grid-color-cell {
  width: 118px;
}

.opacity-trigger {
  width: 138px;
  appearance: none;
  border-top: 0;
  border-bottom: 0;
  border-left: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.opacity-trigger:hover,
.opacity-trigger.active {
  background: var(--studio-primary-soft);
}

.opacity-summary {
  margin-left: auto;
  color: var(--studio-text-muted);
  text-align: right;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

:global(.editor-opacity-popover) {
  padding: 12px;
}

:global(.editor-opacity-popover .opacity-popover-content) {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

:global(.editor-opacity-popover .opacity-popover-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 750;
}

:global(.editor-opacity-popover .opacity-close-button) {
  width: 24px;
  height: 24px;
  min-height: 24px;
  padding: 0;
  border-color: transparent;
}

:global(.editor-opacity-popover .opacity-row) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:global(.editor-opacity-popover .opacity-row-label) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

:global(.editor-opacity-popover .el-slider) {
  --el-slider-main-bg-color: var(--studio-primary);
}

.zoom-cell {
  width: 146px;
  justify-content: center;
  gap: 4px;
}

.zoom-level {
  width: 42px;
  color: var(--studio-text-muted);
  text-align: center;
  font-size: 12px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.time-simulator-cell {
  width: 142px;
  justify-content: center;
}

.quick-align-cell {
  width: 206px;
  justify-content: center;
  gap: 2px;
  padding: 0 6px;
}

.icon-button {
  width: 26px;
  height: 26px;
  padding: 0;
  border-color: transparent;
  background: transparent;
  color: var(--studio-text-muted);
}

.bar-cell.icon-button {
  width: 34px;
  height: 34px;
  min-height: 34px;
  margin: 0;
  padding: 0;
  border-radius: 0;
  border-top: 0;
  border-bottom: 0;
  border-left: 0;
  border-right: 1px solid var(--studio-border);
}

.icon-button:hover,
.toggle-button.active {
  color: var(--studio-primary);
  border-color: var(--studio-primary-border);
  background: var(--studio-primary-soft);
}

.quick-align-button {
  flex: 0 0 auto;
}

.toggle-button.active {
  box-shadow: inset 0 0 0 1px var(--studio-primary-border);
}

.editor-settings-bar :deep(.el-checkbox) {
  height: 16px;
  margin-right: 0;
}

.editor-settings-bar :deep(.el-checkbox__label) {
  display: none;
}

.editor-settings-bar :deep(.el-checkbox__inner) {
  width: 14px;
  height: 14px;
}

.editor-settings-bar :deep(.el-color-picker__trigger) {
  width: 24px;
  height: 24px;
  padding: 2px;
}

.editor-settings-bar :deep(.el-input__wrapper),
.editor-settings-bar :deep(.el-select__wrapper) {
  min-height: 24px;
}
</style>
