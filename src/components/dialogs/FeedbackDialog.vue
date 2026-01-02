<template>
  <el-dialog
    v-model="dialogVisible"
    title="用户反馈"
    width="1024px"
    :show-close="true"
    destroy-on-close
    class="feedback-dialog"
  >
    <div class="dialog-content">
      <el-form
        ref="feedbackForm"
        :model="formData"
        :rules="rules"
        label-width="100px"
        @submit.prevent
        class="feedback-form"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="formData.email" 
            placeholder="请输入您的邮箱地址"
            size="large"
          />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select 
            v-model="formData.role" 
            placeholder="请选择您的角色"
            size="large"
            style="width: 100%"
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="建议" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="8"
            placeholder="请输入您的建议或反馈"
            resize="none"
          />
        </el-form-item>
      </el-form>

      <div class="contact-info">
        <el-icon><Message /></el-icon>
        <span>遇到问题？请联系我！发送邮件至：</span>
        <a href="mailto:service@wristo.io">service@wristo.io</a>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button 
          @click="dialogVisible = false"
          size="large"
          class="footer-btn"
        >
          取消
        </el-button>
        <el-button 
          type="primary" 
          @click="submitFeedback" 
          :loading="submitting"
          size="large"
          class="footer-btn"
        >
          提交
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Message } from '@element-plus/icons-vue'
import { useMessageStore } from '@/stores/message'

const messageStore = useMessageStore()
const dialogVisible = ref(false)
const submitting = ref(false)
const feedbackForm = ref(null)

// 表单数据
const formData = reactive({
  email: '',
  role: '',
  content: ''
})

// 角色选项
const roleOptions = [
  { label: '设计师', value: 'designer' },
  { label: '开发者', value: 'developer' },
  { label: '普通用户', value: 'user' },
  { label: '其他', value: 'other' }
]

// 表单验证规则
const rules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择您的角色', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入建议内容', trigger: 'blur' },
    { min: 10, message: '建议内容至少10个字符', trigger: 'blur' }
  ]
}

// 提交反馈
const submitFeedback = async () => {
  if (!feedbackForm.value) return
  
  try {
    await feedbackForm.value.validate()
    submitting.value = true
    
    // TODO: 这里添加提交反馈的API调用
    // await submitFeedbackAPI(formData)
    
    messageStore.success('感谢您的反馈！')
    dialogVisible.value = false
    
    // 重置表单
    feedbackForm.value.resetFields()
  } catch (error) {
    if (error.message) {
      messageStore.error(error.message)
    }
  } finally {
    submitting.value = false
  }
}

// 打开弹框
const showDialog = () => {
  dialogVisible.value = true
}

defineExpose({
  showDialog
})
</script>

<style scoped>
@import '@/assets/styles/dialog.scss';
/* 对话框样式 */
:deep(.el-dialog) {
  --el-dialog-padding-primary: 0;
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 32px 64px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog__title) {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-dialog__footer) {
  padding: 0 64px 48px;
  margin-top: 20px;
  border-top: none;
}

/* 内容容器 */
.feedback-container {
  padding: 48px 64px 4px;
}

/* 表单样式 */
.feedback-form {
  max-width: 720px;
  margin: 0 auto;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

:deep(.el-input__wrapper) {
  padding: 4px 12px;
}

:deep(.el-textarea__inner) {
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
}

/* 联系信息样式 */
.contact-info {
  max-width: 720px;
  margin: 32px auto 0;
  padding: 16px 24px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-regular);
  font-size: 15px;
}

.contact-info .el-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.contact-info a {
  color: var(--el-color-primary);
  text-decoration: none;
  font-weight: 500;
}

.contact-info a:hover {
  text-decoration: underline;
}

/* 底部按钮样式 */
.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 40px 0;
}

:deep(.footer-btn) {
  min-width: 120px;
  padding: 14px 32px;
  font-size: 16px;
  border-radius: 6px;
}

:deep(.footer-btn.el-button--primary) {
  font-weight: 500;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  :deep(.el-dialog__header) {
    border-color: var(--el-border-color-darker);
  }
  
  :deep(.footer-btn:not(.el-button--primary)) {
    border-color: var(--el-border-color-darker);
    background-color: var(--el-fill-color-dark);
  }
}
</style>
