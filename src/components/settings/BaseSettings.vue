<template>
  <div class="settings-section">
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
    <div class="setting-item">
      <label>对齐方式</label>
      <div class="align-buttons">
        <button v-for="align in originXOptions" :key="align.value" @click="updateOriginX(align.value)" :class="{ active: originX === align.value }" :title="align.label">
          <Icon :icon="align.icon" />
        </button>
      </div>
    </div>
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
      <input type="color" v-model="textColor" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <select v-model="fontFamily" @change="updateFontFamily">
        <option v-for="font in fontStore.fontOptions" :key="font.value" :value="font.value">
          {{ font.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { fontSizes, originXOptions } from '@/config/settings'
import { useFontStore } from '@/stores/fontStore'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()
const fontStore = useFontStore()

// 设置项的响应式状态
const fontSize = ref(props.element?.fontSize)
const textColor = ref(props.element?.fill)
const fontFamily = ref(props.element?.fontFamily)
const originX = ref(props.element?.originX)
const positionX = ref(Math.round(props.element?.left))
const positionY = ref(Math.round(props.element?.top))

// 监听元素属性变化
watch(
  () => props.element,
  (obj) => {
    if (!obj) return
  },
  { deep: true }
)

// 更新方法
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

const updateFontFamily = () => {
  if (!props.element || !baseStore.canvas) return

  // 确保字体已加载
  document.fonts.ready.then(() => {
    props.element.set('fontFamily', fontFamily.value)
    baseStore.canvas.renderAll()
  })
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

watch(
  () => props.element?.fontSize,
  (newSize) => {
    if (newSize !== undefined) {
      fontSize.value = newSize
    }
  }
)

watch(
  () => props.element?.fill,
  (newColor) => {
    if (newColor !== undefined) {
      textColor.value = newColor
    }
  }
)

watch(
  () => props.element?.fontFamily,
  (newFamily) => {
    if (newFamily !== undefined) {
      fontFamily.value = newFamily
    }
  }
)
</script>

<style scoped>
@import '../../assets/styles/settings.css';

/* 添加图标样式 */
.align-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.align-buttons .iconify {
  font-size: 18px;
}
</style>
