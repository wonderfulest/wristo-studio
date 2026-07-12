<template>
  <el-form-item class="color-property-field" :label="resolvedLabel">
    <el-select
      v-model="localValue"
      :placeholder="resolvedPlaceholder"
      popper-class="property-select-popper"
      clearable
      filterable
      @change="handleChange"
    >
      <el-option
        v-for="[key, property, color] in colorOptions"
        :key="key"
        :label="`${property.title} — ${color}`"
        :value="key"
      >
        <PropertySelectOption
          :title="property.title"
          :detail="color"
          :property-key="key"
        />
      </el-option>
      <template #footer>
        <div class="select-footer">
          <span class="footer-text">{{ t('elementSettings.propertyNotFound') }}</span>
          <el-button size="small" type="primary" link @click="openAppProperties">
            {{ t('elementSettings.addProperty') }}
          </el-button>
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
import { getColorPropertyEntries } from './colorProperty'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
}>(), {
  modelValue: '',
  label: '',
  placeholder: '',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const propertiesStore = usePropertiesStore()
const { t } = useI18n()
const colorOptions = computed(() => getColorPropertyEntries(propertiesStore.allProperties))
const resolvedLabel = computed(() => props.label || t('elementSettings.dynamicColorVariable'))
const resolvedPlaceholder = computed(() => props.placeholder || t('property.selectProperty'))
const localValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value || ''),
})

const handleChange = (value: string) => emit('change', value || '')
const openAppProperties = () => emitter.emit('open-app-properties', { type: 'color' })
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
