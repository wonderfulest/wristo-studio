import { defineStore } from 'pinia'
import _ from 'lodash'
import type { Canvas } from 'fabric'
import { usePropertiesStore } from '@/stores/properties'
import type { PropertiesMap } from '@/types/properties'
import type { FabricElement } from '@/types/element'
import { designApi } from '@/api/wristo/design'
import { ElMessage } from 'element-plus'
import { useCanvasStore } from '@/stores/canvasStore'
import { useDesignStore } from '@/stores/designStore'
import { generateConfig as generateRuntimeConfig } from '@/engine/services/exportService'
import { useElementDataStore } from '@/stores/elementDataStore'
import * as elementManager from '@/engine/managers/elementManager'
// Local minimal types to keep migration safe
// For stricter typing, define interfaces in src/types and import them here later.
type AnyObject = Record<string, any>

type Screenshot = string | null

type CanvasLike = Canvas | null

export const useBaseStore = defineStore('baseStore', {
  // store
  state: () => ({
    propertiesStore: usePropertiesStore(),
    canvas: null as CanvasLike,
    id: '' as string, // 表盘ID
    watchFaceName: '' as string,
    appId: -1 as number,
    screenshot: null as Screenshot, // 存储表盘截图数据
    watchFaceCircle: null as AnyObject | null,
    inCanvasWorkarea: false as boolean
  }),

  getters: {
  },

  // actions
  actions: {
    setInCanvasWorkarea(flag: boolean): void {
      this.inCanvasWorkarea = flag
    },
    // 将元素上的具体颜色值反向映射为属性 key（如 bgColor -> bgColorProperty）
    mapColorProperties(encodeConfig: import('@/types/elements').AnyElementConfig, properties: PropertiesMap): void {
      const colorMappings: Array<{ source: string; target: string }> = [
        { source: 'color', target: 'colorProperty' },
        { source: 'bgColor', target: 'bgColorProperty' },
        { source: 'stroke', target: 'strokeProperty' },
        { source: 'borderColor', target: 'borderColorProperty' },
        { source: 'bodyStroke', target: 'bodyStrokeProperty' },
        { source: 'headFill', target: 'headFillProperty' },
        { source: 'bodyFill', target: 'bodyFillProperty' },
        { source: 'fill', target: 'fillProperty' },
        { source: 'activeColor', target: 'activeColorProperty' },
        { source: 'inactiveColor', target: 'inactiveColorProperty' },
        { source: 'gridColor', target: 'gridColorProperty' },
        { source: 'xAxisColor', target: 'xAxisColorProperty' },
        { source: 'yAxisColor', target: 'yAxisColorProperty' },
        { source: 'xLabelColor', target: 'xLabelColorProperty' },
        { source: 'yLabelColor', target: 'yLabelColorProperty' },
        { source: 'levelColorHigh', target: 'levelColorHighProperty' },
        { source: 'levelColorMedium', target: 'levelColorMediumProperty' },
        { source: 'levelColorLow', target: 'levelColorLowProperty' },
      ]

      const encRec: Record<string, unknown> = encodeConfig as unknown as Record<string, unknown>
      for (const { source, target } of colorMappings) {
        const val = encRec[source]
        if (val === undefined) continue
        if (val === 'transparent') {
          encRec[source] = -1
          continue
        }
        const match = Object.entries(properties)
          .find(([, colorProperty]) => {
            if (colorProperty.type !== 'color') return false
            const propVal = String(colorProperty.value ?? '')
            const srcVal = String(val ?? '')
            return propVal.toLowerCase().slice(-6) === srcVal.toLowerCase().slice(-6)
          })
        if (match) {
          encRec[target] = match[0]
        }
      }
    },
    // 取消所有选中对象
    deactivateObject(): void {
      const canvasStore = useCanvasStore()
      canvasStore.deactivateObject()
    },
    // 捕获并保存表盘截图
    captureScreenshot(): Promise<string | null> {
      const canvasStore = useCanvasStore()
      const canvas = canvasStore.canvas
      if (!canvas) {
        console.error('没有可用的画布')
        return this.getFallbackScreenshot()
      }
      try {
        canvas.renderAll()
        const dataURL = canvas.toDataURL({
          multiplier: 1,
          format: 'png',
          quality: 1,
        } as any)
        this.screenshot = dataURL
        return Promise.resolve(dataURL)
      } catch (error) {
        console.error('截图捕获失败:', error)
        this.screenshot = null
        return Promise.resolve(null)
      }
    },
    // 获取备用截图
    getFallbackScreenshot(): Promise<string | null> {
      // 不再使用本地备用图片，直接返回 null
      this.screenshot = null
      return Promise.resolve(null)
    },
    // 获取当前截图
    getScreenshot(): string | null {
      return this.screenshot
    },
    // 清除截图
    clearScreenshot(): void {
      this.screenshot = null
    },
    // 设置画布与背景相关逻辑，全部委托给 canvasStore
    setCanvas(fabricCanvas: AnyObject): void {
      const canvasStore = useCanvasStore()
      canvasStore.setCanvas(fabricCanvas)
      this.canvas = canvasStore.canvas
    },

    async setBackgroundImageFromUrl(url: string | null, imageId?: number | null): Promise<void> {
      const canvasStore = useCanvasStore()
      const elementDataStore = useElementDataStore()
      await canvasStore.ensureFixedLayers()
      const canvas = canvasStore.canvas
      if (!canvas) return

      const bgObj = (canvas.getObjects?.() || []).find((o: any) => o && o.eleType === 'background') as any
      if (!bgObj) return
      const id = String(bgObj.id ?? '')
      if (!id) return

      const patch = {
        imageUrl: url ?? '',
        imageId: imageId ?? null,
      }

      // 单一数据源：先写入 elementDataStore
      const existingConfig = elementDataStore.getElementConfig(id)
      if (existingConfig) {
        elementDataStore.patchElement(id, patch as any)
      } else {
        elementDataStore.upsertElement({
          id,
          eleType: 'background',
          left: Number(bgObj.left ?? 0),
          top: Number(bgObj.top ?? 0),
          originX: bgObj.originX,
          originY: bgObj.originY,
          ...patch,
        } as any)
      }

      // 再驱动 renderer 更新画布
      elementManager.updateElementById(id, patch)

      canvasStore.enforceFixedLayerOrder()
      canvasStore.applyGlobalClipPath()
      canvas.requestRenderAll?.()
    },
    // 设置表盘名称（委托给 designStore）
    setWatchFaceName(name: string): void {
      const designStore = useDesignStore()
      designStore.setWatchFaceName(name)
      this.watchFaceName = designStore.watchFaceName
    },
    // 创建或更新设计（委托给 designStore + exportService）
    async createDesign(): Promise<boolean> {
      if (this.id) {
        ElMessage.error('createDesign 设计已存在！')
        return false
      }
      const designStore = useDesignStore()
      if (!designStore.watchFaceName) {
        ElMessage.error('请先设置表盘名称！')
        return false
      }
      const propertiesStore = usePropertiesStore()
      const canvasStore = useCanvasStore()
      const config = generateRuntimeConfig({
        canvas: canvasStore.canvas as any,
        properties: propertiesStore.allProperties,
        designId: this.id || '',
        watchFaceName: designStore.watchFaceName,
        textCase: propertiesStore.textCase,
        labelLengthType: propertiesStore.labelLengthType,
        showUnit: propertiesStore.showUnit,
      })
      const res: any = await designApi.updateDesign({
        uid: this.id ?? '',
        name: designStore.watchFaceName,
        configJson: JSON.stringify(config),
      })
      this.id = res.data.documentId
      designStore.id = this.id
      return res.code === 0
    },
    // 获取所有对象
    getObjects(): FabricElement[] {
      const canvasStore = useCanvasStore()
      return canvasStore.getObjects() as FabricElement[]
    },
    // 获取选中对象
    getActiveObjects(): FabricElement[] {
      const canvasStore = useCanvasStore()
      return canvasStore.getActiveObjects() as FabricElement[]
    },
    // 切换主题
    toggleTheme(): void {
      const canvasStore = useCanvasStore()
      canvasStore.toggleTheme()
    },
    // 生成配置（委托给 exportService）
    generateConfig(): import('@/types/app/config').RuntimeDesignConfig | null {
      const canvasStore = useCanvasStore()
      const propertiesStore = usePropertiesStore()
      const designStore = useDesignStore()
      return generateRuntimeConfig({
        canvas: canvasStore.canvas as any,
        properties: propertiesStore.allProperties,
        designId: this.id || designStore.id || '',
        watchFaceName: designStore.watchFaceName || this.watchFaceName,
        textCase: propertiesStore.textCase,
        labelLengthType: propertiesStore.labelLengthType,
        showUnit: propertiesStore.showUnit,
      })
    },
  },
})
