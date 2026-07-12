<template>
  <div class="goal-bar-polygon-mini-editor" :class="{ 'is-invalid': candidateInvalid }">
    <svg
      ref="svgRef"
      class="polygon-canvas"
      viewBox="0 0 1000 1000"
      tabindex="0"
      role="application"
      aria-label="Polygon editor"
      @keydown="onKeydown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onLostPointerCapture">
      <defs>
        <pattern id="goal-bar-polygon-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" class="grid-line" />
        </pattern>
      </defs>
      <rect width="1000" height="1000" class="editor-background" @click="onBackgroundClick" />
      <rect width="1000" height="1000" fill="url(#goal-bar-polygon-grid)" pointer-events="none" />

      <polygon v-if="closed" :points="svgPoints" class="polygon-fill" />
      <polyline v-else :points="svgPoints" class="polygon-line" />

      <g v-if="closed">
        <line
          v-for="(point, index) in displayPoints"
          :key="`edge-${index}`"
          :x1="toSvg(point.x)"
          :y1="toSvg(point.y)"
          :x2="toSvg(displayPoints[(index + 1) % displayPoints.length].x)"
          :y2="toSvg(displayPoints[(index + 1) % displayPoints.length].y)"
          class="edge-hit"
          @click.stop="onEdgeClick(index, $event)" />
      </g>

      <g v-for="(point, index) in displayPoints" :key="`node-${index}`">
        <circle
          :cx="toSvg(point.x)"
          :cy="toSvg(point.y)"
          r="10"
          class="node"
          :class="{ 'is-selected': selectedIndex === index, 'is-invalid': candidateInvalid && draggingIndex === index }"
          pointer-events="none" />
        <circle
          :cx="toSvg(point.x)"
          :cy="toSvg(point.y)"
          r="14"
          class="node-hit"
          @pointerdown.stop="onNodePointerDown(index, $event)"
          @click.stop="onNodeClick(index)"
          @dblclick.stop="onNodeDoubleClick(index)" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { MAX_POLYGON_POINTS, validateGoalBarPolygon, type GoalBarPolygonPoint, type PolygonValidationReason } from './goalBar.geometry'
import { createPolygonEditModel, type PolygonEditMode } from './goalBar.polygonEditModel'
import { clientPointToNormalized, clonePolygonPoints } from './goalBar.polygonMiniEditor'

type EditorState = {
  points: GoalBarPolygonPoint[]
  closed: boolean
  valid: boolean
  reason?: PolygonValidationReason
  pointCount: number
}

const props = defineProps<{ mode: PolygonEditMode; initialPoints: GoalBarPolygonPoint[] }>()
const emit = defineEmits<{
  state: [state: EditorState]
  preview: [points: GoalBarPolygonPoint[]]
  commit: [points: GoalBarPolygonPoint[]]
  cancel: []
}>()

const model = createPolygonEditModel({ mode: props.mode, points: props.initialPoints })
const revision = ref(0)
const svgRef = ref<SVGSVGElement | null>(null)
const draggingIndex = ref<number | null>(null)
const capturedPointerId = ref<number | null>(null)

const displayPoints = computed(() => {
  revision.value
  return model.preview?.points ?? model.points
})
const closed = computed(() => {
  revision.value
  return model.closed
})
const selectedIndex = computed(() => {
  revision.value
  return model.selectedIndex
})
const candidateInvalid = computed(() => {
  revision.value
  return model.preview?.valid === false
})
const svgPoints = computed(() => displayPoints.value.map((point) => `${toSvg(point.x)},${toSvg(point.y)}`).join(' '))

function toSvg(value: number): number {
  return value * 1000
}

function pointFromEvent(event: MouseEvent | PointerEvent): GoalBarPolygonPoint {
  const rect = svgRef.value?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }
  return clientPointToNormalized(event.clientX, event.clientY, rect)
}

function publishState(): void {
  const preview = model.preview
  const points = preview?.points ?? model.points
  const validation = validateGoalBarPolygon(points)
  const valid = model.closed && preview?.valid !== false && validation.valid
  const reason = preview?.valid === false ? preview.reason : validation.valid ? undefined : validation.reason
  const statePoints = clonePolygonPoints(points)
  emit('state', {
    points: statePoints,
    closed: model.closed,
    valid,
    ...(reason === undefined ? {} : { reason }),
    pointCount: statePoints.length
  })
  if (valid) emit('preview', clonePolygonPoints(points))
}

function refresh(): void {
  revision.value += 1
  publishState()
}

function closePolygon(): void {
  if (model.points.length >= 3 && model.close()) refresh()
}

function onBackgroundClick(event: MouseEvent): void {
  svgRef.value?.focus()
  if (!model.closed && model.points.length < MAX_POLYGON_POINTS && model.addPoint(pointFromEvent(event))) refresh()
}

function onNodeClick(index: number): void {
  if (!model.closed && index === 0 && model.points.length >= 3) {
    closePolygon()
    return
  }
  model.selectPoint(index)
  refresh()
}

function onNodeDoubleClick(index: number): void {
  if (!model.closed && index === model.points.length - 1) closePolygon()
}

function onNodePointerDown(index: number, event: PointerEvent): void {
  svgRef.value?.focus()
  model.selectPoint(index)
  if (model.closed) {
    draggingIndex.value = index
    capturedPointerId.value = event.pointerId
    svgRef.value?.setPointerCapture(event.pointerId)
  }
  refresh()
}

function onPointerMove(event: PointerEvent): void {
  if (draggingIndex.value === null || capturedPointerId.value !== event.pointerId) return
  model.previewMove(draggingIndex.value, pointFromEvent(event))
  refresh()
}

function finishDragging({ releaseCapture }: { releaseCapture: boolean }): void {
  const pointerId = capturedPointerId.value
  model.finishMove()
  capturedPointerId.value = null
  draggingIndex.value = null
  if (releaseCapture && pointerId !== null && svgRef.value?.hasPointerCapture(pointerId)) {
    svgRef.value.releasePointerCapture(pointerId)
  }
  refresh()
}

function onPointerUp(event: PointerEvent): void {
  if (draggingIndex.value === null || capturedPointerId.value !== event.pointerId) return
  if (model.preview?.valid) model.acceptMove()
  finishDragging({ releaseCapture: true })
}

function onPointerCancel(event: PointerEvent): void {
  if (draggingIndex.value === null || capturedPointerId.value !== event.pointerId) return
  finishDragging({ releaseCapture: true })
}

function onLostPointerCapture(event: PointerEvent): void {
  if (draggingIndex.value === null || capturedPointerId.value !== event.pointerId) return
  finishDragging({ releaseCapture: false })
}

function onEdgeClick(index: number, event: MouseEvent): void {
  svgRef.value?.focus()
  if (model.insertOnEdge(index, pointFromEvent(event))) refresh()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    closePolygon()
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && model.selectedIndex !== null) {
    event.preventDefault()
    if (model.deletePoint(model.selectedIndex)) refresh()
  }
}

function requestCommit(): void {
  const result = model.getCommitResult()
  if (result !== null && validateGoalBarPolygon(result.polygonPoints).valid) emit('commit', clonePolygonPoints(result.polygonPoints))
}

defineExpose({ requestCommit })

onMounted(() => nextTick(publishState))
onBeforeUnmount(() => {
  if (draggingIndex.value !== null) finishDragging({ releaseCapture: true })
})
</script>

<style scoped>
.goal-bar-polygon-mini-editor {
  width: 100%;
  min-height: 180px;
}

.polygon-canvas {
  display: block;
  width: 100%;
  min-height: 180px;
  max-height: 320px;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  outline: none;
  touch-action: none;
}

.polygon-canvas:focus-visible {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}

.editor-background {
  fill: var(--el-fill-color-lighter);
}

.grid-line {
  fill: none;
  stroke: var(--el-border-color-lighter);
  stroke-width: 2;
}

.polygon-fill,
.polygon-line {
  fill: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  stroke: var(--el-color-primary);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.polygon-line {
  fill: none;
}

.is-invalid .polygon-fill,
.is-invalid .polygon-line {
  fill: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
  stroke: var(--el-color-danger);
}

.edge-hit {
  stroke: transparent;
  stroke-width: 24;
  vector-effect: non-scaling-stroke;
  cursor: copy;
}

.node {
  fill: var(--el-bg-color);
  stroke: var(--el-text-color-secondary);
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}

.node.is-selected {
  fill: var(--el-color-primary);
  stroke: var(--el-color-primary-dark-2);
}

.node.is-invalid {
  fill: var(--el-color-danger);
  stroke: var(--el-color-danger-dark-2, var(--el-color-danger));
}

.node-hit {
  fill: transparent;
  stroke: transparent;
  stroke-width: 24;
  vector-effect: non-scaling-stroke;
  cursor: grab;
}

.node-hit:active {
  cursor: grabbing;
}
</style>
