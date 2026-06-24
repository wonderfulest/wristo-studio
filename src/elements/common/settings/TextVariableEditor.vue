<template>
  <div class="text-variable-editor">
    <div class="variable-select-row">
      <div class="variable-select-field">
        <label>{{ t('elementSettings.textVariable') }}</label>
        <el-select
          :model-value="selectedOptionValue"
          :placeholder="t('elementSettings.selectTextProperty')"
          class="variable-select"
          clearable
          filterable
          @change="handleSelectChange"
        >
          <el-option :label="t('elementSettings.customText')" value="" />
          <el-option-group
            v-if="textOptions.length"
            :label="t('elementSettings.currentTextVariables')"
          >
            <el-option
              v-for="[key, prop] in textOptions"
              :key="`property:${key}`"
              :label="optionLabel(key, prop.title)"
              :value="`property:${key}`"
              :disabled="isPropertyInUse(key)"
            >
              <div class="variable-option" :class="{ 'is-in-use': isPropertyInUse(key) }">
                <span>{{ prop.title || key }}</span>
                <em v-if="isPropertyInUse(key)">{{ t('elementSettings.variableInUse') }}</em>
                <code v-else>{{ key }}</code>
              </div>
            </el-option>
          </el-option-group>
          <el-option-group :label="t('elementSettings.textVariablePresets')">
            <el-option
              v-for="preset in textVariablePresets"
              :key="`preset:${preset.key}`"
              :label="optionLabel(preset.key, preset.title)"
              :value="`preset:${preset.key}`"
            >
              <div class="variable-option">
                <span>{{ preset.title }}</span>
                <code>{{ preset.key }}</code>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
      </div>
      <el-button class="add-property-button" @click="openAppProperties">
        {{ t('elementSettings.addProperty') }}
      </el-button>
    </div>

    <TextTemplateEditor
      v-model="editableValue"
      :rows="2"
      :variables-initially-open="false"
      :helper-text="t('elementSettings.textVariableHelper')"
      @change="handleTextChange"
    />

    <div v-if="editableValue" class="variable-preview">
      <span>{{ t('elementSettings.resolvedPreview') }}</span>
      <code>{{ resolvedPreview }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { useCanvasStore } from '@/stores/canvasStore'
import { usePropertiesStore } from '@/stores/properties'
import emitter from '@/utils/eventBus'
import type { PropertyItem } from '@/types/properties'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'
import { textVariablePresets, type TextVariablePreset } from './textVariablePresets'
import { resolveTextVariablePreview, syncTextPropertyValue } from './textVariableSync'

const props = withDefaults(defineProps<{
  modelValue?: string
  fallbackText?: string
  ownerElementId?: string
}>(), {
  modelValue: '',
  fallbackText: '',
  ownerElementId: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'apply', patch: { textProperty: string; textTemplate: string }): void
  (e: 'update-template', value: string): void
}>()

const { t } = useI18n()
const canvasStore = useCanvasStore()
const propertiesStore = usePropertiesStore()
const editableValue = ref('')
const presetPrefix = 'preset:'
const propertyPrefix = 'property:'
const textElementTypes = new Set(['text', 'scrollableText', 'radialText', 'angledText'])

const localProperty = computed({
  get: () => props.modelValue || '',
  set: (value: string) => emit('update:modelValue', value),
})

const selectedProperty = computed(() => {
  if (!localProperty.value) return null
  return propertiesStore.allProperties[localProperty.value] || null
})
const textOptions = computed(() =>
  Object.entries(propertiesStore.allProperties).filter(([, prop]) => prop.type === 'text')
)
const usedTextPropertyKeys = computed(() => {
  const ownerId = String(props.ownerElementId || '')
  const usedKeys = new Set<string>()
  const objects = (canvasStore.canvas?.getObjects?.() || []) as any[]

  objects.forEach((obj) => {
    if (!obj || !textElementTypes.has(String(obj.eleType || ''))) return
    const key = String(obj.textProperty || '').trim()
    if (!key) return
    const id = String(obj.id ?? obj.elementId ?? '')
    if (ownerId && id === ownerId) return
    usedKeys.add(key)
  })

  return usedKeys
})
const selectedOptionValue = computed(() => {
  if (!localProperty.value) return ''
  return `${propertyPrefix}${localProperty.value}`
})

const selectedValue = computed(() => {
  const value = selectedProperty.value?.value
  return value === null || value === undefined ? '' : String(value)
})

const resolvedPreview = computed(() => {
  const value = editableValue.value
  if (!value) return t('common.noData')
  return resolveTextVariablePreview(value)
})

watch(
  selectedValue,
  (value) => {
    if (selectedProperty.value && value !== editableValue.value) {
      editableValue.value = value
    }
  },
  { immediate: true },
)

watch(
  () => props.fallbackText,
  (value) => {
    if (!selectedProperty.value && value !== editableValue.value) {
      editableValue.value = value || ''
    }
  },
  { immediate: true },
)

const handlePropertyChange = (value: string) => {
  if (!value) {
    editableValue.value = props.fallbackText || ''
    emit('apply', { textProperty: '', textTemplate: editableValue.value })
    emit('update-template', editableValue.value)
    return
  }

  const template = String(propertiesStore.getPropertyValue(value) ?? '')
  editableValue.value = template
  emit('apply', { textProperty: value, textTemplate: template })
  emit('update-template', template)
}

const cleanupUnusedTextProperty = (propertyKey: string, nextPropertyKey = '') => {
  const key = String(propertyKey || '').trim()
  const nextKey = String(nextPropertyKey || '').trim()
  if (!key || key === nextKey) return
  const property = propertiesStore.allProperties[key]
  if (!property || property.type !== 'text') return
  if (isPropertyInUse(key)) return
  propertiesStore.deleteProperty(key)
}

const handleSelectChange = async (value: string) => {
  const previousKey = localProperty.value
  const rawValue = String(value || '')
  if (!rawValue) {
    localProperty.value = ''
    handlePropertyChange('')
    cleanupUnusedTextProperty(previousKey)
    return
  }

  if (rawValue.startsWith(presetPrefix)) {
    const key = rawValue.slice(presetPrefix.length)
    const preset = textVariablePresets.find((item) => item.key === key)
    if (preset) {
      await applyPreset(preset, previousKey)
    }
    return
  }

  const key = rawValue.startsWith(propertyPrefix) ? rawValue.slice(propertyPrefix.length) : rawValue
  if (isPropertyInUse(key)) return
  localProperty.value = key
  handlePropertyChange(key)
  cleanupUnusedTextProperty(previousKey, key)
}

const handleTextChange = async (value: string) => {
  const key = localProperty.value
  if (!key) {
    emit('apply', { textProperty: '', textTemplate: value })
    emit('update-template', value)
    return
  }

  await syncTextPropertyValue(key, value)
  emit('apply', { textProperty: key, textTemplate: value })
  emit('update-template', value)
}

const applyPreset = async (preset: TextVariablePreset, previousKey = '') => {
  const propertyKey = makeUniquePresetKey(preset.key)
  if (!propertiesStore.allProperties[propertyKey] || propertiesStore.allProperties[propertyKey].type !== 'text') {
    propertiesStore.addProperty({
      key: propertyKey,
      type: 'text',
      title: propertyKey === preset.key ? preset.title : `${preset.title} ${propertyKey.replace(`${preset.key}_`, '')}`,
      options: [],
      defaultValue: preset.value,
    })
  } else {
    propertiesStore.setPropertyValue(propertyKey, preset.value)
  }

  localProperty.value = propertyKey
  editableValue.value = preset.value
  await syncTextPropertyValue(propertyKey, preset.value)
  emit('apply', { textProperty: propertyKey, textTemplate: preset.value })
  emit('update-template', preset.value)
  cleanupUnusedTextProperty(previousKey, propertyKey)
}

const isPropertyInUse = (key: string) => usedTextPropertyKeys.value.has(key)

const makeUniquePresetKey = (baseKey: string) => {
  const normalizedKey = String(baseKey || 'text').trim() || 'text'
  if (!propertiesStore.allProperties[normalizedKey] && !isPropertyInUse(normalizedKey)) {
    return normalizedKey
  }
  if (propertiesStore.allProperties[normalizedKey]?.type === 'text' && !isPropertyInUse(normalizedKey)) {
    return normalizedKey
  }

  let index = 2
  while (
    propertiesStore.allProperties[`${normalizedKey}_${index}`] ||
    isPropertyInUse(`${normalizedKey}_${index}`)
  ) {
    index += 1
  }
  return `${normalizedKey}_${index}`
}

const optionLabel = (key: string, title?: PropertyItem['title']) => {
  return `${title || key} · ${key}`
}

const openAppProperties = () => {
  emitter.emit('open-app-properties')
}
</script>

<style scoped>
.text-variable-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variable-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.variable-select-field {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.variable-select-field label {
  color: var(--studio-text-muted, var(--el-text-color-secondary));
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
}

.variable-select {
  width: 100%;
}

.add-property-button {
  align-self: flex-end;
  min-height: 34px;
}

.variable-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.variable-option span {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-option code,
.variable-option em,
.variable-preview code {
  color: var(--el-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.variable-option em {
  color: var(--el-text-color-placeholder);
  font-style: normal;
}

.variable-option.is-in-use span {
  color: var(--el-text-color-placeholder);
}

.variable-preview {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.variable-preview code {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
