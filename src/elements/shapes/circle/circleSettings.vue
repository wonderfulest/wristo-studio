<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="半径">
        <el-input-number 
          v-model.number="radiusProxy" 
          :min="10" 
          :max="227" 
          @change="(v: number) => applyUpdate({ radius: v })" 
        />
      </el-form-item>

      <el-form-item label="填充颜色">
        <color-picker 
          v-model="currentModel.fill" 
          @change="(v: string) => applyUpdate({ fill: v })" 
        />
      </el-form-item>
      <el-form-item label="边框颜色">
        <color-picker 
          v-model="currentModel.stroke" 
          @change="(v: string) => applyUpdate({ stroke: v })" 
        />
      </el-form-item>
      <el-form-item label="边框宽度">
        <el-input-number 
          v-model.number="currentModel.strokeWidth" 
          :min="0" 
          :max="20" 
          @change="(v: number) => applyUpdate({ strokeWidth: v })" 
        />
      </el-form-item>
      <el-form-item label="不透明度">
        <el-slider 
          v-model.number="currentModel.opacity" 
          :min="0" 
          :max="1" 
          :step="0.1" 
          @change="(v: number) => applyUpdate({ opacity: v })" 
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps<{
  // 旧通道：直接传入 Fabric Circle
  element?: any
  // 新通道：业务配置 + 通用补丁函数
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

// 当前表单绑定的数据模型：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
})

// 半径字段代理：统一通过 applyUpdate 下发 patch
const radiusProxy = computed<number>({
  get() {
    return Number((currentModel.value as any).radius ?? 0)
  },
  set(v: number) {
    applyUpdate({ radius: v })
  },
})

// 统一更新：优先使用上层传下来的 applyPatch（会同时更新 DataStore + Fabric）
// 若不存在，则回退到 elementManager.updateElement 旧通道，保持兼容
const applyUpdate = (patch: Record<string, any>) => {
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
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
