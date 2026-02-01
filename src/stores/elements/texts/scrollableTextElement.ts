import { defineStore } from 'pinia'
import { useBaseStore } from '../../baseStore'
import { useLayerStore } from '../../layerStore'
import { nanoid } from 'nanoid'
import { FabricText, Rect } from 'fabric'
import type { FabricElement } from '@/types/element'
import type { TextElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { getDataValueByName } from '@/utils/dataSimulator'

interface TextOptions {
  text?: string
  left?: number
  top?: number
  size?: number | string
  textColor?: string
  fontFamily?: string
  // 水平对齐方式固定为居中，外部不再传入其他值
  originX?: string
  originY?: string
  scrollAreaWidth?: number
  scrollAreaLeft?: number
  scrollAreaTop?: number
  scrollAreaBackground?: string
  textTemplate?: string
  textProperty?: string
}

export const useScrollableTextStore = defineStore('scrollableTextElement', {
  state: () => {
    const baseStore = useBaseStore()
    const layerStore = useLayerStore()

    return {
      baseStore,
      layerStore,
      scrollIntervals: {} as Record<string, number>,
      scrollRegionRects: {} as Record<string, any>,
    }
  },

  actions: {
    async addElement(options: TextOptions = {}) {
      console.log('Adding scrollable text element with options:', options)
      if (!this.baseStore.canvas) {
        throw new Error('Canvas is not initialized, cannot add scrollable text element')
      }

      try {
        const propertyKey = typeof options.textProperty === 'string' ? options.textProperty : ''
        const propertyValue = propertyKey
          ? (this.baseStore.propertiesStore?.allProperties as any)?.[propertyKey]?.value
          : undefined
        const template =
          (typeof propertyValue === 'string' && propertyValue !== ''
            ? propertyValue
            : (options.textTemplate ?? options.text))
          ?? 'New Text'
        const resolvedText = (template || '').replace(/\{\{([^}]+)\}\}/g, (_match: string, p1: string) => {
          const key = String(p1 || '').trim()
          return key ? getDataValueByName(key) : ''
        })

        const element = new FabricText(resolvedText || 'New Text', {
          id: nanoid(),
          eleType: 'scrollableText',
          left: options.left,
          top: options.top,
          fontSize: Number(options.size) || 36,
          fill: options.textColor || '#FFFFFF',
          fontFamily: options.fontFamily,
          selectable: true,
          hasControls: false,
          hasBorders: true,
          // 水平对齐方式只支持居中
          originX: 'center',
          originY: options.originY || 'center',
          scrollAreaWidth: options.scrollAreaWidth,
          // 如果未显式传入滚动区域位置，则默认使用元素自身的 left/top
          scrollAreaLeft: typeof options.scrollAreaLeft === 'number' ? options.scrollAreaLeft : options.left,
          scrollAreaTop: typeof options.scrollAreaTop === 'number' ? options.scrollAreaTop : options.top,
          scrollAreaBackground: options.scrollAreaBackground,
          textProperty: options.textProperty,
          textTemplate: template,
        } as any)

        this.baseStore.canvas.add(element as any)
        ;(element as any).elementId = (element as any).id
        this.layerStore.addLayer(element as any)
        this.baseStore.canvas.renderAll()
        this.baseStore.canvas.setActiveObject(element as any)

        this.startScrollableAnimation(element as any)

        return element
      } catch (error) {
        console.error('Failed to create scrollable text element:', error)
        throw error
      }
    },
    // 导出用：将画布上的 scrollableText 元素编码为通用 TextElementConfig
    encodeConfig(element: FabricElement): TextElementConfig {
      const fabricAny = element as any
      return {
        id: fabricAny.id ?? '',
        eleType: 'scrollableText',
        left: typeof element.left === 'number' ? element.left : 0,
        top: typeof element.top === 'number' ? element.top : 0,
        originX: (element as any).originX ?? 'center',
        originY: (element as any).originY ?? 'center',
        fill: (element as any).fill ?? '#FFFFFF',
        fontFamily: fabricAny.fontFamily ?? '',
        fontSize: typeof fabricAny.fontSize === 'number' ? fabricAny.fontSize : 18,
        scrollAreaWidth: typeof fabricAny.scrollAreaWidth === 'number' ? fabricAny.scrollAreaWidth : 454,
        scrollAreaLeft: typeof fabricAny.scrollAreaLeft === 'number' ? fabricAny.scrollAreaLeft : 227,
        scrollAreaTop: typeof fabricAny.scrollAreaTop === 'number' ? fabricAny.scrollAreaTop : (element.top as number),
        scrollAreaBackground: (fabricAny as any).scrollAreaBackground,
        textProperty: (fabricAny as any).textProperty,
        textTemplate: typeof fabricAny.textTemplate === 'string'
          ? fabricAny.textTemplate
          : (typeof fabricAny.text === 'string' ? fabricAny.text : ''),
        topBase: encodeTopBaseForElement(element),
      }
    },
    decodeConfig(config: TextElementConfig): Partial<FabricElement> {
      const propertyKey = typeof (config as any).textProperty === 'string' ? (config as any).textProperty : ''
      const propertyValue = propertyKey
        ? (this.baseStore.propertiesStore?.allProperties as any)?.[propertyKey]?.value
        : undefined
      const fallbackTemplate = (config as any).textTemplate ?? ''
      const textTemplate =
        (typeof propertyValue === 'string' && propertyValue !== '' ? propertyValue : fallbackTemplate) ?? ''
      const resolvedText = (textTemplate || '').replace(/\{\{([^}]+)\}\}/g, (_match: string, p1: string) => {
        const key = String(p1 || '').trim()
        return key ? getDataValueByName(key) : ''
      })

      const element: Partial<FabricElement> = {
        id: config.id,
        eleType: 'scrollableText',
        left: config.left,
        top: config.top,
        // 水平对齐方式固定为居中
        originX: 'center',
        originY: config.originY,
        fill: config.fill,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        scrollAreaWidth: config.scrollAreaWidth,
        scrollAreaLeft: config.scrollAreaLeft,
        scrollAreaTop: config.scrollAreaTop,
        scrollAreaBackground: config.scrollAreaBackground,
        textProperty: config.textProperty,
        textTemplate,
        text: resolvedText,
      } as any
      return element
    },
    pauseScrollableAnimation(element: FabricElement) {
      const id = String((element as any).id ?? '')
      if (!id) return
      if (this.scrollIntervals[id]) {
        clearInterval(this.scrollIntervals[id])
        delete this.scrollIntervals[id]
      }
    },
    showScrollRegion(element: FabricElement) {
      const canvas = this.baseStore.canvas
      if (!canvas) return

      const t = element as any
      const id = String(t.id ?? '')
      if (!id) return

      console.log('[scrollableText] showScrollRegion', {
        id,
        left: t.left,
        top: t.top,
        scrollAreaLeft: t.scrollAreaLeft,
        scrollAreaTop: t.scrollAreaTop,
        scrollAreaWidth: t.scrollAreaWidth,
        clipPath: !!t.clipPath,
      })

      // 若已存在边界矩形，先移除
      const prevRect = this.scrollRegionRects[id]
      if (prevRect) {
        canvas.remove(prevRect as any)
        delete this.scrollRegionRects[id]
      }

      const baseX = t.scrollAreaLeft;
      const configuredAreaWidth = Number(t.scrollAreaWidth ?? canvas.getWidth() ?? 0)
      const areaWidth = Math.max(configuredAreaWidth,  0)
      const originX = (t.originX ?? 'center') as string
      const originY = (t.originY ?? 'top') as string
      let regionStart = baseX;
      if (originX === 'center') {
        regionStart = baseX - areaWidth / 2
      } else if (originX === 'right') {
        regionStart = baseX - areaWidth
      }
      const regionEnd = regionStart + areaWidth

      const textHeight = Number(t.height ?? t.fontSize ?? 20)
      // 垂直方向：始终跟随文本本身的位置，拖动文本时 Scroll Region 一起移动
      const baseY = Number(t.top ?? 0)
      t.scrollAreaTop = baseY
      let regionTop = baseY
      if (originY === 'center') {
        regionTop = baseY - textHeight / 2
      } else if (originY === 'bottom') {
        regionTop = baseY - textHeight
      }

      const bg = (t as any).scrollAreaBackground
      const hasBg = typeof bg === 'string' && bg !== '' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)'

      const rect = new Rect({
        left: regionStart,
        top: regionTop,
        width: regionEnd - regionStart,
        height: textHeight,
        stroke: '#0a90ff',
        strokeWidth: 1,
        fill: hasBg ? bg : 'rgba(0,0,0,0)',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      }) as any

      this.scrollRegionRects[id] = rect
      canvas.add(rect)

      // 确保矩形在当前文本对象的正下方（文本在上、矩形在下）
      const objects = canvas.getObjects()
      const textIndex = objects.indexOf(t)
      if (textIndex >= 0 && typeof (canvas as any).moveTo === 'function') {
        ;(canvas as any).moveTo(rect, textIndex)
      }

      // 再次确保文字在矩形之上
      if (typeof (t as any).bringToFront === 'function') {
        ;(t as any).bringToFront()
      }

      canvas.requestRenderAll()
    },
    hideScrollRegion(element: FabricElement) {
      const canvas = this.baseStore.canvas
      if (!canvas) return

      const id = String((element as any).id ?? '')
      if (!id) return

      const rect = this.scrollRegionRects[id]
      if (rect) {
        const t = element as any
        const bg = (t as any).scrollAreaBackground
        const hasBg = typeof bg === 'string' && bg !== '' && bg !== 'transparent' && bg !== 'rgba(0,0,0,0)'
        // 如果背景色非透明，则始终显示滚动区域，不在取消选中时移除
        if (hasBg) return
        canvas.remove(rect as any)
        delete this.scrollRegionRects[id]
        canvas.requestRenderAll()
      }
    },
    startScrollableAnimation(element: FabricElement) {
      const canvas = this.baseStore.canvas
      if (!canvas) return

      const id = String((element as any).id ?? '')
      if (!id) return

      if (this.scrollIntervals[id]) {
        clearInterval(this.scrollIntervals[id])
      }

      const t = element as any

      const syncScrollAreaAndClip = (updateBasePosition: boolean) => {
        const tt = element as any
        if (!tt) return

        const left = Number(tt.left ?? 0)
        const top = Number(tt.top ?? 0)

        // scrollAreaLeft/Top 代表“滚动窗口基准位置”，不应在滚动动画过程中被覆盖。
        // 仅在用户拖动/修改元素位置时更新它。
        if (updateBasePosition) {
          tt.scrollAreaLeft = left
          tt.scrollAreaTop = top
        }

        const configuredAreaWidth = Number(tt.scrollAreaWidth ?? canvas.getWidth() ?? 0)
        const areaWidth = Math.max(configuredAreaWidth, 0)
        const originX = (tt.originX ?? 'center') as string
        const originY = (tt.originY ?? 'top') as string

        const baseX = Number(tt.scrollAreaLeft ?? left)
        const baseY = Number(tt.scrollAreaTop ?? top)

        let regionStart = baseX
        if (originX === 'center') {
          regionStart = baseX - areaWidth / 2
        } else if (originX === 'right') {
          regionStart = baseX - areaWidth
        }

        const textHeight = Number(tt.height ?? tt.fontSize ?? 20)
        let regionTop = baseY
        if (originY === 'center') {
          regionTop = baseY - textHeight / 2
        } else if (originY === 'bottom') {
          regionTop = baseY - textHeight
        }

        if (tt.clipPath) {
          tt.clipPath.set({
            left: regionStart,
            top: regionTop,
            width: configuredAreaWidth,
            height: textHeight,
            absolutePositioned: true,
          })
          if (typeof tt.clipPath.setCoords === 'function') {
            tt.clipPath.setCoords()
          }
        }

        const rect = this.scrollRegionRects[id]
        if (rect) {
          rect.set({
            left: regionStart,
            top: regionTop,
            width: areaWidth,
            height: textHeight,
          })
          if (typeof rect.setCoords === 'function') {
            rect.setCoords()
          }
        }
      }

      // 绑定选中/取消选中事件：选中时暂停滚动并显示区域边界，取消选中时隐藏边界并恢复滚动
      if (!t.__scrollEventsBound) {
        t.on('selected', () => {
          this.pauseScrollableAnimation(t as FabricElement)
          ;(t as any).__scrollRegionVisible = true
          this.showScrollRegion(t as FabricElement)

          // 选中时确保文字在可视裁剪区域内（否则可能“选中了但字不见了”）
          const baseX = Number((t as any).scrollAreaLeft ?? t.left ?? 0)
          const baseY = Number((t as any).scrollAreaTop ?? t.top ?? 0)
          const configuredAreaWidth = Number((t as any).scrollAreaWidth ?? canvas.getWidth() ?? 0)
          const areaWidth = Math.max(configuredAreaWidth, 0)
          const originX = ((t as any).originX ?? 'center') as string

          let regionStart = baseX
          if (originX === 'center') {
            regionStart = baseX - areaWidth / 2
          } else if (originX === 'right') {
            regionStart = baseX - areaWidth
          }
          const regionEnd = regionStart + areaWidth
          const width = Number((t as any).width ?? 0)

          // 把文字拉回到窗口内：尽量放在窗口右侧边缘内，保证可见
          const nextLeft = Math.min(Math.max(baseX, regionStart), Math.max(regionEnd - Math.min(width, areaWidth), regionStart))
          ;(t as any).set('left', nextLeft)
          ;(t as any).set('top', baseY)
          ;(t as any).setCoords()

          // 同步 clipPath/矩形到基准位置
          syncScrollAreaAndClip(false)

          console.log('[scrollableText] selected -> ensure visible', {
            id: (t as any).id,
            baseX,
            baseY,
            areaWidth,
            regionStart,
            regionEnd,
            textWidth: width,
            appliedLeft: nextLeft,
            clipPath: (t as any).clipPath
              ? {
                  left: (t as any).clipPath.left,
                  top: (t as any).clipPath.top,
                  width: (t as any).clipPath.width,
                  height: (t as any).clipPath.height,
                }
              : null,
          })

          canvas.requestRenderAll()
        })
        t.on('deselected', () => {
          ;(t as any).__scrollRegionVisible = false
          this.hideScrollRegion(t as FabricElement)
          this.startScrollableAnimation(t as FabricElement)
        })

        t.on('moving', () => {
          this.pauseScrollableAnimation(t as FabricElement)
          syncScrollAreaAndClip(true)
          canvas.requestRenderAll()
        })

        t.on('modified', () => {
          syncScrollAreaAndClip(true)
          this.startScrollableAnimation(t as FabricElement)
        })

        t.__scrollEventsBound = true
      }

      const speed = 1
      const interval = window.setInterval(() => {
        const t = element as any
        if (!canvas || !t) return

        const width = Number(t.width ?? 0)
        const currentLeft = Number(t.left ?? 0)

        // 基准位置 x：第一次启动动画时记录，之后保持不变
        const baseX = t.scrollAreaLeft

        // 滚动区域宽度：使用 scrollAreaWidth，至少不小于文本本身宽度
        const configuredAreaWidth = Number(t.scrollAreaWidth ?? canvas.getWidth() ?? 0)
        const areaWidth = Math.max(configuredAreaWidth, 0)
        const originX = (t.originX ?? 'center') as string
        const originY = (t.originY ?? 'top') as string

        // 使用 clipPath 将滚动区域外的部分裁剪掉，垂直方向与文本完全对齐
        if (!t.clipPath) {
          let clipRegionStart = baseX
          if (originX === 'center') {
            clipRegionStart = baseX - configuredAreaWidth / 2
          } else if (originX === 'right') {
            clipRegionStart = baseX - configuredAreaWidth
          }

          const textHeight = Number(t.height ?? t.fontSize ?? 20)
          const baseY = typeof t.scrollAreaTop === 'number' ? t.scrollAreaTop : Number(t.top ?? 0)
          let clipTop = baseY
          if (originY === 'center') {
            clipTop = baseY - textHeight / 2
          } else if (originY === 'bottom') {
            clipTop = baseY - textHeight
          }

          const clipRect = new Rect({
            left: clipRegionStart,
            top: clipTop,
            width: configuredAreaWidth,
            height: textHeight,
            absolutePositioned: true,
          }) as any

          t.clipPath = clipRect
        } else {
          // 拖动后 scrollAreaLeft/Top 可能改变，确保 clipPath 始终对齐当前区域
          syncScrollAreaAndClip(false)
        }

        // 根据对齐方式和宽度计算滚动区域 [regionStart, regionEnd]
        let regionStart = baseX
        if (originX === 'center') {
          regionStart = baseX - areaWidth / 2
        } else if (originX === 'right') {
          regionStart = baseX - areaWidth
        }
        const regionEnd = regionStart + areaWidth

        // 初次启动时，让文本完全在区域右侧之外，从右边缘开始逐渐进入
        if (!t.__scrollInitDone) {
          t.set('left', regionEnd)
          t.setCoords()
          t.__scrollInitDone = true
        }

        // 文本从右向左移动
        let nextLeft = currentLeft - speed

        // 当整行文本完全从左侧离开可视区域后（nextLeft + width < regionStart），
        // 再从右侧边界 regionEnd 重新进入，这样会循环滚动。
        if (nextLeft + width < regionStart) {
          nextLeft = regionEnd
        }

        t.set('left', nextLeft)
        t.setCoords()

        canvas.requestRenderAll()
      }, 30)

      this.scrollIntervals[id] = interval
    },
  },
})
