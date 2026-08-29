<template>
  <section class="editor-settings-bar" :aria-label="t('editor.editorSettings')">
    <div class="editor-settings-primary">
      <div class="editor-status">
        <div class="status-item" :title="deviceCodeLabel">
          <Icon icon="material-symbols:watch-outline-rounded" width="17" height="17" />
          <span>{{ deviceCodeLabel }}</span>
        </div>
        <div class="status-item" :title="selectedElementLabel">
          <Icon icon="material-symbols:ads-click-rounded" width="17" height="17" />
          <span>{{ selectedElementLabel }}</span>
        </div>
        <div class="status-item canvas-size-status" :title="t('editorSettings.canvasSize')">
          <Icon icon="material-symbols:crop-square-rounded" width="17" height="17" />
          <span>{{ canvasSizeLabel }}</span>
        </div>
      </div>
      <div class="zoom-controls" :aria-label="t('editorSettings.zoomControls')">
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
      <div class="bottom-view-toggles">
        <el-button
          circle
          class="icon-button toggle-button bottom-time-simulator-toggle"
          :class="{ active: showTimeSimulator }"
          :aria-pressed="showTimeSimulator"
          :title="t('editorSettings.timeSimulator')"
          @click="handleTimeSimulatorChange(!showTimeSimulator)">
          <Icon icon="material-symbols:schedule-rounded" width="18" height="18" />
        </el-button>
        <el-button
          circle
          class="icon-button toggle-button bottom-device-frame-toggle"
          :class="{ active: showDeviceFrame }"
          :aria-pressed="showDeviceFrame"
          :title="t('editorSettings.deviceFrame')"
          @click="handleDeviceFrameChange(!showDeviceFrame)">
          <Icon icon="material-symbols:watch-outline-rounded" width="18" height="18" />
        </el-button>
        <el-button
          circle
          class="icon-button toggle-button bottom-ruler-guides-toggle"
          :class="{ active: showRulerGuides }"
          :aria-pressed="showRulerGuides"
          :title="t('editorSettings.rulerGuides')"
          @click="handleRulerGuidesChange(!showRulerGuides)">
          <Icon icon="material-symbols:grid-4x4-rounded" width="18" height="18" />
        </el-button>
      </div>
      <el-popover placement="top-end" trigger="click" :width="340" popper-class="editor-settings-more-popover">
        <template #reference>
          <el-button class="more-settings-trigger" :title="t('common.more')">
            <Icon icon="material-symbols:more-horiz-rounded" width="20" height="20" />
            <span>{{ t('common.more') }}</span>
          </el-button>
        </template>
        <div class="more-settings-panel">
          <div class="more-settings-heading">{{ t('editor.editorSettings') }}</div>
          <section class="more-settings-section">
            <h3>{{ t('editorSettings.previewSection') }}</h3>
            <div class="settings-toggle-row">
              <span>{{ t('editorSettings.timeSimulator') }}</span>
              <el-switch v-model="showTimeSimulator" size="small" @change="handleTimeSimulatorChange" />
            </div>
            <div class="more-settings-row unit-settings-row">
              <span>D</span>
              <el-select v-model="previewDevice.distanceUnits" size="small" @change="refreshMetricPreview">
                <el-option label="km / m" value="metric" />
                <el-option label="mi / ft" value="statute" />
              </el-select>
              <span>T</span>
              <el-select v-model="previewDevice.temperatureUnits" size="small" @change="refreshMetricPreview">
                <el-option label="°C" value="metric" />
                <el-option label="°F" value="statute" />
              </el-select>
            </div>
            <ConnectIqDataTypeSelector />
          </section>

          <section class="more-settings-section">
            <h3>{{ t('editorSettings.canvasAidsSection') }}</h3>
            <div class="settings-toggle-row">
              <span>{{ t('editorSettings.deviceFrame') }}</span>
              <el-switch v-model="showDeviceFrame" size="small" @change="handleDeviceFrameChange" />
            </div>
            <div class="settings-toggle-row">
              <span>{{ t('editorSettings.rulerGuides') }}</span>
              <el-switch v-model="showRulerGuides" size="small" @change="handleRulerGuidesChange" />
            </div>
            <div class="more-settings-row">
              <el-checkbox v-model="showKeyGuidelines" @change="handleKeyGuidelinesToggle">{{ t('editorSettings.keyGuidelines') }}</el-checkbox>
              <el-select v-model="keyGuidelineDivisions" :disabled="!showKeyGuidelines" size="small" class="more-divisions-select" @change="handleKeyGuidelinesDivisionsChange">
                <el-option v-for="division in [2, 3, 4, 5, 6, 8]" :key="division" :label="String(division)" :value="division" />
              </el-select>
            </div>
          </section>

          <section class="more-settings-section">
            <h3>{{ t('editorSettings.appearanceSection') }}</h3>
            <div class="more-settings-row">
              <span>{{ t('editorSettings.gridColor') }}</span>
              <el-color-picker v-model="rulerGuidesColor" size="small" @change="applyRulerGuidesStyle" />
            </div>
            <div class="more-settings-row">
              <span>{{ themeStore.currentTheme === 'light' ? t('editorSettings.lightCanvasBackground') : t('editorSettings.darkCanvasBackground') }}</span>
              <el-color-picker v-if="themeStore.currentTheme === 'light'" v-model="lightCanvasBackgroundColor" size="small" show-alpha @change="handleLightCanvasBackgroundColorChange" />
              <el-color-picker v-else v-model="darkCanvasBackgroundColor" size="small" show-alpha @change="handleDarkCanvasBackgroundColorChange" />
            </div>
            <div class="more-opacity-section">
              <div class="opacity-row-label">
                <span>{{ t('editorSettings.majorOpacity') }}</span>
                <span>{{ rulerGuidesMajor.toFixed(2) }}</span>
              </div>
              <el-slider v-model="rulerGuidesMajor" :min="0" :max="1" :step="0.01" @input="applyRulerGuidesStyle" @change="applyRulerGuidesStyle" />
              <div class="opacity-row-label">
                <span>{{ t('editorSettings.minorOpacity') }}</span>
                <span>{{ rulerGuidesMinor.toFixed(2) }}</span>
              </div>
              <el-slider v-model="rulerGuidesMinor" :min="0" :max="1" :step="0.01" @input="applyRulerGuidesStyle" @change="applyRulerGuidesStyle" />
            </div>
          </section>
        </div>
      </el-popover>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { elementConfigs } from '@/elements/schemaMap'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDesignStore } from '@/stores/designStore'
import { useEditorStore } from '@/stores/editorStore'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { clearAllGuidelines } from '@/utils/guidelineUtil'
import type { FabricElement } from '@/types/element'
import ConnectIqDataTypeSelector from './ConnectIqDataTypeSelector.vue'
import { usePreviewDeviceContextStore } from '@/stores/previewDeviceContextStore'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'

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
const themeStore = useThemeStore()
const userStore = useUserStore()
const previewDevice = usePreviewDeviceContextStore()
const { t } = useI18n()

const lightCanvasBackgroundColor = ref<string>(editorStore.lightCanvasBackgroundColor)
const darkCanvasBackgroundColor = ref<string>(editorStore.darkCanvasBackgroundColor)
const showTimeSimulator = ref<boolean>(editorStore.showTimeSimulator)
const showDeviceFrame = ref<boolean>(editorStore.showDeviceFrame)
const showRulerGuides = ref<boolean>(editorStore.showRulerGuides)
const rulerGuidesColor = ref<string>(editorStore.rulerGuidesColor)
const rulerGuidesMajor = ref<number>(editorStore.rulerGuidesMajor)
const rulerGuidesMinor = ref<number>(editorStore.rulerGuidesMinor)
const showKeyGuidelines = ref<boolean>(editorStore.showKeyGuidelines)
const keyGuidelineDivisions = ref<2 | 3 | 4 | 5 | 6 | 8>(editorStore.keyGuidelineDivisions)

const zoomPercentLabel = computed(() => `${Math.round(editorStore.zoomLevel * 100)}%`)

const canvasSizeLabel = computed(() => {
  const width = Number(designStore.designSpec.width || 0)
  const height = Number(designStore.designSpec.height || 0)
  return `${width} × ${height}`
})

const selectedElements = computed<FabricElement[]>(() => {
  if (!canvasStore.canvas) return []
  const idSet = new Set(canvasStore.activeIds)
  return canvasStore.canvas.getObjects().filter((object) => {
    const id = (object as FabricElement).id
    return id && idSet.has(String(id))
  }) as FabricElement[]
})

const deviceCodeLabel = computed(() => {
  const device = userStore.userInfo?.device
  return device?.deviceId || device?.partNumber || device?.hardwarePartNumber || device?.displayName || '-'
})

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
  if (selectedElements.value.length === 1) return getElementName(selectedElements.value[0])
  if (selectedElements.value.length > 1) return `${selectedElements.value.length} Elements`
  return '-'
})

const refreshMetricPreview = () => {
  getDataSimulatorEngine().updateCanvas()
}

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
  getDataSimulatorEngine().updateCanvas()
}

const handleDeviceFrameChange = (value: boolean) => {
  showDeviceFrame.value = Boolean(value)
  editorStore.updateSetting('showDeviceFrame', showDeviceFrame.value)
}

const handleRulerGuidesChange = (value: boolean) => {
  showRulerGuides.value = Boolean(value)
  editorStore.updateSetting('showRulerGuides', showRulerGuides.value)
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
    rulerGuidesMinor: Number(rulerGuidesMinor.value)
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
  overflow: hidden;
  overflow-y: hidden;
  border-top: 1px solid var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-text);
  box-shadow: 0 -1px 0 rgba(15, 23, 42, 0.02);
  white-space: nowrap;
}

.editor-settings-primary {
  width: 100%;
  height: 34px;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.editor-status {
  min-width: 0;
  height: 34px;
  display: flex;
  flex: 1 1 auto;
  overflow: hidden;
}

.status-item {
  min-width: 0;
  max-width: 180px;
  height: 34px;
  display: flex;
  flex: 1 1 140px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  overflow: hidden;
  border-right: 1px solid var(--studio-border);
  font-size: 12px;
  font-weight: 750;
}

.status-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-item :deep(svg) {
  flex: 0 0 auto;
}

.more-settings-trigger {
  flex: 0 0 auto;
  height: 34px;
  margin-left: auto;
  padding: 0 12px;
  border-top: 0;
  border-bottom: 0;
  border-right: 0;
  border-radius: 0;
}

:global(.editor-settings-more-popover) {
  padding: 14px;
}

:global(.editor-settings-more-popover .more-settings-panel) {
  display: flex;
  flex-direction: column;
  gap: 0;
  color: var(--studio-text);
}

:global(.editor-settings-more-popover .more-settings-heading) {
  font-size: 13px;
  font-weight: 750;
  padding: 0 2px 12px;
}

:global(.editor-settings-more-popover .more-settings-section) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 2px;
  border-top: 1px solid var(--studio-border);
}

:global(.editor-settings-more-popover .more-settings-section h3) {
  margin: 0;
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:global(.editor-settings-more-popover .settings-toggle-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  font-size: 12px;
}

:global(.editor-settings-more-popover .more-settings-row) {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--studio-text-muted);
  font-size: 12px;
}

.canvas-size-status {
  flex-basis: 112px;
  max-width: 132px;
  font-variant-numeric: tabular-nums;
}

:global(.editor-settings-more-popover .more-settings-row .el-select) {
  flex: 1 1 0;
  min-width: 0;
}

:global(.editor-settings-more-popover .more-divisions-select) {
  max-width: 84px;
  margin-left: auto;
}

:global(.editor-settings-more-popover .more-settings-row .el-color-picker) {
  margin-left: auto;
}

:global(.editor-settings-more-popover .more-opacity-section) {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

@media (max-width: 520px) {
  .more-settings-trigger span {
    display: none;
  }

  .more-settings-trigger {
    width: 34px;
    padding: 0;
  }
}

.zoom-controls {
  height: 34px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-left: 1px solid var(--studio-border);
}

.bottom-view-toggles {
  height: 34px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  border-left: 1px solid var(--studio-border);
}

.bottom-view-toggles .el-button + .el-button {
  margin-left: 0;
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
