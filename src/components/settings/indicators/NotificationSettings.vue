<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>Color</label>
      <ColorPicker v-model="color" @update:modelValue="updateColor" />
    </div>

    <div class="setting-item">
      <label>Font</label>
      <FontPicker v-model="fontFamily" :type="FontTypes.ICON_FONT" @update:modelValue="updateFontFamily" />
    </div>

    <div class="setting-item">
      <label>Font Size</label>
      <el-select v-model="fontSize" placeholder="选择大小" @change="updateFontSize">
        <el-option v-for="size in availableFontSizes" :key="size" :label="size + 'px'" :value="size" />
      </el-select>
    </div>

    <div class="setting-item">
      <label>Position</label>
      <div class="position-inputs">
        <div>
          <span>X:</span>
          <input type="number" v-model.number="positionX" @change="updatePosition" />
        </div>
        <div>
          <span>Y:</span>
          <input type="number" v-model.number="positionY" @change="updatePosition" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes } from '@/config/settings'
import { FontTypes } from '@/constants/fonts'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()

// 响应式状态
const color = ref(props.element?.fill || '#ffffff')
const fontFamily = ref(props.element?.fontFamily || 'Yoghurt-One')
const fontSize = ref(props.element?.fontSize || 24)
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))

// 计算可用的字体大小（最大到96）
const availableFontSizes = computed(() => {
  return fontSizes.filter((size) => size <= 96)
})

// 更新颜色
const updateColor = (newColor) => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('fill', newColor)
  baseStore.canvas.renderAll()
}

// 更新字体
const updateFontFamily = async (newFontFamily) => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('fontFamily', newFontFamily)
  baseStore.canvas.renderAll()
}

// 初始化全局图标字体大小（若未设置）
if (baseStore.currentIconFontSize == null && props.element?.fontSize) {
  baseStore.setIconFontSize(props.element.fontSize)
}

// 更新字体大小（集中处理，确保统一）
const updateFontSize = async (newSize) => {
  if (!props.element || !baseStore.canvas) return
  await baseStore.requestUpdateIconFontSize(props.element, newSize)
}

// 更新位置
const updatePosition = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set({
    left: positionX.value,
    top: positionY.value
  })
  baseStore.canvas.renderAll()
}

// 监听画布上的对象变化
watch(
  () => props.element?.left,
  (newLeft) => {
    if (newLeft !== undefined) {
      positionX.value = Math.round(newLeft)
    }
  }
)

watch(
  () => props.element?.top,
  (newTop) => {
    if (newTop !== undefined) {
      positionY.value = Math.round(newTop)
    }
  }
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.position-inputs {
  display: flex;
  gap: 16px;
}

.position-inputs div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-inputs input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>