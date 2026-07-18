<template>
  <el-dialog 
    v-model="dialogVisible" 
    :title="dialogTitle" 
    width="50%" 
    :top="'10vh'"
    class="submit-design-dialog"
  >
    <el-form 
      :model="form" 
      :rules="rules" 
      ref="formRef" 
      label-width="180px" 
      class="submit-form"
    >
      <el-form-item :label="t('submitDesign.designName')">
        <el-input v-model="form.name" />
      </el-form-item>
      
      <el-form-item :label="t('submitDesign.paymentMethod')" prop="paymentMethod">
        <el-radio-group v-model="form.paymentMethod" @change="handlePaymentMethodChange">
          <el-radio label="free">{{ t('payment.free') }}</el-radio>
          <el-radio label="wpay" :disabled="!canPublishPaid">WPay</el-radio>
        </el-radio-group>
        <span v-if="!canPublishPaid" class="merchant-required-tip">
          {{ t('submitDesign.paidMerchantOnly') }}
        </span>
      </el-form-item>
      
      <el-form-item 
        :label="t('submitDesign.price')" 
        prop="price"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.price" 
          :min="0" 
          :max="999.99" 
          :precision="2"
          :step="0.2"
          :placeholder="t('submitDesign.enterPrice')"
          style="width: 100%"
        />
        <div class="form-tip">{{ t('submitDesign.priceTip') }}</div>
      </el-form-item>
      
      <el-form-item 
        :label="t('submitDesign.trialDuration')" 
        prop="trialLasts"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.trialLasts" 
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
          :placeholder="t('submitDesign.enterTrialHours')"
          style="width: 100%"
        />
        <div class="form-tip">{{ t('submitDesign.trialTip') }}</div>
      </el-form-item>
      
      <el-form-item :label="t('submitDesign.description')">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3" 
          :placeholder="t('submitDesign.enterDescription')"
        />
        <div class="description-actions">
          <span class="description-language-label">{{ t('goLive.descriptionLanguage') }}</span>
          <el-radio-group v-model="descriptionLanguage" size="small">
            <el-radio-button value="en">{{ t('goLive.languageEnglish') }}</el-radio-button>
            <el-radio-button value="zh">{{ t('goLive.languageChinese') }}</el-radio-button>
          </el-radio-group>
          <el-button size="small" type="primary" :loading="refreshingDescription" @click="refreshDescription">
            {{ t('common.refresh') }}
          </el-button>
        </div>
      </el-form-item>
      <CategorySelector
        v-model:categoryIds="form.categoryIds"
        :categories="categories"
        :loadingCategories="loadingCategories"
        :hidden-category-slugs="['whole']"
      />
      <BundleSelector
        v-model:bundleIds="form.bundleIds"
        :bundles="bundles"
        :loadingBundles="loadingBundles"
      />
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          {{ confirmText }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import type { Design, DesignSubmitDTO, UpdateDesignParamsV2 } from '@/types/api/design'
import type { ApiResponse } from '@/types/api/api'
import { getBasicCategories } from '@/api/wristo/categories'
import type { Category } from '@/types/api/category'
import { productsApi } from '@/api/wristo/products'
import type { Bundle } from '@/types/api/bundle'
import CategorySelector from '@/components/common/CategorySelector.vue'
import BundleSelector from '@/components/common/BundleSelector.vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import {
  buildGenerateDescriptionPayload,
  type DescriptionTemplateLanguage,
} from '@/utils/descriptionTemplateLanguage'
import { ElMessage } from 'element-plus'

const dialogVisible = ref(false)
const loading = ref(false)
const refreshingDescription = ref(false)
const descriptionLanguage = ref<DescriptionTemplateLanguage>('en')
const currentDesign = ref<Design | null>(null)
const formRef = ref()
const dialogMode = ref<'submit' | 'prg-build'>('submit')
const prgDeviceId = ref<string>('')

const messageStore = useMessageStore()
const userStore = useUserStore()
const { t } = useI18n()
const canPublishPaid = computed(() => userStore.isMerchantUser)
const dialogTitle = computed(() => dialogMode.value === 'prg-build' ? t('submitDesign.title') : t('submitDesign.title'))
const confirmText = computed(() => dialogMode.value === 'prg-build' ? t('card.buildPrg') : t('common.submit'))
const CATEGORY_LIMIT = 5

const getCurrentDeviceParams = () => {
  const deviceId = userStore.userInfo?.device?.deviceId
  return deviceId ? { device: deviceId } : undefined
}

const form = reactive({
  designUid: '',
  name: '',
  description: '',
  paymentMethod: 'free',
  kpayId: '',
  price: 1.99,
  trialLasts: 0.25, // default 0.25 hours
  categoryIds: [] as number[],
  bundleIds: [] as number[]
})

function isWholeCategoryId(id: number) {
  const category = categories.value.find((item) => item.id === id)
  return category?.slug === 'whole' || id === 1
}

const rules = computed(() => ({
  paymentMethod: [
    { required: true, message: t('submitDesign.selectPaymentMethod'), trigger: 'change' }
  ],
  kpayId: [
    { 
      required: form.paymentMethod === 'kpay', 
      message: t('submitDesign.kpayRequired'), 
      trigger: 'blur' 
    }
  ],
  price: [
    { 
      required: form.paymentMethod !== 'free', 
      message: t('submitDesign.enterPriceRequired'), 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 1.99, 
      max: 99.99, 
      message: t('submitDesign.priceRange'), 
      trigger: 'blur' 
    }
  ],
  trialLasts: [
    { 
      required: form.paymentMethod !== 'free', 
      message: t('submitDesign.enterTrialRequired'), 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 0, 
      max: 720, 
      message: t('submitDesign.trialRange'), 
      trigger: 'blur' 
    }
  ],
  categoryIds: [
    { required: true, type: 'array', message: t('category.selectAtLeastOne'), trigger: 'change' },
    { 
      validator: (_rule: any, value: unknown, callback: (err?: Error) => void) => {
        const ids = Array.isArray(value) ? value : []
        const len = ids.length
        if (len === 0) return callback(new Error(t('category.selectAtLeastOne')))
        if (ids.filter((id) => typeof id === 'number' && !isWholeCategoryId(id)).length > CATEGORY_LIMIT) {
          return callback(new Error(t('category.limit', { limit: CATEGORY_LIMIT })))
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}))

const emit = defineEmits(['success', 'cancel'])

// Category / bundle options
const categories = ref<Category[]>([])
const loadingCategories = ref(false)
const bundles = ref<Bundle[]>([])
const loadingBundles = ref(false)

const loadCategories = async () => {
  try {
    loadingCategories.value = true
    const res: Category[] = await getBasicCategories()
    categories.value = res
  } catch (e) {
    console.error('Failed to load categories:', e)
  } finally {
    loadingCategories.value = false
  }
}

const loadBundles = async () => {
  try {
    loadingBundles.value = true
    const res = await productsApi.getBundles()
    if (res.code === 0 && res.data) {
      bundles.value = res.data
    }
  } catch (e) {
    console.error('Failed to load bundles:', e)
  } finally {
    loadingBundles.value = false
  }
}

// Handle payment method change
const handlePaymentMethodChange = (value: string) => {
  if (value !== 'free' && !canPublishPaid.value) {
    form.paymentMethod = 'free'
    form.price = 0
    form.trialLasts = 0
    return
  }
  if (value === 'free') {
    form.price = 0
    form.trialLasts = 0
  } else if (value === 'kpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 0.25
  } else if (value === 'wpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 0.25
  }
}

// Show dialog
const show = async (design: Design, options?: { mode?: 'submit' | 'prg-build'; deviceId?: string }) => {
  try {
    loading.value = true
    descriptionLanguage.value = 'en'
    currentDesign.value = null
    dialogMode.value = options?.mode || 'submit'
    prgDeviceId.value = options?.deviceId || ''
    
    // First, fetch design details
    const response: ApiResponse<Design> = await designApi.getDesignByUid(design.designUid, getCurrentDeviceParams())
    
    if (response.code === 0 && response.data) {
      const designDetail = response.data
      currentDesign.value = designDetail
      const product = designDetail.product
      
      // Reset form and populate with latest data
      Object.assign(form, {
        designUid: designDetail.designUid,
        name: designDetail.name,
        description: designDetail.description || '',
        paymentMethod: 'free',
        kpayId: '',
        price: 1.99,
        trialLasts: 0.25,
        categoryIds: [],
        bundleIds: []
      })
      
      if (product) {
        form.trialLasts = product.trialLasts
        // Initialize categories and bundles
        if (Array.isArray(product.categories)) {
          form.categoryIds = product.categories.map((c: Category) => c.id)
        }
        if (Array.isArray(product.bundles)) {
          form.bundleIds = product.bundles.map((b: Bundle) => b.bundleId)
        }
      }
      // If product contains payment info, prefill
      if (product?.payment) {
        const payment = product.payment
        form.paymentMethod = payment.paymentMethod === 'free' || !canPublishPaid.value ? 'free' : payment.paymentMethod
        if (form.paymentMethod === 'free') {
          // Free mode: price and trial last should be 0
          form.price = 0
          form.trialLasts = 0
        } else {
          // Paid modes: use provided price / trialLasts with sensible defaults
          form.price = payment.price ?? 1.99
          form.trialLasts = payment.trialLasts ?? 0.25
        }
      }
      // Load category and bundle options
      await Promise.all([loadCategories(), loadBundles()])
      dialogVisible.value = true
    } else {
      messageStore.error(response.msg || t('submitDesign.loadDetailsFailed'))
    }
  } catch (error) {
    console.error('Failed to get design details:', error)
    messageStore.error(t('submitDesign.loadDetailsFailed'))
  } finally {
    loading.value = false
  }
}

const refreshDescription = async () => {
  const uid = userStore.userInfo?.id
  if (!uid) {
    ElMessage.error(t('auth.userNotLoggedIn'))
    return
  }

  const productId = currentDesign.value?.product?.id
  if (!productId) {
    ElMessage.error(t('submitDesign.loadDetailsFailed'))
    return
  }

  try {
    refreshingDescription.value = true
    const payload = buildGenerateDescriptionPayload(uid, productId, descriptionLanguage.value)
    const res = await productsApi.generateDescription(payload) as ApiResponse<string>
    if (typeof res.data === 'string') {
      form.description = res.data
      ElMessage.success(t('goLive.descriptionUpdated'))
    }
  } catch (e) {
    ElMessage.error(t('goLive.generateDescriptionFailed'))
  } finally {
    refreshingDescription.value = false
  }
}

// Confirm submit
const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    if (form.paymentMethod !== 'free' && !canPublishPaid.value) {
      messageStore.warning(t('submitDesign.paidMerchantOnly'))
      return
    }
    
    loading.value = true
    
    const submitData: DesignSubmitDTO = {
      designUid: form.designUid,
      paymentMethod: form.paymentMethod,
      name: form.name,
      description: form.description,
      categoryIds: form.categoryIds,
      bundleIds: form.bundleIds
    }
    
    // Add parameters based on payment method
    if (form.paymentMethod === 'kpay') {
      submitData.kpayId = form.kpayId
      submitData.price = form.price
      submitData.trialLasts = form.trialLasts
    } else if (form.paymentMethod === 'wpay') {
      submitData.price = form.price
      submitData.trialLasts = form.trialLasts
    }
    // Free mode does not require extra parameters
    const response = dialogMode.value === 'prg-build'
      ? await handlePrgBuildConfirm(submitData)
      : await designApi.submitDesign(submitData)
    
    if (response.code === 0) {
      messageStore.success(dialogMode.value === 'prg-build' ? t('project.prgBuildSubmitted') : t('submitDesign.submittedSuccessfully'))
      emit('success')
      dialogVisible.value = false
    } else {
      messageStore.error(response.msg || t('submitDesign.submitFailed'))
    }
  } catch (error) {
    console.error('Submit failed:', error)
    messageStore.error(dialogMode.value === 'prg-build' ? t('project.prgBuildFailed') : t('submitDesign.submitFailed'))
  } finally {
    loading.value = false
  }
}

const handlePrgBuildConfirm = async (submitData: DesignSubmitDTO): Promise<ApiResponse<boolean>> => {
  if (!prgDeviceId.value) {
    return { code: -1, msg: t('project.selectDeviceFirst'), data: false } as ApiResponse<boolean>
  }

  const updateData: UpdateDesignParamsV2 = {
    uid: submitData.designUid,
    name: submitData.name,
    description: submitData.description,
    categoryIds: submitData.categoryIds,
    bundleIds: submitData.bundleIds,
  }
  if (canPublishPaid.value) {
    updateData.payment = {
      paymentMethod: submitData.paymentMethod,
      price: submitData.paymentMethod === 'free' ? 0 : Number(submitData.price || 0),
      trialLasts: submitData.paymentMethod === 'free' ? 0 : Number(submitData.trialLasts || 0),
    }
  }

  const updateResponse = await designApi.updateDesign(updateData)
  if (updateResponse.code !== 0) {
    return { code: updateResponse.code, msg: updateResponse.msg || t('common.saveFailed'), data: false } as ApiResponse<boolean>
  }
  return designApi.submitPrgPackageTask(submitData.designUid, prgDeviceId.value)
}

// Cancel
const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
  currentDesign.value = null
}

// Expose methods to parent
defineExpose({
  show
})
</script>

<style scoped>
.submit-form {
  padding: 20px 0;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.merchant-required-tip {
  display: inline-flex;
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  vertical-align: middle;
}

.description-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.description-language-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .submit-form {
    padding: 10px 0;
  }
  
  .el-form-item {
    margin-bottom: 16px;
  }
}
</style> 
