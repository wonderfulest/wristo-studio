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
      :class="{ 'has-selection-summary': !!displaySummary }"
      clearable
      filterable
      @change="handleChange"
      @visible-change="handleVisibleChange"
    >
      <template #prefix>
        <span v-if="displaySummary" class="selection-summary" :title="selectionSummary">
          {{ selectionSummary }}
        </span>
      </template>
      <el-option
        v-for="[key, prop] in textOptions"
        :key="key"
        :label="`${prop.title} — ${truncate(prop.value)}`"
        :value="key"
      >
        <PropertySelectOption
          :title="prop.title"
          :detail="truncate(prop.value)"
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
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'
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
const dropdownVisible = ref(false)
const textOptions = computed(() =>
  Object.entries(propertiesStore.allProperties).filter(([, p]) => p.type === 'text')
)
const resolvedLabel = computed(() => props.label || t('elementSettings.textVariable'))
const resolvedPlaceholder = computed(() => props.placeholder || t('elementSettings.selectTextProperty'))
const selectedProperty = computed(() => {
  if (!props.modelValue) return null
  return propertiesStore.allProperties[props.modelValue] || null
})
const selectionSummary = computed(() => {
  const key = props.modelValue || ''
  const prop = selectedProperty.value
  if (prop) {
    const detail = truncate(prop.value, 36)
    return detail ? `${key} — ${detail}` : key
  }
  if (key) return key
  return truncate(props.fallbackText, 36)
})
const displaySummary = computed(() => Boolean(selectionSummary.value && !dropdownVisible.value))

const localValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const handleChange = (val: string) => {
  emit('change', val)
}

const handleVisibleChange = (visible: boolean) => {
  dropdownVisible.value = visible
}

const truncate = (text: unknown, max = 24): string => {
  if (text === null || text === undefined) return ''
  const s = String(text)
  return s.length > max ? `${s.slice(0, max)}…` : s
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
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-property-select.has-selection-summary :deep(.el-select__prefix) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.text-property-select.has-selection-summary :deep(.el-select__placeholder),
.text-property-select.has-selection-summary :deep(.el-select__input-wrapper) {
  display: none;
}
</style>
