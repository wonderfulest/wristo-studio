<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>{{ t('elementSettings.fontColor') }}</label>
      <ColorPicker v-model="color" @update:modelValue="updateColor" />
    </div>

    <div class="setting-item">
      <label>{{ t('elementSettings.font') }}</label>
      <FontPicker v-model="fontFamily" :type="FontTypes.ICON_FONT" @update:modelValue="updateFontFamily" />
    </div>

    <div class="setting-item">
      <label>{{ t('elementSettings.fontSize') }}</label>
      <FontSizeSelect v-model="fontSize" :options="availableFontSizes" @change="updateFontSize" />
    </div>

    <div class="setting-item">
      <label>{{ t('elementSettings.position') }}</label>
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

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import { useBaseStore } from '@/stores/baseStore'
import { useIconFontStrategyStore } from '@/stores/iconFontStrategyStore'
import { fontSizes } from '@/config/settings'
import { FontTypes } from '@/config/fonts'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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
const updateFontFamily = async (newFontFamily: string) => {
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
}

// 更新位置
const updatePosition = () => {
  if (props.applyPatch && props.config) {
    props.applyPatch({
      left: positionX.value,
      top: positionY.value,
    })
    return
  }

  if (!props.element || !baseStore.canvas) return
  props.element.set({
    left: positionX.value,
    top: positionY.value,
  })
  baseStore.canvas.renderAll()
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
