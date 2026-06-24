import type { ElementType, FabricElement } from '@/types/element'
import type { AnyElementConfig } from '@/types/elements'
import { encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import { useCanvasStore } from '@/stores/canvasStore'
import { nanoid } from 'nanoid'
import { addElement } from '@/engine/managers/elementManager'
import { useHistoryStore } from '@/stores/historyStore'

// Selection-level clipboard state

type ClipboardItem = {
  eleType: ElementType
  config: AnyElementConfig
  offsetX: number
  offsetY: number
  anchorOffsetX: number
  anchorOffsetY: number
}

// 剪贴板：存储最近一次复制的元素配置（基于 selection center 的相对偏移）
let selectionClipboard: ClipboardItem[] = []
// 记录复制时选区的中心点，便于粘贴时整体平移
let clipboardSelectionCenter: { x: number; y: number } | null = null
// 连续粘贴计数，用于实现 Figma 风格的递增偏移
let pasteCount = 0

// 安全计算对象在画布坐标系中的视觉中心，避免把 left/top 误当成左上角或中心点。
function getObjectVisualCenter(obj: any): { x: number; y: number } {
  if (!obj) return { x: 0, y: 0 }

  const rect = typeof obj.getBoundingRect === 'function' ? obj.getBoundingRect() : null
  if (rect) {
    const left = Number(rect.left ?? 0)
    const top = Number(rect.top ?? 0)
    const width = Number(rect.width ?? 0)
    const height = Number(rect.height ?? 0)
    if ([left, top, width, height].every(Number.isFinite)) {
      return {
        x: left + width / 2,
        y: top + height / 2,
      }
    }
  }

  const left = Number(obj.left ?? 0)
  const top = Number(obj.top ?? 0)
  return {
    x: Number.isFinite(left) ? left : 0,
    y: Number.isFinite(top) ? top : 0,
  }
}

function getObjectCanvasAnchor(obj: any): { left: number; top: number } {
  if (!obj) return { left: 0, top: 0 }

  try {
    const point = typeof obj.getXY === 'function' ? obj.getXY() : null
    const left = Number(point?.x)
    const top = Number(point?.y)
    if (Number.isFinite(left) && Number.isFinite(top)) {
      return { left, top }
    }
  } catch {
    // Fall through to raw coordinates. Some Fabric objects can throw while their group is mutating.
  }

  const left = Number(obj.left ?? 0)
  const top = Number(obj.top ?? 0)
  return {
    left: Number.isFinite(left) ? left : 0,
    top: Number.isFinite(top) ? top : 0,
  }
}

function normalizeConfigCanvasPosition(config: AnyElementConfig, obj: any): AnyElementConfig {
  const nextConfig = { ...(config as AnyElementConfig) } as AnyElementConfig
  const anchor = getObjectCanvasAnchor(obj)
  const currentTop = Number((nextConfig as any).top)
  const nextTop = Math.round(anchor.top)

  ;(nextConfig as any).left = Math.round(anchor.left)
  ;(nextConfig as any).top = nextTop

  const topBase = Number((nextConfig as any).topBase)
  if (Number.isFinite(topBase) && Number.isFinite(currentTop)) {
    ;(nextConfig as any).topBase = topBase + (nextTop - currentTop)
  }

  return nextConfig
}

/**
 * 复制当前选中元素。
 */
export function copySelection(): void {
  const canvasStore = useCanvasStore()
  const canvas = canvasStore.canvas
  if (!canvas) return

  const actives = canvas.getActiveObjects() as FabricElement[]
  if (!actives || actives.length === 0) {
    selectionClipboard = []
    clipboardSelectionCenter = null
    pasteCount = 0
    return
  }

  // 计算选区中心（使用各元素的 centerPoint 平均值）
  const centers = actives
    .map((el) => getObjectVisualCenter(el))
    .filter((c) => Number.isFinite(c.x) && Number.isFinite(c.y))

  if (!centers.length) {
    selectionClipboard = []
    clipboardSelectionCenter = null
    pasteCount = 0
    return
  }

  const selectionCenter = {
    x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
    y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length,
  }

  clipboardSelectionCenter = selectionCenter
  pasteCount = 0

  const encoded: ClipboardItem[] = []

  actives.forEach((el, index) => {
    const rect = el.getBoundingRect()

    const encodedCfg = encodeElementByRegistry(el)
    if (!encodedCfg) return

    const cfg = normalizeConfigCanvasPosition(encodedCfg, el)

    const eleType =
      (cfg as any).eleType ?? (cfg as any).type ?? ((el as any).eleType as ElementType | undefined)

    if (!eleType) {
      console.warn('[ClipboardManager] copySelection: element has no eleType', {
        index,
        cfg,
        rawEleType: (el as any)?.eleType,
      })
      return
    }

    // 基于 boundingRect 计算真实中心
    const rectCenterX = rect.left + rect.width / 2
    const rectCenterY = rect.top + rect.height / 2
    const anchorLeft = Number((cfg as any).left ?? (el as any).left ?? rectCenterX)
    const anchorTop = Number((cfg as any).top ?? (el as any).top ?? rectCenterY)

    const item: ClipboardItem = {
      eleType,
      config: cfg as AnyElementConfig,
      // 基于 rect center 计算 offset
      offsetX: rectCenterX - selectionCenter.x,
      offsetY: rectCenterY - selectionCenter.y,
      anchorOffsetX: anchorLeft - rectCenterX,
      anchorOffsetY: anchorTop - rectCenterY,
    }

    encoded.push(item)
  })

  selectionClipboard = encoded
}

/**
 * 粘贴先前复制的元素。
 */
export function pasteSelection(): void {
  if (!selectionClipboard.length || !clipboardSelectionCenter) return

  // Figma 风格：连续粘贴递增偏移
  pasteCount += 1
  const baseOffset = 30 * pasteCount

  const pasteCenter = {
    x: clipboardSelectionCenter.x + baseOffset,
    y: clipboardSelectionCenter.y + baseOffset,
  }

  void (async () => {
    const historyStore = useHistoryStore()
    await historyStore.runWithoutRecording(async () => {
      for (const [index, item] of selectionClipboard.entries()) {
        try {
          const eleType = item.eleType
          if (!eleType) {
            console.warn('[ClipboardManager] pasteSelection: missing eleType in clipboard item', {
              index,
              item,
            })
            continue
          }

          const newId = nanoid()

          const centerX = pasteCenter.x + item.offsetX
          const centerY = pasteCenter.y + item.offsetY
          const originX = ((item.config as any).originX ?? 'center') as AnyElementConfig['originX']
          const originY = ((item.config as any).originY ?? 'center') as AnyElementConfig['originY']

          const nextCfg: AnyElementConfig = {
            ...(item.config as AnyElementConfig),
            id: newId,
            eleType,
            left: centerX + item.anchorOffsetX,
            top: centerY + item.anchorOffsetY,
            originX,
            originY,
          }

          await addElement(eleType as ElementType, nextCfg)
        } catch (e) {
          console.warn('[ClipboardManager] pasteSelection: failed to add element from clipboard', {
            index,
            item,
            e,
          })
        }
      }
    })
    historyStore.saveState('paste:selection')
  })()
}
