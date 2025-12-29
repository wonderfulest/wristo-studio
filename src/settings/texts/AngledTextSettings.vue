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

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
})

const baseStore = useBaseStore()
const fontStore = useFontStore()

const fontSize = ref(props.element?.fontSize || 36)
const textColor = ref(props.element?.fill || '#FFFFFF')
const fontFamily = ref(props.element?.fontFamily)
const originX = ref(props.element?.originX || 'center')
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))
const textTemplate = ref(props.element?.text || '')
const angle = ref(typeof props.element?.angle === 'number' ? props.element.angle : -45)

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
    left: positionX.value,
    top: positionY.value,
  })
  baseStore.canvas.renderAll()
}

const updateTextTemplate = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('text', textTemplate.value)
  baseStore.canvas.renderAll()
}

const updateAngle = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('angle', angle.value)
  props.element.setCoords()
  baseStore.canvas.renderAll()
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

watch(
  () => props.element?.angle,
  (newAngle) => {
    if (typeof newAngle === 'number') {
      angle.value = newAngle
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
