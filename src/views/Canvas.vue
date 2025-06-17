<template>
  <div class="canvas-wrapper">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted, computed, watch } from 'vue'
import { Canvas, FabricObject, Line } from 'fabric'
import emitter from '@/utils/eventBus'
import { useBaseStore } from '@/stores/baseStore'
import { initAligningGuidelines } from '@/lib/aligning_guidelines'
import { initCenteringGuidelines } from '@/lib/centering_guidelines'
import { throttle } from '@/utils/performance'
import { debounce } from 'lodash-es'
import { useEditorStore } from '@/stores/editorStore'
const canvasRef = ref(null)
const baseStore = useBaseStore()
let updateInterval
const WATCH_SIZE = computed(() => baseStore.WATCH_SIZE)
const RULER_OFFSET = 40
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
const isDragging = ref(false)
const lastX = ref(0)
const lastY = ref(0)
const canvasOffset = ref({ x: 0, y: 0 })
const isSpacePressed = ref(false)
const editorStore = useEditorStore()
FabricObject.customProperties = ['id', 'eleType', 'metricSymbol', 'metricGroup']

// 绘制水平标尺
const drawHorizontalRuler = (ctx, width, zoom, canvasLeft) => {
  ctx.clearRect(0, 0, width, RULER_OFFSET)
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, width, RULER_OFFSET)
  ctx.strokeStyle = '#999'
  ctx.beginPath()
  
  // 计算起始位置，使手表表盘左上角为(0,0)点
  const rulerOffset = RULER_OFFSET // 标尺的宽度
  const startX = -canvasLeft / zoom  // 除以缩放因子
  const endX = startX + WATCH_SIZE.value / zoom + rulerOffset  + 800 // 除以缩放因子
  
  // 绘制刻度线
  for (let i = Math.floor(startX / 10) * 10; i <= endX; i += 10) {
    const x = (i * zoom + canvasLeft)  // 乘以缩放因子
    
    // 大刻度（100像素）
    if (i % 100 === 0) {
      ctx.moveTo(x, RULER_OFFSET)
      ctx.lineTo(x, 20)
      // 添加数字标签
      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.fillText(i, x + 2, 15)
    } else {
      ctx.moveTo(x, RULER_OFFSET)
      ctx.lineTo(x, 30)
    }
  }
  ctx.stroke()
}

// 绘制垂直标尺
const drawVerticalRuler = (ctx, height, zoom, canvasTop) => {
  ctx.clearRect(0, 0, 40, height)
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, 40, height)
  ctx.strokeStyle = '#999'
  ctx.beginPath()
  
  // 计算起始位置，使手表表盘左上角为(0,0)点
  const rulerOffset = 40 // 标尺的高度
  const startY = -canvasTop / zoom  // 除以缩放因子
  const endY = startY + WATCH_SIZE.value / zoom + rulerOffset + 800 // 除以缩放因子
  
  // 绘制刻度线
  for (let i = Math.floor(startY / 10) * 10; i <= endY; i += 10) {
    const y = (i * zoom + canvasTop)  // 乘以缩放因子
    
    // 大刻度（100像素）
    if (i % 100 === 0) {
      ctx.moveTo(40, y)
      ctx.lineTo(20, y)
      // 添加数字标签
      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.save()
      ctx.translate(15, y + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(i, 0, 0)
      ctx.restore()
    } else {
      ctx.moveTo(40, y)
      ctx.lineTo(30, y)
    }
  }
  ctx.stroke()
}

// 更新水平标尺
const updateRulers = () => {
  const horizontalRuler = document.querySelector('.ruler-horizontal')
  const verticalRuler = document.querySelector('.ruler-vertical')
  const centerArea = document.querySelector('.center-area')
  const canvasContainer = document.querySelector('.canvas-container')
  
  if (!horizontalRuler || !verticalRuler || !baseStore.canvas || !centerArea || !canvasContainer) {
    return
  }

  try {
    const horizontalCtx = horizontalRuler.getContext('2d')
    const verticalCtx = verticalRuler.getContext('2d')
    
    if (!horizontalCtx || !verticalCtx) {
      console.error('无法获取标尺上下文')
      return
    }

    const zoom = baseStore.canvas.getZoom()
    
    // 获取表盘容器的位置，包括画布偏移
    const containerRect = canvasContainer.getBoundingClientRect()
    const centerRect = centerArea.getBoundingClientRect()
    
    // 计算表盘左上角相对于标尺的偏移量，考虑画布偏移
    const canvasLeft = containerRect.left - centerRect.left - RULER_OFFSET + canvasOffset.value.x
    const canvasTop = containerRect.top - centerRect.top - RULER_OFFSET + canvasOffset.value.y
    
    // 设置画布尺寸
    horizontalRuler.width = centerArea.clientWidth - RULER_OFFSET // 减去标尺的宽度
    horizontalRuler.height = RULER_OFFSET
    verticalRuler.width = RULER_OFFSET
    verticalRuler.height = centerArea.clientHeight - RULER_OFFSET // 减去标尺的高度
    
    drawHorizontalRuler(horizontalCtx, horizontalRuler.width, zoom, canvasLeft)
    drawVerticalRuler(verticalCtx, verticalRuler.height, zoom, canvasTop)
  } catch (error) {
    console.error('更新标尺时出错:', error)
  }
}

const debouncedUpdateRulers = debounce(updateRulers, 100)

// 添加辅助线
const addGuideLine = (canvas, orientation, position) => {
  const line = new Line(
    orientation === 'horizontal'
      ? [0, position, canvas.width, position] 
      : [position, 0, position, canvas.height],
    {
      stroke: 'rgba(0,0,255,0.5)',
      selectable: false,
      evented: false,
      strokeDashArray: [5, 5],
      name: 'guideLine'
    }
  )
  console.log('添加辅助线: x1:', line.x1, 'y1:', line.y1, 'x2:', line.x2, 'y2:', line.y2)
  canvas.add(line)
  canvas.requestRenderAll()
}

// 创建水平辅助线
const createHorizontalGuideline = (y) => {
  // 获取中心区域的宽度
  const centerArea = document.querySelector('.center-area')
  const width = centerArea ? centerArea.clientWidth - RULER_OFFSET : WATCH_SIZE.value // 减去垂直标尺宽度

  const line = new Line([-width, y, width * 2, y], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementX: true, // 只允许垂直移动
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false, // 禁用控制点
    hasBorders: false, // 禁用边框
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ns-resize', // 垂直移动光标
    moveCursor: 'ns-resize',
    guideline: true, // 标记为辅助线
    type: 'horizontalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })
  
  baseStore.canvas.add(line)
  return line
}

// 创建垂直辅助线
const createVerticalGuideline = (x) => {
  // 获取中心区域的高度
  const centerArea = document.querySelector('.center-area')
  const height = centerArea ? centerArea.clientHeight - RULER_OFFSET : WATCH_SIZE.value // 减去水平标尺高度

  console.log('创建垂直辅助线: x1:', x, 'y1:', -height, 'x2:', x, 'y2:', height * 2)
  const line = new Line([x, -height, x, height * 2], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementY: true, // 只允许水平移动
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false, // 禁用控制点
    hasBorders: false, // 禁用边框
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ew-resize', // 水平移动光标
    moveCursor: 'ew-resize',
    guideline: true, // 标记为辅助线
    type: 'verticalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })
  
  baseStore.canvas.add(line)
  return line
}

// 更新辅助线尺寸
const updateGuidelineSize = () => {
  if (!baseStore.canvas) return

  const centerArea = document.querySelector('.center-area')
  if (!centerArea) return

  const width = centerArea.clientWidth - RULER_OFFSET // 减去垂直标尺宽度
  const height = centerArea.clientHeight - RULER_OFFSET // 减去水平标尺高度

  // 使用 requestAnimationFrame 来避免重复渲染
  requestAnimationFrame(() => {
    baseStore.canvas.getObjects().forEach(obj => {
      if (obj.guideline) {
        if (obj.type === 'horizontalGuideline') {
          obj.set({
            x1: -width,
            x2: width * 2,
            y1: obj.top,
            y2: obj.top
          })
        } else if (obj.type === 'verticalGuideline') {
          obj.set({
            x1: obj.left,
            x2: obj.left,
            y1: -height,
            y2: height * 2
          })
        }
        obj.setCoords()
      }
    })

    // 如果关键辅助线显示，重新创建它们以确保位置正确
    if (showKeyGuidelines.value) {
      createKeyGuidelines()
    }

    baseStore.canvas.requestRenderAll()
  })
}

// 处理标尺双击事件
const handleRulerDoubleClick = (e, isHorizontal) => {
  const rect = e.target.getBoundingClientRect()
  const centerRect = document.querySelector('.center-area').getBoundingClientRect()
  const canvasContainer = document.querySelector('.canvas-container').getBoundingClientRect()
  
  if (isHorizontal) {
    const x = e.clientX - rect.left + RULER_OFFSET
    const normalizedX = x + (centerRect.left - canvasContainer.left)
    const guideline = createVerticalGuideline(normalizedX)
    baseStore.canvas.setActiveObject(guideline)
  } else {
    const y = e.clientY - rect.top + RULER_OFFSET
    const normalizedY = y + (centerRect.top - canvasContainer.top)
    const guideline = createHorizontalGuideline(normalizedY)
    baseStore.canvas.setActiveObject(guideline)
  }
  baseStore.canvas.requestRenderAll()
}

// 添加关键辅助线状态
const showKeyGuidelines = ref(false)
const keyGuidelines = ref([])

// 创建关键辅助线
const createKeyGuidelines = () => {
  if (!baseStore.canvas) return
  
  // 清除现有的关键辅助线
  keyGuidelines.value.forEach(guideline => {
    baseStore.canvas.remove(guideline)
  })
  keyGuidelines.value = []

  const centerX = WATCH_SIZE.value / 2
  const centerY = WATCH_SIZE.value / 2
  const quarterX = WATCH_SIZE.value / 4
  const quarterY = WATCH_SIZE.value / 4

  // 创建中心线
  const centerVertical = createVerticalGuideline(centerX)
  const centerHorizontal = createHorizontalGuideline(centerY)
  
  // 创建四等分线
  const leftQuarter = createVerticalGuideline(quarterX)
  const rightQuarter = createVerticalGuideline(centerX + quarterX)
  const topQuarter = createHorizontalGuideline(quarterY)
  const bottomQuarter = createHorizontalGuideline(centerY + quarterY)

  // 设置关键辅助线样式
  const keyLines = [centerVertical, centerHorizontal, leftQuarter, rightQuarter, topQuarter, bottomQuarter]
  keyLines.forEach(line => {
    line.set({
      stroke: '#ff0000',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hasBorders: false,
      keyGuideline: true
    })
    keyGuidelines.value.push(line)
  })

  baseStore.canvas.requestRenderAll()
}

// 切换关键辅助线
const toggleKeyGuidelines = () => {
  showKeyGuidelines.value = !showKeyGuidelines.value
  if (showKeyGuidelines.value) {
    createKeyGuidelines()
  } else {
    keyGuidelines.value.forEach(guideline => {
      baseStore.canvas.remove(guideline)
    })
    keyGuidelines.value = []
    baseStore.canvas.requestRenderAll()
  }
}

// 缩放功能
const zoomIn = () => {
  if (editorStore.zoomLevel < MAX_ZOOM) {
    editorStore.updateSetting('zoomLevel', Math.min(editorStore.zoomLevel + ZOOM_STEP, MAX_ZOOM))
    updateZoom()
  }
}

const zoomOut = () => {
  if (editorStore.zoomLevel > MIN_ZOOM) {
    editorStore.updateSetting('zoomLevel', Math.max(editorStore.zoomLevel - ZOOM_STEP, MIN_ZOOM))
    updateZoom()
  }
}

const resetZoom = () => {
  editorStore.updateSetting('zoomLevel', 1)
  updateZoom()
}

// 更新缩放
const updateZoom = () => {
  if (!baseStore.canvas) return
  
  // 更新容器大小
  const container = document.querySelector('.canvas-container')
  if (container) {
    const size = WATCH_SIZE.value * editorStore.zoomLevel
    container.style.width = `${size}px`
    container.style.height = `${size}px`
  }

  // 设置新的变换矩阵，保持当前偏移
  baseStore.canvas.setViewportTransform([
    editorStore.zoomLevel, 0,
    0, editorStore.zoomLevel,
    canvasOffset.value.x, canvasOffset.value.y
  ])
  console.log('更新画布尺寸', WATCH_SIZE.value * editorStore.zoomLevel)
  // 更新画布尺寸
  const canvasSize = WATCH_SIZE.value * editorStore.zoomLevel
  baseStore.canvas.setWidth(canvasSize)
  baseStore.canvas.setHeight(canvasSize)
  baseStore.canvas.calcOffset()

  // 更新背景元素
  baseStore.updateBackgroundElements(editorStore.zoomLevel)

  // 强制重新渲染
  baseStore.canvas.requestRenderAll()

  debouncedUpdateRulers()
}

// 添加鼠标滚轮缩放
const handleWheel = (e) => {
  if (!e.ctrlKey) return
  e.preventDefault()
  
  const delta = e.deltaY
  if (delta < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 添加拖拽事件监听
const handleCanvasMouseDown = (e) => {
  // 当空格键被按下且是左键点击时启用拖拽
  if (isSpacePressed.value && e.button === 0) {
    isDragging.value = true
    lastX.value = e.clientX
    lastY.value = e.clientY
    
    // 更新鼠标样式
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (canvasWrapper) {
      canvasWrapper.classList.add('dragging')
    }
    
    e.preventDefault()
  }
}

const handleCanvasMouseMove = (e) => {
  if (!isDragging.value) return

  const deltaX = e.clientX - lastX.value
  const deltaY = e.clientY - lastY.value
  
  // 更新偏移量
  canvasOffset.value.x += deltaX
  canvasOffset.value.y += deltaY

  // 更新画布变换
  baseStore.canvas.setViewportTransform([
    editorStore.zoomLevel, 0,
    0, editorStore.zoomLevel,
    canvasOffset.value.x, canvasOffset.value.y
  ])

  // 更新容器位置
  const container = document.querySelector('.canvas-container')
  if (container) {
    // 获取当前的 transform 样式
    const currentTransform = container.style.transform || 'translate(0px, 0px)'
    const matches = currentTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
    
    let currentX = 0
    let currentY = 0
    if (matches) {
      currentX = parseFloat(matches[1])
      currentY = parseFloat(matches[2])
    }

    // 更新容器位置
    container.style.transform = `translate(${currentX + deltaX}px, ${currentY + deltaY}px)`
  }

  // 更新最后的位置
  lastX.value = e.clientX
  lastY.value = e.clientY

  // 更新标尺
  debouncedUpdateRulers()
}

const handleCanvasMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    // 移除拖拽时的样式
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (canvasWrapper) {
      canvasWrapper.classList.remove('dragging')
    }
  }
}

const handleKeyDown = (e) => {
  if (e.code === 'Space' && !isSpacePressed.value) {
    isSpacePressed.value = true
    // 更新鼠标样式为抓手
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (canvasWrapper) {
      canvasWrapper.style.cursor = 'grab'
    }
    e.preventDefault()
  }
}

const handleKeyUp = (e) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
    // 恢复默认鼠标样式
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (canvasWrapper) {
      canvasWrapper.style.cursor = 'default'
    }
  }
}

const backgroundColor = ref(editorStore.backgroundColor)

const refreshElementSettings = (opt) => {
  console.log('refreshElementSettings', opt)
  emitter.emit('refresh-element-settings', opt)
}

onMounted(() => {
  // 创建画布, 尺寸比手表大一些以显示边界
  const canvas = new Canvas(canvasRef.value, {
    width: WATCH_SIZE.value * editorStore.zoomLevel,
    height: WATCH_SIZE.value * editorStore.zoomLevel,
    centeredScaling: true,  // 确保缩放以中心点为基准
    centeredRotation: true  // 确保旋转以中心点为基准
  })
  // 设置画布背景色
  // const canvasElement = canvasRef.value;
  // canvasElement.style.backgroundColor = backgroundColor.value;
  // 计算画布中心点
  const centerPoint = {
    x: 0,
    y: 0
  }

  // 设置画布原点到中心
  canvas.setViewportTransform([
    1, 0, 
    0, 1, 
    centerPoint.x,
    centerPoint.y
  ])

  // 设置画布中心点
  canvas.absolutePan({
    x: -centerPoint.x,
    y: -centerPoint.y
  })

  // 添加 passive 事件监听器
  canvas.wrapperEl.addEventListener('wheel', () => {}, { passive: true })

  // 对象间对齐辅助线
  initAligningGuidelines(canvas)
  initCenteringGuidelines(canvas)
  // 可以多选
  canvas.selection = true

  // 添加辅助线
  canvas.on('mouse:down', function (opt) {
    if (opt.e.shiftKey) {
      const pointer = canvas.getPointer(opt.e)
      addGuideLine(canvas, 'horizontal', pointer.y)
    } else if (opt.e.ctrlKey) {
      const pointer = canvas.getPointer(opt.e)
      addGuideLine(canvas, 'vertical', pointer.x)
    }
  })

  // 选择事件
  canvas.on({
    'selection:created selection:updated selection:cleared deselected': refreshElementSettings,
  })

  canvas.on('mouse:down', function (opt) {
    if (opt.target) {
      // 点击的是一个对象
      refreshElementSettings(opt);
    }
  });

  baseStore.setCanvas(canvas)

  // 更新标尺
  debouncedUpdateRulers()

  // 监听窗口大小变化
  window.addEventListener('resize', debouncedUpdateRulers)
  
  // 监听滚动事件
  const centerArea = document.querySelector('.center-area')
  if (centerArea) {
    centerArea.addEventListener('scroll', debouncedUpdateRulers)
  }

  // 添加标尺双击事件监听
  const horizontalRuler = document.querySelector('.ruler-horizontal')
  const verticalRuler = document.querySelector('.ruler-vertical')
  
  if (horizontalRuler) {
    horizontalRuler.addEventListener('dblclick', (e) => handleRulerDoubleClick(e, true))
  }
  if (verticalRuler) {
    verticalRuler.addEventListener('dblclick', (e) => handleRulerDoubleClick(e, false))
  }

  // 监听画布对象移动事件
  canvas.on('object:moving', (e) => {
    const target = e.target
    if (target && target.guideline) {
      // 吸附到网格
      const gridSize = 10
      if (target.type === 'horizontalGuideline') {
        target.set({
          top: Math.round(target.top / gridSize) * gridSize
        })
      } else if (target.type === 'verticalGuideline') {
        target.set({
          left: Math.round(target.left / gridSize) * gridSize
        })
      }
      target.setCoords()
    }
  })

  // 添加删除快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && baseStore.canvas) {
      const activeObject = baseStore.canvas.getActiveObject()
      if (activeObject && activeObject.guideline) {
        baseStore.canvas.remove(activeObject)
        baseStore.canvas.requestRenderAll()
      }
    }
  })

  // 监听窗口大小变化，更新辅助线尺寸
  window.addEventListener('resize', updateGuidelineSize)

  // 监听关键辅助线切换事件
  emitter.on('toggle-key-guidelines', (show) => {
    showKeyGuidelines.value = show
    if (show) {
      createKeyGuidelines()
    } else {
      keyGuidelines.value.forEach(guideline => {
        baseStore.canvas.remove(guideline)
      })
      keyGuidelines.value = []
      baseStore.canvas.requestRenderAll()
    }
  })

  // 添加滚轮缩放事件监听
  canvas.wrapperEl.addEventListener('wheel', handleWheel, { passive: false })

  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  // 添加拖拽事件监听
  const canvasWrapper = document.querySelector('.canvas-wrapper')
  // if (canvasWrapper) {
  //   canvasWrapper.addEventListener('mousedown', handleCanvasMouseDown)
  //   window.addEventListener('mousemove', handleCanvasMouseMove)
  //   window.addEventListener('mouseup', handleCanvasMouseUp)
    
  //   // 禁用右键菜单
  //   canvasWrapper.addEventListener('contextmenu', (e) => {
  //     e.preventDefault()
  //   })
  // }

  // 初始化容器样式
  const container = document.querySelector('.canvas-container')
  if (container) {
    container.style.transform = 'translate(0px, 0px)'
    container.style.transition = 'transform 0s' // 移除过渡动画，使拖动更流畅
    container.style.backgroundColor = backgroundColor.value
  }
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }

  // 移除事件监听
  window.removeEventListener('resize', debouncedUpdateRulers)
  
  const centerArea = document.querySelector('.center-area')
  if (centerArea) {
    centerArea.removeEventListener('scroll', debouncedUpdateRulers)
  }

  // 移除标尺双击事件监听
  const horizontalRuler = document.querySelector('.ruler-horizontal')
  const verticalRuler = document.querySelector('.ruler-vertical')
  
  if (horizontalRuler) {
    horizontalRuler.removeEventListener('dblclick', (e) => handleRulerDoubleClick(e, true))
  }
  if (verticalRuler) {
    verticalRuler.removeEventListener('dblclick', (e) => handleRulerDoubleClick(e, false))
  }

  // 移除删除快捷键监听
  document.removeEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && baseStore.canvas) {
      const activeObject = baseStore.canvas.getActiveObject()
      if (activeObject && activeObject.guideline) {
        baseStore.canvas.remove(activeObject)
        baseStore.canvas.requestRenderAll()
      }
    }
  })

  // 移除窗口大小变化监听
  window.removeEventListener('resize', updateGuidelineSize)

  // 移除关键辅助线事件监听
  emitter.off('toggle-key-guidelines')

  // 移除滚轮缩放事件监听
  if (baseStore.canvas) {
    baseStore.canvas.wrapperEl.removeEventListener('wheel', handleWheel)
  }

  // 移除键盘事件监听
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  // 移除拖拽事件监听
  const canvasWrapper = document.querySelector('.canvas-wrapper')
  if (canvasWrapper) {
    canvasWrapper.removeEventListener('mousedown', handleCanvasMouseDown)
    window.removeEventListener('mousemove', handleCanvasMouseMove)
    window.removeEventListener('mouseup', handleCanvasMouseUp)
  }
})

// 监听画布大小变化
watch(WATCH_SIZE, () => {
  debouncedUpdateRulers()
})

// 在 Canvas.vue 的 script setup 中暴露缩放方法和值
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  updateZoom
})
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible; /* 修改为 visible，允许内容溢出 */
  cursor: default;
  user-select: none; /* 防止拖拽时选中文本 */
}

.canvas-wrapper.dragging {
  cursor: grabbing !important;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

.canvas-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2;
}

.guideline-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.guideline-btn:hover {
  background: #f5f5f5;
}


.canvas-container {
  background: white;
  border-radius: 4px;
  position: relative;
  margin: 50px;
  overflow: visible;
  transform: translate(0px, 0px);
  will-change: transform;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  color: #666;
}
</style>
