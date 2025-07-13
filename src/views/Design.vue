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
      <!-- 编辑器设置按钮 -->
      <div class="editor-settings-btn" @click="openEditorSettings">
        <el-icon>
          <Setting />
        </el-icon>
      </div>
      <!-- 标尺 -->
      <div class="ruler-corner"></div>
      <div class="ruler-horizontal-wrapper">
        <canvas class="ruler-horizontal"></canvas>
      </div>
      <div class="ruler-vertical-wrapper">
        <canvas class="ruler-vertical"></canvas>
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

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps, watchEffect, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Setting } from '@element-plus/icons-vue'
import emitter from '@/utils/eventBus'
import { Minus, Plus, Refresh } from '@element-plus/icons-vue'
import { nanoid } from 'nanoid'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { useCanvas } from '../composables/useCanvas'
import { usePropertiesStore } from '@/stores/properties'
import { useMessageStore } from '@/stores/message'
import { useFontStore } from '@/stores/fontStore'
import { useExportStore } from '@/stores/exportStore'
import { useEditorStore } from '@/stores/editorStore'
import { designApi } from '@/api/wristo/design'
import { useImageElementStore } from '@/stores/elements/imageElement'
import { useBaseStore } from '@/stores/baseStore'
import { decodeElement } from '@/utils/elementCodec'
import { getAddElement } from '@/utils/elementCodec/registry'
import EditorSettingsDialog from '@/components/dialogs/EditorSettingsDialog.vue'
import ChangelogDialog from '@/components/dialogs/ChangelogDialog.vue'
import appConfig from '@/config/appConfig'
import CanvasView from '@/views/Canvas.vue'
import ElementSettings from '@/components/ElementSettings.vue'
import SidePanel from '@/components/SidePanel.vue'
import ExportPanel from '@/components/ExportPanel.vue'
import TimeSimulator from '@/components/TimeSimulator.vue'
import ZoomControls from '@/components/ZoomControls.vue'

const propertiesStore = usePropertiesStore()
const imageStore = useImageElementStore()
const route = useRoute()
const router = useRouter()
const baseStore = useBaseStore()
const messageStore = useMessageStore()
const fontStore = useFontStore()
const exportStore = useExportStore()
const { waitCanvasReady } = useCanvas()
const canvasRef = ref(null)
const exportPanelRef = ref(null)
const isDialogVisible = ref(false)
const editorStore = useEditorStore()
let saveTimer = null

const changelogDialog = ref(null)
const editorSettingsDialog = ref(null)

// 启用键盘快捷键
useKeyboardShortcuts()

// 添加背景色计算属性
const backgroundColor = computed(() => editorStore.backgroundColor)

// 加载设计配置
const loadDesign = async (designUid) => {
  try {
    const response = await designApi.getDesignByUid(designUid)
    const designData = response.data
    const config = designData.configJson || {}
    console.log(113, config)
    
    // 设置基础信息
    baseStore.id = designUid
    baseStore.watchFaceName = designData.name
    
    // 如果配置为空，使用默认值
    if (!config || Object.keys(config).length === 0) {
      console.log('配置为空，使用默认值')
      // 等待画布初始化完成
      await waitCanvasReady()
      
      // 设置默认值
      baseStore.watchFaceName = designData.name
      baseStore.themeBackgroundImages = []
      baseStore.currentThemeIndex = 0
      baseStore.wpayEnabled = false
      baseStore.textCase = 0
      baseStore.labelLengthType = 0
      baseStore.showUnit = true
      
      // 初始化画布
      baseStore.canvas.requestRenderAll()
      return
    }
    
    // 加载属性
    if (config.properties) {
      propertiesStore.loadProperties(config.properties)
    }

    // 设置WPay相关配置
    baseStore.wpayEnabled = config.wpayEnabled || false
    // 获取WPay产品信息
    if (config.wpayEnabled) {
      await baseStore.getWPayProductInfo()
    }
    
    console.log(114, config.themeBackgroundImages)
    // 设置主题背景图片
    baseStore.themeBackgroundImages = config.themeBackgroundImages || []

    // 设置文本大小写
    if (config.textCase !== undefined) {
      baseStore.textCase = config.textCase
      // 如果有设置文本大小写，则触发更新
      setTimeout(() => {
        baseStore.setTextCase(config.textCase)
      }, 500) // 等待画布加载完成
    }

    // 设置标签长度类型
    if (config.labelLengthType !== undefined) {
      baseStore.labelLengthType = config.labelLengthType
      // 如果有设置标签长度类型，则触发更新
      setTimeout(() => {
        baseStore.setLabelLengthType(config.labelLengthType)
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
    
    // 加载字体
    if (config.elements) {
      await fontStore.loadFontsForElements(config.elements)
    }
    
    // 加载元素到画布
    if (config && config.elements) {
      await loadElements(config.elements)
    }
    
    // 更新画布缩放
    canvasRef.value.updateZoom()

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

// 初始化新设计
const initNewDesign = async () => {
  // 等待画布初始化完成
  await waitCanvasReady()

  // 设置默认值
  baseStore.watchFaceName = ''
  baseStore.themeBackgroundImages = []
  baseStore.currentThemeIndex = 0
  baseStore.canvas.requestRenderAll()
}

// 设置自动保存
const setupAutoSave = () => {
  if (appConfig.autoSave.enabled) {
    saveTimer = setInterval(() => {
      try {
        console.log('执行自动保存...')
        exportStore.saveConfig()
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }, appConfig.autoSave.interval)
  }
}

// 替换元素加载逻辑
const loadElements = async (elements) => {
  try {
    for (const element of elements) {

      const decodedElement = await decodeElement(element)
      if (!decodedElement) {
        console.warn(`Unknown element type: ${element.type}`)
        messageStore.warning(`未知的元素类型:${element.type}`)
        continue
      }

      const addElement = getAddElement(element.type)
      if (element.type === 'goalBar') {
        console.log('加载目标条元素:', decodedElement)
      }
      if (addElement) {
        await addElement(decodedElement)
      } else {
        console.warn(`Unknown element type: ${element.type}`)
        messageStore.warning(`未知的元素类型:${element.type}`)
      }
    }
  } catch (error) {
    console.error('加载元素失败:', error)
    messageStore.error('加载元素失败: ' + error.message)
  }
}

const reorderCanvasByIds = (orderedIds) => {
  const objects = baseStore.canvas.getObjects();
  orderedIds.forEach((id, index) => {
    const obj = objects.find(o => o.id === id);
    if (obj) {
      console.log('重新排序元素:', obj.id, index)
      baseStore.canvas.moveObjectTo(obj, index);
    }
  });
};


onMounted(() => {
  changelogDialog.value?.checkShowChangelog()

  // 检查URL参数中是否有设计ID
  const designId = route.query.id
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

  exportStore.setExportPanelRef(exportPanelRef.value)
})

onBeforeUnmount(() => {
  // 清除自动保存定时器
  if (saveTimer) {
    clearInterval(saveTimer)
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
