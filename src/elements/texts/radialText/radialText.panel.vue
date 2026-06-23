<template>
  <div class="settings-section text-settings-panel">
    <div class="text-settings-hero">
      <div class="text-settings-title">
        <span class="text-settings-kicker">{{ t('elementSettings.textPanelKicker') }}</span>
        <strong class="text-settings-heading">{{ t('elementSettings.radialTextPanelTitle') }}</strong>
        <span class="text-settings-description">{{ t('elementSettings.radialTextPanelHint') }}</span>
      </div>
      <span class="text-settings-badge">Radial</span>
    </div>

    <section class="text-settings-card">
      <div class="text-settings-card-header">
        <div class="text-settings-card-title">
          <strong>{{ t('elementSettings.contentSection') }}</strong>
          <span>{{ t('elementSettings.contentSectionHint') }}</span>
        </div>
      </div>
      <TextVariableEditor
        v-model="textProperty"
        :fallback-text="currentText"
        :owner-element-id="currentElementId"
        @apply="applyTextVariablePatch"
      />
    </section>

    <section class="text-settings-card">
      <div class="text-settings-card-header">
        <div class="text-settings-card-title">
          <strong>{{ t('elementSettings.layoutSection') }}</strong>
          <span>{{ t('elementSettings.radialLayoutSectionHint') }}</span>
        </div>
      </div>
      <div class="text-settings-grid">
        <div class="text-setting-field full">
      <label>{{ t('elementSettings.alignment') }}</label>
      <AlignXButtons
        :options="originXOptions"
        v-model="originX"
        @update:modelValue="updateOriginX"
      />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.angle') }}</label>
          <input type="number" v-model.number="angle" @change="updateAngle" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.radius') }}</label>
          <input type="number" v-model.number="radius" @change="updateRadius" />
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.direction') }}</label>
          <select v-model="direction" @change="updateDirection">
            <option value="clockwise">顺时针</option>
            <option value="counterClockwise" disabled>逆时针</option>
          </select>
        </div>
        <div class="text-setting-field">
          <label>{{ t('elementSettings.alignment') }}</label>
          <select v-model="justification" @change="updateJustification">
            <option value="left" disabled>左对齐</option>
            <option value="center">居中</option>
            <option value="right" disabled>右对齐</option>
          </select>
        </div>
      </div>
    </section>

    <section class="text-settings-card">
      <div class="text-settings-card-header">
        <div class="text-settings-card-title">
          <strong>{{ t('elementSettings.appearanceSection') }}</strong>
          <span>{{ t('elementSettings.appearanceSectionHint') }}</span>
        </div>
      </div>
      <div class="text-settings-grid">
        <div class="text-setting-field">
      <label>{{ t('elementSettings.fontSize') }}</label>
      <FontSizeSelect v-model="fontSize" @change="updateFontSize" />
        </div>
        <div class="text-setting-field">
      <label>{{ t('elementSettings.fontColor') }}</label>
      <ColorPicker v-model="fill" @change="updateTextColor" />
        </div>
        <div class="text-setting-field full">
      <label>{{ t('elementSettings.font') }}</label>
      <font-picker v-model="fontFamily" @change="updateFontFamily" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useFontStore } from '@/stores/fontStore'
import { originXOptions } from '@/config/settings'
import AlignXButtons from '@/elements/common/settings/AlignXButtons.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextVariableEditor from '@/elements/common/settings/TextVariableEditor.vue'
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

const currentModel = computed<any>(() => {
  return (props.config as any) || props.element || {}
})
const currentElementId = computed(() => String((props.config as any)?.id ?? props.element?.id ?? ''))
const currentText = computed(() => {
  const model = currentModel.value as any
  return String(model?.textTemplate ?? model?.text ?? '')
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const fill = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily || '')
const originX = ref(currentModel.value?.originX || 'center')
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

const applyTextVariablePatch = (patch: { textProperty: string; textTemplate: string }) => {
  textProperty.value = patch.textProperty
  applyUpdate(patch)
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

watch(
  () => (props.config as any)?.textProperty,
  (newTextProperty) => {
    textProperty.value = typeof newTextProperty === 'string' ? newTextProperty : ''
  }
)

watch(
  () => props.element?.textProperty,
  (newTextProperty) => {
    textProperty.value = typeof newTextProperty === 'string' ? newTextProperty : ''
  }
)
</script>

<style scoped>
@import '@/assets/styles/settings.css';
@import '@/assets/styles/textSettings.css';

.align-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.align-buttons .iconify {
  font-size: 18px;
}
</style>
