<template>
  <el-form-item 
    label="Property Key" 
    prop="propertyKey"
    :rules="rules"
  >
    <el-input 
      v-model="modelValueLocal" 
      :placeholder="placeholder"
      :disabled="isEdit"
    />
    <div class="field-help">
      The key of the property that this setting will manage. Letter, under score, and number only, no space and special characters allow. To access this property value in your design, use
      <code class="code-text">(prop.{{ modelValueLocal || defaultPreviewKey }})</code>
      in the expression.
    </div>
  </el-form-item>
</template>

<script setup>
import { computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

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

const rules = [
  { required: true, message: 'Please input property key', trigger: 'blur' },
  {
    pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
    message: 'Only letters, numbers and underscore allowed, must start with letter',
    trigger: 'blur',
  },
]

watch(
  () => modelValueLocal.value,
  (val) => {
    if (!val) return
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(val)) {
      ElMessage.warning('Only letters, numbers and underscore allowed, and must start with a letter')
    }
  }
)
</script>
