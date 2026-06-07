<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>{{ t('elementSettings.position') }}</label>
      <PositionInputs
        :left="positionX"
        :top="positionY"
        @update:left="(v) => (positionX = v)"
        @update:top="(v) => (positionY = v)"
        @change="updatePosition"
      />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.alignment') }}</label>
      <AlignXButtons
        :options="originXOptions"
        v-model="originX"
        @update:modelValue="updateOriginX"
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
      <ColorPicker v-model="fill" @change="updateTextColor" />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.font') }}</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
    </div>
    <div class="setting-item">
      <TextPropertyField
        v-model="textProperty"
        :label="t('elementSettings.textVariable')"
        :placeholder="t('elementSettings.selectTextProperty')"
        @change="applyTextProperty"
      />
      <div v-if="selectedTextProperty" class="text-property-preview">
        <div class="text-property-meta">
          <span class="label">{{ t('elementSettings.variableName') }}</span>
          <span class="value">{{ selectedTextProperty.title }}</span>
        </div>
        <div class="text-property-meta">
          <span class="label">{{ t('elementSettings.defaultContent') }}</span>
        </div>
        <pre class="text-property-content">{{ selectedTextProperty.value }}</pre>
      </div>
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.angle') }}</label>
      <input type="number" v-model.number="angle" @change="updateAngle" />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.radius') }}</label>
      <input type="number" v-model.number="radius" @change="updateRadius" />
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.direction') }}</label>
      <select v-model="direction" @change="updateDirection">
        <option value="clockwise">顺时针</option>
        <option value="counterClockwise" disabled>逆时针</option>
      </select>
    </div>
    <div class="setting-item">
      <label>{{ t('elementSettings.alignment') }}</label>
      <select v-model="justification" @change="updateJustification">
        <option value="left" disabled>左对齐</option>
        <option value="center">居中</option>
        <option value="right" disabled>右对齐</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useFontStore } from '@/stores/fontStore'
import { fontSizes, originXOptions } from '@/config/settings'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import PositionInputs from '@/elements/common/settings/PositionInputs.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextPropertyField from '@/elements/common/settings/TextPropertyField.vue'
import { usePropertiesStore } from '@/stores/properties'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  // 旧通道：直接传入 Fabric 组合对象
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

const fontStore = useFontStore()
const propertiesStore = usePropertiesStore()

const currentModel = computed<any>(() => {
  return (props.config as any) || props.element || {}
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const fill = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily || '')
const originX = ref(currentModel.value?.originX || 'center')
const positionX = ref(Math.round(currentModel.value?.left || 0))
const positionY = ref(Math.round(currentModel.value?.top || 0))
const textProperty = ref((currentModel.value as any)?.textProperty || '')
const initialAngle = (() => {
  const model: any = currentModel.value as any
  if (typeof model?.angle === 'number') return model.angle
  if (typeof model?.startAngle === 'number') return model.startAngle
  const radialMeta = model?.radialMeta
  if (radialMeta && typeof radialMeta.startAngle === 'number') return radialMeta.startAngle
  return 0
})()

const angle = ref(initialAngle)
const radius = ref(
  typeof (currentModel.value as any)?.radius === 'number'
    ? (currentModel.value as any).radius
    : 100,
)
const direction = ref((currentModel.value as any)?.direction || 'clockwise')
const justification = ref((currentModel.value as any)?.justification || 'center')

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
const applyUpdate = (patch: Record<string, any>) => {
  // 新通道：直接透传给外部的 applyPatch
  if (props.applyPatch && props.config) {
    props.applyPatch(patch)
    return
  }

  // 旧通道：直接更新画布元素
  if (props.element) {
    elementManager.updateElement(props.element as any, patch)
  }
}

const updateFontSize = () => {
  applyUpdate({ fontSize: fontSize.value })
}

const updateTextColor = () => {
  applyUpdate({ fill: fill.value })
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
  const value = propertiesStore.getPropertyValue(textProperty.value)
  if (typeof value === 'string') {
    applyUpdate({ textProperty: textProperty.value, textTemplate: value })
  }
}

const updateAngle = () => {
  applyUpdate({ angle: angle.value })
}

const updateRadius = () => {
  applyUpdate({ radius: radius.value })
}

const updateDirection = () => {
  applyUpdate({ direction: direction.value })
}

const updateJustification = () => {
  applyUpdate({ justification: justification.value })
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
