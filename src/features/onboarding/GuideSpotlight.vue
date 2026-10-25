<template>
  <Teleport to="body">
    <div v-if="active && holes.length" class="guide-spotlight" aria-hidden="true">
      <svg class="guide-shade" width="100%" height="100%">
        <defs><mask :id="maskId"><rect width="100%" height="100%" fill="white" /><rect v-for="(hole, i) in holes" :key="i" :x="hole.x" :y="hole.y" :width="hole.width" :height="hole.height" rx="8" fill="black" /></mask></defs>
        <rect width="100%" height="100%" :mask="`url(#${maskId})`" fill="rgba(91, 99, 112, .65)" />
      </svg>
      <div v-for="(hole, i) in holes" :key="i" class="guide-focus-ring" :style="{ left: `${hole.x}px`, top: `${hole.y}px`, width: `${hole.width}px`, height: `${hole.height}px` }" />
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ active: boolean; targets: HTMLElement[] }>()
const emit = defineEmits<{ placement: [style: Record<string, string>] }>()
type Hole = { x: number; y: number; width: number; height: number }
const holes = ref<Hole[]>([])
const maskId = `guide-mask-${getCurrentInstance()!.uid}`
const guardedEvents = ['keydown', 'focusin', 'pointerdown', 'mousedown', 'click', 'dblclick', 'contextmenu']
let timer: ReturnType<typeof setInterval> | undefined
// Element Plus teleports the controls needed to finish name/device/save steps.
function dialogs() {
  return Array.from(document.querySelectorAll<HTMLElement>('.el-dialog, .el-message-box, .el-popper')).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
}
function refresh() {
  if (!props.active) { holes.value = []; emit('placement', {}); return }
  const width = window.innerWidth, height = window.innerHeight
  const modals = dialogs()
  const targets = modals.length ? modals : props.targets
  holes.value = targets.map(el => {
    const r = el.getBoundingClientRect()
    const x = Math.max(0, r.left - 6), y = Math.max(0, r.top - 6)
    return { x, y, width: Math.max(0, Math.min(width, r.right + 6) - x), height: Math.max(0, Math.min(height, r.bottom + 6) - y) }
  }).filter(r => r.width > 12 && r.height > 12)
  const first = holes.value[0]
  const guide = document.querySelector<HTMLElement>('.first-design-guide')
  if (!first || !guide || modals.length) { emit('placement', {}); return }
  const w = guide.offsetWidth || 340, h = guide.offsetHeight || 300, gap = 20
  let left = first.x + first.width + gap, top = first.y
  if (left + w > width - 16) {
    left = Math.max(16, Math.min(first.x, width - w - 16))
    top = first.y + first.height + gap
    if (top + h > height - 16) top = first.y - h - gap
  }
  emit('placement', { left: `${Math.max(16, Math.min(left, width - w - 16))}px`, top: `${Math.max(16, Math.min(top, height - h - 16))}px`, right: 'auto', bottom: 'auto' })
}
function allowed(target: EventTarget | null) {
  return target instanceof Node && (props.targets.some(el => el.contains(target)) || dialogs().some(el => el.contains(target)) || !!(target instanceof Element && target.closest('.first-design-guide')))
}
function guard(event: Event) {
  if (!props.active || !holes.value.length || allowed(event.target)) return
  event.preventDefault(); event.stopImmediatePropagation()
  if (event.type === 'focusin') document.querySelector<HTMLButtonElement>('.first-design-guide button')?.focus()
}
watch(() => [props.active, props.targets], refresh, { flush: 'post' })
onMounted(() => {
  refresh(); timer = setInterval(refresh, 100)
  window.addEventListener('resize', refresh)
  document.addEventListener('scroll', refresh, true)
  guardedEvents.forEach(type => document.addEventListener(type, guard, true))
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', refresh)
  document.removeEventListener('scroll', refresh, true)
  guardedEvents.forEach(type => document.removeEventListener(type, guard, true))
})
</script>
<style>
.guide-spotlight { position: fixed; inset: 0; z-index: 4000; pointer-events: none; }
.guide-shade { position: absolute; inset: 0; pointer-events: none; }
.guide-focus-ring { position: absolute; box-sizing: border-box; border: 3px solid #3985ff; border-radius: 10px; box-shadow: 0 0 0 4px #ffffffb3, 0 0 24px #3985ff66; }
</style>
