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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { useBaseStore } from '@/stores/baseStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { fontSizes } from '@/config/settings'
import { FontTypes } from '@/config/fonts'

const props = defineProps({
  // 旧通道：直接传入 FabricElement
  element: {
    type: Object,
    required: false,
  },
  // 新通道：业务配置 + 通用补丁函数
  config: {
    type: Object,
    required: false,
  },
  applyPatch: {
    type: Function,
    required: false,
  },
})

const baseStore = useBaseStore()
const iconFontStrategyStore = useIconFontStrategyStore()

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

// 响应式状态
const color = ref(currentModel.value?.fill || '#ffffff')
const fontFamily = ref(currentModel.value?.fontFamily || 'Yoghurt-One')
const fontSize = ref(currentModel.value?.fontSize || 24)
const positionX = ref(Math.round(currentModel.value?.left || 0))
const positionY = ref(Math.round(currentModel.value?.top || 0))

// 计算可用的字体大小（最大到96）
const availableFontSizes = computed(() => {
  return fontSizes.filter((size) => size <= 96)
})

// 更新颜色
const updateColor = (newColor: string) => {
  // 新通道：优先走 applyPatch
  if (props.applyPatch && props.config) {
    props.applyPatch({ fill: newColor })
    color.value = newColor
    return
  }

  if (!props.element || !baseStore.canvas) return
  props.element.set('fill', newColor)
  baseStore.canvas.renderAll()
}

// 更新字体
const updateFontFamily = (newFontFamily: string) => {
  if (props.applyPatch && props.config) {
    props.applyPatch({ fontFamily: newFontFamily })
    fontFamily.value = newFontFamily
    return
  }

  if (!props.element || !baseStore.canvas) return
  props.element.set('fontFamily', newFontFamily)
  baseStore.canvas.renderAll()
}

// 更新字体大小（集中处理，确保统一）
const updateFontSize = async (newSize: number) => {
  if (props.applyPatch && props.config) {
    props.applyPatch({ fontSize: newSize })
    fontSize.value = newSize
    return
  }

  if (!props.element) return
  await iconFontStrategyStore.requestUpdateIconFontSize(props.element, newSize)
  fontSize.value = (props.element as any)?.fontSize || newSize
}

// 监听画布上的对象变化（旧通道专用）
watch(
  () => props.element?.left,
  (newLeft) => {
    if (newLeft !== undefined && !props.applyPatch) {
      positionX.value = Math.round(newLeft)
    }
  },
)

watch(
  () => props.element?.top,
  (newTop) => {
    if (newTop !== undefined && !props.applyPatch) {
      positionY.value = Math.round(newTop)
    }
  },
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
