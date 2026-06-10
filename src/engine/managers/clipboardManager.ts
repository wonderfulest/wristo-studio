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
}

// 剪贴板：存储最近一次复制的元素配置（基于 selection center 的相对偏移）
let selectionClipboard: ClipboardItem[] = []
// 记录复制时选区的中心点，便于粘贴时整体平移
let clipboardSelectionCenter: { x: number; y: number } | null = null
// 连续粘贴计数，用于实现 Figma 风格的递增偏移
let pasteCount = 0

// 安全计算对象在画布坐标系中的中心点，避免直接调用 Fabric 的 getCenterPoint 导致内部 getRelativeCenterPoint 报错
function getObjectCenter(obj: any): { x: number; y: number } {
  if (!obj) return { x: 0, y: 0 }

  const left = Number(obj.left ?? 0)
  const top = Number(obj.top ?? 0)

  const width = Number(obj.width ?? 0)
  const height = Number(obj.height ?? 0)

  const scaleX = Number(obj.scaleX ?? 1)
  const scaleY = Number(obj.scaleY ?? 1)

  return {
    x: left + (width * scaleX) / 2,
    y: top + (height * scaleY) / 2,
  }
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
    .map((el) => getObjectCenter(el))
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

    const cfg = encodeElementByRegistry(el)
    if (!cfg) return

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

    const item: ClipboardItem = {
      eleType,
      config: cfg as AnyElementConfig,
      // 基于 rect center 计算 offset
      offsetX: rectCenterX - selectionCenter.x,
      offsetY: rectCenterY - selectionCenter.y,
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

          const nextCfg: AnyElementConfig = {
            ...(item.config as AnyElementConfig),
            id: newId,
            eleType,
            left: centerX,
            top: centerY,
            originX: 'center',
            originY: 'center',
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
