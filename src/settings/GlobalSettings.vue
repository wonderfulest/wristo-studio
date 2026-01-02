<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>Watch Face Name</label>
      <el-input type="text" v-model="watchFaceName" @change="updateWatchFaceName" />
    </div>
    <div class="setting-item">
      <label>Text Case</label>
      <el-select v-model="textCase" placeholder="Select text case style" @change="updateTextCase">
        <el-option :value="0" label="Default" />
        <el-option :value="1" label="UPPERCASE" />
        <el-option :value="2" label="lowercase" />
        <el-option :value="3" label="CamelCase" />
      </el-select>
      <div class="setting-description">Affects display style for text elements like date and labels</div>
    </div>
    
    <div class="setting-item">
      <label>Show Unit</label>
      <el-switch v-model="showUnit" @change="updateShowUnit" />
    </div>

    <div class="setting-item">
      <label>Label Length</label>
      <el-select v-model="labelLengthType" placeholder="Select label length" @change="updateLabelLengthType">
        <el-option :value="1" label="Short" />
        <el-option :value="2" label="Medium" />
        <el-option :value="3" label="Long" />
      </el-select>
      <div class="setting-description">Affects only the display text length of label elements</div>
    </div>

    <div class="setting-item">
      <label>Background Image</label>
      <ImageUpload
        :model-value="currentBackgroundImageId"
        :preview-url="currentBackgroundImageUrl"
        @update:modelValue="handleBackgroundImageIdChange"
        @uploaded="handleBackgroundImageUploaded"
      />
      <el-button
        v-if="currentBackgroundImageUrl"
        type="text"
        size="small"
        @click="removeBackgroundImage"
      >Remove Image</el-button>
    </div>

    <!-- Theme Rule Settings -->
    <ThemeRuleSettings />
  </div>

</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useBaseStore } from '@/stores/baseStore'
import ColorPicker from '@/components/color-picker/index.vue'
import emitter from '@/utils/eventBus'
import { ElSelect, ElOption, ElMessage, ElLoading } from 'element-plus'
import { uploadBase64Image, uploadImageFile } from '@/utils/image'
import { usePropertiesStore } from '@/stores/properties'
import ThemeRuleSettings from '@/settings/ThemeRuleSettings.vue'
import ImageUpload from '@/components/common/ImageUpload.vue'
const propertiesStore = usePropertiesStore()
const baseStore = useBaseStore()
// 表盘名称
const watchFaceName = computed({
  get: () => baseStore.watchFaceName,
  set: (value) => (baseStore.watchFaceName = value)
})

// 更新表盘名称
const updateWatchFaceName = () => {
  baseStore.watchFaceName = watchFaceName.value
}

// 文本大小写设置
const textCase = computed({
  get: () => baseStore.textCase,
  set: (value) => {
    baseStore.textCase = value
  }
})

// 标签长度类型设置
const labelLengthType = computed({
  get: () => baseStore.labelLengthType,
  set: (value) => {
    baseStore.labelLengthType = value
  }
})

// 是否显示数据项单位
const showUnit = computed({
  get: () => baseStore.showUnit,
  set: (value) => {
    baseStore.showUnit = value
  }
})

// 更新文本大小写设置
const updateTextCase = (value) => {
  baseStore.setTextCase(value)
  
  // 打印当前画布上的所有元素类型，以便调试
  if (baseStore.canvas) {
    const objects = baseStore.canvas.getObjects()
    const elementTypes = {}
    
    objects.forEach(obj => {
      if (!elementTypes[obj.eleType]) {
        elementTypes[obj.eleType] = 0
      }
      elementTypes[obj.eleType]++
    })
    
  }
}

// 更新是否显示数据项单位
const updateShowUnit = (value) => {
  baseStore.showUnit = value
  // 更新画布上的数据项单位
  if (baseStore.canvas) {
    const objects = baseStore.canvas.getObjects()
    const elementTypes = {}
    
    for (const obj of objects) {
      if (obj.eleType === 'data') {
        const metric = propertiesStore.getMetricBySymbol({metricSymbol: obj.metricSymbol})
        obj.set({
          text: metric.defaultValue + (baseStore.showUnit ? metric.unit : ''),
        })
      }
    }
  }
  baseStore.canvas.renderAll()
}

// 更新标签长度类型设置
const updateLabelLengthType = (value) => {
  baseStore.setLabelLengthType(value)
  // 打印当前画布上的标签元素数量，以便调试
  if (baseStore.canvas) {
    const objects = baseStore.canvas.getObjects()
    let labelCount = 0
    
    objects.forEach(obj => {
      if (obj.eleType === 'label') {
        labelCount++
      }
    })
    
  }
}

// 监听 store 中的值变化
watch(
  () => baseStore.watchFaceName,
  (newName) => {
    if (newName !== watchFaceName.value) {
      watchFaceName.value = newName
    }
  }
)

watch(
  () => baseStore.textCase,
  (newValue) => {
    if (newValue !== textCase.value) {
      textCase.value = newValue
    }
  }
)

// 监听 WPay 相关设置的变化
watch(
  () => baseStore.wpay,
  (newWpay) => {
    if (newWpay !== wpay.value) {
      wpay.value = newWpay
    }
  },
  { deep: true }
)

// 背景图片：从 baseStore.backgroundImage 的元数据中读取 id 和 url
const currentBackgroundImageId = computed(() => {
  const raw = baseStore.backgroundImage
  return raw && raw.wristoImageId != null ? raw.wristoImageId : undefined
})

const currentBackgroundImageUrl = computed(() => {
  const raw = baseStore.backgroundImage
  if (!raw) return ''
  return raw.wristoImageUrl || ''
})

// ImageUpload 回调：这里只接受上传完成后的完整 ImageVO，由 setBackgroundImageFromUrl 负责更新画布
const handleBackgroundImageIdChange = () => {
  // id 变化由 uploaded 中的完整 ImageVO 统一处理，这里无需额外逻辑
}

// ImageUpload 回调：上传成功后更新当前背景图，并刷新画布
const handleBackgroundImageUploaded = (img) => {
  if (!img) return
  const url = img.url || img.previewUrl || (img.formats && (img.formats.medium?.url || img.formats.thumbnail?.url)) || ''
  baseStore.setBackgroundImageFromUrl(url || null, img.id || null)
  ElMessage.success('Image uploaded successfully')
}

// 移除背景图片
const removeBackgroundImage = () => {
  baseStore.setBackgroundImageFromUrl(null)
}

// WPay ID
const wpay = computed({
  get: () => baseStore.wpay,
  set: (value) => (baseStore.wpay = value)
})

// 更新 Garmin 图片 URL
const updateWpayGarminImageUrl = async () => {
  baseStore.wpay.garminImageUrl = wpay.value.garminImageUrl
}

// 更新 Garmin Store URL
const updateWpayGarminStoreUrl = async () => {
  baseStore.wpay.garminStoreUrl = wpay.value.garminStoreUrl
}

// 更新试用时长
const updateWpayTrialLasts = async () => {
  baseStore.wpay.trialLasts = wpay.value.trialLasts
}

// 更新价格
const updateWpayPrice = async () => {
  baseStore.wpay.price = wpay.value.price
}

// Garmin 图片上传
const handleGarminImageChange = (file) => {
  
  if (!file || !file.raw) {
    console.warn('Invalid file', file)
    return
  }

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: 'Uploading image... ',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      // 上传 Garmin 图片
      const garminImage = e.target.result
      let imageUploadUrl = ''
      if (garminImage && garminImage.startsWith('data:')) {
        imageUploadUrl = await uploadBase64Image(garminImage, 'hero')
      } else if (garminImage && garminImage.startsWith('blob:')) {
        imageUploadUrl = await uploadImageFile(garminImage, 'hero')
      } else if (garminImage && garminImage.startsWith('http')) {
        imageUploadUrl = garminImage
      }
      
      if (!imageUploadUrl) {
        throw new Error('Failed to upload Garmin image')
      }
      // 更新 Garmin 图片 URL
      baseStore.wpay.garminImageUrl = imageUploadUrl
      // 更新 wristo api 中的 product 图片
      ElMessage.success('Image uploaded successfully')
    } catch (error) {
      console.error('Failed to upload Garmin image:', error)
      ElMessage.error('Failed to upload Garmin image')
    } finally {
      // 关闭 loading
      loadingInstance.close()
    }
  }

  reader.onerror = (error) => {
    console.error('Failed to read image', error)
    ElMessage.error('Failed to read image')
    loadingInstance.close()
  }

  reader.readAsDataURL(file.raw)
}

// 移除 Garmin 图片
const removeGarminImage = () => {
  baseStore.wpay.garminImageUrl = ''
  baseStore.toggleThemeBackground()
}


</script>

<style scoped>
.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  color: #666;
}

.theme-settings {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.theme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.theme-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.theme-actions {
  display: flex;
  gap: 8px;
}

.theme-selector {
  margin-bottom: 16px;
}

.theme-colors {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  gap: 8px;
}

.color-name {
  font-size: 12px;
  color: #666;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-item :deep(.color-picker-wrapper) {
  width: 300px;
  flex-shrink: 0;
}
.background-image-control {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.background-image-preview {
  width: 100%;
  max-width: 200px;
  height: 200px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.background-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.setting-description {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.settings-section :deep(.el-input__inner) {
  border: none;
}

.settings-section :deep(.el-input__wrapper) {
  outline: none;
}

.settings-section :deep(.el-input__inner:focus),
.settings-section :deep(.el-input__inner:focus-visible) {
  outline: none;
}

.settings-section :deep(.el-input__wrapper:focus-within) {
  outline: none;
}

.settings-section :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset !important;
}

.settings-section :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.settings-section :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-input-focus-border-color) inset;
}
</style>
