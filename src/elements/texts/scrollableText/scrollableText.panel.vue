<template>
  <div class="settings-section">
    <div class="setting-item">
      <TextPropertyField
        v-model="textProperty"
        :label="t('elementSettings.textVariable')"
        :placeholder="t('elementSettings.selectTextProperty')"
        :fallback-text="currentText"
        @change="applyTextProperty"
      />
      <TextPropertyPreview
        v-if="selectedTextProperty"
        :property-key="textProperty"
        :property="selectedTextProperty"
      />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.position') }}</label>
      <PositionInputs
        :left="scrollAreaLeft"
        :top="scrollAreaTop"
        @update:left="(v) => (scrollAreaLeft = v)"
        @update:top="(v) => (scrollAreaTop = v)"
        @change="updatePosition"
      />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.fontSize') }}</label>
      <select v-model.number="fontSize" @change="updateFontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
      </select>
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.fontColor') }}</label>
      <ColorPicker v-model="textColor" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.fontFamily') }}</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { usePropertiesStore } from '@/stores/properties'
import { fontSizes } from '@/config/settings'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/elements/common/settings/TextPropertyField.vue'
import TextPropertyPreview from '@/elements/common/settings/TextPropertyPreview.vue'
import { showScrollRegion, startScrollableAnimation } from '@/elements/texts/scrollableText/scrollableText.renderer'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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
const propertiesStore = usePropertiesStore()

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})
const currentText = computed(() => {
  const model = currentModel.value as any
  return String(model?.textTemplate ?? model?.text ?? '')
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
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

const updateFontFamily = async () => {
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }

  document.fonts.ready.then(() => {
    applyUpdate({ fontFamily: fontFamily.value })
  })
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
    ;(props.element as any).clipPath = null
    ;(props.element as any).__scrollInitDone = false
    baseStore.canvas.renderAll()
    if (props.element) {
      showScrollRegion(props.element as any)
    }
    startScrollableAnimation(props.element as any)
  }
}

const applyTextProperty = () => {
  if (!textProperty.value) return
  const template = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof template === 'string') {
    applyUpdate({ textProperty: textProperty.value, textTemplate: template })

    if (!props.applyPatch && props.element && baseStore.canvas) {
      ;(props.element as any).clipPath = null
      ;(props.element as any).__scrollInitDone = false
      baseStore.canvas.renderAll()
      if (props.element) {
        showScrollRegion(props.element as any)
      }
      startScrollableAnimation(props.element as any)
    }
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
        showScrollRegion(props.element as any)
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
        showScrollRegion(props.element as any)
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
