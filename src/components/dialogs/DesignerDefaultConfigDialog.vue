<template>
  <el-dialog
    v-model="visible"
    title="Designer Settings"
    width="80%"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="160px">
      <el-form-item label="Payment Method">
        <el-select v-model="form.defaultPaymentMethod" placeholder="Select method">
          <el-option label="None" value="none" />
          <el-option label="WPay" value="wpay" />
        </el-select>
      </el-form-item>
      <el-form-item label="Default Price">
        <div class="price-row">
          <el-input-number v-model="form.defaultPrice" :min="0" :precision="2" :step="1" />
          <span class="currency-label">{{ form.defaultCurrency || 'USD' }}</span>
        </div>
      </el-form-item>
      <el-form-item label="Description Template">
        <TemplateTextEditor
          v-model="form.descriptionTemplate"
          :user-id="userStore.userInfo?.id || 0"
          placeholder="Write description template. Use variables from the right."
        />
      </el-form-item>
      <el-form-item label="Auto Publish">
        <el-switch v-model="autoPublish" disabled/>
      </el-form-item>
      <el-form-item label="Active">
        <el-switch v-model="active" disabled/>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">Save</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { designerDefaultConfigApi } from '@/api/wristo/designerDefaultConfig'
import type { DesignerDefaultConfigVO, DesignerDefaultConfigUpdateDTO } from '@/types/api/designer-default-config'
import TemplateTextEditor from '@/components/inputs/TemplateTextEditor.vue'

const visible = ref(false)
const loading = ref(false)
const saving = ref(false)

const form = reactive<DesignerDefaultConfigVO>({
  id: 0,
  userId: 0,
  defaultPaymentMethod: null,
  defaultPrice: null,
  defaultCurrency: 'USD',
  descriptionTemplate: null,
  enableAutoPublish: 0,
  isActive: 1
})

const autoPublish = ref(true)
const active = ref(true)

const userStore = useUserStore()

const load = async () => {
  const uid = userStore.userInfo?.id
  if (!uid) return
  loading.value = true
  try {
    const res = await designerDefaultConfigApi.getByUserId(uid)
    const data = res.data
    if (data) {
      form.id = data.id
      form.userId = data.userId
      form.defaultPaymentMethod = data.defaultPaymentMethod
      form.defaultPrice = data.defaultPrice
      form.defaultCurrency = data.defaultCurrency
      form.descriptionTemplate = data.descriptionTemplate
      form.enableAutoPublish = data.enableAutoPublish
      form.isActive = data.isActive
      autoPublish.value = (data.enableAutoPublish ?? 0) === 1
      active.value = (data.isActive ?? 0) === 1
    } else {
      form.userId = uid
      form.id = 0
      autoPublish.value = false
      active.value = true
    }
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  const dto: DesignerDefaultConfigUpdateDTO = {
    id: form.id,
    userId: form.userId,
    defaultPaymentMethod: form.defaultPaymentMethod,
    defaultPrice: form.defaultPrice,
    defaultCurrency: form.defaultCurrency,
    descriptionTemplate: form.descriptionTemplate,
    enableAutoPublish: autoPublish.value ? 1 : 0,
    isActive: active.value ? 1 : 0
  }
  if (!dto.id) {
    ElMessage.error('No existing configuration. Please initialize in backend first.')
    return
  }
  saving.value = true
  try {
    const res = await designerDefaultConfigApi.update(dto)
    if (res.data) {
      visible.value = false
    }
  } finally {
    saving.value = false
  }
}

const show = async () => {
  await load()
  visible.value = true
}

defineExpose({ show })
</script>

<style scoped>
.price-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.currency-label {
  color: #666;
  font-weight: 600;
}
</style>
