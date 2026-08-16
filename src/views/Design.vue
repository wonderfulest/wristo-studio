<template>
  <div class="design-layout">
    <!-- 编辑器更新日志 -->
    <ChangelogDialog ref="changelogDialog" />
    <div class="editor-workspace">
      <!-- 左侧面板 -->
      <div class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
        <SidePanel />
        <div
          class="panel-resize-handle panel-resize-handle-left"
          :class="{ active: resizingPanel === 'left' }"
          role="separator"
          aria-label="Resize layers panel"
          title="Resize layers panel"
          @mousedown.prevent="startPanelResize('left', $event)"
          @dblclick.prevent="resetPanelWidth('left')"
        />
      </div>
      <!-- 中间画布区域 -->
      <div
        ref="centerAreaRef"
        class="center-area"
        :class="{
          'is-canvas-pan-ready': isCanvasPanReady,
          'is-canvas-panning': isCanvasPanning,
        }"
        @pointerdown.capture="handleCanvasPanPointerDown"
        @pointermove="handleCanvasPanPointerMove"
        @pointerup="handleCanvasPanPointerEnd"
        @pointercancel="handleCanvasPanPointerEnd"
        @lostpointercapture="handleCanvasPanPointerEnd"
        @pointerleave="handleCanvasPanPointerLeave"
        @contextmenu.prevent="openElementContextMenu"
      >
        <!-- 画布 -->
        <div ref="canvasStageRef" class="canvas-stage" :style="canvasStageStyle">
          <CanvasView ref="canvasRef" />
        </div>
        <CanvasRulers
          ref="canvasRulersRef"
          :watch-size="designStore.designSpec.width"
          :ruler-offset="RULER_OFFSET"
        />
        <!-- 缩放控件 -->
        <HistoryControls class="history-controls-anchor" :canvas-ref="canvasRef" />
        <TimeSimulatorPanel v-if="editorStore.showTimeSimulator" />
      </div>
      <!-- 右侧设置面板 -->
      <div class="right-panel" :style="{ width: `${rightPanelWidth}px` }">
        <div
          class="panel-resize-handle panel-resize-handle-right"
          :class="{ active: resizingPanel === 'right' }"
          role="separator"
          aria-label="Resize settings panel"
          title="Resize settings panel"
          @mousedown.prevent="startPanelResize('right', $event)"
          @dblclick.prevent="resetPanelWidth('right')"
        />
        <ElementSettings v-if="baseStore.canvas != null" />
      </div>
    </div>
    <EditorSettingsDialog :canvas-ref="canvasRef" />
    <ElementContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :availability="contextMenu.availability"
      @action="runContextAction"
    />
    <!-- 导出面板 -->
    <ExportPanel ref="exportPanelRef" :isDialogVisible="isDialogVisible"
      @update:isDialogVisible="isDialogVisible = $event" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import emitter from '@/utils/eventBus'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useCanvas } from '@/composables/useCanvas'
import { useExportStore } from '@/stores/exportStore'
import { useEditorStore } from '@/stores/editorStore'
import { useThemeStore } from '@/stores/theme'
import { useBaseStore } from '@/stores/baseStore'
import CanvasRulers from '@/components/canvas/CanvasRulers.vue'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import ChangelogDialog from '@/components/dialogs/ChangelogDialog.vue'
import CanvasView from '@/views/Canvas.vue'
import ElementSettings from '@/components/panels/ElementSettings.vue'
import SidePanel from '@/components/panels/SidePanel.vue'
import ExportPanel from '@/components/panels/ExportPanel.vue'
import HistoryControls from '@/components/canvas/HistoryControls.vue'
import TimeSimulatorPanel from '@/components/canvas/TimeSimulatorPanel.vue'
import ElementContextMenu from '@/components/canvas/ElementContextMenu.vue'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { useResizableEditorPanels } from '@/views/design/useResizableEditorPanels'
import { RULER_OFFSET, useCanvasPan } from '@/views/design/useCanvasPan'
import { useDesignLoader } from '@/views/design/useDesignLoader'
import {
  copySelectedElements,
  deleteSelectedElements,
  duplicateSelectedElements,
  flipSelectedElements,
  getCurrentElementActionAvailability,
  moveSelectedElements,
  pasteElements,
  roundSelectedElementPositions,
} from '@/engine/managers/elementContextActions'
import type { ElementActionAvailability } from '@/engine/managers/elementContextActionModel'
import {
  createLocalDesignDraftAutosave,
  removeLocalDesignDraft,
  resolveLocalDesignDraft,
  writeLocalDesignDraft,
} from '@/engine/services/localDesignDraft'

const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const { t } = useI18n()
const designStore = useDesignStore()
const elementDataStore = useElementDataStore()
const userStore = useUserStore()
const exportStore = useExportStore()
const { waitCanvasReady } = useCanvas()
const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null)
const centerAreaRef = ref<HTMLElement | null>(null)
const canvasStageRef = ref<HTMLElement | null>(null)
const canvasRulersRef = ref<InstanceType<typeof CanvasRulers> | null>(null)
const exportPanelRef = ref<InstanceType<typeof ExportPanel> | null>(null)
const isDialogVisible = ref<boolean>(false)
const editorStore = useEditorStore()
const themeStore = useThemeStore()
let saveTimer: number | null = null
let stopElementDataSubscription: (() => void) | null = null
let loadedDesignId = ''
const getDraftDeviceKey = (): string => String(
  userStore.userInfo?.device?.deviceId
  || userStore.userInfo?.device?.hardwarePartNumber
  || userStore.userInfo?.device?.partNumber
  || `${designStore.designSpec.width}x${designStore.designSpec.height}`,
)
const persistLocalDraft = (): void => {
  if (!loadedDesignId) return
  const config = baseStore.generateConfig({ validateBindings: false })
  if (!config) return
  writeLocalDesignDraft(window.localStorage, {
    designId: loadedDesignId,
    deviceKey: getDraftDeviceKey(),
    savedAt: Date.now(),
    config,
  })
}
const draftAutosave = createLocalDesignDraftAutosave(persistLocalDraft)
const saveDirtyDraft = (): void => {
  try {
    draftAutosave.saveIfDirty()
  } catch (error) {
    console.error('Failed to save local design draft:', error)
  }
}
const startDraftTracking = (designId: string): void => {
  loadedDesignId = designId
  stopElementDataSubscription?.()
  stopElementDataSubscription = elementDataStore.$subscribe(
    () => draftAutosave.markDirty(),
    { detached: true, flush: 'sync' },
  )
}
const resolveLoadedDraft = async (designId: string, serverConfig: any): Promise<any> => resolveLocalDesignDraft({
  storage: window.localStorage,
  designId,
  deviceKey: getDraftDeviceKey(),
  serverConfig,
  confirmRestore: async () => {
    try {
      await ElMessageBox.confirm(
        t('editor.localDraft.message'),
        t('editor.localDraft.title'),
        {
          confirmButtonText: t('editor.localDraft.restore'),
          cancelButtonText: t('editor.localDraft.useServer'),
          distinguishCancelAndClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false,
          type: 'warning',
        },
      )
      return true
    } catch {
      return false
    }
  },
})
const emptyAvailability: ElementActionAvailability = { canCopy: false, canPaste: false, canDelete: false, canBringForward: false, canSendBackward: false, canBringToFront: false, canSendToBack: false, canFlip: false, canRound: false }
const contextMenu = ref({ visible: false, x: 0, y: 0, availability: emptyAvailability })

const closeContextMenu = (): void => { contextMenu.value.visible = false }
const openElementContextMenu = (event: MouseEvent): void => {
  const canvas = baseStore.canvas
  const target = canvas?.findTarget?.(event as any) as any
  if (!canvas || !target || target.eleType === 'global' || target.eleType === 'background') {
    closeContextMenu()
    return
  }
  const selected = canvas.getActiveObjects?.() || []
  if (!selected.includes(target)) {
    canvas.discardActiveObject?.()
    canvas.setActiveObject?.(target)
    canvas.requestRenderAll?.()
  }
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, availability: getCurrentElementActionAvailability() }
}

const runContextAction = (action: string): void => {
  closeContextMenu()
  if (action === 'copy') copySelectedElements()
  else if (action === 'paste') pasteElements()
  else if (action === 'duplicate') duplicateSelectedElements()
  else if (action === 'delete') void deleteSelectedElements()
  else if (action === 'forward' || action === 'backward' || action === 'front' || action === 'back') moveSelectedElements(action)
  else if (action === 'flip-horizontal') flipSelectedElements('horizontal')
  else if (action === 'flip-vertical') flipSelectedElements('vertical')
  else if (action === 'round') roundSelectedElementPositions()
}

const closeContextMenuOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') closeContextMenu() }

const {
  leftPanelWidth,
  rightPanelWidth,
  resizingPanel,
  startPanelResize,
  resetPanelWidth,
  handleWorkspaceResize,
  persistNormalizedPanelWidths,
  dispose: disposeResizablePanels
} = useResizableEditorPanels()

const {
  isCanvasPanning,
  isCanvasPanReady,
  canvasStageStyle,
  constrainPanOffset,
  handleCanvasPanPointerDown,
  handleCanvasPanPointerMove,
  handleCanvasPanPointerEnd,
  handleCanvasPanPointerLeave,
  dispose: disposeCanvasPan
} = useCanvasPan({
  centerAreaRef,
  canvasStageRef,
  canvasRef,
  canvasRulersRef,
  upperCanvas: () => baseStore.canvas?.upperCanvasEl as HTMLCanvasElement | undefined,
  findCanvasTarget: (event) => baseStore.canvas?.findTarget?.(event),
  isRoundWatch: () => designStore.designSpec.width === designStore.designSpec.height,
  watchedLayout: () => [editorStore.zoomLevel, designStore.designSpec.width, designStore.designSpec.height, leftPanelWidth.value, rightPanelWidth.value]
})
const changelogDialog = ref<InstanceType<typeof ChangelogDialog> | null>(null)

// 启用键盘快捷键
useKeyboardShortcuts()

// 添加背景色计算属性
const backgroundColor = computed(() => (themeStore.currentTheme === 'dark' ? editorStore.darkCanvasBackgroundColor : editorStore.lightCanvasBackgroundColor))

const syncDesignSizeFromSelectedDevice = (): void => {
  const device = userStore.userInfo?.device
  const width = Number(device?.resolutionWidth ?? 0)
  const height = Number(device?.resolutionHeight ?? 0)
  if (!width || !height) return
  if (designStore.designSpec.width === width && designStore.designSpec.height === height) return
  designStore.setDesignSize(width, height)
  canvasRef.value?.updateZoom()
}

watch(
  () => [
    userStore.userInfo?.device?.deviceId,
    userStore.userInfo?.device?.hardwarePartNumber,
    userStore.userInfo?.device?.partNumber,
    userStore.userInfo?.device?.resolutionWidth,
    userStore.userInfo?.device?.resolutionHeight,
    designStore.appLanguage,
  ],
  () => {
    syncDesignSizeFromSelectedDevice()
  },
  { immediate: true }
)

const getRouteDesignId = (): string => {
  const raw = route.query.id || route.query.designId || route.query.from
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
}

const {
  loadDesign,
  importWrtDesign,
  dispose: disposeDesignLoader
} = useDesignLoader({
  canvasRef,
  waitCanvasReady,
  translate: t,
  redirectToDesigns: () => {
    void router.push('/designs')
  },
  resolveLoadedConfig: resolveLoadedDraft,
  onDesignLoaded: startDraftTracking,
})

// 设置自动保存
const setupAutoSave = () => {
  saveTimer = window.setInterval(saveDirtyDraft, 10_000)
}

const handleBeforeUnload = (): void => saveDirtyDraft()
const handleDesignSaved = (designId: unknown): void => {
  if (!loadedDesignId || String(designId) !== loadedDesignId) return
  draftAutosave.markClean()
  removeLocalDesignDraft(window.localStorage, loadedDesignId, getDraftDeviceKey())
}

// 替换元素加载逻辑

const handleAppPropertiesShortcut = (event: KeyboardEvent): void => {
  if ((event.ctrlKey || event.metaKey) && event.key === ',') {
    event.preventDefault()
    emitter.emit('open-app-properties')
  }
}

onMounted(() => {
  editorStore.updateSettings({
    showZoomControls: true,
    showHistoryControls: true
  })

  changelogDialog.value?.checkShowChangelog()
  emitter.on('import-wrt-design', importWrtDesign as any)

  // 检查URL参数中是否有设计ID
  const designId = getRouteDesignId()
  if (designId) {
    loadDesign(designId)
  } else {
    // 如果没有设计ID，跳转到设计列表页面
    router.push('/designs')
  }

  // 设置自动保存
  setupAutoSave()
  window.addEventListener('beforeunload', handleBeforeUnload)
  emitter.on('design-saved', handleDesignSaved as any)

  window.addEventListener('resize', handleWorkspaceResize)
  persistNormalizedPanelWidths()

  // 添加 App Properties 快捷键
  document.addEventListener('keydown', handleAppPropertiesShortcut)
  document.addEventListener('keydown', closeContextMenuOnEscape)
  document.addEventListener('pointerdown', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)

  exportStore.setExportPanelRef(exportPanelRef.value as any)
  baseStore.setInCanvasWorkarea(true)
  void nextTick(() => constrainPanOffset())
})

onBeforeUnmount(() => {
  disposeCanvasPan()
  disposeDesignLoader()
  disposeResizablePanels()
  saveDirtyDraft()
  stopElementDataSubscription?.()
  stopElementDataSubscription = null
  emitter.off('import-wrt-design', importWrtDesign as any)
  emitter.off('design-saved', handleDesignSaved as any)
  window.removeEventListener('beforeunload', handleBeforeUnload)

  // 清除自动保存定时器
  if (saveTimer) {
    // 使用 window.clearInterval 与上方保持一致的 DOM 重载
    window.clearInterval(saveTimer)
  }
  // 移除快捷键事件监听
  document.removeEventListener('keydown', handleAppPropertiesShortcut)
  document.removeEventListener('keydown', closeContextMenuOnEscape)
  document.removeEventListener('pointerdown', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
  baseStore.setInCanvasWorkarea(false)
})

// 向外部暴露方法
defineExpose({
  exportPanelRef
})
</script>

<style scoped>
.center-area {
  position: relative;
}
.canvas-stage {
  position: relative;
  z-index: var(--studio-z-base);
}
/* Ensure Fabric canvas layers are below rulers overlay */
.center-area .canvas-stage canvas {
  position: absolute;
  z-index: var(--studio-z-canvas-backdrop);
}
.center-area .canvas-stage .lower-canvas {
  background-color: transparent;
}
.center-area .canvas-stage .upper-canvas {
  z-index: var(--studio-z-canvas-surface);
  background-color: transparent;
}
</style>
<style scoped>
.left-panel {
  --studio-left-panel-width: 312px;
  width: var(--studio-left-panel-width);
  flex-shrink: 0;
  border-right: 1px solid var(--studio-border);
  background-color: var(--studio-surface);
  box-shadow: 1px 0 0 rgba(15, 23, 42, 0.02);
  position: relative;
  z-index: var(--studio-z-canvas-surface);
}

.design-container {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.design-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--studio-bg);
}

.editor-workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  width: 100%;
}

.left-panel {
  flex-shrink: 0;
  border-right: 1px solid var(--studio-border);
}

.center-area {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: v-bind(backgroundColor);
  padding: 28px;
  position: relative;
  min-width: 0;
  touch-action: none;
}

.center-area.is-canvas-pan-ready,
.center-area.is-canvas-pan-ready * {
  cursor: grab !important;
}

.center-area.is-canvas-panning,
.center-area.is-canvas-panning * {
  cursor: grabbing !important;
}

.right-panel {
  width: 460px;
  flex-shrink: 0;
  background: var(--studio-surface);
  border-left: 1px solid var(--studio-border);
  overflow-y: auto;
  padding: 18px;
  padding-bottom: 84px;
  box-shadow: -1px 0 0 rgba(15, 23, 42, 0.02);
  position: relative;
  z-index: var(--studio-z-canvas-surface);
}

.panel-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: var(--studio-z-workspace-control-active);
  touch-action: none;
}

.panel-resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: transparent;
  transition: background-color 0.16s ease;
}

.panel-resize-handle:hover::after,
.panel-resize-handle.active::after,
:global(.studio-panel-resizing) .panel-resize-handle::after {
  background: var(--studio-primary);
}

.panel-resize-handle-left {
  right: 0;
}

.panel-resize-handle-right {
  left: 0;
}

.canvas-stage {
  position: relative;
  background: transparent;
  margin: 40px 0 0 40px;
  will-change: transform;
  transform-origin: center;
}

.ruler-corner {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 40px;
  height: 40px;
  background: var(--studio-ruler-bg);
  border-right: 1px solid var(--studio-border);
  border-bottom: 1px solid var(--studio-border);
  z-index: var(--studio-z-canvas-surface);
}

.ruler-horizontal-wrapper {
  position: absolute;
  top: 0px;
  left: 40px;
  right: 0px;
  height: 40px;
  background: var(--studio-ruler-bg);
  border-bottom: 1px solid var(--studio-border);
  z-index: var(--studio-z-canvas-backdrop);
}

.ruler-vertical-wrapper {
  position: absolute;
  top: 40px;
  left: 0px;
  bottom: 0px;
  width: 40px;
  background: var(--studio-ruler-bg);
  border-right: 1px solid var(--studio-border);
  z-index: var(--studio-z-canvas-backdrop);
}

.history-controls-anchor {
  position: absolute;
  top: 56px;
  left: 56px;
  z-index: var(--studio-z-workspace-control);
}

@media (max-width: 1180px) {
  .left-panel {
    --studio-left-panel-width: 280px;
  }

  .right-panel {
    width: 390px;
  }
}

@media (max-width: 920px) {
  .left-panel {
    --studio-left-panel-width: 260px;
    width: var(--studio-left-panel-width);
  }

  .right-panel {
    width: 260px;
  }

  .center-area {
    padding: 18px;
  }
}
</style>
