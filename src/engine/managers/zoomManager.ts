import { Canvas } from 'fabric'

export interface ZoomManagerDeps {
  baseStore: any
  editorStore: any
  // 获取当前画布逻辑尺寸（watchSize）
  getWatchSize: () => number
  // 获取当前 viewport 偏移
  getCanvasOffset: () => { x: number; y: number }
  minZoom: number
  maxZoom: number
  zoomStep: number
}

export interface ZoomManagerHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  updateZoom: () => void
  dispose: () => void
}

/**
 * 纯 TS 缩放管理器：负责
 * - 绑定 / 解绑 wheel 事件
 * - 根据 editorStore.zoomLevel 与 watchSize 更新 Fabric viewportTransform
 */
export function attachZoomManager(deps: ZoomManagerDeps): ZoomManagerHandle {
  const { baseStore, editorStore, getWatchSize, getCanvasOffset, minZoom, maxZoom, zoomStep } = deps

  let wheelHandler: ((e: WheelEvent) => void) | null = null

  const updateZoom = () => {
    if (!baseStore.canvas) return

    const currentZoom = editorStore.zoomLevel
    const canvas = baseStore.canvas as Canvas
    const watchSize = getWatchSize()
    const offset = getCanvasOffset()

    canvas.setViewportTransform([
      currentZoom,
      0,
      0,
      currentZoom,
      offset.x,
      offset.y,
    ])

    // 逻辑尺寸跟随缩放一起放大，避免在高缩放时背景圆被右侧/下方边界裁切
    const scaledSize = watchSize * currentZoom
    canvas.setWidth(scaledSize)
    canvas.setHeight(scaledSize)

    canvas.calcOffset()
    canvas.requestRenderAll()
  }

  const zoomIn = () => {
    const prevZoom = editorStore.zoomLevel
    if (prevZoom < maxZoom) {
      const nextZoom = Math.min(prevZoom + zoomStep, maxZoom)
      editorStore.updateSetting('zoomLevel', nextZoom)
      updateZoom()
    }
  }

  const zoomOut = () => {
    const prevZoom = editorStore.zoomLevel
    if (prevZoom > minZoom) {
      const nextZoom = Math.max(prevZoom - zoomStep, minZoom)
      editorStore.updateSetting('zoomLevel', nextZoom)
      updateZoom()
    }
  }

  const resetZoom = () => {
    editorStore.updateSetting('zoomLevel', 1)
    updateZoom()
  }

  wheelHandler = (e: WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()

    const delta = e.deltaY
    if (delta < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  const bindWheelListener = () => {
    if (!baseStore.canvas || !wheelHandler) return
    baseStore.canvas.wrapperEl.addEventListener('wheel', wheelHandler, { passive: false })
  }

  const unbindWheelListener = () => {
    if (!baseStore.canvas || !wheelHandler) return
    baseStore.canvas.wrapperEl.removeEventListener('wheel', wheelHandler)
  }

  // 初次绑定 + 应用当前缩放
  bindWheelListener()
  updateZoom()

  const dispose = () => {
    unbindWheelListener()
    wheelHandler = null
  }

  return {
    zoomIn,
    zoomOut,
    resetZoom,
    updateZoom,
    dispose,
  }
}
