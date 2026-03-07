import { Canvas, FabricObject, Line } from 'fabric'

export interface GuidelineManagerDeps {
  baseStore: any
  editorStore: any
  getWatchSize: () => number
  getRulerOffset: () => number
}

export interface GuidelineManagerHandle {
  /** 当画布尺寸变化时调用，用于刷新辅助线尺寸 */
  updateForWatchSizeChange: () => void
  /** 释放所有事件与对象 */
  dispose: () => void
}

type GuidelineObject = FabricObject & {
  guideline?: boolean
  keyGuideline?: boolean
  type?: string
  left?: number
  top?: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  set: (props: Record<string, unknown>) => FabricObject
}

export function attachGuidelineManager(deps: GuidelineManagerDeps): GuidelineManagerHandle {
  const { baseStore, editorStore, getWatchSize, getRulerOffset } = deps

  let showKeyGuidelines = false
  let keyGuidelines: Line[] = []
  let keyDivisions = 4
  let removeCanvasMouseDown: (() => void) | null = null
  let unsubscribeEditor: (() => void) | null = null

  const createHorizontalGuideline = (y: number) => {
    const centerArea = document.querySelector('.center-area') as HTMLElement | null
    const width = centerArea ? centerArea.clientWidth - getRulerOffset() : getWatchSize()

    const line = new Line([-width, y, width * 2, y], {
      stroke: '#0a90ff',
      strokeWidth: 1,
      selectable: true,
      evented: true,
      lockMovementX: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hasBorders: false,
      originX: 'left',
      originY: 'top',
      hoverCursor: 'ns-resize',
      moveCursor: 'ns-resize',
      guideline: true,
      type: 'horizontalGuideline',
      perPixelTargetFind: true,
      targetFindTolerance: 5,
    })

    if (baseStore.canvas) {
      ;(baseStore.canvas as Canvas).add(line)
    }
    return line
  }

  const createVerticalGuideline = (x: number) => {
    const centerArea = document.querySelector('.center-area') as HTMLElement | null
    const height = centerArea ? centerArea.clientHeight - getRulerOffset() : getWatchSize()

    const line = new Line([x, -height, x, height * 2], {
      stroke: '#0a90ff',
      strokeWidth: 1,
      selectable: true,
      evented: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hasBorders: false,
      originX: 'left',
      originY: 'top',
      hoverCursor: 'ew-resize',
      moveCursor: 'ew-resize',
      guideline: true,
      type: 'verticalGuideline',
      perPixelTargetFind: true,
      targetFindTolerance: 5,
    })

    if (baseStore.canvas) {
      ;(baseStore.canvas as Canvas).add(line)
    }
    return line
  }

  const updateGuidelineSize = () => {
    if (!baseStore.canvas) return

    const centerArea = document.querySelector('.center-area') as HTMLElement | null
    if (!centerArea) return

    const width = centerArea.clientWidth - getRulerOffset()
    const height = centerArea.clientHeight - getRulerOffset()

    requestAnimationFrame(() => {
      const canvas = baseStore.canvas as Canvas
      canvas.getObjects().forEach((obj) => {
        const o = obj as GuidelineObject
        if (o.guideline) {
          if (o.type === 'horizontalGuideline') {
            o.set({
              x1: -width,
              x2: width * 2,
              y1: o.top,
              y2: o.top,
            })
          } else if (o.type === 'verticalGuideline') {
            o.set({
              x1: o.left,
              x2: o.left,
              y1: -height,
              y2: height * 2,
            })
          }
          o.setCoords()
        }
      })

      if (showKeyGuidelines) {
        createKeyGuidelines()
      }
    })
  }

  const createKeyGuidelines = () => {
    if (!baseStore.canvas) return

    keyGuidelines.forEach((guideline) => {
      ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
    })
    keyGuidelines = []

    const div = Math.max(2, Math.floor(keyDivisions))
    for (let i = 1; i < div; i++) {
      const vx = (getWatchSize() * i) / div
      const vy = (getWatchSize() * i) / div
      const v = createVerticalGuideline(vx)
      const h = createHorizontalGuideline(vy)
      v.set({
        stroke: '#ff0000',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: false,
        keyGuideline: true,
      })
      h.set({
        stroke: '#ff0000',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
        hasBorders: false,
        keyGuideline: true,
      })
      keyGuidelines.push(v)
      keyGuidelines.push(h)
    }

    ;(baseStore.canvas as Canvas).requestRenderAll()
  }

  const attachCanvasMouseDown = () => {
    if (!baseStore.canvas) return
    const canvas = baseStore.canvas as Canvas

    const handler = (opt: unknown) => {
      const e = (opt as { e?: MouseEvent }).e
      if (!e) return
      if (!editorStore.enableManualGuides) return
      const pointer = canvas.getPointer(e as MouseEvent)
      const hasCmd = e.metaKey || e.ctrlKey
      const hasShift = e.shiftKey
      const hasCtrl = e.ctrlKey

      if (hasCmd && hasShift) {
        createHorizontalGuideline(pointer.y)
      } else if (hasCmd && hasCtrl) {
        createVerticalGuideline(pointer.x)
      }
    }

    canvas.on('mouse:down', handler)
    removeCanvasMouseDown = () => {
      canvas.off('mouse:down', handler)
    }
  }

  // 初始化状态
  showKeyGuidelines = Boolean(editorStore.showKeyGuidelines)
  keyDivisions = Number(editorStore.keyGuidelineDivisions) || 4

  if (baseStore.canvas) {
    attachCanvasMouseDown()
  }

  if (showKeyGuidelines) {
    createKeyGuidelines()
  }

  // 监听 editorStore 配置变化
  if (typeof editorStore.$subscribe === 'function') {
    unsubscribeEditor = editorStore.$subscribe((_mutation: any, state: any) => {
      const nextShow = Boolean(state.showKeyGuidelines)
      const nextDivRaw = state.keyGuidelineDivisions
      const valid = [2, 3, 4, 5, 6, 8]
      const nextDiv = valid.includes(Number(nextDivRaw)) ? Number(nextDivRaw) : 4

      if (nextShow !== showKeyGuidelines) {
        showKeyGuidelines = nextShow
        if (showKeyGuidelines) {
          createKeyGuidelines()
        } else if (baseStore.canvas) {
          keyGuidelines.forEach((guideline) => {
            ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
          })
          keyGuidelines = []
          ;(baseStore.canvas as Canvas).requestRenderAll()
        }
      }

      if (nextDiv !== keyDivisions) {
        keyDivisions = nextDiv
        if (showKeyGuidelines) {
          createKeyGuidelines()
        }
      }
    })
  }

  const updateForWatchSizeChange = () => {
    updateGuidelineSize()
  }

  const dispose = () => {
    if (removeCanvasMouseDown) {
      removeCanvasMouseDown()
      removeCanvasMouseDown = null
    }
    window.removeEventListener('resize', updateGuidelineSize)

    if (baseStore.canvas) {
      keyGuidelines.forEach((guideline) => {
        ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
      })
      keyGuidelines = []
    }

    if (unsubscribeEditor) {
      unsubscribeEditor()
      unsubscribeEditor = null
    }
  }

  // 监听窗口尺寸，驱动辅助线长度刷新
  window.addEventListener('resize', updateGuidelineSize)

  return {
    updateForWatchSizeChange,
    dispose,
  }
}
