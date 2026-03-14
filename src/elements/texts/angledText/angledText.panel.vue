<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>位置</label>
      <PositionInputs
        :left="positionX"
        :top="positionY"
        @update:left="(v) => (positionX = v)"
        @update:top="(v) => (positionY = v)"
        @change="updatePosition"
      />
    </div>
    <div class="setting-item">
      <label>对齐方式</label>
      <AlignXButtons
        :options="originXOptions"
        v-model="originX"
        @update:modelValue="updateOriginX"
      />
    </div>
    <div class="setting-item">
      <label>字体大小</label>
      <select v-model.number="fontSize" @change="updateFontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
      </select>
    </div>
    <div class="setting-item">
      <label>字体颜色</label>
      <ColorPicker v-model="textColor" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
    <div class="setting-item">
      <label>文本内容</label>
      <TextTemplateEditor v-model="textTemplate" @change="updateTextTemplate" />
    </div>
    <div class="setting-item">
      <label>角度</label>
      <input type="number" v-model.number="angle" @change="updateAngle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'

const props = defineProps({
  // 旧通道：直接传入 Fabric 文本对象
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
const fontStore = useFontStore()

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) || props.element || {}
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
const originX = ref(currentModel.value?.originX || 'center')
const positionX = ref(Math.round(currentModel.value?.left || 0))
const positionY = ref(Math.round(currentModel.value?.top || 0))
const textTemplate = ref((currentModel.value as any)?.textTemplate ?? currentModel.value?.text ?? '')
const angle = ref(
  typeof (currentModel.value as any)?.angle === 'number'
    ? (currentModel.value as any).angle
    : -45,
)

watch(
  () => props.element,
  (obj) => {
    if (!obj) return
  },
  { deep: true }
)

onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }
})

const applyUpdate = (patch: Record<string, any>) => {
  // 新通道：直接透传给外部的 applyPatch
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  // 旧通道：直接更新画布元素
  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const updateFontSize = () => {
  applyUpdate({ fontSize: fontSize.value })
}

const updateTextColor = () => {
  applyUpdate({ fill: textColor.value })
}

const updateFontFamily = async () => {
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }

  document.fonts.ready.then(() => {
    applyUpdate({ fontFamily: fontFamily.value })
  })
}

const updateOriginX = (value) => {
  originX.value = value
  applyUpdate({ originX: value })
}

const updatePosition = () => {
  positionX.value = Math.round(positionX.value)
  positionY.value = Math.round(positionY.value)
  applyUpdate({ left: positionX.value, top: positionY.value })
}

const updateTextTemplate = () => {
  applyUpdate({ textTemplate: textTemplate.value })
}

const updateAngle = () => {
  applyUpdate({ angle: angle.value })
}

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

watch(
  () => props.element?.fontSize,
  (newFontSize) => {
    if (newFontSize !== undefined) {
      fontSize.value = newFontSize
    }
  }
)

watch(
  () => props.element?.text,
  (newText) => {
    if (typeof newText === 'string') {
      textTemplate.value = newText
    }
  }
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';

.align-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.align-buttons .iconify {
  font-size: 18px;
}
</style>
