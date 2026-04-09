<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="Line Color">
        <color-picker 
          v-model="strokeProxy"
          show-alpha
        />
      </el-form-item>
      <el-form-item label="Line Width">
        <el-input-number 
          :model-value="strokeWidthProxy"
          :min="1" 
          :max="20" 
          :step="1"
          controls-position="right"
          @change="(v: number) => applyUpdate({ strokeWidth: v })"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useElementDataStore } from '@/stores/elementDataStore'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps<{
  element?: any
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

const elementDataStore = useElementDataStore()

// 优先使用 store 中的数据（响应式），其次使用传入的 element
// store.elements 是 ElementConfigSnapshot[]，实际数据在 .config 中
const currentModel = computed<any>(() => {
  const id = props.element?.id
  if (id) {
    const fromStore = elementDataStore.elements.find((e: any) => e.id === id)
    if (fromStore) return fromStore.config ?? {}
  }
  return props.element ?? {}
})

// 计算属性映射：Line 使用 Rect 模拟，颜色存在 fill，线宽存在 height
const strokeProxy = computed<string>({
  get() {
    return (currentModel.value.fill as string) ?? '#000000'
  },
  set(v: string) {
    applyUpdate({ stroke: v })
  },
})

const strokeWidthProxy = computed<number>({
  get() {
    console.log('strokeWidthProxy get', currentModel.value.height)
    return Math.round(Number(currentModel.value.height ?? 2))
  },
  set(v: number) {
    console.log('strokeWidthProxy set', v)
    applyUpdate({ strokeWidth: v })
  },
})

const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
    // 立即本地更新 store，确保面板响应式同步
    // Line 元素使用 height 存线宽，fill 存颜色
    const id = props.element.id
    if (id) {
      const storePatch: Record<string, any> = {}
      if (patch.strokeWidth !== undefined) storePatch.height = patch.strokeWidth
      if (patch.stroke !== undefined) storePatch.fill = patch.stroke
      if (patch.opacity !== undefined) storePatch.opacity = patch.opacity
      elementDataStore.patchElement(String(id), storePatch)
    }
  }
}
</script>

<style scoped>
.settings-section {
  padding: 16px;
}

.el-form-item {
  margin-bottom: 16px;
}
</style>
