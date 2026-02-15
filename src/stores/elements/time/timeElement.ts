import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { FabricText, TextProps, Group, FabricImage } from 'fabric'
import { TimeFormatOptions } from '@/config/settings'
import type { TimeElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { listBitmapFontChars, type BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'

type TimeElementOptions = TimeElementConfig & TextProps

// 缓存 bitmap 字体的字符绑定，避免频繁请求
const bitmapCharCache = new Map<number, BitmapFontAssetRelationVO[]>()

async function getBitmapChars(fontId: number): Promise<BitmapFontAssetRelationVO[]> {
  if (bitmapCharCache.has(fontId)) return bitmapCharCache.get(fontId) as BitmapFontAssetRelationVO[]
  const res = await listBitmapFontChars(fontId)
  const list = (res.data || []) as BitmapFontAssetRelationVO[]
  bitmapCharCache.set(fontId, list)
  return list
}

// 根据时间字符串和 bitmapFontId 创建由图片组成的 Group
async function createBitmapTimeGroup(params: {
  id: string
  text: string
  options: TimeElementConfig
}): Promise<FabricElement> {
  const { id, text, options } = params
  const fontId = options.bitmapFontId
  if (!fontId) throw new Error('bitmapFontId is required for bitmap time group')

  const chars = await getBitmapChars(fontId)
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

  console.debug('[time/bitmap] createBitmapTimeGroup', {
    id,
    text,
    fontId,
    fontSize,
    charCount: chars.length,
  })

  for (const ch of text) {
    const rel = charMap.get(ch)
    const imgMeta = rel?.image
    const url = imgMeta?.previewUrl || imgMeta?.url
    if (!url) {
      currentX += spacing
      continue
    }

    // 使用 CORS 以便后续截图不被污染
    const img: any = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    if (!img || !img.width || !img.height) {
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
  group.eleType = 'time'
  group.left = options.left
  group.top = options.top
  group.originX = options.originX as any
  group.originY = options.originY as any
  group.formatter = options.formatter
  group.fontRenderType = 'bitmap'
  group.bitmapFontId = fontId
  group.isBitmapTimeGroup = true
  group.fontSize = fontSize
  group.fill = options.fill ?? '#ffffff'
  ;(group as any).fontGap = spacing
  group.hasControls = false

  return group as FabricElement
}

export const useTimeStore = defineStore('timeStore', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()
    return {
      updateInterval: null as number | null,
      baseStore,
      layerStore,
    }
  },

  actions: {
    formatTime(date: Date, formatter: number ) {
      let format = '--'
      const formatterOption = TimeFormatOptions.find((option) => option.value == formatter)
      if (formatterOption) {
        format = formatterOption.label
      }
      return moment(date).format(format)
    },
    async addElement(options: TimeElementConfig): Promise<FabricElement> {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add time element')
      }
      try {
        const text = this.formatTime(new Date(), options.formatter)
        const id = options.id || nanoid()

        console.debug('[time/addElement]', {
          id,
          text,
          fontRenderType: options.fontRenderType,
          bitmapFontId: options.bitmapFontId,
          fontSize: options.fontSize,
          fontFamily: options.fontFamily,
        })

        // bitmap 模式：创建由图片组成的 Group
        if (options.fontRenderType === 'bitmap' && options.bitmapFontId) {
          const group = await createBitmapTimeGroup({
            id,
            text,
            options,
          })
          this.baseStore.canvas.add(group as any)
          this.layerStore.addLayer(group as any)
          this.baseStore.canvas.setActiveObject(group as any)
          this.baseStore.canvas.renderAll()
          return group as any
        }

        // 默认：使用文本渲染
        const timeOptions: Partial<TimeElementOptions> = {
          id,
          eleType: 'time',
          left: options.left,
          top: options.top,
          originX: options.originX as 'center' | 'left' | 'right',
          originY: options.originY as 'center' | 'top' | 'bottom',
          fill: options.fill ?? '#ffffff',
          fontSize: Number(options.fontSize),
          fontFamily: options.fontFamily ?? 'roboto-condensed-regular',
          formatter: options.formatter,
          fontRenderType: options.fontRenderType ?? 'truetype',
          bitmapFontId: options.bitmapFontId ?? null,
          hasControls: false,
        }
        const element = new FabricText(text, timeOptions as TimeElementOptions)
        this.baseStore.canvas.add(element as FabricText)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.setActiveObject(element as FabricText)
        this.baseStore.canvas.renderAll()
        return element as any
      } catch (error) {
        console.error('Failed to create time element:', error)
        throw error
      }
    },
    async updateByTime(date: Date) {
      if (!this.baseStore.canvas) return
      const canvas: any = this.baseStore.canvas
      const objects = canvas.getObjects ? canvas.getObjects() : []
      let changed = false

      for (const obj of objects) {
        if (!obj || obj.eleType !== 'time') continue
        const fmt = obj.get ? obj.get('formatter') : obj.formatter
        const txt = this.formatTime(date, fmt)

        console.debug('[time/updateByTime] before update', {
          id: obj.id,
          txt,
          fontRenderType: obj.fontRenderType,
          bitmapFontId: obj.bitmapFontId,
          fontSize: obj.fontSize,
          type: obj.type,
        })

        const isGroup = (obj as any).type === 'group'
        // bitmap 模式：重建 Group 内的图片（用真实类型判断，避免 fontRenderType 被覆盖）
        if (isGroup && obj.bitmapFontId) {
          try {
            const group = await createBitmapTimeGroup({
              id: obj.id,
              text: txt,
              options: {
                id: obj.id,
                left: obj.left,
                top: obj.top,
                originX: obj.originX,
                originY: obj.originY,
                fill: obj.fill,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                formatter: fmt,
                fontRenderType: 'bitmap',
                bitmapFontId: obj.bitmapFontId,
                fontGap: (obj as any).fontGap,
              } as TimeElementConfig,
            })
            const index = canvas.getObjects().indexOf(obj)
            canvas.remove(obj)
            canvas.add(group)
            if (index >= 0) {
              canvas.moveObjectTo(group, index)
            }

            // 同步 layerStore 里该 layer 的 element 引用，避免面板/选中仍指向旧对象
            const layer = this.layerStore.layers.find((l: any) => l.id === String(obj.id))
            if (layer) {
              layer.element = group as any
            }
            changed = true
          } catch (e) {
            console.warn('update bitmap time element failed', e)
          }
        } else if (!isGroup) {
          // 默认文本模式
          if (obj.get && obj.set) {
            obj.set('text', txt)
          } else if (obj.text !== undefined) {
            obj.text = txt
          }
          console.debug('[time/updateByTime] text updated', { id: obj.id, txt })
          changed = true
        } else {
          // group 但没有 bitmapFontId：不做 text 更新
        }
      }

      if (changed) {
        canvas.renderAll && canvas.renderAll()
      }
    },
    async updateElement(element: FabricElement, config: TimeElementConfig) {
      if (!this.baseStore.canvas) return
      const obj: FabricElement = this.baseStore.canvas.getObjects().find((o: any) => o.id === element.id)
      if (!obj) return

      console.debug('[time/updateElement] start', {
        id: obj.id,
        fromType: (obj as any).type,
        fromRender: (obj as any).fontRenderType,
        toRender: config.fontRenderType,
        bitmapFontId: config.bitmapFontId,
      })

      const currentLeft = obj.left
      const currentTop = obj.top

      const canvas: any = this.baseStore.canvas

      const syncLayerElementRef = (id: string, newEl: any) => {
        const layer = this.layerStore.layers.find((l: any) => l.id === id)
        if (layer) {
          layer.element = newEl
        }
      }

      const isGroup = (obj as any).type === 'group'

      // 从 bitmap 切回 truetype：用 FabricText 替换 Group（用真实类型判断）
      if (config.fontRenderType === 'truetype' && isGroup) {
        try {
          const formatter = config.formatter ?? (obj as any).formatter ?? 0
          const text = this.formatTime(new Date(), Number(formatter))
          const preservedBitmapFontId = (obj as any).bitmapFontId ?? config.bitmapFontId ?? null

          const timeOptions: Partial<TimeElementOptions> = {
            id: String(obj.id || element.id || nanoid()),
            eleType: 'time',
            left: config.left ?? obj.left,
            top: config.top ?? obj.top,
            originX: (config.originX ?? obj.originX) as any,
            originY: (config.originY ?? obj.originY) as any,
            fill: config.fill ?? (obj as any).fill ?? '#ffffff',
            fontSize: Number(config.fontSize ?? (obj as any).fontSize ?? 14),
            fontFamily: config.fontFamily ?? (obj as any).fontFamily ?? 'roboto-condensed-regular',
            formatter,
            fontRenderType: 'truetype',
            bitmapFontId: preservedBitmapFontId,
            hasControls: false,
          }

          const newText: any = new FabricText(text, timeOptions as TimeElementOptions)
          // 直接挂载自定义字段，避免 _set 兼容问题
          newText.id = (timeOptions as any).id
          newText.eleType = 'time'
          newText.fontRenderType = 'truetype'
          newText.bitmapFontId = preservedBitmapFontId

          const index = canvas.getObjects().indexOf(obj)
          canvas.remove(obj)
          canvas.add(newText)
          if (index >= 0) {
            canvas.moveObjectTo(newText, index)
          }
          syncLayerElementRef(String((newText as any).id), newText)
          canvas.setActiveObject(newText as any)
          canvas.renderAll()

          console.debug('[time/updateElement] switched bitmap->truetype', { id: (newText as any).id })
        } catch (e) {
          console.warn('[time/updateElement] switch bitmap->truetype failed', e)
        }
        return
      }

      // 从 truetype 切到 bitmap：用 Group 替换 FabricText（需要 bitmapFontId）
      if (config.fontRenderType === 'bitmap' && !isGroup) {
        const fontId = config.bitmapFontId ?? (obj as any).bitmapFontId
        if (fontId) {
          try {
            const formatter = config.formatter ?? (obj as any).formatter ?? 0
            const text = this.formatTime(new Date(), Number(formatter))
            const group = await createBitmapTimeGroup({
              id: String(obj.id || element.id || nanoid()),
              text,
              options: {
                ...(config as any),
                id: String(obj.id || element.id || nanoid()),
                eleType: 'time',
                left: config.left ?? obj.left,
                top: config.top ?? obj.top,
                originX: (config.originX ?? obj.originX) as any,
                originY: (config.originY ?? obj.originY) as any,
                fontSize: config.fontSize ?? (obj as any).fontSize,
                formatter,
                fontRenderType: 'bitmap',
                bitmapFontId: fontId,
                fontGap: (config as any).fontGap ?? (obj as any).fontGap,
                topBase: 0,
              } as TimeElementConfig,
            })

            const index = canvas.getObjects().indexOf(obj)
            canvas.remove(obj)
            canvas.add(group as any)
            if (index >= 0) {
              canvas.moveObjectTo(group as any, index)
            }
            syncLayerElementRef(String((group as any).id), group)
            canvas.setActiveObject(group as any)
            canvas.renderAll()

            console.debug('[time/updateElement] switched truetype->bitmap', { id: (group as any).id, fontId })
          } catch (e) {
            console.warn('[time/updateElement] switch truetype->bitmap failed', e)
          }
          return
        }
      }

      // bitmap Group 的属性更新：避免对 Group 调用 set('text', ...)，统一采用重建方式
      if (isGroup && (config.fontRenderType == null || config.fontRenderType === 'bitmap')) {
        const fontId = config.bitmapFontId ?? (obj as any).bitmapFontId
        if (fontId) {
          const shouldRebuild =
            config.formatter !== undefined ||
            config.fontSize !== undefined ||
            config.bitmapFontId !== undefined ||
            config.left !== undefined ||
            config.top !== undefined ||
            config.originX !== undefined ||
            config.originY !== undefined ||
            config.fill !== undefined ||
            (config as any).fontGap !== undefined

          if (shouldRebuild) {
            try {
              const formatter = config.formatter ?? (obj as any).formatter ?? 0
              const text = this.formatTime(new Date(), Number(formatter))
              const group = await createBitmapTimeGroup({
                id: String(obj.id || element.id || nanoid()),
                text,
                options: {
                  ...(config as any),
                  id: String(obj.id || element.id || nanoid()),
                  eleType: 'time',
                  left: config.left ?? obj.left,
                  top: config.top ?? obj.top,
                  originX: (config.originX ?? obj.originX) as any,
                  originY: (config.originY ?? obj.originY) as any,
                  fill: config.fill ?? (obj as any).fill,
                  fontSize: config.fontSize ?? (obj as any).fontSize,
                  formatter,
                  fontRenderType: 'bitmap',
                  bitmapFontId: fontId,
                  fontGap: (config as any).fontGap ?? (obj as any).fontGap,
                  topBase: 0,
                } as TimeElementConfig,
              })

              const index = canvas.getObjects().indexOf(obj)
              canvas.remove(obj)
              canvas.add(group as any)
              if (index >= 0) {
                canvas.moveObjectTo(group as any, index)
              }
              syncLayerElementRef(String((group as any).id), group)
              canvas.setActiveObject(group as any)
              canvas.renderAll()
              console.debug('[time/updateElement] bitmap group rebuilt', { id: (group as any).id, fontId })
            } catch (e) {
              console.warn('[time/updateElement] bitmap group rebuild failed', e)
            }
            return
          }
        }
      }

      const updateProps: Record<string, any> = {
        fontSize: config.fontSize,
        fill: config.fill,
        fontFamily: config.fontFamily,
        formatter: config.formatter,
        fontRenderType: config.fontRenderType,
        bitmapFontId: config.bitmapFontId,
        originX: config.originX,
        originY: config.originY,
      }

      Object.keys(updateProps).forEach((key) => {
        if (updateProps[key] !== undefined) {
          if (key === 'fill' && updateProps[key]) {
            obj.set(key, updateProps[key])
            const currentFormatter = obj.get('formatter')
            obj.set('text', this.formatTime(new Date(), currentFormatter))
          } else {
            obj.set(key, updateProps[key])
          }
        }
      })

      if (config.formatter !== undefined) {
        obj.set('text', this.formatTime(new Date(), config.formatter))
      }

      // 如果字体家族或字号发生变化，强制让 Fabric 重新计算文本尺寸，确保边框区域更新
      if ((config.fontFamily !== undefined || config.fontSize !== undefined) &&
        typeof (obj as any).initDimensions === 'function') {
        ;(obj as any).initDimensions()
      }

      if (config.left === undefined) {
        obj.set('left', currentLeft)
      }
      if (config.top === undefined) {
        obj.set('top', currentTop)
      }

      obj.setCoords()
      this.baseStore.canvas.renderAll()
    },
    encodeConfig(element: FabricElement): TimeElementConfig {
      const config: TimeElementConfig = {
        id: String(element.id ?? ''),
        eleType: 'time',
        left: element.left,
        top: element.top,
        originX: element.originX,
        originY: element.originY,
        fontFamily: element.fontFamily || 'roboto-condensed-regular',
        fontSize: element.fontSize || 14,
        fill: element.fill as string,
        formatter: Number((element as any).formatter ?? 0),
        fontRenderType: (element as any).fontRenderType ?? 'truetype',
        bitmapFontId: (element as any).bitmapFontId ?? null,
        fontGap: (element as any).fontGap,
        // 仅用于导出：文字 baseline 的纵坐标
        topBase: encodeTopBaseForElement(element),
      }
      return config as TimeElementConfig
    },
    decodeConfig(config: TimeElementConfig): Partial<FabricElement> {
      const elementConfig: Partial<FabricElement> = {
        id: config.id,
        eleType: 'time',
        left: config.left,
        top: config.top,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fill: config.fill,
        originX: config.originX,
        originY: config.originY,
        formatter: config.formatter,
        fontRenderType: config.fontRenderType ?? 'truetype',
        bitmapFontId: config.bitmapFontId ?? null,
        fontGap: config.fontGap,
      }
      return elementConfig as Partial<FabricElement>
    },
  },
})
