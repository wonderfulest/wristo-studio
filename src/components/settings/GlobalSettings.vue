<template>
  <div class="settings-section">
    <div class="setting-item">
      <label>表盘名称</label>
      <el-input type="text" v-model="watchFaceName" @change="updateWatchFaceName" />
    </div>
    <div class="setting-item">
      <label>文本大小写设置</label>
      <el-select v-model="textCase" placeholder="请选择文本大小写样式" @change="updateTextCase">
        <el-option :value="0" label="默认" />
        <el-option :value="1" label="全大写 (UPPERCASE)" />
        <el-option :value="2" label="全小写 (lowercase)" />
        <el-option :value="3" label="驼峰式 (CamelCase)" />
      </el-select>
      <div class="setting-description">影响日期、标签等文本元素的显示样式</div>
    </div>
    
    <div class="setting-item">
      <label>是否显示数据项单位</label>
      <el-switch v-model="showUnit" @change="updateShowUnit" />
    </div>

    <div class="setting-item">
      <label>标签长度类型</label>
      <el-select v-model="labelLengthType" placeholder="请选择标签长度类型" @change="updateLabelLengthType">
        <el-option :value="1" label="短文本 (Short)" />
        <el-option :value="2" label="中等文本 (Medium)" />
        <el-option :value="3" label="长文本 (Long)" />
      </el-select>
      <div class="setting-description">仅影响标签元素的显示文本长度</div>
    </div>

    <div class="setting-item">
      <label>背景图片</label>
      <div class="background-image-control">
        <el-upload action="#" :auto-upload="false" :show-file-list="false" accept=".jpg,.jpeg,.png" @change="handleBackgroundImageChange">
          <el-button size="small" type="primary">选择图片</el-button>
        </el-upload>
        <el-button size="small" type="danger" @click="removeBackgroundImage" v-if="currentBackgroundImage">移除图片</el-button>
      </div>
      <div class="background-image-preview" v-if="currentBackgroundImage">
        <img :src="currentBackgroundImage" alt="背景图片预览" />
      </div>
    </div>
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
const propertiesStore = usePropertiesStore()
const baseStore = useBaseStore()
const currentThemeIndex = ref(0)
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

// 背景图片
const currentBackgroundImage = computed({
  get: () => baseStore.themeBackgroundImages[currentThemeIndex.value],
  set: (value) => {
    baseStore.themeBackgroundImages[currentThemeIndex.value] = value
  }
})

// 处理背景图片变化
const handleBackgroundImageChange = (file) => {
  
  if (!file || !file.raw) {
    console.warn('文件无效', file)
    return
  }

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在上传图片...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      // 上传背景图片
      const bgImage = e.target.result
      let imageUploadUrl  
      if (bgImage && bgImage.startsWith('data:')) {
        imageUploadUrl = await uploadBase64Image(bgImage, 'background')
      } else if (bgImage && bgImage.startsWith('blob:')) {
        imageUploadUrl = await uploadImageFile(bgImage, 'background')
      } else if (bgImage && bgImage.startsWith('http')) {
        imageUploadUrl = bgImage
      }
      
      if (!imageUploadUrl) {
        throw new Error('上传背景图片失败')
      }

      // 更新当前主题的背景图片
      baseStore.themeBackgroundImages[currentThemeIndex.value] = imageUploadUrl
      // 强制更新画布背景
      baseStore.toggleThemeBackground()
      
      ElMessage.success('图片上传成功')
    } catch (error) {
      console.error('上传背景图片失败:', error)
      ElMessage.error('上传背景图片失败')
    } finally {
      // 关闭 loading
      loadingInstance.close()
    }
  }

  reader.onerror = (error) => {
    console.error('读取图片出错', error)
    ElMessage.error('读取图片失败')
    loadingInstance.close()
  }

  reader.readAsDataURL(file.raw)
}

// 移除背景图片
const removeBackgroundImage = () => {
  currentBackgroundImage.value = ''
  baseStore.toggleThemeBackground()
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
    console.warn('文件无效', file)
    return
  }

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在上传图片...',
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
        throw new Error('上传 Garmin 图片失败')
      }
      // 更新 Garmin 图片 URL
      baseStore.wpay.garminImageUrl = imageUploadUrl
      // 更新 wristo api 中的 product 图片
      ElMessage.success('图片上传成功')
    } catch (error) {
      console.error('上传 Garmin 图片失败:', error)
      ElMessage.error('上传 Garmin 图片失败')
    } finally {
      // 关闭 loading
      loadingInstance.close()
    }
  }

  reader.onerror = (error) => {
    console.error('读取图片出错', error)
    ElMessage.error('读取图片失败')
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
</style>
