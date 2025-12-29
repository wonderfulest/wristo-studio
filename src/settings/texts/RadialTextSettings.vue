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
      <ColorPicker v-model="fill" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>字体</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
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
      <label>角度</label>
      <input type="number" v-model.number="angle" @change="updateAngle" />
    </div>
    <div class="setting-item">
      <label>半径</label>
      <input type="number" v-model.number="radius" @change="updateRadius" />
    </div>
    <div class="setting-item">
      <label>方向</label>
      <select v-model="direction" @change="updateDirection">
        <option value="clockwise">顺时针</option>
        <option value="counterClockwise" disabled>逆时针</option>
      </select>
    </div>
    <div class="setting-item">
      <label>对齐方式</label>
      <select v-model="justification" @change="updateJustification">
        <option value="left" disabled>左对齐</option>
        <option value="center">居中</option>
        <option value="right" disabled>右对齐</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/settings/common/AlignXButtons.vue'
import PositionInputs from '@/settings/common/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/settings/common/TextPropertyField.vue'
import { usePropertiesStore } from '@/stores/properties'

const props = defineProps({
  element: {
    type: Object,
    required: true,
  },
})

const baseStore = useBaseStore()
const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()

const fontSize = ref(props.element?.fontSize || 36)
const fill = ref(props.element?.fill || '#FFFFFF')
const fontFamily = ref(props.element?.fontFamily || '')
const originX = ref(props.element?.originX || 'center')
const positionX = ref(Math.round(props.element?.left || 0))
const positionY = ref(Math.round(props.element?.top || 0))
const textProperty = ref(props.element?.textProperty || '')
const angle = ref(
  typeof props.element?.startAngle === 'number'
    ? props.element.startAngle
    : (props.element?.radialMeta?.startAngle ?? 0)
)
const radius = ref(typeof props.element?.radius === 'number' ? props.element.radius : 100)
const direction = ref(props.element?.direction || 'clockwise')
const justification = ref(props.element?.justification || 'center')

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

watch(
  () => props.element?.fontFamily,
  (newFont) => {
    if (typeof newFont === 'string') {
      fontFamily.value = newFont
    }
  }
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
  // 更新 group 本身的字体大小
  props.element.set('fontSize', fontSize.value)

  // 同步更新环形文字中每个字符的字体大小
  if (Array.isArray(props.element._objects)) {
    props.element._objects.forEach((child) => {
      child.set && child.set('fontSize', fontSize.value)
    })
  }

  // 更新元数据中的 fontSize，供 updateRadialLayout 使用
  if (props.element.radialMeta) {
    props.element.radialMeta.fontSize = fontSize.value
  }

  // 重新布局环形文字
  if (typeof props.element.updateRadialLayout === 'function') {
    props.element.updateRadialLayout()
  }
  baseStore.canvas.renderAll()
}

const updateTextColor = () => {
  if (!props.element || !baseStore.canvas) return
  // 对于普通文本，直接设置 fill 即可
  props.element.set('fill', fill.value)

  // 对于径向文本（radialText），实际渲染往往是一个由多个子对象组成的组合
  // 需要同时更新子对象的 fill，颜色才会生效
  if (props.element.eleType === 'radialText') {
    const group = props.element
    if (Array.isArray(group._objects)) {
      group._objects.forEach((child) => {
        child.set && child.set('fill', fill.value)
      })
    }
  }
  baseStore.canvas.renderAll()
}

const updateFontFamily = async () => {
  if (!props.element || !baseStore.canvas) return

  await fontStore.loadFont(fontFamily.value)

  document.fonts.ready.then(() => {
    // 更新 group 的字体
    props.element.set('fontFamily', fontFamily.value)

    // 同步更新每个字符的字体
    if (Array.isArray(props.element._objects)) {
      props.element._objects.forEach((child) => {
        child.set && child.set('fontFamily', fontFamily.value)
      })
    }

    // 更新元数据中的 fontFamily
    if (props.element.radialMeta) {
      props.element.radialMeta.fontFamily = fontFamily.value
    }

    // 重新布局
    if (typeof props.element.updateRadialLayout === 'function') {
      props.element.updateRadialLayout()
    }
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

const applyTextProperty = () => {
  if (!textProperty.value || !props.element || !baseStore.canvas) return
  const value = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof value === 'string') {
    console.log('applyTextProperty', value)
    props.element.textProperty = textProperty.value
    if (typeof props.element.updateRadialText === 'function') {
      props.element.updateRadialText(value)
    } else {
      props.element.set('text', value)
      if (props.element.radialMeta) props.element.radialMeta.text = value
      if (typeof props.element.updateRadialLayout === 'function') {
        props.element.updateRadialLayout()
      } else if (props.element.setCoords) {
        props.element.setCoords()
      }
    }
    baseStore.canvas.renderAll()
  }
}

const updateAngle = () => {
  if (!props.element || !baseStore.canvas) return
  
  // 使用自定义属性 startAngle，而不是 Fabric 的 angle（后者会导致 group 整体旋转）
  props.element.startAngle = angle.value
  
  // 同步更新元数据
  if (props.element.radialMeta) {
    props.element.radialMeta.startAngle = angle.value
  }

  // 角度变化时通过 updateRadialLayout 重新排布字符位置
  if (typeof props.element.updateRadialLayout === 'function') {
    props.element.updateRadialLayout()
  } else {
    props.element.setCoords()
  }
  baseStore.canvas.renderAll()
}

const updateRadius = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('radius', radius.value)
  if (typeof props.element.updateRadialLayout === 'function') {
    props.element.updateRadialLayout()
  }
  baseStore.canvas.renderAll()
}

const updateDirection = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('direction', direction.value)

  // 更新元数据中的方向
  if (props.element.radialMeta) {
    props.element.radialMeta.direction = direction.value === 'counterClockwise' ? -1 : 1
  }

  if (typeof props.element.updateRadialLayout === 'function') {
    props.element.updateRadialLayout()
  }
  baseStore.canvas.renderAll()
}

const updateJustification = () => {
  if (!props.element || !baseStore.canvas) return
  props.element.set('justification', justification.value)
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
  () => props.element?.angle,
  (newAngle) => {
    if (typeof newAngle === 'number') {
      angle.value = newAngle
    }
  }
)

watch(
  () => props.element?.radius,
  (newRadius) => {
    if (typeof newRadius === 'number') {
      radius.value = newRadius
    }
  }
)

watch(
  () => props.element?.direction,
  (newDir) => {
    if (typeof newDir === 'string') {
      direction.value = newDir
    }
  }
)

watch(
  () => props.element?.justification,
  (newJust) => {
    if (newJust != null) {
      justification.value = newJust
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
