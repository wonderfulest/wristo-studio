<template>
  <el-dialog v-model="dialogVisible" title="Text Property" width="500px" @close="handleClose">
    <el-form ref="formRef" :model="formData" label-position="top">
      <el-form-item label="Title" prop="title" :rules="[{ required: true, message: 'Title is required', trigger: 'blur' }]"></el-form-item>
      <el-input v-model="formData.title" />

      <el-form-item label="Property Key" prop="propertyKey" :rules="[{ required: true, message: 'Key is required', trigger: 'blur' }]"></el-form-item>
      <el-input v-model="formData.propertyKey" />

      <el-form-item label="Default Text" prop="value">
        <TextTemplateEditor v-model="formData.value" />
      </el-form-item>

      <el-form-item label="Prompt (optional)">
        <el-input v-model="formData.prompt" />
      </el-form-item>

      <el-form-item label="Error Message (optional)">
        <el-input v-model="formData.errorMessage" />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm">Confirm</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import TextTemplateEditor from '@/components/properties/common/TextTemplateEditor.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import '@/assets/styles/propertyDialog.css'

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
    ElMessage.error('Please check the form for errors')
  }
}

const handleClose = () => {
  ElMessageBox.confirm(
    'Are you sure to close this dialog? All changes will be lost.',
    'Warning',
    {
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
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
