<template>
  <el-dialog v-model="dialogVisible" :title="t('createDesign.title')" width="600px" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" class="create-design-form">
      <el-form-item :label="t('createDesign.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('createDesign.enterName')" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('createDesign.description')" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="4" :placeholder="t('createDesign.enterDescription')"
          maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('project.appLanguage')" prop="appLanguage">
        <el-radio-group v-model="form.appLanguage">
          <el-radio-button value="eng">English</el-radio-button>
          <el-radio-button value="zhs">中文</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="canSelectDesignSource" :label="t('designSource.originalType')" prop="originalType">
        <el-radio-group v-model="form.originalType">
          <el-radio value="original">{{ t('designSource.original') }}</el-radio>
          <el-radio value="non_original">{{ t('designSource.nonOriginal') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="canSelectDesignSource && form.originalType === 'non_original'">
        <el-form-item :label="t('designSource.platform')" prop="sourcePlatform">
          <el-select v-model="form.sourcePlatform" :placeholder="t('designSource.selectPlatform')" style="width: 100%">
            <el-option v-for="option in DESIGN_SOURCE_PLATFORM_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="requiresDesignSourceId(form.sourcePlatform)" :label="t('designSource.sourceId')" prop="sourceId">
          <el-input v-model="form.sourceId" :placeholder="t('designSource.enterSourceId')" />
        </el-form-item>
      </template>
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
import { ref, reactive, computed } from 'vue'
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
import { useUserStore } from '@/stores/user'
import type { AppLanguage } from '@/types/localization'
import { DESIGN_SOURCE_PLATFORM_OPTIONS, requiresDesignSourceId, type DesignOriginalType, type DesignSourcePlatform } from '@/domain/designSource'

const router = useRouter()
const baseStore = useBaseStore()
const propertiesStore = usePropertiesStore()
const designStore = useDesignStore()
const userStore = useUserStore()
const { t } = useI18n()
const canSelectDesignSource = computed(() => userStore.isMerchantUser || userStore.isAdminUser)

const dialogVisible = ref<boolean>(false)
const loading = ref<boolean>(false)
const formRef = ref<FormInstance | null>(null)

interface CreateDesignForm {
  name: string
  description: string
  appLanguage: AppLanguage
  originalType: DesignOriginalType | ''
  sourcePlatform: DesignSourcePlatform | ''
  sourceId: string
}

const form = reactive<CreateDesignForm>({
  name: '',
  description: '',
  appLanguage: 'eng',
  originalType: 'original',
  sourcePlatform: '',
  sourceId: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: t('createDesign.enterNameRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('createDesign.nameLength'), trigger: 'blur' }
  ],
  description: [
    { required: true, message: t('createDesign.enterDescriptionRequired'), trigger: 'blur' },
    { min: 1, max: 200, message: t('createDesign.descriptionLength'), trigger: 'blur' }
  ],
  originalType: [{ required: true, message: t('designSource.selectOriginalType'), trigger: 'change' }],
  sourcePlatform: [{
    validator: (_rule, value, callback) => {
      if (canSelectDesignSource.value && form.originalType === 'non_original' && !value) return callback(new Error(t('designSource.selectPlatform')))
      callback()
    },
    trigger: 'change'
  }],
  sourceId: [{
    validator: (_rule, value, callback) => {
      if (canSelectDesignSource.value && form.originalType === 'non_original' && requiresDesignSourceId(form.sourcePlatform) && !String(value || '').trim()) {
        return callback(new Error(t('designSource.enterSourceId')))
      }
      callback()
    },
    trigger: 'blur'
  }]
}

const handleConfirm = async (): Promise<void> => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    loading.value = true

    const resolvedOriginalType = canSelectDesignSource.value ? form.originalType as DesignOriginalType : 'original'

    const response: ApiResponse<Design> = await designApi.createDesign({
      name: form.name,
      description: form.description,
      originalType: resolvedOriginalType,
      sourcePlatform: resolvedOriginalType === 'non_original' ? form.sourcePlatform || undefined : undefined,
      sourceId: resolvedOriginalType === 'non_original' ? form.sourceId.trim() || undefined : undefined
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
  form.appLanguage = 'eng'
  form.originalType = 'original'
  form.sourcePlatform = ''
  form.sourceId = ''
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
