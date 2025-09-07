import { defineStore } from 'pinia'
import { Circle, FabricImage } from 'fabric'
import _ from 'lodash'
import { usePropertiesStore } from '@/stores/properties'
import { encodeElement } from '@/utils/elementCodec'
import type { FabricElement } from '@/types/element'
import { compareColor } from '@/utils/colorUtils'
import { useEditorStore } from '@/stores/editorStore'
import { nanoid } from 'nanoid'
import { designApi } from '@/api/wristo/design'
import { ElMessage } from 'element-plus'
// Local minimal types to keep migration safe
// For stricter typing, define interfaces in src/types and import them here later.
type AnyObject = Record<string, any>

type Screenshot = string | null

type CanvasLike = AnyObject | null

export const useBaseStore = defineStore('baseStore', {
  // store
  state: () => ({
    propertiesStore: usePropertiesStore(),
    canvas: null as CanvasLike,
    id: null as string | null, // 表盘ID
    watchFaceName: '' as string,
    WATCH_SIZE: 454 as number,
    themeBackgroundColors: ['#000000'] as string[],
    themeBackgroundImages: [] as string[],
    currentThemeIndex: 0 as number,
    textCase: 0 as number, // 文本大小写设置：0=默认, 1=全大写, 2=全小写, 3=驼峰
    labelLengthType: 1 as number, // 标签长度类型：1=短文本, 2=中等文本, 3=长文本
    showUnit: false as boolean, // 是否显示数据项单位
    screenshot: null as Screenshot, // 存储表盘截图数据
    // 添加背景元素的引用
    watchFaceCircle: null as AnyObject | null,
    backgroundImage: null as AnyObject | null
  }),

  getters: {
  },

  // actions
  actions: {
    // 取消所有选中对象
    deactivateObject(): void {
      if (!this.canvas) return
      if (this.canvas.getActiveObjects().length > 0) {
        for (const _ of this.canvas.getActiveObjects()) {
          this.canvas.discardActiveObject()
        }
      }
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
    captureScreenshot(forceRefresh: boolean = false): Promise<string | null> | string | null {
      if (!this.canvas) {
        console.error('没有可用的画布')
        return this.getFallbackScreenshot()
      }
      if (this.screenshot && !forceRefresh) {
        return this.screenshot
      }
      try {
        // 确保画布内容是最新的
        this.canvas.renderAll()
        
        // 获取截图数据
        const dataURL = this.canvas.toDataURL({
          format: 'png',
          quality: 1
        })
        
        // 保存截图数据到 state
        this.screenshot = dataURL
        
        return dataURL
      } catch (error) {
        console.error('截图捕获失败:', error)
        // 如果截图失败，使用备用图片
        return this.getFallbackScreenshot()
      }
    },
    // 获取备用截图
    getFallbackScreenshot(): Promise<string | null> {
      // 使用本地图片作为备用
      const localImagePath = '/screen-default.png';
      
      // 创建一个新的 Image 对象来加载本地图片
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.src = localImagePath;
      // 返回一个 Promise，当图片加载完成后解析
      return new Promise((resolve) => {
        img.onload = () => {
          // 创建一个临时画布来获取图片数据
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const ctx = tempCanvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          
          // 获取数据 URL
          const dataURL = tempCanvas.toDataURL('image/png');
          
          // 保存截图数据到 state
          this.screenshot = dataURL;
          
          resolve(dataURL);
        };
        
        img.onerror = () => {
          console.error('加载备用图片失败');
          // 即使备用图片加载失败也返回 null
          this.screenshot = null;
          resolve(null);
        };
      });
    },
    // 获取当前截图
    getScreenshot(): string | null {
      return this.screenshot
    },
    // 清除截图
    clearScreenshot(): void {
      this.screenshot = null
    },
    // 设置画布
    setCanvas(fabricCanvas: AnyObject): void {
      this.canvas = fabricCanvas
      // 禁用自动渲染，手动控制渲染时机
      this.canvas.renderOnAddRemove = false
    
      // 设置画布的裁剪路径
      this.canvas.set({
        clipPath: this.watchFaceCircle
      })
      this.addBackground()
    },
    // 添加背景
    addBackground(): void {
      const editorStore = useEditorStore()
      const center = this.$state.WATCH_SIZE * editorStore.zoomLevel / 2
      

      // 创建表盘背景圆
      this.watchFaceCircle = new Circle({
        eleType: 'global',
        left: center,
        top: center,
        originX: 'center',
        originY: 'center',
        radius: this.$state.WATCH_SIZE * editorStore.zoomLevel / 2,
        fill: this.$state.themeBackgroundColors[this.$state.currentThemeIndex] || '#000000',
        backgroundColor: 'transparent',
        selectable: false,
        evented: true
      }) as unknown as AnyObject

      // 设置背景图片
      const currentBgImage = this.$state.themeBackgroundImages[this.$state.currentThemeIndex]
      
      if (currentBgImage) {
        // fabric v6: fromURL returns a Promise
        FabricImage.fromURL(currentBgImage).then((img: AnyObject) => {
          if (!img) return
          // 计算缩放比例以填充圆形区域
          const scale = this.$state.WATCH_SIZE * editorStore.zoomLevel / Math.min(img.width, img.height)
          this.backgroundImage = img
          img.set({
            eleType: 'background-image',
            scaleX: scale,
            scaleY: scale,
            left: center,
            top: center,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          })
          this.canvas?.add(img)
          this.canvas?.moveObjectTo(img, 0)
        })
      }
      this.canvas?.add(this.watchFaceCircle)
      this.canvas?.set({
        clipPath: this.watchFaceCircle
      })
      // 确保背景圆在最上层
      this.canvas?.moveObjectTo(this.watchFaceCircle, 0)
        
    },
    // 更新背景元素大小和位置
    updateBackgroundElements(zoom?: number): void {
      const editorStore = useEditorStore()
      if (zoom && zoom != editorStore.zoomLevel) {
        editorStore.updateSetting('zoomLevel', zoom)
      }
      zoom = editorStore.zoomLevel
      const center = this.$state.WATCH_SIZE / 2
      const radius = this.$state.WATCH_SIZE / 2

      if (this.watchFaceCircle) {
        this.watchFaceCircle.set({
          left: center,
          top: center,
          originX: 'center',
          originY: 'center',
          radius: radius,
          strokeUniform: true,  // 确保边框均匀缩放
          strokeWidth: 1,
          selectable: false,
          evented: true,
          hasBorders: false,
          hasControls: false,
          backgroundColor: 'transparent'
        })
        this.watchFaceCircle.setCoords()
      }

      if (this.backgroundImage) {
        const scale = radius / Math.min(this.backgroundImage.width, this.backgroundImage.height)
        this.backgroundImage.set({
          left: center,
          top: center,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          strokeUniform: true,
          selectable: false,
          evented: false
        })
        this.backgroundImage.setCoords()
      }

      // 确保画布尺寸足够大
      if (this.canvas) {
        const size = this.$state.WATCH_SIZE * (zoom ?? 1)
        this.canvas.setDimensions({
          width: size,
          height: size
        })
        this.canvas.requestRenderAll()
      }
    },
    // 设置表盘名称
    setWatchFaceName(name: string): void {
      this.watchFaceName = name
    },
    // 创建或更新设计
    async createDesign(): Promise<boolean> {
      if (this.id) {
        ElMessage.error('createDesign 设计已存在！')
        return false
      }
      if (!this.watchFaceName) {
        ElMessage.error('请先设置表盘名称！')
        return false
      }
      const res: any = await designApi.updateDesign({
        uid: this.id ?? '',
        name: this.watchFaceName,
        configJson: JSON.stringify(this.generateConfig())
      })
      
      this.id = res.data.documentId
      return res.code === 0
    },
    // 获取所有对象
    getObjects(): any[] {
      return this.canvas ? this.canvas.getObjects() : []
    },
    // 获取选中对象
    getActiveObjects(): any[] {
      return this.canvas ? this.canvas.getActiveObjects() : []
    },
    // 切换主题
    toggleTheme(): void {
      // 更新背景颜色
      this.toggleThemeBackground()
      this.canvas?.renderAll()
    },
    // 切换主题背景
    toggleThemeBackground(): void {
      if (!this.canvas || !this.watchFaceCircle) {
        console.warn('画布不存在')
        return
      }

      const objects = this.canvas.getObjects()

      const watchFace = objects.find((obj: AnyObject) => obj.eleType === 'global')
      const oldBgImage = objects.find((obj: AnyObject) => obj.eleType === 'background-image')

      // 更新背景颜色
      if (watchFace) {
        watchFace.set('fill', this.themeBackgroundColors[this.currentThemeIndex])
      }

      // 先移除旧的背景图片
      if (oldBgImage) {
        this.canvas.remove(oldBgImage)
      }

      // 添加新的背景图片
      const currentBgImage = this.themeBackgroundImages[this.currentThemeIndex]
      // 如果有背景图片
      if (currentBgImage) {
        // 创建一个新的 Image 对象
        const img = new Image()
        img.onload = () => {
          // 创建 Fabric.Image 实例
          const fabricImage: AnyObject = new FabricImage(img, {
            eleType: 'background-image',
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
            
          }) as unknown as AnyObject

          // 计算缩放比例以填充圆形区域
          const scale = this.WATCH_SIZE / Math.min(img.width, img.height)

          // 计算居中位置
          const left = (this.WATCH_SIZE - img.width * scale) / 2
          const top = (this.WATCH_SIZE - img.height * scale) / 2

          fabricImage.set({
            scaleX: scale,
            scaleY: scale,
            left: left,
            top: top,
        
          })

          // 添加图片并设置层级
          this.canvas?.add(fabricImage)
          this.canvas?.moveObjectTo(fabricImage, 1) // 背景图片放在最底层

          if (watchFace) {
            this.canvas?.moveObjectTo(watchFace, 0) // 背景圆放在背景图片之上
          }
          this.canvas?.set({
            clipPath: this.watchFaceCircle
          })
          this.canvas?.renderAll()
          
        }
        img.onerror = (error) => { 
          console.error('加载图片出错', error)
        }
        // 设置图片源
        img.src = currentBgImage
        img.crossOrigin = 'anonymous'
      } 
      // 如果没有背景图片，确保背景圆在最底层
      else if (watchFace) {
        this.canvas.moveObjectTo(watchFace, 0)
        this.canvas.set({
          clipPath: this.watchFaceCircle
        })
        this.canvas.renderAll()
      }
    },
    // 生成配置
    generateConfig(): AnyObject | null {
      console.log('this.canvas', this.canvas)
      if (!this.canvas || !this.canvas.getObjects().length) {
        console.warn('没有元素')
        return null
      }
      const propertiesStore = usePropertiesStore()
      const config: AnyObject = {
        version: '1.0',
        properties: propertiesStore.allProperties,
        designId: this.id,
        name: this.watchFaceName,
        textCase: this.textCase,
        labelLengthType: this.labelLengthType,
        showUnit: this.showUnit,
        elements: [] as AnyObject[],
        orderIds: [] as string[],
        themeBackgroundImages: this.themeBackgroundImages
      }

      const objects: FabricElement[] = this.canvas.getObjects() as FabricElement[]
      // 元素在同类中的下标，用于配置
      let imageId = 0,
        timeId = 0,
        dateId = 0,
        subItemId = 0

      // 遍历每个元素
      for (const element of objects) {
        config.orderIds.push(element.id || 'tianchong-' + nanoid())
        if (element.eleType === 'background-image') continue
        if (element.eleType === 'global') continue
        
        // 使用编码器系统编码元素
        const encodeConfigNullable = encodeElement(element) as AnyObject | null
        if (!encodeConfigNullable) continue
        const encodeConfig = encodeConfigNullable
        
        // 颜色属性映射配置
        const colorMappings = [
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
        ]

        // 处理所有颜色属性映射
        colorMappings.forEach(({ source, target }) => {
          if (encodeConfig[source]) {
            if (encodeConfig[source] == 'transparent') {
              encodeConfig[source] = -1;
              return;
            }
            const matchingProperty = Object.entries(propertiesStore.allProperties)
              .find(([, p]: [string, any]) => {
                return (p as any).type == 'color' && compareColor((p as any).value, encodeConfig[source])
              })
            if (matchingProperty) {
              encodeConfig[target] = matchingProperty[0] // 返回 key 值
            }
          }
        })

        // 获取imageId
        if (encodeConfig.eleType == 'image') {
          encodeConfig.imageId = imageId // imageId 用于标识图片配置
          imageId++
        }
        // 获取timeId
        if (encodeConfig.eleType == 'time') {
          encodeConfig.timeId = timeId // timeId 用于标识时间配置
          timeId++
        }
        // 获取dateId
        if (encodeConfig.eleType == 'date') {
          encodeConfig.dateId = dateId // dateId 用于标识日期配置
          dateId++
        }

        // 刻度盘 获取subItemId
        if (encodeConfig.eleType == 'romans' || encodeConfig.eleType == 'tick12' || encodeConfig.eleType == 'tick60') {
          encodeConfig.subItemId = subItemId // subItemId 用于标识子项配置
          subItemId++
        }

        config.elements.push(encodeConfig)
      }
      return config
    },
  
  },
})
