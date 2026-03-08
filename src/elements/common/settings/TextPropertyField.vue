<template>
  <el-form-item
    class="text-field"
    :label="label"
    :prop="propName"
    :required="required"
    :show-message="true"
    inline-message
  >
    <el-select
      v-model="localValue"
      :placeholder="placeholder"
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
          <span class="footer-text">Can’t find what you need?</span>
          <el-button size="small" type="primary" link @click="openAppProperties">Add Property</el-button>
        </div>
      </template>
    </el-select>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePropertiesStore } from '@/stores/properties'
import emitter from '@/utils/eventBus'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  propName?: string
}>(), {
  label: 'Text Property',
  placeholder: 'Select text property',
  required: false,
  propName: 'textProperty',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const propertiesStore = usePropertiesStore()
const textOptions = computed(() =>
  Object.entries(propertiesStore.allProperties).filter(([, p]) => p.type === 'text')
)

const localValue = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
})

const handleChange = (val: string) => {
  emit('change', val)
}

const truncate = (text: string | undefined, max = 24): string => {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
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
