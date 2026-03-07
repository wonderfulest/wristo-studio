import { defineStore } from 'pinia'
import { useBaseStore } from '@/stores/baseStore'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { nanoid } from 'nanoid'
import moment from 'moment'
import { FabricText, TextProps, Group, FabricImage } from 'fabric'
import { TimeFormatConstants, TimeFormatOptions } from '@/config/settings'
import type { TimeElementConfig } from '@/types/elements'
import type { FabricElement } from '@/types/element'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { listBitmapFontChars, type BitmapFontAssetRelationVO } from '@/api/wristo/bitmapFont'

type TimeElementOptions = TimeElementConfig & TextProps

// 缓存 bitmap 字体的字符绑定，避免频繁请求
const bitmapCharCache = new Map<number, BitmapFontAssetRelationVO[]>()
// 控制同一时间元素的 bitmap Group 重建不并发执行，避免出现多个 time 元素
const bitmapUpdateLocks = new Set<string>()

// 确保同一 id 的 bitmap 时间元素在画布上只存在一个 Group
function removeBitmapTimeGroupsById(canvas: any, id: string) {
  if (!canvas || !canvas.getObjects) return
  const objects = canvas.getObjects()
  objects.forEach((o: any) => {
    if (!o) return
    if (o.eleType !== 'time') return
    if (!o.bitmapFontId) return
    if (String(o.id) !== String(id)) return
    canvas.remove(o)
  })
}

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

  for (const ch of text) {
    const rel = charMap.get(ch)
    const imgMeta = rel?.image
    const url = imgMeta?.previewUrl || imgMeta?.url
    if (!url) {
      currentX += spacing
      continue
    }

    // 为每个字符创建全新的 FabricImage，避免复用导致 Group 内部状态冲突
    const img: any = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    if (!img || !img.width || !img.height) {
      currentX += spacing
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
  group.hasControls = true
  group.evented = true
  group.selectable = true
  group.lockScalingX = false
  group.lockScalingY = false

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
      const m = moment(date)
      const hour = m.format('HH') // 00~23
      const minute = m.format('mm') // 00~59

      switch (formatter) {
        case TimeFormatConstants.H10:
          return hour[0]        // 小时十位
        case TimeFormatConstants.H:
          return hour[1]        // 小时个位
        case TimeFormatConstants.M10:
          return minute[0]      // 分钟十位f
        case TimeFormatConstants.M:
          return minute[1]      // 分钟个位
        default: {
          return moment(date).format(format)
        }
      }
    },
    async addElement(options: TimeElementConfig): Promise<FabricElement> {
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add time element')
      }
      try {
        const elementDataStore = useElementDataStore()
        const text = this.formatTime(new Date(), options.formatter)
        const id = options.id || nanoid()

        // bitmap 模式：创建由图片组成的 Group
        if (options.fontRenderType === 'bitmap' && options.bitmapFontId) {
          const group = await createBitmapTimeGroup({
            id,
            text,
            options,
          })
          // 先移除画布上同 id 的旧 bitmap Group，避免同一个元素残留多份
          removeBitmapTimeGroupsById(this.baseStore.canvas, String(id))
          this.baseStore.canvas.add(group as any)
          this.layerStore.addLayer(group as any)
          this.baseStore.canvas.setActiveObject(group as any)
          this.baseStore.canvas.renderAll()

          // 写入业务配置到 ElementDataStore
          elementDataStore.upsertElement({
            id: String(id),
            eleType: 'time',
            left: (group as any).left,
            top: (group as any).top,
            originX: (group as any).originX,
            originY: (group as any).originY,
            fill: (group as any).fill,
            fontSize: options.fontSize,
            fontFamily: options.fontFamily,
            formatter: options.formatter,
            fontRenderType: 'bitmap',
            bitmapFontId: options.bitmapFontId,
            fontGap: options.fontGap,
          } as any)
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
          evented: true,
          selectable: true,
          lockScalingX: false,
          lockScalingY: false,
        }
        const element = new FabricText(text, timeOptions as TimeElementOptions)
        this.baseStore.canvas.add(element as FabricText)
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.setActiveObject(element as FabricText)
        this.baseStore.canvas.renderAll()

        // 写入业务配置到 ElementDataStore
        elementDataStore.upsertElement({
          id: String(id),
          eleType: 'time',
          left: (element as any).left,
          top: (element as any).top,
          originX: (element as any).originX,
          originY: (element as any).originY,
          fill: (element as any).fill,
          fontSize: (element as any).fontSize,
          fontFamily: (element as any).fontFamily,
          formatter: options.formatter,
          fontRenderType: (element as any).fontRenderType,
          bitmapFontId: options.bitmapFontId ?? null,
          fontGap: (options as any).fontGap,
        } as any)
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
        const isGroup = (obj as any).type === 'group'
        // bitmap 模式：重建 Group 内的图片（用真实类型判断，避免 fontRenderType 被覆盖）
        if (isGroup && obj.bitmapFontId) {
          try {
            const prevScaleX = Number(obj.scaleX ?? 1)
            const prevScaleY = Number(obj.scaleY ?? 1)
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
            ;(group as any).set?.({
              scaleX: Number.isFinite(prevScaleX) ? prevScaleX : 1,
              scaleY: Number.isFinite(prevScaleY) ? prevScaleY : 1,
              hasControls: false,
              evented: true,
              selectable: true,
              lockScalingX: false,
              lockScalingY: false,
            })
            const index = canvas.getObjects().indexOf(obj)
            canvas.remove(obj)
            // 清理同 id 的其他 bitmap Group，再添加新的
            removeBitmapTimeGroupsById(canvas, String(obj.id))
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

      const canvas: any = this.baseStore.canvas
      const elementDataStore = useElementDataStore()

      const syncLayerElementRef = (id: string, newEl: any) => {
        const layer = this.layerStore.layers.find((l: any) => l.id === id)
        if (layer) {
          layer.element = newEl
        }
      }

      const isGroup = (obj as any).type === 'group'

      const patchConfigFromObject = (target: any) => {
        if (!target?.id) return
        elementDataStore.patchElement(String(target.id), {
          left: target.left,
          top: target.top,
          originX: target.originX,
          originY: target.originY,
          fill: target.fill,
          fontSize: target.fontSize,
          fontFamily: target.fontFamily,
          formatter: target.formatter,
          fontRenderType: target.fontRenderType,
          bitmapFontId: target.bitmapFontId,
          fontGap: (target as any).fontGap,
        } as any)
      }

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
            evented: true,
            selectable: true,
            lockScalingX: false,
            lockScalingY: false,
          }

          const newText: any = new FabricText(text, timeOptions as TimeElementOptions)
          // 直接挂载自定义字段，避免 _set 兼容问题
          newText.id = (timeOptions as any).id
          newText.eleType = 'time'
          newText.fontRenderType = 'truetype'
          newText.bitmapFontId = preservedBitmapFontId
          newText.set({
            scaleX: Number(obj.scaleX ?? 1),
            scaleY: Number(obj.scaleY ?? 1),
            hasControls: false,
            evented: true,
            selectable: true,
            lockScalingX: false,
            lockScalingY: false,
          })

          const index = canvas.getObjects().indexOf(obj)
          canvas.remove(obj)
          canvas.add(newText)
          if (index >= 0) {
            canvas.moveObjectTo(newText, index)
          }
          syncLayerElementRef(String((newText as any).id), newText)
          canvas.setActiveObject(newText as any)
          canvas.renderAll()

          patchConfigFromObject(newText)

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
            const lockId = String(obj.id || element.id || '')
            if (lockId && bitmapUpdateLocks.has(lockId)) {
              // 同一元素的 bitmap 重建正在进行中，避免并发执行
              return
            }
            if (lockId) bitmapUpdateLocks.add(lockId)
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
            ;(group as any).set?.({
              scaleX: Number(obj.scaleX ?? 1),
              scaleY: Number(obj.scaleY ?? 1),
              hasControls: false,
              evented: true,
              selectable: true,
              lockScalingX: false,
              lockScalingY: false,
            })

            const index = canvas.getObjects().indexOf(obj)
            canvas.remove(obj)
            // 清理同 id 的其他 bitmap Group，再添加新的
            removeBitmapTimeGroupsById(canvas, String(obj.id || element.id || ''))
            canvas.add(group as any)
            if (index >= 0) {
              canvas.moveObjectTo(group as any, index)
            }
            syncLayerElementRef(String((group as any).id), group)
            canvas.setActiveObject(group as any)
            canvas.renderAll()

            console.debug('[time/updateElement] switched truetype->bitmap', { id: (group as any).id, fontId })
            patchConfigFromObject(group)
          } catch (e) {
            console.warn('[time/updateElement] switch truetype->bitmap failed', e)
          } finally {
            const lockId = String(obj.id || element.id || '')
            if (lockId) bitmapUpdateLocks.delete(lockId)
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
              const lockId = String(obj.id || element.id || '')
              if (lockId && bitmapUpdateLocks.has(lockId)) {
                // 同一元素的 bitmap 重建正在进行中，避免并发执行
                return
              }
              if (lockId) bitmapUpdateLocks.add(lockId)
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
              ;(group as any).set?.({
                scaleX: Number(obj.scaleX ?? 1),
                scaleY: Number(obj.scaleY ?? 1),
                hasControls: false,
                evented: true,
                selectable: true,
                lockScalingX: false,
                lockScalingY: false,
              })

              const index = canvas.getObjects().indexOf(obj)
              canvas.remove(obj)
              // 清理同 id 的其他 bitmap Group，再添加新的
              removeBitmapTimeGroupsById(canvas, String(obj.id || element.id || ''))
              canvas.add(group as any)
              if (index >= 0) {
                canvas.moveObjectTo(group as any, index)
              }
              syncLayerElementRef(String((group as any).id), group)
              canvas.setActiveObject(group as any)
              canvas.renderAll()
              console.debug('[time/updateElement] bitmap group rebuilt', { id: (group as any).id, fontId })
              patchConfigFromObject(group)
            } catch (e) {
              console.warn('[time/updateElement] bitmap group rebuild failed', e)
            } finally {
              const lockId = String(obj.id || element.id || '')
              if (lockId) bitmapUpdateLocks.delete(lockId)
            }
            return
          }
        }
      }

      // 仅在传入字段有值时才更新，避免用 undefined 覆盖现有 fontFamily 等有效值
      const updateProps: Record<string, any> = {}
      if (config.fontSize !== undefined) {
        updateProps.fontSize = config.fontSize
      }
      if (config.fill !== undefined) {
        updateProps.fill = config.fill
      }
      if (config.fontFamily !== undefined) {
        updateProps.fontFamily = config.fontFamily
      }
      if (config.formatter !== undefined) {
        updateProps.formatter = config.formatter
      }
      if (config.fontRenderType !== undefined) {
        updateProps.fontRenderType = config.fontRenderType
      }
      if (config.bitmapFontId !== undefined) {
        updateProps.bitmapFontId = config.bitmapFontId
      }
      if (config.originX !== undefined) {
        updateProps.originX = config.originX
      }
      if (config.originY !== undefined) {
        updateProps.originY = config.originY
      }

      if (Object.keys(updateProps).length > 0) {
        if ((obj as any).set) {
          ;(obj as any).set(updateProps)
        } else {
          Object.assign(obj as any, updateProps)
        }
        obj.setCoords?.()
        canvas.renderAll?.()
        patchConfigFromObject(obj)
      }
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
