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
      <div class="center-area">
        <!-- 画布 -->
        <div class="canvas-container">
          <CanvasView ref="canvasRef" />
        </div>
        <CanvasRulers :watch-size="designStore.designSpec.width" :ruler-offset="40" />
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
    <!-- 导出面板 -->
    <ExportPanel ref="exportPanelRef" :isDialogVisible="isDialogVisible"
      @update:isDialogVisible="isDialogVisible = $event" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import emitter from '@/utils/eventBus'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useCanvas } from '@/composables/useCanvas'
import { usePropertiesStore } from '@/stores/properties'
import {
  DATA_NUMBER_FORMAT_AUTO,
  DEFAULT_MAX_FIELD_LENGTH,
  normalizeDataNumberFormatMode,
  normalizeMaxFieldLength,
} from '@/utils/dataNumberFormat'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { useExportStore } from '@/stores/exportStore'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorLayoutStore } from '@/stores/editorLayoutStore'
import { useThemeStore } from '@/stores/theme'
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { decodeElementConfig, getElementHandler } from '@/engine/registry/elementRegistry'
import { syncElementInstancesFromCanvas } from '@/engine/managers/elementManager'
import { applyOrder, syncLayersFromCanvas } from '@/engine/managers/layerManager'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import CanvasRulers from '@/components/canvas/CanvasRulers.vue'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import ChangelogDialog from '@/components/dialogs/ChangelogDialog.vue'
import appConfig from '@/config/appConfig.ts'
import CanvasView from '@/views/Canvas.vue'
import ElementSettings from '@/components/panels/ElementSettings.vue'
import SidePanel from '@/components/panels/SidePanel.vue'
import ExportPanel from '@/components/panels/ExportPanel.vue'
import HistoryControls from '@/components/canvas/HistoryControls.vue'
import TimeSimulatorPanel from '@/components/canvas/TimeSimulatorPanel.vue'
import { ApiResponse } from '@/types/api/api'
import type { Design, DesignConfig } from '@/types/api/design'
import { AnyElementConfig, BaseElementConfig } from '@/types/elements'
import type { RuntimeDesignConfig } from '@/types/app/config'
import { useDesignStore } from '@/stores/designStore'
import { useUserStore } from '@/stores/user'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import {
  scaleElementConfig,
  STANDARD_DESIGN_SIZE,
  type DesignSize,
} from '@/utils/designScale'
import { DEFAULT_BACKGROUND_IMAGE_URL } from '@/elements/decoration/background/background.constants'
import { useI18n } from '@/i18n'
import { getDisplayState, normalizeDisplayStates } from '@/utils/displayStates'
import {
  clearRestoredDesignAssetUrls,
  readWrtDesignPackage,
  restoreDesignAssetBundle,
  WrtDesignPackageError,
} from '@/engine/services/designAssetBundleService'
 
const elementDataStore = useElementDataStore()
const propertiesStore = usePropertiesStore()
const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const { t } = useI18n()
const designStore = useDesignStore()
const userStore = useUserStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const exportStore = useExportStore()
const historyStore = useHistoryStore()
const editorLayoutStore = useEditorLayoutStore()
const { waitCanvasReady } = useCanvas()
const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null)
const exportPanelRef = ref<InstanceType<typeof ExportPanel> | null>(null)
const isDialogVisible = ref<boolean>(false)
const editorStore = useEditorStore()
const themeStore = useThemeStore()
const layerStore = useLayerStore()
const viewportWidth = ref(typeof window === 'undefined' ? 1440 : window.innerWidth)
const resizingPanel = ref<'left' | 'right' | null>(null)
let saveTimer: number | null = null
let panelResizeState: { side: 'left' | 'right'; startX: number; startWidth: number } | null = null
let designLoadGeneration = 0
let designLoadQueue: Promise<void> = Promise.resolve()

const LAYER_ORDER_WAIT_TIMEOUT_MS = 800

const PANEL_CENTER_MIN_WIDTH = 320
const PANEL_WIDTH_LIMITS = {
  left: { min: 220, max: 560 },
  right: { min: 280, max: 720 },
} as const

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const normalizeLayerOrderIds = (orderIds: unknown): string[] => {
  if (!Array.isArray(orderIds)) return []
  const seen = new Set<string>()
  const ids: string[] = []
  orderIds.forEach((id) => {
    const normalized = String(id ?? '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    ids.push(normalized)
  })
  return ids
}

const getCanvasObjectIds = (): Set<string> => {
  const objects = baseStore.canvas?.getObjects?.() || []
  return new Set(
    objects
      .map((obj: any) => obj?.id)
      .filter((id: unknown) => id !== undefined && id !== null && String(id).trim() !== '')
      .map((id: unknown) => String(id)),
  )
}

const hasAllOrderableCanvasObjects = (orderIds: string[]): boolean => {
  if (!orderIds.length) return true
  const objectIds = getCanvasObjectIds()
  return orderIds.every((id) => objectIds.has(id))
}

const waitForOrderableCanvasObjects = async (orderIds: string[]): Promise<void> => {
  const canvas = baseStore.canvas
  if (!canvas || hasAllOrderableCanvasObjects(orderIds)) return

  await new Promise<void>((resolve) => {
    let settled = false
    let timeoutId: number | null = null
    let frameId: number | null = null

    const cleanup = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId)
      if (frameId != null) window.cancelAnimationFrame(frameId)
      canvas.off?.('object:added', check)
    }

    const finish = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const check = () => {
      if (hasAllOrderableCanvasObjects(orderIds)) {
        finish()
        return
      }
      frameId = window.requestAnimationFrame(check)
    }

    canvas.on?.('object:added', check)
    timeoutId = window.setTimeout(finish, LAYER_ORDER_WAIT_TIMEOUT_MS)
    frameId = window.requestAnimationFrame(check)
  })
}

const isCurrentDesignLoad = (generation: number): boolean => generation === designLoadGeneration

const enqueueDesignLoad = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = designLoadQueue.then(operation, operation)
  designLoadQueue = result.then(() => undefined, () => undefined)
  return result
}

const restoreLayerOrder = async (orderIds: unknown, generation: number): Promise<boolean> => {
  const normalizedOrderIds = normalizeLayerOrderIds(orderIds)
  if (!normalizedOrderIds.length) {
    if (!isCurrentDesignLoad(generation)) return false
    syncLayersFromCanvas()
    return true
  }

  await waitForOrderableCanvasObjects(normalizedOrderIds)
  if (!isCurrentDesignLoad(generation)) return false
  applyOrder(normalizedOrderIds)
  await nextTick()
  if (!isCurrentDesignLoad(generation)) return false
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  if (!isCurrentDesignLoad(generation)) return false
  applyOrder(normalizedOrderIds)
  return true
}

const getPanelWidthLimit = (side: 'left' | 'right') => {
  const limits = PANEL_WIDTH_LIMITS[side]
  const oppositeKey = side === 'left' ? 'rightSettingsPanel' : 'leftLayerPanel'
  const oppositeLimits = side === 'left' ? PANEL_WIDTH_LIMITS.right : PANEL_WIDTH_LIMITS.left
  const oppositeWidth = clamp(
    editorLayoutStore.getWidth(oppositeKey),
    oppositeLimits.min,
    oppositeLimits.max,
  )
  const viewportMax = viewportWidth.value - oppositeWidth - PANEL_CENTER_MIN_WIDTH
  return {
    min: limits.min,
    max: Math.max(limits.min, Math.min(limits.max, viewportMax)),
  }
}

const normalizePanelWidth = (side: 'left' | 'right', width: number): number => {
  const limit = getPanelWidthLimit(side)
  return clamp(Math.round(width), limit.min, limit.max)
}

const leftPanelWidth = computed(() => normalizePanelWidth('left', editorLayoutStore.getWidth('leftLayerPanel')))
const rightPanelWidth = computed(() => normalizePanelWidth('right', editorLayoutStore.getWidth('rightSettingsPanel')))

const persistNormalizedPanelWidths = (): void => {
  editorLayoutStore.setWidth('leftLayerPanel', leftPanelWidth.value)
  editorLayoutStore.setWidth('rightSettingsPanel', rightPanelWidth.value)
}

const onPanelResizeMove = (event: MouseEvent): void => {
  if (!panelResizeState) return
  const { side, startX, startWidth } = panelResizeState
  const delta = side === 'left' ? event.clientX - startX : startX - event.clientX
  const nextWidth = normalizePanelWidth(side, startWidth + delta)
  editorLayoutStore.setWidth(side === 'left' ? 'leftLayerPanel' : 'rightSettingsPanel', nextWidth)
}

const stopPanelResize = (): void => {
  if (!panelResizeState) return
  panelResizeState = null
  resizingPanel.value = null
  document.body.classList.remove('studio-panel-resizing')
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onPanelResizeMove)
  window.removeEventListener('mouseup', stopPanelResize)
}

const startPanelResize = (side: 'left' | 'right', event: MouseEvent): void => {
  stopPanelResize()
  panelResizeState = {
    side,
    startX: event.clientX,
    startWidth: side === 'left' ? leftPanelWidth.value : rightPanelWidth.value,
  }
  resizingPanel.value = side
  document.body.classList.add('studio-panel-resizing')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onPanelResizeMove)
  window.addEventListener('mouseup', stopPanelResize)
}

const resetPanelWidth = (side: 'left' | 'right'): void => {
  editorLayoutStore.resetWidth(side === 'left' ? 'leftLayerPanel' : 'rightSettingsPanel')
  persistNormalizedPanelWidths()
}

const handleWorkspaceResize = (): void => {
  viewportWidth.value = window.innerWidth
  persistNormalizedPanelWidths()
}

const changelogDialog = ref<InstanceType<typeof ChangelogDialog> | null>(null)

// 启用键盘快捷键
useKeyboardShortcuts()

// 添加背景色计算属性
const backgroundColor = computed(() =>
  themeStore.currentTheme === 'dark'
    ? editorStore.darkCanvasBackgroundColor
    : editorStore.lightCanvasBackgroundColor,
)

const ensureBackgroundElement = (config: Partial<DesignConfig> | null): void => {
  if (!config) return
  const anyConfig: any = config || {}
  const list = (anyConfig.elements || []) as any[]
  const hasBg = list.some((e) => String(e?.eleType ?? e?.type ?? '') === 'background')
  if (hasBg) return

  const legacyBg = anyConfig.backgroundImage
  const hasLegacyBg = legacyBg && typeof legacyBg === 'object' && legacyBg.url
  const bgUrl = hasLegacyBg ? legacyBg.url : DEFAULT_BACKGROUND_IMAGE_URL
  const bgId = hasLegacyBg ? (legacyBg.id ?? null) : null

  const designSpec = designStore.designSpec as any
  const width = Number(designSpec?.width ?? STANDARD_DESIGN_SIZE)
  const height = Number(designSpec?.height ?? width)
  const cx = Number(designSpec?.centerX ?? width / 2)
  const cy = Number(designSpec?.centerY ?? height / 2)

  const bgConfig = {
    id: crypto.randomUUID(),
    eleType: 'background',
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    imageUrl: bgUrl,
    imageId: bgId,
    width,
    height,
  }

  anyConfig.elements = [bgConfig, ...list]
}

const syncDesignSizeFromSelectedDevice = (): void => {
  const device = userStore.userInfo?.device
  const width = Number(device?.resolutionWidth ?? 0)
  const height = Number(device?.resolutionHeight ?? 0)
  if (!width || !height) return
  if (designStore.designSpec.width === width && designStore.designSpec.height === height) return
  designStore.setDesignSize(width, height)
  canvasRef.value?.updateZoom()
}

const getCurrentDeviceParams = () => {
  const deviceId = userStore.userInfo?.device?.deviceId
  return deviceId ? { device: deviceId } : undefined
}

watch(
  () => [
    userStore.userInfo?.device?.deviceId,
    userStore.userInfo?.device?.resolutionWidth,
    userStore.userInfo?.device?.resolutionHeight,
  ],
  () => syncDesignSizeFromSelectedDevice(),
  { immediate: true },
)

const getCurrentDesignSize = (): DesignSize => ({
  width: Number(designStore.designSpec.width || STANDARD_DESIGN_SIZE),
  height: Number(designStore.designSpec.height || STANDARD_DESIGN_SIZE),
})

const getRouteDesignId = (): string => {
  const raw = route.query.id || route.query.designId || route.query.from
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
}

const isNear = (a: unknown, b: number, tolerance = 2): boolean => {
  const n = Number(a)
  return Number.isFinite(n) && Math.abs(n - b) <= tolerance
}

const isElementAlreadyAtCurrentSize = (element: AnyElementConfig, currentSize: DesignSize): boolean => {
  const anyElement = element as any
  const eleType = String(anyElement?.eleType ?? anyElement?.type ?? '')
  if (eleType !== 'background') return false

  const matchesCurrentSize =
    isNear(anyElement.width, currentSize.width) &&
    isNear(anyElement.height, currentSize.height)
  const matchesCurrentCenter =
    isNear(anyElement.left, currentSize.width / 2) &&
    isNear(anyElement.top, currentSize.height / 2)

  return matchesCurrentSize || matchesCurrentCenter
}

const scaleElementsFromStoredSize = (elements: AnyElementConfig[]): AnyElementConfig[] => {
  const currentSize = getCurrentDesignSize()
  const standardSize = {
    width: STANDARD_DESIGN_SIZE,
    height: STANDARD_DESIGN_SIZE,
  }

  if (
    currentSize.width === standardSize.width &&
    currentSize.height === standardSize.height
  ) {
    return elements
  }

  return elements.map((element) => {
    if (isElementAlreadyAtCurrentSize(element, currentSize)) {
      return element
    }
    return scaleElementConfig(element, standardSize, currentSize)
  })
}

const applyLoadedElementDisplayStates = (elements: AnyElementConfig[]): void => {
  const canvas = baseStore.canvas
  if (!canvas) return

  const displayStatesById = new Map<string, ReturnType<typeof normalizeDisplayStates>>()
  elements.forEach((element) => {
    const id = (element as any)?.id
    if (id == null) return
    displayStatesById.set(String(id), normalizeDisplayStates((element as any).displayStates))
  })

  const objects = canvas.getObjects?.() || []
  objects.forEach((obj: any) => {
    const id = obj?.id
    if (id == null) return

    const savedDisplayStates =
      displayStatesById.get(String(id)) ??
      normalizeDisplayStates((elementDataStore.getElementConfig(String(id)) as any)?.displayStates ?? obj.displayStates)
    const visible = getDisplayState(savedDisplayStates, layerStore.previewMode)

    obj.displayStates = savedDisplayStates
    if (typeof obj.set === 'function') {
      obj.set({ displayStates: savedDisplayStates, visible })
    } else {
      obj.visible = visible
    }
    elementDataStore.patchElement(String(id), { displayStates: savedDisplayStates } as any)
  })

  syncLayersFromCanvas()
  layerStore.applyPreviewVisibility()
  canvas.requestRenderAll?.()
}

const applyRuntimeDesignConfig = async (config: RuntimeDesignConfig, generation: number): Promise<boolean> => {
  await fontStore.fetchFonts()
  if (!isCurrentDesignLoad(generation)) return false
  if (Array.isArray(config.elements)) {
    await fontStore.loadFontsForElements(config.elements as any)
    if (!isCurrentDesignLoad(generation)) return false
  } else {
    designStore.setSupportsChineseContent(false)
    designStore.setSupportedLocales(['en-US'])
    propertiesStore.textCase = 0
    propertiesStore.bitmapMode = true
    propertiesStore.dataNumberFormat = DATA_NUMBER_FORMAT_AUTO
    propertiesStore.maxFieldLength = DEFAULT_MAX_FIELD_LENGTH
    await waitCanvasReady()
    if (!isCurrentDesignLoad(generation)) return false
    elementDataStore.clearAll()
    baseStore.canvas?.requestRenderAll()
    historyStore.saveInitial()
    return true
  }

  designStore.setSupportsChineseContent(Boolean(config.supportsChineseContent))
  if (config.localization) {
      const localization = config.localization as any
      if (Array.isArray(localization.supportedLocales)) {
        designStore.setSupportedLocales(localization.supportedLocales)
      } else {
        designStore.setSupportedLocales(['en-US'])
      }
      if (localization.defaultLocale) {
        designStore.setDefaultLocale(localization.defaultLocale)
      }
      if (localization.fontRoles && typeof localization.fontRoles === 'object') {
        designStore.fontRoles = localization.fontRoles
      }
  } else {
    designStore.setSupportedLocales(['en-US'])
  }

  if (config.properties) {
    propertiesStore.loadProperties(config.properties)
  }

  propertiesStore.textCase = 0
  propertiesStore.bitmapMode = true
  propertiesStore.dataNumberFormat = DATA_NUMBER_FORMAT_AUTO
  propertiesStore.maxFieldLength = DEFAULT_MAX_FIELD_LENGTH

  if ([0, 1, 2, 3].includes(Number(config.textCase))) {
    propertiesStore.textCase = Number(config.textCase) === 3 ? 0 : Number(config.textCase)
  }
  if (typeof config.bitmapMode === 'boolean') {
    propertiesStore.bitmapMode = config.bitmapMode
  }
  propertiesStore.dataNumberFormat = normalizeDataNumberFormatMode(config.dataNumberFormat)
  propertiesStore.maxFieldLength = normalizeMaxFieldLength(config.maxFieldLength)

  await waitCanvasReady()
  if (!isCurrentDesignLoad(generation)) return false
  elementDataStore.clearAll()
  ensureBackgroundElement(config as any)

  const scaledElements = scaleElementsFromStoredSize(config.elements as any)
  if (!await loadElements(scaledElements, generation) || !isCurrentDesignLoad(generation)) return false
  applyLoadedElementDisplayStates(scaledElements)
  canvasRef.value?.updateZoom()

  if (!await restoreLayerOrder(config.orderIds, generation) || !isCurrentDesignLoad(generation)) return false
  applyLoadedElementDisplayStates(scaledElements)

  await new Promise<void>((resolve, reject) => window.setTimeout(() => {
    void (async () => {
      try {
        if (!isCurrentDesignLoad(generation)) {
          resolve()
          return
        }
        getDataSimulatorEngine().updateCanvas()
        await restoreLayerOrder(config.orderIds, generation)
        resolve()
      } catch (error) {
        reject(error)
      }
    })()
  }, 0))
  if (!isCurrentDesignLoad(generation)) return false
  historyStore.saveInitial()
  return true
}

const clearEditableDesignCanvas = async (generation: number): Promise<boolean> => {
  const canvas = baseStore.canvas
  if (!canvas || !isCurrentDesignLoad(generation)) return false

  canvas.discardActiveObject?.()
  const objects = canvas.getObjects?.() || []
  objects
    .filter((object: any) => !['global', 'background'].includes(String(object?.eleType ?? '')))
    .forEach((object: any) => canvas.remove?.(object))
  elementDataStore.clearAll()
  syncElementInstancesFromCanvas(canvas.getObjects() as any)
  syncLayersFromCanvas()
  canvas.requestRenderAll?.()
  await nextTick()
  return isCurrentDesignLoad(generation)
}

const importWrtDesign = async (file: File): Promise<void> => {
  const generation = ++designLoadGeneration
  let packageRead = false
  try {
    await enqueueDesignLoad(async () => {
      if (!isCurrentDesignLoad(generation)) return
      const imported = await readWrtDesignPackage(file)
      packageRead = true
      const clearImportedUrlsIfStale = (): boolean => {
        if (isCurrentDesignLoad(generation)) return false
        clearRestoredDesignAssetUrls()
        return true
      }
      if (clearImportedUrlsIfStale()) return
      baseStore.setDesignLoading(true)
      // readWrtDesignPackage clears the previous package only after validation, then owns these new URLs.
      // They are released on unmount or by the next successful package read.
      if (!await clearEditableDesignCanvas(generation) || clearImportedUrlsIfStale()) return

      baseStore.id = ''
      designStore.id = ''
      baseStore.appId = -1
      const copyName = `${imported.sourceName} Copy`
      baseStore.setWatchFaceName(copyName)
      designStore.setWatchFaceName(copyName)
      await router.replace({ path: route.path, query: {} })
      if (clearImportedUrlsIfStale()) return
      if (!await applyRuntimeDesignConfig({ ...imported.config, designId: '', name: copyName }, generation)) {
        if (clearImportedUrlsIfStale()) return
        return
      }
      if (clearImportedUrlsIfStale()) return
      messageStore.success(t('editor.wrtImported'))
    })
  } catch (error) {
    if (!isCurrentDesignLoad(generation)) {
      if (packageRead) clearRestoredDesignAssetUrls()
      return
    }
    if (error instanceof WrtDesignPackageError) {
      messageStore.error(t(`editor.wrtImport.${error.code}`))
    } else {
      console.error('导入 .wrt 设计失败:', error)
      messageStore.error(t('editor.wrtImport.failed'))
    }
  } finally {
    if (isCurrentDesignLoad(generation)) {
      baseStore.setDesignLoading(false)
    }
  }
}

// 加载设计配置
const loadDesign = async (designUid: string) => {
  const generation = ++designLoadGeneration
  baseStore.setDesignLoading(true)
  try {
    await enqueueDesignLoad(async () => {
      if (!isCurrentDesignLoad(generation)) return
      const response: ApiResponse<Design> = await designApi.getDesignByUid(designUid, getCurrentDeviceParams())
      if (!isCurrentDesignLoad(generation)) return
      if (!response.data) {
        messageStore.error(t('design.notFound'))
        router.push('/designs')
        return
      }
      const designData = response.data
      const config: Partial<DesignConfig> = (designData.configJson as DesignConfig) ?? {}
      const restoredConfig = await restoreDesignAssetBundle(config as unknown as RuntimeDesignConfig, {
        assetBundleUrl: designData.assetBundleUrl,
      })
      if (!isCurrentDesignLoad(generation)) return

      baseStore.id = designUid
      designStore.id = designUid
      baseStore.setWatchFaceName(designData.name)
      designStore.setWatchFaceName(designData.name)
      baseStore.appId = designData.product?.appId || -1
      await applyRuntimeDesignConfig(restoredConfig, generation)
    })
  } catch (error) {
    if (!isCurrentDesignLoad(generation)) return
    console.error('加载设计失败:', error)
    messageStore.error('加载设计失败')
  } finally {
    if (isCurrentDesignLoad(generation)) {
      baseStore.setDesignLoading(false)
    }
  }
}

// 设置自动保存
const setupAutoSave = () => {
  if (appConfig.autoSave.enabled) {
    // 使用 window.setInterval 强制使用 DOM 重载，返回值为 number
    saveTimer = window.setInterval(() => {
      try {
        
        exportStore.saveConfig({ validateBindings: false })
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }, appConfig.autoSave.interval)
  }
}

// 替换元素加载逻辑
const loadElements = async (elements: AnyElementConfig[], generation: number): Promise<boolean> => {
  const elementDataStore = useElementDataStore()
  for (const element of elements) {
    if (!isCurrentDesignLoad(generation)) return false
    const decodedElement = decodeElementConfig(element)
    if (!decodedElement) {
      console.warn(`Unknown element type: ${element.eleType}`)
      messageStore.warning(`未知的元素类型:${element.eleType}`)
      continue
    }

    try {
      // 确保 id 存在，满足 BaseElementConfig 的类型要求
      const config = {
        ...decodedElement,
        id: decodedElement.id ?? element.id ?? crypto.randomUUID(),
      } as BaseElementConfig

      // 将业务配置写入 ElementDataStore，作为权威数据源之一
      elementDataStore.upsertElement(config as any)

      // 新版 Registry：通过 ElementHandler.add(config) 创建元素，由调用方保证 eleType 一致
      const handler = getElementHandler(element.eleType as string)
      const addedElement = await handler.add(config as any)
      if (!isCurrentDesignLoad(generation)) {
        const canvas = baseStore.canvas
        if (addedElement && canvas?.getObjects?.().includes(addedElement as any)) {
          canvas.remove?.(addedElement as any)
        }
        return false
      }
    } catch (error) {
      if (!isCurrentDesignLoad(generation)) return false
      console.error('加载元素失败:', element, error)
      const name = (element as any)?.name || element.eleType || '未知元素'
      await ElMessageBox.alert(
        `元素「${name}」加载失败: ` + ((error as any)?.message || ''),
        '加载元素失败',
        {
          confirmButtonText: '确定',
          type: 'error',
        },
      )
      if (!isCurrentDesignLoad(generation)) return false
    }
  }
  return true
}

const handleAppPropertiesShortcut = (event: KeyboardEvent): void => {
  if ((event.ctrlKey || event.metaKey) && event.key === ',') {
    event.preventDefault()
    emitter.emit('open-app-properties')
  }
}

onMounted(() => {
  editorStore.updateSettings({
    showZoomControls: true,
    showHistoryControls: true,
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

  window.addEventListener('resize', handleWorkspaceResize)
  persistNormalizedPanelWidths()

  // 添加 App Properties 快捷键
  document.addEventListener('keydown', handleAppPropertiesShortcut)

  exportStore.setExportPanelRef(exportPanelRef.value as any)
  baseStore.setInCanvasWorkarea(true)
})

onBeforeUnmount(() => {
  designLoadGeneration += 1
  stopPanelResize()
  window.removeEventListener('resize', handleWorkspaceResize)
  emitter.off('import-wrt-design', importWrtDesign as any)
  clearRestoredDesignAssetUrls()

  // 清除自动保存定时器
  if (saveTimer) {
    // 使用 window.clearInterval 与上方保持一致的 DOM 重载
    window.clearInterval(saveTimer)
  }
  // 移除快捷键事件监听
  document.removeEventListener('keydown', handleAppPropertiesShortcut)
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
.canvas-container {
  position: relative;
  z-index: var(--studio-z-base);
}
/* Ensure Fabric canvas layers are below rulers overlay */
.center-area .canvas-container canvas {
  position: absolute;
  z-index: var(--studio-z-canvas-backdrop);
}
.center-area .canvas-container .lower-canvas {
  background-color: transparent;
}
.center-area .canvas-container .upper-canvas {
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

.canvas-container {
  position: relative;
  background: transparent;
  margin: 40px 0 0 40px;
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
