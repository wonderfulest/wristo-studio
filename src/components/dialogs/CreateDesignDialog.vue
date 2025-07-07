<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="创建新设计" 
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <el-form 
      :model="form" 
      :rules="rules"
      ref="formRef"
      label-width="100px"
      class="create-design-form"
    >
      <el-form-item label="设计名称" prop="name">
        <el-input 
          v-model="form.name" 
          placeholder="请输入设计名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="设计描述" prop="description">
        <el-input 
          v-model="form.description" 
          type="textarea" 
          :rows="4"
          placeholder="请输入设计描述"
          maxlength="200"
          show-word-limit
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
          创建设计
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { designApi } from '@/api/wristo-v2/design-v2'
import { useBaseStore } from '@/stores/baseStore'

const router = useRouter()
const baseStore = useBaseStore()

const dialogVisible = ref(false)
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  name: '',
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入设计名称', trigger: 'blur' },
    { min: 1, max: 50, message: '设计名称长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入设计描述', trigger: 'blur' },
    { min: 1, max: 200, message: '设计描述长度在 1 到 200 个字符', trigger: 'blur' }
  ]
}

const emit = defineEmits(['success', 'cancel'])

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    const response = await designApi.createDesign({
      name: form.name,
      description: form.description
    })
    
    if (response.code === 0 && response.data) {
      ElMessage.success('设计创建成功')
      
      // 设置基础信息
      baseStore.watchFaceName = form.name
      baseStore.kpayId = response.data.designUid || ''
      
      // 跳转到设计页面
      router.push({
        path: '/design',
        query: { id: response.data.designUid }
      })
      
      emit('success', response.data)
      dialogVisible.value = false
    } else {
      ElMessage.error(response.msg || '创建设计失败')
    }
  } catch (error) {
    console.error('创建设计失败:', error)
    ElMessage.error('创建设计失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

// 重置表单
const resetForm = () => {
  form.name = ''
  form.description = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 显示对话框
const show = () => {
  resetForm()
  dialogVisible.value = true
}

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
.create-design-form {
  padding: 20px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 