<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="提交设计" 
    width="50%" 
    :top="'10vh'"
    class="submit-design-dialog"
  >
    <el-form 
      :model="form" 
      :rules="rules" 
      ref="formRef" 
      label-width="120px" 
      class="submit-form"
    >
      <el-form-item label="设计名称">
        <el-input v-model="form.name" disabled />
      </el-form-item>
      
      <el-form-item label="收款方式" prop="paymentMethod">
        <el-radio-group v-model="form.paymentMethod" @change="handlePaymentMethodChange">
          <el-radio label="kpay">KPay</el-radio>
          <el-radio label="wpay">WPay</el-radio>
          <el-radio label="free">免费</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item 
        label="KPay ID" 
        prop="kpayId" 
        v-if="form.paymentMethod === 'kpay'"
      >
        <el-input 
          v-model="form.kpayId" 
          placeholder="请输入KPay产品ID"
          clearable
        />
        <div class="form-tip">KPay支付时必须填写KPay产品ID</div>
      </el-form-item>
      
      <el-form-item 
        label="价格" 
        prop="price"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.price" 
          :min="0" 
          :max="999.99" 
          :precision="2"
          :step="0.01"
          placeholder="请输入价格"
          style="width: 100%"
        />
        <div class="form-tip">请输入价格（美元）</div>
      </el-form-item>
      
      <el-form-item 
        label="试用时长" 
        prop="trialLasts"
        v-if="form.paymentMethod !== 'free'"
      >
        <el-input-number 
          v-model="form.trialLasts" 
          :min="0" 
          :max="720" 
          :precision="2"
          :step="0.25"
          placeholder="请输入试用小时数"
          style="width: 100%"
        />
        <div class="form-tip">请输入试用小时数（0-720小时，支持小数）</div>
      </el-form-item>
      
      <el-form-item label="描述">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="3" 
          placeholder="请输入设计描述"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          提交
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import type { Design, DesignSubmitDTO } from '@/types/design'
import type { ApiResponse } from '@/types/api'

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
  trialLasts: 1 // 默认1小时
})

const rules = computed(() => ({
  paymentMethod: [
    { required: true, message: '请选择收款方式', trigger: 'change' }
  ],
  kpayId: [
    { 
      required: form.paymentMethod === 'kpay', 
      message: 'KPay支付时必须填写KPay产品ID', 
      trigger: 'blur' 
    }
  ],
  price: [
    { 
      required: form.paymentMethod !== 'free', 
      message: '请输入价格', 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 1.99, 
      max: 99.99, 
      message: '价格必须在1.99-99.99之间', 
      trigger: 'blur' 
    }
  ],
  trialLasts: [
    { 
      required: form.paymentMethod !== 'free', 
      message: '请输入试用时长', 
      trigger: 'blur' 
    },
    { 
      type: 'number', 
      min: 0, 
      max: 720, 
      message: '试用时长必须在0-720小时之间', 
      trigger: 'blur' 
    }
  ]
}))

const emit = defineEmits(['success', 'cancel'])

// 处理收款方式变化
const handlePaymentMethodChange = (value: string) => {
  if (value === 'free') {
    form.price = 0
    form.trialLasts = 0
  } else if (value === 'kpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 1 // 1小时
  } else if (value === 'wpay') {
    form.price = form.price || 1.99
    form.trialLasts = form.trialLasts || 1 // 1小时
  }
}

// 显示对话框
const show = async (design: Design) => {
  try {
    loading.value = true
    
    // 先请求获取设计详情
    const response: ApiResponse<Design> = await designApi.getDesignByUid(design.designUid)
    
    if (response.code === 0 && response.data) {
      const designDetail = response.data
      const product = designDetail.product
      
      // 重置表单并填充最新数据
      Object.assign(form, {
        designUid: designDetail.designUid,
        name: designDetail.name,
        description: designDetail.description || '',
        paymentMethod: 'none',
        kpayId: '',
        price: 1.99,
        trialLasts: 1
      })
      
      if (product) {
        form.trialLasts = product.trialLasts
      }
      // 如果product中有支付信息，预填充
      if (product?.payment) {
        const payment = product.payment
        form.paymentMethod = payment.paymentMethod
        form.kpayId = payment.kpayId || ''
        form.price = payment.price || 1.99
      }
      // 如果design中有支付信息，预填充（兼容旧版本）
      else if (designDetail.payment) {
        form.paymentMethod = designDetail.payment.paymentMethod
        form.kpayId = designDetail.payment.kpayId || ''
        form.price = designDetail.payment.price || 1.99
      }
    
      dialogVisible.value = true
    } else {
      messageStore.error(response.msg || '获取设计详情失败')
    }
  } catch (error) {
    console.error('获取设计详情失败:', error)
    messageStore.error('获取设计详情失败')
  } finally {
    loading.value = false
  }
}

// 确认提交
const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    const submitData: DesignSubmitDTO = {
      designUid: form.designUid,
      paymentMethod: form.paymentMethod,
      name: form.name,
      description: form.description
    }
    
    // 根据收款方式添加相应参数
    if (form.paymentMethod === 'kpay') {
      submitData.kpayId = form.kpayId
      submitData.price = form.price
      submitData.trialLasts = form.trialLasts
    } else if (form.paymentMethod === 'wpay') {
      submitData.price = form.price
      submitData.trialLasts = form.trialLasts
    }
    // free模式不需要额外参数
    
    const response = await designApi.submitDesign(submitData)
    
    if (response.code === 0) {
      messageStore.success('提交成功')
      emit('success')
      dialogVisible.value = false
    } else {
      messageStore.error(response.msg || '提交失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    messageStore.error('提交失败')
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

// 暴露方法给父组件
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