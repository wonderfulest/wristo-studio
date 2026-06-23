<template>
  <div class="settings-section text-settings-panel">
    <div class="text-settings-hero">
      <div class="text-settings-title">
        <span class="text-settings-kicker">{{ t('elementSettings.textPanelKicker') }}</span>
        <strong class="text-settings-heading">{{ t('elementSettings.scrollableTextPanelTitle') }}</strong>
        <span class="text-settings-description">{{ t('elementSettings.scrollableTextPanelHint') }}</span>
      </div>
      <span class="text-settings-badge">Marquee</span>
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
          <label>{{ t('elementSettings.fontFamily') }}</label>
          <font-picker v-model="fontFamily" @change="updateFontFamily" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as elementManager from '@/engine/managers/elementManager'
import { useBaseStore } from '@/stores/baseStore'
import { useFontStore } from '@/stores/fontStore'
import ColorPicker from '@/components/color-picker/index.vue'
import FontPicker from '@/components/font-picker/font-picker.vue'
import TextVariableEditor from '@/elements/common/settings/TextVariableEditor.vue'
import FontSizeSelect from '@/elements/common/settings/FontSizeSelect.vue'
import { showScrollRegion, startScrollableAnimation } from '@/elements/texts/scrollableText/scrollableText.renderer'
import { useI18n } from '@/i18n'

const { t } = useI18n()

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

const currentModel = computed<any>(() => {
  return (props.config as any) ?? props.element ?? {}
})
const currentElementId = computed(() => String((props.config as any)?.id ?? props.element?.id ?? ''))
const currentText = computed(() => {
  const model = currentModel.value as any
  return String(model?.textTemplate ?? model?.text ?? '')
})

const fontSize = ref(currentModel.value?.fontSize || 36)
const textColor = ref(currentModel.value?.fill || '#FFFFFF')
const fontFamily = ref(currentModel.value?.fontFamily)
const textProperty = ref(currentModel.value?.textProperty || '')

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
  if (fontFamily.value) {
    await fontStore.loadFont(fontFamily.value)
  }

  document.fonts.ready.then(() => {
    applyUpdate({ fontFamily: fontFamily.value })
  })
}

const applyTextVariablePatch = (patch: { textProperty: string; textTemplate: string }) => {
  textProperty.value = patch.textProperty
  applyUpdate(patch)

  if (!props.applyPatch && props.element && baseStore.canvas) {
    ;(props.element as any).clipPath = null
    ;(props.element as any).__scrollInitDone = false
    baseStore.canvas.renderAll()
    if (props.element) {
      showScrollRegion(props.element as any)
    }
    startScrollableAnimation(props.element as any)
  }
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
