<template>
  <div class="layer-panel">
    <div class="layer-list">
      <div class="display-tabs" role="tablist" aria-label="Layer display state">
        <button class="display-tab" :class="{ active: previewMode === 'active' }" type="button" role="tab" :aria-selected="previewMode === 'active'" @click="previewMode = 'active'">
          <Icon icon="material-symbols:brightness-5-outline" />
          <span>ACTIVE</span>
        </button>
        <button class="display-tab" :class="{ active: previewMode === 'ambient' }" type="button" role="tab" :aria-selected="previewMode === 'ambient'" @click="previewMode = 'ambient'">
          <Icon icon="material-symbols:contrast" />
          <span>AMBIENT</span>
        </button>
      </div>
      <draggable
        :list="panelItems"
        class="layers-list"
        :animation="150"
        @start="handleDragStart"
        @end="handleDragEnd"
        item-key="id"
        handle=".layer-content"
        :filter="'.no-drag'"
        :prevent-on-filter="false">
        <template #item="{ element: item }">
          <div v-if="item.kind === 'group'" class="layer-group-block">
            <button
              class="layer-group-summary layer-content"
              :class="{ 'layer-group-selected': isGroupActived(item) }"
              type="button"
              :aria-expanded="item.isExpanded"
              @click.stop="selectLayerGroup(item)"
              @dblclick.stop="toggleGroup(item.key)">
              <span class="layer-group-toggle" :title="item.isExpanded ? 'Collapse group' : 'Expand group'" @click.stop="toggleGroup(item.key)">
                <Icon :icon="item.isExpanded ? 'material-symbols:expand-more' : 'material-symbols:chevron-right'" />
              </span>
              <span class="layer-group-summary-name">{{ item.label }}</span>
              <span class="layer-group-count">{{ item.members.length }} items</span>
            </button>
            <div v-if="item.isExpanded" class="layer-group-members">
              <div
                v-for="layer in item.members"
                :key="layer.id"
                class="layer-row layer-group-member"
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
                    <span class="layer-text">
                      <span class="layer-name">{{ layer.eleType }}</span>
                    </span>
                  </div>
                  <div class="layer-actions">
                    <button
                      class="layer-btn"
                      :aria-pressed="isLayerVisibleInPreview(layer)"
                      :title="isLayerVisibleInPreview(layer) ? t('editorSettings.show') : t('editorSettings.hide')"
                      @click.stop="toggleVisibility(layer)">
                      <el-icon v-if="isLayerVisibleInPreview(layer)"><View /></el-icon>
                      <el-icon v-else><Hide /></el-icon>
                    </button>
                    <button class="layer-btn" :aria-pressed="layer.locked" :title="layer.locked ? 'Unlock' : 'Lock'" @click.stop="toggleLock(layer)">
                      <el-icon v-if="layer.locked"><Lock /></el-icon>
                      <el-icon v-else><Unlock /></el-icon>
                    </button>
                    <button class="layer-btn" @click.stop="deleteLayer(layer)">
                      <el-icon><Delete /></el-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="layer-row"
            :class="{
              'layer-selected': isActived(item.layer.id),
              'layer-locked': item.layer.locked
            }"
            :style="getLayerBackgroundColor(item.layer)"
            @click="selectLayer(item.layer)">
            <div v-if="item.layer.eleType" class="layer-item">
              <div class="layer-content" :class="{ 'no-drag': isFixedLayer(item.layer) }">
                <span class="layer-icon">
                  <Icon :icon="getElementIcon(item.layer.eleType)" />
                </span>
                <span class="layer-text">
                  <span class="layer-name">{{ item.layer.eleType }}</span>
                </span>
              </div>
              <div class="layer-actions">
                <button
                  class="layer-btn"
                  :aria-pressed="isLayerVisibleInPreview(item.layer)"
                  :title="isLayerVisibleInPreview(item.layer) ? t('editorSettings.show') : t('editorSettings.hide')"
                  @click.stop="toggleVisibility(item.layer)">
                  <el-icon v-if="isLayerVisibleInPreview(item.layer)">
                    <View />
                  </el-icon>
                  <el-icon v-else>
                    <Hide />
                  </el-icon>
                </button>
                <button class="layer-btn" :aria-pressed="item.layer.locked" :title="item.layer.locked ? 'Unlock' : 'Lock'" @click.stop="toggleLock(item.layer)">
                  <el-icon v-if="item.layer.locked">
                    <Lock />
                  </el-icon>
                  <el-icon v-else>
                    <Unlock />
                  </el-icon>
                </button>
                <button v-if="!isFixedLayer(item.layer)" class="layer-btn" @click.stop="deleteLayer(item.layer)">
                  <el-icon>
                    <Delete />
                  </el-icon>
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
import { ActiveSelection } from 'fabric'
import { debounce } from 'lodash-es'
import emitter from '@/utils/eventBus'
import { useLayerStore } from '@/stores/layerStore'
import { useBaseStore } from '@/stores/baseStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useHistoryStore } from '@/stores/historyStore'
import { elementConfigs } from '@/elements/schemaMap'
import draggable from 'vuedraggable'
import type { MinimalFabricLike } from '@/types/layer'
import type { FabricElement } from '@/types/element'
import { removeElement, getElementById } from '@/engine/managers/elementManager'
import { syncLayersFromCanvas, applyOrder } from '@/engine/managers/layerManager'
import { useI18n } from '@/i18n'
import type { LayerElement } from '@/types/layer'
import { getDisplayState, type DisplayStateMode } from '@/utils/displayStates'
import { Delete, Hide, Lock, Unlock, View } from '@element-plus/icons-vue'
import { toPanelLayers } from './layerPanelOrder'
import { buildLayerPanelItems, findCollapsedGroupsForLayerIds, resolvePanelItemsToCanvasIds, retainExistingExpandedGroups, type LayerPanelGroupItem, type LayerPanelItem } from './layerPanelGrouping'

const layerStore = useLayerStore()
const baseStore = useBaseStore()
const canvasStore = useCanvasStore()
const historyStore = useHistoryStore()
const { t } = useI18n()

const panelLayers = ref<LayerElement[]>([])
const panelItems = ref<LayerPanelItem[]>([])
const expandedGroupKeys = ref(new Set<string>())
const isDraggingLayers = ref(false)
const layers = computed(() => panelLayers.value)
const previewMode = computed<DisplayStateMode>({
  get: () => layerStore.previewMode,
  set: (mode) => {
    layerStore.setPreviewMode(mode)
    if (mode === 'ambient') {
      clearBackgroundSelection()
    }
    debouncedUpdateElements()
  }
})

const isFixedLayer = (layer: any): boolean => {
  const t = String(layer?.eleType ?? '')
  return t === 'global' || t === 'background'
}

const isAmbientBackgroundLayer = (layer: any): boolean => {
  return previewMode.value === 'ambient' && String(layer?.eleType ?? '') === 'background'
}

const clearBackgroundSelection = (): void => {
  const backgroundIds = new Set(layerStore.layers.filter((layer) => String(layer?.eleType ?? '') === 'background').map((layer) => String(layer.id)))
  if (!canvasStore.activeIds.some((id) => backgroundIds.has(String(id)))) return
  baseStore.canvas?.discardActiveObject?.()
  canvasStore.clearActiveIds()
  layerStore.clearSelected()
  activeElements.value = []
  selectedIds.value = []
  baseStore.canvas?.renderAll?.()
}

const sortLayersForPanel = (sourceLayers: LayerElement[]): LayerElement[] => {
  return toPanelLayers(sourceLayers)
}

const rebuildPanelItems = (): void => {
  const nextItems = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
  expandedGroupKeys.value = retainExistingExpandedGroups(expandedGroupKeys.value, nextItems)
  panelItems.value = buildLayerPanelItems(panelLayers.value, expandedGroupKeys.value)
}

const resolveDragOrderIds = (): string[] => {
  return resolvePanelItemsToCanvasIds(panelItems.value)
}

const toggleGroup = (key: string): void => {
  const next = new Set(expandedGroupKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedGroupKeys.value = next
  rebuildPanelItems()
}

watch(
  () => layerStore.layers,
  (nextLayers) => {
    if (isDraggingLayers.value) return
    panelLayers.value = sortLayersForPanel(nextLayers)
    rebuildPanelItems()
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

watch(selectedIds, (ids) => {
  const keys = findCollapsedGroupsForLayerIds(panelItems.value, ids)
  if (!keys.length) return
  const next = new Set(expandedGroupKeys.value)
  keys.forEach((key) => next.add(key))
  expandedGroupKeys.value = next
  rebuildPanelItems()
})

// listen for element property changes to trigger re-render
type ElementState = { dataProperty?: string; goalProperty?: string }
type FabricModifiedEvent = { transform?: unknown; target: ElementState & { _previousState?: ElementState } }
const setupElementListeners = (): void => {
  layers.value.forEach((layer) => {
    const element = layer.element as any
    element.on?.('modified', (e: FabricModifiedEvent) => {
      if (e.transform) return
      if (e.target.dataProperty !== e.target._previousState?.dataProperty || e.target.goalProperty !== e.target._previousState?.goalProperty) {
        e.target._previousState = {
          dataProperty: e.target.dataProperty,
          goalProperty: e.target.goalProperty
        }
        rebuildPanelItems()
        baseStore.canvas?.renderAll?.()
      }
    })
  })
}

// select a layer from side panel and sync to canvas + store
const selectLayer = async (layer: any): Promise<void> => {
  const isBackgroundLayer = String(layer?.eleType ?? '') === 'background'
  if (isAmbientBackgroundLayer(layer)) {
    clearBackgroundSelection()
    return
  }
  // do not allow selecting locked layers from panel
  if ((layer as { locked?: boolean }).locked && !isBackgroundLayer) {
    return
  }
  if (String(layer?.eleType ?? '') === 'global') {
    return
  }
  const canvas = baseStore.canvas
  if (canvas && layer) {
    const obj = getElementById(layer.id) ?? layer.element
    if (obj) {
      if (isBackgroundLayer) {
        canvas.discardActiveObject?.()
        canvasStore.setActiveIds([String(layer.id)])
        layerStore.selectOne(String(layer.id))
        activeElements.value = [obj as MinimalFabricLike]
        selectedIds.value = [String(layer.id)]
        canvas.renderAll?.()
        return
      }
      canvas.setActiveObject?.(obj as any)
      layerStore.selectOne(String(layer.id))
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

const selectLayerGroup = (item: LayerPanelGroupItem): void => {
  const canvas = baseStore.canvas
  if (!canvas) return

  const selectableLayers = item.members.filter((layer) => !layer.locked && layer.selectable !== false)
  const objects = selectableLayers.map((layer) => getElementById(layer.id) ?? layer.element).filter(Boolean)
  if (!objects.length) return

  canvas.discardActiveObject?.()
  const selection = new ActiveSelection(objects as any[], { canvas: canvas as any })
  canvas.setActiveObject?.(selection as any)
  const ids = selectableLayers.map((layer) => String(layer.id))
  canvasStore.setActiveIds(ids)
  layerStore.setSelected(ids)
  activeElements.value = objects as MinimalFabricLike[]
  selectedIds.value = ids
  canvas.requestRenderAll?.()
}

// determine if a layer is selected using reactive selectedIds derived from activeElements
const isActived = (layerId: string | undefined): boolean => {
  if (!layerId) return false
  const layer = layers.value.find((l) => l.id === layerId)
  if (!layer) return false
  if (isAmbientBackgroundLayer(layer)) return false
  if ((layer as any).locked && String((layer as any).eleType ?? '') !== 'background') return false
  const result = selectedIds.value.includes(layerId) || canvasStore.activeIds.includes(layerId) || layerStore.isSelected(layerId)
  return result
}

const isGroupActived = (item: LayerPanelGroupItem): boolean => {
  return item.members.some((layer) => isActived(layer.id))
}

const toggleVisibility = (layer: any): void => {
  if (!layer?.id) return
  const id = String(layer.id)
  layerStore.toggleLayerVisibility(id)
  const updatedLayer = layerStore.layers.find((item) => item.id === id)
  if (updatedLayer) {
    layer.displayStates = updatedLayer.displayStates
    layer.visible = updatedLayer.visible
  }
  baseStore.canvas?.renderAll?.()
  debouncedUpdateElements()
}

const isLayerVisibleInPreview = (layer: LayerElement | any): boolean => {
  const currentLayer = layerStore.layers.find((item) => item.id === String(layer?.id ?? ''))
  return getDisplayState(currentLayer?.displayStates ?? layer?.displayStates, previewMode.value)
}

const toggleLock = (layer: any): void => {
  if (!layer?.id) return
  if (String(layer?.eleType ?? '') === 'global') return
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
  const ids = resolveDragOrderIds()
  applyOrder(ids)
  historyStore.saveState('layer:reorder', { captureConfig: true })
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
      id: (layer as any)?.id
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
      layer
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
  const isInputActive = !!activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)
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
  const hasTypeMatch = layer.eleType === 'icon' || layer.eleType === 'data' || layer.eleType === 'label' || layer.eleType === 'goalArc' || layer.eleType === 'goalBar'
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

.display-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--studio-border);
}

.display-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--studio-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.display-tab.active {
  color: var(--studio-primary);
  border-bottom-color: var(--studio-primary);
}

.display-tab svg {
  width: 15px;
  height: 15px;
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
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.layer-group-block {
  overflow: hidden;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-md);
  background: var(--studio-surface-soft);
}

.layer-group-summary {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--studio-text);
  cursor: move;
  text-align: left;
  transition: background-color 0.18s ease;
}

.layer-group-summary:hover,
.layer-group-selected {
  background: var(--studio-primary-soft);
}

.layer-group-toggle {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: var(--studio-radius-sm);
  color: var(--studio-primary);
  cursor: pointer;
}

.layer-group-toggle:hover {
  background: rgba(15, 107, 104, 0.1);
}

.layer-group-summary-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-group-count {
  flex: 0 0 auto;
  color: var(--studio-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.layer-group-members {
  display: grid;
  gap: 4px;
  padding: 0 6px 6px 18px;
}

.layer-group-member .layer-item {
  min-height: 40px;
  border-color: rgba(15, 107, 104, 0.24);
  background: #ffffff;
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
