<template>
  <div class="layer-panel">
    <div class="layer-list">
      <h2 class="section-title">Layers</h2>
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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import emitter from '@/utils/eventBus'
import { useLayerStore } from '@/stores/layerStore'
import { useBaseStore } from '@/stores/baseStore'
import { useLineElementStore } from '@/stores/elements/shapes/lineElement'
import { elementConfigs } from '@/config/elements/elements'
import draggable from 'vuedraggable'
import type { MinimalFabricLike } from '@/types/layer'

const layerStore = useLayerStore()
const baseStore = useBaseStore()
const lineElementStore = useLineElementStore()

// no store-based selection syncing; rely on Fabric object's `active` flag

// elements shown in layer list
const elements = ref<MinimalFabricLike[]>([])
// kept for internal operations but selection highlight uses store
const activeElements = ref<MinimalFabricLike[]>([])
// reactive selected ids derived from activeElements to drive highlighting
const selectedIds = ref<string[]>([])

// disposer for selection listeners and watcher stop handle
const selectionCleanup = ref<null | (() => void)>(null)
let stopWatchCanvas: null | (() => void) = null

const summarizeObjects = (objs: MinimalFabricLike[]): Array<{ id?: string; eleType?: string; active?: boolean; locked?: boolean; visible?: boolean }> =>
  objs.map((o) => ({
    id: o.id,
    eleType: o.eleType,
    active: (o as { active?: boolean }).active,
    locked: (o as { locked?: boolean }).locked,
    visible: (o as { visible?: boolean }).visible
  }))

// batch update from canvas
const batchUpdate = (): void => {
  if (!baseStore.canvas) {
    return
  }
  requestAnimationFrame(() => {
    // Fabric returns objects array
    const all = (baseStore.canvas!.getObjects?.() as MinimalFabricLike[]) || []
    const actives = (baseStore.canvas!.getActiveObjects?.() as MinimalFabricLike[]) || []
    // clone arrays to ensure Vue reactivity notices changes
    elements.value = [...all]
    activeElements.value = [...actives]
    selectedIds.value = actives.map((o) => o.id).filter((id): id is string => typeof id === 'string')
    baseStore.canvas!.renderAll?.()
  })
}

const updateElements = (): void => {
  batchUpdate()
}

const debouncedUpdateElements = debounce(updateElements, 100)

// keep selectedIds in sync even if activeElements changes outside batchUpdate timing
watch(activeElements, (newVal) => {
  const ids = (newVal || []).map((o) => o.id).filter((id): id is string => typeof id === 'string')
  selectedIds.value = ids
})

// listen for element property changes to trigger re-render
type ElementState = { dataProperty?: string; goalProperty?: string }
type FabricModifiedEvent = { transform?: unknown; target: ElementState & { _previousState?: ElementState } }
const setupElementListeners = (): void => {
  elements.value.forEach((element) => {
    element.on?.('modified', (e: FabricModifiedEvent) => {
      if (e.transform) return
      if (
        e.target.dataProperty !== e.target._previousState?.dataProperty ||
        e.target.goalProperty !== e.target._previousState?.goalProperty
      ) {
        e.target._previousState = {
          dataProperty: e.target.dataProperty,
          goalProperty: e.target.goalProperty
        }
        baseStore.canvas?.renderAll?.()
      }
    })
  })
}

// select a layer from side panel and sync to canvas + store
const selectLayer = async (layer: MinimalFabricLike): Promise<void> => {
  // do not allow selecting locked layers from panel
  if ((layer as { locked?: boolean }).locked) {
    return
  }
  baseStore.canvas?.discardActiveObject?.()
  if (layer.eleType === 'global') {
    // open global settings if needed
  } else if (baseStore.canvas && layer) {
    baseStore.canvas.setActiveObject?.(layer as unknown as object)
    baseStore.canvas.getActiveObject?.() as MinimalFabricLike | undefined
  }
  emitter.emit('refresh-element-settings', {})
  // 通知各元素 store，图层被选中（用于高亮直线端点等效果）
  lineElementStore.handleSelectedFromLayer(layer)
  baseStore.canvas?.renderAll?.()
  debouncedUpdateElements()
}

// determine if a layer is selected using reactive selectedIds derived from activeElements
const isActived = (layerId: string | undefined): boolean => {
  if (!layerId) return false
  const layer = elements.value.find((el) => el.id === layerId) as (MinimalFabricLike & { type?: string; locked?: boolean }) | undefined
  if (layer && layer.type === 'global') return false
  if (layer && layer.locked) return false
  const result = selectedIds.value.includes(layerId)
  return result
}

const toggleVisibility = (layer: MinimalFabricLike): void => {
  if (!layer.id) return
  layerStore.toggleLayerVisibility(layer.id)
  baseStore.canvas?.renderAll?.()
  debouncedUpdateElements()
}

const toggleLock = (layer: MinimalFabricLike): void => {
  if (!layer.id) return
  layerStore.toggleLayerLock(layer.id)
  // After store syncs Fabric object, refresh list so class/background/icon update
  debouncedUpdateElements()
}

// drag end reorders canvas stacking
const handleDragEnd = (): void => {
  elements.value.forEach((element, index) => {
    baseStore.canvas?.moveObjectTo?.(element as unknown as object, index)
  })
  baseStore.canvas?.renderAll?.()
}

// simple undo buffer for deletes
type DeleteAction = { type: 'delete'; element: MinimalFabricLike }
const history = ref<DeleteAction[]>([])
const currentHistoryIndex = ref<number>(-1)

const addToHistory = (action: DeleteAction): void => {
  if (currentHistoryIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, currentHistoryIndex.value + 1)
  }
  history.value.push(action)
  currentHistoryIndex.value = history.value.length - 1
}

const undo = (): void => {
  if (currentHistoryIndex.value >= 0) {
    const action = history.value[currentHistoryIndex.value]
    if (action.type === 'delete') {
      baseStore.canvas?.add?.(action.element as unknown as object)
      layerStore.addLayer(action.element)
    }
    currentHistoryIndex.value--
    baseStore.canvas?.renderAll?.()
  }
}

const deleteLayer = (layer: MinimalFabricLike): void => {
  if (layer.locked) return
  if (baseStore.canvas) {
    addToHistory({ type: 'delete', element: layer })
    baseStore.canvas.remove?.(layer as unknown as object)
    if (layer.id) {
      layerStore.removeLayer(layer.id)
    }
    debouncedUpdateElements()
    baseStore.canvas.discardActiveObject?.()
  }
}

const handleKeyDown = (event: KeyboardEvent): void => {
  const activeElement = document.activeElement as HTMLElement | null
  const isInputActive = !!activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    (activeElement as HTMLElement).isContentEditable
  )
  if (isInputActive) return

  if (event.key === 'Delete' || event.key === 'Backspace') {
    const activeObject = baseStore.canvas?.getActiveObject?.() as MinimalFabricLike | undefined
    if (activeObject) {
      deleteLayer(activeObject)
    }
  }

  if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    undo()
  }
}

type CategoryConfigs = Record<string, Record<string, { icon: string }>>
const getElementIcon = (eleType: string): string => {
  const configs = elementConfigs as unknown as CategoryConfigs
  for (const category of Object.values(configs)) {
    if (category[eleType]) {
      return category[eleType].icon
    }
  }
  return 'material-symbols:circle'
}

const getLayerBackgroundColor = (layer: MinimalFabricLike & { dataProperty?: string; goalProperty?: string; locked?: boolean }): Record<string, string> => {
  // locked layers: force gray background
  if (layer.locked) {
    return { backgroundColor: '#555555' }
  }
  const hasTypeMatch = layer.eleType === 'icon' || layer.eleType === 'data' || layer.eleType === 'label' || layer.eleType === 'goalArc' || layer.eleType === 'goalBar' || layer.eleType === 'goalSegmentBar'
  const id = layer.dataProperty || layer.goalProperty
  if (hasTypeMatch && id) {
    const color = generateColorFromId(String(id))
    return { backgroundColor: color }
  }
  return {}
}

const generateColorFromId = (id: string): string => {
  const idStr = String(id || '')
  const baseHue = idStr.startsWith('data_') ? 200 : 0
  const num = parseInt(idStr.split('_')[1]) || 0
  const hueOffset = (num * 30) % 360
  const hue = (baseHue + hueOffset) % 360
  const saturation = 70
  const lightness = 80
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

onMounted((): void => {
  debouncedUpdateElements()
  emitter.on('refresh-canvas', () => {
    debouncedUpdateElements()
  })
  window.addEventListener('keydown', handleKeyDown)
  setupElementListeners()

  // listen to selection changes to refresh highlighting (based on object.active)
  const bindSelectionHandlers = (c: unknown): void => {
    const canvas = c as { on?: Function; off?: Function }
    if (!canvas?.on) return
    const handleCreated = (): void => {
      debouncedUpdateElements()
    }
    const handleUpdated = (): void => {
      debouncedUpdateElements()
    }
    const handleCleared = (): void => {
      debouncedUpdateElements()
    }
    canvas.on?.('selection:created', handleCreated)
    canvas.on?.('selection:updated', handleUpdated)
    canvas.on?.('selection:cleared', handleCleared)
    // save disposer
    selectionCleanup.value = () => {
      canvas.off?.('selection:created', handleCreated)
      canvas.off?.('selection:updated', handleUpdated)
      canvas.off?.('selection:cleared', handleCleared)
    }
  }

  if (baseStore.canvas) {
    bindSelectionHandlers(baseStore.canvas)
  }
  // watch for late initialization or canvas replacement
  stopWatchCanvas = watch(
    () => baseStore.canvas,
    (newCanvas, _oldCanvas) => {
      // cleanup old
      if (selectionCleanup.value) {
        selectionCleanup.value()
        selectionCleanup.value = null
      }
      // bind new
      if (newCanvas) {
        bindSelectionHandlers(newCanvas)
        debouncedUpdateElements()
      }
    }
  )
})

onUnmounted((): void => {
  emitter.off('refresh-canvas')
  window.removeEventListener('keydown', handleKeyDown)
  if (selectionCleanup.value) {
    selectionCleanup.value()
    selectionCleanup.value = null
  }
  if (stopWatchCanvas) {
    stopWatchCanvas()
    stopWatchCanvas = null
  }
})
</script>

<style scoped>
.layer-panel {
  height: 100%;
  overflow: auto;
}

.layer-list {
  padding: 8px;
}

.section-title {
  margin: 0 0 8px;
  color: #333;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  border: 1px solid #eee;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-selected {
  border: 2px solid #1890ff;
  background: #e6f7ff;
}

.layer-content {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: move; /* 指示可拖动 */
}

.layer-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.layer-name {
  font-size: 12px;
  color: #333;
}

.layer-actions {
  display: flex;
  gap: 2px;
}

.layer-btn {
  padding: 2px;
  font-size: 16px;
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
  opacity: 0.8;
}

/* 锁定状态置灰样式 */
.layer-locked .layer-item {
  background: #555555;
  border-color: #555555;
  filter: grayscale(100%);
}

.layer-locked .layer-name,
.layer-locked .layer-icon,
.layer-locked .layer-btn {
  color: #9aa0a6;
}

.layer-locked .layer-item:hover {
  background: #555555;
}

.layer-locked .layer-btn:hover {
  background: rgba(0, 0, 0, 0.03);
}
</style>
