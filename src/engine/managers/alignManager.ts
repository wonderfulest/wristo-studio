import type { FabricElement } from '@/types/element'
import { useCanvasStore } from '@/stores/canvasStore'
import { useHistoryStore } from '@/stores/historyStore'

/**
 * Align / Distribute Manager
 * 只关心当前选中元素的几何布局，不涉及元素类型和业务配置。
 */

function getActiveElements(): FabricElement[] {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return []
  return (canvas.getActiveObjects() || []) as FabricElement[]
}

function requestRender() {
  const canvasStore = useCanvasStore()
  canvasStore.canvas?.requestRenderAll?.()
}

function commitHistory(reason: string) {
  try {
    const history = useHistoryStore()
    if (history && typeof history.saveState === 'function') {
      history.saveState(reason)
    }
  } catch (e) {
    console.warn('[AlignManager] commitHistory failed', { reason, e })
  }
}

function getRects(els: FabricElement[]) {
  return els.map((el) => ({ el, rect: el.getBoundingRect() }))
}

// ============ Align ============

export type AlignType =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'

/**
 * 将当前选中元素相互对齐（不移动整体到画布中心，只基于选区内部）。
 */
export function alignSelection(align: AlignType): void {
  const actives = getActiveElements()
  if (actives.length <= 1) return

  const items = getRects(actives)
  const minLeft = Math.min(...items.map((i) => i.rect.left))
  const maxRight = Math.max(...items.map((i) => i.rect.left + i.rect.width))
  const minTop = Math.min(...items.map((i) => i.rect.top))
  const maxBottom = Math.max(...items.map((i) => i.rect.top + i.rect.height))

  items.forEach(({ el, rect }) => {
    const target = { left: rect.left, top: rect.top } as { left: number; top: number }

    switch (align) {
      case 'left':
        target.left = minLeft
        break
      case 'right':
        target.left = maxRight - rect.width
        break
      case 'center': {
        const selectionCenterX = (minLeft + maxRight) / 2
        target.left = selectionCenterX - rect.width / 2
        break
      }
      case 'top':
        target.top = minTop
        break
      case 'bottom':
        target.top = maxBottom - rect.height
        break
      case 'middle': {
        const selectionCenterY = (minTop + maxBottom) / 2
        target.top = selectionCenterY - rect.height / 2
        break
      }
    }

    // 将基于 boundingRect 的 left/top 反写到对象坐标系
    const dx = target.left - rect.left
    const dy = target.top - rect.top
    const currentLeft = Number((el as any).left ?? 0)
    const currentTop = Number((el as any).top ?? 0)
    ;(el as any).set?.({ left: currentLeft + dx, top: currentTop + dy })
    el.setCoords?.()
  })

  requestRender()
  commitHistory(`align:${align}`)
}

// ============ Distribute ============

export type DistributeType = 'horizontal' | 'vertical'

/**
 * 在当前选中元素之间做等间距分布（保持两端元素位置不动）。
 */
export function distributeSelection(axis: DistributeType): void {
  const actives = getActiveElements()
  if (actives.length <= 2) return

  const items = getRects(actives)
  if (axis === 'horizontal') {
    // 按 left 排序
    items.sort((a, b) => a.rect.left - b.rect.left)
    const first = items[0]
    const last = items[items.length - 1]

    const firstLeft = first.rect.left
    const lastRight = last.rect.left + last.rect.width
    const totalSpan = lastRight - firstLeft
    const totalWidth = items.reduce((s, i) => s + i.rect.width, 0)
    const innerCount = items.length - 1
    const gap = (totalSpan - totalWidth) / innerCount

    // 从第一个元素的右边开始依次排布中间元素：prevRight + gap
    let currentRight = first.rect.left + first.rect.width
    items.forEach(({ el, rect }, idx) => {
      if (idx === 0 || idx === items.length - 1) return // 保持两端不动
      const targetLeft = currentRight + gap
      const dx = targetLeft - rect.left
      const currentLeft = Number((el as any).left ?? 0)
      ;(el as any).set?.({ left: currentLeft + dx })
      el.setCoords?.()
      currentRight = targetLeft + rect.width
    })
  } else {
    // vertical：按 top 排序
    items.sort((a, b) => a.rect.top - b.rect.top)
    const first = items[0]
    const last = items[items.length - 1]

    const firstTop = first.rect.top
    const lastBottom = last.rect.top + last.rect.height
    const totalSpan = lastBottom - firstTop
    const totalHeight = items.reduce((s, i) => s + i.rect.height, 0)
    const innerCount = items.length - 1
    const gap = (totalSpan - totalHeight) / innerCount

    // 从第一个元素的下边开始依次排布中间元素：prevBottom + gap
    let currentBottom = first.rect.top + first.rect.height
    items.forEach(({ el, rect }, idx) => {
      if (idx === 0 || idx === items.length - 1) return
      const targetTop = currentBottom + gap
      const dy = targetTop - rect.top
      const currentTop = Number((el as any).top ?? 0)
      ;(el as any).set?.({ top: currentTop + dy })
      el.setCoords?.()
      currentBottom = targetTop + rect.height
    })
  }

  requestRender()
  commitHistory(`distribute:${axis}`)
}
