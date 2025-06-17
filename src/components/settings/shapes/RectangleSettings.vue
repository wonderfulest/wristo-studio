<template>
  <div class="settings-section">
    <el-form label-position="left" label-width="100px">
      <el-form-item label="宽度">
        <el-input-number 
          v-model="element.width" 
          :min="10" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="高度">
        <el-input-number 
          v-model="element.height" 
          :min="10" 
          :max="500" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="圆角">
        <el-input-number 
          v-model="element.rx" 
          :min="0" 
          :max="100" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="填充颜色">
        <color-picker 
          v-model="element.fill" 
          @change="updateElement" 
        />
      </el-form-item>

      <el-form-item label="边框颜色">
        <color-picker 
          v-model="element.stroke" 
          @change="updateElement" 
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
import { ref } from 'vue'
import { useRectangleStore } from '@/stores/elements/shapes/rectangleElement'
import ColorPicker from '@/components/color-picker/index.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const rectangleStore = useRectangleStore()

const updateElement = () => {
  rectangleStore.updateElement(props.element, {
    width: props.element.width,
    height: props.element.height,
    fill: props.element.fill,
    stroke: props.element.stroke,
    strokeWidth: props.element.strokeWidth,
    opacity: props.element.opacity,
    borderRadius: props.element.rx
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