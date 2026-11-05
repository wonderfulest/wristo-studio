import { Group, FabricImage, Rect } from 'fabric'
import type { FabricElement } from '@/types/element'
import { packageBitmapChars } from '@/engine/services/packageAssetRegistry'
import { listBitmapFontChars, type BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'
// 缓存 bitmap 字体的字符绑定，避免频繁请求
const bitmapCharCache = new Map<number, BitmapFontAssetRelationVO[]>()
// 控制同一时间元素的 bitmap Group 重建不并发执行，避免出现多个 time 元素


export function invalidateBitmapFontCache(fontId?: number | null) {
  if (fontId == null) {
    bitmapCharCache.clear()
    return
  }
  bitmapCharCache.delete(Number(fontId))
  // Explicit library selection/edit replaces the embedded snapshot too. Both
  // rendering and project export prefer package glyphs over the library cache.
  packageBitmapChars.delete(Number(fontId))
}

async function getBitmapChars(fontId: number): Promise<BitmapFontAssetRelationVO[]> {
  if (packageBitmapChars.has(fontId)) return packageBitmapChars.get(fontId)!
  if (bitmapCharCache.has(fontId)) return bitmapCharCache.get(fontId) as BitmapFontAssetRelationVO[]
  const res = await listBitmapFontChars(fontId)
  const list = (res.data || []) as BitmapFontAssetRelationVO[]
  bitmapCharCache.set(fontId, list)
  return list
}

// 根据时间字符串和 bitmapFontId 创建由图片组成的 Group
export async function createBitmapGlyphGroup(params: {
  id: string
  text: string
  options: any
}): Promise<FabricElement> {
  const { id, text, options } = params
  const fontId = options.bitmapFontId
  if (!fontId && options.eleType !== 'data') throw new Error('bitmapFontId is required for bitmap time group')

  const chars = fontId ? await getBitmapChars(fontId) : []
  const charMap = new Map<string, BitmapFontAssetRelationVO>()
  chars.forEach((r) => {
    if (typeof r.charValue === 'string') {
      charMap.set(r.charValue, r)
    }
  })

  const images: any[] = []
  const fontSize = Number(options.fontSize) || 24
  const spacing = options.fontGap != null ? Number(options.fontGap) : 4
  let currentX = 0

  for (const ch of text) {
    const rel = charMap.get(ch)
    const imgMeta = rel?.image
    const url = imgMeta?.previewUrl || imgMeta?.url
    if (!url) {
      if (options.eleType === 'data') images.push(new Rect({ left: currentX, top: 0, width: fontSize * 0.6, height: fontSize, fill: 'transparent', strokeWidth: 0, originX: 'left', originY: 'top', selectable: false, evented: false }))
      currentX += (options.eleType === 'data' ? fontSize * 0.6 : 0) + spacing
      continue
    }

    // 为每个字符创建全新的 FabricImage，避免复用导致 Group 内部状态冲突
    const img: any = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    if (!img || !img.width || !img.height) {
      if (options.eleType === 'data') images.push(new Rect({ left: currentX, top: 0, width: fontSize * 0.6, height: fontSize, fill: 'transparent', strokeWidth: 0, originX: 'left', originY: 'top', selectable: false, evented: false }))
      currentX += (options.eleType === 'data' ? fontSize * 0.6 : 0) + spacing
      continue
    }

    const scale = fontSize / img.height
    const scaledWidth = img.width * scale

    img.set({
      eleType: 'time-char',
      left: currentX,
      top: 0,
      originX: 'left',
      originY: 'top',
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      charValue: ch,
      bitmapFontId: fontId,
    })

    images.push(img)
    currentX += scaledWidth + spacing
  }

  const group = new Group(images as any) as any
  // 避免 fabric 的类型/内部 set 兼容问题，这里直接挂载自定义字段
  group.id = id
  group.eleType = options.eleType ?? 'time'
  group.left = options.left
  group.top = options.top
  group.originX = (options.originX ?? 'center') as any
  group.originY = (options.originY ?? 'center') as any
  group.formatter = options.formatter
  group.fontFamily = options.fontFamily
  group.dataProperty = options.dataProperty
  group.goalProperty = options.goalProperty
  group.metricSymbol = options.metricSymbol
  group.fillProperty = options.fillProperty
  group.displayStates = options.displayStates
  group.fontRenderType = 'bitmap'
  group.bitmapFontId = fontId
  group.isBitmapTimeGroup = group.eleType === 'time'
  group.isBitmapDataGroup = group.eleType === 'data'
  group.text = text
  group.fontSize = fontSize
  group.fill = options.fill ?? '#ffffff'
  ;(group as any).fontGap = spacing
  group.hasControls = true
  group.evented = true
  group.selectable = true
  group.lockScalingX = false
  group.lockScalingY = false

  return group as FabricElement
}


export const invalidateBitmapTimeFontCache = invalidateBitmapFontCache
