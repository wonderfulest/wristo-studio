<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>位置</label>
      <PositionInputs
        :left="scrollAreaLeft"
        :top="scrollAreaTop"
        @update:left="(v) => (scrollAreaLeft = v)"
        @update:top="(v) => (scrollAreaTop = v)"
        @change="updatePosition"
      />
    </div>
    <!-- <div class="setting-item">
      <label>对齐方式</label>
      <AlignXButtons
        :options="originXOptions"
        v-model="originX"
        @update:modelValue="updateOriginX"
      />
    </div> -->
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
      <label>滚动区域背景</label>
      <ColorPicker v-model="scrollAreaBackground" @change="updateScrollAreaBackground" />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
    <div class="setting-item">
      <label>滚动区域宽度</label>
      <input
        type="number"
        min="10"
        v-model.number="scrollAreaWidth"
        @change="updateScrollAreaWidth"
      >
    </div>
    <div class="setting-item">
      <label>文本内容</label>
      <TextTemplateEditor v-model="textTemplate" @change="updateTextTemplate" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { useScrollableTextStore } from '@/stores/elements/texts/scrollableTextElement'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextTemplateEditor from '@/components/settings/texts/components/TextTemplateEditor.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
})

const baseStore = useBaseStore()
const fontStore = useFontStore()
const scrollableTextStore = useScrollableTextStore()

const fontSize = ref(props.element?.fontSize || 36)
const textColor = ref(props.element?.fill || '#FFFFFF')
const fontFamily = ref(props.element?.fontFamily)
// 水平对齐方式：滚动文本只支持居中
const originX = ref('center')
const textTemplate = ref(props.element?.text || '')
const scrollAreaWidth = ref(Math.round(props.element?.scrollAreaWidth || 100))
const scrollAreaLeft = ref(Math.round(props.element?.scrollAreaLeft ?? 227))
const scrollAreaTop = ref(Math.round(props.element?.scrollAreaTop ?? 227))
const scrollAreaBackground = ref(props.element?.scrollAreaBackground || 'rgba(0,0,0,0)')

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
  // 无论按钮点击什么，都强制使用居中对齐
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
  // 重置裁剪区域和滚动起始状态，使文本在新位置重新从右侧进入
  props.element.clipPath = null
  props.element.__scrollInitDone = false
  baseStore.canvas.renderAll()
  scrollableTextStore.showScrollRegion(props.element)
  scrollableTextStore.startScrollableAnimation(props.element)
}

const updateTextTemplate = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('text', textTemplate.value)
  baseStore.canvas.renderAll()
}

const updateScrollAreaWidth = () => {
  if (!props.element || !baseStore.canvas) return
  const value = Number(scrollAreaWidth.value) || 0
  if (value <= 0) return
  props.element.set('scrollAreaWidth', value)
  baseStore.canvas.renderAll()
  // 宽度变更时，立即刷新滚动区域矩形
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
  () => props.element?.text,
  (newText) => {
    if (typeof newText === 'string') {
      textTemplate.value = newText
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
