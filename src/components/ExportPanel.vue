<template>
  <el-dialog :model-value="isDialogVisible" title="导出配置" class="export-dialog" @open="openDialog" @update:model-value="emit('update:isDialogVisible', $event)" :before-close="closeDialog">
    <div v-if="uploading" class="upload-progress">
      <div class="upload-header">
        <h3>正在上传...</h3>
        <div class="upload-info">
          <div class="info-item">
            <el-tag type="primary" effect="dark" size="large">进度: {{ currentProgress }}%</el-tag>
          </div>
          <div class="info-item">
            <el-tag type="success" effect="dark" size="large">状态: {{ currentStatus }}</el-tag>
          </div>
        </div>
      </div>

      <div class="progress-container">
        <el-progress :percentage="currentProgress" :format="progressFormat" :stroke-width="20" />
        <div class="progress-details">
          <div class="current-progress">
            <span class="progress-label">当前进度:</span>
            <span class="progress-value">{{ currentProgress }}%</span>
          </div>
          <div class="upload-status">
            <span class="status-label">状态:</span>
            <span class="status-value">{{ currentStatus }}</span>
          </div>
        </div>
      </div>

      <div v-if="isUploadTimeout" class="timeout-warning">
        上传时间超过1分钟，可能存在网络问题
        <el-button size="small" type="danger" @click="cancelUpload">取消上传</el-button>
      </div>
    </div>
    <div v-else class="export-preview">
      <div class="preview-header">
        <span>预览</span>
        <div class="preview-actions">
          <el-button size="small" @click="copyConfig" class="copy-btn">
            <Icon icon="solar:copy-bold" />
            复制
          </el-button>
          <el-button type="success" size="small" @click="uploadApp" class="upload-btn">
            <Icon icon="material-symbols:upload" />
            上传
          </el-button>
        </div>
      </div>
      <vue-json-pretty :data="jsonConfig" />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="dowloadConfig">
          <Icon icon="material-symbols:export-notes-rounded" />
          确认导出
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
import { getMetricBySymbol } from '@/config/settings'
import { useUserStore } from '@/stores/user'
import { useBaseStore } from '@/stores/baseStore'
import { useRouter } from 'vue-router'
import { usePropertiesStore } from '@/stores/properties'
const messageStore = useMessageStore()
const router = useRouter()
const userStore = useUserStore()
const user = computed(() => userStore.userInfo)
const propertiesStore = usePropertiesStore()
// 定义属性
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:isDialogVisible'])

const baseStore = useBaseStore()

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
  return percentage === 100 ? '完成' : `${percentage}%`
}

// 更新进度和状态的辅助函数
const updateProgress = (status, progress) => {
  currentStatus = status
  currentProgress = progress
  if (loadingInstance) {
    loadingInstance.setText(`${status} (${progress}%)`)
  }
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
const dowloadConfig = async () => {
  if (!baseStore.watchFaceName) {
    messageStore.error('请设置应用名称')
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
    const screenshot = await baseStore.captureScreenshot(true)
    if (screenshot) {
      const screenshotUrl = await uploadBase64Image(screenshot, 'screenshot')
      console.log('screenshotUrl', screenshotUrl)
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
const saveConfig = async () => {
  if (router.currentRoute.value.path !== '/design') {
    messageStore.error('不是设计页面')
    return
  }
  if (!baseStore.watchFaceName) {
    messageStore.error('请先设置应用名称')
    return
  }

  try {
    const data = {
      name: baseStore.watchFaceName,
      configJson: JSON.stringify(baseStore.generateConfig()),
      // userId: user.value.id
    }
    if (baseStore.id) {
      // 如果 id 存在，则更新; 否则创建
      data.documentId = baseStore.id
    }
    // const designRes = await saveDddddDesign(data)
    // console.log('自动保存成功', designRes)
    // // 如果 query 中 id 为空，则更新 query 中的 id
    // if (!router.currentRoute.value.query.id) {
    //   router.push({
    //     path: '/design',
    //     query: { id: designRes.data.documentId }
    //   })
    // }
    // return designRes.data.documentId
  } catch (error) {
    console.error('自动保存失败', error)
    return ''
  }
}

// 上传配置到服务器
const uploadApp = async () => {
  const config = baseStore.generateConfig()
  console.log('上传配置', config)
  if (!config) {
    messageStore.warning('没有可上传的配置')
    return -1
  }
  if (!baseStore.watchFaceName) {
    messageStore.error('请设置应用名称')
    return -1
  }

  // 开始上传，显示进度条
  uploading.value = true
  currentProgress = 0
  currentStatus = '准备上传...'
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
    currentStatus = '创建应用...'
    currentProgress = 10
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 上传背景图片
    currentStatus = '上传背景图片...'
    currentProgress = 20
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }
    config.themeBackgroundImages = baseStore.themeBackgroundImages
    
    // 上传表盘截图 - 对画布进行实时截图
    currentStatus = '上传表盘截图...'
    // const screenshotUrl = await uploadScreenshot()
    const screenshotUrl = ''
    currentProgress = 40
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    console.log('screenshotUrl', screenshotUrl)

    // 配置更新
    currentStatus = '更新配置信息...'
    currentProgress = 60
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    const data = {
      uid: baseStore.id,
      name: baseStore.watchFaceName,
      description: baseStore.watchFaceName,
      designStatus: 'draft',
      // userId: user.value.id,
      configJson: baseStore.generateConfig(),
      backgroundImage: {
        url: baseStore.themeBackgroundImages[0]
      },
    }
    if (screenshotUrl) { // 屏幕截图成功时，上传
      data.coverImage = {
        url: screenshotUrl
      }
    }

    console.log('上传配置', data)
    // if (baseStore.id) {
    //   data.documentId = baseStore.id
    // }
    // 创建或更新表盘设计
    const res = await designApi.updateDesign(data)
    console.log('updateDesign 666', res)
    // 更新 baseStore.id
    baseStore.id = res.data.documentId

    // 更新WPay产品信息(必须在设计创建或更新之后)
    currentStatus = '更新WPay产品信息...'
    currentProgress = 80
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }
    if (baseStore.wpayEnabled && baseStore.id) {
      const wpayRes = await baseStore.updateWPayProductInfo()
      if (!wpayRes) {
        messageStore.error('更新WPay产品信息失败')
        return -1
      }
    }
    currentStatus = '上传完成！'
    currentProgress = 100
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 延迟关闭进度条，让用户看到完成状态
    setTimeout(() => {
      uploading.value = false
      messageStore.success('配置上传成功')
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
    console.error('配置上传失败:', error)
    currentStatus = '上传失败: ' + (error.message || '未知错误')
    currentProgress = 0
    if (loadingInstance) {
      loadingInstance.setText(`${currentStatus} (${currentProgress}%)`)
    }

    // 延迟关闭进度条，让用户看到错误信息
    setTimeout(() => {
      uploading.value = false
      messageStore.error(error.message || '配置上传失败，请稍后重试')

      // 清除超时定时器和遮罩
      clearTimeout(uploadTimeoutTimer)
      if (loadingInstance) {
        loadingInstance.close()
        loadingInstance = null
      }
    }, 2000)
    return 0
  }
}

// 取消上传
const cancelUpload = () => {
  currentStatus = '已取消上传'
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
      messageStore.success('配置已复制到剪贴板')
    })
    .catch(() => {
      messageStore.error('复制失败')
    })
}

// 添加打开导出对话框的方法
const openExportDialog = () => {
  emit('update:isDialogVisible', true)
}

// 暴露方法给父组件
defineExpose({
  uploadApp,
  dowloadConfig,
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
  background-color: #ecf5ff;
  padding: 2px 8px;
  border-radius: 3px;
  border-left: 3px solid #409eff;
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
  color: #409eff;
  background-color: #ecf5ff;
  padding: 2px 8px;
  border-radius: 3px;
  border-left: 3px solid #409eff;
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
