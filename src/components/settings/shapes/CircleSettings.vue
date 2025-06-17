<template>
  <div class="settings-section">
    <el-form label-position="left" label-width="100px">
      <el-form-item label="半径">
        <el-input-number 
          v-model="element.radius" 
          :min="10" 
          :max="200" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="填充颜色">
        <color-picker 
          v-model="element.fill" 
          @update:modelValue="updateElement" 
        />
      </el-form-item>
      <el-form-item label="边框颜色">
        <color-picker 
          v-model="element.stroke" 
          @update:modelValue="updateElement" 
        />
      </el-form-item>
      <el-form-item label="边框宽度">
        <el-input-number 
          v-model="element.strokeWidth" 
          :min="0" 
          :max="20" 
          @change="updateElement" 
        />
      </el-form-item>
      <el-form-item label="不透明度">
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

<script setup>
import { ref, watch } from 'vue'
import { useCircleStore } from '@/stores/elements/shapes/circleElement'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const circleStore = useCircleStore()

// 监听颜色变化
watch(() => props.element.fill, (newValue) => {
  updateElement()
}, { deep: true })

watch(() => props.element.stroke, (newValue) => {
  updateElement()
}, { deep: true })

const updateElement = () => {
  circleStore.updateElement(props.element, {
    radius: props.element.radius,
    fill: props.element.fill,
    stroke: props.element.stroke,
    strokeWidth: props.element.strokeWidth,
    opacity: props.element.opacity
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
</style>
