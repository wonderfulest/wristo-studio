<template>
  <el-form-item class="data-field" :label="label || t('property.dateSelect')" :prop="propName" :required="required">
    <el-select v-model="localValue" clearable filterable @change="emit('change', $event)">
      <el-option v-for="[key, property] in dateOptions" :key="key" :label="property.title" :value="key">
        <PropertySelectOption :title="property.title" :detail="selectedLabel(property)" :property-key="key" />
      </el-option>
      <template #footer>
        <el-button size="small" type="primary" link @click="openAppProperties">{{ t('elementSettings.addProperty') }}</el-button>
      </template>
    </el-select>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import type { PropertyItem } from '@/types/properties'
import emitter from '@/utils/eventBus'
import { useI18n } from '@/i18n'
import PropertySelectOption from './PropertySelectOption.vue'

const props = withDefaults(defineProps<{ modelValue?: string; label?: string; required?: boolean; propName?: string }>(), {
  modelValue: '', label: '', required: true, propName: 'dateProperty',
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const propertiesStore = usePropertiesStore()
const { t } = useI18n()
const dateOptions = computed(() => Object.entries(propertiesStore.allProperties)
  .filter(([, property]) => property.type === 'date'))
const localValue = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const selectedLabel = (property: PropertyItem) => property.options?.find(option => option.value === property.value)?.label || ''
const openAppProperties = () => emitter.emit('open-app-properties', { type: 'date' })
</script>
