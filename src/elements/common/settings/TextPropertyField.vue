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
      clearable
      filterable
      @change="handleChange"
    >
      <el-option
        v-for="[key, prop] in textOptions"
        :key="key"
        :label="`${prop.title} — ${truncate(prop.value)}`"
        :value="key"
      />
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

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  propName?: string
}>(), {
  label: '',
  placeholder: '',
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

const localValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const handleChange = (val: string) => {
  emit('change', val)
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
</style>
