<template>
  <div class="design-layout">
    <!-- 编辑器更新日志 -->
    <ChangelogDialog ref="changelogDialog" />
    <div class="editor-workspace">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <SidePanel />
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
      <div class="right-panel">
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import emitter from '@/utils/eventBus'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useCanvas } from '@/composables/useCanvas'
import { usePropertiesStore } from '@/stores/properties'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { useExportStore } from '@/stores/exportStore'
import { useEditorStore } from '@/stores/editorStore'
import { useThemeStore } from '@/stores/theme'
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import { decodeElementConfig, getElementHandler } from '@/engine/registry/elementRegistry'
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
import type { FabricObject } from 'fabric'
import { AnyElementConfig, BaseElementConfig } from '@/types/elements'
import { useDesignStore } from '@/stores/designStore'
import { useUserStore } from '@/stores/user'
import { getDataSimulatorEngine } from '@/engine/simulator/dataSimulatorEngine'
import {
  scaleElementConfig,
  STANDARD_DESIGN_SIZE,
  type DesignSize,
} from '@/utils/designScale'
 
const elementDataStore = useElementDataStore()
const propertiesStore = usePropertiesStore()
const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const designStore = useDesignStore()
const userStore = useUserStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const exportStore = useExportStore()
const historyStore = useHistoryStore()
const { waitCanvasReady } = useCanvas()
const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null)
const exportPanelRef = ref<InstanceType<typeof ExportPanel> | null>(null)
const isDialogVisible = ref<boolean>(false)
const editorStore = useEditorStore()
const themeStore = useThemeStore()
let saveTimer: number | null = null

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
  if (!legacyBg || typeof legacyBg !== 'object') return

  const bgUrl = legacyBg.url || ''
  const bgId = legacyBg.id ?? null
  if (!bgUrl) return

  const designSpec = designStore.designSpec as any
  const cx = Number(designSpec?.centerX ?? 0)
  const cy = Number(designSpec?.centerY ?? 0)

  const bgConfig = {
    id: crypto.randomUUID(),
    eleType: 'background',
    left: cx,
    top: cy,
    originX: 'center',
    originY: 'center',
    imageUrl: bgUrl,
    imageId: bgId,
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

const scaleElementsFromStoredSize = (elements: AnyElementConfig[]): AnyElementConfig[] => {
  const currentSize = getCurrentDesignSize()
  const storedSize = {
    width: STANDARD_DESIGN_SIZE,
    height: STANDARD_DESIGN_SIZE,
  }

  if (
    currentSize.width === storedSize.width &&
    currentSize.height === storedSize.height
  ) {
    return elements
  }

  return elements.map((element) =>
    scaleElementConfig(element, storedSize, currentSize),
  )
}

// 加载设计配置
const loadDesign = async (designUid: string) => {
  baseStore.setDesignLoading(true)
  try {
    const response: ApiResponse<Design> = await designApi.getDesignByUid(designUid)
    if (!response.data) {
      messageStore.error('Design not found')
      router.push('/designs')
      return
    }
    const designData = response.data

    const config: Partial<DesignConfig> = (designData.configJson as DesignConfig) ?? {}
    
    // 设置基础信息
    baseStore.id = designUid
    baseStore.watchFaceName = designData.name
    baseStore.appId = designData.product?.appId || -1
    
    // 加载字体
    await fontStore.fetchFonts()
    if (config.elements) {
      await fontStore.loadFontsForElements(config.elements)
    }
    
    // 如果配置为空，使用默认值
    if (!config || Object.keys(config).length === 0) {
      
      // 等待画布初始化完成
      await waitCanvasReady()
      // ✅ 先清空上一次设计的元素配置
      elementDataStore.clearAll()
      // 设置默认值
      baseStore.watchFaceName = designData.name
      propertiesStore.textCase = 0
      propertiesStore.labelLengthType = 1
      propertiesStore.showUnit = false
     
      // 初始化画布
      baseStore.canvas?.requestRenderAll()
      historyStore.saveInitial()

      return
    }
    
    // 加载属性
    if (config.properties) {
      propertiesStore.loadProperties(config.properties)
    }

    // 初始化 App Settings 默认值（避免旧值在不同设计之间串味）
    propertiesStore.textCase = 0
    propertiesStore.labelLengthType = 1
    propertiesStore.showUnit = false

    // 设置文本大小写
    if (config.textCase !== undefined) {
      propertiesStore.textCase = config.textCase
    }
    // Label Length 仅支持 Short，统一保持默认值 1，不再从配置覆盖
    // 设置是否显示数据项单位
    if (config.showUnit !== undefined) {
      propertiesStore.showUnit = config.showUnit
    }
    // 等待画布初始化完成
    await waitCanvasReady()
    // ✅ 先清空上一次设计的元素配置
    elementDataStore.clearAll() 

    // 兼容旧字段：backgroundImage -> background 元素
    ensureBackgroundElement(config)
 
    // 加载元素到画布
    if (config && config.elements) {
      // config.elements 是 API DesignElement[]，此处通过解码器转换为内部 AnyElementConfig
      await loadElements(scaleElementsFromStoredSize(config.elements as any))
    }
    
    // 更新画布缩放
    canvasRef.value?.updateZoom()

    // 等待100毫秒, fabric.js 加载元素为异步
    await new Promise(resolve => setTimeout(resolve, 100))

    // 重新排序画布
    if (config.orderIds) {
      reorderCanvasByIds(config.orderIds)
    }

    setTimeout(() => {
      getDataSimulatorEngine().updateCanvas()
    }, 0)
    historyStore.saveInitial()

  } catch (error) {
    console.error('加载设计失败:', error)
    messageStore.error('加载设计失败')
  } finally {
    baseStore.setDesignLoading(false)
  }
}

// 设置自动保存
const setupAutoSave = () => {
  if (appConfig.autoSave.enabled) {
    // 使用 window.setInterval 强制使用 DOM 重载，返回值为 number
    saveTimer = window.setInterval(() => {
      try {
        
        exportStore.saveConfig()
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }, appConfig.autoSave.interval)
  }
}

// 替换元素加载逻辑
const loadElements = async (elements: AnyElementConfig[]) => {
  const elementDataStore = useElementDataStore()
  for (const element of elements) {
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
      await handler.add(config as any)
    } catch (error) {
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
    }
  }
}

const reorderCanvasByIds = (orderedIds: string[]) => {
  const c = baseStore.canvas
  if (!c) return
  const objects = c.getObjects() as (FabricObject & { id?: string })[]

  const globalObj = objects.find((o) => String((o as any).eleType ?? '') === 'global')
  console.log('globalObj', globalObj)
  const backgroundObj = objects.find((o) => String((o as any).eleType ?? '') === 'background')

  const isFixed = (obj: any): boolean => {
    const t = String(obj?.eleType ?? '')
    return t === 'global' || t === 'background'
  }

  const fixedCount = objects.filter((o) => isFixed(o)).length

  // orderIds 只包含用户元素；移动时要加上 fixedCount，避免把 fixed layer 挤到上层
  orderedIds.forEach((id, index) => {
    const obj = objects.find((o: FabricObject & { id?: string }) => o.id === id)
    if (!obj) return
    if (isFixed(obj)) return
    c.moveObjectTo(obj, fixedCount + index)
  })

  // 再次强制 fixed layer 位于底部（moveObjectTo 会影响其他对象的 index）
  if (globalObj) {
    c.moveObjectTo(globalObj, 0)
  }
  if (backgroundObj) {
    c.moveObjectTo(backgroundObj, globalObj ? 1 : 0)
  }
};


onMounted(() => {
  editorStore.updateSettings({
    showZoomControls: true,
    showHistoryControls: true,
  })

  changelogDialog.value?.checkShowChangelog()

  // 检查URL参数中是否有设计ID
  const designId = route.query.id as string | undefined
  if (designId) {
    loadDesign(designId)
  } else {
    // 如果没有设计ID，跳转到设计列表页面
    router.push('/designs')
  }

  // 设置自动保存
  setupAutoSave()

  // 添加 App Properties 快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault()
      emitter.emit('open-app-properties')
    }
  })

  exportStore.setExportPanelRef(exportPanelRef.value as any)
  baseStore.setInCanvasWorkarea(true)
})

onBeforeUnmount(() => {
  // 清除自动保存定时器
  if (saveTimer) {
    // 使用 window.clearInterval 与上方保持一致的 DOM 重载
    window.clearInterval(saveTimer)
  }
  // 移除快捷键事件监听
  document.removeEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault()
      emitter.emit('open-app-properties')
    }
  })
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
  z-index: 0;
}
/* Ensure Fabric canvas layers are below rulers overlay */
.center-area .canvas-container canvas {
  position: absolute;
  z-index: 1;
}
.center-area .canvas-container .lower-canvas {
  background-color: transparent;
}
.center-area .canvas-container .upper-canvas {
  z-index: 2;
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
  z-index: 2;
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
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 24px 24px;
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
  z-index: 2;
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
  z-index: 2;
}

.ruler-horizontal-wrapper {
  position: absolute;
  top: 0px;
  left: 40px;
  right: 0px;
  height: 40px;
  background: var(--studio-ruler-bg);
  border-bottom: 1px solid var(--studio-border);
  z-index: 1;
}

.ruler-vertical-wrapper {
  position: absolute;
  top: 40px;
  left: 0px;
  bottom: 0px;
  width: 40px;
  background: var(--studio-ruler-bg);
  border-right: 1px solid var(--studio-border);
  z-index: 1;
}

.history-controls-anchor {
  position: absolute;
  top: 56px;
  left: 56px;
  z-index: 10;
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
