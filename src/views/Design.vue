<template>
  <div class="design-layout">
    <div v-if="aiAdjustment.applying.value" class="ai-applying-overlay" role="status" aria-live="polite">Applying adjustment…</div>
    <div v-if="entryCreating || entryError" class="editor-entry-state" :role="entryError ? 'alert' : 'status'">
      <template v-if="entryError">
        <h2>Unable to open a new project</h2>
        <p>{{ entryError }}</p>
        <el-button @click="openEditorEntry">Try again</el-button>
        <RouterLink to="/designs">My Designs</RouterLink>
        <RouterLink to="/pricing">View plans</RouterLink>
      </template>
      <p v-else>Opening Studio…</p>
    </div>
    <AiWatchfaceDialog v-if="editorAiCapabilities.WATCHFACE" v-model="aiWatchfaceVisible" :project-id="baseStore.id || ''" :width="designStore.designSpec.width" :height="designStore.designSpec.height" :import-file="importAiWatchface" :canvas-version="() => draftRevision" />
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
        <TimeSimulatorPanel v-if="editorStore.showTimeSimulator" />
      </div>
      <!-- 右侧设置面板 -->
      <div class="right-panel" :class="{ 'show-ai-adjustment': aiAdjustmentVisible }" :style="{ width: `${rightPanelWidth}px` }">
        <div
          class="panel-resize-handle panel-resize-handle-right"
          :class="{ active: resizingPanel === 'right' }"
          role="separator"
          aria-label="Resize settings panel"
          title="Resize settings panel"
          @mousedown.prevent="startPanelResize('right', $event)"
          @dblclick.prevent="resetPanelWidth('right')"
        />
        <div v-if="editorAiCapabilities.WATCHFACE_ADJUST" class="editor-panel-tabs" role="tablist" aria-label="Editor panel">
          <button role="tab" :aria-selected="!aiAdjustmentVisible" @click="aiAdjustmentVisible = false">Properties</button>
          <button role="tab" :aria-selected="aiAdjustmentVisible" @click="aiAdjustmentVisible = true">✦ AI Adjust</button>
        </div>
        <AiAdjustmentPanel v-if="editorAiCapabilities.WATCHFACE_ADJUST && aiAdjustmentVisible && baseStore.id" :project-id="String(baseStore.id)" :selected-count="aiAdjustment.selectedIds.value.length" :capture="aiAdjustment.capture" :apply-result="aiAdjustment.applyResult" @close="aiAdjustmentVisible = false" />
        <ElementSettings v-else-if="baseStore.canvas != null" />
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
import TimeSimulatorPanel from '@/components/canvas/TimeSimulatorPanel.vue'
import ElementContextMenu from '@/components/canvas/ElementContextMenu.vue'
import { useDesignStore } from '@/stores/designStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { useResizableEditorPanels } from '@/views/design/useResizableEditorPanels'
import { RULER_OFFSET, useCanvasPan } from '@/views/design/useCanvasPan'
import { useDesignLoader } from '@/views/design/useDesignLoader'
import AiWatchfaceDialog from '@/views/design/AiWatchfaceDialog.vue'
import AiAdjustmentPanel from '@/views/design/AiAdjustmentPanel.vue'
import { useStudioAiCapabilities } from '@/views/design/useStudioAiCapabilities'
import { useAiAdjustmentEditor } from '@/views/design/useAiAdjustmentEditor'
import { useEditorEntry } from '@/views/design/useEditorEntry'
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
  buildLocalDesignDraftKey,
} from '@/engine/services/localDesignDraft'
import { readUnsavedDesigns, rememberUnsavedDesign, forgetUnsavedDesign, type UnsavedDesign } from '@/engine/services/unsavedDesigns'
import { isLocalProject } from '@/auth/guestProject'
import { writeLocalProject, readLocalProject } from '@/engine/services/guestProjectDraft'
import { registerBeforeStudioLogin } from '@/utils/studioLoginPreparation'
import { accessProjectDraft, captureProjectSnapshot, restoreProjectSnapshot } from '@/engine/services/localProjectSnapshot'
import { packageFonts, packageFontBuildFiles, packageBitmapChars, packageArchiveExtras } from '@/engine/services/packageAssetRegistry'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'

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
const { capabilities: editorAiCapabilities, refresh: refreshEditorAiCapabilities } = useStudioAiCapabilities()
const aiWatchfaceVisible = ref(false)
const aiAdjustmentVisible = ref(false)
const aiAdjustment = useAiAdjustmentEditor()
let newAiProjectId = ''
const draftOwner = () => userStore.userInfo?.id ?? 'guest'
const rememberDraft = (id: string, name = designStore.watchFaceName, savedAt = Date.now(), owner = draftOwner()) =>
  rememberUnsavedDesign(window.localStorage, owner, { designId: id, name: name || 'Untitled', savedAt })
let resumeDraftId = ''
const chooseUnsavedDesign = async (draft: UnsavedDesign): Promise<'resume' | 'new' | 'dismiss'> => {
  try {
    await ElMessageBox.confirm(t('editor.unsavedEntry.message', { name: draft.name }), t('editor.unsavedEntry.title'), {
      confirmButtonText: t('editor.unsavedEntry.resume'), cancelButtonText: t('editor.unsavedEntry.new'),
      distinguishCancelAndClose: true, closeOnClickModal: false, type: 'warning',
    })
    resumeDraftId = draft.designId === loadedDesignId ? '' : draft.designId
    return 'resume'
  } catch (action) { return action === 'cancel' ? 'new' : 'dismiss' }
}

let draftRevision = 0
const saveRevisions = new Map<string, number>()
const getDraftDeviceKey = (): string => String(
  userStore.editorDevice?.deviceId
  || userStore.editorDevice?.hardwarePartNumber
  || userStore.editorDevice?.partNumber
  || `${designStore.designSpec.width}x${designStore.designSpec.height}`,
)
let draftWriteQueue: Promise<unknown> = Promise.resolve()
let draftChangeTimer: ReturnType<typeof setTimeout> | undefined
const persistLocalDraft = (): void => {
  if (!loadedDesignId || baseStore.designLoading) return
  const config = baseStore.generateConfig({ validateBindings: false })
  if (!config) return
  if (isLocalProject(loadedDesignId)) {
    const id = loadedDesignId
    const owner = draftOwner()
    const name = designStore.watchFaceName
    draftWriteQueue = writeLocalProject(id, config)
      .then(() => rememberDraft(id, name, Date.now(), owner))
      .catch(error => { draftAutosave.markDirty(); console.error(error) })
    return
  }
  const id = loadedDesignId
  const owner = draftOwner()
  const name = designStore.watchFaceName
  const key = buildLocalDesignDraftKey(id, getDraftDeviceKey())
  const savedAt = Date.now()
  // Capture while object URLs are still valid; serialize writes to prevent stale completion.
  const serializedConfig = JSON.stringify(config)
  const fonts = Array.from(new Map([...useFontStore().serverFonts, ...packageFonts]).values())
    .filter((font) => serializedConfig.includes(JSON.stringify(font.slug)))
  const snapshot = captureProjectSnapshot({ config, bitmapChars: Array.from(packageBitmapChars) }, fonts)
  // Attach rejection immediately even if an earlier IndexedDB write is still pending.
  const captured = snapshot.then((value) => ({ value }), (error) => ({ error }))
  const fontBuildFiles = new Map(packageFontBuildFiles)
  const archiveExtras = structuredClone(packageArchiveExtras)
  draftWriteQueue = draftWriteQueue.catch(() => undefined).then(async () => {
    const result = await captured
    if ('error' in result) throw result.error
    await accessProjectDraft(key, 'write', { ...result.value, savedAt, fontBuildFiles, archiveExtras })
    rememberDraft(id, name, savedAt, owner)
  }).catch((error) => {
    draftAutosave.markDirty()
    console.error('Failed to save local project assets:', error)
  })
}
const draftAutosave = createLocalDesignDraftAutosave(persistLocalDraft)
const saveDirtyDraft = (): void => {
  if (aiAdjustment.applying.value) return
  try {
    draftAutosave.saveIfDirty()
  } catch (error) {
    console.error('Failed to save local design draft:', error)
  }
}
const startDraftTracking = (designId: string): void => {
  loadedDesignId = designId
  stopElementDataSubscription?.()
  const markChanged = () => {
    if (baseStore.designLoading) return
    draftRevision += 1
    draftAutosave.markDirty()
    clearTimeout(draftChangeTimer)
    draftChangeTimer = setTimeout(saveDirtyDraft, 500)
  }
  const stops = [elementDataStore, designStore, usePropertiesStore(), useVisualThemeStore(), useLayoutGroupStore()]
    .map((store) => store.$subscribe(markChanged, { detached: true, flush: 'sync' }))
  stopElementDataSubscription = () => stops.forEach((stop) => stop())
}
const confirmDraftRestore = async (): Promise<boolean> => {
  try {
    await ElMessageBox.confirm(t('editor.localDraft.message'), t('editor.localDraft.title'), {
      confirmButtonText: t('editor.localDraft.restore'), cancelButtonText: t('editor.localDraft.useServer'),
      distinguishCancelAndClose: true, closeOnClickModal: false, closeOnPressEscape: false, type: 'warning',
    })
    return true
  } catch { return false }
}
const resolveLoadedDraft = async (designId: string, serverConfig: any): Promise<any> => {
  // A login snapshot is explicit and restored without the server-draft choice.
  const loginId = sessionStorage.getItem('studio-login-draft')
  if (loginId === designId) {
    const loginDraft = await readLocalProject(designId)
    if (loginDraft) {
      return loginDraft
    }
  }
  const key = buildLocalDesignDraftKey(designId, getDraftDeviceKey())
  await draftWriteQueue
  const draft = await accessProjectDraft(key, 'read')
  if (draft) {
    rememberDraft(designId, draft.config?.config?.name || designStore.watchFaceName, draft.savedAt)
    const resume = resumeDraftId === designId
    resumeDraftId = ''
    if (resume || await confirmDraftRestore()) {
      const restored = restoreProjectSnapshot(draft)
      packageFonts.clear()
      restored.fonts.forEach((font) => useFontStore().registerServerFont(font))
      packageFontBuildFiles.clear()
      draft.fontBuildFiles?.forEach((files, slug) => packageFontBuildFiles.set(slug, files))
      packageArchiveExtras.productImages = draft.archiveExtras?.productImages || []
      packageArchiveExtras.files = draft.archiveExtras?.files || new Map()
      packageArchiveExtras.preview = draft.archiveExtras?.preview
      packageBitmapChars.clear()
      restored.config.bitmapChars.forEach(([id, chars]: any) => packageBitmapChars.set(id, chars))
      return restored.config.config
    }
    await accessProjectDraft(key, 'delete')
    forgetUnsavedDesign(window.localStorage, draftOwner(), designId)
    removeLocalDesignDraft(window.localStorage, designId, getDraftDeviceKey())
    return serverConfig
  }
  return resolveLocalDesignDraft({ storage: window.localStorage, designId,
    deviceKey: getDraftDeviceKey(), serverConfig, confirmRestore: confirmDraftRestore })
}

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
  const device = userStore.editorDevice
  const width = Number(device?.resolutionWidth ?? 0)
  const height = Number(device?.resolutionHeight ?? 0)
  if (!width || !height) return
  if (designStore.designSpec.width === width && designStore.designSpec.height === height) return
  designStore.setDesignSize(width, height)
  canvasRef.value?.updateZoom()
}

watch(
  () => [
    userStore.editorDevice?.deviceId,
    userStore.editorDevice?.hardwarePartNumber,
    userStore.editorDevice?.partNumber,
    userStore.editorDevice?.resolutionWidth,
    userStore.editorDevice?.resolutionHeight,
    designStore.appLanguage,
  ],
  () => {
    syncDesignSizeFromSelectedDevice()
  },
  { immediate: true }
)

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
  onDesignLoaded: (id) => {
    startDraftTracking(id)
    if (newAiProjectId === id) {
      newAiProjectId = ''
      void refreshEditorAiCapabilities().then(() => {
        if (loadedDesignId === id && editorAiCapabilities.value.WATCHFACE) aiWatchfaceVisible.value = true
      })
    }
  },
  onDesignImported: () => {
    draftRevision += 1
    draftAutosave.markDirty()
    saveDirtyDraft()
  },
})

const { creating: entryCreating, error: entryError, open: openEditorEntry } = useEditorEntry({
  route,
  replace: (to) => router.replace(to),
  load: loadDesign,
  currentId: () => loadedDesignId,
  findUnsaved: () => readUnsavedDesigns(window.localStorage, draftOwner())[0],
  chooseUnsaved: chooseUnsavedDesign,
  onCreated: (id, name) => { rememberDraft(id, name); newAiProjectId = id },
  flush: async () => {
    saveDirtyDraft()
    await draftWriteQueue
  },
})

const importAiWatchface = async (file: File, automatic: boolean, projectId: string, revision: number): Promise<boolean> => {
  if (baseStore.designLoading || loadedDesignId !== projectId || (automatic && draftRevision !== revision)) return false
  const hasContent = elementDataStore.elements.some((element: any) => !['global', 'background'].includes(element.eleType))
  if (hasContent) {
    if (automatic) return false
    try {
      await ElMessageBox.confirm('Import this AI design into the current canvas? Existing elements will be replaced.', 'Import AI Design', { type: 'warning', confirmButtonText: 'Import', cancelButtonText: 'Keep Canvas' })
    } catch { return false }
  }
  if (baseStore.designLoading || loadedDesignId !== projectId || (automatic && draftRevision !== revision)) return false
  saveDirtyDraft()
  await draftWriteQueue
  if (baseStore.designLoading || loadedDesignId !== projectId || (automatic && draftRevision !== revision)) return false
  return importWrtDesign(file)
}

// 设置自动保存
const setupAutoSave = () => {
  saveTimer = window.setInterval(saveDirtyDraft, 10_000)
}

const unregisterBeforeLogin = registerBeforeStudioLogin(async () => {
  if (!loadedDesignId || baseStore.designLoading) throw new Error('Wait for the design to finish loading before signing in.')
  await draftWriteQueue
  const config = baseStore.generateConfig({ validateBindings: false })
  if (!config) throw new Error('Unable to save your design. Please try again before signing in.')
  await writeLocalProject(loadedDesignId, config)
  sessionStorage.setItem('studio-login-draft', loadedDesignId)
})
const handleBeforeUnload = (): void => saveDirtyDraft()
const handleDesignSaveStarted = (input: any): void => {
  if (input?.designId !== loadedDesignId) return
  saveRevisions.set(input.saveToken, draftRevision)
}
const handleDesignSaved = (input: any): void => {
  const designId = typeof input === 'string' ? input : input?.designId
  if (!loadedDesignId || String(designId) !== loadedDesignId) return
  const savedRevision = saveRevisions.get(input?.saveToken)
  saveRevisions.delete(input?.saveToken)
  if (savedRevision === undefined || savedRevision !== draftRevision) {
    saveDirtyDraft()
    return
  }
  draftAutosave.markClean()
  clearTimeout(draftChangeTimer)
  const key = buildLocalDesignDraftKey(loadedDesignId, getDraftDeviceKey())
  const owner = draftOwner()
  const id = loadedDesignId
  draftWriteQueue = draftWriteQueue.then(async () => {
    await accessProjectDraft(key, 'delete')
    forgetUnsavedDesign(window.localStorage, owner, id)
  }).catch(console.error)
  removeLocalDesignDraft(window.localStorage, loadedDesignId, getDraftDeviceKey())
}

const handleLocalDesignPromoted = ({ designId }: { designId: string }) => {
  startDraftTracking(designId)
  draftAutosave.markDirty()
  saveDirtyDraft()
  void router.replace({ path: '/design', query: { id: designId } })
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

  void refreshEditorAiCapabilities()
  void openEditorEntry()

  // 设置自动保存
  setupAutoSave()
  window.addEventListener('beforeunload', handleBeforeUnload)
  emitter.on('design-save-started', handleDesignSaveStarted as any)
  emitter.on('design-saved', handleDesignSaved as any)
  emitter.on('local-design-promoted', handleLocalDesignPromoted as any)

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
  unregisterBeforeLogin()
  saveDirtyDraft()
  clearTimeout(draftChangeTimer)
  disposeCanvasPan()
  disposeDesignLoader()
  disposeResizablePanels()
  saveDirtyDraft()
  stopElementDataSubscription?.()
  stopElementDataSubscription = null
  emitter.off('import-wrt-design', importWrtDesign as any)
  emitter.off('design-save-started', handleDesignSaveStarted as any)
  emitter.off('design-saved', handleDesignSaved as any)
  emitter.off('local-design-promoted', handleLocalDesignPromoted as any)
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
.ai-applying-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: rgba(15,23,42,.35); color: white; cursor: wait; }
.editor-panel-tabs { display: flex; gap: 6px; margin-bottom: 16px; border-bottom: 1px solid var(--studio-border); padding-bottom: 10px; flex-shrink: 0; }
.editor-panel-tabs button { border: 0; border-radius: 6px; padding: 8px 14px; background: transparent; color: var(--studio-text); cursor: pointer; font-size: 13px; }
.editor-panel-tabs button[aria-selected="true"] { background: var(--studio-bg); color: var(--studio-primary); font-weight: 600; }
.right-panel.show-ai-adjustment { display: flex; flex-direction: column; overflow: hidden; padding-bottom: 18px; }
.editor-entry-state {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--studio-surface);
  color: var(--studio-text);
  text-align: center;
  padding: 24px;
}
.editor-entry-state h2, .editor-entry-state p { margin: 0; }
.editor-entry-state a { color: var(--studio-primary); }
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
  position: relative;
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
