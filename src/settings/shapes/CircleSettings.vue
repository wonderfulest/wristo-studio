<template>
  <div class="settings-section">
    <el-form label-position="left" label-width="100px">
      <el-form-item label="半径">
        <el-input-number 
          v-model="radius" 
          :min="10" 
          :max="227" 
          @change="onRadiusChange" 
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

// 本地半径状态，用于驱动表单显示
const radius = ref(props.element.radius ?? 0)

// 外部（例如通过控制点缩放）修改 element.radius 时，同步到本地 radius
watch(
  () => props.element.radius,
  (newVal) => {
    radius.value = Number(newVal ?? 0)
  }
)

// 颜色变化仍然走统一更新逻辑
watch(
  () => props.element.fill,
  () => {
    updateElement()
  },
  { deep: true }
)

watch(
  () => props.element.stroke,
  () => {
    updateElement()
  },
  { deep: true }
)

const onRadiusChange = () => {
  // 把本地 radius 写回元素，再通过 store 统一更新
  props.element.radius = radius.value
  updateElement()
}

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
