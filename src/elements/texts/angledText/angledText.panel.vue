<template>
  <div class="settings-section text-settings-panel">
    <div class="text-settings-hero">
      <div class="text-settings-title">
        <span class="text-settings-kicker">{{ t('elementSettings.textPanelKicker') }}</span>
        <strong class="text-settings-heading">{{ t('elementSettings.angledTextPanelTitle') }}</strong>
        <span class="text-settings-description">{{ t('elementSettings.angledTextPanelHint') }}</span>
      </div>
      <span class="text-settings-badge">Angle</span>
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
        :fallback-text="textTemplate"
        :owner-element-id="currentElementId"
        @apply="applyTextVariablePatch"
        @update-template="(value) => (textTemplate = value)"
      />
    </section>

    <section class="text-settings-card">
      <div class="text-settings-card-header">
        <div class="text-settings-card-title">
          <strong>{{ t('elementSettings.layoutSection') }}</strong>
          <span>{{ t('elementSettings.layoutSectionHint') }}</span>
        </div>
      </div>
      <div class="text-settings-grid single">
        <div class="text-setting-field">
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
      <ColorPicker v-model="textColor" @change="updateTextColor" />
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
  // 旧通道：直接传入 Fabric 文本对象
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

// 当前表单绑定的数据源：优先使用业务 config，其次回退到 FabricElement
const currentModel = computed<any>(() => {
  return (props.config as any) || props.element || {}
})
const currentElementId = computed(() => String((props.config as any)?.id ?? props.element?.id ?? ''))

const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
const originX = ref(currentModel.value?.originX || 'center')
const textProperty = ref((currentModel.value as any)?.textProperty || '')
const textTemplate = ref((currentModel.value as any)?.textTemplate ?? currentModel.value?.text ?? '')
const angle = ref(
  typeof (currentModel.value as any)?.angle === 'number'
    ? (currentModel.value as any).angle
    : -45,
)

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
  applyUpdate({ fill: textColor.value })
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
  textTemplate.value = patch.textTemplate
  applyUpdate(patch)
}

const updateAngle = () => {
  applyUpdate({ angle: angle.value })
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
  () => props.element?.text,
  (newText) => {
    if (typeof newText === 'string') {
      textTemplate.value =
        typeof (props.element as any)?.textTemplate === 'string'
          ? (props.element as any).textTemplate
          : newText
    }
  }
)

watch(
  () => (props.config as any)?.textTemplate,
  (newTextTemplate) => {
    if (typeof newTextTemplate === 'string') {
      textTemplate.value = newTextTemplate
    }
  }
)

watch(
  () => (props.config as any)?.textProperty,
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
