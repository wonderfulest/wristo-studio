<template>
  <div class="settings-section">
    <el-form :model="currentModel" label-position="left" label-width="100px">
      <el-form-item label="Start (X, Y)">
        <div class="xy-pair">
          <el-input-number 
            v-model.number="currentModel.x1"
            :step="1"
            controls-position="right"
            @change="(v: number) => applyUpdate({ x1: v })"
          />
          <span class="xy-sep">,</span>
          <el-input-number 
            v-model.number="currentModel.y1"
            :step="1"
            controls-position="right"
            @change="(v: number) => applyUpdate({ y1: v })"
          />
        </div>
      </el-form-item>
      <el-form-item label="End (X, Y)">
        <div class="xy-pair">
          <el-input-number 
            v-model.number="currentModel.x2"
            :step="1"
            controls-position="right"
            @change="(v: number) => applyUpdate({ x2: v })"
          />
          <span class="xy-sep">,</span>
          <el-input-number 
            v-model.number="currentModel.y2"
            :step="1"
            controls-position="right"
            @change="(v: number) => applyUpdate({ y2: v })"
          />
        </div>
      </el-form-item>
      <el-form-item label="Line Color">
        <color-picker 
          v-model="currentModel.stroke"
          show-alpha
          @change="(v: string) => applyUpdate({ stroke: v })" 
        />
      </el-form-item>
      <el-form-item label="Line Width">
        <el-input-number 
          v-model.number="currentModel.strokeWidth"
          :min="1" 
          :max="20" 
          :step="1"
          controls-position="right"
          @change="(v: number) => applyUpdate({ strokeWidth: v })"
        />
      </el-form-item>
      <el-form-item label="Opacity">
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
  // 旧通道：直接传入 Fabric Line
  element?: any
  // 新通道：业务配置 + 通用补丁函数
  config?: Record<string, any> | null
  applyPatch?: (patch: Record<string, any>) => void
}>()

// 当前表单绑定的数据模型：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return props.config ?? props.element ?? {}
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

.xy-pair {
  display: flex;
  align-items: center;
  gap: 8px;
}

.xy-sep {
  color: #909399;
}
</style>