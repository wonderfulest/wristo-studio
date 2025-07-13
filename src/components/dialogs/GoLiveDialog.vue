<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="Go Live" 
    width="60%" 
    :top="'5vh'"
    class="go-live-dialog"
  >
    <el-form :model="form" label-width="120px" class="go-live-form">
      <el-form-item label="Design Name">
        <el-input v-model="form.name" disabled />
      </el-form-item>
      <el-form-item label="Description">
        <el-input v-model="form.description" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="Garmin Image URL">
        <el-input 
          v-model="form.garminImageUrl" 
          placeholder="Enter Garmin image URL"
          clearable
        />
        <div class="form-tip">
          This image will be displayed in the Garmin Connect IQ store
        </div>
      </el-form-item>
      <el-form-item label="Garmin Store URL">
        <el-input 
          v-model="form.garminStoreUrl" 
          placeholder="Enter Garmin Connect IQ store URL"
          clearable
        />
        <div class="form-tip">
          The URL where users can find your app in the Garmin Connect IQ store
        </div>
      </el-form-item>
      <el-form-item label="Trial Duration (hours)">
        <el-input-number 
          v-model="form.trialLasts" 
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
        />
        <div class="form-tip">
          How long the trial period lasts (0 = no trial)
        </div>
      </el-form-item>
      <el-form-item label="Price (USD)">
        <el-input-number 
          v-model="form.price" 
          :min="0" 
          :max="99.99" 
          :precision="2"
          :step="0.01"
        />
        <div class="form-tip">
          Price in USD for the app
        </div>
      </el-form-item>
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
import { ref, reactive } from 'vue'
import { productsApi } from '@/api/wristo/products'
import { useMessageStore } from '@/stores/message'
import { Design } from '@/types/design'
import { Product } from '@/types/product'

const dialogVisible = ref(false)
const loading = ref(false)
const currentDesign = ref<Design | null>(null)

const form = reactive({
  name: '',
  description: '',
  garminImageUrl: '',
  garminStoreUrl: '',
  trialLasts: 0,
  price: 1.99
})

const messageStore = useMessageStore()
const emit = defineEmits(['success', 'cancel'])

// 加载设计数据
const loadDesign = (design: Design) => {
  currentDesign.value = design
  
  // 设置表单数据
  form.name = design.name
  form.description = design.description || ''
  
  // 如果已有产品信息，使用现有数据
  if (design.product) {
    form.garminImageUrl = design.product.garminImageUrl || ''
    form.garminStoreUrl = design.product.garminStoreUrl || ''
    form.trialLasts = design.product.trialLasts || 0
    form.price = design.product.payment?.price || 1.99
  } else {
    // 重置为默认值
    form.garminImageUrl = ''
    form.garminStoreUrl = ''
    form.trialLasts = 0
    form.price = 1.99
  }
}

// 提交表单
const handleConfirm = async () => {
  if (!currentDesign.value) return
  
  // 验证必填字段
  if (!form.garminImageUrl.trim()) {
    messageStore.error('Please enter Garmin image URL')
    return
  }
  
  if (!form.garminStoreUrl.trim()) {
    messageStore.error('Please enter Garmin store URL')
    return
  }
  
  try {
    loading.value = true
    
    const data = {
      designId: currentDesign.value.designUid,
      name: form.name,
      description: form.description,
      garminImageUrl: form.garminImageUrl.trim(),
      garminStoreUrl: form.garminStoreUrl.trim(),
      trialLasts: form.trialLasts,
      price: form.price
    }
    
    const response = await productsApi.getOrCreateByDesignId(data)
    
    if (response.code === 0 && response.data) {
      messageStore.success('Product information updated successfully')
      emit('success', response.data)
      dialogVisible.value = false
    } else {
      messageStore.error(response.msg || 'Failed to update product information')
    }
  } catch (error) {
    console.error('Failed to update product information:', error)
    messageStore.error('Failed to update product information')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

// 定义 show 方法
const show = (design: Design) => {
  loadDesign(design)
  dialogVisible.value = true
}

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
/* 对话框样式 */
:deep(.go-live-dialog .el-dialog) {
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

:deep(.go-live-dialog .el-dialog__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

/* 表单样式 */
.go-live-form {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  :deep(.go-live-dialog .el-dialog) {
    width: 90% !important;
  }
  
  .go-live-form {
    padding: 16px;
  }
}
</style> 