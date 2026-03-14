<template>
  <div class="moon-properties">

    <el-form label-position="left" label-width="120px">
      <el-form-item label="Asset">
        <el-select
          v-model="element.imageUrl"
          placeholder="Select moon image"
          filterable
          @change="() => applyUpdate({ imageUrl: element.imageUrl })"
          style="width: 100%"
        >
          <el-option
            v-for="opt in assetOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Phase Index">
        <el-slider v-model="phaseIndex" :min="0" :max="assetUrls.length - 1" :step="1" show-stops @change="onPhaseChange" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import type { FabricElement } from '@/types/element'

const props = defineProps<{ 
  element?: FabricElement
  config?: any
  applyPatch?: (patch: Record<string, any>) => void
}>()

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
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
  const url = (currentModel.value as any).imageUrl
  const idx = url ? assetUrls.value.findIndex(u => u === url) : -1
  phaseIndex.value = idx >= 0 ? idx : 0
}
watch(() => (currentModel.value as any).imageUrl, () => {
  syncPhaseIndex()
})

onMounted(() => {
  syncPhaseIndex()
})

const onPhaseChange = (val: number): void => {
  const total = assetUrls.value.length
  const clamped = Math.max(0, Math.min(Number(val || 0), total - 1))
  const idx = clamped
  const nextUrl = assetUrls.value[idx]
  applyUpdate({ imageUrl: nextUrl })
}

const applyUpdate = (patch: Record<string, any>): void => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const element = computed<any>(() => currentModel.value)

// 保持 1:1 的尺寸归一化
const normalizeSize = (v: number | undefined): number => {
  const n = Number.isFinite(v as number) ? Number(v) : 42
  return Math.max(1, n)
}

const setSquare = (size: number): void => {
  const el = element.value as { width?: number; height?: number }
  el.width = size
  el.height = size
}

const onWidthChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  applyUpdate({ width: size, height: size })
}

const onHeightChange = (val: number): void => {
  const size = normalizeSize(val)
  setSquare(size)
  applyUpdate({ width: size, height: size })
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
