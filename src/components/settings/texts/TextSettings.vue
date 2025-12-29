<template>
  <div class="settings-section">
    <div class="setting-item">
      <TextPropertyField
        v-model="textProperty"
        label="文本变量"
        placeholder="选择字符串属性"
        @change="applyTextProperty"
      />
      <div v-if="selectedTextProperty" class="text-property-preview">
        <div class="text-property-meta">
          <span class="label">变量名：</span>
          <span class="value">{{ selectedTextProperty.title }}</span>
        </div>
        <div class="text-property-meta">
          <span class="label">默认内容：</span>
        </div>
        <pre class="text-property-content">{{ selectedTextProperty.value }}</pre>
      </div>
    </div>
    <div class="setting-item">
      <label>位置</label>
      <PositionInputs 
        :left="positionX" 
        :top="positionY" 
        @update:left="(v)=> positionX = v" 
        @update:top="(v)=> positionY = v" 
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
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useTextStore } from '@/stores/elements/texts/textElement'
import { usePropertiesStore } from '@/stores/properties'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/components/settings/common/AlignXButtons.vue'
import PositionInputs from '@/components/settings/common/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/components/settings/common/TextPropertyField.vue'
import { getDataValueByName } from '@/utils/dataSimulator'

const props = defineProps({
  element: {
    type: Object,
    required: true
  }
})

const baseStore = useBaseStore()
const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()

// 设置项的响应式状态
const fontSize = ref(props.element?.fontSize || 36)
const textColor = ref(props.element?.fill || '#FFFFFF')
const fontFamily = ref(props.element?.fontFamily)
const originX = ref(props.element?.originX || 'center')
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))
const textProperty = ref(props.element?.textProperty || '')

const selectedTextProperty = computed(() => {
  if (!textProperty.value) return null
  return propertiesStore.allProperties[textProperty.value] || null
})

// 监听元素属性变化
watch(
  () => props.element,
  (obj) => {
    if (!obj) return
  },
  { deep: true }
)

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

const updateFontFamily = async () => {
  if (!props.element || !baseStore.canvas) return

  // 加载新字体
  await fontStore.loadFont(fontFamily.value)

  // 确保字体已加载
  document.fonts.ready.then(() => {
    props.element.set('fontFamily', fontFamily.value)
    baseStore.canvas.renderAll()
  })
}

const updateOriginX = (value) => {
  if (!props.element || !baseStore.canvas) return
  props.element.set({
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
  baseStore.canvas.renderAll()
}

const applyTextProperty = () => {
  if (!textProperty.value || !props.element || !baseStore.canvas) return
  const template = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof template === 'string') {
    // 将属性值视为模板字符串：保存到 textTemplate，并解析出实际展示文本
    const resolvedText = (template || '').replace(/\{\{([^}]+)\}\}/g, (_match, p1) => {
      const key = String(p1 || '').trim()
      return key ? getDataValueByName(key) : ''
    })

    props.element.textProperty = textProperty.value
    props.element.textTemplate = template
    props.element.set('text', resolvedText)
    baseStore.canvas.renderAll()
  }
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

// 监听字体大小变化
watch(
  () => props.element?.fontSize,
  (newFontSize) => {
    if (newFontSize !== undefined) {
      fontSize.value = newFontSize
    }
  }
)

// 监听文本内容变化
watch(
  () => props.element?.text,
  (newText) => {
    if (typeof newText === 'string') {
      // 文本内容来源于属性，保持只读，不在这里编辑
    }
  }
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';

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
