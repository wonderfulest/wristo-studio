<template>
  <el-dialog 
    v-model="dialogVisible" 
    :title="t('editDesign.title')" 
    width="70%" 
    :top="'3vh'"
    class="edit-design-dialog"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <!-- Header Section -->
      <div class="form-section">
        <div class="section-title">{{ t('property.basicInformation') }}</div>
        <div class="form-grid">
          <div class="form-field">
            <label class="field-label">{{ t('createDesign.name') }}</label>
            <el-input 
              v-model="form.name" 
              :placeholder="t('createDesign.enterName')"
              class="apple-input"
            />
          </div>
          <div class="form-field">
            <label class="field-label">{{ t('common.status') }}</label>
            <el-select 
              v-model="form.designStatus" 
              :placeholder="t('editDesign.selectStatus')"
              class="apple-select"
            >
              <el-option :label="t('status.draft')" value="draft" />
              <el-option :label="t('editDesign.statusSubmitted')" value="submitted" />
              <el-option :label="t('status.approved')" value="approved" />
              <el-option :label="t('status.rejected')" value="rejected" />
            </el-select>
          </div>
        </div>
        <div class="form-field full-width">
          <label class="field-label">{{ t('submitDesign.description') }}</label>
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="2"
            :placeholder="t('createDesign.enterDescription')"
            class="apple-textarea"
          />
        </div>
      </div>

      <!-- Payment Section -->
      <div class="form-section">
        <div class="section-title">{{ t('editDesign.paymentSettings') }}</div>
        <div class="payment-grid">
          <div class="form-field">
            <label class="field-label">{{ t('submitDesign.paymentMethod') }}</label>
            <el-radio-group 
              v-model="form.payment.paymentMethod" 
              class="apple-radio-group"
              @change="handlePaymentMethodChange"
            >
              <el-radio label="wpay" class="apple-radio">WPay</el-radio>
              <el-radio label="none" class="apple-radio">{{ t('payment.free') }}</el-radio>
            </el-radio-group>
          </div>
          <div class="form-field" v-if="form.payment.paymentMethod !== 'none'">
            <label class="field-label">{{ t('editDesign.priceCny') }}</label>
            <el-input-number
              v-model.number="form.payment.price"
              :min="0"
              :max="999.99"
              :precision="2"
              :step="0.01"
              placeholder="0.00"
              class="apple-number-input"
            />
          </div>
          <div class="form-field" v-if="form.payment.paymentMethod !== 'none'">
            <label class="field-label">{{ t('editDesign.trialHours') }}</label>
            <el-input-number
              v-model.number="form.payment.trialLasts"
              :min="0"
              :max="720"
              :precision="2"
              :step="0.25"
              placeholder="0.25"
              class="apple-number-input"
            />
          </div>
        </div>
      </div>

      <!-- Configuration Section -->
      <div class="form-section config-section">
        <div class="section-header">
          <div class="section-title">{{ t('editDesign.configuration') }}</div>
          <div class="config-actions">
            <el-button 
              size="small" 
              @click="copyConfig"
              class="apple-button secondary"
            >
              <el-icon><DocumentCopy /></el-icon>
              {{ t('common.copy') }}
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="toggleEditMode"
              class="apple-button primary"
            >
              <el-icon><Edit /></el-icon>
              {{ isEditing ? t('editDesign.preview') : t('common.edit') }}
            </el-button>
          </div>
        </div>
        <div class="config-editor">
          <div class="config-content">
            <!-- JSON Preview -->
            <vue-json-pretty
              v-if="!isEditing"
              :data="form.configJson"
              :deep="4"
              :showLength="true" 
              :showLineNumber="true"
              :showDoubleQuotes="true"
              :highlightMouseoverNode="true"
              :selectOnClickNode="true"
              :collapsedOnClickBrackets="true"
              class="json-preview"
            />
            <!-- JSON Edit -->
            <el-input
              v-else
              v-model="jsonEditText"
              type="textarea"
              :rows="32"
              :status="jsonEditStatus"
              @input="validateJson"
              class="json-editor-input"
            />
          </div>
          <!-- JSON error -->
          <div v-if="jsonEditError" class="json-error">
            <el-icon class="error-icon"><WarningFilled /></el-icon>
            {{ jsonEditError }}
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button 
          @click="handleCancel"
          class="apple-button secondary"
        >
          {{ t('common.cancel') }}
        </el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :disabled="!!jsonEditError"
          class="apple-button primary"
        >
          {{ t('profile.saveChanges') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import type { ApiResponse } from '@/types/api/api'
import type { Design, UpdateDesignParamsV2, Payment } from '@/types/api/design'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { DocumentCopy, Edit, WarningFilled } from '@element-plus/icons-vue'
import emitter from '@/utils/eventBus.ts'
import { useBaseStore } from '@/stores/baseStore'
import { useI18n } from '@/i18n'
const designId = ref<string | null>(null)
const dialogVisible = ref(false)
const route = useRoute()
const baseStore = useBaseStore()
const { t } = useI18n()
const form = reactive({
  id: null,
  name: '',
  designStatus: '',
  description: '',
  configJson: {},
  configJsonString: '',
  payment: { 
    paymentMethod: 'none', price: 0, trialLasts: 0
  } as Payment // 默认结构
})

const messageStore = useMessageStore()

const emit = defineEmits(['success', 'cancel'])

const isEditing = ref(false)
const jsonEditText = ref('')
const jsonEditError = ref('')
const jsonEditStatus = ref('')

// 加载设计数据
const loadDesign = async (designUid: string) => {
  try {
    const response: ApiResponse<Design> = await designApi.getDesignByUid(designUid)
    if (response.code === 0 && response.data) {
      const designData = response.data
      // 路由判断：仅在画布页（/design 且包含 id 参数）时使用实时画布配置；否则使用服务端配置
      const isInCanvas = route.path.includes('/design') && !!route.query.id
      baseStore.appId = designData.product?.appId || -1
      if (isInCanvas) {
        console.log('isInCanvas', isInCanvas)
        const realtimeConfig = baseStore?.generateConfig?.() || {}
        Object.assign(form, {
          id: designData.id,
          name: designData.name,
          designStatus: designData.designStatus,
          description: designData.description,
          configJson: realtimeConfig,
          configJsonString: JSON.stringify(realtimeConfig, null, 2),
          payment: {
            paymentMethod: designData.product?.payment?.paymentMethod || 'wpay',
            price: designData.product?.payment?.price || 1.99,
            trialLasts: designData.product?.trialLasts ?? 0.25 // 默认 0.25小时
          }
        })
      } else {
        const serverConfig = designData.configJson
        Object.assign(form, {
          id: designData.id,
          name: designData.name,
          designStatus: designData.designStatus,
          description: designData.description,
          configJson: serverConfig,
          configJsonString: JSON.stringify(serverConfig, null, 2),
          payment: {
            paymentMethod: designData.product?.payment?.paymentMethod || 'wpay',
            price: designData.product?.payment?.price || 1.99,
            trialLasts: designData.product?.trialLasts ?? 0.25 // 默认 0.25小时
          }
        })
      }

      // 初始化编辑文本
      jsonEditText.value = JSON.stringify(form.configJson, null, 2)
    } else {
      ElMessage.error(response.msg || t('editDesign.loadFailed'))
      handleCancel()
    }
  } catch (error) {
    console.error('加载设计失败:', error)
    ElMessage.error(t('editDesign.loadFailed'))
    handleCancel()
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (!isEditing.value) {
    // 切换到编辑模式
    jsonEditText.value = JSON.stringify(form.configJson, null, 2)
    isEditing.value = true
  } else {
    // 切换到预览模式前验证 JSON
    try {
      const parsed = JSON.parse(jsonEditText.value)
      form.configJson = parsed
      isEditing.value = false
      jsonEditError.value = ''
      jsonEditStatus.value = ''
    } catch (error) {
      ElMessage.error(t('editDesign.invalidJsonBeforePreview'))
    }
  }
}

// 验证 JSON
const validateJson = (value: string) => {
  try {
    JSON.parse(value)
    jsonEditError.value = ''
    jsonEditStatus.value = 'success'
  } catch (error) {
    jsonEditError.value = t('editDesign.invalidJsonDetail', { error: String(error) })
    jsonEditStatus.value = 'error'
  }
}

// 修改保存逻辑
const handleConfirm = async () => {
  try {
    // 获取正确的配置 JSON
    const configJson = isEditing.value 
      ? JSON.parse(jsonEditText.value)  // 如果在编辑模式，使用编辑框的内容
      : form.configJson                 // 如果在预览模式，使用 form 中的配置

    const data = {
      uid: designId.value,
      name: form.name,
      designStatus: form.designStatus,
      description: form.description,
      configJson: configJson,
      payment: form.payment // 新增
    }

    const res: ApiResponse<Design> = await designApi.updateDesign(data as unknown as UpdateDesignParamsV2)
    
    if (res.code === 0 && res.data) {
      emit('success', res.data)
      dialogVisible.value = false
    } else {
      messageStore.error(res.msg || t('editDesign.updateFailed'))
    }

  } catch (error) {
    console.error('更新设计失败:', error)
    messageStore.error(error as string || t('editDesign.updateFailed'))
  }
}

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
}

// 复制配置到剪贴板
const copyConfig = () => {
  const configStr = JSON.stringify(form.configJson, null, 2)
  navigator.clipboard
    .writeText(configStr)
    .then(() => {
      messageStore.success(t('editDesign.configCopied'))
    })
    .catch(() => {
      messageStore.error(t('common.copyFailed'))
    })
}

// 处理收款方式变化
const handlePaymentMethodChange = (value: string) => {
  if (value === 'none') {
    form.payment.price = 0
    form.payment.trialLasts = 0
  } else {
    form.payment.price = form.payment.price || 1.99
    form.payment.trialLasts = form.payment.trialLasts || 0.25
  }
}

// 定义 show 方法
const show = async (designUid: string) => {
  console.log('show design', designUid)
  // 重置状态
  isEditing.value = false
  jsonEditText.value = ''
  jsonEditError.value = ''
  jsonEditStatus.value = ''
  
  designId.value = designUid
  await loadDesign(designUid)
  dialogVisible.value = true
}

// 添加事件监听
const handleOpenViewProperties = () => {
  const designUid = route.query.id as string
  if (designUid) {
    show(designUid)
  }
}

onMounted(() => {
  emitter.on('open-view-properties', handleOpenViewProperties)
})

onUnmounted(() => {
  emitter.off('open-view-properties', handleOpenViewProperties)
})

// 暴露方法给父组件
defineExpose({
  show
})
</script>

<style scoped>
/* Apple-style Dialog */
:deep(.edit-design-dialog .el-dialog) {
  margin-top: 3vh !important;
  margin-bottom: 3vh !important;
  max-height: 94vh;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  /* Compact controls */
  --el-component-size: 26px;
  --el-font-size-base: 13px;
}

:deep(.edit-design-dialog .el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--studio-border);
  background: var(--studio-surface-raised);
}

:deep(.edit-design-dialog .el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--studio-text);
  letter-spacing: -0.022em;
}

:deep(.edit-design-dialog .el-dialog__body) {
  padding: 0;
  overflow: hidden;
}

:deep(.edit-design-dialog .el-dialog__footer) {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--studio-border);
  background: var(--studio-surface-raised);
}

/* Dialog Content */
.dialog-content {
  height: calc(94vh - 140px);
  overflow-y: auto;
  padding: 12px 12px 12px;
  background: var(--studio-surface);
}

/* Form Sections */
.form-section {
  margin-bottom: 20px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--studio-text);
  margin-bottom: 12px;
  letter-spacing: -0.022em;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.payment-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
  align-items: center;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--studio-text-muted);
  margin-bottom: 4px;
  letter-spacing: -0.016em;
}

/* Apple-style Inputs */
:deep(.apple-input .el-input__wrapper) {
  border-radius: 8px;
  border: 1px solid var(--studio-border);
  box-shadow: none;
  transition: all 0.2s ease;
  padding: 8px 10px;
}

:deep(.apple-input .el-input__wrapper:hover) {
  border-color: var(--studio-primary);
}

:deep(.apple-input .el-input__wrapper.is-focus) {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}

:deep(.apple-select .el-select__wrapper) {
  border-radius: 8px;
  border: 1px solid var(--studio-border);
  box-shadow: none;
  transition: all 0.2s ease;
  padding: 8px 10px;
}

:deep(.apple-select .el-select__wrapper:hover) {
  border-color: var(--studio-primary);
}

:deep(.apple-select .el-select__wrapper.is-focused) {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}

:deep(.apple-textarea .el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid var(--studio-border);
  box-shadow: none;
  transition: all 0.2s ease;
  padding: 8px 10px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  resize: none;
}

:deep(.apple-textarea .el-textarea__inner:hover) {
  border-color: var(--studio-primary);
}

:deep(.apple-textarea .el-textarea__inner:focus) {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}

:deep(.apple-number-input .el-input__wrapper) {
  border-radius: 8px;
  border: 1px solid var(--studio-border);
  box-shadow: none;
  transition: all 0.2s ease;
  padding: 8px 10px;
}

:deep(.apple-number-input .el-input__wrapper:hover) {
  border-color: var(--studio-primary);
}

:deep(.apple-number-input .el-input__wrapper.is-focus) {
  border-color: var(--studio-primary);
  box-shadow: 0 0 0 3px var(--studio-focus-ring);
}

/* Radio Group */
.apple-radio-group {
  display: flex;
  gap: 8px;
}

:deep(.apple-radio .el-radio__input.is-checked .el-radio__inner) {
  background-color: var(--studio-primary);
  border-color: var(--studio-primary);
}

:deep(.apple-radio .el-radio__label) {
  font-weight: 500;
  color: var(--studio-text);
}

/* Buttons */
.apple-button {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: -0.016em;
  transition: all 0.2s ease;
  padding: 8px 14px;
}

:deep(.apple-button.secondary) {
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
  color: var(--studio-text);
}

:deep(.apple-button.secondary:hover) {
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
}

:deep(.apple-button.primary) {
  background: var(--studio-primary);
  border: 1px solid var(--studio-primary);
  color: var(--color-white);
}

:deep(.apple-button.primary:hover) {
  background: var(--studio-primary-hover);
  border-color: var(--studio-primary-hover);
}

:deep(.apple-button.primary:disabled) {
  background: var(--el-fill-color);
  border-color: var(--studio-border);
  color: var(--studio-text-subtle);
}

/* Config Section */
.config-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.config-editor {
  flex: 1;
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-lg);
  overflow: hidden;
  background: var(--studio-surface-soft);
  min-height: 800px;
  max-height: calc(94vh - 800px);
  display: flex;
  flex-direction: column;
}

.config-content {
  flex: 1;
  overflow: auto;
  background: var(--studio-surface);
  margin: 1px;
  border-radius: 11px;
}

/* JSON Preview */
.json-preview {
  padding: 14px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

:deep(.json-preview .vjs-tree) {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

/* JSON Editor Input */
:deep(.json-editor-input .el-textarea__inner) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 14px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  background: var(--studio-surface);
  color: var(--studio-text);
}

:deep(.json-editor-input .el-textarea__inner:focus) {
  box-shadow: none;
}

/* JSON Error */
.json-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--el-color-danger-light-9);
  border-top: 1px solid var(--el-color-danger-light-5);
  color: var(--el-color-danger);
  font-size: 13px;
  font-weight: 500;
}

.error-icon {
  color: var(--el-color-danger);
}

/* Dialog Footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
  align-items: center;
}

/* Responsive */
@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .payment-grid {
    grid-template-columns: 1fr;
  }
}
</style> 
