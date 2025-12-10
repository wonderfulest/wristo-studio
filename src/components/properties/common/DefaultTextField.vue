<template>
  <el-form-item 
    prop="value"
    :rules="rules"
  >
    <template #label>
      <span class="default-text-label">
        Default Text
        <el-tooltip
          placement="top"
          effect="light"
        >
          <template #content>
            <a
              href="https://www.wristo.io/template-editor"
              target="_blank"
              rel="noopener noreferrer"
            >
              For template syntax and examples, please visit https://www.wristo.io/tpl.
            </a>
          </template>
          <el-icon class="default-text-help-icon">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </span>
    </template>
    <TextTemplateEditor v-model="modelValueLocal" />
  </el-form-item>
</template>

<script setup>
import { computed } from 'vue'
import { ElTooltip } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'

const props = defineProps({
  modelValue: {
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

const rules = [
  { required: true, message: 'Default text is required', trigger: 'blur' },
]
</script>

<style scoped>
.default-text-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.default-text-help-icon {
  cursor: pointer;
  font-size: 14px;
  color: #909399;
}

:deep(.el-tooltip__popper a) {
  color: #ffffff !important;
  font-weight: 500;
}

</style>
