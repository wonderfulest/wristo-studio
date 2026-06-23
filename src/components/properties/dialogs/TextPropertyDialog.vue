<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog text-property-dialog"
    :title="t('property.textProperty')"
    width="720px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-position="top" class="property-form">
      <div class="text-property-hero">
        <div>
          <div class="hero-kicker">{{ t('property.textProperty') }}</div>
          <div class="hero-title">{{ formData.title || t('property.textProperty') }}</div>
        </div>
        <code class="hero-key">prop.{{ formData.propertyKey || 'text_1' }}</code>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.basicInformation') }}</h3>
        <div class="basic-grid">
          <el-form-item
            :label="t('property.title')"
            prop="title"
            :rules="[{ required: true, message: t('property.titleRequired'), trigger: 'blur' }]"
          >
            <el-input v-model="formData.title" :placeholder="t('property.textProperty')" />
          </el-form-item>

          <PropertyKeyField
            v-model="formData.propertyKey"
            :is-edit="isEdit"
            default-key="text_1"
            placeholder="text_1"
          />
        </div>
      </div>

      <div class="form-section template-section">
        <h3 class="section-title">{{ t('property.defaultText') }}</h3>
        <DefaultTextField v-model="formData.value" />
        <div class="template-preview">
          <div class="preview-label">{{ t('elementSettings.defaultContent') }}</div>
          <pre>{{ defaultTextPreview }}</pre>
        </div>
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.messages') }}</h3>
        <div class="message-grid">
          <el-form-item :label="t('property.promptOptional')">
            <el-input
              v-model="formData.prompt"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.promptPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('property.errorMessageOptional')">
            <el-input
              v-model="formData.errorMessage"
              type="textarea"
              :rows="3"
              resize="none"
              :placeholder="t('property.errorPlaceholder')"
            />
          </el-form-item>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm">{{ t('common.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import PropertyKeyField from '@/components/properties/common/PropertyKeyField.vue'
import DefaultTextField from '@/components/properties/common/DefaultTextField.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const dialogVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

const formData = reactive({
  title: '',
  propertyKey: '',
  type: 'text',
  options: [],
  value: '',
  prompt: '',
  errorMessage: '',
})

const defaultTextPreview = computed(() => {
  if (!formData.value) return t('common.noData')
  return formData.value
})

const initFormData = (data = null) => {
  isEdit.value = !!data
  if (data) {
    Object.assign(formData, {
      title: data.title,
      propertyKey: data.propertyKey,
      type: data.type,
      options: [],
      value: data.value || '',
      prompt: data.prompt,
      errorMessage: data.errorMessage,
    })
  } else {
    Object.assign(formData, {
      title: 'Text 1',
      propertyKey: 'text_1',
      type: 'text',
      options: [],
      value: '',
      prompt: '',
      errorMessage: '',
    })
  }
}

const emit = defineEmits(['confirm'])

const handleConfirm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    emit('confirm', {
      type: 'text',
      key: formData.propertyKey,
      title: formData.title,
      options: [],
      defaultValue: formData.value,
      prompt: formData.prompt,
      errorMessage: formData.errorMessage,
      isEdit: isEdit.value,
    })
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(t('property.formError'))
  }
}

const handleClose = () => {
  ElMessageBox.confirm(
    t('property.closeConfirm'),
    t('property.warning'),
    {
      confirmButtonText: t('common.yes'),
      cancelButtonText: t('common.no'),
      type: 'warning',
    }
  )
    .then(() => {
      dialogVisible.value = false
    })
    .catch(() => {})
}

defineExpose({
  show: (data = null) => {
    initFormData(data)
    dialogVisible.value = true
  },
})
</script>

<style scoped>
:deep(.text-property-dialog .property-form) {
  padding-top: 0;
}

.text-property-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin: 0 -18px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.12), rgba(103, 194, 58, 0.08)),
    var(--el-fill-color-lighter);
}

.hero-kicker {
  margin-bottom: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero-title {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-key {
  max-width: 180px;
  overflow: hidden;
  padding: 6px 10px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--el-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.basic-grid,
.message-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.template-section :deep(.el-form-item) {
  margin-bottom: 12px;
}

.template-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.preview-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.template-preview pre {
  min-height: 56px;
  max-height: 150px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 760px) {
  .text-property-hero,
  .basic-grid,
  .message-grid {
    grid-template-columns: 1fr;
  }

  .hero-key {
    max-width: 100%;
    justify-self: start;
  }
}
</style>
