<template>
  <el-dialog
    v-model="dialogVisible"
    title="WPay接入"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="API Token">
        <el-input v-model="form.token" placeholder="请输入WPay商家API Token" />
        <div class="form-tip">
          访问 <a href="https://merchant.wristo.io/API" target="_blank">https://merchant.wristo.io/API</a> 获取商家 API Token
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { setWPayMerchantToken, getUser } from '@/api/users'

const authStore = useAuthStore()
const dialogVisible = ref(false)
const form = reactive({
  token: ''
})

const emit = defineEmits(['update:modelValue'])

const handleSave = async () => {
  if (form.token) {
    console.log('save wpay token:', form.token)
    const res = await setWPayMerchantToken(authStore.user.id, form.token)
    console.log('save wpay token res:', res)
    const user = await getUser()
    console.log('get user res:', user)
    authStore.user.merchant_token = user.merchant_token
    dialogVisible.value = false
    form.token = ''
  }
}

defineExpose({
  show: () => {
    form.token = authStore.user.merchant_token || ''
    dialogVisible.value = true
  }
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.4;
}

.form-tip a {
  color: #409EFF;
  text-decoration: none;
}

.form-tip a:hover {
  text-decoration: underline;
}
</style> 