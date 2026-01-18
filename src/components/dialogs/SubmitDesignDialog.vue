<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="Submit Design" 
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
      <el-form-item label="Design Name">
        <el-input v-model="form.name" disabled />
      </el-form-item>
      
      <el-form-item label="Payment Method" prop="paymentMethod">
        <el-radio-group v-model="form.paymentMethod" @change="handlePaymentMethodChange">
          <el-radio label="free">Free</el-radio>
          <el-radio label="wpay">WPay</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item 
        label="Price" 
        prop="price"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.price" 
          :min="0" 
          :max="999.99" 
          :precision="2"
          :step="0.01"
          placeholder="Enter price"
          style="width: 100%"
        />
        <div class="form-tip">Please enter the price (USD)</div>
      </el-form-item>
      
      <el-form-item 
        label="Trial Duration" 
        prop="trialLasts"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.trialLasts" 
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
          placeholder="Enter trial hours"
          style="width: 100%"
        />
        <div class="form-tip">Please enter trial hours (0-720 hours, supports decimals)</div>
      </el-form-item>
      
      <el-form-item label="Description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3" 
          placeholder="Enter design description"
        />
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
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          Submit
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

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref()

const messageStore = useMessageStore()

const form = reactive({
  designUid: '',
  name: '',
  description: '',
  paymentMethod: 'wpay',
  kpayId: '',
  price: 1.99,
  trialLasts: 1, // default 1 hour
  categoryIds: [] as number[],
  bundleIds: [] as number[]
})

const rules = computed(() => ({
  paymentMethod: [
    { required: true, message: 'Please select a payment method', trigger: 'change' }
  ],
  kpayId: [
    { 
      required: form.paymentMethod === 'kpay', 
      message: 'KPay product ID is required when using KPay payment', 
      trigger: 'blur' 
    }
  ],
  price: [
    { 
      required: form.paymentMethod !== 'free', 
      message: 'Please enter the price', 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 1.99, 
      max: 99.99, 
      message: 'Price must be between 1.99 and 99.99', 
      trigger: 'blur' 
    }
  ],
  trialLasts: [
    { 
      required: form.paymentMethod !== 'free', 
      message: 'Please enter trial duration', 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 0, 
      max: 720, 
      message: 'Trial duration must be between 0 and 720 hours', 
      trigger: 'blur' 
    }
  ],
  categoryIds: [
    { required: true, type: 'array', message: 'Please select at least one category', trigger: 'change' },
    { 
      validator: (_rule: any, value: unknown, callback: (err?: Error) => void) => {
        const len = Array.isArray(value) ? value.length : 0
        if (len === 0) return callback(new Error('Please select at least one category'))
        if (len > 3) return callback(new Error('You can select up to 3 categories'))
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
  if (value === 'free') {
    form.price = 0
    form.trialLasts = 0
  } else if (value === 'kpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 1 // 1 hour
  } else if (value === 'wpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 1 // 1 hour
  }
}

// Show dialog
const show = async (design: Design) => {
  try {
    loading.value = true
    
    // First, fetch design details
    const response: ApiResponse<Design> = await designApi.getDesignByUid(design.designUid)
    
    if (response.code === 0 && response.data) {
      const designDetail = response.data
      const product = designDetail.product
      
      // Reset form and populate with latest data
      Object.assign(form, {
        designUid: designDetail.designUid,
        name: designDetail.name,
        description: designDetail.description || '',
        paymentMethod: 'none',
        kpayId: '',
        price: 1.99,
        trialLasts: 1,
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
        form.paymentMethod = payment.paymentMethod
        if (payment.paymentMethod === 'free') {
          // Free mode: price and trial last should be 0
          form.price = 0
          form.trialLasts = 0
        } else {
          // Paid modes: use provided price / trialLasts with sensible defaults
          form.price = payment.price ?? 1.99
          form.trialLasts = payment.trialLasts ?? 1
        }
      }
      // Load category and bundle options
      await Promise.all([loadCategories(), loadBundles()])
      dialogVisible.value = true
    } else {
      messageStore.error(response.msg || 'Failed to get design details')
    }
  } catch (error) {
    console.error('Failed to get design details:', error)
    messageStore.error('Failed to get design details')
  } finally {
    loading.value = false
  }
}

// Confirm submit
const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
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
      messageStore.success('Submitted successfully')
      emit('success')
      dialogVisible.value = false
    } else {
      messageStore.error(response.msg || 'Submit failed')
    }
  } catch (error) {
    console.error('Submit failed:', error)
    messageStore.error('Submit failed')
  } finally {
    loading.value = false
  }
}

// Cancel
const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
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