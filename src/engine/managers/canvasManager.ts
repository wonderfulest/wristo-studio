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
import type { Canvas as FabricCanvas } from 'fabric'

export interface CanvasManagerDeps {
  baseStore: any
  layerStore: any
  canvasStore: any
  historyStore: any
  editorStore: any
  watchSize: number
  zoomManager?: { updateZoom?: () => void } | null
}

let fabricCanvas: FabricCanvas | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
let keyupHandler: ((e: KeyboardEvent) => void) | null = null
let isSpacePressed = false

const RULER_OFFSET = 40

function syncSelectionIdsFromCanvas(canvasStore: any, canvas?: FabricCanvas | null) {
  if (!canvas) return
  const ids = (canvas.getActiveObjects() as Array<{ id?: string | number }>)
    .map((o) => o.id)
    .filter((id): id is string | number => id !== undefined && id !== null && id !== '')
    .map(String)
  canvasStore.setActiveIds(ids)
}

export function initCanvasManager(
  canvasElement: HTMLCanvasElement,
  deps: CanvasManagerDeps,
): FabricCanvas {
  const { baseStore, layerStore, canvasStore, historyStore, editorStore, watchSize, zoomManager } =
    deps

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
      if ((target as any).id) {
        layerStore.removeLayer(String((target as any).id))
      }
      layerStore.clearSelected()
      syncSelectionIdsFromCanvas(canvasStore, canvas as FabricCanvas)
    },
    onClone: (_source, cloned) => {
      layerStore.addLayer(cloned as any)
      if ((cloned as any).id) {
        layerStore.selectOne(String((cloned as any).id))
      }
      syncSelectionIdsFromCanvas(canvasStore, (cloned as any)?.canvas as FabricCanvas | undefined)
    },
  })

  const canvas = new Canvas(canvasElement, {
    width: watchSize,
    height: watchSize,
    centeredScaling: true,
    centeredRotation: true,
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
    'selection:created': () => {
      const active = canvas.getActiveObject() as any
      if (active && active.type === 'activeselection') {
        active.set({ hasControls: false })
        active.setCoords?.()
      }
      syncSelectionIdsFromCanvas(canvasStore, canvas)
    },
    'selection:updated': () => {
      const active = canvas.getActiveObject() as any
      if (active && active.type === 'activeselection') {
        active.set({ hasControls: false })
        active.setCoords?.()
      }
      syncSelectionIdsFromCanvas(canvasStore, canvas)
    },
    'selection:cleared': () => {
      canvasStore.clearActiveIds()
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
      normalizeGlobalObject(target)
      if (shouldApplyDesignerControls(target)) {
        applyControlsToObject(target)
      }
      discoverAndRegisterCanvasProps([target])
    } else {
      const objects = canvas.getObjects() as any[]
      objects.forEach((obj) => {
        normalizeGlobalObject(obj)
        if (shouldApplyDesignerControls(obj)) {
          applyControlsToObject(obj as any)
        }
      })
      discoverAndRegisterCanvasProps(objects as unknown[])
    }
  })

  // 键盘空格拖动画布（仅在非输入区域）
  keydownHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target) {
      const tag = target.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
      if (isEditable) return
    }

    if (e.code === 'Space' && !isSpacePressed) {
      isSpacePressed = true
      const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement | null
      if (canvasWrapper) {
        canvasWrapper.style.cursor = 'grab'
      }
      e.preventDefault()
    }
  }

  keyupHandler = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      isSpacePressed = false
      const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement | null
      if (canvasWrapper) {
        canvasWrapper.style.cursor = 'default'
      }
    }
  }

  window.addEventListener('keydown', keydownHandler)
  window.addEventListener('keyup', keyupHandler)

  // 监听撤销/重做事件
  emitter.on('canvas-undo', () => {
    historyStore.undo()
  })
  emitter.on('canvas-redo', () => {
    historyStore.redo()
  })

  // 初始化容器样式
  const containerInit = document.querySelector('.canvas-container') as HTMLElement | null
  if (containerInit) {
    containerInit.style.transform = 'translate(0px, 0px)'
    containerInit.style.transition = 'transform 0s'
    containerInit.style.backgroundColor = editorStore.backgroundColor
  }

  fabricCanvas = canvas
  return canvas
}

export function disposeCanvasManager(historyStore: any): void {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (keyupHandler) {
    window.removeEventListener('keyup', keyupHandler)
    keyupHandler = null
  }

  emitter.off('canvas-undo')
  emitter.off('canvas-redo')

  // 此处暂不销毁 fabricCanvas，由上层（如 baseStore）按需要处理
  fabricCanvas = null
}
