<template>
  <div class="layer-panel">
    <div class="layer-list">
      <h2 class="section-title">图层</h2>
      <draggable :list="elements" class="layers-list" :animation="150" @end="handleDragEnd" item-key="id" handle=".layer-content">
        <template #item="{ element: layer }">
          <div
            :class="{
              'layer-selected': isActived(layer.id),
              'layer-locked': layer.locked
            }"
            :style="getLayerBackgroundColor(layer)"
            @click="selectLayer(layer)">
            <div v-if="layer.eleType" class="layer-item">
              <div class="layer-content">
                <span class="layer-icon">
                  <Icon :icon="getElementIcon(layer.eleType)" />
                </span>
                <span class="layer-name">{{ layer.eleType }}</span>
              </div>
              <div class="layer-actions">
                <button class="layer-btn" @click.stop="toggleVisibility(layer)">
                  <Icon :icon="layer.visible ? 'material-symbols:visibility' : 'material-symbols:visibility-off'" />
                </button>
                <button class="layer-btn" @click.stop="toggleLock(layer)">
                  <Icon :icon="layer.locked ? 'material-symbols:lock' : 'material-symbols:lock-open'" />
                </button>
                <button class="layer-btn" @click.stop="deleteLayer(layer)">
                  <Icon icon="material-symbols:delete" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import emitter from '@/utils/eventBus'
import { useLayerStore } from '@/stores/layerStore'
import { useBaseStore } from '@/stores/baseStore'
import { elementConfigs } from '@/config/elements'
import draggable from 'vuedraggable'

const layerStore = useLayerStore()
const baseStore = useBaseStore()

// 对元素进行排序
const elements = ref([])
const activeElements = ref([])

// 批量更新
const batchUpdate = () => {
  if (!baseStore.canvas) return
  requestAnimationFrame(() => {
    elements.value = baseStore.canvas.getObjects()
    activeElements.value = baseStore.canvas.getActiveObjects()
    baseStore.canvas.renderAll()
  })
}

// 优化后的更新元素函数
const updateElements = () => {
  batchUpdate()
}

// 使用更短的延迟时间
const debouncedUpdateElements = debounce(updateElements, 100)

// 监听元素属性变化
const setupElementListeners = () => {
  elements.value.forEach((element) => {
    element.on('modified', (e) => {
      if (e.transform) return // 忽略位置和大小的修改
      if (e.target.dataProperty !== e.target._previousState?.dataProperty || e.target.goalProperty !== e.target._previousState?.goalProperty) {
        // 保存当前状态用于下次比较
        e.target._previousState = {
          dataProperty: e.target.dataProperty,
          goalProperty: e.target.goalProperty
        }
        baseStore.canvas.renderAll()
      }
    })
  })
}

const selectLayer = async (layer) => {
  console.log('select layer', layer)
  
  baseStore.canvas.discardActiveObject()
  if (layer.eleType === 'global') {
    // 打开全局配置
  } else if (baseStore.canvas && layer) {
    baseStore.canvas.setActiveObject(layer)
  }
  // 更新设置
  emitter.emit('refresh-element-settings', {})
  // 更新画布
  baseStore.canvas.renderAll()
  // 更新图层
  debouncedUpdateElements()
}

const isActived = (layerId) => {
  // 如果是 global 元素，永远不显示为选中状态
  const layer = elements.value.find((el) => el.id === layerId)
  if (layer && layer.type === 'global') return false

  // 检查是否在活动元素中
  for (const element of activeElements.value) {
    if (element.id == layerId) {
      return true
    }
  }
  return false
}

const toggleVisibility = (layer) => {
  layerStore.toggleLayerVisibility(layer.id)
  if (baseStore.canvas) {
    baseStore.canvas.renderAll()
  }
}

const toggleLock = (layer) => {
  console.log('toggle lock', layer)
  layerStore.toggleLayerLock(layer.id)
}

// 处理拖拽结束事件
const handleDragEnd = () => {
  // 直接使用 draggable 提供的顺序更新画布
  elements.value.forEach((element, index) => {
    console.log('drag move element', element, index)
    baseStore.canvas.moveObjectTo(element, index)
  })
  baseStore.canvas.renderAll()
}

// 历史记录管理
const history = ref([])
const currentHistoryIndex = ref(-1)

// 添加操作到历史记录
const addToHistory = (action) => {
  // 如果当前不在历史记录末尾，清除后面的记录
  if (currentHistoryIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, currentHistoryIndex.value + 1)
  }

  history.value.push(action)
  currentHistoryIndex.value = history.value.length - 1
}

// 撤销操作
const undo = () => {
  if (currentHistoryIndex.value >= 0) {
    const action = history.value[currentHistoryIndex.value]
    if (action.type === 'delete') {
      // 恢复删除的元素
      baseStore.canvas.add(action.element)
      layerStore.addLayer(action.element)
    }
    currentHistoryIndex.value--
    baseStore.canvas.renderAll()
  }
}

const deleteLayer = (layer) => {
  if (layer.locked) return
  if (baseStore.canvas) {
    // 保存删除操作到历史记录
    addToHistory({
      type: 'delete',
      element: layer
    })

    baseStore.canvas.remove(layer)
    layerStore.removeLayer(layer.id)
    debouncedUpdateElements() // 删除后重新排序
    baseStore.canvas.discardActiveObject()
  }
}

const handleKeyDown = (event) => {
  // 检查当前焦点元素
  const activeElement = document.activeElement
  const isInputActive = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable

  // 如果当前在输入框中，不处理删除快捷键
  if (isInputActive) {
    return
  }

  // 删除快捷键
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const activeObject = baseStore.canvas.getActiveObject()
    if (activeObject) {
      deleteLayer(activeObject)
    }
  }

  // 撤销快捷键 (Command + Z)
  if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault() // 阻止浏览器默认的撤销行为
    undo()
  }
}

const getElementIcon = (eleType) => {
  for (const category of Object.values(elementConfigs)) {
    if (category[eleType]) {
      return category[eleType].icon
    }
  }
  return 'material-symbols:circle'
}

const getLayerBackgroundColor = (layer) => {
  if ((layer.eleType === 'icon' || layer.eleType === 'data' || layer.eleType === 'label' || layer.eleType === 'goalArc' || layer.eleType === 'goalBar') && (layer.dataProperty || layer.goalProperty)) {
    const id = layer.dataProperty || layer.goalProperty
    const color = generateColorFromId(id)
    return { backgroundColor: color }
  }
  return {}
}

const generateColorFromId = (id) => {
  // 根据元素类型设置基础色调
  const baseHue = id.startsWith('data_') ? 200 : 0 // data 用蓝色系，goal 用红色系

  // 从 id 中提取数字部分
  const num = parseInt(id.split('_')[1]) || 0

  // 根据数字生成不同的色相偏移
  const hueOffset = (num * 30) % 360

  // 组合基础色调和偏移
  const hue = (baseHue + hueOffset) % 360

  // 使用固定的饱和度和亮度
  const saturation = 70
  const lightness = 80

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

onMounted(() => {
  debouncedUpdateElements()
  emitter.on('refresh-canvas', (data) => {
    debouncedUpdateElements()
  })
  window.addEventListener('keydown', handleKeyDown)
  setupElementListeners() // 设置元素监听器
})

onUnmounted(() => {
  emitter.off('refresh-canvas')
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.layer-panel {
  height: 100%;
  overflow: auto;
}

.layer-list {
  padding: 16px;
}

.section-title {
  margin: 0 0 16px;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-selected {
  border: 4px solid #1890ff;
  background: #e6f7ff;
}

.layer-content {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move; /* 指示可拖动 */
}

.layer-icon {
  font-size: 20px;
  display: flex;
  align-items: center;
}

.layer-name {
  font-size: 14px;
  color: #333;
}

.layer-actions {
  display: flex;
  gap: 4px;
}

.layer-btn {
  padding: 4px;
  font-size: 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.layer-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.layer-locked {
  opacity: 0.7;
  background-color: #555555;
}
</style>
