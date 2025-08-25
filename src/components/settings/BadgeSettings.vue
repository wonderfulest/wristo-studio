<template>
  <div class="settings-section">
    <!-- badge 只支持水平垂直居中，x,y 为中心坐标 -->
    <div class="setting-item">
      <label>位置</label>
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
    <!-- 长、宽、圆角设置 -->
    <div class="position-inputs">
      <div>
        <span>宽:</span>
        <input type="number" v-model.number="width" @change="updateWidth" />
      </div>
      <div>
        <span>高:</span>
        <input type="number" v-model.number="height" @change="updateHeight" />
      </div>
    </div>

    <div class="setting-item">
      <label>圆角</label>
      <input v-model.number="borderRadius" type="number" @change="updateBorderRadius" />
    </div>

    <div class="setting-item">
      <label>数据类型</label>
      <select v-model="metricSymbol" @change="updateMetricType">
        <option v-for="(option, index) in DataTypeOptions" :key="index" :value="option.metricSymbol">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="setting-item">
      <label>背景颜色</label>
      <ColorPicker v-model="bgColor" @change="updateBgColor" />
    </div>
    <!-- 文字设置 -->
    <div class="setting-item">
      <label>字体大小</label>
      <select v-model.number="fontSize" @change="updateFontSize">
        <option v-for="size in fontSizes" :key="size" :value="size">
          {{ size }}
        </option>
      </select>
    </div>
    <div class="setting-item">
      <label>字体颜色</label>
      <ColorPicker v-model="textColor" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <FontPicker v-model="fontFamily" @change="updateFontFamily" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useBadgeStore } from '@/stores/elements/badgeElement'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions, DataTypeOptions, getMetricBySymbol } from '@/config/settings'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()
const fontStore = useFontStore()

// Helper function to get element by type
const getElementByType = (type) => {
  return props.element?._objects?.find((obj) => obj.eleType === type)
}

// 设置项的响应式状态
const groupElement = props.element
const textElement = getElementByType('badge-text')
const bgElement = getElementByType('badge-bg')

const width = ref(Math.round(groupElement.width))
const height = ref(Math.round(groupElement.height))
const fontSize = ref(textElement.fontSize)
const textColor = ref(textElement.fill)
const fontFamily = ref(textElement.fontFamily)
const positionX = ref(Math.round(groupElement.left))
const positionY = ref(Math.round(groupElement.top))

const borderRadius = ref(Math.round(bgElement.rx))
const bgColor = ref(bgElement.fill)
const metricSymbol = ref(groupElement.metricSymbol)

// 加载字体列表
onMounted(async () => {
  if (fontStore.fonts.length === 0) {
    await fontStore.fetchFonts()
  }
  // 如果有字体，预加载当前字体
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }
})

// 监听元素属性变化
watch(
  () => props.element,
  (obj) => {
    if (!obj) return
  },
  { deep: true }
)

// 更新方法
const updateWidth = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('width', width.value)
  bgElement.set('width', width.value)
  props.element.setCoords()
  baseStore.canvas.renderAll()
}

const updateHeight = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('height', height.value)
  bgElement.set('height', height.value)
  props.element.setCoords()
  baseStore.canvas.renderAll()
}

const updateFontSize = () => {
  if (!props.element || !baseStore.canvas) return
  const textElement = getElementByType('badge-text')
  if (textElement) {
    textElement.set('fontSize', fontSize.value)
    baseStore.canvas.renderAll()
  }
}

const updateTextColor = () => {
  if (!props.element || !baseStore.canvas) return
  const textElement = getElementByType('badge-text')
  if (textElement) {
    textElement.set('fill', textColor.value)
    baseStore.canvas.renderAll()
  }
}

const updateFontFamily = async () => {
  if (!props.element || !baseStore.canvas) return
  const textElement = getElementByType('badge-text')
  if (textElement) {
    // 加载新字体
    await fontStore.loadFont(fontFamily.value)

    // 确保字体已加载
    document.fonts.ready.then(() => {
      textElement.set('fontFamily', fontFamily.value)
      baseStore.canvas.renderAll()
    })
  }
}

const updateBorderRadius = () => {
  if (!props.element || !baseStore.canvas) return
  const bgElement = getElementByType('badge-bg')
  if (bgElement) {
    bgElement.set({
      rx: borderRadius.value,
      ry: borderRadius.value
    })
    baseStore.canvas.renderAll()
  }
}

const updateBgColor = () => {
  if (!props.element || !baseStore.canvas) return
  const bgElement = getElementByType('badge-bg')
  if (bgElement) {
    bgElement.set('fill', bgColor.value)
  }
  const textElement = getElementByType('badge-text')
  if (textElement) {
    textElement.set('backgroundColor', bgColor.value)
  }
  baseStore.canvas.renderAll()
}

const updateOriginX = (value) => {
  if (!props.element || !baseStore.canvas) return
  const obj = props.element
  obj.set({
    originX: value
  })

  originX.value = value

  props.element.setCoords()
  baseStore.canvas.renderAll()
}

const updatePosition = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set({
    left: positionX.value,
    top: positionY.value
  })

  props.element.setCoords()
  baseStore.canvas.renderAll()
}

const updateMetricType = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('metricSymbol', metricSymbol.value)
  const metric = getMetricBySymbol(metricSymbol.value)
  const textElement = getElementByType('badge-text')
  if (textElement) {
    textElement.set('text', metric.defaultValue)
  }
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
.align-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.align-buttons .iconify {
  font-size: 18px;
}
</style>
