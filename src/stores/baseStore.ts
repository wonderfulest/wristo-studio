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
import {
  generateConfig as generateRuntimeConfig,
  resolvePackageAssetUrls,
  validateRuntimeConfigForExport,
} from '@/engine/services/exportService'
import { buildDesignAssetBundle } from '@/engine/services/designAssetBundleService'
import { persistAndSaveDesignConfig } from '@/engine/services/persistBlobAssetUrls'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useEditorStore } from '@/stores/editorStore'
import { useUserStore } from '@/stores/user'
import { getDeviceDetailByDeviceId, type GarminDeviceVO as GarminDeviceDetailVO } from '@/api/device'
import { getProduct } from '@/api/products'
import * as elementManager from '@/engine/managers/elementManager'
// Local minimal types to keep migration safe
// For stricter typing, define interfaces in src/types and import them here later.
type AnyObject = Record<string, any>

type Screenshot = string | null

type CanvasLike = Canvas | null

type CaptureScreenshotOptions = {
  includeDeviceFrame?: boolean
}

type GenerateConfigStoreOptions = {
  validateBindings?: boolean
}

type DeviceDisplayLocation = {
  x: number
  y: number
  width: number
  height: number
}

type ViewportTransform = [number, number, number, number, number, number]

const IDENTITY_VIEWPORT_TRANSFORM: ViewportTransform = [1, 0, 0, 1, 0, 0]

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    image.src = src
  })
}

const waitForNextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

const getValidDisplayLocation = (device: GarminDeviceDetailVO | null | undefined): DeviceDisplayLocation | null => {
  const location = device?.simulator?.display?.location
  const x = Number(location?.x)
  const y = Number(location?.y)
  const width = Number(location?.width)
  const height = Number(location?.height)

  if (![x, y, width, height].every(Number.isFinite)) return null
  if (width <= 0 || height <= 0) return null

  return { x, y, width, height }
}

const fillWatchFaceBackdrop = (context: CanvasRenderingContext2D, width: number, height: number): void => {
  context.save()
  context.fillStyle = '#000000'
  if (width === height) {
    context.beginPath()
    context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2)
    context.fill()
  } else {
    context.fillRect(0, 0, width, height)
  }
  context.restore()
}

const captureDesignCanvasDataURL = async (canvas: AnyObject, width: number, height: number): Promise<string> => {
  const viewportTransform = canvas.viewportTransform ? ([...canvas.viewportTransform] as ViewportTransform) : null

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
    await waitForNextFrame()
    canvas.setViewportTransform([...IDENTITY_VIEWPORT_TRANSFORM] as ViewportTransform)
    canvas.renderAll()
    await waitForNextFrame()
    const fabricDataURL = canvas.toDataURL({
      left: 0,
      top: 0,
      width,
      height,
      multiplier: 1,
      format: 'png',
      quality: 1,
    } as any)
    const fabricImage = await loadImage(fabricDataURL)
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = Math.max(1, Math.round(width))
    outputCanvas.height = Math.max(1, Math.round(height))
    const context = outputCanvas.getContext('2d')
    if (!context) return fabricDataURL
    fillWatchFaceBackdrop(context, outputCanvas.width, outputCanvas.height)
    context.drawImage(fabricImage, 0, 0, outputCanvas.width, outputCanvas.height)
    return outputCanvas.toDataURL('image/png')
  } finally {
    if (viewportTransform) {
      canvas.setViewportTransform(viewportTransform)
    }
    canvas.renderAll()
  }
}

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
    inCanvasWorkarea: false as boolean,
    designLoading: false as boolean,
  }),

  getters: {
  },

  // actions
  actions: {
    setDesignLoading(flag: boolean): void {
      this.designLoading = flag
    },
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
    async captureScreenshot(options: CaptureScreenshotOptions = {}): Promise<string | null> {
      const canvasStore = useCanvasStore()
      const canvas = canvasStore.canvas
      if (!canvas) {
        console.error('没有可用的画布')
        return this.getFallbackScreenshot()
      }
      try {
        const designStore = useDesignStore()
        const designWidth = Number(designStore.designSpec.width || canvas.getWidth?.() || 0)
        const designHeight = Number(designStore.designSpec.height || canvas.getHeight?.() || 0)
        const canvasDataURL = await captureDesignCanvasDataURL(canvas, designWidth, designHeight)
        const dataURL = await this.captureScreenshotWithDeviceFrame(canvasDataURL, options)
        this.screenshot = dataURL
        return dataURL
      } catch (error) {
        console.error('截图捕获失败:', error)
        this.screenshot = null
        return null
      }
    },
    async captureScreenshotWithDeviceFrame(canvasDataURL: string, options: CaptureScreenshotOptions = {}): Promise<string> {
      const editorStore = useEditorStore()
      const includeDeviceFrame = options.includeDeviceFrame ?? editorStore.showDeviceFrame
      if (!includeDeviceFrame) return canvasDataURL

      const userStore = useUserStore()
      const currentDevice = userStore.userInfo?.device
      if (!currentDevice?.deviceId) return canvasDataURL

      let device = currentDevice as GarminDeviceDetailVO
      if (!device.deviceTransparentPng || !getValidDisplayLocation(device)) {
        try {
          const detailDevice = await getDeviceDetailByDeviceId(currentDevice.deviceId)
          device = {
            ...currentDevice,
            ...detailDevice,
            displayName: currentDevice.displayName || detailDevice.displayName,
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[baseStore] Failed to load device detail for framed screenshot', currentDevice.deviceId, error)
          }
          return canvasDataURL
        }
      }

      const frameUrl = device.deviceTransparentPng
      const location = getValidDisplayLocation(device)
      if (!frameUrl || !location) return canvasDataURL

      try {
        const [faceImage, frameImage] = await Promise.all([
          loadImage(canvasDataURL),
          loadImage(frameUrl),
        ])
        const designStore = useDesignStore()
        const designWidth = Number(designStore.designSpec.width || location.width)
        const designHeight = Number(designStore.designSpec.height || location.height)
        const scaleX = designWidth / location.width
        const scaleY = designHeight / location.height
        const outputWidth = Math.ceil(frameImage.naturalWidth * scaleX)
        const outputHeight = Math.ceil(frameImage.naturalHeight * scaleY)
        const outputCanvas = document.createElement('canvas')
        outputCanvas.width = outputWidth
        outputCanvas.height = outputHeight
        const context = outputCanvas.getContext('2d')
        if (!context) return canvasDataURL

        context.drawImage(frameImage, 0, 0, outputWidth, outputHeight)
        context.drawImage(
          faceImage,
          Math.round(location.x * scaleX),
          Math.round(location.y * scaleY),
          Math.round(designWidth),
          Math.round(designHeight),
        )
        return outputCanvas.toDataURL('image/png')
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[baseStore] Failed to compose framed screenshot', error)
        }
        return canvasDataURL
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
        bitmapMode: propertiesStore.bitmapMode,
        dataNumberFormat: propertiesStore.dataNumberFormat,
        maxFieldLength: propertiesStore.maxFieldLength,
        localization: designStore.getLocalizationConfig(),
        supportsChineseContent: designStore.supportsChineseContent,
        validateBindings: true,
      })
      if (!config) return false
      if (!(await validateRuntimeConfigForExport(config))) return false
      const exportConfig = await resolvePackageAssetUrls(config)
      if (!exportConfig) return false
      let designUid = this.id
      let res: any
      const persistedConfig = await persistAndSaveDesignConfig(exportConfig, async (saveConfig) => {
        if (!designUid) {
          const created = await designApi.createDesign({
            name: designStore.watchFaceName,
            description: designStore.watchFaceName,
          })
          if (created.code !== 0 || !created.data?.designUid) {
            ElMessage.error('创建设计失败！')
            throw new Error('创建设计失败！')
          }
          designUid = created.data.designUid
          this.id = designUid
          designStore.id = designUid
        }

        res = await designApi.updateDesign({
          uid: designUid,
          name: designStore.watchFaceName,
          configJson: JSON.stringify(saveConfig),
        })
        if (res.code !== 0) {
          throw new Error(res.msg || '保存设计失败！')
        }
      })
      this.id = res.data?.designUid || designUid
      designStore.id = this.id
      designUid = res.data?.designUid || designUid
      let previewDataUrl = ''
      try {
        previewDataUrl = await this.captureScreenshot() || ''
      } catch (error) {
        console.warn('Failed to capture preview for asset bundle:', error)
      }
      let bundleProduct: AnyObject | undefined
      if (this.appId > 0) {
        try {
          const productResponse = await getProduct(this.appId)
          if (productResponse.code === 0 && productResponse.data) {
            bundleProduct = productResponse.data
          }
        } catch (error) {
          console.warn('Failed to load product images for asset bundle:', error)
        }
      }
      const bundleFile = await buildDesignAssetBundle(
        { ...persistedConfig, designId: designUid },
        { previewDataUrl, appId: this.appId > 0 ? this.appId : undefined, product: bundleProduct },
      )
      if (bundleFile) {
        await designApi.uploadAssetBundle(designUid, bundleFile)
      }
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
    generateConfig(options: GenerateConfigStoreOptions = {}): import('@/types/app/config').RuntimeDesignConfig | null {
      const canvasStore = useCanvasStore()
      const propertiesStore = usePropertiesStore()
      const designStore = useDesignStore()
      return generateRuntimeConfig({
        canvas: canvasStore.canvas as any,
        properties: propertiesStore.allProperties,
        designId: this.id || designStore.id || '',
        watchFaceName: designStore.watchFaceName || this.watchFaceName,
        textCase: propertiesStore.textCase,
        bitmapMode: propertiesStore.bitmapMode,
        dataNumberFormat: propertiesStore.dataNumberFormat,
        maxFieldLength: propertiesStore.maxFieldLength,
        localization: designStore.getLocalizationConfig(),
        supportsChineseContent: designStore.supportsChineseContent,
        validateBindings: options.validateBindings ?? false,
      })
    },
  },
})
