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

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/elements/common/settings/TextPropertyField.vue'

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

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})

// 设置项的响应式状态
const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
const originX = ref(currentModel.value?.originX || 'center')
const positionX = ref(Math.round(currentModel.value?.left || 0))
const positionY = ref(Math.round(currentModel.value?.top || 0))
const textProperty = ref(currentModel.value?.textProperty || '')

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
  // 仍然复用原有字体加载逻辑
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }
  document.fonts.ready.then(() => {
    applyUpdate({ fontFamily: fontFamily.value })
  })
}

const updateOriginX = (value: string) => {
  originX.value = value
  applyUpdate({ originX: value })
}

const updatePosition = () => {
  positionX.value = Math.round(positionX.value)
  positionY.value = Math.round(positionY.value)
  applyUpdate({ left: positionX.value, top: positionY.value })
}

const applyTextProperty = () => {
  if (!textProperty.value) return
  const template = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof template === 'string') {
    applyUpdate({ textProperty: textProperty.value, textTemplate: template })
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
