<template>
  <el-form-item
    class="goal-field"
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
      clearable
      filterable
      @change="handleChange"
    >
      <el-option
        v-for="[key, prop] in goalOptions"
        :key="key"
        :label="`${prop.title} — ${getTypeLabel(key)}`"
        :value="key"
      >
        <PropertySelectOption
          :title="prop.title"
          :detail="getTypeLabel(key)"
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
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'
import PropertySelectOption from './PropertySelectOption.vue'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  placeholder?: string
  required?: boolean
  propName?: string
}>(), {
  label: '',
  placeholder: '',
  required: true,
  propName: 'goalProperty',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const propertiesStore = usePropertiesStore()
const { t } = useI18n()
const goalOptions = computed(() => Object.entries(propertiesStore.allProperties).filter(([_, p]) => p.type === 'goal'))
const resolvedLabel = computed(() => props.label || t('property.goalSelect'))
const resolvedPlaceholder = computed(() => props.placeholder || t('property.selectGoalType'))

const getTypeLabel = (key: string): string => {
  const item = propertiesStore.allProperties[key]
  if (!item) return ''
  const cur = item.options?.find(opt => opt.value === item.value)
  return cur?.label || ''
}

const localValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const handleChange = (val: string) => {
  emit('change', val)
}

const openAppProperties = () => {
  emitter.emit('open-app-properties')
}
</script>

<style scoped>
.select-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

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
</style>
