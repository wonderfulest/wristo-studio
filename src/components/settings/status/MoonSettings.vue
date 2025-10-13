<template>
  <div class="moon-properties">

    <el-form label-position="left" label-width="120px">
      <el-form-item label="Asset">
        <el-select v-model="element.imageUrl" placeholder="Select moon image" filterable @change="updateElement" style="width: 100%">
          <el-option
            v-for="opt in assetOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Width">
        <el-input-number v-model="element.width" :min="1" :max="2000" @change="onWidthChange" />
      </el-form-item>
      <el-form-item label="Height">
        <el-input-number v-model="element.height" :min="1" :max="2000" @change="onHeightChange" />
      </el-form-item>
          <el-form-item label="Phase Index">
        <el-slider v-model="phaseIndex" :min="0" :max="assetUrls.length - 1" :step="1" show-stops @change="onPhaseChange" />
      </el-form-item>

    </el-form>
 
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useMoonStore } from '@/stores/elements/status/moonElement'
import type { FabricElement } from '@/types/element'

const props = defineProps<{ element: FabricElement }>()

const moonStore = useMoonStore()

// 初始属性通过 initElementProperties 设置

// 从画布元素中获取实际属性值
const initElementProperties = (): void => {
  const canvas = moonStore.baseStore.canvas
  if (!canvas) return
  const group = (canvas.getObjects() as Array<{ id?: string } & Record<string, unknown>>).find(o => o.id === props.element.id)
  if (!group) return

  const meta = group as unknown as { moonImageUrl?: string; moonImageWidth?: number; moonImageHeight?: number }
  const imageUrl = meta.moonImageUrl
  const width = meta.moonImageWidth
  const height = meta.moonImageHeight

  console.log('[MoonSettings] initElementProperties', { imageUrl, width, height })

  const el = props.element as unknown as { imageUrl?: string; width?: number; height?: number }
  if (typeof imageUrl === 'string') el.imageUrl = imageUrl
  if (typeof width === 'number') el.width = width
  if (typeof height === 'number') el.height = height
}

// 组件挂载时初始化属性
onMounted(() => {
  initElementProperties()
  syncPhaseIndex()
})

// load built asset urls for moon phases
type AssetOption = { label: string; value: string }
const assetModules = import.meta.glob('/src/assets/moonphase/*.png', { eager: true, import: 'default' }) as Record<string, string>
const CDN_BASE = 'https://cdn.wristo.io/moonphase/'
const assetOptions = computed<AssetOption[]>(() => {
  return Object.keys(assetModules)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => {
      const filename = path.split('/').pop() ?? path
      return { label: filename, value: `${CDN_BASE}${filename}` }
    })
})

const assetUrls = computed<string[]>(() =>
  assetOptions.value
    .map(o => o.value)
    .slice()
    .sort((a, b) => {
      const na = Number(a.match(/h-phase-(\d+)\.png$/)?.[1] ?? Number.MAX_SAFE_INTEGER)
      const nb = Number(b.match(/h-phase-(\d+)\.png$/)?.[1] ?? Number.MAX_SAFE_INTEGER)
      return na - nb
    })
)
const phaseIndex = ref<number>(0)
const syncPhaseIndex = (): void => {
  const url = (props.element as unknown as { imageUrl?: string }).imageUrl
  const idx = url ? assetUrls.value.findIndex(u => u === url) : -1
  phaseIndex.value = idx >= 0 ? idx : 0
}
watch(() => (props.element as unknown as { imageUrl?: string }).imageUrl, () => {
  syncPhaseIndex()
})

const onPhaseChange = (val: number): void => {
  const total = assetUrls.value.length
  const clamped = Math.max(0, Math.min(Number(val || 0), total - 1))
  const idx = clamped
  const nextUrl = assetUrls.value[idx]
  ;(props.element as unknown as { imageUrl?: string }).imageUrl = nextUrl
  updateElement()
}

// 更新元素
const updateElement = (): void => {
  // 更新画布上的元素
  moonStore.updateElement(props.element, {
    imageUrl: (props.element as unknown as { imageUrl?: string }).imageUrl,
    width: (props.element as unknown as { width?: number }).width,
    height: (props.element as unknown as { height?: number }).height,
  })
}

// 保持 1:1 的尺寸归一化
const normalizeSize = (v: number | undefined): number => {
  const n = Number.isFinite(v as number) ? Number(v) : 42
  return Math.max(1, n)
}

const setSquare = (size: number): void => {
  const el = props.element as unknown as { width?: number; height?: number }
  el.width = size
  el.height = size
}

const onWidthChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  // 调用 store 的专用尺寸更新，保持画布即时同步
  moonStore.setImageSize(props.element, size, size)
  updateElement()
}

const onHeightChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  moonStore.setImageSize(props.element, size, size)
  updateElement()
}
</script>

<style scoped>
.moon-properties {
  padding: 16px;
}
/* allow poppers to overflow out of collapse panels */
::v-deep(.el-collapse-item__wrap) {
  overflow: visible;
}
</style>
