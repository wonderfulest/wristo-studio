<template>
  <el-form-item
    class="text-field"
    :label="resolvedLabel"
    :prop="propName"
    :required="required"
    :show-message="true"
    inline-message
  >
    <el-select
      v-model="localValue"
      :placeholder="resolvedPlaceholder"
      popper-class="property-select-popper"
      class="text-property-select"
      clearable
      filterable
      @change="handleChange"
    >
      <el-option
        v-for="[key, prop] in textOptions"
        :key="key"
        :label="optionLabel(key, prop)"
        :value="key"
      >
        <PropertySelectOption
          :title="prop.title"
          :detail="String(prop.value ?? '')"
          :property-key="key"
        />
      </el-option>
      <template #footer>
        <div class="select-footer">
          <span class="footer-text">{{ t('elementSettings.propertyNotFound') }}</span>
          <el-button size="small" type="primary" link @click="openAppProperties">{{ t('elementSettings.addProperty') }}</el-button>
        </div>
      </template>
    </el-select>
    <div v-if="selectionSummary" class="selection-summary" :title="selectionSummary">
      <strong>{{ selectionTitle }}</strong>
      <code>{{ modelValue }}</code>
      <span v-if="selectionDetail">{{ selectionDetail }}</span>
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'
import type { PropertyItem } from '@/types/properties'
import PropertySelectOption from './PropertySelectOption.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  fallbackText?: string
  required?: boolean
  propName?: string
}>(), {
  label: '',
  placeholder: '',
  fallbackText: '',
  required: false,
  propName: 'textProperty',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const propertiesStore = usePropertiesStore()
const { t } = useI18n()
const textOptions = computed(() =>
  Object.entries(propertiesStore.allProperties).filter(([, p]) => p.type === 'text')
)
const resolvedLabel = computed(() => props.label || t('elementSettings.textVariable'))
const resolvedPlaceholder = computed(() => props.placeholder || t('elementSettings.selectTextProperty'))
const selectedProperty = computed(() => {
  if (!props.modelValue) return null
  return propertiesStore.allProperties[props.modelValue] || null
})
const selectionTitle = computed(() => {
  const key = props.modelValue || ''
  const prop = selectedProperty.value
  return String(prop?.title || key || '')
})
const selectionDetail = computed(() => {
  const value = selectedProperty.value?.value
  if (value === null || value === undefined || value === '') return ''
  return String(value)
})
const selectionSummary = computed(() => {
  const key = props.modelValue || ''
  const prop = selectedProperty.value
  if (prop) {
    const detail = selectionDetail.value
    return detail ? `${prop.title || key} · ${key} · ${detail}` : `${prop.title || key} · ${key}`
  }
  if (key) return key
  return ''
})

const localValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const handleChange = (val: string) => {
  emit('change', val)
}

const optionLabel = (key: string, prop: PropertyItem): string => {
  const title = String(prop.title || key)
  return `${title} · ${key}`
}

const openAppProperties = () => {
  emitter.emit('open-app-properties')
}
</script>

<style scoped>
.select-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
}

.footer-text {
  font-size: 12px;
}

.text-property-select {
  width: 100%;
}

.selection-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 8px;
  width: 100%;
  margin-top: 6px;
  padding: 7px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-extra-light);
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.35;
}

.selection-summary strong,
.selection-summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-summary code {
  overflow: hidden;
  color: var(--el-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-summary span {
  grid-column: 1 / -1;
  color: var(--el-text-color-secondary);
}
</style>
