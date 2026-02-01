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

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { useScrollableTextStore } from '@/stores/elements/texts/scrollableTextElement'
import { usePropertiesStore } from '@/stores/properties'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/settings/common/TextPropertyField.vue'
import { getDataValueByName } from '@/utils/dataSimulator'

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
})

const baseStore = useBaseStore()
const fontStore = useFontStore()
const scrollableTextStore = useScrollableTextStore()
const propertiesStore = usePropertiesStore()

const fontSize = ref(props.element?.fontSize || 36)
const textColor = ref(props.element?.fill || '#FFFFFF')
const fontFamily = ref(props.element?.fontFamily)
const originX = ref('center')
const scrollAreaWidth = ref(Math.round(props.element?.scrollAreaWidth || 100))
const scrollAreaLeft = ref(Math.round(props.element?.scrollAreaLeft ?? 227))
const scrollAreaTop = ref(Math.round(props.element?.scrollAreaTop ?? 227))
const scrollAreaBackground = ref(props.element?.scrollAreaBackground || 'rgba(0,0,0,0)')
const textProperty = ref(props.element?.textProperty || '')

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

const updateFontSize = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('fontSize', fontSize.value)
  baseStore.canvas.renderAll()
}

const updateTextColor = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('fill', textColor.value)
  baseStore.canvas.renderAll()
}

const updateScrollAreaBackground = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.scrollAreaBackground = scrollAreaBackground.value
  baseStore.canvas.renderAll()
  scrollableTextStore.showScrollRegion(props.element)
}

const updateFontFamily = async () => {
  if (!props.element || !baseStore.canvas) return

  await fontStore.loadFont(fontFamily.value)

  document.fonts.ready.then(() => {
    props.element.set('fontFamily', fontFamily.value)
    baseStore.canvas.renderAll()
  })
}

const updateOriginX = (value) => {
  if (!props.element || !baseStore.canvas) return
  // Always force center alignment regardless of button value
  value = 'center'
  props.element.set({
    originX: value,
  })

  originX.value = value
  props.element.setCoords()
  baseStore.canvas.renderAll()
}

const updatePosition = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set({
    left: scrollAreaLeft.value,
    top: scrollAreaTop.value,
    scrollAreaLeft: scrollAreaLeft.value,
    scrollAreaTop: scrollAreaTop.value,
  })
  // Reset clipPath and scrolling state so text restarts from the right at new position
  props.element.clipPath = null
  props.element.__scrollInitDone = false
  baseStore.canvas.renderAll()
  scrollableTextStore.showScrollRegion(props.element)
  scrollableTextStore.startScrollableAnimation(props.element)
}

const applyTextProperty = () => {
  if (!textProperty.value || !props.element || !baseStore.canvas) return
  const template = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof template === 'string') {
    props.element.textProperty = textProperty.value
    // Treat property value as template string and resolve final display text
    const resolvedText = (template || '').replace(/\{\{([^}]+)\}\}/g, (_match, p1) => {
      const key = String(p1 || '').trim()
      return key ? getDataValueByName(key) : ''
    })

    props.element.set('text', resolvedText)
    // Reset clipPath and scrolling state so new text restarts from the right in current area
    props.element.clipPath = null
    props.element.__scrollInitDone = false
    baseStore.canvas.renderAll()
    scrollableTextStore.showScrollRegion(props.element)
    scrollableTextStore.startScrollableAnimation(props.element)
  }
}

const updateScrollAreaWidth = () => {
  if (!props.element || !baseStore.canvas) return
  const value = Number(scrollAreaWidth.value) || 0
  if (value <= 0) return
  props.element.set('scrollAreaWidth', value)
  baseStore.canvas.renderAll()
  scrollableTextStore.showScrollRegion(props.element)
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
