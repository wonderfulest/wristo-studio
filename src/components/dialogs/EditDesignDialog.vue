<template>
  <el-dialog 
    v-model="dialogVisible" 
    width="70%" 
    :top="'3vh'"
    class="edit-design-dialog"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-title-block">
          <div class="dialog-title">{{ t('editDesign.title') }}</div>
          <div class="dialog-subtitle">{{ headerSubtitle }}</div>
        </div>
        <span :class="['status-chip', statusBadgeClass]">{{ statusLabel }}</span>
      </div>
    </template>

    <div class="dialog-content">
      <div class="overview-section">
        <div class="preview-panel">
          <div class="preview-frame">
            <img
              v-if="designPreviewUrl"
              :src="designPreviewUrl"
              :alt="form.name || t('editDesign.previewImage')"
              class="preview-image"
            />
            <div v-else class="preview-empty">
              <el-icon><Picture /></el-icon>
              <span>{{ t('editDesign.noPreviewImage') }}</span>
            </div>
          </div>
        </div>

        <div class="info-panel">
          <div class="info-row">
            <span>{{ t('card.design') }}</span>
            <strong>{{ currentDesign?.designUid || '-' }}</strong>
          </div>
          <div class="info-row">
            <span>{{ t('project.device') }}</span>
            <strong>{{ deviceSummary }}</strong>
          </div>
          <div class="info-row">
            <span>{{ t('card.lastUpdated') }}</span>
            <strong>{{ lastUpdatedText }}</strong>
          </div>
          <div class="info-row">
            <span>{{ t('card.lastPackage') }}</span>
            <strong>{{ lastPackageText }}</strong>
          </div>
        </div>

        <div class="package-panel">
          <div class="package-title">
            <el-icon><Box /></el-icon>
            <span>{{ t('editDesign.packageInfo') }}</span>
          </div>
          <div v-if="packageRows.length" class="package-list">
            <div v-for="row in packageRows" :key="row.key" class="package-row">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
          <div v-else class="package-empty">{{ t('pending.noPackage') }}</div>
        </div>
      </div>

      <!-- Header Section -->
      <div class="form-section">
        <div class="section-title">{{ t('property.basicInformation') }}</div>
        <div class="form-grid">
          <div class="form-field">
            <label class="field-label">{{ t('createDesign.name') }}</label>
            <div class="readonly-field readonly-text-field">{{ form.name || '-' }}</div>
          </div>
          <div class="form-field">
            <label class="field-label">{{ t('common.status') }}</label>
            <div class="readonly-field status-readonly-field">
              <span :class="['status-chip', statusBadgeClass]">{{ statusLabel }}</span>
            </div>
          </div>
        </div>
        <div class="form-field full-width">
          <label class="field-label">{{ t('submitDesign.description') }}</label>
          <div class="readonly-field readonly-description">
            {{ form.description || '-' }}
          </div>
        </div>
      </div>

      <!-- Payment Section -->
      <div v-if="isMerchantUser" class="form-section">
        <div class="section-title">{{ t('editDesign.paymentSettings') }}</div>
        <div class="payment-grid">
          <div class="form-field">
            <label class="field-label">{{ t('submitDesign.paymentMethod') }}</label>
            <div class="readonly-field readonly-text-field">{{ paymentMethodText }}</div>
          </div>
          <div class="form-field" v-if="form.payment.paymentMethod !== 'none'">
            <label class="field-label">{{ t('editDesign.priceCny') }}</label>
            <div class="readonly-field readonly-text-field">{{ priceText }}</div>
          </div>
          <div class="form-field" v-if="form.payment.paymentMethod !== 'none'">
            <label class="field-label">{{ t('editDesign.trialHours') }}</label>
            <div class="readonly-field readonly-text-field">{{ trialText }}</div>
          </div>
        </div>
      </div>

      <!-- Configuration Section -->
      <div v-if="isMerchantUser" class="form-section config-section">
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
          </div>
        </div>
        <div class="config-editor">
          <div class="config-content">
            <!-- JSON Preview -->
            <vue-json-pretty
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
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button 
          type="primary" 
          @click="handleCancel"
          class="apple-button primary"
        >
          {{ t('common.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import dayjs from 'dayjs'
import type { ApiResponse } from '@/types/api/api'
import type { Design, Payment } from '@/types/api/design'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { designApi } from '@/api/wristo/design'
import { useMessageStore } from '@/stores/message'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { Box, DocumentCopy, Picture } from '@element-plus/icons-vue'
import emitter from '@/utils/eventBus.ts'
import { useBaseStore } from '@/stores/baseStore'
import { useUserStore } from '@/stores/user'
import { useI18n } from '@/i18n'
const designId = ref<string | null>(null)
const dialogVisible = ref(false)
const route = useRoute()
const baseStore = useBaseStore()
const userStore = useUserStore()
const { t } = useI18n()
const currentDesign = ref<Design | null>(null)
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

const emit = defineEmits(['cancel'])

const isMerchantUser = computed(() => userStore.isMerchantUser)

const formatDateTime = (value?: string | number | null) => {
  if (!value) return t('common.unknown')
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : t('common.unknown')
}

const designPreviewUrl = computed(() => {
  const design = currentDesign.value
  return (
    design?.cover?.formats?.medium?.url ||
    design?.cover?.formats?.thumbnail?.url ||
    design?.cover?.url ||
    design?.backgroundImage?.formats?.medium?.url ||
    design?.backgroundImage?.formats?.thumbnail?.url ||
    design?.backgroundImage?.url ||
    design?.product?.garminImageUrl ||
    design?.product?.rawImageUrl ||
    ''
  )
})

const deviceSummary = computed(() => {
  const device = userStore.userInfo?.device
  if (!device) return t('project.noDeviceSelected')
  const resolution = device.resolutionWidth && device.resolutionHeight
    ? ` · ${device.resolutionWidth} × ${device.resolutionHeight}`
    : ''
  return `${device.displayName || device.deviceId}${resolution}`
})

const lastUpdatedText = computed(() => formatDateTime(currentDesign.value?.updatedAt))

const lastPackageText = computed(() => {
  const product = currentDesign.value?.product
  return formatDateTime(product?.prgRelease?.updatedAt || product?.release?.updatedAt)
})

const statusLabel = computed(() => {
  const status = form.designStatus
  if (status === 'submitted') return t('editDesign.statusSubmitted')
  return status ? t(`status.${status}`) : '-'
})

const statusBadgeClass = computed(() => {
  const status = form.designStatus || 'unknown'
  return `status-chip--${status}`
})

const headerSubtitle = computed(() => {
  const name = form.name?.trim()
  const uid = currentDesign.value?.designUid
  if (name && uid) return `${name} · ${uid}`
  return name || uid || t('card.design')
})

const paymentMethodText = computed(() => {
  if (form.payment.paymentMethod === 'none') return t('payment.free')
  return 'WPay'
})

const priceText = computed(() => {
  const price = Number(form.payment.price || 0)
  return price ? price.toFixed(2) : '0.00'
})

const trialText = computed(() => {
  const trialLasts = Number(form.payment.trialLasts || 0)
  return trialLasts ? `${trialLasts}` : '0'
})

const queueText = (rank?: number | null) => {
  if (rank === null || rank === undefined) return ''
  if (rank > 0) return t('card.position', { rank })
  return t('card.packaging')
}

const releaseText = (updatedAt?: string | number | null) => {
  if (!updatedAt) return t('pending.noPackage')
  return formatDateTime(updatedAt)
}

const packageRows = computed(() => {
  const product = currentDesign.value?.product
  if (!product) return []

  const rows: Array<{ key: string; label: string; value: string }> = []
  const prgRank = product.prgPackagingLog?.rank
  const iqRank = product.packagingLog?.rank

  rows.push({
    key: 'prg-release',
    label: 'PRG',
    value: prgRank !== null && prgRank !== undefined
      ? queueText(prgRank)
      : releaseText(product.prgRelease?.updatedAt)
  })

  if (isMerchantUser.value) {
    rows.push({
      key: 'iq-release',
      label: 'IQ',
      value: iqRank !== null && iqRank !== undefined
        ? queueText(iqRank)
        : releaseText(product.release?.updatedAt)
    })
  }

  return rows.filter((row) => row.value)
})

// 加载设计数据
const loadDesign = async (designUid: string) => {
  try {
    const response: ApiResponse<Design> = await designApi.getDesignByUid(designUid)
    if (response.code === 0 && response.data) {
      const designData = response.data
      currentDesign.value = designData
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

const handleCancel = () => {
  emit('cancel')
  dialogVisible.value = false
  currentDesign.value = null
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

// 定义 show 方法
const show = async (designUid: string) => {
  console.log('show design', designUid)
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
  letter-spacing: 0;
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
  max-height: calc(94vh - 140px);
  overflow-y: auto;
  padding: 16px;
  background: var(--studio-surface);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 34px;
}

.dialog-title-block {
  min-width: 0;
}

.dialog-title {
  color: var(--studio-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.dialog-subtitle {
  margin-top: 4px;
  color: var(--studio-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-section {
  display: grid;
  grid-template-columns: minmax(220px, 0.75fr) minmax(240px, 1fr) minmax(240px, 1fr);
  gap: 12px;
  margin-bottom: 18px;
  align-items: stretch;
}

.preview-panel,
.info-panel,
.package-panel {
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-sm);
}

.preview-panel {
  padding: 10px;
}

.preview-frame {
  aspect-ratio: 1 / 1;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 6px;
  background: var(--studio-surface-soft);
  border: 1px solid var(--studio-border);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  color: var(--studio-text-muted);
  font-size: 13px;
  text-align: center;
}

.preview-empty .el-icon {
  font-size: 28px;
  color: var(--studio-text-subtle);
}

.info-panel,
.package-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.info-row,
.package-row {
  display: grid;
  grid-template-columns: minmax(96px, auto) 1fr;
  gap: 12px;
  align-items: start;
  min-height: 24px;
}

.info-row span,
.package-row span {
  color: var(--studio-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.info-row strong,
.package-row strong {
  color: var(--studio-text);
  font-size: 13px;
  line-height: 1.5;
  font-weight: 600;
  min-width: 0;
  word-break: break-word;
}

.package-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--studio-text);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 2px;
}

.package-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.package-empty {
  color: var(--studio-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

/* Form Sections */
.form-section {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-raised);
  box-shadow: var(--studio-shadow-sm);
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--studio-text);
  margin-bottom: 12px;
  letter-spacing: 0;
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

.readonly-field {
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--studio-border);
  border-radius: 8px;
  background: var(--studio-surface-soft);
}

.readonly-text-field {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  word-break: break-word;
}

.readonly-description {
  min-height: 68px;
  align-items: flex-start;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.status-readonly-field {
  justify-content: flex-start;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--studio-primary-soft);
  color: var(--studio-primary);
  border: 1px solid var(--studio-primary-border);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
}

.status-chip--draft,
.status-chip--unknown {
  background: var(--studio-surface-soft);
  border-color: var(--studio-border);
  color: var(--studio-text-muted);
}

.status-chip--submitted {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: var(--studio-warning);
}

.status-chip--approved,
.status-chip--packaged {
  background: var(--studio-primary-soft);
  border-color: var(--studio-primary-border);
  color: var(--studio-primary);
}

.status-chip--rejected {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.26);
  color: var(--studio-danger);
}

.status-chip--published {
  background: var(--studio-primary);
  border-color: var(--studio-primary);
  color: var(--color-white);
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--studio-text-muted);
  margin-bottom: 4px;
  letter-spacing: 0;
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
  letter-spacing: 0;
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
  border-radius: 8px;
  overflow: hidden;
  background: var(--studio-surface-soft);
  min-height: 360px;
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
  resize: vertical;
  min-height: 360px !important;
  max-height: 70vh;
  overflow: auto;
  background: var(--studio-surface);
  color: var(--studio-text);
  white-space: pre;
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
  .overview-section {
    grid-template-columns: 1fr 1fr;
  }

  .preview-panel {
    grid-row: span 2;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .payment-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dialog-content {
    padding: 12px;
  }

  .dialog-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .overview-section {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    grid-row: auto;
  }

  .info-row,
  .package-row {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .section-header {
    align-items: flex-start;
    gap: 10px;
    flex-direction: column;
  }

  .config-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style> 
