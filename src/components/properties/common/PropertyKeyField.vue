<template>
  <el-form-item 
    :label="t('property.key')" 
    prop="propertyKey"
    :rules="rules"
  >
    <el-input 
      v-model="modelValueLocal" 
      :placeholder="placeholder"
      :disabled="isEdit"
    />
    <div class="field-help">
      {{ t('property.keyHelpPrefix') }}
      <code class="code-text">(prop.{{ modelValueLocal || defaultPreviewKey }})</code>
      {{ t('property.keyHelpSuffix') }}
    </div>
  </el-form-item>
</template>

<script setup>
import { computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
  defaultKey: {
    type: String,
    default: 'propertykey',
  },
  placeholder: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const modelValueLocal = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  },
})

const defaultPreviewKey = computed(() => props.defaultKey || 'propertykey')

const rules = computed(() => [
  { required: true, message: t('property.keyRequired'), trigger: 'blur' },
  {
    pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
    message: t('property.keyPattern'),
    trigger: 'blur',
  },
])

watch(
  () => modelValueLocal.value,
  (val) => {
    if (!val) return
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(val)) {
      ElMessage.warning(t('property.keyPatternDetailed'))
    }
  }
)
</script>
