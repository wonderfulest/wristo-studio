<template>
  <div class="settings-section">
    <div class="setting-item">
      <TextPropertyField
        v-model="textProperty"
        label="Text Variable"
        placeholder="Select text property"
        @change="applyTextProperty"
      />
      <div v-if="selectedTextProperty" class="text-property-preview">
        <pre class="text-property-content">{{ selectedTextProperty.value }}</pre>
      </div>
    </div>
    <div class="setting-item">
      <label>Position</label>
      <PositionInputs
        :left="scrollAreaLeft"
        :top="scrollAreaTop"
        @update:left="(v) => (scrollAreaLeft = v)"
        @update:top="(v) => (scrollAreaTop = v)"
        @change="updatePosition"
      />
    </div>
    <div class="setting-item">
      <label>Font Size</label>
      <select v-model.number="fontSize" @change="updateFontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
      </select>
    </div>
    <div class="setting-item">
      <label>Font Color</label>
      <ColorPicker v-model="textColor" @change="updateTextColor" />
    </div>
    <!-- <div class="setting-item">
      <label>Scroll Area Background</label>
      <ColorPicker v-model="scrollAreaBackground" @change="updateScrollAreaBackground" />
    </div> -->
    <div class="setting-item">
      <label>Font Family</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
    <!-- <div class="setting-item">
      <label>Scroll Area Width</label>
      <input
        type="number"
        min="10"
        v-model.number="scrollAreaWidth"
        @change="updateScrollAreaWidth"
      >
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { useScrollableTextStore } from '@/elements/texts/scrollableText/scrollableTextElement'
import { usePropertiesStore } from '@/stores/properties'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/elements/common/settings/TextPropertyField.vue'
import { getDataValueByName } from '@/utils/dataSimulator'

const props = defineProps({
  // 旧通道：直接传入 Fabric Text
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
const scrollableTextStore = useScrollableTextStore()
const propertiesStore = usePropertiesStore()

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
const originX = ref('center')
const scrollAreaWidth = ref(Math.round(currentModel.value?.scrollAreaWidth || 100))
const scrollAreaLeft = ref(Math.round(currentModel.value?.scrollAreaLeft ?? 227))
const scrollAreaTop = ref(Math.round(currentModel.value?.scrollAreaTop ?? 227))
const scrollAreaBackground = ref(currentModel.value?.scrollAreaBackground || 'rgba(0,0,0,0)')
const textProperty = ref(currentModel.value?.textProperty || '')

const selectedTextProperty = computed(() => {
  if (!textProperty.value) return null
  return propertiesStore.allProperties[textProperty.value] || null
})

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
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

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

const updateScrollAreaBackground = () => {
  applyUpdate({ scrollAreaBackground: scrollAreaBackground.value })
  if (!props.applyPatch && props.element && baseStore.canvas) {
    baseStore.canvas.renderAll()
    scrollableTextStore.showScrollRegion(props.element as any)
  }
}

const updateFontFamily = async () => {
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }

  document.fonts.ready.then(() => {
    applyUpdate({ fontFamily: fontFamily.value })
  })
}

const updateOriginX = (value: string) => {
  // Always force center alignment regardless of button value
  value = 'center'
  originX.value = value
  applyUpdate({ originX: value })
}

const updatePosition = () => {
  const patch = {
    left: scrollAreaLeft.value,
    top: scrollAreaTop.value,
    scrollAreaLeft: scrollAreaLeft.value,
    scrollAreaTop: scrollAreaTop.value,
  }
  applyUpdate(patch)

  if (!props.applyPatch && props.element && baseStore.canvas) {
    // Reset clipPath and scrolling state so text restarts from the right at new position
    ;(props.element as any).clipPath = null
    ;(props.element as any).__scrollInitDone = false
    baseStore.canvas.renderAll()
    scrollableTextStore.showScrollRegion(props.element as any)
    scrollableTextStore.startScrollableAnimation(props.element as any)
  }
}

const applyTextProperty = () => {
  if (!textProperty.value) return
  const template = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof template === 'string') {
    applyUpdate({ textProperty: textProperty.value, textTemplate: template })

    if (!props.applyPatch && props.element && baseStore.canvas) {
      // Reset clipPath and scrolling state so new text restarts from the right in current area
      ;(props.element as any).clipPath = null
      ;(props.element as any).__scrollInitDone = false
      baseStore.canvas.renderAll()
      scrollableTextStore.showScrollRegion(props.element as any)
      scrollableTextStore.startScrollableAnimation(props.element as any)
    }
  }
}

const updateScrollAreaWidth = () => {
  const value = Number(scrollAreaWidth.value) || 0
  if (value <= 0) return
  applyUpdate({ scrollAreaWidth: value })

  if (!props.applyPatch && props.element && baseStore.canvas) {
    baseStore.canvas.renderAll()
    scrollableTextStore.showScrollRegion(props.element as any)
  }
}

watch(
  () => props.element?.left,
  (newLeft) => {
    if (newLeft !== undefined && props.element?.scrollAreaLeft === undefined) {
      scrollAreaLeft.value = Math.round(newLeft)
    }
  }
)

watch(
  () => props.element?.top,
  (newTop) => {
    if (newTop !== undefined && props.element?.scrollAreaTop === undefined) {
      scrollAreaTop.value = Math.round(newTop)
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
  () => props.element?.scrollAreaLeft,
  (newLeft) => {
    if (typeof newLeft === 'number') {
      scrollAreaLeft.value = Math.round(newLeft)
    }
  }
)

watch(
  () => props.element?.scrollAreaTop,
  (newTop) => {
    if (typeof newTop === 'number') {
      scrollAreaTop.value = Math.round(newTop)
    }
  }
)

watch(
  () => props.element?.scrollAreaWidth,
  (newWidth) => {
    if (typeof newWidth === 'number' && newWidth > 0) {
      scrollAreaWidth.value = Math.round(newWidth)
      if (props.element) {
        scrollableTextStore.showScrollRegion(props.element)
      }
    }
  }
)

watch(
  () => props.element?.scrollAreaBackground,
  (newColor) => {
    if (typeof newColor === 'string') {
      scrollAreaBackground.value = newColor
      if (props.element) {
        scrollableTextStore.showScrollRegion(props.element)
      }
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
