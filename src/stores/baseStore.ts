import { defineStore } from 'pinia'
import _ from 'lodash'
import type { Canvas } from 'fabric'
import { usePropertiesStore } from '@/stores/properties'
import type { PropertiesMap } from '@/types/properties'
import type { FabricElement } from '@/types/element'
import { designApi } from '@/api/wristo/design'
import { ElMessage } from 'element-plus'
import { useCanvasStore } from '@/stores/canvasStore'
import { useBackgroundStore } from '@/stores/backgroundStore'
import { useDesignStore } from '@/stores/designStore'
import { generateConfig as generateRuntimeConfig } from '@/engine/services/exportService'
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
    textCase: 0 as number, // 文本大小写设置：0=默认, 1=全大写, 2=全小写, 3=驼峰
    labelLengthType: 1 as number, // 标签长度类型：1=短文本, 2=中等文本, 3=长文本
    showUnit: false as boolean, // 是否显示数据项单位
    screenshot: null as Screenshot, // 存储表盘截图数据
    // 添加背景元素的引用
    watchFaceCircle: null as AnyObject | null,
    // 当前背景图片对应的 Fabric.Image 实例
    backgroundImage: null as AnyObject | null,
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
    // 设置标签长度类型并更新所有标签元素
    setLabelLengthType(value: number): void {
      this.labelLengthType = value
      // 如果没有画布，直接返回
      if (!this.canvas) {
        console.warn('没有画布，无法更新标签元素')
        return
      }
      
      // 获取所有对象
      const objects: AnyObject[] = this.canvas.getObjects()
      // 遇到标签元素时需要重新加载
      let labelCount = 0
      
      // 延迟执行以确保状态已更新
      setTimeout(() => {
        objects.forEach((obj: AnyObject) => {
          // 标签元素处理
          if (obj.eleType === 'label' && obj.metricSymbol) {
            labelCount++
            
            // 重新加载标签内容
            const metric = this.propertiesStore.getMetricByOptions({metricSymbol: obj.metricSymbol})
            
            if (metric) {
              // 根据 labelLengthType 选择合适的标签长度
              let newText = 'Label'
              
              if (typeof metric.enLabel === 'object') {
                if (this.labelLengthType === 1) { // 短文本
                  newText = metric.enLabel.short || metric.enLabel.medium || metric.enLabel.long || 'Label'
                } else if (this.labelLengthType === 2) { // 中等文本
                  newText = metric.enLabel.medium || metric.enLabel.short || metric.enLabel.long || 'Label'
                } else if (this.labelLengthType === 3) { // 长文本
                  newText = metric.enLabel.long || metric.enLabel.medium || metric.enLabel.short || 'Label'
                } else { // 默认使用短文本
                  newText = metric.enLabel.short || metric.enLabel.medium || metric.enLabel.long || 'Label'
                }
              } else {
                // 兼容旧版本，如果 enLabel 不是对象而是字符串
                newText = metric.enLabel
              }
              
              // 保存新的原始文本
              obj.originalText = newText
              
              // 应用文本大小写设置
              if (this.textCase === 1) { // 全大写
                newText = newText.toUpperCase()
              } else if (this.textCase === 2) { // 全小写
                newText = newText.toLowerCase()
              } else if (this.textCase === 3) { // 驼峰式
                newText = newText.replace(/\b\w/g, (c: string) => c.toUpperCase())
              }
              
              // 更新文本
              obj.set('text', newText)
            }
          }
        })
        
        // 强制重新渲染画布
        this.canvas?.renderAll()
        
      }, 10)
    },
    // 设置文本大小写并更新所有文本元素
    setTextCase(value: number): void {
      this.textCase = value
      // 如果没有画布，直接返回
      if (!this.canvas) {
        console.warn('没有画布，无法更新文本元素')
        return
      }
      
      // 获取所有对象
      const objects: AnyObject[] = this.canvas.getObjects()
      
      // 遍历并更新所有元素
      let dateCount = 0
      let labelCount = 0
      let stepsCount = 0
      
      // 延迟执行以确保状态已更新
      setTimeout(() => {
        objects.forEach((obj: AnyObject) => {
          // 日期元素处理
          if (obj.eleType === 'date') {
            dateCount++
            
            // 直接触发元素的更新函数
            if (typeof obj.updateTextCase === 'function') {
              try {
                obj.updateTextCase()
              } catch (error) {
                console.error('更新日期元素时出错:', error)
              }
            }
          } 
          // 标签元素处理
          else if (obj.eleType === 'label') {
            labelCount++
            
            // 如果有原始文本，则重新格式化
            if (obj.originalText) {
              let formattedText = obj.originalText as string
              
              // 应用文本大小写设置
              if (this.textCase === 1) { // 全大写
                formattedText = formattedText.toUpperCase()
              } else if (this.textCase === 2) { // 全小写
                formattedText = formattedText.toLowerCase()
              } else if (this.textCase === 3) { // 驼峰式
                formattedText = formattedText.replace(/\b\w/g, (c: string) => c.toUpperCase())
              }
              
              obj.set('text', formattedText)
            }
          }
          // 步数元素处理
          else if (obj.eleType === 'steps') {
            stepsCount++
            // 步数元素已经正常工作，不需要额外处理
          }
        })
        
        // 强制重新渲染画布
        this.canvas?.renderAll()
      }, 10)
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
      const backgroundStore = useBackgroundStore()
      backgroundStore.syncFromCanvas()
      this.watchFaceCircle = backgroundStore.watchFaceCircle as AnyObject | null
      this.backgroundImage = backgroundStore.backgroundImage as AnyObject | null
    },
    setBackgroundImageFromUrl(url: string | null, imageId?: number | null): void {
      const backgroundStore = useBackgroundStore()
      backgroundStore.setBackgroundImageFromUrl(url, imageId)
      this.backgroundImage = backgroundStore.backgroundImage as AnyObject | null
    },
    addBackground(): void {
      const backgroundStore = useBackgroundStore()
      backgroundStore.addBackground()
      this.watchFaceCircle = backgroundStore.watchFaceCircle as AnyObject | null
      this.backgroundImage = backgroundStore.backgroundImage as AnyObject | null
    },
    updateBackgroundElements(zoom?: number): void {
      const backgroundStore = useBackgroundStore()
      backgroundStore.updateBackgroundElements(zoom)
      this.watchFaceCircle = backgroundStore.watchFaceCircle as AnyObject | null
      this.backgroundImage = backgroundStore.backgroundImage as AnyObject | null
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
        textCase: this.textCase,
        labelLengthType: this.labelLengthType,
        showUnit: this.showUnit,
        backgroundImage: canvasStore.backgroundImage,
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
      const backgroundStore = useBackgroundStore()
      backgroundStore.toggleTheme()
      this.backgroundImage = backgroundStore.backgroundImage as AnyObject | null
      this.watchFaceCircle = backgroundStore.watchFaceCircle as AnyObject | null
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
        textCase: this.textCase,
        labelLengthType: this.labelLengthType,
        showUnit: this.showUnit,
        backgroundImage: canvasStore.backgroundImage,
      })
    },
  
  },
})
