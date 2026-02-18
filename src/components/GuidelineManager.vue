<template>
  <div class="guideline-manager" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { Canvas, FabricObject, Line } from 'fabric'
import { useBaseStore } from '@/stores/baseStore'
import { useEditorStore } from '@/stores/editorStore'

const props = defineProps<{
  watchSize: number
  rulerOffset: number
}>()

const baseStore = useBaseStore()
const editorStore = useEditorStore()

// 类型定义，兼容 Fabric.js 属性
type GuidelineObject = FabricObject & {
  guideline?: boolean
  keyGuideline?: boolean
  type?: string
  left?: number
  top?: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  set: (props: Record<string, unknown>) => FabricObject
}

const showKeyGuidelines = ref<boolean>(false)
const keyGuidelines = ref<Line[]>([])
const keyDivisions = ref<number>(4)
let removeCanvasMouseDown: (() => void) | null = null

// 创建水平辅助线
const createHorizontalGuideline = (y: number) => {
  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  const width = centerArea ? centerArea.clientWidth - props.rulerOffset : props.watchSize

  const line = new Line([-width, y, width * 2, y], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementX: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    hasBorders: false,
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ns-resize',
    moveCursor: 'ns-resize',
    guideline: true,
    type: 'horizontalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })

  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
  }
  return line
}

// 创建垂直辅助线
const createVerticalGuideline = (x: number) => {
  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  const height = centerArea ? centerArea.clientHeight - props.rulerOffset : props.watchSize

  const line = new Line([x, -height, x, height * 2], {
    stroke: '#0a90ff',
    strokeWidth: 1,
    selectable: true,
    evented: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    hasBorders: false,
    originX: 'left',
    originY: 'top',
    hoverCursor: 'ew-resize',
    moveCursor: 'ew-resize',
    guideline: true,
    type: 'verticalGuideline',
    perPixelTargetFind: true,
    targetFindTolerance: 5
  })

  if (baseStore.canvas) {
    (baseStore.canvas as Canvas).add(line)
  }
  return line
}

// 更新辅助线尺寸
const updateGuidelineSize = () => {
  if (!baseStore.canvas) return

  const centerArea = document.querySelector('.center-area') as HTMLElement | null
  if (!centerArea) return

  const width = centerArea.clientWidth - props.rulerOffset
  const height = centerArea.clientHeight - props.rulerOffset

  requestAnimationFrame(() => {
    const canvas = baseStore.canvas as Canvas
    canvas.getObjects().forEach((obj) => {
      const o = obj as GuidelineObject
      if (o.guideline) {
        if (o.type === 'horizontalGuideline') {
          o.set({
            x1: -width,
            x2: width * 2,
            y1: o.top,
            y2: o.top
          })
        } else if (o.type === 'verticalGuideline') {
          o.set({
            x1: o.left,
            x2: o.left,
            y1: -height,
            y2: height * 2
          })
        }
        o.setCoords()
      }
    })

    if (showKeyGuidelines.value) {
      createKeyGuidelines()
    }
  })
}

// 创建关键辅助线（按等分数）
const createKeyGuidelines = () => {
  if (!baseStore.canvas) return

  keyGuidelines.value.forEach(guideline => {
    ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
  })
  keyGuidelines.value = []

  const div = Math.max(2, Math.floor(keyDivisions.value))
  for (let i = 1; i < div; i++) {
    const vx = (props.watchSize * i) / div
    const vy = (props.watchSize * i) / div
    const v = createVerticalGuideline(vx)
    const h = createHorizontalGuideline(vy)
    v.set({
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
    h.set({
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
    keyGuidelines.value.push(v)
    keyGuidelines.value.push(h)
  }

  ;(baseStore.canvas as Canvas).requestRenderAll()
}

// 通过点击快速添加水平/垂直辅助线（Shift/Ctrl）
const attachCanvasMouseDown = () => {
  if (!baseStore.canvas) return
  const canvas = baseStore.canvas as Canvas

  const handler = (opt: unknown) => {
    const e = (opt as { e?: MouseEvent }).e
    if (!e) return
    // respect global toggle; if disabled, do nothing
    if (!editorStore.enableManualGuides) return
    const pointer = canvas.getPointer(e as MouseEvent)
    const hasCmd = e.metaKey || e.ctrlKey // Command (Mac) or Ctrl (fallback)
    const hasShift = e.shiftKey
    const hasCtrl = e.ctrlKey

    // Require Cmd+Shift for horizontal, Cmd+Ctrl for vertical (or Cmd+Ctrl on non-Mac)
    if (hasCmd && hasShift) {
      createHorizontalGuideline(pointer.y)
    } else if (hasCmd && hasCtrl) {
      createVerticalGuideline(pointer.x)
    }
  }

  canvas.on('mouse:down', handler)
  removeCanvasMouseDown = () => {
    canvas.off('mouse:down', handler)
  }
}

// 监听 watchSize 变化，更新尺寸
watch(() => props.watchSize, () => {
  updateGuidelineSize()
})

onMounted(() => {
  // 在 canvas 就绪后再挂载事件
  if (baseStore.canvas) {
    attachCanvasMouseDown()
  } else {
    const stop = watch(() => baseStore.canvas, (c) => {
      if (c) {
        attachCanvasMouseDown()
        stop()
      }
    })
  }

  // init from editor store
  showKeyGuidelines.value = Boolean(editorStore.showKeyGuidelines)
  keyDivisions.value = Number(editorStore.keyGuidelineDivisions)
  if (showKeyGuidelines.value) {
    createKeyGuidelines()
  }
  // watch store changes
  watch(() => editorStore.showKeyGuidelines, (val) => {
    showKeyGuidelines.value = Boolean(val)
    if (showKeyGuidelines.value) {
      createKeyGuidelines()
    } else {
      keyGuidelines.value.forEach(guideline => {
        ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
      })
      keyGuidelines.value = []
      ;(baseStore.canvas as Canvas).requestRenderAll()
    }
  })
  watch(() => editorStore.keyGuidelineDivisions, (n) => {
    const valid = [2,3,4,5,6,8]
    keyDivisions.value = valid.includes(Number(n)) ? Number(n) : 4
    if (showKeyGuidelines.value) {
      createKeyGuidelines()
    }
  })
  window.addEventListener('resize', updateGuidelineSize)
})

onUnmounted(() => {
  if (removeCanvasMouseDown) {
    removeCanvasMouseDown()
  }
  window.removeEventListener('resize', updateGuidelineSize)

  // 清除关键辅助线
  if (baseStore.canvas) {
    keyGuidelines.value.forEach(guideline => {
      ;(baseStore.canvas as Canvas).remove(guideline as unknown as FabricObject)
    })
    keyGuidelines.value = []
  }
})
</script>

<style scoped>
.guideline-manager { display: none; }
</style>
