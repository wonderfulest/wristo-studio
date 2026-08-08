// @vitest-environment jsdom
import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANVAS_LONG_PRESS_DELAY_MS } from '@/utils/canvasPan'
import { useCanvasPan } from './useCanvasPan'

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect

const pointerEvent = (type: string, target: EventTarget, options: { pointerId?: number; clientX?: number; clientY?: number } = {}): PointerEvent => {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0
  }) as PointerEvent
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    isPrimary: { value: true },
    target: { value: target }
  })
  return event
}

const setup = (findCanvasTarget: () => unknown = () => null) => {
  const center = document.createElement('div')
  const stage = document.createElement('div')
  const upperCanvas = document.createElement('canvas')
  center.append(stage)
  document.body.append(center)

  center.getBoundingClientRect = () => rect(0, 0, 600, 500)
  stage.getBoundingClientRect = () => rect(100, 100, 300, 300)
  upperCanvas.getBoundingClientRect = () => rect(100, 100, 300, 300)

  const setPointerCapture = vi.fn()
  const releasePointerCapture = vi.fn()
  const hasPointerCapture = vi.fn(() => true)
  Object.assign(center, { setPointerCapture, releasePointerCapture, hasPointerCapture })

  const canvasAdapter = {
    syncCanvasOffset: vi.fn(),
    clearSelection: vi.fn(),
    cancelFabricInteractionForStagePan: vi.fn(() => true),
    finishFabricInteractionForPointerCancel: vi.fn()
  }
  const rulers = { refresh: vi.fn() }
  const watchedWidth = ref(454)

  const pan = useCanvasPan({
    centerAreaRef: ref(center),
    canvasStageRef: ref(stage),
    canvasRef: ref(canvasAdapter),
    canvasRulersRef: ref(rulers),
    upperCanvas: () => upperCanvas,
    findCanvasTarget,
    isRoundWatch: () => true,
    watchedLayout: () => [watchedWidth.value]
  })

  return { pan, center, canvasAdapter, rulers, watchedWidth, setPointerCapture, releasePointerCapture }
}

describe('useCanvasPan', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('starts immediately outside the watch face and constrains movement', async () => {
    const { pan, center, canvasAdapter, setPointerCapture } = setup()

    pan.handleCanvasPanPointerDown(pointerEvent('pointerdown', center, { clientX: 40, clientY: 40 }))
    expect(pan.isCanvasPanning.value).toBe(true)
    expect(canvasAdapter.clearSelection).toHaveBeenCalledOnce()
    expect(setPointerCapture).toHaveBeenCalledWith(1)

    pan.handleCanvasPanPointerMove(pointerEvent('pointermove', center, { clientX: -1000, clientY: -1000 }))
    expect(pan.panOffset.value).toEqual({ x: -296, y: -296 })

    pan.handleCanvasPanPointerEnd(pointerEvent('pointerup', center, { clientX: -1000, clientY: -1000 }))
    await nextTick()
    expect(pan.isCanvasPanning.value).toBe(false)

    pan.dispose()
  })

  it('takes over a Fabric interaction only after the long-press delay', () => {
    vi.useFakeTimers()
    const { pan, center, canvasAdapter } = setup(() => ({ id: 'selected' }))

    const down = pointerEvent('pointerdown', center, { clientX: 200, clientY: 200 })
    pan.handleCanvasPanPointerDown(down)
    expect(pan.isCanvasPanning.value).toBe(false)

    vi.advanceTimersByTime(CANVAS_LONG_PRESS_DELAY_MS)

    expect(canvasAdapter.cancelFabricInteractionForStagePan).toHaveBeenCalledWith(down)
    expect(pan.isCanvasPanning.value).toBe(true)
    expect(canvasAdapter.clearSelection).not.toHaveBeenCalled()

    pan.dispose()
  })

  it('disposes active pointer and scheduled viewport resources', async () => {
    vi.useFakeTimers()
    const { pan, center, canvasAdapter, releasePointerCapture, watchedWidth } = setup()

    pan.handleCanvasPanPointerDown(pointerEvent('pointerdown', center, { clientX: 40, clientY: 40 }))
    watchedWidth.value = 500
    await nextTick()
    pan.dispose()
    vi.runAllTimers()

    expect(releasePointerCapture).toHaveBeenCalledWith(1)
    expect(pan.isCanvasPanning.value).toBe(false)
    expect(canvasAdapter.syncCanvasOffset).not.toHaveBeenCalled()
  })
})
