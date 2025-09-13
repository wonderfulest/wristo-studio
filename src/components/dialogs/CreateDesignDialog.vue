<template>
  <el-dialog v-model="dialogVisible" title="Create New Design" width="600px" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="80px" class="create-design-form">
      <el-form-item label="Name" prop="name">
        <el-input v-model="form.name" placeholder="Enter design name" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="Description" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" placeholder="Enter design description"
          maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          Create Design
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { designApi } from '@/api/wristo/design'
import { useBaseStore } from '@/stores/baseStore'
import type { Design } from '@/types/api/design'
import type { ApiResponse } from '@/types/api/api'
import { usePropertiesStore } from '@/stores/properties'

const router = useRouter()
const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()

const dialogVisible = ref<boolean>(false)
const loading = ref<boolean>(false)
const formRef = ref<FormInstance | null>(null)

interface CreateDesignForm {
  name: string
  description: string
}

const form = reactive<CreateDesignForm>({
  name: '',
  description: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Please enter a design name', trigger: 'blur' },
    { min: 1, max: 50, message: 'Design name must be between 1 and 50 characters', trigger: 'blur' }
  ],
  description: [
    { required: true, message: 'Please enter a design description', trigger: 'blur' },
    { min: 1, max: 200, message: 'Design description must be between 1 and 200 characters', trigger: 'blur' }
  ]
}

const handleConfirm = async (): Promise<void> => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    loading.value = true

    const response: ApiResponse<Design> = await designApi.createDesign({
      name: form.name,
      description: form.description
    })

    if (response.code === 0 && response.data && response.data.designUid) {
      ElMessage.success('Design created successfully')
      // set base info
      baseStore.watchFaceName = form.name
      // reset properties after creating a new design
      propertiesStore.clearProperties()
      // navigate to design page
      router.push({
        path: '/design',
        query: { id: response.data.designUid }
      })
      dialogVisible.value = false
    } else {
      ElMessage.error('Failed to create design')
    }
  } catch (error) {
    console.error('Failed to create design:', error)
    ElMessage.error('Failed to create design')
  } finally {
    loading.value = false
  }
}

const handleCancel = (): void => {
  dialogVisible.value = false
}

// reset form
const resetForm = (): void => {
  form.name = ''
  form.description = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// show dialog
const show = (): void => {
  resetForm()
  dialogVisible.value = true
}

// expose methods to parent
defineExpose({
  show
})
</script>

<style scoped>
.create-design-form {
  padding: 20px 24px;
  max-width: 560px;
  margin: 0 auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>