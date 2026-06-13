<template>
  <el-dialog :model-value="isDialogVisible" :title="t('export.title')" class="export-dialog" @open="openDialog" @update:model-value="emit('update:isDialogVisible', $event)" :before-close="closeDialog">
    <div v-if="uploading" class="upload-progress">
      <div class="upload-header">
        <h3>{{ t('common.uploading') }}</h3>
        <div class="upload-info">
          <div class="info-item">
            <el-tag type="primary" effect="dark" size="large">{{ t('export.progress') }}: {{ currentProgress }}%</el-tag>
          </div>
          <div class="info-item">
            <el-tag type="success" effect="dark" size="large">{{ t('export.status') }}: {{ currentStatus }}</el-tag>
          </div>
        </div>
      </div>

      <div class="progress-container">
        <el-progress :percentage="currentProgress" :format="progressFormat" :stroke-width="20" />
        <div class="progress-details">
          <div class="current-progress">
            <span class="progress-label">{{ t('export.currentProgress') }}</span>
            <span class="progress-value">{{ currentProgress }}%</span>
          </div>
          <div class="upload-status">
            <span class="status-label">{{ t('export.status') }}:</span>
            <span class="status-value">{{ currentStatus }}</span>
          </div>
        </div>
      </div>

      <div v-if="isUploadTimeout" class="timeout-warning">
        {{ t('export.uploadTimeout') }}
        <el-button size="small" type="danger" @click="cancelUpload">{{ t('export.cancelUpload') }}</el-button>
      </div>
    </div>
    <div v-else class="export-preview">
      <div class="preview-header">
        <span>{{ t('export.preview') }}</span>
        <div class="preview-actions">
          <el-button size="small" @click="copyConfig" class="copy-btn">
            <Icon icon="solar:copy-bold" />
            {{ t('common.copy') }}
          </el-button>
          <el-button type="success" size="small" @click="uploadApp" class="upload-btn">
            <Icon icon="material-symbols:upload" />
            {{ t('common.upload') }}
          </el-button>
        </div>
      </div>
      <vue-json-pretty :data="jsonConfig" />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="downloadConfig">
          <Icon icon="material-symbols:export-notes-rounded" />
          {{ t('common.confirmExport') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * Export panel script setup
 *
 * This script handles the export panel's business logic, including generating the
 * configuration object, exporting the configuration to a JSON file, uploading the
 * configuration to the server, and copying the configuration to the clipboard.
 */
// 移除旧的API导入，使用新的designApi
import { uploadBase64Image, uploadImageFile } from '@/utils/image'
import { ref, computed } from 'vue'
import { designApi } from '@/api/wristo/design'
import _ from 'lodash'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { ElMessage, ElProgress, ElLoading, ElTag } from 'element-plus'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useBaseStore } from '@/stores/baseStore'
import { useRouter } from 'vue-router'
import { usePropertiesStore } from '@/stores/properties'
import { useHistoryStore } from '@/stores/historyStore'
import { useI18n } from '@/i18n'
import { isDefaultBackgroundUrl } from '@/elements/decoration/background/background.constants'
import { useStudioMembershipGate } from '@/composables/useStudioMembershipGate'
const messageStore = useMessageStore()
const router = useRouter()
const userStore = useUserStore()
const user = computed(() => userStore.userInfo)
const propertiesStore = usePropertiesStore()
const { t } = useI18n()
const membershipGate = useStudioMembershipGate()
// 定义属性
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:isDialogVisible'])

const baseStore = useBaseStore()
const historyStore = useHistoryStore()

const closeDialog = () => {
  // 使用 emit 通知父组件更新 isDialogVisible
  emit('update:isDialogVisible', false)

  // 清除上传相关状态
  clearTimeout(uploadTimeoutTimer)
  if (loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

const jsonConfig = ref({})
const uploading = ref(false)
const isUploadTimeout = ref(false)
let uploadTimeoutTimer = null
let loadingInstance = null
// 使用直接的变量而不是ref
let currentProgress = 0
let currentStatus = ''

const progressFormat = (percentage) => {
  return percentage === 100 ? 'Completed' : `${percentage}%`
}

// 更新进度和状态的辅助函数
const updateProgress = (status, progress) => {
  currentStatus = status
  currentProgress = progress
  if (loadingInstance) {
    loadingInstance.setText(`${status} (${progress}%)`)
  }
}

const getBackgroundImagePayload = (configJson) => {
  const bgElement = (configJson && Array.isArray(configJson.elements))
    ? configJson.elements.find((e) => e && (e.eleType === 'background' || e.type === 'background'))
    : null
  const imageUrl = bgElement?.imageUrl
  if (!imageUrl || isDefaultBackgroundUrl(imageUrl)) {
    return null
  }
  return { url: imageUrl }
}

const openDialog = () => {
  jsonConfig.value = baseStore.generateConfig()
  uploading.value = false
  currentProgress = 0
  currentStatus = ''
  isUploadTimeout.value = false
  clearTimeout(uploadTimeoutTimer)
  if (loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }
}

// 导出配置
const downloadConfig = async () => {
  if (!membershipGate.requireExport()) return
  if (!baseStore.watchFaceName) {
    messageStore.error(t('export.setAppName'))
    return null
  }
  const config = baseStore.generateConfig()
  if (!config) return

  const blob = new Blob([JSON.stringify(config)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `face-${baseStore.id}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 上传表盘截图
const uploadScreenshot = async () => {
  try {
    // 先捕获最新的画布截图
    const screenshot = await baseStore.captureScreenshot()
    if (screenshot) {
      const screenshotUrl = await uploadBase64Image(screenshot, 'screenshot')
      return screenshotUrl
    }
  } catch (screenshotError) {
    console.error('上传表盘截图失败:', screenshotError)
    // 截图上传失败不影响整体上传过程
  }
  return ""
}

// 添加一个互斥锁
const isOperationLocked = ref(false)

// 定时轮训保存配置，只需要保存 name, kpayId, configJson 即可
const saveConfig = async (options = {}) => {
  if (router.currentRoute.value.path !== '/design') {
    messageStore.error(t('export.notDesignPage'))
    return
  }
  if (!baseStore.watchFaceName) {
    messageStore.error(t('export.setAppNameFirst'))
    return
  }

  try {
    const config = baseStore.generateConfig({
      validateBindings: options.validateBindings ?? true,
    })
    if (!config) return ''

    const data = {
      name: baseStore.watchFaceName,
      configJson: JSON.stringify(config),
      // userId: user.value.id
    }
    if (baseStore.id) {
      // 如果 id 存在，则更新; 否则创建
      data.documentId = baseStore.id
    }
    // const designRes = await saveDddddDesign(data)
    // 
    // // 如果 query 中 id 为空，则更新 query 中的 id
    // if (!router.currentRoute.value.query.id) {
    //   router.push({
    //     path: '/design',
    //     query: { id: designRes.data.documentId }
    //   })
    // }
    // return designRes.data.documentId
  } catch (error) {
    console.error('Auto save failed', error)
    return ''
  }
}

// 上传配置到服务器
const uploadApp = async () => {
  // 检查应用名称
  if (!baseStore.watchFaceName) {
    messageStore.error(t('export.setAppName'))
    return -1
  }
  // 生成配置
  const config = baseStore.generateConfig({ validateBindings: true })
  if (!config) {
    return -1
  }

  // 开始上传，显示进度条
  uploading.value = true
  currentProgress = 0
  currentStatus = t('export.preparingUpload')
  isUploadTimeout.value = false

  // 创建全屏遮罩
  loadingInstance = ElLoading.service({
    lock: true,
    text: `${currentStatus} (${currentProgress}%)`,
    background: 'rgba(0, 0, 0, 0.7)'
  })

  // 设置超时定时器，1分钟后显示超时提示
  uploadTimeoutTimer = setTimeout(() => {
    isUploadTimeout.value = true
  }, 60000) // 60秒 = 1分钟

  try {
    // 应用创建
    currentStatus = 'Creating app...'
    currentProgress = 10
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    const configJson = config
    // 背景图片元数据已经包含在 config 中（backgroundImage 字段）
    currentStatus = t('export.processingBackground')
    currentProgress = 20
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }
    // 上传表盘截图 - 对画布进行实时截图
    currentStatus = t('export.uploadingScreenshot')
    const screenshotUrl = await uploadScreenshot()
    currentProgress = 40
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 配置更新
    currentStatus = t('export.updatingConfig')
    currentProgress = 60
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    const backgroundImage = getBackgroundImagePayload(configJson)

    const data = {
      uid: baseStore.id,
      name: baseStore.watchFaceName,
      description: baseStore.watchFaceName,
      designStatus: 'draft',
      configJson: configJson,
      // 直接使用配置中的 backgroundImage 元信息
      backgroundImage: backgroundImage,
    }
    if (screenshotUrl) { // 屏幕截图成功时，上传
      data.coverImage = {
        url: screenshotUrl,
        type: 'screenshot',
        usageType: 'screenshot'
      }
    }

    
    // if (baseStore.id) {
    //   data.documentId = baseStore.id
    // }
    // 创建或更新表盘设计
    const res = await designApi.updateDesign(data)
    
    // 更新 baseStore.id
    baseStore.id = res.data.documentId
    historyStore.saveInitial()

    // 更新WPay产品信息(必须在设计创建或更新之后)
    currentStatus = t('export.updatingProduct')
    currentProgress = 80
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }
    currentStatus = t('export.uploadCompleted')
    currentProgress = 100
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 延迟关闭进度条，让用户看到完成状态
    setTimeout(() => {
      uploading.value = false
      messageStore.success(t('export.uploadedSuccessfully'))
      closeDialog()

      // 清除超时定时器和遮罩
      clearTimeout(uploadTimeoutTimer)
      if (loadingInstance) {
        loadingInstance.close()
        loadingInstance = null
      }
    }, 1000)
    return 0
  } catch (error) {
    console.error('Configuration upload failed:', error)
    currentStatus = t('editor.uploadFailedWithReason', { reason: error.message || t('common.unknown') })
    currentProgress = 0
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 延迟关闭进度条，让用户看到错误信息
    setTimeout(() => {
      uploading.value = false
      messageStore.error(error.message || t('export.uploadFailed'))

      // 清除超时定时器和遮罩
      clearTimeout(uploadTimeoutTimer)
      if (loadingInstance) {
        loadingInstance.close()
        loadingInstance = null
      }
    }, 2000)
    return -1
  }
}

// 取消上传
const cancelUpload = () => {
  currentStatus = t('export.uploadCanceled')
  currentProgress = 0

  // 关闭遮罩
  if (loadingInstance) {
    loadingInstance.close()
    loadingInstance = null
  }

  // 延迟关闭上传进度条
  setTimeout(() => {
    uploading.value = false
    isUploadTimeout.value = false
    clearTimeout(uploadTimeoutTimer)
  }, 1500)
}

// 复制配置到剪贴板
const copyConfig = () => {
  const config = baseStore.generateConfig()
  if (!config) return

  const configStr = JSON.stringify(config, null, 2)
  navigator.clipboard
    .writeText(configStr)
    .then(() => {
      messageStore.success(t('export.copied'))
    })
    .catch(() => {
      messageStore.error(t('export.copyFailed'))
    })
}

// 添加打开导出对话框的方法
const openExportDialog = () => {
  emit('update:isDialogVisible', true)
}

// 暴露方法给父组件
defineExpose({
  uploadApp,
  downloadConfig,
  saveConfig,
  openExportDialog
})
</script>

<style scoped>
.export-dialog {
  width: 600px;
  :deep(.el-dialog) {
    border-radius: 8px;
  }

  :deep(.el-dialog__header) {
    margin: 0;
    padding: 20px;
    border-bottom: 1px solid #e4e4e4;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 20px;
    border-top: 1px solid #e4e4e4;
  }
}

.export-preview {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #666;
  font-size: 14px;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.empty-preview {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
  background: #fff;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.upload-progress {
  padding: 30px 20px;
  text-align: center;
}

.upload-progress h3 {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.upload-header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-info {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.info-item {
  font-size: 16px;
}

.progress-container {
  margin: 20px 0;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  background-color: #f5f7fa;
  padding: 12px 15px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.upload-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-weight: 600;
  color: #606266;
}

.status-value {
  font-size: 15px;
  color: #303133;
  background-color: var(--studio-primary-soft);
  padding: 2px 8px;
  border-radius: 3px;
  border-left: 3px solid #0f6b68;
}

.current-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-label {
  font-weight: 600;
  color: #606266;
}

.progress-value {
  font-size: 15px;
  font-weight: bold;
  color: #0f6b68;
  background-color: var(--studio-primary-soft);
  padding: 2px 8px;
  border-radius: 3px;
  border-left: 3px solid #0f6b68;
}

.timeout-warning {
  margin-top: 20px;
  padding: 10px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
</style>
