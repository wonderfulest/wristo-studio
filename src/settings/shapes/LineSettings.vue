<template>
  <div class="settings-section">
    <el-form label-position="left" label-width="100px">
      <el-form-item label="Start (X, Y)">
        <div class="xy-pair">
          <el-input-number 
            v-model="element.x1"
            :step="1"
            controls-position="right"
            @change="updateElement"
          />
          <span class="xy-sep">,</span>
          <el-input-number 
            v-model="element.y1"
            :step="1"
            controls-position="right"
            @change="updateElement"
          />
        </div>
      </el-form-item>
      <el-form-item label="End (X, Y)">
        <div class="xy-pair">
          <el-input-number 
            v-model="element.x2"
            :step="1"
            controls-position="right"
            @change="updateElement"
          />
          <span class="xy-sep">,</span>
          <el-input-number 
            v-model="element.y2"
            :step="1"
            controls-position="right"
            @change="updateElement"
          />
        </div>
      </el-form-item>
      <el-form-item label="Line Color">
        <color-picker 
          v-model="element.stroke"
          show-alpha
          @update:modelValue="updateElement" 
        />
      </el-form-item>
      <el-form-item label="Line Width">
        <el-input-number 
          v-model="element.strokeWidth"
          :min="1" 
          :max="20" 
          :step="1"
          controls-position="right"
          @change="updateElement"
        />
      </el-form-item>
      <el-form-item label="Opacity">
        <el-slider 
          v-model="element.opacity"
          :min="0" 
          :max="1" 
          :step="0.1"
          @change="updateElement"
        />
      </el-form-item>

    </el-form>
  </div>
  
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useLineElementStore } from '@/stores/elements/shapes/lineElement'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps<{ element: any }>()

const lineStore = useLineElementStore()

// 监听颜色变化，保持与 CircleSettings 行为一致
watch(() => props.element.stroke, () => {
  updateElement()
}, { deep: true })

const updateElement = () => {
  lineStore.updateElement(props.element, {
    stroke: props.element.stroke,
    strokeWidth: props.element.strokeWidth,
    opacity: props.element.opacity,
    x1: props.element.x1,
    y1: props.element.y1,
    x2: props.element.x2,
    y2: props.element.y2,
  })
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