<template>
  <el-dialog 
    v-model="dialogVisible" 
    :title="t('submitDesign.title')" 
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
        <el-input v-model="form.name" disabled />
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
          :step="0.01"
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
          <el-button size="small" type="primary" :loading="refreshingDescription" @click="refreshDescription">
            {{ t('common.refresh') }}
          </el-button>
        </div>
      </el-form-item>
      <CategorySelector
        v-model:categoryIds="form.categoryIds"
        :categories="categories"
        :loadingCategories="loadingCategories"
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
          {{ t('common.submit') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import type { Design, DesignSubmitDTO } from '@/types/api/design'
import type { ApiResponse } from '@/types/api/api'
import { getAllSeries } from '@/api/wristo/categories'
import type { Category } from '@/types/api/category'
import { productsApi } from '@/api/wristo/products'
import type { Bundle } from '@/types/api/bundle'
import CategorySelector from '@/components/common/CategorySelector.vue'
import BundleSelector from '@/components/common/BundleSelector.vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
import { ElMessage } from 'element-plus'

const dialogVisible = ref(false)
const loading = ref(false)
const refreshingDescription = ref(false)
const currentDesign = ref<Design | null>(null)
const formRef = ref()

const messageStore = useMessageStore()
const userStore = useUserStore()
const { t } = useI18n()
const canPublishPaid = computed(() => userStore.isMerchantUser)

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
        const len = Array.isArray(value) ? value.length : 0
        if (len === 0) return callback(new Error(t('category.selectAtLeastOne')))
        if (len > 3) return callback(new Error(t('category.selectUpToThree')))
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
    const res: Category[] = await getAllSeries()
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
const show = async (design: Design) => {
  try {
    loading.value = true
    currentDesign.value = null
    
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
          form.categoryIds = product.categories.filter((c: Category) => c.id !== 1).map((c: Category) => c.id)
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
    const res = await productsApi.generateDescription({ userId: uid, productId }) as ApiResponse<string>
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
    const response = await designApi.submitDesign(submitData)
    
    if (response.code === 0) {
      messageStore.success(t('submitDesign.submittedSuccessfully'))
      emit('success')
      dialogVisible.value = false
    } else {
      messageStore.error(response.msg || t('submitDesign.submitFailed'))
    }
  } catch (error) {
    console.error('Submit failed:', error)
    messageStore.error(t('submitDesign.submitFailed'))
  } finally {
    loading.value = false
  }
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
  margin-top: 8px;
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
