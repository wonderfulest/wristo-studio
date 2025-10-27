<template>
  <div class="design-layout">
    <!-- 编辑器更新日志 -->
    <ChangelogDialog ref="changelogDialog" />
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
      <CanvasRulers :watch-size="baseStore.WATCH_SIZE" :ruler-offset="40" />
      <!-- 编辑器设置按钮 -->
      <div class="editor-settings-btn" @click="openEditorSettings">
        <el-icon>
          <Setting />
        </el-icon>
      </div>
      
      <!-- 时间模拟器 -->
      <TimeSimulator v-if="baseStore.canvas != null && editorStore.showTimeSimulator" />
      <!-- 缩放控件 -->
      <div class="editor-controls">
        <ZoomControls :canvas-ref="canvasRef" />
      </div>
    </div>
    <!-- 右侧设置面板 -->
    <div class="right-panel">
      <ElementSettings v-if="baseStore.canvas != null" />
    </div>
    <!-- 导出面板 -->
    <ExportPanel ref="exportPanelRef" :isDialogVisible="isDialogVisible"
      @update:isDialogVisible="isDialogVisible = $event" />

    <!-- 添加设置对话框 -->
    <EditorSettingsDialog ref="editorSettingsDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Setting } from '@element-plus/icons-vue'
import emitter from '@/utils/eventBus'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useCanvas } from '../composables/useCanvas'
import { usePropertiesStore } from '@/stores/properties'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { useExportStore } from '@/stores/exportStore'
import { useEditorStore } from '@/stores/editorStore'
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import { decodeElement } from '@/utils/elementCodec'
import { getAddElement } from '@/utils/elementCodec/registry'
import CanvasRulers from '@/components/CanvasRulers.vue'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import ChangelogDialog from '@/components/dialogs/ChangelogDialog.vue'
import appConfig from '@/config/appConfig.ts'
import CanvasView from '@/views/Canvas.vue'
import ElementSettings from '@/components/ElementSettings.vue'
import SidePanel from '@/components/SidePanel.vue'
import ExportPanel from '@/components/ExportPanel.vue'
import TimeSimulator from '@/components/TimeSimulator.vue'
import ZoomControls from '@/components/ZoomControls.vue'
import type { ElementConfig, ElementType } from '@/types/element'
import { ApiResponse } from '@/types/api/api'
import type { Design, DesignConfig } from '@/types/api/design'
import type { FabricObject } from 'fabric'

const propertiesStore = usePropertiesStore()
const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const exportStore = useExportStore()
const { waitCanvasReady } = useCanvas()
const canvasRef = ref<InstanceType<typeof CanvasView> | null>(null)
const exportPanelRef = ref<InstanceType<typeof ExportPanel> | null>(null)
const isDialogVisible = ref<boolean>(false)
const editorStore = useEditorStore()
let saveTimer: number | null = null

const changelogDialog = ref<InstanceType<typeof ChangelogDialog> | null>(null)
const editorSettingsDialog = ref<InstanceType<typeof EditorSettingsDialog> | null>(null)

// 启用键盘快捷键
useKeyboardShortcuts()

// 添加背景色计算属性
const backgroundColor = computed(() => editorStore.backgroundColor)

// 加载设计配置
const loadDesign = async (designUid: string) => {
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
    
    // 加载字体
    await fontStore.fetchFonts()
    if (config.elements) await fontStore.loadFontsForElements(config.elements)
    
    // 如果配置为空，使用默认值
    if (!config || Object.keys(config).length === 0) {
      
      // 等待画布初始化完成
      await waitCanvasReady()
      // 设置默认值
      baseStore.watchFaceName = designData.name
      baseStore.themeBackgroundImages = []
      baseStore.currentThemeIndex = 0
      baseStore.textCase = 0
      baseStore.labelLengthType = 0
      baseStore.showUnit = false
      
      // 初始化画布
      baseStore.canvas?.requestRenderAll()

      return
    }
    
    // 加载属性
    if (config.properties) {
      propertiesStore.loadProperties(config.properties)
    }

    // 加载主题背景图片
    baseStore.themeBackgroundImages = config.themeBackgroundImages || []

    // 设置文本大小写
    if (config.textCase !== undefined) {
      baseStore.textCase = config.textCase
      // 如果有设置文本大小写，则触发更新
      setTimeout(() => {
        baseStore.setTextCase(baseStore.textCase)
      }, 500) // 等待画布加载完成
    }

    // 设置标签长度类型
    if (config.labelLengthType !== undefined) {
      baseStore.labelLengthType = config.labelLengthType
      // 如果有设置标签长度类型，则触发更新
      setTimeout(() => {
        baseStore.setLabelLengthType(baseStore.labelLengthType)
      }, 600) // 在文本大小写设置后执行
    }
    // 设置是否显示数据项单位
    if (config.showUnit !== undefined) {
      baseStore.showUnit = config.showUnit
    }
    // 默认选中第一个颜色
    baseStore.currentThemeIndex = 0

    // 等待画布初始化完成
    await waitCanvasReady()

    // 切换主题背景
    baseStore.toggleThemeBackground()   
    
    // 加载元素到画布
    if (config && config.elements) {
      await loadElements(config.elements)
    }
    
    // 更新画布缩放
    canvasRef.value?.updateZoom()

    // 等待100毫秒, fabric.js 加载元素为异步
    await new Promise(resolve => setTimeout(resolve, 100))

    // 重新排序画布
    if (config.orderIds) {
      reorderCanvasByIds(config.orderIds)
    }

  } catch (error) {
    console.error('加载设计失败:', error)
    messageStore.error('加载设计失败')
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
const loadElements = async (elements: ElementConfig[]) => {
  try {
    for (const element of elements) {
      if (element.type == 'Line') continue
      console.log(`load element: ${JSON.stringify(element)}`)
      const decodedElement = await decodeElement(element)
      if (!decodedElement) {
        console.warn(`Unknown element type: ${element.eleType}`)
        messageStore.warning(`未知的元素类型:${element.eleType}`)
        continue
      }

      const addElement = getAddElement(element.eleType)
      if (addElement) {
        await addElement(element.eleType, decodedElement)
      } else {
        console.warn(`Unknown element type: ${element.eleType}`)
        messageStore.warning(`未知的元素类型:${element.eleType}`)
      }
    }
  } catch (error) {
    console.error('加载元素失败:', error)
    messageStore.error('加载元素失败: ' + (error as any)?.message)
  }
}

const reorderCanvasByIds = (orderedIds: string[]) => {
  const c = baseStore.canvas
  if (!c) return
  const objects = c.getObjects() as (FabricObject & { id?: string })[];
  orderedIds.forEach((id, index) => {
    const obj = objects.find((o: FabricObject & { id?: string }) => o.id === id);
    if (obj) {
      
      c.moveObjectTo(obj, index);
    }
  });
};


onMounted(() => {
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
})

// 向外部暴露方法
defineExpose({
  exportPanelRef
})

const openEditorSettings = () => {
  editorSettingsDialog.value?.openDialog()
}
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
.center-area .canvas-container .upper-canvas {
  z-index: 2;
}
</style>
<style scoped>
.left-panel {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  background-color: #fff;
}

.design-container {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

.design-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.left-panel {
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
}

.center-area {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: v-bind(backgroundColor);
  padding: 20px;
  position: relative;
}

.right-panel {
  width: 500px;
  /* 增加宽度 */
  flex-shrink: 0;
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 76px;
  /* 原有的16px + 额外的60px空间 */
}

.canvas-container {
  position: relative;
  background: white;
  margin: 40px 0 0 40px;
  /* 标尺和画布之间的距离 40px */
}

.ruler-corner {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-right: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  z-index: 2;
}

.ruler-horizontal-wrapper {
  position: absolute;
  top: 0px;
  left: 40px;
  right: 0px;
  height: 40px;
  background: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  z-index: 1;
}

.ruler-vertical-wrapper {
  position: absolute;
  top: 40px;
  left: 0px;
  bottom: 0px;
  width: 40px;
  background: #f0f0f0;
  border-right: 1px solid #e0e0e0;
  z-index: 1;
}

.editor-settings-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.editor-settings-btn:hover {
  transform: rotate(30deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.editor-settings-btn .el-icon {
  font-size: 20px;
  color: #666;
}

.editor-controls {
  position: absolute;
  top: 60px;
  right: 20px;
  background: #f0f0f0;
  border-radius: 5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

</style>
