<template>
  <el-dialog
    v-model="dialogVisible"
    class="property-dialog"
    :title="t('property.textProperty')"
    width="640px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-position="top" class="property-form">
      <div class="form-section">
        <h3 class="section-title">{{ t('property.basicInformation') }}</h3>
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

        <DefaultTextField v-model="formData.value" />
      </div>

      <div class="form-section">
        <h3 class="section-title">{{ t('property.messages') }}</h3>
        <el-form-item :label="t('property.promptOptional')">
          <el-input
            v-model="formData.prompt"
            type="textarea"
            :rows="2"
            :placeholder="t('property.promptPlaceholder')"
          />
        </el-form-item>

        <el-form-item :label="t('property.errorMessageOptional')">
          <el-input
            v-model="formData.errorMessage"
            type="textarea"
            :rows="2"
            :placeholder="t('property.errorPlaceholder')"
          />
        </el-form-item>
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
import { ref, reactive } from 'vue'
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
