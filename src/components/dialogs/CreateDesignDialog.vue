<template>
  <el-dialog v-model="dialogVisible" :title="t('createDesign.title')" width="600px" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="80px" class="create-design-form">
      <el-form-item :label="t('createDesign.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('createDesign.enterName')" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('createDesign.description')" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" :placeholder="t('createDesign.enterDescription')"
          maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('project.appLanguage')" prop="appLanguage">
        <el-radio-group v-model="form.appLanguage">
          <el-radio-button value="en">English</el-radio-button>
          <el-radio-button value="zh">中文</el-radio-button>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ t('createDesign.create') }}
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
import { useI18n } from '@/i18n'
import { useDesignStore } from '@/stores/designStore'
import type { AppLanguage } from '@/types/localization'

const router = useRouter()
const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()
const designStore = useDesignStore()
const { t } = useI18n()

const dialogVisible = ref<boolean>(false)
const loading = ref<boolean>(false)
const formRef = ref<FormInstance | null>(null)

interface CreateDesignForm {
  name: string
  description: string
  appLanguage: AppLanguage
}

const form = reactive<CreateDesignForm>({
  name: '',
  description: '',
  appLanguage: 'en',
})

const rules: FormRules = {
  name: [
    { required: true, message: t('createDesign.enterNameRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('createDesign.nameLength'), trigger: 'blur' }
  ],
  description: [
    { required: true, message: t('createDesign.enterDescriptionRequired'), trigger: 'blur' },
    { min: 1, max: 200, message: t('createDesign.descriptionLength'), trigger: 'blur' }
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
      const initialized = await designApi.updateDesign({
        uid: response.data.designUid,
        configJson: { localization: { appLanguage: form.appLanguage } },
      } as any)
      if (initialized.code !== 0) throw new Error(initialized.msg || 'Failed to persist application language')
      ElMessage.success(t('createDesign.createdSuccessfully'))
      // set base info
      baseStore.watchFaceName = form.name
      // reset properties after creating a new design
      propertiesStore.clearProperties()
      designStore.setAppLanguage(form.appLanguage)
      // navigate to design page
      router.push({
        path: '/design',
        query: { id: response.data.designUid }
      })
      dialogVisible.value = false
    } else {
      ElMessage.error(t('createDesign.createFailed'))
    }
  } catch (error) {
    console.error('Failed to create design:', error)
    ElMessage.error(t('createDesign.createFailed'))
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
  form.appLanguage = 'en'
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
