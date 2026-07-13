<template>
  <el-form-item class="data-field" :label="label || 'Dial Property'" :required="required">
    <el-select v-model="localValue" clearable filterable @change="handleChange">
      <el-option v-for="[key, property] in dialOptions" :key="key" :label="property.title" :value="key">
        <PropertySelectOption :title="property.title" :detail="selectedLabel(property)" :property-key="key" />
      </el-option>
      <template #footer>
        <el-button size="small" type="primary" link @click="openAppProperties">Add Property</el-button>
      </template>
    </el-select>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import type { DialProgressMode } from '@/types/settings'
import type { PropertyItem } from '@/types/properties'
import emitter from '@/utils/eventBus'
import PropertySelectOption from './PropertySelectOption.vue'

const props = withDefaults(defineProps<{ modelValue?: string; mode: DialProgressMode; label?: string; required?: boolean }>(), {
  modelValue: '', label: '', required: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>()
const propertiesStore = usePropertiesStore()
const dialOptions = computed(() => propertiesStore.getDialProperties(props.mode))
const localValue = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const selectedLabel = (property: PropertyItem) => property.options?.find(option => option.value === property.value)?.label || ''
const handleChange = (value: string) => emit('change', value)
const openAppProperties = () => emitter.emit('open-app-properties', { type: 'dial', dialMode: props.mode })
</script>
