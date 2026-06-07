<template>
  <div class="layer-panel">
    <div class="layer-list">
      <h2 class="section-title">{{ t('panel.layers') }}</h2>
      <draggable
        :list="layers"
        class="layers-list"
        :animation="150"
        @start="handleDragStart"
        @end="handleDragEnd"
        item-key="id"
        handle=".layer-content"
        :filter="'.no-drag'"
        :prevent-on-filter="false"
      >
        <template #item="{ element: layer }">
          <div
            class="layer-row"
            :class="{
              'layer-selected': isActived(layer.id),
              'layer-locked': layer.locked,
              'layer-grouped': getLayerGroupMeta(layer).isGrouped,
              'layer-group-first': getLayerGroupMeta(layer).isFirst,
              'layer-group-last': getLayerGroupMeta(layer).isLast
            }"
            :style="getLayerBackgroundColor(layer)"
            @click="selectLayer(layer)">
            <div v-if="layer.eleType" class="layer-item">
              <div class="layer-content" :class="{ 'no-drag': isFixedLayer(layer) }">
                <span class="layer-icon">
                  <Icon :icon="getElementIcon(layer.eleType)" />
                </span>
                <span class="layer-text">
                  <span class="layer-name">{{ layer.eleType }}</span>
                  <span v-if="getLayerGroupMeta(layer).isGrouped" class="layer-group-name">
                    {{ getLayerGroupMeta(layer).label }}
                  </span>
                </span>
              </div>
              <div class="layer-actions">
                <button class="layer-btn" @click.stop="toggleVisibility(layer)">
                  <Icon :icon="layer.visible ? 'material-symbols:visibility' : 'material-symbols:visibility-off'" />
                </button>
                <button class="layer-btn" @click.stop="toggleLock(layer)">
                  <Icon :icon="layer.locked ? 'material-symbols:lock' : 'material-symbols:lock-open'" />
                </button>
                <button v-if="!isFixedLayer(layer)" class="layer-btn" @click.stop="deleteLayer(layer)">
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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { debounce } from 'lodash-es'
import emitter from '@/utils/eventBus'
import { useLayerStore } from '@/stores/layerStore'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { elementConfigs } from '@/elements/schemaMap'
import draggable from 'vuedraggable'
import type { MinimalFabricLike } from '@/types/layer'
import type { FabricElement } from '@/types/element'
import { removeElement, getElementById } from '@/engine/managers/elementManager'
import { syncLayersFromCanvas, applyOrder } from '@/engine/managers/layerManager'
import { useI18n } from '@/i18n'
import type { LayerElement } from '@/types/layer'

const layerStore = useLayerStore()
const baseStore = useBaseStore()
const canvasStore = useCanvasStore()
const { t } = useI18n()

const panelLayers = ref<LayerElement[]>([])
const isDraggingLayers = ref(false)
const layers = computed(() => panelLayers.value)

const ELEMENT_TYPE_ORDER = [
  'global',
  'background',
  'image',
  'circle',
  'rectangle',
  'line',
  'time',
  'date',
  'label',
  'data',
  'icon',
  'weather',
  'moon',
  'windDirection',
  'battery',
  'movebar',
  'alarms',
  'bluetooth',
  'disturb',
  'notification',
  'goalArc',
  'goalBar',
  'goalSegmentBar',
  'barChart',
  'lineChart',
  'tick12',
  'tick60',
  'romans',
  'centerCap',
  'hourHand',
  'minuteHand',
  'secondHand',
  'text',
  'angledText',
  'radialText',
  'scrollableText',
]

const typeRank = new Map(ELEMENT_TYPE_ORDER.map((type, index) => [type, index]))

type LayerGroupMeta = {
  key: string
  label: string
  isGrouped: boolean
  isFirst: boolean
  isLast: boolean
}

const getLayerObject = (layer: LayerElement | any): any => layer?.element ?? layer

const resolveLayerGroupKey = (layer: LayerElement | any): string => {
  const obj = getLayerObject(layer)
  const raw =
    obj?.groupId ??
    obj?.groupKey ??
    obj?.groupName ??
    obj?.parentId ??
    obj?.dataProperty ??
    obj?.goalProperty ??
    ''
  return raw == null ? '' : String(raw)
}

const getTypeSortValue = (layer: LayerElement | any): number => {
  const eleType = String(layer?.eleType ?? '')
  return typeRank.get(eleType) ?? ELEMENT_TYPE_ORDER.length
}

const compareLayerType = (a: LayerElement, b: LayerElement): number => {
  const rankDiff = getTypeSortValue(a) - getTypeSortValue(b)
  if (rankDiff !== 0) return rankDiff
  return String(a.eleType).localeCompare(String(b.eleType))
}

const isFixedLayer = (layer: any): boolean => {
  const t = String(layer?.eleType ?? '')
  return t === 'global' || t === 'background'
}

const sortLayersForPanel = (sourceLayers: LayerElement[]): LayerElement[] => {
  const fixedLayers = sourceLayers.filter((layer) => isFixedLayer(layer))
  const movableLayers = sourceLayers.filter((layer) => !isFixedLayer(layer))
  const groupCounts = new Map<string, number>()

  movableLayers.forEach((layer) => {
    const key = resolveLayerGroupKey(layer)
    if (!key) return
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
  })

  const groupedKeys = new Set(
    [...groupCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  )
  const groups = new Map<string, { firstIndex: number; items: LayerElement[] }>()
  const singleLayers: Array<{ layer: LayerElement; originalIndex: number }> = []

  movableLayers.forEach((layer, originalIndex) => {
    const key = resolveLayerGroupKey(layer)
    if (key && groupedKeys.has(key)) {
      const group = groups.get(key) ?? { firstIndex: originalIndex, items: [] }
      group.items.push(layer)
      groups.set(key, group)
      return
    }
    singleLayers.push({ layer, originalIndex })
  })

  const sortedGroups = [...groups.values()]
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .flatMap((group) => [...group.items].sort(compareLayerType))

  const sortedSingles = singleLayers
    .sort((a, b) => compareLayerType(a.layer, b.layer) || a.originalIndex - b.originalIndex)
    .map((item) => item.layer)

  return [...fixedLayers, ...sortedGroups, ...sortedSingles]
}

const getLayerGroupMeta = (layer: LayerElement | any): LayerGroupMeta => {
  const key = resolveLayerGroupKey(layer)
  if (!key) {
    return { key: '', label: '', isGrouped: false, isFirst: false, isLast: false }
  }
  const groupLayers = layers.value.filter((item) => resolveLayerGroupKey(item) === key)
  const isGrouped = groupLayers.length > 1
  if (!isGrouped) {
    return { key, label: key, isGrouped: false, isFirst: false, isLast: false }
  }
  const index = groupLayers.findIndex((item) => item.id === layer.id)
  return {
    key,
    label: key,
    isGrouped,
    isFirst: index === 0,
    isLast: index === groupLayers.length - 1,
  }
}

watch(
  () => layerStore.layers,
  (nextLayers) => {
    if (isDraggingLayers.value) return
    panelLayers.value = sortLayersForPanel(nextLayers)
  },
  { deep: true, immediate: true }
)

// kept for internal operations but selection highlight uses store
const activeElements = ref<MinimalFabricLike[]>([])
// reactive selected ids derived from activeElements to drive highlighting
const selectedIds = ref<string[]>([])

// disposer for selection listeners and watcher stop handle
const selectionCleanup = ref<null | (() => void)>(null)
let stopWatchCanvas: null | (() => void) = null

// batch update from canvas
const batchUpdate = (): void => {
  if (!baseStore.canvas) {
    return
  }
  requestAnimationFrame(() => {
    const actives = (baseStore.canvas!.getActiveObjects?.() as unknown as MinimalFabricLike[]) || []
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
  layers.value.forEach((layer) => {
    const element = layer.element as any
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
const selectLayer = async (layer: any): Promise<void> => {
  // do not allow selecting locked layers from panel
  if ((layer as { locked?: boolean }).locked && String(layer?.eleType ?? '') !== 'background') {
    return
  }
  if (String(layer?.eleType ?? '') === 'global') {
    return
  }
  const canvas = baseStore.canvas
  if (canvas && layer) {
    const obj = getElementById(layer.id) ?? layer.element
    if (obj) {
      canvas.setActiveObject?.(obj as any)
      canvas.renderAll?.()
      requestAnimationFrame(() => {
        const actives = (canvas.getActiveObjects?.() as unknown as MinimalFabricLike[]) || []
        const ids = actives
          .map((o) => o.id)
          .filter((id): id is string | undefined => id !== undefined && id !== null && id !== '')
          .map(String)
        canvasStore.setActiveIds(ids)
      })
    }
  }
  debouncedUpdateElements()
}

// determine if a layer is selected using reactive selectedIds derived from activeElements
const isActived = (layerId: string | undefined): boolean => {
  if (!layerId) return false
  const layer = layers.value.find((l) => l.id === layerId)
  if (!layer) return false
  if ((layer as any).locked && String(layer?.eleType ?? '') !== 'background') return false
  const result = selectedIds.value.includes(layerId)
  return result
}

const toggleVisibility = (layer: any): void => {
  if (!layer?.id) return
  layerStore.toggleLayerVisibility(String(layer.id))
  baseStore.canvas?.renderAll?.()
  debouncedUpdateElements()
}

const toggleLock = (layer: any): void => {
  if (!layer?.id) return
  if (isFixedLayer(layer)) return
  layerStore.toggleLayerLock(String(layer.id))
  // After store syncs Fabric object, refresh list so class/background/icon update
  debouncedUpdateElements()
}

// drag end reorders canvas stacking
const handleDragStart = (): void => {
  isDraggingLayers.value = true
}

const handleDragEnd = (): void => {
  isDraggingLayers.value = false
  // keep fixed layer(s) unmoved
  const ids = layers.value.map((l) => String(l.id))
  applyOrder(ids)
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
      baseStore.canvas?.add?.(action.element as any)
      layerStore.addLayer(action.element)
    }
    currentHistoryIndex.value--
    baseStore.canvas?.renderAll?.()
  }
}

const deleteLayer = (layer: any): void => {
  if (isFixedLayer(layer)) {
    return
  }
  if (layer.locked) {
    return
  }
  if (!baseStore.canvas) {
    console.warn('[LayerPanel] deleteLayer: baseStore.canvas is null, cannot delete', {
      id: (layer as any)?.id,
    })
    return
  }
  const canvas = baseStore.canvas
  // 为了适配可能存在的引用不一致（例如 canvas 实例替换后 layer.element 失效），
  // 优先通过 ElementManager Registry 按 id 查找真正的 FabricElement 实例
  const id = (layer as any).id
  const fromRegistry = id != null ? getElementById(id as any) : undefined
  if (!fromRegistry) {
    console.warn('[LayerPanel] deleteLayer: getElementById returned null, will fallback to raw layer reference', {
      id,
      layer,
    })
  } 
  const fabricElement = (fromRegistry ?? (layer.element as unknown) ?? (layer as unknown)) as FabricElement
  addToHistory({ type: 'delete', element: (layer.element as any) ?? (layer as any) })
  removeElement(fabricElement)
  canvas.discardActiveObject?.()
  canvas.renderAll?.()
  debouncedUpdateElements()
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
    const canvas = baseStore.canvas
    const actives = canvas?.getActiveObjects?.() as MinimalFabricLike[] | undefined
    if (actives && actives.length > 0) {
      actives.forEach((obj) => {
        if (!obj) return
        deleteLayer(obj)
      })
    } else {
      console.log('[LayerPanel] handleKeyDown: no active objects, skip delete')
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
    return { backgroundColor: '#e8ecf2' }
  }
  const hasTypeMatch = layer.eleType === 'icon' || layer.eleType === 'data' || layer.eleType === 'label' || layer.eleType === 'goalArc' || layer.eleType === 'goalBar' || layer.eleType === 'goalSegmentBar'
  const id = layer.element?.dataProperty || layer.element?.goalProperty
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
  syncLayersFromCanvas()
  debouncedUpdateElements()
  emitter.on('refresh-canvas', () => {
    syncLayersFromCanvas()
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
        syncLayersFromCanvas()
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
  background: var(--studio-surface);
}

.layer-list {
  padding: 14px;
}

.section-title {
  margin: 0 0 14px;
  color: var(--studio-text);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--studio-border);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-row {
  position: relative;
  border-radius: var(--studio-radius-md);
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 7px 8px 7px 10px;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.layer-grouped {
  padding-left: 8px;
}

.layer-grouped::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 999px;
  background: var(--studio-primary);
  opacity: 0.85;
}

.layer-grouped .layer-item {
  min-height: 42px;
  border-left-color: rgba(15, 107, 104, 0.42);
  background: linear-gradient(90deg, rgba(15, 107, 104, 0.08), var(--studio-surface-soft) 34px);
}

.layer-group-first:not(.layer-group-last) {
  margin-bottom: -3px;
}

.layer-group-first:not(.layer-group-last) .layer-item {
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
}

.layer-grouped:not(.layer-group-first):not(.layer-group-last) {
  margin-top: -3px;
  margin-bottom: -3px;
}

.layer-grouped:not(.layer-group-first):not(.layer-group-last) .layer-item {
  border-radius: 4px;
}

.layer-group-last:not(.layer-group-first) {
  margin-top: -3px;
}

.layer-group-last:not(.layer-group-first) .layer-item {
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.layer-item:hover {
  background: #ffffff;
  border-color: var(--studio-border-strong);
  box-shadow: var(--studio-shadow-sm);
}

.layer-selected {
  border-radius: var(--studio-radius-md);
  box-shadow: 0 0 0 2px var(--studio-focus-ring);
}

.layer-selected .layer-item {
  border-color: var(--studio-primary);
  background: var(--studio-primary-soft);
}

.layer-content {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move; /* 指示可拖动 */
  min-width: 0;
  flex: 1;
}

.layer-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.layer-content.no-drag {
  cursor: default;
}

.layer-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--studio-radius-sm);
  background: rgba(255, 255, 255, 0.82);
  color: var(--studio-primary);
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
}

.layer-name {
  font-size: 12px;
  color: var(--studio-text);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-group-name {
  max-width: 148px;
  overflow: hidden;
  color: var(--studio-text-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-actions {
  display: flex;
  gap: 3px;
  flex: 0 0 auto;
}

.layer-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 16px;
  border: none;
  border-radius: var(--studio-radius-sm);
  background: transparent;
  color: var(--studio-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-btn:hover {
  background: rgba(15, 107, 104, 0.1);
  color: var(--studio-primary);
}

.layer-locked {
  opacity: 0.8;
}

/* 锁定状态置灰样式 */
.layer-locked .layer-item {
  background: #e8ecf2;
  border-color: #d5dbe5;
  filter: grayscale(100%);
}

.layer-locked .layer-name,
.layer-locked .layer-icon,
.layer-locked .layer-btn {
  color: #7b8494;
}

.layer-locked .layer-item:hover {
  background: #e8ecf2;
}

.layer-locked .layer-btn:hover {
  background: rgba(0, 0, 0, 0.03);
}
</style>
