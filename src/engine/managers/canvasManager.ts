import { Canvas, Point } from 'fabric'
import emitter from '@/utils/eventBus'
import { initAligningGuidelines } from '@/lib/aligning_guidelines'
import { initCenteringGuidelines } from '@/lib/centering_guidelines'
import {
  applyControlManager,
  applyControlsToObject,
  DESIGNER_CONTROL_TYPES,
} from '@/utils/controlManager'
import {
  applyFabricCustomProperties,
  discoverAndRegisterCanvasProps,
} from '@/utils/fabricProps'
import * as elementManager from '@/engine/managers/elementManager'
import { useElementDataStore } from '@/stores/elementDataStore'
import type { Canvas as FabricCanvas } from 'fabric'
import { isDefaultBackgroundElement } from '@/elements/decoration/background/background.constants'

export interface CanvasManagerDeps {
  baseStore: any
  layerStore: any
  canvasStore: any
  historyStore: any
  watchSize: number
  watchWidth?: number
  watchHeight?: number
  zoomManager?: { updateZoom?: () => void } | null
}

let fabricCanvas: FabricCanvas | null = null

function syncSelectionIdsFromCanvas(canvasStore: any, canvas?: FabricCanvas | null) {
  if (!canvas) return
  const activeObjects = canvas.getActiveObjects() as Array<{ id?: string | number; type?: string; eleType?: string }>
  const ids = activeObjects
    .map((o) => o.id)
    .filter((id): id is string | number => id !== undefined && id !== null && id !== '')
    .map(String)
  canvasStore.setActiveIds(ids)
  console.log('[canvas-selection] sync active ids', {
    ids,
    activeObjectCount: activeObjects.length,
    activeObjects: activeObjects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      eleType: obj.eleType,
    })),
    activeType: (canvas.getActiveObject?.() as any)?.type,
  })
}

function clearCanvasSelection(layerStore: any, canvasStore: any, canvas: FabricCanvas): void {
  canvas.discardActiveObject?.()
  canvas.requestRenderAll?.()
  canvasStore.clearActiveIds()
  layerStore.clearSelected()
}

function isBackgroundElement(obj: unknown): boolean {
  return String((obj as { eleType?: unknown } | null | undefined)?.eleType ?? '') === 'background'
}

function rejectBackgroundSelection(layerStore: any, canvasStore: any, canvas: FabricCanvas): boolean {
  const activeObjects = canvas.getActiveObjects?.() as any[]
  if (!activeObjects?.some((obj) => isBackgroundElement(obj) || isDefaultBackgroundElement(obj))) return false
  clearCanvasSelection(layerStore, canvasStore, canvas)
  return true
}

export function initCanvasManager(
  canvasElement: HTMLCanvasElement,
  deps: CanvasManagerDeps,
): FabricCanvas {
  const { baseStore, layerStore, canvasStore, historyStore, watchSize, watchWidth, watchHeight, zoomManager } =
    deps
  const canvasWidth = watchWidth ?? watchSize
  const canvasHeight = watchHeight ?? watchSize

  // 应用全局 Fabric 自定义属性
  applyFabricCustomProperties()

  // 全局控制点管理
  applyControlManager({
    size: 6,
    stroke: '#334155',
    fill: '#ffffff',
    deleteFill: '#ef4444',
    cloneFill: '#22c55e',
    cloneOffset: 20,
    onDelete: (target, canvas) => {
      elementManager.removeElement(target as any)
      layerStore.clearSelected()
      syncSelectionIdsFromCanvas(canvasStore, canvas as FabricCanvas)
    },
    onClone: (_source, cloned) => {
      const elementDataStore = useElementDataStore()
      const sourceId = (_source as any).id != null ? String((_source as any).id) : ''
      const clonedId = (cloned as any).id != null ? String((cloned as any).id) : ''
      const sourceConfig = sourceId ? elementDataStore.getElementConfig(sourceId) : null
      if (clonedId) {
        elementDataStore.upsertElement({
          ...(sourceConfig || {}),
          id: clonedId,
          eleType: (cloned as any).eleType || (sourceConfig as any)?.eleType,
          left: (cloned as any).left,
          top: (cloned as any).top,
          originX: (cloned as any).originX,
          originY: (cloned as any).originY,
        } as any)
      }
      layerStore.addLayer(cloned as any)
      if ((cloned as any).id) {
        layerStore.selectOne(String((cloned as any).id))
      }
      syncSelectionIdsFromCanvas(canvasStore, (cloned as any)?.canvas as FabricCanvas | undefined)
      historyStore.saveState('clone:control', { coalesceIfSameFabric: true })
    },
  })

  const canvas = new Canvas(canvasElement, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: 'transparent',
    centeredScaling: true,
    centeredRotation: true,
    controlsAboveOverlay: true,
  }) as FabricCanvas

  // 将 viewport 原点移动到中心
  const centerPoint = { x: 0, y: 0 }
  canvas.setViewportTransform([
    1, 0,
    0, 1,
    centerPoint.x,
    centerPoint.y,
  ])
  canvas.absolutePan(new Point(-centerPoint.x, -centerPoint.y))

  // 被动 wheel 监听，避免浏览器警告
  canvas.wrapperEl.addEventListener('wheel', () => {}, { passive: true })

  // 对齐辅助线
  initAligningGuidelines(canvas)
  initCenteringGuidelines(canvas)
  canvas.selection = true

  // 选择事件同步到 canvasStore
  canvas.on({
    'mouse:down': (event) => {
      const target = (event as unknown as { target?: unknown }).target
      if (target && !isBackgroundElement(target) && !isDefaultBackgroundElement(target)) return
      clearCanvasSelection(layerStore, canvasStore, canvas)
    },
    'selection:created': () => {
      if (rejectBackgroundSelection(layerStore, canvasStore, canvas)) return
      const active = canvas.getActiveObject() as any
      console.log('[canvas-selection] created', {
        activeType: active?.type,
        activeId: active?.id,
        activeEleType: active?.eleType,
        activeObjectCount: canvas.getActiveObjects?.().length,
      })
      if (active && String(active.type).toLowerCase() === 'activeselection') {
        active.set({ hasControls: false })
        active.setCoords?.()
      }
      syncSelectionIdsFromCanvas(canvasStore, canvas)
    },
    'selection:updated': () => {
      if (rejectBackgroundSelection(layerStore, canvasStore, canvas)) return
      const active = canvas.getActiveObject() as any
      console.log('[canvas-selection] updated', {
        activeType: active?.type,
        activeId: active?.id,
        activeEleType: active?.eleType,
        activeObjectCount: canvas.getActiveObjects?.().length,
      })
      if (active && String(active.type).toLowerCase() === 'activeselection') {
        active.set({ hasControls: false })
        active.setCoords?.()
      }
      syncSelectionIdsFromCanvas(canvasStore, canvas)
    },
    'selection:cleared': () => {
      console.log('[canvas-selection] cleared')
      canvasStore.clearActiveIds()
      layerStore.clearSelected()
    },
  })

  // 将 canvas 存入 baseStore
  baseStore.setCanvas(canvas)
  syncSelectionIdsFromCanvas(canvasStore, canvas)
  ;(window as any).__debugCanvas = canvas

  // 初始化缩放
  zoomManager?.updateZoom?.()

  // 历史管理
  historyStore.attachCanvas(canvas as any, baseStore as any)
  historyStore.saveInitial()
  historyStore.registerCanvasEvents()

  // 扫描并注册自定义属性
  discoverAndRegisterCanvasProps(canvas.getObjects() as unknown[])

  canvas.on('object:added', (e) => {
    const target = (e as unknown as { target?: unknown }).target as any

    const normalizeGlobalObject = (obj: any) => {
      if (!obj || (obj as any).eleType !== 'global') return
      obj.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
      })
      obj.setCoords?.()
    }

    const shouldApplyDesignerControls = (obj: any): boolean => {
      if (!obj) return false
      const eleType = (obj as any).eleType as string | undefined
      if (!eleType) return false
      if (!DESIGNER_CONTROL_TYPES.includes(eleType)) return false
      return (obj as any).hasControls !== false
    }

    if (target) {
      elementManager.registerElementInstance(target as any)
      normalizeGlobalObject(target)
      if (shouldApplyDesignerControls(target)) {
        applyControlsToObject(target)
      }
      discoverAndRegisterCanvasProps([target])
    } else {
      const objects = canvas.getObjects() as any[]
      elementManager.syncElementInstancesFromCanvas(objects as any)
      objects.forEach((obj) => {
        normalizeGlobalObject(obj)
        if (shouldApplyDesignerControls(obj)) {
          applyControlsToObject(obj as any)
        }
      })
      discoverAndRegisterCanvasProps(objects as unknown[])
    }
  })

  canvas.on('object:removed', (e) => {
    const target = (e as unknown as { target?: unknown }).target as any
    elementManager.unregisterElementInstance(target as any)
  })

  // 监听撤销/重做事件
  emitter.on('canvas-undo', () => {
    void historyStore.undo()
  })
  emitter.on('canvas-redo', () => {
    void historyStore.redo()
  })

  fabricCanvas = canvas
  return canvas
}

export function disposeCanvasManager(): void {
  // 读取一次 fabricCanvas 以满足 TS 对“已声明未读取”的检查要求
  void fabricCanvas

  emitter.off('canvas-undo')
  emitter.off('canvas-redo')

  // 此处暂不销毁 fabricCanvas，由上层（如 baseStore）按需要处理
  fabricCanvas = null
}
